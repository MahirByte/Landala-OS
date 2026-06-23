/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import http from 'http';
import puppeteer, { Browser, Page } from 'puppeteer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Enable JSON parser for actions
app.use(express.json());

// Browser instances, proxy servers, and session stores
let globalBrowser: Browser | null = null;
let globalScratchBrowser: Browser | null = null;
let activeScratchProxy: string | null = null;

const sessions = new Map<string, { page: Page; lastActive: number; url: string }>();
const sessionBrowserTypes = new Map<string, 'normal' | 'scratch'>();

// Test if the proxy is healthy and can successfully build an SSL/TLS tunnel (CONNECT) to Scratch
function testProxy(ip: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (val: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    const req = http.request({
      host: ip,
      port: port,
      method: 'CONNECT',
      path: 'scratch.mit.edu:443',
      headers: {
        'Host': 'scratch.mit.edu:443',
        'Proxy-Connection': 'Keep-Alive',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: timeoutMs
    });

    req.on('connect', (res, socket) => {
      if (res.statusCode === 200) {
        finish(true);
      } else {
        finish(false);
      }
      socket.destroy();
      req.destroy();
    });

    req.on('response', (res) => {
      // Some proxies respond to CONNECT with standard 200 responses directly
      if (res.statusCode === 200) {
        finish(true);
      } else {
        finish(false);
      }
      req.destroy();
    });

    req.on('error', () => {
      finish(false);
    });

    req.on('timeout', () => {
      req.destroy();
      finish(false);
    });

    req.end();
  });
}

// Fetch proxy list from high-quality sources, merging and deduplicating results
async function fetchProxyList(): Promise<string[]> {
  const sources = [
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=us,ca,de,fr,nl,gb,sg,all&ssl=yes&anonymity=anonymous,elite',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt',
    'https://raw.githubusercontent.com/Proxyify/Proxy/master/http.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt'
  ];

  const allProxiesSet = new Set<string>();

  for (const url of sources) {
    try {
      console.log(`Fetching proxy list from source: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes(':') && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(l));
        console.log(`Parsed ${lines.length} prospective nodes from ${url}`);
        for (const line of lines) {
          allProxiesSet.add(line);
        }
      }
    } catch (e) {
      console.error(`Failed to fetch from ${url}:`, e);
    }
  }
  
  const mergedList = Array.from(allProxiesSet);
  console.log(`Successfully compiled and deduplicated ${mergedList.length} total active candidate proxies.`);
  return mergedList;
}

// Find a fresh, active proxy that is verified to connect to scratch
async function getFreshProxy(): Promise<string | null> {
  const lines = await fetchProxyList();
  if (lines.length === 0) {
    console.error('No proxy lists could be fetched.');
    return null;
  }

  // Shuffle/randomize the first 500 proxies. High-volume public lists usually have spammed "stale" top entries.
  // Shuffling lets us hit responsive, under-utilized proxies.
  const proxyCandidates = lines.slice(0, 500).sort(() => Math.random() - 0.5);

  console.log(`Scanning randomized pool of ${proxyCandidates.length} proxies...`);

  const maxBatches = 5;
  const batchSize = 35;
  const totalSlots = Math.min(proxyCandidates.length, maxBatches * batchSize);

  for (let i = 0; i < totalSlots; i += batchSize) {
    const candidates = proxyCandidates.slice(i, i + batchSize);
    console.log(`Checking proxy batch ${Math.floor(i / batchSize) + 1}/${maxBatches} (${candidates.length} nodes) with high-fidelity racing...`);
    
    const workingProxy = await findFirstWorkingProxy(candidates, 3500);
    if (workingProxy) {
      console.log(`Active, unblocked proxy found and selected: ${workingProxy}`);
      return workingProxy;
    }
  }

  console.warn('No verified proxy responded in time. Fallback to direct connections instead of dead proxies.');
  return null;
}

// Race helper to find the first working proxy in a candidate batch
function findFirstWorkingProxy(candidates: string[], timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    let pendingCount = candidates.length;

    if (pendingCount === 0) {
      resolve(null);
      return;
    }

    candidates.forEach((proxyStr) => {
      const [ip, portStr] = proxyStr.split(':');
      const port = parseInt(portStr, 10);
      if (!ip || isNaN(port)) {
        pendingCount--;
        if (pendingCount === 0 && !resolved) {
          resolved = true;
          resolve(null);
        }
        return;
      }

      testProxy(ip, port, timeoutMs).then((success) => {
        if (resolved) return;

        if (success) {
          resolved = true;
          resolve(proxyStr);
        } else {
          pendingCount--;
          if (pendingCount === 0) {
            resolved = true;
            resolve(null);
          }
        }
      }).catch(() => {
        if (resolved) return;
        pendingCount--;
        if (pendingCount === 0) {
          resolved = true;
          resolve(null);
        }
      });
    });
  });
}

// Get or launch a proxy-enabled browser for Scratch URLs
async function getScratchBrowser(forceRenew = false): Promise<{ browser: Browser; proxy: string }> {
  if (globalScratchBrowser && !forceRenew) {
    return { browser: globalScratchBrowser, proxy: activeScratchProxy || '' };
  }

  if (globalScratchBrowser) {
    console.log('Closing existing proxy browser for renewal...');
    await globalScratchBrowser.close().catch(() => {});
    globalScratchBrowser = null;
  }

  console.log('Bypassing Varnish cache 429 blocks: Querying standard rotating proxy list...');
  const proxy = await getFreshProxy();
  if (!proxy) {
    console.warn('Failed to find verified proxy. Falling back to direct connection without proxy.');
    // Let it fallback to no proxy as last ditch effort rather than completely crashing
    const browserDirect = await getBrowser();
    return { browser: browserDirect, proxy: '' };
  }

  activeScratchProxy = proxy;
  console.log(`Launching real Scratch-bypass browser with live proxy: ${proxy}`);

  globalScratchBrowser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--hide-scrollbars',
      '--autoplay-policy=no-user-gesture-required',
      `--proxy-server=http://${proxy}`
    ]
  });

  return { browser: globalScratchBrowser, proxy };
}

