/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AppMetadata, 
  AppWindow, 
  ThemeId, 
  UserProfile, 
  BrowserEngine 
} from './types';
import { THEMES, getTheme } from './components/ThemeConfig';
import { 
  playAsmrClick, 
  playAsmrTick, 
  playBubbleSound 
} from './components/SoundEngine';

// Components
import LoginScreen from './components/LoginScreen';
import WindowFrame from './components/WindowFrame';
import SystemAppBrowser from './components/SystemAppBrowser';
import SystemAppSettings from './components/SystemAppSettings';
import SystemAppPhotos from './components/SystemAppPhotos';
import SystemAppStore from './components/SystemAppStore';
import SystemAppGame from './components/SystemAppGame';
import SystemAppWebSandbox from './components/SystemAppWebSandbox';
import SystemAppFiles from './components/SystemAppFiles';
import SystemAppTerminal from './components/SystemAppTerminal';
import SystemAppTrash from './components/SystemAppTrash';

// Lucide Icons
import { 
  Sliders, 
  Image as ImageIcon, 
  ShoppingBag, 
  Globe, 
  Gamepad2, 
  Compass, 
  Power, 
  Volume2, 
  Wifi, 
  Battery, 
  Calendar, 
  Clock, 
  Moon, 
  Folder, 
  Sparkles,
  Search,
  BookOpen,
  VolumeX,
  Smile,
  Terminal as TerminalIcon,
  Trash2
} from 'lucide-react';

// LANDALA Logo Component (Capital L overlaying a wavy 7-color organic timber rainbow)
export function LandalaLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wave stripes representing the 7 organic design themes */}
      <path d="M 10,22 C 30,22 45,35 55,45 C 65,55 70,75 90,75" stroke="#8c6239" strokeWidth="3" strokeLinecap="round" opacity="0.8" /> {/* Kashmir Wood */}
      <path d="M 10,27 C 28,27 43,38 53,48 C 63,58 68,78 90,80" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" opacity="0.8" /> {/* Sapphire */}
      <path d="M 10,32 C 26,32 41,41 51,51 C 61,61 66,81 90,85" stroke="#fda4af" strokeWidth="3" strokeLinecap="round" opacity="0.8" /> {/* Ruby */}
      <path d="M 10,17 C 32,17 47,32 57,42 C 67,52 72,72 90,70" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" opacity="0.8" /> {/* Aquamarine */}
      <path d="M 10,12 C 34,12 49,29 59,39 C 69,49 74,69 90,65" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" opacity="0.8" /> {/* Sandalwood */}
      <path d="M 10,37 C 24,37 39,44 49,54 C 59,64 64,84 90,90" stroke="#faf5ff" strokeWidth="3" strokeLinecap="round" opacity="0.8" /> {/* Birch */}
      <path d="M 10,7 C 36,7 51,26 61,36 C 71,46 76,66 90,60" stroke="#ffedd5" strokeWidth="3" strokeLinecap="round" opacity="0.8" />  {/* Acacia */}

      {/* Structured Modern White 'L' */}
      <path d="M 33 22 L 33 72 L 67 72" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 33 22 L 33 72" stroke="rgba(255,255,255,0.7)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// Fixed system app metadata database
const SYSTEM_APPS_METADATA: AppMetadata[] = [
  { id: 'browser', title: 'Web Browser', icon: 'browser', type: 'system' },
  { id: 'files', title: 'File Manager', icon: 'files', type: 'system' },
  { id: 'settings', title: 'Settings', icon: 'settings', type: 'system' },
  { id: 'photos', title: 'Wallpaper Photos', icon: 'photos', type: 'system' },
  { id: 'store', title: 'App Store', icon: 'store', type: 'system' },
  { id: 'terminal', title: 'Terminal Shell', icon: 'terminal', type: 'system' },
  { id: 'trash', title: 'Trash Bin', icon: 'trash', type: 'system' },
];

