/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { THEMES } from './ThemeConfig';
import { ThemeId, UserProfile, BrowserEngine } from '../types';
import { getSoundVolume, setSoundVolume, playAsmrClick, playAsmrTick, playBubbleSound } from './SoundEngine';
import { Sliders, User, Cpu, Volume2, Globe, Heart, RefreshCw, Layers } from 'lucide-react';

interface SystemAppSettingsProps {
  userProfile: UserProfile;
  activeThemeId: ThemeId;
  defaultEngine: BrowserEngine;
  onProfileUpdate: (updated: UserProfile) => void;
  onThemeChange: (id: ThemeId) => void;
  onEngineChange: (engine: BrowserEngine) => void;
}

export default function SystemAppSettings({
  userProfile,
  activeThemeId,
  defaultEngine,
  onProfileUpdate,
  onThemeChange,
  onEngineChange
}: SystemAppSettingsProps) {
  const [volume, setVolume] = React.useState(getSoundVolume());
  const selectedTheme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

  const soundTick = () => playAsmrTick();
  const soundClick = () => playAsmrClick();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setSoundVolume(val);
    // instant audio feedback
    playAsmrClick();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const firstLet = newName ? newName.trim().charAt(0).toUpperCase() : 'L';
    onProfileUpdate({
      ...userProfile,
      username: newName,
      avatarLetter: firstLet
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChar = e.target.value.charAt(0).toUpperCase();
    if (newChar) {
      onProfileUpdate({
        ...userProfile,
        avatarLetter: newChar
      });
    }
  };

  const selectColorTheme = (id: ThemeId) => {
    soundClick();
    onThemeChange(id);
    playBubbleSound();
  };

  const selectEngine = (eng: BrowserEngine) => {
    soundClick();
    onEngineChange(eng);
  };

  const sectionCardClass = `p-5 rounded-2xl border ${
    selectedTheme.isLight 
      ? `${selectedTheme.sidebarBg} ${selectedTheme.borderCol} shadow-sm` 
      : 'bg-stone-900/60 border-stone-800 shadow'
  }`;

  return (
    <div id="settings-app" className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      
      {/* HEADER SECTION */}
      <div id="settings-header" className={`flex items-center gap-4 border-b pb-4 ${selectedTheme.isLight ? selectedTheme.borderCol : 'border-stone-800'}`}>
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg"
          style={{ 
            borderColor: selectedTheme.primary,
            backgroundColor: selectedTheme.isLight ? selectedTheme.sidebarBg : 'black'
          }}
        >
          <span className={`text-xl font-bold font-mono ${selectedTheme.isLight ? selectedTheme.textColor : 'text-white'}`}>
            {userProfile.avatarLetter}
          </span>
        </div>
        <div>
          <h2 className={`text-base font-bold flex items-center gap-1.5 font-sans ${selectedTheme.textColor}`}>
            <Sliders className="w-4 h-4" />
            <span>Personalization & Settings</span>
          </h2>
          <p className={`text-[10px] font-mono ${selectedTheme.isLight ? 'text-current/60' : 'text-stone-400'}`}>Kernel Core: 6.6.12-landala-lofi-RT</p>
        </div>
      </div>

      {/* 2 COLUMN CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COLUMN 1: THEME & SOUND CONFIGS */}
        <div className="space-y-6">
          
          {/* THEMES CARD */}
          <div className={sectionCardClass}>
            <h3 className={`text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-2 mb-3 ${selectedTheme.textColor}/90`}>
              <Layers className="w-3.5 h-3.5" />
              <span>Choose Your Theme</span>
            </h3>

            <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
              {THEMES.map((theme) => {
                const isSelected = theme.id === activeThemeId;
                return (
                  <button
                    id={`settings-theme-${theme.id}`}
                    key={theme.id}
                    onClick={() => selectColorTheme(theme.id)}
                    onMouseEnter={soundTick}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected 
                        ? `${theme.panelBg} ${theme.borderCol} border-2 shadow-md ring-1 ring-black/5` 
                        : `${theme.isLight ? 'bg-black/[0.02] border-transparent hover:bg-black/[0.05]' : 'bg-stone-900/30 border-stone-900 hover:border-stone-800'}`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span 
                        className="w-8 h-8 rounded-lg flex-shrink-0 border shadow-inner" 
                        style={{ backgroundColor: theme.primary, borderColor: theme.isLight ? '#ece8e1' : '#fff/10' }}
                      />
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block truncate ${isSelected ? theme.textColor : 'text-current/80'}`}>{theme.name}</span>
                        <span className={`text-[10px] block truncate mt-0.5 ${isSelected ? theme.textColor : 'text-current/50'}`}>{theme.tagline}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedTheme.id === 'kashmir-wood' && (
              <div className="mt-3 p-2 bg-[#5A5A40]/10 rounded-xl border border-[#ece8e1]/30">
                <span className="text-[10px] leading-tight text-[#5A5A40] block">
                  🎨 <strong>Natural Tones Theme Enabled.</strong> Modeled with soft organic wood colors (#7E5B3D, #ece8e1, #5A5A40) designed to rest your eyes.
                </span>
              </div>
            )}
          </div>

          {/* AUDIO SYNTH CARD */}
          <div className={sectionCardClass}>
            <h3 className={`text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-2 mb-3.5 ${selectedTheme.textColor}/90`}>
              <Volume2 className="w-3.5 h-3.5" />
              <span>ASMR Sound Synth</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className={`${selectedTheme.isLight ? 'text-current/80' : 'text-stone-300'}`}>Acoustic Klik Volume</span>
                <span className={`font-mono font-bold ${selectedTheme.textColor}`}>{(volume * 100).toFixed(0)}%</span>
              </div>
              <input
                id="volume-slider-range"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                style={{ accentColor: selectedTheme.primary }}
                className="w-full cursor-pointer h-1.5 rounded-lg outline-none bg-black/10 hover:bg-black/15"
              />
              <span className={`text-[10px] font-mono block ${selectedTheme.isLight ? 'text-current/50' : 'text-stone-500'}`}>
                Adjusts physical lofi feedback frequency. Select 0% to silence clicks.
              </span>
            </div>
          </div>

        </div>

        {/* COLUMN 2: PROFILE & OS INFORMATION */}
        <div className="space-y-6">
          
          {/* PROFILE CARD */}
          <div className={sectionCardClass}>
            <h3 className={`text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-2 mb-3 ${selectedTheme.textColor}/90`}>
              <User className="w-3.5 h-3.5" />
              <span>User Profile Settings</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className={`block text-[10px] font-mono uppercase mb-1 ${selectedTheme.isLight ? 'text-current/70' : 'text-stone-400'}`}>Username</label>
                <input
                  id="settings-username-input"
                  type="text"
                  value={userProfile.username}
                  onChange={handleNameChange}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs transition focus:outline-none ${
                    selectedTheme.isLight 
                      ? `${selectedTheme.inputBg} ${selectedTheme.textColor} ${selectedTheme.borderCol} focus:ring-1 focus:ring-current/25` 
                      : 'bg-stone-900 border-stone-800 text-white focus:ring-1 focus:ring-stone-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-mono uppercase mb-1 ${selectedTheme.isLight ? 'text-current/70' : 'text-stone-400'}`}>Avatar Letter</label>
                <input
                  id="settings-avatar-letter-input"
                  type="text"
                  maxLength={1}
                  value={userProfile.avatarLetter}
                  onChange={handleAvatarChange}
                  className={`w-12 text-center py-1.5 border rounded-lg text-xs font-bold uppercase transition focus:outline-none ${
                    selectedTheme.isLight 
                      ? `${selectedTheme.inputBg} ${selectedTheme.textColor} ${selectedTheme.borderCol} focus:ring-1 focus:ring-current/25` 
                      : 'bg-stone-900 border-stone-800 text-white focus:ring-1 focus:ring-stone-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* BROWSER ENGINE SELECTOR */}
          <div className={sectionCardClass}>
            <h3 className={`text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-2 mb-3 ${selectedTheme.textColor}/95`}>
              <Globe className="w-3.5 h-3.5" />
              <span>Default Search Engine</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['google', 'bing', 'duckduckgo', 'ecosia', 'brave'].map((eng) => {
                const isCur = defaultEngine === eng;
                return (
                  <button
                    id={`settings-engine-${eng}`}
                    key={eng}
                    onClick={() => selectEngine(eng as BrowserEngine)}
                    onMouseEnter={soundTick}
                    className={`py-2 px-1 rounded-xl border text-center text-[10px] uppercase font-mono transition-all ${
                      isCur 
                        ? `${selectedTheme.panelBg} ${selectedTheme.borderCol} border-2 ${selectedTheme.textColor} shadow-sm font-bold` 
                        : `${selectedTheme.isLight 
                            ? 'bg-black/[0.02] border-transparent hover:bg-black/[0.05] text-current/60' 
                            : 'bg-stone-950 border-stone-900 text-stone-400 hover:text-stone-300'}`
                    }`}
                  >
                    {eng === 'duckduckgo' ? 'ddg' : eng}
                  </button>
                );
              })}
            </div>
            <span className={`text-[10px] font-mono block ${selectedTheme.isLight ? 'text-current/50' : 'text-stone-500'}`}>
              Alters search formatting and portal links inside virtual browser sessions.
            </span>
          </div>

          {/* SYSTEM HARDWARE STATS */}
          <div className={sectionCardClass}>
            <h3 className={`text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-2 mb-3.5 ${selectedTheme.textColor}/90`}>
              <Cpu className="w-3.5 h-3.5" />
              <span>Telemetry Stats</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
              {[
                { label: 'CPU cores', value: '8x Zen Core @ 3.4GHz' },
                { label: 'Physical Memory', value: '16 GB Organic RAM' },
                { label: 'OS Engine', value: 'Vite/TSX-NodeJS' },
                { label: 'ASMR Driver', value: 'WebAudio Node synth' }
              ].map((stat, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded-xl border ${
                    selectedTheme.isLight 
                      ? `${selectedTheme.panelBg} ${selectedTheme.borderCol}` 
                      : 'bg-stone-900/40 border-stone-900'
                  }`}
                >
                  <span className={`block uppercase text-[8px] mb-0.5 ${selectedTheme.isLight ? 'text-current/60' : 'text-stone-500'}`}>{stat.label}</span>
                  <span className={`text-[11px] font-semibold ${selectedTheme.isLight ? selectedTheme.textColor : 'text-white'}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER THANKS */}
      <div className={`border-t pt-4 text-center mt-4 ${selectedTheme.isLight ? selectedTheme.borderCol : 'border-stone-800'}`}>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono ${selectedTheme.isLight ? 'text-current/60' : 'text-stone-500'}`}>
          <Heart className="w-3 h-3 text-red-500" />
          <span>Personalization - Crafted for natural visual comfort.</span>
        </span>
      </div>

    </div>
  );
}