// Helper to get or open a standard (non-proxied) browser instance
async function getBrowser(): Promise<Browser> {
  if (!globalBrowser) {
    console.log('Launching Puppeteer browser...');
    globalBrowser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--hide-scrollbars',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });
  }
  return globalBrowser;
}

// Clean up stale sessions (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000;
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > timeout) {
      console.log(`Closing stale browser session: ${id}`);
      session.page.close().catch(() => {});
      sessions.delete(id);
    }
  }
}, 60000);

// Helper to get or create a page session, with support for optional proxy destination routing (Scratch)
async function getOrCreateSession(id: string, targetUrl?: string, bypassProxy = false): Promise<{ page: Page; url: string }> {
  const now = Date.now();
  const existing = sessions.get(id);

  // Detect if the target or current URL involves Scratch
  const isScratchTarget = !bypassProxy && targetUrl && (/[sS]cratch/i.test(targetUrl) || /mit\.edu/i.test(targetUrl) || /scratch-wiki/i.test(targetUrl));
  const expectedBrowserType = isScratchTarget ? 'scratch' : 'normal';
  const currentBrowserType = sessionBrowserTypes.get(id) || 'normal';

  // If the browser environment type doesn't match the expected type, we recreate the session page
  const needsRecreation = existing && (currentBrowserType !== expectedBrowserType);

  if (existing && !needsRecreation) {
    existing.lastActive = now;
    return { page: existing.page, url: existing.url };
  }

  if (existing && needsRecreation) {
    console.log(`[Session ${id}] Migrating browser type from '${currentBrowserType}' to '${expectedBrowserType}' due to target URL: ${targetUrl}`);
    await existing.page.close().catch(() => {});
    sessions.delete(id);
    sessionBrowserTypes.delete(id);
  }

  const useScratch = !!isScratchTarget;
  let page: Page;

  if (useScratch) {
    console.log(`[Session ${id}] Aligning with high-fidelity scratch proxy environment...`);
    const { browser: scratchBrowser } = await getScratchBrowser();
    page = await scratchBrowser.newPage();
    sessionBrowserTypes.set(id, 'scratch');

    // Enable request interception to skip heavy assets, trackers and telemetry to speed up proxy navigation
    try {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const urlStr = req.url().toLowerCase();
        const resourceType = req.resourceType();
        
        const isBlockedResource = 
          resourceType === 'media' || 
          resourceType === 'font' ||
          urlStr.includes('google-analytics') ||
          urlStr.includes('googletagmanager') ||
          urlStr.includes('googleadservices') ||
          urlStr.includes('doubleclick') ||
          urlStr.includes('facebook') ||
          urlStr.includes('twitter') ||
          urlStr.includes('analytics') ||
          urlStr.includes('telemetry') ||
          urlStr.includes('hotjar') ||
          urlStr.includes('sentry') ||
          urlStr.includes('mixpanel');

        if (isBlockedResource) {
          req.abort().catch(() => {});
        } else {
          req.continue().catch(() => {});
        }
      });
    } catch (e) {
      console.warn(`[Session ${id}] Failed to setup request interception:`, e);
    }
  } else {
    console.log(`[Session ${id}] Creating brand new standard page session...`);
    const normalBrowser = await getBrowser();
    page = await normalBrowser.newPage();
    sessionBrowserTypes.set(id, 'normal');
  }
  
  // Set default modern User Agent to avoid bot detection
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Set realistic desktop request headers to match standard user sessions
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
  });

  // Set default viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Ensure window.fetch is writable/configurable on all loaded browser pages
  await page.evaluateOnNewDocument(() => {
    try {
      // 1. Pass the WebDriver / Headless Test by removing standard webdriver property
      const newProto = Object.getPrototypeOf(navigator);
      delete newProto.webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // 2. Mock high-fidelity Chrome object
      (window as any).chrome = {
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed',
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running',
          },
        },
        runtime: {
          OnInstalledReason: {
            CHROME_UPDATE: 'chrome_update',
            INSTALL: 'install',
            SHARED_MODULE_UPDATE: 'shared_module_update',
            UPDATE: 'update',
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic',
          },
        },
      };

      // 3. Populate default mockup browser languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // 4. Mock high-fidelity plugin system
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { description: 'Portable Document Format', filename: 'internal-pdf-viewer', name: 'Chrome PDF Viewer' },
          { description: 'PDF Viewer', filename: 'mhjfbgocljpoeffhaffgandhibelhaen', name: 'Chromium PDF Viewer' }
        ],
      });

      // 5. Spoof WebGL vendor to simulate standard NVIDIA user GPU
      try {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // UNMASKED_VENDOR_WEBGL
          if (parameter === 37445) {
            return 'Google Inc. (NVIDIA)';
          }
          // UNMASKED_RENDERER_WEBGL
          if (parameter === 37446) {
            return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU/PCIe/SSE2, OpenGL 4.5.0)';
          }
          return getParameter.call(this, parameter);
        };
      } catch (err) {}

      let currentFetch = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get: function() { return currentFetch; },
        set: function(v) { currentFetch = v; },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      try {
        let currentFetch = window.fetch;
        Object.defineProperty(Window.prototype, 'fetch', {
          get: function() { return currentFetch; },
          set: function(v) { currentFetch = v; },
          configurable: true,
          enumerable: true
        });
      } catch (err) {}
    }
  });

  const targetUrlStr = targetUrl || 'about:blank';
  const sessionObj = { page, lastActive: now, url: targetUrlStr };
  sessions.set(id, sessionObj);

  return { page, url: targetUrlStr };
}