const PRE_INSTALLED_GAMES: AppMetadata[] = [
  { 
    id: 'game-unblock', 
    title: 'Unblock FRVR', 
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=unblock.frvr.com', 
    type: 'game', 
    url: 'https://unblock.frvr.com/alc/?web&source=frvr.com&action=browse_filtered&theme=light' 
  },
  { 
    id: 'game-boing', 
    title: 'Boing FRVR', 
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=boing.frvr.com', 
    type: 'game', 
    url: 'https://boing.frvr.com/alc/?web&source=frvr.com&action=browse_filtered&theme=light' 
  },
  { 
    id: 'game-ballcrash', 
    title: 'Ball Crash FRVR', 
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=ballcrash.frvr.com', 
    type: 'game', 
    url: 'https://ballcrash.frvr.com/alc/?web&source=frvr.com&action=browse_filtered&theme=light' 
  },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('landala_is_logged_in') === 'true';
  });
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('landala_session_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      username: 'fossguru',
      avatarLetter: 'F',
      avatarColor: '#8c6239',
      selectedTheme: 'kashmir-wood'
    };
  });

  const initialUsername = (() => {
    if (localStorage.getItem('landala_is_logged_in') === 'true') {
      const saved = localStorage.getItem('landala_session_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.username || 'fossguru';
        } catch (e) {}
      }
    }
    return '';
  })();

  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('landala_session_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.selectedTheme || 'kashmir-wood';
      } catch (e) {}
    }
    return 'kashmir-wood';
  });
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    if (initialUsername) {
      const saved = localStorage.getItem(`landala_current_wallpaper_${initialUsername}`);
      if (saved) return saved;
    }
    const savedProfile = localStorage.getItem('landala_session_profile');
    let themeId: ThemeId = 'kashmir-wood';
    if (savedProfile) {
      try {
        themeId = JSON.parse(savedProfile).selectedTheme || 'kashmir-wood';
      } catch (e) {}
    }
    return getTheme(themeId).wallpaperUrl;
  });
  const [installedApps, setInstalledApps] = useState<AppMetadata[]>(() => {
    if (initialUsername) {
      const saved = localStorage.getItem(`landala_installed_apps_${initialUsername}`);
      if (saved) {
        try {
          const parsed: AppMetadata[] = JSON.parse(saved);
          // Always make sure terminal and trash exist in user's layout
          const missing = SYSTEM_APPS_METADATA.filter(sys => !parsed.some(p => p.id === sys.id));
          if (missing.length > 0) {
            return [...parsed, ...missing];
          }
          return parsed;
        } catch (e) {}
      }
    }
    return [...SYSTEM_APPS_METADATA, ...PRE_INSTALLED_GAMES];
  });
  const [trashedApps, setTrashedApps] = useState<AppMetadata[]>(() => {
    if (initialUsername) {
      const saved = localStorage.getItem(`landala_trashed_apps_${initialUsername}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });
  const [trashToast, setTrashToast] = useState<string | null>(null);
  const [activeWindows, setActiveWindows] = useState<AppWindow[]>(() => {
    if (initialUsername) {
      const saved = localStorage.getItem(`landala_active_windows_${initialUsername}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });
  const [maxZIndex, setMaxZIndex] = useState(() => {
    if (initialUsername) {
      const saved = localStorage.getItem(`landala_max_z_index_${initialUsername}`);
      if (saved) return parseInt(saved, 10);
    }
    return 10;
  });
  const [browserEngine, setBrowserEngine] = useState<BrowserEngine>(() => {
    if (initialUsername) {
      const saved = localStorage.getItem(`landala_browser_engine_${initialUsername}`);
      if (saved) return saved as BrowserEngine;
    }
    return 'google';
  });

  // Icon Positions for absolutely situated draggable icons
  const [iconPositions, setIconPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    if (initialUsername) {
      const saved = localStorage.getItem(`landala_icon_positions_${initialUsername}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    const saved = localStorage.getItem('landala_icon_positions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const [draggedIcon, setDraggedIcon] = useState<{ id: string; startX: number; startY: number; appX: number; appY: number; hasMoved: boolean } | null>(null);

  const handleIconPointerDown = (e: React.PointerEvent, appId: string, currentPos: { x: number; y: number }) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setDraggedIcon({
      id: appId,
      startX: e.clientX,
      startY: e.clientY,
      appX: currentPos.x,
      appY: currentPos.y,
      hasMoved: false
    });
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const handleIconPointerMove = (e: React.PointerEvent) => {
    if (!draggedIcon) return;
    const dx = e.clientX - draggedIcon.startX;
    const dy = e.clientY - draggedIcon.startY;
    
    // Check if the user moved the cursor more than 5px to distinguish drag from clicks
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 5 && !draggedIcon.hasMoved) {
      setDraggedIcon(prev => prev ? { ...prev, hasMoved: true } : null);
    }

    // Bounds check to avoid dragging outside the viewport margins
    const newX = Math.max(10, Math.min(window.innerWidth - 100, draggedIcon.appX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 150, draggedIcon.appY + dy));

    setIconPositions(prev => ({ ...prev, [draggedIcon.id]: { x: newX, y: newY } }));
  };

  const handleIconPointerUp = (e: React.PointerEvent, appSnapshot: AppMetadata) => {
    if (!draggedIcon) return;
    const wasDragged = draggedIcon.hasMoved;
    setDraggedIcon(null);
    const target = e.currentTarget as HTMLElement;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // If it was parsed as a clean click (scarcely moved), launch the app immediately!
    if (!wasDragged) {
      launchApp(appSnapshot);
    } else {
      // Check collision/overlap with Trash Bin icon!
      const finalPos = iconPositions[appSnapshot.id];
      if (finalPos && appSnapshot.id !== 'trash') {
        const trashIndex = installedApps.findIndex(a => a.id === 'trash');
        const trashPos = iconPositions['trash'] || (trashIndex !== -1 ? {
          x: 24 + Math.floor(trashIndex / 5) * 110,
          y: 24 + (trashIndex % 5) * 110
        } : null);

        if (trashPos) {
          const dist = Math.sqrt(Math.pow(finalPos.x - trashPos.x, 2) + Math.pow(finalPos.y - trashPos.y, 2));
          if (dist < 65) {
            handleMoveToTrash(appSnapshot);
          }
        }
      }
    }
  };

  // Taskbar Home Start Menu State
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Quick volume widget toggler inside taskbar
  const [isVolumeCardOpen, setIsVolumeCardOpen] = useState(false);

  const themeConfig = getTheme(activeThemeId);

  // Sync wallpaper when theme is chosen
  useEffect(() => {
    if (themeConfig) {
      setCurrentWallpaper(themeConfig.wallpaperUrl);
    }
  }, [activeThemeId]);

  // Clock ticks
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleThemeChange = (newThemeId: ThemeId) => {
    setActiveThemeId(newThemeId);
    const updatedProfile = { ...profile, selectedTheme: newThemeId };
    setProfile(updatedProfile);
    localStorage.setItem('landala_session_profile', JSON.stringify(updatedProfile));
    
    if (isLoggedIn && profile?.username) {
      const accountsSaved = localStorage.getItem('landala_registered_accounts');
      if (accountsSaved) {
        try {
          const accountsList: UserProfile[] = JSON.parse(accountsSaved);
          const nextList = accountsList.map(acc => acc.username.toLowerCase() === profile.username.toLowerCase() ? updatedProfile : acc);
          localStorage.setItem('landala_registered_accounts', JSON.stringify(nextList));
        } catch (e) {}
      }
    }
  };

  const handleLoginComplete = (userProfile: UserProfile) => {
    setProfile(userProfile);
    setActiveThemeId(userProfile.selectedTheme);
    setIsLoggedIn(true);
    localStorage.setItem('landala_session_profile', JSON.stringify(userProfile));
    localStorage.setItem('landala_is_logged_in', 'true');
    playAsmrClick();

    // Dynamically transition all user configuration states on login complete
    const username = userProfile.username;

    // 1. Wallpaper
    const savedWallpaper = localStorage.getItem(`landala_current_wallpaper_${username}`);
    if (savedWallpaper) {
      setCurrentWallpaper(savedWallpaper);
    } else {
      const theme = getTheme(userProfile.selectedTheme);
      setCurrentWallpaper(theme.wallpaperUrl);
    }

    // 2. Installed Apps
    const savedApps = localStorage.getItem(`landala_installed_apps_${username}`);
    if (savedApps) {
      try {
        const parsed: AppMetadata[] = JSON.parse(savedApps);
        const missing = SYSTEM_APPS_METADATA.filter(sys => !parsed.some(p => p.id === sys.id));
        if (missing.length > 0) {
          setInstalledApps([...parsed, ...missing]);
        } else {
          setInstalledApps(parsed);
        }
      } catch (e) {}
    } else {
      setInstalledApps([...SYSTEM_APPS_METADATA, ...PRE_INSTALLED_GAMES]);
    }

    // 2b. Trashed Apps
    const savedTrashed = localStorage.getItem(`landala_trashed_apps_${username}`);
    if (savedTrashed) {
      try {
        setTrashedApps(JSON.parse(savedTrashed));
      } catch (e) {}
    } else {
      setTrashedApps([]);
    }

    // 3. Active Windows
    const savedWindows = localStorage.getItem(`landala_active_windows_${username}`);
    if (savedWindows) {
      try {
        setActiveWindows(JSON.parse(savedWindows));
      } catch (e) {}
    } else {
      setActiveWindows([]);
    }

    // 4. Max ZIndex
    const savedZIndex = localStorage.getItem(`landala_max_z_index_${username}`);
    if (savedZIndex) {
      setMaxZIndex(parseInt(savedZIndex, 10));
    } else {
      setMaxZIndex(10);
    }

    // 5. Browser Engine
    const savedEngine = localStorage.getItem(`landala_browser_engine_${username}`);
    if (savedEngine) {
      setBrowserEngine(savedEngine as BrowserEngine);
    } else {
      setBrowserEngine('google');
    }

    // 6. Icon Positions
    const savedPositions = localStorage.getItem(`landala_icon_positions_${username}`);
    if (savedPositions) {
      try {
        setIconPositions(JSON.parse(savedPositions));
      } catch (e) {}
    } else {
      setIconPositions({});
    }

    // Save this profile in the list of available accounts!
    const accountsSaved = localStorage.getItem('landala_registered_accounts');
    let accountsList: UserProfile[] = [];
    if (accountsSaved) {
      try {
        accountsList = JSON.parse(accountsSaved);
      } catch (e) {}
    }
    if (!accountsList.some(acc => acc.username.toLowerCase() === userProfile.username.toLowerCase())) {
      accountsList.push(userProfile);
    } else {
      accountsList = accountsList.map(acc => acc.username.toLowerCase() === userProfile.username.toLowerCase() ? userProfile : acc);
    }
    localStorage.setItem('landala_registered_accounts', JSON.stringify(accountsList));
  };

  // Synchronize dynamic user edits to localStorage per account
  useEffect(() => {
    if (isLoggedIn && profile?.username) {
      localStorage.setItem(`landala_installed_apps_${profile.username}`, JSON.stringify(installedApps));
    }
  }, [installedApps, isLoggedIn, profile?.username]);

  useEffect(() => {
    if (isLoggedIn && profile?.username) {
      localStorage.setItem(`landala_trashed_apps_${profile.username}`, JSON.stringify(trashedApps));
    }
  }, [trashedApps, isLoggedIn, profile?.username]);

  useEffect(() => {
    if (isLoggedIn && profile?.username) {
      localStorage.setItem(`landala_active_windows_${profile.username}`, JSON.stringify(activeWindows));
    }
  }, [activeWindows, isLoggedIn, profile?.username]);

  useEffect(() => {
    if (isLoggedIn && profile?.username) {
      localStorage.setItem(`landala_max_z_index_${profile.username}`, maxZIndex.toString());
    }
  }, [maxZIndex, isLoggedIn, profile?.username]);

  useEffect(() => {
    if (isLoggedIn && profile?.username) {
      localStorage.setItem(`landala_browser_engine_${profile.username}`, browserEngine);
    }
  }, [browserEngine, isLoggedIn, profile?.username]);

  useEffect(() => {
    if (isLoggedIn && profile?.username && currentWallpaper) {
      localStorage.setItem(`landala_current_wallpaper_${profile.username}`, currentWallpaper);
    }
  }, [currentWallpaper, isLoggedIn, profile?.username]);

  useEffect(() => {
    if (isLoggedIn && profile?.username) {
      localStorage.setItem(`landala_icon_positions_${profile.username}`, JSON.stringify(iconPositions));
    }
  }, [iconPositions, isLoggedIn, profile?.username]);

  const handleMoveToTrash = (app: AppMetadata) => {
    if (app.id === 'trash' || app.id === 'terminal' || app.id === 'settings' || app.id === 'files') {
      setTrashToast(`"${app.title}" is a protected system module and cannot be uninstalled.`);
      setTimeout(() => setTrashToast(null), 4000);
      playAsmrTick();
      return;
    }
    setInstalledApps(prev => prev.filter(p => p.id !== app.id));
    setActiveWindows(prev => prev.filter(w => w.id !== app.id));
    setTrashedApps(prev => {
      if (!prev.some(t => t.id === app.id)) {
        return [...prev, app];
      }
      return prev;
    });
    playBubbleSound();
    setTrashToast(`Successfully moved "${app.title}" to the Trash Bin.`);
    setTimeout(() => setTrashToast(null), 4000);
  };

  const handleLogoClick = () => {
    setIsStartMenuOpen(!isStartMenuOpen);
    setIsVolumeCardOpen(false);
    playAsmrClick();
  };

  const handleWallpaperClick = () => {
    setIsStartMenuOpen(false);
    setIsVolumeCardOpen(false);
  };

  // Launch app in draggable window
  const launchApp = (metadata: AppMetadata) => {
    playAsmrClick();
    setIsStartMenuOpen(false);

    // If already open, maximize or restore minimize state and put in front
    const existing = activeWindows.find(w => w.id === metadata.id);
    if (existing) {
      const nextZ = maxZIndex + 1;
      setMaxZIndex(nextZ);
      setActiveWindows(prev => prev.map(w => 
        w.id === metadata.id 
          ? { ...w, isMinimized: false, zIndex: nextZ } 
          : w
      ));
      return;
    }

    // Centered responsive size
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const w = Math.min(840, Math.floor(screenW * 0.8));
    const h = Math.min(600, Math.floor(screenH * 0.75));
    const x = Math.max(10, Math.floor((screenW - w) / 2) + Math.floor((Math.random() - 0.5) * 40));
    const y = Math.max(20, Math.floor((screenH - h) / 2) - 30 + Math.floor((Math.random() - 0.5) * 30));

    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);

    const newWindow: AppWindow = {
      id: metadata.id,
      title: metadata.title,
      icon: metadata.icon,
      type: metadata.type,
      url: metadata.url,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      x,
      y,
      w,
      h,
      zIndex: nextZ
    };

    setActiveWindows(prev => [...prev, newWindow]);
  };

  // Drag coordinates update
  const handleWindowMove = (id: string, x: number, y: number) => {
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
  };

  // Resized dimensions update
  const handleWindowResize = (id: string, w: number, h: number) => {
    setActiveWindows(prev => prev.map(win => win.id === id ? { ...win, w, h } : win));
  };

  const handleWindowFocus = (id: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w));
  };

  const handleWindowMinimize = (id: string) => {
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  };

  const handleWindowMaximize = (id: string) => {
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  const handleWindowClose = (id: string) => {
    setActiveWindows(prev => prev.filter(w => w.id !== id));
  };

  // Dynamic store installation callbacks
  const handleStoreInstall = (app: AppMetadata) => {
    if (!installedApps.some(p => p.id === app.id)) {
      setInstalledApps(prev => [...prev, app]);
      playBubbleSound();
    }
  };

  const handleStoreUninstall = (id: string) => {
    setInstalledApps(prev => prev.filter(app => app.id !== id));
    setActiveWindows(prev => prev.filter(w => w.id !== id));
    playBubbleSound();
  };

  const logOut = () => {
    playAsmrClick();
    setIsLoggedIn(false);
    setActiveWindows([]);
    localStorage.removeItem('landala_is_logged_in');
  };

  // Fallback icon resolver for desktop Grid rendering
  const renderAppIconLabel = (app: AppMetadata) => {
    if (app.icon.startsWith('http')) {
      return (
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
          <img 
            src={app.icon} 
            alt={app.title} 
            className="w-10 h-10 object-contain rounded-lg shadow-inner" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=64&domain=${app.url || 'google.com'}`;
            }}
          />
        </div>
      );
    }

    let IconElem = Globe;
    let colorClass = 'text-sky-100';
    let iconBgClass = 'bg-sky-500';
    if (app.id === 'settings') { IconElem = Sliders; colorClass = 'text-amber-100'; iconBgClass = 'bg-orange-500'; }
    if (app.id === 'photos') { IconElem = ImageIcon; colorClass = 'text-purple-100'; iconBgClass = 'bg-indigo-500'; }
    if (app.id === 'store') { IconElem = ShoppingBag; colorClass = 'text-emerald-100'; iconBgClass = 'bg-emerald-500'; }
    if (app.id === 'files') { IconElem = Folder; colorClass = 'text-green-105'; iconBgClass = 'bg-teal-600'; }
    if (app.id === 'terminal') { IconElem = TerminalIcon; colorClass = 'text-amber-400'; iconBgClass = 'bg-stone-900 border border-stone-700/50'; }
    if (app.id === 'trash') { IconElem = Trash2; colorClass = 'text-rose-100'; iconBgClass = 'bg-rose-500'; }

    return (
      <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
        <div className={`w-10 h-10 rounded-lg shadow-inner flex items-center justify-center ${iconBgClass}`}>
          <IconElem className="w-5.5 h-5.5 stroke-[2.5]" />
        </div>
      </div>
    );
  };

  const isAnyWindowMaximized = activeWindows.some(w => w.isMaximized && !w.isMinimized);

  return (
    <div id="landala-root-container" className="h-screen w-screen overflow-hidden relative select-none font-sans text-stone-200">
      
      {/* 
        STAGE 1: ENTRANCE SIGN IN / SETUP SCREEN 
      */}
      {!isLoggedIn ? (
        <LoginScreen 
          onLoginComplete={handleLoginComplete} 
          defaultEmail="fossguru1@gmail.com" 
        />
      ) : (
        /* 
          STAGE 2: MAIN WORKPLACE ENVIRONMENT 
        */
        <div 
          id="landala-desktop-stage"
          onClick={handleWallpaperClick}
          className={`absolute inset-0 flex flex-col transition-all duration-1000 ${themeConfig.bgClass}`}
          style={{
            backgroundImage: `url('${currentWallpaper}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Subtle vignette layer overlay */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/10 to-black/35 pointer-events-none" />

          {/* DESKTOP Grid area */}
          <div 
            id="desktop-grid-shortcuts" 
            className="flex-1 p-6 relative select-none overflow-hidden touch-none"
          >
            {installedApps.map((app, index) => {
              const pos = iconPositions[app.id] || {
                x: 24 + Math.floor(index / 5) * 110,
                y: 24 + (index % 5) * 110
              };

              return (
                <div
                  id={`desktop-icon-wrapper-${app.id}`}
                  key={app.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    zIndex: draggedIcon?.id === app.id ? 999 : 5
                  }}
                  onPointerDown={(e) => handleIconPointerDown(e, app.id, pos)}
                  onPointerMove={handleIconPointerMove}
                  onPointerUp={(e) => handleIconPointerUp(e, app)}
                  className="touch-none select-none"
                >
                  <button
                    id={`desktop-icon-${app.id}`}
                    onDoubleClick={() => launchApp(app)}
                    onTouchEnd={() => launchApp(app)} // friendly for tablet/emulators
                    onMouseEnter={playAsmrTick}
                    className="w-[85px] h-[100px] flex flex-col items-center justify-start text-center hover:scale-105 active:scale-95 transition-transform text-white/95 hover:text-white group"
                  >
                    <div className="mb-2 shrink-0">{renderAppIconLabel(app)}</div>
                    <span className="text-[10.5px] font-sans font-medium tracking-wide leading-tight px-1 break-words line-clamp-2 drop-shadow-md">
                      {app.title}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* DRAGGABLE APP WINDOWS RENDERING STAGE */}
          <div className="absolute inset-0 pointer-events-none">
            {activeWindows.map((app) => {
              return (
                <div key={app.id} className="pointer-events-auto">
                  <WindowFrame
                    app={app}
                    theme={themeConfig}
                    onFocus={handleWindowFocus}
                    onClose={handleWindowClose}
                    onMinimize={handleWindowMinimize}
                    onMaximize={handleWindowMaximize}
                    onMove={handleWindowMove}
                    onResize={handleWindowResize}
                  >
                    {/* Render Application Core Content */}
                    {app.id === 'settings' && (
                      <SystemAppSettings
                        userProfile={profile}
                        activeThemeId={activeThemeId}
                        defaultEngine={browserEngine}
                        onProfileUpdate={(updated) => {
                          setProfile(updated);
                          localStorage.setItem('landala_session_profile', JSON.stringify(updated));
                          
                          // Also update registered_accounts list so they stay perfectly in sync!
                          const accountsSaved = localStorage.getItem('landala_registered_accounts');
                          if (accountsSaved) {
                            try {
                              const accountsList: UserProfile[] = JSON.parse(accountsSaved);
                              const nextList = accountsList.map(acc => acc.username.toLowerCase() === updated.username.toLowerCase() ? updated : acc);
                              localStorage.setItem('landala_registered_accounts', JSON.stringify(nextList));
                            } catch (e) {}
                          }
                        }}
                        onThemeChange={handleThemeChange}
                        onEngineChange={setBrowserEngine}
                      />
                    )}

                    {app.id === 'files' && (
                      <SystemAppFiles
                        theme={themeConfig}
                        username={profile.username}
                      />
                    )}

                    {app.id === 'photos' && (
                      <SystemAppPhotos
                        currentWallpaper={currentWallpaper}
                        onSetWallpaper={setCurrentWallpaper}
                        theme={themeConfig}
                      />
                    )}

                    {app.id === 'store' && (
                      <SystemAppStore
                        installedApps={installedApps}
                        onInstallApp={handleStoreInstall}
                        onUninstallApp={handleStoreUninstall}
                        theme={themeConfig}
                      />
                    )}

                    {app.id === 'browser' && (
                      <SystemAppBrowser
                        app={app}
                        theme={themeConfig}
                        defaultEngine={browserEngine}
                        username={profile.username}
                      />
                    )}

                    {app.id === 'terminal' && (
                      <SystemAppTerminal
                        theme={themeConfig}
                        username={profile.username}
                        onThemeChange={handleThemeChange}
                        installedApps={installedApps}
                        onInstallApp={handleStoreInstall}
                        onUninstallApp={handleStoreUninstall}
                      />
                    )}

                    {app.id === 'trash' && (
                      <SystemAppTrash
                        theme={themeConfig}
                        trashedApps={trashedApps}
                        onRestoreApp={(restoredApp) => {
                          setTrashedApps(prev => prev.filter(a => a.id !== restoredApp.id));
                          setInstalledApps(prev => {
                            if (!prev.some(a => a.id === restoredApp.id)) {
                              return [...prev, restoredApp];
                            }
                            return prev;
                          });
                          playBubbleSound();
                        }}
                        onPermanentlyDeleteApp={(appId) => {
                          setTrashedApps(prev => prev.filter(a => a.id !== appId));
                          playBubbleSound();
                        }}
                        onEmptyTrash={() => {
                          setTrashedApps([]);
                          playBubbleSound();
                        }}
                      />
                    )}

                    {/* Render custom integrated Game UI with guide, controls, and stats */}
                    {app.type === 'game' && (
                      <SystemAppGame
                        app={app}
                        theme={themeConfig}
                      />
                    )}

                    {/* Standard Embedded Web iFrame container for other web pins */}
                    {app.type === 'web' && (
                      <SystemAppWebSandbox
                        app={app}
                        theme={themeConfig}
                        username={profile.username}
                      />
                    )}
                  </WindowFrame>
                </div>
              );
            })}
          </div>

          {/* 
            STARTUP MENU OVERLAY (PINNED HOME CARD)
          */}
          {isStartMenuOpen && (
            <div 
              id="landala-start-menu"
              className={`absolute left-4 bottom-18 w-80 rounded-2xl border backdrop-blur-xl shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-200 z-[99999] ${
                themeConfig.isLight 
                  ? `${themeConfig.panelBg} ${themeConfig.borderCol} ${themeConfig.textColor}` 
                  : 'bg-[#1b1b1f]/95 border-white/10 text-stone-200'
              }`}
              onClick={(e) => e.stopPropagation()} // retain open
            >
              <div className={`flex items-center gap-3 pb-3 border-b ${
                themeConfig.isLight 
                  ? themeConfig.borderCol 
                  : 'border-stone-800'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  themeConfig.isLight 
                    ? `bg-white ${themeConfig.borderCol}` 
                    : 'bg-black border-amber-500/80'
                }`}>
                  <span className={`text-sm font-bold font-mono ${themeConfig.isLight ? themeConfig.textColor : 'text-white'}`}>{profile.avatarLetter}</span>
                </div>
                <div>
                  <span className={`text-xs block ${themeConfig.isLight ? 'text-current/60 font-medium' : 'text-stone-400 font-mono'}`}>Welcome back,</span>
                  <span className={`text-sm font-bold block ${themeConfig.isLight ? themeConfig.textColor : 'text-white'}`}>{profile.username}</span>
                </div>
              </div>

              {/* Start menu Quick categories list */}
              <div className="space-y-2">
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${themeConfig.isLight ? 'text-current/50' : 'text-stone-500'}`}>System Modules</span>
                <div className="grid grid-cols-2 gap-2">
                  {installedApps.filter(p => p.type === 'system').map((app) => (
                    <button
                      id={`start-menu-launch-${app.id}`}
                      key={app.id}
                      onClick={() => launchApp(app)}
                      onMouseEnter={playAsmrTick}
                      className={`p-1.5 py-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                        themeConfig.isLight 
                          ? `${themeConfig.sidebarBg} ${themeConfig.borderCol} hover:bg-black/[0.04] text-current` 
                          : 'bg-stone-900 hover:bg-stone-800/80 border-stone-850 hover:border-stone-700 text-stone-200'
                      }`}
                    >
                      {app.id === 'settings' ? <Sliders className="w-4 h-4 text-orange-500" /> :
                       app.id === 'photos' ? <ImageIcon className="w-4 h-4 text-purple-400" /> :
                       app.id === 'store' ? <ShoppingBag className="w-4 h-4 text-emerald-400" /> :
                       <Globe className="w-4 h-4 text-sky-400" />}
                      <span className="text-[10px] font-semibold truncate">{app.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Game launcher list inside start menu */}
              <div className="space-y-2 pt-1">
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${themeConfig.isLight ? 'text-current/50' : 'text-stone-500'}`}>Integrated Games</span>
                <div className="space-y-1">
                  {installedApps.filter(p => p.type === 'game').map((app) => (
                    <button
                      id={`start-menu-launch-${app.id}`}
                      key={app.id}
                      onClick={() => launchApp(app)}
                      onMouseEnter={playAsmrTick}
                      className={`w-full p-2 rounded-xl border text-left transition flex items-center justify-between ${
                        themeConfig.isLight 
                          ? `${themeConfig.sidebarBg} ${themeConfig.borderCol} hover:bg-black/[0.04]` 
                          : 'bg-stone-900 hover:bg-stone-800/80 border-stone-850 hover:border-stone-700 text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src={app.icon} 
                          className="w-4 h-4 rounded-sm" 
                          alt={app.title} 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=64&domain=${app.url || 'google.com'}`;
                          }}
                        />
                        <span className="text-[10px] font-semibold">{app.title}</span>
                      </div>
                      <Gamepad2 className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Power controller footer inside Start menu */}
              <div className={`pt-3 border-t flex items-center justify-between ${
                themeConfig.isLight ? themeConfig.borderCol : 'border-stone-800'
              }`}>
                <div className={`text-[10px] font-mono flex items-center gap-1.5 ${themeConfig.isLight ? 'text-current/60' : 'text-stone-500'}`}>
                  <Smile className="w-3.5 h-3.5 text-rose-500" />
                  <span>Landala Lofi v6.6</span>
                </div>

                <button
                  id="start-menu-power-btn"
                  onClick={logOut}
                  onMouseEnter={playAsmrTick}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition ${
                    themeConfig.isLight 
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                      : 'bg-red-950/80 hover:bg-red-900 border-red-500/30 text-red-400'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>Shutdown</span>
                </button>
              </div>
            </div>
          )}

          {/* 
            QUICK VOLUME SLIDER POPUP (TASKBAR ACTION CARD)
          */}
          {isVolumeCardOpen && (
            <div 
              id="volume-control-popup"
              className="absolute right-4 bottom-14 w-52 rounded-xl bg-stone-900 border border-stone-800 p-3 shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150 z-[9999]"
              onClick={(e) => e.stopPropagation()} // retain open
            >
              <div className="flex justify-between items-center text-[10px] font-mono text-stone-400 uppercase">
                <span>Klik Audio driver</span>
                <Volume2 className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </div>
              <p className="text-[9px] text-stone-500 leading-normal">
                Generates relaxing physical ASMR sound dynamics on taps and clicks.
              </p>
            </div>
          )}

          {/* 
            PERSISTENT BOTTOM SYSTEM TASKBAR 
          */}
          <div 
            id="organic-system-taskbar"
            onClick={(e) => e.stopPropagation()} // prevent window clicks
            className={`h-16 ${isAnyWindowMaximized ? 'hidden' : 'flex'} items-center justify-between px-6 z-[9999] shrink-0 border-t ${
              themeConfig.isLight 
                ? 'bg-white/25 border-white/30 backdrop-blur-2xl' 
                : 'bg-black/85 border-white/5 backdrop-blur-2xl'
            }`}
          >
            
            {/* Left element: Landala launcher logo */}
            <div className="flex items-center gap-2">
              <button
                id="taskbar-logo-btn"
                onClick={handleLogoClick}
                onMouseEnter={playAsmrTick}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/20 to-white/5 border border-white/40 active:scale-95 transition shadow-lg group hover:brightness-110"
                title="Toggle Start Menu"
              >
                <div className="text-2xl font-black relative leading-none flex items-center justify-center select-none">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7E5B3D] via-[#0F52BA] via-[#E0115F] via-[#7FFFD4] via-[#C2B280] via-[#F5F5DC] to-[#F4A460]">L</span>
                </div>
              </button>
            </div>

            {/* Middle element: Pinned active apps / Click to minimize/maximize */}
            <div id="taskbar-active-apps-container" className="flex-1 flex justify-center items-center gap-1.5 overflow-x-auto px-6 max-w-2xl">
              {activeWindows.map((app) => {
                const isFocused = true; // simplified zIndex layout
                return (
                  <button
                    id={`taskbar-app-pin-${app.id}`}
                    key={app.id}
                    onClick={() => {
                      playAsmrClick();
                      if (app.isMinimized) {
                        setActiveWindows(prev => prev.map(w => w.id === app.id ? { ...w, isMinimized: false } : w));
                        handleWindowFocus(app.id);
                      } else {
                        // toggle minimize
                        handleWindowMinimize(app.id);
                      }
                    }}
                    onMouseEnter={playAsmrTick}
                    className={`h-11 px-4 rounded-xl flex items-center gap-2.5 transition duration-200 text-xs font-semibold shadow-sm border ${
                      app.isMinimized 
                        ? themeConfig.isLight
                          ? 'bg-black/[0.04] text-current/60 border-transparent hover:bg-black/[0.08]'
                          : 'bg-stone-900/40 text-stone-500 hover:bg-stone-900/80 border-stone-850'
                        : themeConfig.isLight
                          ? 'bg-[#ece8e1]/60 border-white/60 text-[#5A5A40]'
                          : 'bg-white/10 hover:bg-white/15 text-white border-white/5'
                    }`}
                  >
                    {/* favicon or standard graphic placeholder */}
                    {app.icon.startsWith('http') ? (
                      <img 
                        src={app.icon} 
                        className="w-4 h-4 rounded-md object-contain" 
                        alt="" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=32&domain=${app.url || 'google.com'}`;
                        }}
                      />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeConfig.primary }} />
                    )}
                    <span className="hidden sm:inline max-w-[90px] truncate">{app.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Right element: Stats, volume, calendar & clock widgets */}
            <div id="taskbar-telemetry-corner" className="flex items-center gap-4 text-white">
              
              {/* Quick Volume slide button */}
              <button
                id="taskbar-volume-btn"
                onClick={() => { playAsmrClick(); setIsVolumeCardOpen(!isVolumeCardOpen); setIsStartMenuOpen(false); }}
                onMouseEnter={playAsmrTick}
                className="p-1 px-2 rounded-lg hover:bg-white/10 text-white transition flex items-center gap-1.5 text-[10px] font-mono border border-white/10 bg-white/5"
                title="Audio driver status"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Acoustic</span>
              </button>

              <div className="hidden lg:flex items-center gap-1.5 opacity-85 font-mono text-[10px]">
                <Wifi className="w-3.5 h-3.5 text-white" />
                <Battery className="w-3.5 h-3.5 text-white" />
              </div>

              <div className="h-8 w-[1px] bg-white/20 hidden md:block"></div>

              {/* Time display */}
              <div 
                id="taskbar-datetime-display"
                className="flex flex-col items-end leading-none font-sans text-white text-right"
              >
                <span className="font-bold text-sm tracking-tight text-white">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-white/60 text-[10px] uppercase font-bold mt-1">
                  {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="h-8 w-[1px] bg-white/20"></div>

              {/* User badge block */}
              <div 
                id="taskbar-user-badge"
                className="flex items-center gap-3 px-3 py-1 bg-black/20 border border-white/20 rounded-full cursor-pointer hover:bg-black/35 transition"
                onClick={() => { playAsmrClick(); setIsStartMenuOpen(!isStartMenuOpen); }}
              >
                <span className="text-white text-xs font-semibold hidden md:inline">
                  User {profile.username}
                </span>
                <div className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  {profile.avatarLetter}
                </div>
              </div>

            </div>

          </div>

          {/* TRASH SYSTEM NOTIFICATIONS / TOASTS */}
          {trashToast && (
            <div className="absolute top-4 right-4 z-[999999] bg-stone-950/95 text-stone-100 border border-stone-800 p-3 px-4 rounded-xl flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>{trashToast}</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
