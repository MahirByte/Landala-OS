/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Search, Bookmark, Compass, Globe, Sparkles, Heart } from 'lucide-react';
import { AppWindow, BrowserBookmark, BrowserEngine, ThemeConfig } from '../types';
import { playAsmrClick, playAsmrTick, playBubbleSound } from './SoundEngine';
import SystemAppWebSandbox from './SystemAppWebSandbox';

interface SystemAppBrowserProps {
  app?: AppWindow;
  theme: ThemeConfig;
  defaultEngine: BrowserEngine;
}

// Built-in list of safe iframe links to recommend in bookmarks
const SAFE_BOOKMARKS: BrowserBookmark[] = [
  { title: 'Wikipedia Main Portal', url: 'https://en.m.wikipedia.org/wiki/Special:FeedAndPages' },
  { title: 'Scratch Studio Embed', url: 'https://scratch.mit.edu/projects/embed/1012170327/' },
  { title: 'OpenStreetMap Scenic View', url: 'https://www.openstreetmap.org/export/embed.html?bbox=73.5%2C34.0%2C74.8%2C34.8&layer=mapnik' },
  { title: 'Space Jam Classic App', url: 'https://www.spacejam.com/1996/' },
  { title: 'Sound Helix Audio Player', url: 'https://www.soundhelix.com/' },
  { title: 'Old Book Archive', url: 'https://archive.org/embed/dracula00stok' },
];

const ENGINE_HOMEPAGES: Record<BrowserEngine, string> = {
  google: 'https://www.google.com/',
  bing: 'https://www.bing.com/',
  duckduckgo: 'https://duckduckgo.com/',
  ecosia: 'https://www.ecosia.org/',
  brave: 'https://search.brave.com/'
};

const isSandboxUrl = (url: string) => {
  const domains = [
    'wikipedia.org', 
    'facebook.com', 
    'messenger.com', 
    'google.com', 
    'bing.com', 
    'duckduckgo.com', 
    'ecosia.org', 
    'brave.com'
  ];
  return domains.some(domain => url.toLowerCase().includes(domain));
};

