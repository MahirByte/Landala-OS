/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  BookOpen, 
  Volume2, 
  Award, 
  HelpCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Play, 
  ClipboardList,
  Save,
  CheckCircle,
  Hash
} from 'lucide-react';
import { AppWindow, ThemeConfig } from '../types';
import { playAsmrClick, playAsmrTick, playBubbleSound } from './SoundEngine';

interface SystemAppGameProps {
  app: AppWindow;
  theme: ThemeConfig;
}

interface GameDetail {
  id: string;
  title: string;
  tagline: string;
  description: string;
  developer: string;
  controls: string[];
  tips: string[];
  difficulty: 'Relaxing' | 'Medium' | 'Challenging';
  genre: string;
}

const GAME_CATALOG: Record<string, GameDetail> = {
  'game-boing': {
    id: 'game-boing',
    title: 'Boing Platformer',
    tagline: 'Continuously bouncing reflex platformer',
    description: 'Boing is a popular reflex and platforming game developed by the gaming studio FRVR. In the game, players control a continuously bouncing character to navigate through various levels, avoid obstacles, and reach the end of the stage. The core objective is to jump as high as possible and achieve the highest score.',
    developer: 'FRVR Gaming Studio',
    difficulty: 'Medium',
    genre: 'Reflex / Platformer',
    controls: [
      'Click or Tap the screen to navigate left and right.',
      'Time your bounces perfectly to land on safety bumpers.',
      'Dodge rotating and sliding spikes as you climb higher.'
    ],
    tips: [
      'Look ahead of your bounce path to identify upcoming hazards early.',
      'Bounce consecutively on power pads to trigger high-velocity safety shields.',
      'Landing directly in the center of trampoline platforms doubles your score multiplier!'
    ]
  },
  'game-unblock': {
    id: 'game-unblock',
    title: 'Unblock Wood Slides',
    tagline: 'Tactile sliding wood block puzzle',
    description: 'Unblock FRVR is a relaxing, wood-block sliding puzzle game where the objective is to clear a path and guide a specific target block out of the board by sliding the other blocks out of the way.',
    developer: 'FRVR Gaming Studio',
    difficulty: 'Relaxing',
    genre: 'Spatial Block Puzzle',
    controls: [
      'Click & Drag blocks along their length direction.',
      'Horizontal blocks only slide left/right.',
      'Vertical blocks only slide up/down.',
      'Guide the distinct red/target wood brick to the rightmost exit.'
    ],
    tips: [
      'Work backwards: Look at what directly blocks the target brick, then find what blocks those bricks.',
      'Don’t hesitate to reset the board if you get locked—there is absolutely no penalty!',
      'Clear vertical corridors to create staging tracks for horizontal sliders.'
    ]
  },
  'game-ballcrash': {
    id: 'game-ballcrash',
    title: 'Ball Crash FRVR',
    tagline: 'Chain-reaction physics brick breaker',
    description: 'Ball Crash FRVR is an addicting chain-reaction physics and puzzle arcade game where players shoot and bounce balls to clear bubbles and blocks from the screen. The primary goal is to aim precisely, drop the balls, and trigger satisfying chain reactions.',
    developer: 'FRVR Gaming Studio',
    difficulty: 'Challenging',
    genre: 'Physics / Arcade / Puzzle',
    controls: [
      'Drag and slide your mouse/pointer to aim the cannon.',
      'Release to unleash an array of physical balls.',
      'Hit bubble circles to add more balls to your active cannon.'
    ],
    tips: [
      'Aim for narrow gaps between the top blocks to trap the balls for multiple quick rebounds.',
      'Prioritize blocks with the highest numbers that are nearing the top zone.',
      'Utilize side-wall reflections to reach obscured tiles at the bottom.'
    ]
  }
};

