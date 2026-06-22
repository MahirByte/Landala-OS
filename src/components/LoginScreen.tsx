/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { THEMES } from './ThemeConfig';
import { ThemeId, UserProfile } from '../types';
import { playAsmrClick, playAsmrTick, playBootChime } from './SoundEngine';
import { Compass, Laptop, LogIn, Mail, Sparkles, User, Shield, Terminal } from 'lucide-react';

interface LoginScreenProps {
  onLoginComplete: (profile: UserProfile) => void;
  defaultEmail: string;
}

export default function LoginScreen({ onLoginComplete, defaultEmail }: LoginScreenProps) {
  const [step, setStep] = useState<'auth' | 'profile' | 'booting'>('auth');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('kashmir-wood');
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [currentLogIdx, setCurrentLogIdx] = useState(0);

  const selectedTheme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0];

  const firstLetter = username ? username.trim().charAt(0).toUpperCase() : 'L';

  // Sound cues for interactions
  const handleHover = () => playAsmrTick();
  const handleClick = () => playAsmrClick();

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleClick();
    if (!username) {
      setUsername(isSignUp ? 'Explorer' : 'fossguru');
    }
    setStep('profile');
  };

  const handleGoogleSignIn = () => {
    handleClick();
    // Parse name from email if available
    const parsedName = defaultEmail ? defaultEmail.split('@')[0] : 'fossguru';
    setUsername(parsedName);
    setStep('profile');
  };

  const startBootingSequence = () => {
    handleClick();
    playBootChime();
    setStep('booting');
  };

  const logDatabase = [
    '[  0.000000] Linux version 6.6.12-landala-lofi (gcc version 13.2.0) #1 SMP PREEMPT_RT',
    '[  0.024192] Landala OS: Initializing CPU scheduler with organic breathing frequency...',
    '[  0.104231] Landala OS: Initializing SoundEngine micro-kernel [ASMR, Lofi, Pentatonic-Chime]',
    '[  0.228301] Landala OS: Loading physical resonance algorithms...',
    `[  0.342129] Landala OS: Mounting theme assets [${selectedTheme.name}]`,
    `[  0.490823] Landala OS: Background engine set to '${selectedTheme.name}' color schema`,
    '[  0.510344] Landala OS: Initializing organic canvas shaders and visual renderers...',
    '[  0.642911] Landala OS: Loading core system applications: Settings, Photos, AppStore, Browser...',
    '[  0.720491] Landala OS: Mounting local dynamic drive container /home/landala/user...',
    '[  0.812391] Landala OS: Linking retro desktop game libraries [Unblock FRVR, Boing, Ball Crash]',
    '[  0.952914] Landala OS: Establishing sandboxed virtual proxy network standard gateway...',
    `[  1.100234] Landala OS: Mounting session security rules for active profile: ${username || 'fossguru'}`,
    '[  1.214022] Landala OS: Sound synthesizer ready (lofi hum enabled)',
    '[  1.328901] Landala OS: Modern taskbar environment loaded...',
    '[  1.458291] Landala OS: Boot sequence absolute successful. Welcome to peaceful space.'
  ];

  useEffect(() => {
    if (step !== 'booting') return;

    if (currentLogIdx < logDatabase.length) {
      const timer = setTimeout(() => {
        setBootLogs(prev => [...prev, logDatabase[currentLogIdx]]);
        setCurrentLogIdx(idx => idx + 1);
      }, 100 + Math.random() * 80);
      return () => clearTimeout(timer);
    } else {
      // Completed boot log, transition after a short pleasant pause
      const finishTimer = setTimeout(() => {
        onLoginComplete({
          username: username || 'fossguru',
          avatarLetter: firstLetter,
          avatarColor: selectedTheme.primary,
          selectedTheme: selectedThemeId
        });
      }, 1000);
      return () => clearTimeout(finishTimer);
    }
  }, [step, currentLogIdx]);

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 transition-colors duration-1000 select-none overflow-y-auto ${selectedTheme.bgClass}`}>
      
      {/* Decorative calm background glow */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/10 to-transparent pointer-events-none" />

      {/* STEP 1: AUTHENTICATION */}
      {step === 'auth' && (
        <div 
          id="login-auth-card"
          className="w-full max-w-md bg-stone-900/80 border border-stone-800 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-6 text-stone-200 transition-all duration-300"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-orange-400 via-pink-500 to-indigo-500 p-[3px] mb-2 animate-pulse">
              <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-pink-400 to-amber-300">L</span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex justify-center items-center gap-1.5">
              <span>LANDALA</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Linux Core</span>
            </h1>
            <p className="text-stone-400 text-sm">Quiet, therapeutic operating system environment.</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  id="login-username-input"
                  type="text"
                  placeholder="e.g., fossguru"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1">Passphrase</label>
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  id="login-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              onMouseEnter={handleHover}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium rounded-lg text-sm shadow-lg flex items-center justify-center gap-2 transition"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSignUp ? 'Create Serene Account' : 'Sign In'}</span>
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-800"></div>
            <span className="flex-shrink mx-4 text-stone-500 text-xs font-mono">OR</span>
            <div className="flex-grow border-t border-stone-800"></div>
          </div>

          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            onMouseEnter={handleHover}
            className="w-full py-2 bg-stone-950 hover:bg-stone-900 border border-stone-800 rounded-lg text-stone-300 text-sm flex items-center justify-center gap-2.5 transition"
          >
            {/* Google G graphic */}
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in with Google Account</span>
          </button>

          <div className="text-center">
            <button
              id="login-toggle-signup-btn"
              type="button"
              onClick={() => { handleClick(); setIsSignUp(!isSignUp); }}
              onMouseEnter={handleHover}
              className="text-stone-400 hover:text-white text-xs underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Do not have an account? Create Account'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROFILE PICTURE (BLACK BAGKROUND + Alphabet) & ORGANIC THEME */}
      {step === 'profile' && (
        <div 
          id="login-profile-card"
          className="w-full max-w-2xl bg-stone-900/90 border border-stone-800 backdrop-blur-xl p-8 rounded-2xl shadow-2xl text-stone-200 transition-all duration-500"
        >
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Left side: Avatar Creator / Preview */}
            <div className="flex flex-col items-center justify-center space-y-4 w-full md:w-1/3">
              <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">Profile Avatar</span>
              
              <div 
                className="w-28 h-28 rounded-full bg-black flex items-center justify-center relative shadow-inner overflow-hidden transition-all duration-500 border-4"
                style={{ borderColor: selectedTheme.primary }}
              >
                {/* Floating ambient glow in avatar */}
                <div 
                  className="absolute inset-0 opacity-20 blur-xl transition-all duration-500"
                  style={{ background: selectedTheme.primary }}
                />
                <span className="text-6xl font-black text-white relative z-10 font-mono tracking-tight">{firstLetter}</span>
              </div>

              <div className="text-center">
                <span className="text-base font-bold text-white block">{username || 'fossguru'}</span>
                <span className="text-xs font-mono text-stone-400 block mt-0.5">Profile initial set</span>
              </div>

              <div className="w-full border-t border-stone-800 pt-4 text-center">
                <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider mb-2">Configure Initial</label>
                <input
                  id="avatar-initial-input"
                  maxLength={1}
                  type="text"
                  value={firstLetter}
                  onChange={(e) => {
                    const char = e.target.value;
                    if (char) {
                      setUsername(char + (username ? username.slice(1) : ''));
                    }
                  }}
                  className="w-12 text-center py-1 bg-stone-950 border border-stone-800 rounded-lg text-white focus:outline-none font-bold uppercase font-mono text-lg"
                />
              </div>
            </div>

            {/* Right side: Modern Organic Themes Selection */}
            <div className="w-full md:w-2/3 space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Choose Your Organic Space</span>
                </h2>
                <p className="text-xs text-stone-400">Select a modern Linux desktop palette. Changes apply immediately.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {THEMES.map((theme) => {
                  const isCur = theme.id === selectedThemeId;
                  return (
                    <button
                      id={`theme-select-btn-${theme.id}`}
                      key={theme.id}
                      onClick={() => { handleClick(); setSelectedThemeId(theme.id); }}
                      onMouseEnter={handleHover}
                      type="button"
                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                        isCur 
                          ? 'bg-stone-950 border-stone-500 ring-1 ring-white/10' 
                          : 'bg-stone-950/45 border-stone-800/80 hover:border-stone-700 hover:bg-stone-950/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold font-mono text-white block truncate">{theme.name}</span>
                          <span className="text-[10px] text-stone-400 block leading-tight mt-0.5 truncate">{theme.tagline}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-stone-400 block uppercase tracking-wider">Aesthetic Pairings</span>
                <p className="text-xs text-stone-300 italic">
                  "{selectedTheme.tagline}"
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="start-boot-btn"
                  onClick={startBootingSequence}
                  onMouseEnter={handleHover}
                  className="px-6 py-2.5 bg-white text-black hover:bg-stone-200 font-bold rounded-lg text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg transition duration-200"
                >
                  <Laptop className="w-4 h-4 text-black animate-pulse" />
                  <span>Boot Landala OS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: AMBIENT LINUX BOOTING TERMINAL SEQUENCE */}
      {step === 'booting' && (
        <div 
          id="login-booting-card"
          className="w-full max-w-3xl bg-black border border-stone-900 rounded-xl p-6 shadow-2xl h-[450px] flex flex-col font-mono text-green-400 text-xs text-left"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-stone-900 pb-2 mb-4">
            <span className="text-stone-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-stone-500" />
              <span>landala-lofi-kernel v6.6.12-RT</span>
            </span>
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500/50" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <span className="w-2 h-2 rounded-full bg-green-500/50" />
            </div>
          </div>

          {/* Scrolling log container */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar scroll-smooth">
            {bootLogs.map((log, i) => {
              // Highlight selected lines
              let textColor = 'text-green-500/90';
              if (log.includes('complete') || log.includes('Welcome')) textColor = 'text-emerald-300 font-bold';
              else if (log.includes('Mounting theme') || log.includes('Background engine')) textColor = 'text-sky-300';
              else if (log.includes('SoundEngine') || log.includes('algorithms')) textColor = 'text-purple-300';
              
              return (
                <div key={i} className={`leading-relaxed tracking-wider break-words ${textColor}`}>
                  {log}
                </div>
              );
            })}
            
            {/* Blinking cursor */}
            {currentLogIdx < logDatabase.length && (
              <div className="flex items-center gap-1 mt-1 text-white">
                <span className="w-2 h-4 bg-white animate-pulse" />
                <span className="text-stone-500 text-[10px]">Loading landala modules...</span>
              </div>
            )}
          </div>

          <div className="border-t border-stone-950 pt-3 text-stone-600 flex justify-between items-center text-[10px]">
            <span>System: [OK]</span>
            <span className="animate-pulse">BOOTING ORGANIC ENVIRONMENT</span>
          </div>
        </div>
      )}

    </div>
  );
}