// Safe wrapper to retrieve webpage title with resilience to transient context destruction
async function safeGetTitle(page: Page): Promise<string> {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.title();
    } catch (err: any) {
      if (err.message?.includes('Execution context') || err.message?.includes('destroyed') || err.message?.includes('detached')) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      break;
    }
  }
  return 'Browser Session';
}

// Safe wrapper to retrieve webpage screenshot with resilience to transient context destruction
async function safeGetScreenshot(page: Page): Promise<string> {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.screenshot({ type: 'jpeg', quality: 80, encoding: 'base64' }) as string;
    } catch (err: any) {
      if (err.message?.includes('Execution context') || err.message?.includes('destroyed') || err.message?.includes('detached')) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      break;
    }
  }
  // Safe 1x1 blank JPEG fallback if everything fails
  return 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

// Render dynamic interactive overlay data (like links, inputs) with context-destruction safety
async function getInteractiveElements(page: Page) {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.evaluate(() => {
        const elements: Array<{
          tag: string;
          text: string;
          x: number;
          y: number;
          w: number;
          h: number;
          href?: string;
          placeholder?: string;
        }> = [];

        // Look at clickable/interactive components in current viewport
        const interactiveSelector = 'a, button, input, select, textarea, [role="button"], [cursor="pointer"]';
        const nodes = document.querySelectorAll(interactiveSelector);

        nodes.forEach((node) => {
          const rect = node.getBoundingClientRect();
          // Skip hidden or tiny dimensions
          if (rect.width < 3 || rect.height < 3 || rect.top < 0 || rect.left < 0) return;

          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

          elements.push({
            tag: node.tagName.toLowerCase(),
            text: (node.textContent || '').trim().substring(0, 50),
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            href: (node as HTMLAnchorElement).href || undefined,
            placeholder: (node as HTMLInputElement).placeholder || undefined
          });
        });

        return elements.slice(0, 100); // return at most 100 to keep responses snappy
      });
    } catch (err: any) {
      if (err.message?.includes('Execution context') || err.message?.includes('destroyed') || err.message?.includes('detached')) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      break;
    }
  }
  return [];
}

