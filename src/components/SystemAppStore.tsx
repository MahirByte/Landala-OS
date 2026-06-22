/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingBag, Download, Trash, Check, Sparkles, AlertCircle, PlusCircle } from 'lucide-react';
import { AppMetadata, ThemeConfig } from '../types';
import { playAsmrClick, playAsmrTick, playBubbleSound } from './SoundEngine';

// Predefined catalog of premium apps that can be unpinned or on-clicked to install
const PRESET_STORE_APPS: AppMetadata[] = [
  {
    id: 'youtube',
    title: 'YouTube Radio',
    icon: 'https://www.youtube.com/s/desktop/2cd57662/img/favicon_32x32.png',
    type: 'web',
    url: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1' // embedding peaceful lofi live loop!
  },
  {
    id: 'facebook',
    title: 'Facebook Social',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=facebook.com',
    type: 'web',
    url: 'https://facebook.com'
  },
  {
    id: 'messenger',
    title: 'Messenger Desktop',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=messenger.com',
    type: 'web',
    url: 'https://messenger.com'
  },
  {
    id: 'scratch',
    title: 'Scratch Studio',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=scratch.mit.edu',
    type: 'web',
    url: 'https://scratch.mit.edu'
  },
  {
    id: 'wikipedia',
    title: 'Wiki Serene Desk',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=wikipedia.org',
    type: 'web',
    url: 'https://en.m.wikipedia.org/'
  }
];

interface SystemAppStoreProps {
  installedApps: AppMetadata[];
  onInstallApp: (app: AppMetadata) => void;
  onUninstallApp: (id: string) => void;
  theme: ThemeConfig;
}

