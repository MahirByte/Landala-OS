/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { AppWindow, ThemeConfig } from '../types';
import { playAsmrClick, playAsmrTick } from './SoundEngine';

interface WindowFrameProps {
  app: AppWindow;
  theme: ThemeConfig;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  children: React.ReactNode;
}

export default function WindowFrame({
  app,
  theme,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
  onResize,
  children
}: WindowFrameProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, appX: 0, appY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, appW: 0, appH: 0 });
  const resizeModeRef = useRef<'se' | 'e' | 's'>('se');
  const windowRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    onFocus(app.id);
  };

  const handleDragStart = (e: React.PointerEvent) => {
    // Only drag with left mouse button / basic touch pointer
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (app.isMaximized) return;

    onFocus(app.id);
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      appX: app.x,
      appY: app.y
    };

    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    // Constraints: keep the header partly on screen
    const newX = dragStartRef.current.appX + dx;
    const newY = Math.max(0, dragStartRef.current.appY + dy); // prevent dragging above screen

    onMove(app.id, newX, newY);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    playAsmrClick();
  };

  const handleResizeStart = (e: React.PointerEvent, mode: 'se' | 'e' | 's' = 'se') => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (app.isMaximized) return;

    onFocus(app.id);
    setIsResizing(true);
    resizeModeRef.current = mode;

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      appW: app.w,
      appH: app.h
    };

    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    
    const dx = e.clientX - resizeStartRef.current.x;
    const dy = e.clientY - resizeStartRef.current.y;
    
    let newW = app.w;
    let newH = app.h;

    if (resizeModeRef.current === 'e' || resizeModeRef.current === 'se') {
      newW = Math.max(320, resizeStartRef.current.appW + dx);
    }
    if (resizeModeRef.current === 's' || resizeModeRef.current === 'se') {
      newH = Math.max(240, resizeStartRef.current.appH + dy);
    }

    onResize(app.id, newW, newH);
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    playAsmrClick();
  };

  const headerStyle = theme.isLight ? undefined : {
    backgroundColor: `${theme.primary}ee`,
    borderColor: theme.borderColor,
  };

  const hoverSound = () => playAsmrTick();
  const clickSound = () => playAsmrClick();

  return (
    <div
      id={`window-frame-${app.id}`}
      ref={windowRef}
      onPointerDown={handlePointerDown}
      className={`absolute flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 border backdrop-blur-md select-none ${
        app.isMinimized ? 'hidden' : ''
      } ${
        app.isMaximized 
          ? 'inset-x-0 top-0 bottom-0 rounded-none border-x-0 border-t-0' 
          : `${theme.borderCol} border-white/40`
      }`}
      style={{
        zIndex: app.zIndex,
        ...(app.isMaximized 
          ? {} 
          : { 
              left: `${app.x}px`, 
              top: `${app.y}px`, 
              width: `${app.w}px`, 
              height: `${app.h}px` 
            })
      }}
    >
      {/* 
        CRITICAL: Mouse-shield layer which prevents the underlying iframe 
        from consuming mouse movements during active dragging or resizing Operations.
      */}
      {(isDragging || isResizing) && (
        <div 
          id={`window-shield-${app.id}`} 
          className={`absolute inset-0 bg-transparent z-[9999] ${
            isDragging 
              ? 'cursor-move' 
              : resizeModeRef.current === 'e' 
                ? 'cursor-e-resize' 
                : resizeModeRef.current === 's' 
                  ? 'cursor-s-resize' 
                  : 'cursor-se-resize'
          }`} 
        />
      )}

      {/* WINDOW TITLE BAR */}
      <div
        id={`window-header-${app.id}`}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onDoubleClick={() => { clickSound(); onMaximize(app.id); }}
        className={`h-12 px-4 flex items-center justify-between cursor-move select-none border-b shrink-0 ${
          theme.isLight 
            ? `${theme.panelHeaderBg} ${theme.textColor} border-b ${theme.borderCol}` 
            : 'text-white'
        } font-sans font-medium`}
        style={headerStyle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Favicon / Icon render */}
          {app.icon.startsWith('http') ? (
            <img 
              src={app.icon} 
              alt={app.title} 
              className="w-4 h-4 object-contain rounded" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If favicon fails, replace manually
                (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=32&domain=${app.url || 'google.com'}`;
              }}
            />
          ) : (
            <span className={`text-[10px] uppercase tracking-wider shrink-0 font-bold px-1.5 py-0.5 rounded flex items-center justify-center font-mono ${
              theme.isLight 
                ? `${theme.buttonBg} ${theme.buttonText}` 
                : 'bg-white/20 text-white'
            }`}>
              {app.title.charAt(0).toUpperCase()}
            </span>
          )}
          <span className={`text-xs truncate font-semibold select-none ${theme.isLight ? theme.textColor : 'text-white'}`}>{app.title}</span>
        </div>

        {/* WINDOW STYLING CONTROLS */}
        <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          {/* Minimize button */}
          <button
            id={`win-minimize-${app.id}`}
            onClick={() => { clickSound(); onMinimize(app.id); }}
            onMouseEnter={hoverSound}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
              theme.isLight 
                ? `hover:bg-black/5 ${theme.textColor}` 
                : 'hover:bg-white/20 text-white/80 hover:text-white'
            }`}
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore button */}
          <button
            id={`win-maximize-${app.id}`}
            onClick={() => { clickSound(); onMaximize(app.id); }}
            onMouseEnter={hoverSound}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
              theme.isLight 
                ? `hover:bg-black/5 ${theme.textColor}` 
                : 'hover:bg-white/20 text-white/80 hover:text-white'
            }`}
            title={app.isMaximized ? "Restore Size" : "Maximize"}
          >
            {app.isMaximized ? <Copy className="w-3" h-3 /> : <Square className="w-3 h-3" />}
          </button>

          {/* Close button */}
          <button
            id={`win-close-${app.id}`}
            onClick={() => { clickSound(); onClose(app.id); }}
            onMouseEnter={hoverSound}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
              theme.isLight 
                ? 'hover:bg-red-500/10 text-red-600' 
                : 'hover:bg-red-500/80 text-white/80 hover:text-white'
            }`}
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* WINDOW VIEW CONTENTS */}
      <div id={`window-body-${app.id}`} className={`flex-1 overflow-hidden relative flex flex-col ${theme.panelBg} ${theme.textColor}`}>
        {children}
      </div>

      {/* RESIZE HANDLES (Only visible when not maximized) */}
      {!app.isMaximized && (
        <>
          {/* Right Edge (Horizontal stretch) */}
          <div
            id={`window-resize-e-${app.id}`}
            onPointerDown={(e) => handleResizeStart(e, 'e')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            className="absolute right-0 top-3 bottom-3 w-2 cursor-e-resize z-[100] hover:bg-white/10 active:bg-white/20 transition-colors"
            title="Drag to stretch horizontally"
          />

          {/* Bottom Edge (Vertical stretch) */}
          <div
            id={`window-resize-s-${app.id}`}
            onPointerDown={(e) => handleResizeStart(e, 's')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            className="absolute bottom-0 left-3 right-3 h-2 cursor-s-resize z-[100] hover:bg-white/10 active:bg-white/20 transition-colors"
            title="Drag to stretch vertically"
          />

          {/* Bottom-Right Corner (Diagonal free stretch) */}
          <div
            id={`window-resize-${app.id}`}
            onPointerDown={(e) => handleResizeStart(e, 'se')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            className="absolute right-0 bottom-0 w-5 h-5 cursor-se-resize z-[100] flex items-end justify-end p-0.5"
            title="Drag to resize freely"
          >
            {/* subtle resize stripe decor */}
            <svg className="w-3 h-3 text-white/30" viewBox="0 0 12 12" fill="none">
              <path d="M10 2L2 10M10 6L6 10M10 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
