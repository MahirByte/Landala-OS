/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ExternalLink, 
  ArrowLeft, 
  ArrowRight,
  RotateCw,
  Home,
  Loader2, 
  HelpCircle,
  AlertTriangle,
  MousePointer,
  Keyboard,
  ChevronsDown,
  ChevronsUp,
  Sliders,
  Check,
  Download,
  Folder
} from 'lucide-react';
import { AppWindow, ThemeConfig } from '../types';
import { playAsmrClick, playAsmrTick, playBubbleSound } from './SoundEngine';

interface SystemAppWebSandboxProps {
  app: AppWindow;
  theme: ThemeConfig;
}

interface InteractiveElement {
  tag: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  href?: string;
  placeholder?: string;
}

export default function SystemAppWebSandbox({ app, theme }: SystemAppWebSandboxProps) {
  const isMaximized = app?.isMaximized;
  const initialUrl = app.url || 'https://www.google.com/';
  const containerRef = useRef<HTMLDivElement>(null);

  const sessionId = `browser-session-${app.id}`;

  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState(app.title || 'Browser Session');
  
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [interactiveElements, setInteractiveElements] = useState<InteractiveElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Pointer lock simulated mouse variables
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [vCursorState, setVCursorState] = useState({ x: 640, y: 400 });
  const virtualCursorRef = useRef({ x: 640, y: 400 });

  // Overlays / Highlights
  const [showOverlays, setShowOverlays] = useState(true);
  const [activeInput, setActiveInput] = useState<{ x: number; y: number; placeholder: string } | null>(null);
  const [typeValue, setTypeValue] = useState('');

  const soundTick = () => playAsmrTick();
  const soundClick = () => playAsmrClick();

  // Run navigator
  const navigateTo = async (urlToGo: string) => {
    if (!urlToGo.trim()) return;
    soundClick();
    setLoading(true);
    setError(null);
    setActiveInput(null);

    let destination = urlToGo.trim();
    if (!/^https?:\/\//i.test(destination)) {
      destination = 'https://' + destination;
    }

    setUrlInput(destination);

    try {
      const res = await fetch('/api/browser/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          url: destination,
          width: 1280,
          height: 800
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setScreenshot(data.screenshot);
        setCurrentUrl(data.url);
        setUrlInput(data.url);
        setPageTitle(data.title || 'Browser Session');
        setInteractiveElements(data.interactiveElements || []);
      } else {
        throw new Error(data.error || 'Failed to open page');
      }
    } catch (err: any) {
      console.error('Puppeteer navigation error:', err);
      setError(err.message || 'The Chromium browser emulator could not open this page.');
    } finally {
      setLoading(false);
    }
  };

  // Perform browser actions (click, type, scroll, back, etc.)
  const triggerAction = async (payload: { action: string; x?: number; y?: number; value?: string }) => {
    soundClick();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/browser/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...payload,
          width: 1280,
          height: 800
        })
      });

      if (!res.ok) {
        throw new Error(`Action failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setScreenshot(data.screenshot);
        setCurrentUrl(data.url);
        setUrlInput(data.url);
        setPageTitle(data.title || 'Browser Session');
        setInteractiveElements(data.interactiveElements || []);
      } else {
        throw new Error(data.error || 'Action execution failed');
      }
    } catch (err: any) {
      console.error('Puppeteer action error:', err);
      setError(err.message || 'Interaction action could not be executed.');
    } finally {
      setLoading(false);
    }
  };

  // Perform clicking math (handles inputs, triggers navigation)
  const triggerVirtualClick = (pageX: number, pageY: number) => {
    if (loading || !screenshot) return;

    console.log(`Executing virtual click projection at (${pageX}, ${pageY})`);

    const clickedElement = interactiveElements.find(el => {
      const pad = 4;
      return pageX >= el.x - pad &&
             pageX <= el.x + el.w + pad &&
             pageY >= el.y - pad &&
             pageY <= el.y + el.h + pad;
    });

    if (clickedElement && (clickedElement.tag === 'input' || clickedElement.tag === 'textarea')) {
      soundTick();
      setActiveInput({
        x: clickedElement.x,
        y: clickedElement.y,
        placeholder: clickedElement.placeholder || 'Type here and submit...'
      });
      setTypeValue('');
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else {
      triggerAction({ action: 'click', x: pageX, y: pageY });
    }
  };

  // Upgraded click helper that requests pointer lock on the viewport
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (loading || !screenshot) return;

    if (document.pointerLockElement !== containerRef.current) {
      try {
        containerRef.current?.requestPointerLock();
      } catch (err) {
        console.warn('Pointer Lock Request Denied:', err);
      }
    } else {
      // If already locked, a normal click is handled by our document mousedown listener.
      // But we can also fallback click here just in case:
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const pageX = Math.round(clickX * (1280 / rect.width));
      const pageY = Math.round(clickY * (800 / rect.height));
      triggerVirtualClick(pageX, pageY);
    }
  };

  // Pointer lock change listeners & Virtual Mouse updates
  useEffect(() => {
    const handleLockChange = () => {
      const isLocked = document.pointerLockElement === containerRef.current;
      setIsPointerLocked(isLocked);
      if (isLocked) {
        // center cursor when locking starts
        virtualCursorRef.current = { x: 640, y: 400 };
        setVCursorState({ x: 640, y: 400 });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== containerRef.current) return;
      
      const newX = Math.max(0, Math.min(1280, virtualCursorRef.current.x + e.movementX));
      const newY = Math.max(0, Math.min(800, virtualCursorRef.current.y + e.movementY));
      
      virtualCursorRef.current = { x: newX, y: newY };
      setVCursorState({ x: newX, y: newY });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== containerRef.current) return;
      // Triggers click projection on left click
      if (e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        triggerVirtualClick(virtualCursorRef.current.x, virtualCursorRef.current.y);
      }
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [interactiveElements, loading, screenshot]);

  // Submit in-app typewriter field
  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInput) return;
    
    triggerAction({
      action: 'type',
      x: activeInput.x,
      y: activeInput.y,
      value: typeValue
    });
    setActiveInput(null);

    // Re-lock pointer back to original chromium screen environment
    setTimeout(() => {
      try {
        containerRef.current?.requestPointerLock();
      } catch (err) {
        console.warn('Pointer lock auto-restore failed:', err);
      }
    }, 150);
  };

  // Save current view screenshot to Virtual File Manager
  const handleDownload = () => {
    if (!screenshot) return;
    soundClick();
    
    // Create virtual file name matching the webpage title
    let cleanName = pageTitle.trim()
      .replace(/[^a-zA-Z4-9_]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    if (!cleanName || cleanName === '_') {
      cleanName = 'webpage_view';
    }
    
    const fileName = `${cleanName}_${Date.now().toString().slice(-4)}.jpg`;

    const newFile = {
      id: `file-${Date.now()}`,
      name: fileName,
      type: 'image',
      size: `${Math.round((screenshot.length * 3) / 4 / 1024)} KB`,
      content: screenshot, // base64 payload
      url: currentUrl,
      date: new Date().toLocaleString()
    };

    try {
      const existing = localStorage.getItem('landala_virtual_files');
      const filesList = existing ? JSON.parse(existing) : [];
      localStorage.setItem('landala_virtual_files', JSON.stringify([newFile, ...filesList]));
      playBubbleSound();
      setDownloadSuccessToast(`Successfully downloaded "${fileName}" to File Manager!`);
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Hot-load page on mount
  useEffect(() => {
    navigateTo(initialUrl);
  }, [initialUrl]);

  return (
    <div id={`web-emulator-${app.id}`} className="h-full flex flex-col overflow-hidden bg-stone-900 border border-stone-800 rounded-xl shadow-2xl relative select-none font-sans text-stone-200">
      
      {/* 🚀 EMULATOR HEADER / TOOLBAR */}
      <div className="bg-stone-950 border-b border-stone-850 px-4 py-3 flex flex-wrap items-center gap-3 shrink-0">
        
        {/* Navigation keys */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => triggerAction({ action: 'back' })}
            disabled={loading}
            onMouseEnter={soundTick}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-850 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => triggerAction({ action: 'forward' })}
            disabled={loading}
            onMouseEnter={soundTick}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-850 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Go Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => triggerAction({ action: 'reload' })}
            disabled={loading}
            onMouseEnter={soundTick}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-850 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Refresh Page"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigateTo(initialUrl)}
            disabled={loading}
            onMouseEnter={soundTick}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-850 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Go Home"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Address bar input */}
        <div className="flex-1 min-w-[200px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateTo(urlInput);
            }}
            className="relative flex items-center"
          >
            <Globe className="w-4 h-4 text-stone-500 absolute left-3" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={loading}
              className="w-full bg-stone-900 border border-stone-800 disabled:opacity-65 rounded-xl pl-9 pr-24 py-1.5 text-xs text-stone-100 font-medium tracking-wide focus:outline-none focus:ring-1 focus:ring-stone-600 focus:border-transparent transition"
              placeholder="Enter URL to browse (e.g. wikipedia.org)..."
            />
            {/* Overlay indicators */}
            <div className="absolute right-2 flex items-center gap-1 text-[9px] font-mono select-none">
              <span className="bg-stone-800 text-stone-400 px-2 py-0.5 rounded-md border border-stone-750 font-semibold tracking-wider uppercase">
                Chromium
              </span>
            </div>
          </form>
        </div>

        {/* Utility Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={!screenshot || loading}
            className="px-3 py-1.5 rounded-xl border border-stone-800 bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-850 text-[11px] font-mono flex items-center gap-1.5 transition disabled:opacity-35 disabled:pointer-events-none"
            title="Download webpage screenshot to landala filesystem"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save to Files</span>
          </button>

          <button
            onClick={() => {
              soundClick();
              setShowOverlays(!showOverlays);
            }}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-1.5 transition ${
              showOverlays 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-semibold' 
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showOverlays ? 'Link Hints ON' : 'Link Hints OFF'}</span>
          </button>

          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={soundClick}
            className="p-1.5 bg-stone-900 border border-stone-800 rounded-lg text-stone-400 hover:text-white transition flex items-center justify-center"
            title="Open Original Page in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>

      {/* 📺 CRITICAL MONITORING BAR */}
      <div className="bg-stone-950 border-b border-stone-850 px-4 py-2 flex items-center justify-between text-xs font-mono text-stone-500">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-bold text-stone-300 truncate tracking-wide leading-none">{pageTitle}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-stone-500 leading-none">Sandbox CORS Bypass</span>
        </div>
      </div>

      {/* 🎭 CORE EMULATED AREA */}
      <div className="flex-1 flex overflow-hidden relative bg-stone-950">
        {/* Virtual Web Content */}
        <div className={`flex-1 flex flex-col justify-start items-center overflow-hidden select-none bg-stone-950 relative ${
          isMaximized ? 'pt-4 pb-8 px-6 sm:pt-5 sm:pb-10 sm:px-10 md:pt-6 md:pb-12 md:px-12 lg:pt-8 lg:pb-16 lg:px-16' : 'p-0'
        }`}>
          
          {error ? (
            <div className="max-w-md w-full p-6 text-center space-y-4 rounded-2xl bg-stone-900/60 border border-red-500/10 shadow-lg select-text">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto animate-bounce" />
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-stone-100">Browse Engine Fault</h3>
                <p className="text-xs text-stone-400 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={() => navigateTo(currentUrl)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-750 border border-stone-700 font-mono text-[10px] font-bold uppercase text-white rounded-lg transition shrink-0"
              >
                Retry Request
              </button>
            </div>
          ) : !screenshot && loading ? (
            <div className="text-center space-y-3 font-mono text-stone-500 py-20">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400 mx-auto" />
              <div className="text-xs tracking-wider font-bold">CONNECTING CHROME ENGINE...</div>
            </div>
          ) : screenshot ? (
            <div className={`flex items-stretch justify-center max-w-full max-h-full select-none shadow-2xl bg-stone-900 ${
              isMaximized 
                ? 'w-auto h-auto max-w-full max-h-full aspect-[1280/800] sm:aspect-[1440/800] border border-stone-800 rounded-2xl overflow-hidden'
                : 'w-full h-full border-none rounded-none !aspect-auto'
            }`}>
              
              {/* 🛡️ Left Thicc Console Frame Panel */}
              {isMaximized && (
                <div 
                  className="hidden sm:flex bg-stone-900 border-r border-stone-800 flex-col justify-between items-center py-6 px-1.5 shrink-0 select-none shadow-inner"
                  style={{ 
                    width: '5.55%',
                    minWidth: '50px',
                    backgroundImage: 'linear-gradient(to right, #1c1917, #292524, #1c1917)' 
                  }}
                >
                  {/* Visual Status Indicator */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <span className="text-[8px] font-mono text-stone-500 font-bold uppercase tracking-wider">PWR</span>
                  </div>

                  {/* Vertical Branding / Label text */}
                  <div className="font-mono text-[8px] text-stone-500 font-bold uppercase tracking-[0.3em] [writing-mode:vertical-lr] my-auto pointer-events-none select-none">
                    L A N D A L A
                  </div>

                  {/* Bottom hardware screw look */}
                  <div className="flex flex-col gap-1">
                    <div className="w-2 h-0.5 rounded bg-stone-950 border border-stone-850" />
                    <div className="w-2 h-0.5 rounded bg-stone-950 border border-stone-850" />
                  </div>
                </div>
              )}

              {/* 📺 The actual Interactive Browser emulator screen */}
              <div className={`relative flex-1 bg-stone-950 select-none overflow-hidden h-full ${
                !isMaximized ? 'w-full aspect-auto' : ''
              }`}>
                
                {/* Image Screenshot Frame */}
                <img
                  src={screenshot}
                  alt="Emulated Page View"
                  className={`w-full h-full pointer-events-none select-none max-w-full max-h-full ${
                    isMaximized ? 'object-contain' : 'object-fill'
                  }`}
                />

                {/* Click Interceptor Overlays */}
                <div
                  ref={containerRef}
                  onClick={handleViewportClick}
                  className={`absolute inset-0 z-10 ${
                    isPointerLocked ? 'cursor-none bg-transparent' : 'cursor-crosshair'
                  }`}
                />

                {/* Active virtual pointer cursor */}
                {isPointerLocked && (
                  <div 
                    className="absolute pointer-events-none z-50 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] filter transition-transform duration-75"
                    style={{
                      left: `${(vCursorState.x / 1280) * 100}%`,
                      top: `${(vCursorState.y / 800) * 100}%`,
                      transform: 'translate(-2px, -2px)'
                    }}
                  >
                    <MousePointer className="w-5 h-5 fill-white text-stone-950 stroke-[1.5]" />
                  </div>
                )}

                {/* Interactive Hints Overlay Layer (renders links on demand) */}
                {showOverlays && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    {interactiveElements.map((el, index) => {
                      const isInput = el.tag === 'input' || el.tag === 'textarea';
                      return (
                        <div
                          key={index}
                          className={`absolute border rounded-sm transition-all duration-150 ${
                            isInput 
                              ? 'border-yellow-400/40 bg-yellow-400/5 hover:border-yellow-300' 
                              : 'border-emerald-500/45 bg-emerald-500/5 hover:border-emerald-400'
                          }`}
                          style={{
                            left: `${(el.x / 1280) * 100}%`,
                            top: `${(el.y / 800) * 100}%`,
                            width: `${(el.w / 1280) * 100}%`,
                            height: `${(el.h / 800) * 100}%`
                          }}
                          title={el.text || el.href || el.tag}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Secure navigation user helper banners */}
                {!isPointerLocked ? (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-2 bg-stone-950/85 backdrop-blur-md rounded-xl border border-stone-800 text-[10px] font-mono text-stone-400 pointer-events-none z-30 shadow-2xl tracking-wide whitespace-nowrap animate-pulse">
                    Click screen to lock cursor inside browser
                  </div>
                ) : (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-2 bg-stone-950/85 backdrop-blur-md rounded-xl border border-emerald-500/30 text-[10px] font-mono text-emerald-400 pointer-events-none z-30 shadow-2xl tracking-wide whitespace-nowrap flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Interactive Session. Press <kbd className="bg-stone-800 text-stone-200 px-1 py-0.5 rounded text-[9px]">ESC</kbd> to exit.</span>
                  </div>
                )}

              </div>

              {/* 🛡️ Right Thicc Console Frame Panel */}
              {isMaximized && (
                <div 
                  className="hidden sm:flex bg-stone-900 border-l border-stone-800 flex-col justify-between items-center py-6 px-1.5 shrink-0 select-none shadow-inner"
                  style={{ 
                    width: '5.55%',
                    minWidth: '50px',
                    backgroundImage: 'linear-gradient(to left, #1c1917, #292524, #1c1917)' 
                  }}
                >
                  {/* Visual Status Indicator */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                    </div>
                    <span className="text-[8px] font-mono text-stone-500 font-bold uppercase tracking-wider">ACTIVE</span>
                  </div>

                  {/* Vertical Branding / Label text */}
                  <div className="font-mono text-[8px] text-stone-500 font-bold uppercase tracking-[0.3em] [writing-mode:vertical-rl] my-auto pointer-events-none select-none">
                    C H R O M I U M
                  </div>

                  {/* Bottom hardware screw look */}
                  <div className="flex flex-col gap-1">
                    <div className="w-2 h-0.5 rounded bg-stone-950 border border-stone-850" />
                    <div className="w-2 h-0.5 rounded bg-stone-950 border border-stone-850" />
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-20 max-w-xs space-y-3 font-mono text-stone-500">
              <Globe className="w-12 h-12 text-stone-700 mx-auto animate-pulse" />
              <p className="text-xs">
                Chromium browser session has not loaded yet. Write a URL to launch navigation.
              </p>
            </div>
          )}

        </div>

        {/* Vertical scrolling sidebar panel */}
        {screenshot && !error && (
          <div className="w-14 border-l border-stone-850 flex flex-col items-center py-4 gap-4 bg-stone-950 shrink-0">
            <button
              onClick={() => triggerAction({ action: 'scroll', value: '-350' })}
              disabled={loading}
              className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white transition cursor-help disabled:opacity-20"
              title="Scroll Up"
            >
              <ChevronsUp className="w-4 h-4" />
            </button>

            <button
              onClick={() => triggerAction({ action: 'scroll', value: '350' })}
              disabled={loading}
              className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white transition cursor-help disabled:opacity-20"
              title="Scroll Down"
            >
              <ChevronsDown className="w-4 h-4" />
            </button>

            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="text-[9px] text-stone-600 uppercase font-mono tracking-wider vertical-text font-bold rotate-90">
                SCROLLBAR
              </span>
            </div>
          </div>
        )}

      </div>

      {/* ⌨️ POPUP TYPEWRITER DIALOG OVERLAY */}
      {activeInput && (
        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-2xl space-y-4">
            
            <div className="flex items-center gap-2 text-stone-100">
              <Keyboard className="w-5 h-5 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono">Emulated Keystroke Output</h4>
            </div>

            <p className="text-[11.5px] text-stone-400 leading-relaxed font-sans">
              Type the exact text to write into the selected page form field, then press Confirm to send keystrokes to Puppeteer.
            </p>

            <form onSubmit={handleTypeSubmit} className="space-y-3.5">
              <input
                type="text"
                autoFocus
                placeholder={activeInput.placeholder}
                value={typeValue}
                onChange={(e) => setTypeValue(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 font-medium rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-transparent"
              />
              
              <div className="flex items-center justify-end gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    soundClick();
                    setActiveInput(null);
                    // Re-lock pointer on cancel too
                    setTimeout(() => {
                      try {
                        containerRef.current?.requestPointerLock();
                      } catch (err) {
                        console.warn('Pointer lock auto-restore failed:', err);
                      }
                    }, 150);
                  }}
                  className="px-3.5 py-1.5 rounded-xl hover:bg-stone-800 text-stone-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Send Keystrokes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOADING LOADING OVERLAY INDICATION */}
      {loading && (
        <div className="absolute bottom-4 right-4 bg-stone-950/90 border border-stone-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xl z-40 text-stone-400 font-mono text-[10px]">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>Syncing Puppeteer Frame...</span>
        </div>
      )}

      {/* SUCCESS DOWNLOAD TOAST INDICATOR */}
      {downloadSuccessToast && (
        <div className="absolute bottom-4 left-4 bg-stone-950/95 border border-emerald-500/40 rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl z-50 text-emerald-400 font-mono text-xs animate-bounce max-w-sm">
          <Folder className="w-5 h-5 text-emerald-405 shrink-0" />
          <div className="flex-1">
            <p className="font-bold uppercase text-[10px] text-stone-400 leading-tight">Download Synced</p>
            <p className="text-stone-200 text-[11px] leading-relaxed mt-0.5">{downloadSuccessToast}</p>
          </div>
        </div>
      )}

    </div>
  );
}