export default function SystemAppGame({ app, theme }: SystemAppGameProps) {
  const gameInfo = GAME_CATALOG[app.id] || {
    id: app.id,
    title: app.title,
    tagline: 'Lofi Mini Game Portal',
    description: 'Integrates seamless online gameplay portals with peaceful, natural-focused Linux desk environments.',
    developer: 'Web Community Ecosystem',
    difficulty: 'Relaxing' as const,
    genre: 'Arcade',
    controls: ['Use standard touch gestures or mouse clicks inside the stage.'],
    tips: ['Enjoy the peaceful sounds. Take deep breaths should any puzzle get tight.']
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewTab, setViewTab] = useState<'info' | 'tracker' | 'notes'>('info');
  
  // Zen tracker state
  const [personalBest, setPersonalBest] = useState<number>(() => {
    const saved = localStorage.getItem(`landala-best-${app.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [sessionsPlayed, setSessionsPlayed] = useState<number>(() => {
    const saved = localStorage.getItem(`landala-sessions-${app.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Note pad state
  const [strategyNote, setStrategyNote] = useState<string>(() => {
    return localStorage.getItem(`landala-note-${app.id}`) || '';
  });
  const [showSaveToast, setShowSaveToast] = useState(false);

  const [scoreInput, setScoreInput] = useState('');

  const soundTick = () => playAsmrTick();
  const soundClick = () => playAsmrClick();

  const handleSaveNote = () => {
    soundClick();
    localStorage.setItem(`landala-note-${app.id}`, strategyNote);
    setShowSaveToast(true);
    playBubbleSound();
    setTimeout(() => {
      setShowSaveToast(false);
    }, 2000);
  };

  const handleRecordScore = (e: React.FormEvent) => {
    e.preventDefault();
    soundClick();
    const scoreVal = parseInt(scoreInput, 10);
    if (!isNaN(scoreVal) && scoreVal > 0) {
      if (scoreVal > personalBest) {
        setPersonalBest(scoreVal);
        localStorage.setItem(`landala-best-${app.id}`, scoreVal.toString());
        playBubbleSound();
      }
      const newSessionCount = sessionsPlayed + 1;
      setSessionsPlayed(newSessionCount);
      localStorage.setItem(`landala-sessions-${app.id}`, newSessionCount.toString());
      setScoreInput('');
    }
  };

  const handleResetStats = () => {
    soundClick();
    if (confirm('Would you like to clear your zen statistics for this game?')) {
      setPersonalBest(0);
      setSessionsPlayed(0);
      localStorage.removeItem(`landala-best-${app.id}`);
      localStorage.removeItem(`landala-sessions-${app.id}`);
      playBubbleSound();
    }
  };

  return (
    <div id={`game-root-${app.id}`} className="h-full flex flex-row overflow-hidden relative font-sans">
      
      {/* SIDEBAR FOR GAME GUIDE & ZEN INFO */}
      <div 
        id="game-guide-sidebar"
        className={`shrink-0 h-full border-r transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none border-r-0'
        } ${
          theme.isLight 
            ? `${theme.sidebarBg} ${theme.borderCol} ${theme.textColor}` 
            : 'bg-[#18181b]/95 border-stone-850 text-stone-200'
        }`}
      >
        {/* HEADER BLOCK */}
        <div className={`p-4 border-b flex items-center justify-between ${theme.isLight ? theme.borderCol : 'border-stone-850'}`}>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono">Game Guide</h3>
          </div>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
            theme.isLight ? 'bg-amber-100 text-[#7E5B3D]' : 'bg-stone-900 text-stone-400'
          }`}>
            {gameInfo.difficulty}
          </span>
        </div>

        {/* TABS */}
        <div className={`grid grid-cols-3 text-center text-[10px] uppercase font-mono tracking-wide border-b ${
          theme.isLight ? theme.borderCol : 'border-stone-850'
        }`}>
          {[
            { id: 'info' as const, label: 'Manual', icon: BookOpen },
            { id: 'tracker' as const, label: 'Tracker', icon: Award },
            { id: 'notes' as const, label: 'Notes', icon: ClipboardList }
          ].map((tab) => {
            const isSel = viewTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { soundTick(); setViewTab(tab.id); }}
                className={`py-2 px-1 flex flex-col items-center justify-center gap-1 transition ${
                  isSel 
                    ? theme.isLight 
                      ? 'bg-black/[0.04] font-bold border-b-2 border-[#7E5B3D]' 
                      : 'bg-stone-900/60 font-bold border-b-2 border-amber-500 text-white'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/[0.02]'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          
          {/* TAB 1: MANUAL INFO */}
          {viewTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-155">
              <div>
                <h4 className="font-bold text-sm leading-tight text-current mb-1">{gameInfo.title}</h4>
                <p className="opacity-60 text-[10px] font-mono leading-none">by {gameInfo.developer}</p>
                <div className="mt-2 text-[10.5px] leading-relaxed opacity-85">
                  {gameInfo.description}
                </div>
              </div>

              {/* CONTROLS */}
              <div className={`p-3 rounded-xl border ${
                theme.isLight ? 'bg-white/50 border-stone-200' : 'bg-black/20 border-stone-800'
              }`}>
                <h5 className="font-bold text-[10px] uppercase tracking-wider font-mono mb-2 flex items-center gap-1">
                  <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                  <span>How to Play</span>
                </h5>
                <ul className="space-y-1.5 list-disc pl-3.5 text-[11px] opacity-90">
                  {gameInfo.controls.map((ctrl, i) => (
                    <li key={i}>{ctrl}</li>
                  ))}
                </ul>
              </div>

              {/* STRATEGIES */}
              <div className="space-y-2">
                <h5 className="font-bold text-[10px] uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Zen Tactics</span>
                </h5>
                <ul className="space-y-2 pl-1">
                  {gameInfo.tips.map((tip, i) => (
                    <li key={i} className={`p-2.5 rounded-xl text-[10.5px] leading-relaxed border ${
                      theme.isLight 
                        ? 'bg-stone-50 border-stone-200 text-[#5A5A40]' 
                        : 'bg-[#27272a]/40 border-stone-850 text-stone-300'
                    }`}>
                      🔹 {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: ZEN TRACKER */}
          {viewTab === 'tracker' && (
            <div className="space-y-4 animate-in fade-in duration-155">
              <div>
                <h4 className="font-bold text-sm tracking-tight mb-1">Your Zen Statistics</h4>
                <p className="opacity-65 text-[10px] leading-relaxed">Save your latest score and watch your continuous improvement over quiet game sessions!</p>
              </div>

              {/* METRIC GRID */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-xl text-center border ${
                  theme.isLight ? 'bg-white border-stone-200' : 'bg-neutral-900/60 border-stone-800'
                }`}>
                  <span className="block opacity-60 text-[9px] uppercase font-mono tracking-wider mb-1">Personal Best</span>
                  <span className={`text-lg font-bold font-mono ${theme.textColor}`}>{personalBest || '—'}</span>
                </div>
                <div className={`p-3 rounded-xl text-center border ${
                  theme.isLight ? 'bg-white border-stone-200' : 'bg-neutral-900/60 border-stone-800'
                }`}>
                  <span className="block opacity-60 text-[9px] uppercase font-mono tracking-wider mb-1">Runs Logged</span>
                  <span className="text-lg font-bold font-mono">{sessionsPlayed}</span>
                </div>
              </div>

              {/* INPUT FORM */}
              <form onSubmit={handleRecordScore} className={`p-3 rounded-xl border space-y-3 ${
                theme.isLight ? 'bg-white/60 border-stone-200' : 'bg-black/10 border-stone-800'
              }`}>
                <h5 className="font-bold text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-500" />
                  <span>Log New Run Score</span>
                </h5>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    placeholder="E.g., 2500"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className={`flex-1 px-2 py-1.5 border rounded-lg text-xs focus:outline-none ${
                      theme.isLight 
                        ? `${theme.inputBg} ${theme.borderCol} text-[#5A5A40] focus:ring-1 focus:ring-current/20` 
                        : 'bg-stone-900 border-stone-800 text-white focus:ring-1 focus:ring-stone-600'
                    }`}
                  />
                  <button
                    type="submit"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                      theme.isLight
                        ? `${theme.buttonBg} ${theme.buttonText} hover:opacity-90`
                        : 'bg-amber-600 text-white hover:bg-amber-500'
                    }`}
                  >
                    Log
                  </button>
                </div>
              </form>

              {/* RESET STATS BUTTON */}
              <button
                type="button"
                onClick={handleResetStats}
                className="w-full text-center hover:underline opacity-50 hover:opacity-85 text-[10px] font-mono mt-4 block"
              >
                Clear all Zen Track stats
              </button>
            </div>
          )}

          {/* TAB 3: ZEN NOTES */}
          {viewTab === 'notes' && (
            <div className="space-y-4 animate-in fade-in duration-155 h-full flex flex-col">
              <div className="shrink-0">
                <h4 className="font-bold text-sm tracking-tight mb-1">Acoustic Strategy Pad</h4>
                <p className="opacity-65 text-[10px] leading-relaxed">Document key blocks, bounce trajectories, or level layouts to reference in future sessions.</p>
              </div>

              <div className="flex-1 flex flex-col gap-2 min-h-[160px]">
                <textarea
                  value={strategyNote}
                  onChange={(e) => setStrategyNote(e.target.value)}
                  placeholder="Type notes here... (e.g. Level 14: Pull vertical block in col 2 down, slide ruby target right...)"
                  className={`w-full flex-1 p-2.5 border rounded-xl text-xs resize-none outline-none focus:ring-1 ${
                    theme.isLight 
                      ? `${theme.inputBg} ${theme.borderCol} text-[#5A5A40] focus:ring-current/25` 
                      : 'bg-stone-900/80 border-stone-800 text-stone-200 focus:ring-stone-600'
                  }`}
                />
                
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className={`w-full py-2 hover:opacity-95 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    theme.isLight
                      ? `${theme.buttonBg} ${theme.buttonText}`
                      : 'bg-stone-800 text-white hover:bg-stone-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Save Strategy Notes</span>
                </button>
              </div>

              {showSaveToast && (
                <div className={`p-2 rounded-xl text-[11px] font-mono font-medium flex items-center gap-1.5 border justify-center ${
                  theme.isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/45 border-emerald-900/60 text-emerald-400'
                }`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Notes saved locally!</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ASMR SOUND WIDGET IN SIDEBAR FOOTER */}
        <div className={`p-4 border-t flex items-center gap-3 shrink-0 ${theme.isLight ? theme.borderCol : 'border-stone-850'}`}>
          <Volume2 className="w-4 h-4 opacity-60 shrink-0 animate-pulse text-amber-500" />
          <div className="flex-1 min-w-0">
            <span className="block text-[8.5px] uppercase font-mono tracking-wider opacity-50 mb-0.5">Driver feedback</span>
            <span className="block text-[10px] font-semibold truncate leading-none">Acoustic Klik Synthesizer</span>
          </div>
        </div>

      </div>

      {/* COMPACT FLOATING COLLAPSIBLE TRIGGER (Vertical tab styling) */}
      <button
        id="game-guide-toggle-btn"
        type="button"
        onClick={() => { soundClick(); setSidebarOpen(!sidebarOpen); }}
        onMouseEnter={soundTick}
        title={sidebarOpen ? "Hide Game Guide Sidebar" : "Show Game Guide Sidebar"}
        className={`absolute top-4 z-50 p-2.5 rounded-r-xl border border-l-0 shadow-lg flex items-center justify-center transition-all duration-300 hover:brightness-110 ${
          sidebarOpen ? 'left-80' : 'left-0'
        } ${
          theme.isLight 
            ? `${theme.panelHeaderBg} ${theme.borderCol} ${theme.textColor}`
            : 'bg-[#1e1e24] border-stone-800 text-stone-200'
        }`}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* GAME RUNNING IFRAME VIEWPORT */}
      <div id="game-viewport-container" className="flex-grow h-full bg-black relative">
        {/* Help label overlay for 1.5 seconds if sidebar is closed */}
        {!sidebarOpen && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-40 flex items-center gap-1.5 pointer-events-none text-[10px] font-mono text-stone-300">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Click Left Arrow to open Game Guide & Stats</span>
          </div>
        )}

        {app.url ? (
          <iframe
            src={app.url}
            title={app.title}
            className="w-full h-full border-none bg-black"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 font-mono text-xs p-5 text-center">
            <Gamepad2 className="w-12 h-12 text-stone-700 mb-2" />
            <span>Missing game deployment address. Please synchronize app links context.</span>
          </div>
        )}
      </div>

    </div>
  );
}
