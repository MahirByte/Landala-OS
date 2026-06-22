/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeConfig, ThemeId } from '../types';

export const THEMES: ThemeConfig[] = [
  {
    id: 'kashmir-wood',
    name: 'Kashmir Wood',
    primary: '#7E5B3D',
    accent: '#5A5A40',
    bgClass: 'bg-[radial-gradient(circle_at_center,#7E5B3D_0%,#2C1810_100%)]',
    softBg: 'bg-[#fdfaf5]/90 backdrop-blur-md',
    borderColor: 'border-[#ece8e1]',
    tagline: 'Warm organic timber, cozy mahogany studies, & quiet lofi coffee afternoons.',
    wallpaperUrl: '/brown-wood-textured-background-with-design-space_53876-160425.png',
    textPrimary: 'text-[#5A5A40]',
    // Natural Tones styling tokens
    isLight: true,
    panelBg: 'bg-[#fdfaf5]',
    panelHeaderBg: 'bg-[#ece8e1]',
    sidebarBg: 'bg-[#f5f2ed]',
    textColor: 'text-[#5A5A40]',
    textSecondary: 'text-[#5A5A40]/80',
    buttonBg: 'bg-[#5A5A40]',
    buttonText: 'text-white',
    borderCol: 'border-[#ece8e1]',
    inputBg: 'bg-[#f5f2ed]'
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    primary: '#0F52BA',
    accent: '#1e3a8a',
    bgClass: 'bg-[radial-gradient(circle_at_center,#0F52BA_0%,#09132c_100%)]',
    softBg: 'bg-[#f0f4ff]/90 backdrop-blur-md',
    borderColor: 'border-[#cbd5e1]',
    tagline: 'Midnight ocean water, brilliant sapphire crystals, & serene deep starfalls.',
    wallpaperUrl: '/sapphire.png',
    textPrimary: 'text-[#1e3a8a]',
    // Natural Tones styling tokens
    isLight: true,
    panelBg: 'bg-[#fcfdfe]',
    panelHeaderBg: 'bg-[#e0e7ff]',
    sidebarBg: 'bg-[#f0f4ff]',
    textColor: 'text-[#1e3a8a]',
    textSecondary: 'text-[#1e3a8a]/80',
    buttonBg: 'bg-[#1e3a8a]',
    buttonText: 'text-white',
    borderCol: 'border-[#cbd5e1]',
    inputBg: 'bg-[#f0f4ff]'
  },
  {
    id: 'ruby',
    name: 'Ruby',
    primary: '#E0115F',
    accent: '#881337',
    bgClass: 'bg-[radial-gradient(circle_at_center,#E0115F_0%,#2d0512_100%)]',
    softBg: 'bg-[#fff1f2]/90 backdrop-blur-md',
    borderColor: 'border-[#fecdd3]',
    tagline: 'Cozy burgundy velvet lights, early rose mist, & rich warm crimson embers.',
    wallpaperUrl: '/close-up-mineral-background_23-2151930735.png',
    textPrimary: 'text-[#881337]',
    // Natural Tones styling tokens
    isLight: true,
    panelBg: 'bg-[#fffbfb]',
    panelHeaderBg: 'bg-[#ffe4e6]',
    sidebarBg: 'bg-[#fff1f2]',
    textColor: 'text-[#881337]',
    textSecondary: 'text-[#881337]/80',
    buttonBg: 'bg-[#881337]',
    buttonText: 'text-white',
    borderCol: 'border-[#fecdd3]',
    inputBg: 'bg-[#fff1f2]'
  },
  {
    id: 'aquamarine',
    name: 'Aquamarine',
    primary: '#7FFFD4',
    accent: '#115e59',
    bgClass: 'bg-[radial-gradient(circle_at_center,#2dd4bf_0%,#042a22_100%)]',
    softBg: 'bg-[#f0fdfa]/90 backdrop-blur-md',
    borderColor: 'border-[#ccfbf1]',
    tagline: 'Peaceful turquoise lagoons, crystal tide pools, & bioluminescent bay glow.',
    wallpaperUrl: '/liquid-marble-background_52683-42916.png',
    textPrimary: 'text-[#115e59]',
    // Natural Tones styling tokens
    isLight: true,
    panelBg: 'bg-[#fbfdfd]',
    panelHeaderBg: 'bg-[#ccfbf1]',
    sidebarBg: 'bg-[#f0fdfa]',
    textColor: 'text-[#115e59]',
    textSecondary: 'text-[#115e59]/80',
    buttonBg: 'bg-[#115e59]',
    buttonText: 'text-white',
    borderCol: 'border-[#ccfbf1]',
    inputBg: 'bg-[#f0fdfa]'
  },
  {
    id: 'sandalwood',
    name: 'Sandalwood',
    primary: '#C2B280',
    accent: '#78350f',
    bgClass: 'bg-[radial-gradient(circle_at_center,#C2B280_0%,#1c1404_100%)]',
    softBg: 'bg-[#fffbeb]/90 backdrop-blur-md',
    borderColor: 'border-[#fef3c7]',
    tagline: 'Sun-dried earthy sand dunes, warm amber oils, & soft calming desert mist.',
    wallpaperUrl: '/wooden-texture-with-abstract-shapes_1249-23.png',
    textPrimary: 'text-[#78350f]',
    // Natural Tones styling tokens
    isLight: true,
    panelBg: 'bg-[#fffdf9]',
    panelHeaderBg: 'bg-[#fef3c7]',
    sidebarBg: 'bg-[#fffbeb]',
    textColor: 'text-[#78350f]',
    textSecondary: 'text-[#78350f]/80',
    buttonBg: 'bg-[#78350f]',
    buttonText: 'text-white',
    borderCol: 'border-[#fef3c7]',
    inputBg: 'bg-[#fffbeb]'
  },
  {
    id: 'birch',
    name: 'Birch',
    primary: '#F5F5DC',
    accent: '#374151',
    bgClass: 'bg-[radial-gradient(circle_at_center,#F5F5DC_0%,#181816_100%)]',
    softBg: 'bg-[#fcfdfd]/90 backdrop-blur-md',
    borderColor: 'border-[#f3f4f6]',
    tagline: 'Minimalist silver forests, clean charcoal sketchpads, & silent winter mornings.',
    wallpaperUrl: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?q=80&w=1600&auto=format&fit=crop',
    textPrimary: 'text-[#374151]',
    // Natural Tones styling tokens
    isLight: true,
    panelBg: 'bg-[#fcfdfd]',
    panelHeaderBg: 'bg-[#f3f4f6]',
    sidebarBg: 'bg-[#f9fafb]',
    textColor: 'text-[#374151]',
    textSecondary: 'text-[#374151]/80',
    buttonBg: 'bg-[#374151]',
    buttonText: 'text-white',
    borderCol: 'border-[#e5e7eb]',
    inputBg: 'bg-[#f9fafb]'
  },
  {
    id: 'acacia',
    name: 'Acacia',
    primary: '#F4A460',
    accent: '#9a3412',
    bgClass: 'bg-[radial-gradient(circle_at_center,#F4A460_0%,#261103_100%)]',
    softBg: 'bg-[#fff7ed]/90 backdrop-blur-md',
    borderColor: 'border-[#ffedd5]',
    tagline: 'Savanna golden sunlines, amber sunsets, & rich textured acacia wilderness.',
    wallpaperUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1600&auto=format&fit=crop',
    textPrimary: 'text-[#9a3412]',
    // Natural Tones styling tokens
    isLight: true,
    panelBg: 'bg-[#fffbf7]',
    panelHeaderBg: 'bg-[#ffedd5]',
    sidebarBg: 'bg-[#fff7ed]',
    textColor: 'text-[#9a3412]',
    textSecondary: 'text-[#9a3412]/80',
    buttonBg: 'bg-[#9a3412]',
    buttonText: 'text-white',
    borderCol: 'border-[#ffedd5]',
    inputBg: 'bg-[#fff7ed]'
  }
];

export function getTheme(id: ThemeId): ThemeConfig {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
