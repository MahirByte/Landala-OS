/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Enable JSON parser for actions
app.use(express.json());

// Browser instance & session store
let globalBrowser: Browser | null = null;
const sessions = new Map<string, { page: Page; lastActive: number; url: string }>();

// Helper to get or open a browser instance
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
        '--hide-scrollbars'
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

// Helper to get or create a page session
async function getOrCreateSession(id: string): Promise<{ page: Page; url: string }> {
  const now = Date.now();
  const existing = sessions.get(id);
  if (existing) {
    existing.lastActive = now;
    return { page: existing.page, url: existing.url };
  }

  const browser = await getBrowser();
  console.log(`Creating new page session: ${id}`);
  const page = await browser.newPage();
  
  // Set default modern User Agent to avoid bot detection
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Set default viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Ensure window.fetch is writable/configurable on all loaded browser pages
  await page.evaluateOnNewDocument(() => {
    try {
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

  const sessionObj = { page, lastActive: now, url: 'about:blank' };
  sessions.set(id, sessionObj);

  return { page, url: 'about:blank' };
}

// Render dynamic interactive overlay data (like links, inputs)
async function getInteractiveElements(page: Page) {
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
  } catch (err) {
    return [];
  }
}

// 🌐 BROWSER NAVIGATE API
app.post('/api/browser/navigate', async (req, res) => {
  const { sessionId, url, width = 1280, height = 800 } = req.body;
  if (!sessionId || !url) {
    return res.status(400).json({ error: 'Missing sessionId or url' });
  }

  try {
    const { page } = await getOrCreateSession(sessionId);
    
    // Configure viewport size based on requests
    await page.setViewport({ width: Number(width) || 1280, height: Number(height) || 800 });

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    console.log(`[Session ${sessionId}] Navigating to: ${finalUrl}`);
    
    // Navigate with a generous timeout and wait until network is idle
    await page.goto(finalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Update session URL tracker
    const currentUrl = page.url();
    const sessionDoc = sessions.get(sessionId);
    if (sessionDoc) {
      sessionDoc.url = currentUrl;
      sessionDoc.lastActive = Date.now();
    }

    // Wait a brief movement for animations/JS
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get page specifics
    const title = await page.title();
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80, encoding: 'base64' });
    const interactiveElements = await getInteractiveElements(page);

    res.json({
      success: true,
      url: currentUrl,
      title,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      interactiveElements
    });

  } catch (error: any) {
    console.error(`Navigation Error in session ${sessionId}:`, error);
    res.status(550).json({ error: error.message || 'Failed to navigate page' });
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

    // Gather updated screenshot & particulars
    const currentUrl = page.url();
    if (sessionDoc) {
      sessionDoc.url = currentUrl;
    }
    const title = await page.title();
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80, encoding: 'base64' });
    const interactiveElements = await getInteractiveElements(page);

    res.json({
      success: true,
      url: currentUrl,
      title,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      interactiveElements
    });

  } catch (error: any) {
    console.error(`Action Error in session ${sessionId}:`, error);
    res.status(550).json({ error: error.message || 'Action execution failed' });
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
  console.log('SIGTERM received. Shutting down browser...');
  if (globalBrowser) {
    await globalBrowser.close().catch(() => {});
  }
  process.exit(0);
});

startServer();
