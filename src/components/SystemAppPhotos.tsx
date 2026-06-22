/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, Image, Check, CheckCircle, Sparkles, Plus, Trash } from 'lucide-react';
import { ThemeConfig } from '../types';
import { playAsmrClick, playAsmrTick, playBubbleSound } from './SoundEngine';

interface ScenicImage {
  id: string;
  title: string;
  category: string;
  desc: string;
  url: string;
}

// Built-in list of incredibly soothing organic scenic wallpapers matching our design themes
const BUILTIN_SCENICS: ScenicImage[] = [
  {
    id: 'kashmir-wood-art',
    title: 'Cedar Cottage in Kashmir Woods',
    category: 'Kashmir Wood',
    desc: 'Dense ancient cedar valleys, warm firewood smoke, and a quiet wooden log porch.',
    url: '/brown-wood-textured-background-with-design-space_53876-160425.png'
  },
  {
    id: 'sapphire-art',
    title: 'Starry Sapphire Shallows',
    category: 'Sapphire',
    desc: 'Gentle midnight tide flowing over smooth pebble banks reflecting the Milky Way.',
    url: '/sapphire.png'
  },
  {
    id: 'ruby-art',
    title: 'Morning Crimson Rosery',
    category: 'Ruby',
    desc: 'Soft dawn fog surrounding velvety red rose pedals waiting for early sunbeams.',
    url: '/close-up-mineral-background_23-2151930735.png'
  },
  {
    id: 'aquamarine-art',
    title: 'Quiet Turquoise Reef',
    category: 'Aquamarine',
    desc: 'Serene crystal water, gentle sun shafts heating up peaceful ocean coral networks.',
    url: '/liquid-marble-background_52683-42916.png'
  },
  {
    id: 'sandalwood-art',
    title: 'Sandalwood Crescent Dunes',
    category: 'Sandalwood',
    desc: 'Silky golden sand mounds shifting under the warm breath of the desert wind.',
    url: '/wooden-texture-with-abstract-shapes_1249-23.png'
  },
  {
    id: 'birch-art',
    title: 'Deep Snow Birch Forest',
    category: 'Birch',
    desc: 'Minimalist white trunks forming a serene labyrinth during a silent mountain snowstorm.',
    url: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'acacia-art',
    title: 'Savanna Sunset of Kenya',
    category: 'Acacia',
    desc: 'Warm amber sunshine casting outlines of ancient umbrella acacia trees on the plains.',
    url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'lofi-cat',
    title: 'Quiet Study Desk Sunrise',
    category: 'Bonus Lofi',
    desc: 'A sleepy kitten lounging adjacent to a keyboard and glowing lamp at golden hour.',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1600&auto=format&fit=crop'
  }
];

interface SystemAppPhotosProps {
  currentWallpaper: string;
  onSetWallpaper: (imageUrl: string) => void;
  theme: ThemeConfig;
}

export default function SystemAppPhotos({ currentWallpaper, onSetWallpaper, theme }: SystemAppPhotosProps) {
  const [customUrl, setCustomUrl] = useState('');
  const [photosList, setPhotosList] = useState<ScenicImage[]>(BUILTIN_SCENICS);
  const [toastMessage, setToastMessage] = useState('');

  const soundTick = () => playAsmrTick();
  const soundClick = () => playAsmrClick();

  const handleApplyWallpaper = (url: string, title: string) => {
    soundClick();
    onSetWallpaper(url);
    playBubbleSound();
    
    setToastMessage(`Wallpaper updated to "${title}"`);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    soundClick();
    const newId = 'custom-' + Date.now();
    const title = 'User Wallpaper ' + (photosList.filter(p => p.id.startsWith('custom')).length + 1);
    const newImage: ScenicImage = {
      id: newId,
      title: title,
      category: 'Custom Upload',
      desc: 'Personally loaded backdrop link.',
      url: customUrl.trim()
    };

    setPhotosList(prev => [newImage, ...prev]);
    onSetWallpaper(customUrl.trim());
    playBubbleSound();
    
    setCustomUrl('');
    setToastMessage(`Custom wallpaper set & saved!`);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundClick();
    setPhotosList(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div id="photos-app" className="h-full flex flex-col bg-[#121214] text-stone-200">
      
      {/* TOAST PANEL */}
      {toastMessage && (
        <div id="photos-toast" className="absolute top-16 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white font-mono px-4 py-2 rounded-lg text-xs z-[999] shadow-lg flex items-center gap-1.5 animate-bounce">
          <CheckCircle className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLLER */}
      <div id="photos-header" className="bg-[#1b1b1d] border-b border-stone-900 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-sm font-bold text-white font-sans">Scenic Wallpaper Studio</h2>
            <p className="text-[10px] text-stone-400 font-mono">Calming landscapes tailored for Landala Linux</p>
          </div>
        </div>

        {/* CUSTOM UPLOAD BOX */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2 max-w-sm">
          <input
            id="photos-custom-url-input"
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Paste custom wallpaper picture URL"
            className="flex-1 min-w-[180px] px-2.5 py-1 bg-stone-900 border border-stone-800 rounded text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
            required
          />
          <button
            id="photos-custom-url-submit"
            type="submit"
            onMouseEnter={soundTick}
            className="px-3 py-1 bg-white hover:bg-stone-200 text-black rounded text-[10px] font-bold uppercase transition flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Apply</span>
          </button>
        </form>
      </div>

      {/* GRID VIEW */}
      <div id="photos-grid" className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {photosList.map((pic) => {
            const isActive = currentWallpaper === pic.url;
            return (
              <div
                id={`photos-card-${pic.id}`}
                key={pic.id}
                onMouseEnter={soundTick}
                onClick={() => handleApplyWallpaper(pic.url, pic.title)}
                className={`group rounded-xl overflow-hidden border bg-stone-950/80 cursor-pointer flex flex-col transition relative ${
                  isActive 
                    ? 'border-emerald-500 ring-1 ring-emerald-500/20' 
                    : 'border-stone-800 hover:border-stone-700'
                }`}
              >
                {/* Image Preview Container */}
                <div className="aspect-16/10 bg-stone-900 overflow-hidden relative">
                  <img
                    src={pic.url}
                    alt={pic.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono uppercase tracking-wider text-stone-300">
                    {pic.category}
                  </span>

                  {/* Active Indicator overlay badge */}
                  {isActive && (
                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded bg-emerald-500 text-white text-[10px] uppercase font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        <span>Active Wallpaper</span>
                      </span>
                    </div>
                  )}

                  {/* Trash for custom wallpapers */}
                  {pic.id.startsWith('custom') && (
                    <button
                      onClick={(e) => handleDeleteCustom(pic.id, e)}
                      className="absolute top-2 right-2 p-1 rounded bg-red-950/80 border border-red-500/30 text-red-400 hover:text-red-300 transition hover:scale-105"
                      title="Remove Custom Image"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Details Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition truncate">
                      {pic.title}
                    </h3>
                    <p className="text-[10px] text-stone-400 leading-normal line-clamp-2 mt-0.5 font-sans">
                      {pic.desc}
                    </p>
                  </div>
                  <div className="pt-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyWallpaper(pic.url, pic.title);
                      }}
                      className={`w-full py-1 text-[9px] uppercase font-bold tracking-wider rounded transition ${
                        isActive 
                          ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 cursor-default' 
                          : 'bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-850 hover:text-white'
                      }`}
                    >
                      {isActive ? 'Current Desktop' : 'Set as Desktop'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