export default function SystemAppStore({
  installedApps,
  onInstallApp,
  onUninstallApp,
  theme
}: SystemAppStoreProps) {
  // Custom installation details
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [errorBox, setErrorBox] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const soundTick = () => playAsmrTick();
  const soundClick = () => playAsmrClick();

  const handleInstallPreset = (app: AppMetadata) => {
    soundClick();
    onInstallApp(app);
    playBubbleSound();
    
    setToastMessage(`Installed "${app.title}" to OS desktop!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleUninstallPreset = (id: string, name: string) => {
    soundClick();
    onUninstallApp(id);
    playBubbleSound();
    
    setToastMessage(`Uninstalled "${name}" successfully.`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCustomInstallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBox('');

    if (!customName.trim() || !customUrl.trim()) return;

    soundClick();

    // Sanitize URL protocol
    let targetUrl = customUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      // Basic domain check to resolve favicon cleanly
      const urlObj = new URL(targetUrl);
      const domain = urlObj.hostname;
      const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

      const generatedId = 'user-app-' + Date.now();
      const newApp: AppMetadata = {
        id: generatedId,
        title: customName.trim(),
        icon: faviconUrl,
        type: 'web',
        url: targetUrl,
        isCustom: true
      };

      onInstallApp(newApp);
      playBubbleSound();
      
      setToastMessage(`Custom App "${customName}" is now fully installed!`);
      setTimeout(() => setToastMessage(''), 2500);

      setCustomName('');
      setCustomUrl('');
    } catch (err) {
      setErrorBox('Invalid URL format. Please supply a clean, absolute web link.');
    }
  };

  return (
    <div id="store-app" className="h-full flex flex-col bg-stone-900/40 text-stone-200">
      
      {/* Dynamic feedback toast */}
      {toastMessage && (
        <div id="store-toast" className="absolute top-16 right-8 bg-emerald-600/90 text-white font-mono px-3 py-1.5 rounded text-xs z-[999] shadow-lg flex items-center gap-1.5 animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP DESCRIPTOR & HEADER INSTRUCTIONS */}
      <div id="store-banner" className="bg-[#1c1c1e] border-b border-stone-900 p-4 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-5.5 h-5.5 text-amber-500 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-white font-sans">Landala AppStore</h2>
            <p className="text-[10px] text-stone-400 font-mono">Extend your peaceful Linux environment by pinning web modules</p>
          </div>
        </div>

        {/* CUSTOM CREATOR BOX */}
        <form onSubmit={handleCustomInstallSubmit} className="flex flex-col sm:flex-row gap-2 max-w-lg w-full md:w-auto">
          <input
            id="store-app-name-input"
            type="text"
            placeholder="App Title (e.g., Blog)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="px-2 py-1 bg-stone-950 border border-stone-800 rounded text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono flex-1"
            required
          />
          <input
            id="store-app-url-input"
            type="text"
            placeholder="Website URL (e.g., wikipedia.org)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="px-2 py-1 bg-stone-950 border border-stone-800 rounded text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono flex-1"
            required
          />
          <button
            id="store-app-submit-btn"
            type="submit"
            onMouseEnter={soundTick}
            className="px-3.5 py-1 bg-white hover:bg-stone-200 text-black rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Install WebApp</span>
          </button>
        </form>
      </div>

      {/* ERRORS BANNER */}
      {errorBox && (
        <div id="store-error-banner" className="bg-red-950/60 border-b border-red-900/40 p-2.5 px-4 text-xs text-red-400 flex items-center gap-2 shrink-0 font-sans">
          <AlertCircle className="w-4 h-4" />
          <span>{errorBox}</span>
        </div>
      )}

      {/* RENDER LIST OF UTILITIES */}
      <div id="store-main-area" className="flex-grow overflow-y-auto p-4 custom-scrollbar space-y-6">
        
        {/* PRESET CATALOG */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase text-stone-400 tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pre-compiled Official Modules</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {PRESET_STORE_APPS.map((app) => {
              const isInstalled = installedApps.some(p => p.id === app.id);
              return (
                <div
                  id={`store-preset-item-${app.id}`}
                  key={app.id}
                  onMouseEnter={soundTick}
                  className={`p-3.5 rounded-xl border bg-stone-950/50 flex items-center justify-between transition-all ${
                    isInstalled ? 'border-amber-500/30' : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={app.icon}
                      alt={app.title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg p-1 bg-stone-900 object-contain border border-stone-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=48&domain=${app.url || 'google.com'}`;
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{app.title}</span>
                      <span className="text-[9px] text-stone-400 block truncate font-mono mt-0.5 max-w-[120px] sm:max-w-none">
                        {app.url}
                      </span>
                    </div>
                  </div>

                  {/* Install / Uninstall Button */}
                  <button
                    id={`store-preset-${app.id}-action-btn`}
                    onClick={() => {
                      if (isInstalled) {
                        handleUninstallPreset(app.id, app.title);
                      } else {
                        handleInstallPreset(app);
                      }
                    }}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                      isInstalled
                        ? 'bg-red-950/50 border border-red-500/40 text-red-400 hover:bg-red-900/60'
                        : 'bg-white hover:bg-stone-200 text-black'
                    }`}
                  >
                    {isInstalled ? 'Remove' : 'Install'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* CUSTOM APPS INSTALLED LIST */}
        <div className="space-y-3 pt-4 border-t border-stone-800">
          <h3 className="text-xs font-mono font-bold uppercase text-stone-400 tracking-wider">
            Your Installed Custom WebApps ({installedApps.filter(p => !PRESET_STORE_APPS.some(preset => preset.id === p.id)).length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {installedApps
              .filter(p => p.id.startsWith('user-app-'))
              .map((app) => (
                <div
                  id={`store-user-item-${app.id}`}
                  key={app.id}
                  className="p-3 rounded-xl border border-stone-850 bg-stone-950/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={app.icon}
                      alt={app.title}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded bg-stone-900 p-0.5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=32&domain=${app.url || 'google.com'}`;
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{app.title}</span>
                      <span className="text-[9px] text-stone-500 font-mono block truncate max-w-[130px]">
                        {app.url}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`store-user-rm-${app.id}`}
                    onClick={() => handleUninstallPreset(app.id, app.title)}
                    className="p-1 rounded hover:bg-red-950 hover:text-red-400 text-stone-400 transition"
                    title="Remove custom pin"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

            {installedApps.filter(p => p.id.startsWith('user-app-')).length === 0 && (
              <div className="col-span-full py-6 text-center text-[11px] text-stone-500 font-mono italic">
                No custom websites installed yet. Formulate them using the bar above!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
