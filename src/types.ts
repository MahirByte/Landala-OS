/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemeId = 
  | 'kashmir-wood' 
  | 'sapphire' 
  | 'ruby' 
  | 'aquamarine' 
  | 'sandalwood' 
  | 'birch' 
  | 'acacia';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  primary: string;       // main brand / accent color
  bgClass: string;       // Tailwind class for background gradient
  accent: string;        // Text highlights and active states
  softBg: string;        // Soft panel backgrounds
  borderColor: string;   // Window border colors
  tagline: string;       // Inspiring lofi theme subtitle
  wallpaperUrl: string;  // Image URL (or standard high-res landscape matching theme)
  textPrimary: string;   // contrasting primary text
  
  // Natural Tones styling tokens
  isLight: boolean;
  panelBg: string;
  panelHeaderBg: string;
  sidebarBg: string;
  textColor: string;
  textSecondary: string;
  buttonBg: string;
  buttonText: string;
  borderCol: string;
  inputBg: string;
}

export interface AppMetadata {
  id: string;
  title: string;
  icon: string;         // 'IconName' (Lucide keys) or URL (favicon)
  type: 'game' | 'system' | 'web';
  url?: string;
  isCustom?: boolean;
}

export interface AppWindow {
  id: string; // matches AppMetadata.id or unique instance id
  title: string;
  icon: string;
  type: 'game' | 'system' | 'web';
  url?: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
}

export interface UserProfile {
  username: string;
  avatarLetter: string;
  avatarColor: string;
  selectedTheme: ThemeId;
}

export interface BrowserBookmark {
  title: string;
  url: string;
}

export type BrowserEngine = 'google' | 'bing' | 'duckduckgo' | 'ecosia' | 'brave';