// Extract media track configurations from page under analysis with context-destruction safety
async function getMediaState(page: Page) {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.evaluate(() => {
        const media = Array.from(document.querySelectorAll('audio, video')) as HTMLMediaElement[];
        if (media.length === 0) return null;

        // Prioritize active playing media, otherwise fallback to any media element
        const active = media.find((m) => !m.paused && m.currentTime > 0) || media[0];
        if (active) {
          let src = active.src;
          if (!src) {
            const sourceEl = active.querySelector('source');
            if (sourceEl) {
              src = sourceEl.src;
            }
          }
          if (src) {
            try {
              src = new URL(src, document.baseURI).href;
            } catch (e) {}
          }
          return {
            src: src || '',
            isPlaying: !active.paused,
            currentTime: active.currentTime,
            title: document.title || 'Page Stream Feed',
            muted: active.muted,
            volume: active.volume,
            tagName: active.tagName.toLowerCase()
          };
        }
        return null;
      });
    } catch (err: any) {
      if (err.message?.includes('Execution context') || err.message?.includes('destroyed') || err.message?.includes('detached')) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      break;
    }
  }
  return null;
}

// 🌐 BROWSER NAVIGATE API
app.post('/api/browser/navigate', async (req, res) => {
  const { sessionId, url, width = 1280, height = 800 } = req.body;
  if (!sessionId || !url) {
    return res.status(400).json({ error: 'Missing sessionId or url' });
  }

  try {
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const isScratchUrl = (/[sS]cratch/i.test(finalUrl) || /mit\.edu/i.test(finalUrl) || /scratch-wiki/i.test(finalUrl));
    
    const maxRetries = 3;
    let attempt = 0;
    let activePage: Page | null = null;
    let isSuccess = false;
    let finalError: any = null;

    while (attempt < maxRetries && !isSuccess) {
      attempt++;
      // Attempt 1: Standard direct unproxied fast connection. If blocked/fails, we try helper proxies on attempts 2 and 3.
      const bypassProxy = !isScratchUrl || (attempt === 1) || (attempt === maxRetries);

      try {
        console.log(`[Session ${sessionId}] Attempt ${attempt}/${maxRetries} to visit: ${finalUrl} (bypassProxy=${bypassProxy})`);
        
        const { page } = await getOrCreateSession(sessionId, finalUrl, bypassProxy);
        activePage = page;
        
        await activePage.setViewport({ width: Number(width) || 1280, height: Number(height) || 800 });

        const pageTimeout = isScratchUrl ? (bypassProxy ? 15000 : 18000) : 25000;
        await activePage.goto(finalUrl, {
          waitUntil: 'domcontentloaded',
          timeout: pageTimeout
        });

        // Verify if Varnish/Fastly blocked page is shown
        let isBlocked = false;
        if (isScratchUrl && !bypassProxy) {
          try {
            const bodyContent = await activePage.evaluate(() => document.body?.innerText || '');
            const lowerContent = bodyContent.toLowerCase();
            const hasBlockSignature = 
              lowerContent.includes('error 429') || 
              lowerContent.includes('error 54113') || 
              lowerContent.includes('too many requests') || 
              lowerContent.includes('varnish cache');

            if (hasBlockSignature && bodyContent.length < 2500) {
              console.warn(`[Session ${sessionId}] Fastly/Varnish rate-limit blocker screen detected on attempt ${attempt}. Content length: ${bodyContent.length}`);
              isBlocked = true;
            }
          } catch (e) {}
        }

        if (isBlocked) {
          throw new Error('Varnish CDN 429 rate limit blocker screen');
        }

        // Navigation completed successfully!
        isSuccess = true;
      } catch (err: any) {
        finalError = err;
        console.warn(`[Session ${sessionId}] Attempt ${attempt} failed with error: ${err.message || err}`);
        
        // Discard page & session registry so next attempt gets a fresh session (or rotates proxy)
        if (activePage) {
          await activePage.close().catch(() => {});
          activePage = null;
        }
        sessions.delete(sessionId);
        sessionBrowserTypes.delete(sessionId);

        // Renew proxy for scratch browser for subsequent attempts
        if (isScratchUrl && !bypassProxy) {
          console.log(`[Session ${sessionId}] Triggering proxy renewal for next attempt...`);
          await getScratchBrowser(true).catch(() => {});
        }
      }
    }

    if (!isSuccess || !activePage) {
      throw finalError || new Error(`Failed to navigate after ${maxRetries} attempts`);
    }

    // Update session URL tracker with the actual current url
    const currentUrl = activePage.url();
    // Re-register successfully opened session
    sessions.set(sessionId, { page: activePage, lastActive: Date.now(), url: currentUrl });

    // Wait a brief movement for animations/JS
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get page specifics safely with resilience to transient context destruction
    const title = await safeGetTitle(activePage);
    const screenshot = await safeGetScreenshot(activePage);
    const interactiveElements = await getInteractiveElements(activePage);
    const mediaState = await getMediaState(activePage);

    res.json({
      success: true,
      url: currentUrl,
      title,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      interactiveElements,
      mediaState
    });

  } catch (error: any) {
    console.error(`Navigation Error in session ${sessionId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to navigate page' });
  }
});

// 🖱️ BROWSER ACTIONS API (click, type, scroll, key, history navigation, reload)
app.post('/api/browser/action', async (req, res) => {
  const { sessionId, action, x, y, value, width = 1280, height = 800 } = req.body;
  
  if (!sessionId || !action) {
    return res.status(400).json({ error: 'Missing sessionId or action' });
  }

  try {
    const { page } = await getOrCreateSession(sessionId);
    await page.setViewport({ width: Number(width) || 1280, height: Number(height) || 800 });

    const sessionDoc = sessions.get(sessionId);
    if (sessionDoc) {
      sessionDoc.lastActive = Date.now();
    }

    console.log(`[Session ${sessionId}] Simulating action: ${action} (${x || 0}, ${y || 0})`);

    if (action === 'click') {
      // Simulate raw click
      await page.mouse.click(Number(x) || 0, Number(y) || 0);
    } else if (action === 'type') {
      // Click field and type text
      if (x && y) {
        await page.mouse.click(Number(x), Number(y));
      }
      // Select all and type to replace contents
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      await page.keyboard.type(value || '');
      await page.keyboard.press('Enter');
    } else if (action === 'scroll') {
      // Scroll down/up by value or delta
      const delta = Number(value) || 300;
      await page.evaluate((scrollDelta) => {
        window.scrollBy({ top: scrollDelta, behavior: 'smooth' });
      }, delta);
    } else if (action === 'back') {
      await page.goBack().catch(() => {});
    } else if (action === 'forward') {
      await page.goForward().catch(() => {});
    } else if (action === 'reload') {
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    }

    // Wait for changes to process
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Gather updated screenshot & particulars safely with resilience to transient context destruction
    const currentUrl = page.url();
    if (sessionDoc) {
      sessionDoc.url = currentUrl;
    }
    const title = await safeGetTitle(page);
    const screenshot = await safeGetScreenshot(page);
    const interactiveElements = await getInteractiveElements(page);
    const mediaState = await getMediaState(page);

    res.json({
      success: true,
      url: currentUrl,
      title,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      interactiveElements,
      mediaState
    });

  } catch (error: any) {
    console.error(`Action Error in session ${sessionId}:`, error);
    res.status(500).json({ error: error.message || 'Action execution failed' });
  }
});


// 🛠️ VITE MIDDLEWARE SETUP
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Clean termination support
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down browser processes...');
  if (globalBrowser) {
    await globalBrowser.close().catch(() => {});
  }
  if (globalScratchBrowser) {
    await globalScratchBrowser.close().catch(() => {});
  }
  process.exit(0);
});

startServer();