export default function SystemAppBrowser({ app, theme, defaultEngine }: SystemAppBrowserProps) {
  const [engine, setEngine] = useState<BrowserEngine>(defaultEngine);
  const [urlInput, setUrlInput] = useState(ENGINE_HOMEPAGES[defaultEngine] || 'https://www.google.com/');
  const [currentUrl, setCurrentUrl] = useState(ENGINE_HOMEPAGES[defaultEngine] || 'https://www.google.com/');
  const [history, setHistory] = useState<string[]>([ENGINE_HOMEPAGES[defaultEngine] || 'https://www.google.com/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeEngineResults, setActiveEngineResults] = useState<any[]>([]);

  // Sync engine changes from settings config
  useEffect(() => {
    setEngine(defaultEngine);
  }, [defaultEngine]);

  const soundTick = () => playAsmrTick();
  const soundClick = () => playAsmrClick();

  // Default Search Engine URLs
  const getSearchUrl = (query: string, currentEngine: BrowserEngine) => {
    const term = encodeURIComponent(query);
    if (currentEngine === 'google') return `https://www.google.com/search?q=${term}`;
    if (currentEngine === 'bing') return `https://www.bing.com/search?q=${term}`;
    if (currentEngine === 'ecosia') return `https://www.ecosia.org/search?q=${term}`;
    if (currentEngine === 'brave') return `https://search.brave.com/search?q=${term}`;
    return `https://duckduckgo.com/?q=${term}`;
  };

  // Handle URL changes and navigation history
  const navigateTo = (url: string, updateInput = true) => {
    soundClick();
    setIframeError(false);
    setIsSearching(false);
    
    // Check if it should be treated as search query:
    const isUrl = url.startsWith('http://') || url.startsWith('https://') || url.includes('.') || url.includes('/') || url.includes(':');
    
    let absoluteUrl = url.trim();
    if (!isUrl) {
      // It is a text search! Retrieve genuine search query URL
      absoluteUrl = getSearchUrl(url, engine);
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      absoluteUrl = 'https://' + url;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(absoluteUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentUrl(absoluteUrl);
    if (updateInput) setUrlInput(absoluteUrl);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      soundClick();
      setIframeError(false);
      setIsSearching(false);
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      const targetUrl = history[prevIdx];
      setCurrentUrl(targetUrl);
      setUrlInput(targetUrl);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      soundClick();
      setIframeError(false);
      setIsSearching(false);
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const targetUrl = history[nextIdx];
      setCurrentUrl(targetUrl);
      setUrlInput(targetUrl);
    }
  };

  const handleRefresh = () => {
    soundClick();
    setIframeError(false);
    // Fake reloading trigger
    const tempUrl = currentUrl;
    setCurrentUrl('');
    setTimeout(() => {
      setCurrentUrl(tempUrl);
    }, 100);
  };

  const handleSearchKeyPress = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      navigateTo(urlInput.trim());
    }
  };

  // Mock search matches to trigger extremely lifelike feedback
  const executeSearch = (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    playBubbleSound();

    // Prepare search engine data
    const terms = query.toLowerCase();
    const mockResults = [
      {
        title: `Lofi beats to relax, study & sleep to - landala recommendations`,
        url: 'https://en.wikipedia.org/wiki/Lofi_girl',
        desc: `Discover beautiful organic soundscapes, low-pass relaxing keyboard chords, and acoustic ASMR clicking tracks on Landala Linux. Perfect for developers writing custom code.`,
        category: 'music'
      },
      {
        title: `Unblock FRVR - Play free sliding path block game on Landala OS`,
        url: 'https://unblock.frvr.com/alc/?web&source=frvr.com&action=browse_filtered&theme=light',
        desc: `A highly therapeutic logic puzzle. Clear paths and slide the wooden red block to safety in this fully integrated offline HTML5 game launcher.`,
        category: 'game'
      },
      {
        title: `Landala Operating System - Official documentation wiki`,
        url: 'https://en.wikipedia.org/wiki/Linux',
        desc: `Landala is a modern desktop environment simulation crafted in React + Tailwind. Supports custom profile pictures, 7 themes (Kashmir Wood, Aquamarine, Sapphire...), lofi sound synthesis, and high productivity.`,
        category: 'wiki'
      },
      {
        title: `Peaceful Scenic Photography & Ambient Landscapes`,
        url: 'https://en.wikipedia.org/wiki/Landscape_photography',
        desc: `Sandalwood deserts, Birch forest winters, Acacia savanna sunrises, Kashmir rich cedar log cabins. View organic calming image repositories built right inside Landala.`,
        category: 'images'
      }
    ];

    // Filter or re-order just to feel alive
    const processed = mockResults.sort(() => Math.random() - 0.5);
    setActiveEngineResults(processed);
  };

  // Engine branding styles
  const getEngineColor = () => {
    if (engine === 'google') return 'text-blue-400';
    if (engine === 'bing') return 'text-teal-400';
    if (engine === 'ecosia') return 'text-emerald-400';
    if (engine === 'brave') return 'text-orange-500';
    return 'text-amber-500'; // DuckDuckGo
  };

  const getEngineLogo = () => {
    if (engine === 'google') {
      return (
        <span className="font-extrabold text-2xl tracking-tight text-center">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-yellow-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-green-500">l</span>
          <span className="text-red-500">e</span>
        </span>
      );
    }
    if (engine === 'bing') {
      return (
        <span className="font-extrabold text-2xl tracking-tight text-teal-400 font-sans flex items-center justify-center gap-1">
          <Globe className="w-6 h-6 text-teal-400 animate-spin-slow" />
          <span>b</span><span className="text-white">ing</span>
        </span>
      );
    }
    if (engine === 'ecosia') {
      return (
        <span className="font-extrabold text-2xl tracking-tight text-emerald-500 font-sans flex items-center justify-center gap-1.5">
          <span>🌳</span>
          <span>Ecosia</span>
        </span>
      );
    }
    if (engine === 'brave') {
      return (
        <span className="font-extrabold text-2xl tracking-tight text-orange-500 font-sans flex items-center justify-center gap-1.5">
          <span>🦁</span>
          <span>Brave Search</span>
        </span>
      );
    }
    return (
      <span className="font-extrabold text-2xl tracking-tight text-amber-500 font-mono flex items-center justify-center gap-1.5">
        <span>🦆</span>
        <span>DuckDuckGo</span>
      </span>
    );
  };

  return (
    <div id="browser-app-container" className="flex flex-col h-full bg-[#18181b] text-stone-200">
      
      {/* ADDRESS / NAV BAR */}
      <div id="browser-nav-bar" className="bg-[#242427] border-b border-stone-800 p-2.5 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            id="browser-nav-back"
            onClick={handleBack}
            disabled={historyIndex <= 0}
            onMouseEnter={soundTick}
            className="p-1.5 rounded hover:bg-stone-800 text-stone-300 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            id="browser-nav-forward"
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            onMouseEnter={soundTick}
            className="p-1.5 rounded hover:bg-stone-800 text-stone-300 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            id="browser-nav-refresh"
            onClick={handleRefresh}
            onMouseEnter={soundTick}
            className="p-1.5 rounded hover:bg-stone-800 text-stone-300"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* INPUT URL BOX */}
        <form onSubmit={handleSearchKeyPress} className="flex-1 max-w-2xl relative">
          <div className="absolute left-3 top-2 flex items-center gap-1 text-stone-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            id="browser-url-input"
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={`Search query or address (via ${engine.toUpperCase()})`}
            className="w-full pl-9 pr-20 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-stone-500 font-mono"
          />
          <div className="absolute right-2 top-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-[9px] uppercase font-mono text-stone-400">
            {engine}
          </div>
        </form>

        {/* Home Button toggler */}
        <button
          id="browser-nav-home"
          onClick={() => navigateTo(ENGINE_HOMEPAGES[engine])}
          onMouseEnter={soundTick}
          className="p-1.5 rounded hover:bg-stone-800 text-stone-300 flex items-center gap-1.5 text-xs font-mono"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Home</span>
        </button>
      </div>

      {/* QUICK BOOKMARKS TAB */}
      <div id="browser-bookmarks-drawer" className="bg-[#1c1c1e] border-b border-stone-900 px-3 py-1.5 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1 shrink-0">
          <Bookmark className="w-3 h-3 text-emerald-500" />
          <span>Bookmarks:</span>
        </span>
        {SAFE_BOOKMARKS.map((bookmark) => (
          <button
            id={`bookmark-btn-${bookmark.title.replace(/\s+/g, '-').toLowerCase()}`}
            key={bookmark.title}
            onClick={() => navigateTo(bookmark.url)}
            onMouseEnter={soundTick}
            className="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-850 text-[10px] text-stone-300 border border-stone-800 inline-flex items-center gap-1 transition shrink-0 font-sans"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{bookmark.title}</span>
          </button>
        ))}
      </div>

      {/* MAIN VIEW AREA: IFRAME OR MOCK SEARCH */}
      <div id="browser-main-view" className="flex-1 bg-stone-900 relative">
        {isSearching ? (
          /* MOCK SEARCH ENGINE SCREEN */
          <div id="browser-mock-search" className="absolute inset-0 bg-[#0c0c0e] overflow-y-auto p-6 md:p-10 font-sans text-stone-300">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* Branded Search Header */}
              <div className="flex flex-col items-center space-y-2 mb-8 border-b border-stone-900 pb-6">
                {getEngineLogo()}
                <p className="text-[10px] font-mono text-stone-500 italic uppercase">
                  Relaxing Search Results for "{searchQuery}"
                </p>
              </div>

              {/* Action query indicator */}
              <div className="text-xs text-stone-400 font-mono">
                Showing top serene matches on Landala Linux core:
              </div>

              {/* Results */}
              <div className="space-y-6">
                {activeEngineResults.map((res, i) => (
                  <div key={i} className="p-4 rounded-xl bg-stone-950/60 border border-stone-900 hover:border-stone-800 transition">
                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wide block mb-1">
                      {res.category}
                    </span>
                    <button
                      onClick={() => navigateTo(res.url)}
                      className="text-sm font-bold text-sky-400 hover:text-sky-300 hover:underline text-left block mb-1.5"
                    >
                      {res.title}
                    </button>
                    <p className="text-xs text-stone-400 leading-relaxed font-sans">
                      {res.desc}
                    </p>
                    <div className="mt-2 text-[10px] text-stone-600 font-mono break-all font-semibold">
                      {res.url}
                    </div>
                  </div>
                ))}

                {activeEngineResults.length === 0 && (
                  <div className="text-center py-10 text-stone-500 text-xs">
                    No results found. Calm down and try another search!
                  </div>
                )}
              </div>

              {/* Safe space footer */}
              <div className="border-t border-stone-900 pt-6 text-center space-y-2">
                <span className="inline-flex items-center gap-1 text-[10px] text-stone-600 font-mono">
                  <Heart className="w-3 h-3 text-rose-500" />
                  <span>Landala Linux Search engine is sandboxed for peace of mind.</span>
                </span>
              </div>

            </div>
          </div>
        ) : (
          /* STANDARD IFRAME VIEWER */
          <>
            {currentUrl ? (
              isSandboxUrl(currentUrl) ? (
                <SystemAppWebSandbox
                  app={app ? { ...app, url: currentUrl } : { id: 'browser-web-sandbox', url: currentUrl, title: 'Portal Page', isMaximized: false } as any}
                  theme={theme}
                />
              ) : (
                <iframe
                  id="browser-iframe-window"
                  src={currentUrl}
                  title="Browser Window"
                  className="w-full h-full border-none bg-stone-950"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  onError={() => setIframeError(true)}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-stone-500 font-mono animate-pulse">
                Reloading sandbox context...
              </div>
            )}

            {/* Note about blocked frames in iframe settings */}
            <div className="absolute bottom-2 right-2 max-w-[280px] p-2 rounded bg-black/90 border border-stone-800 text-[9px] text-stone-400 leading-tight">
              ⚠️ Note: Many sites (Google, Facebook) block direct iframe rendering. Use clean **Bookmarks** above, or type words to execute the *Sandbox Search*!
            </div>
          </>
        )}
      </div>

    </div>
  );
}
