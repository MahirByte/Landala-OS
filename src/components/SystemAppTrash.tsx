/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppMetadata, ThemeConfig } from '../types';
import { playAsmrClick, playBubbleSound } from './SoundEngine';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

interface SystemAppTrashProps {
  theme: ThemeConfig;
  trashedApps: AppMetadata[];
  onRestoreApp: (app: AppMetadata) => void;
  onPermanentlyDeleteApp: (id: string) => void;
  onEmptyTrash: () => void;
}

export default function SystemAppTrash({
  theme,
  trashedApps,
  onRestoreApp,
  onPermanentlyDeleteApp,
  onEmptyTrash
}: SystemAppTrashProps) {
  
  const handleRestore = (app: AppMetadata) => {
    playAsmrClick();
    onRestoreApp(app);
  };

  const handleDelete = (id: string) => {
    playAsmrClick();
    onPermanentlyDeleteApp(id);
  };

  const handleEmpty = () => {
    playBubbleSound();
    onEmptyTrash();
  };

  return (
    <div className="w-full h-full bg-stone-50 text-stone-800 p-5 flex flex-col justify-start rounded-b-xl overflow-hidden select-none">
      
      {/* Top action header for controlling the Trash scope */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-200 pb-3 mb-4 gap-3">
        <div>
          <h2 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-1.5 font-sans">
            <Trash2 className="w-4 h-4 text-stone-500" />
            <span>Trash Bin & App Registry</span>
          </h2>
          <p className="text-[10px] text-stone-500 leading-none mt-1 font-mono">
            {trashedApps.length} temporary discarded application modules detected.
          </p>
        </div>

        {trashedApps.length > 0 && (
          <button
            onClick={handleEmpty}
            className="p-1 px-3 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 transition active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash Bin</span>
          </button>
        )}
      </div>

      {/* Core catalog display */}
      <div className="flex-1 overflow-y-auto pr-1">
        {trashedApps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3.5">
            <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
              <Trash2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="max-w-xs space-y-1">
              <span className="block text-xs font-bold text-stone-800">Your Trash Bin is clean</span>
              <p className="text-[10.5px] text-stone-500 leading-normal font-sans">
                Drag any Desktop shortcut or game and drop it near the <span className="font-semibold text-stone-700">Trash Bin</span> desktop icon to uninstall/remove it from the main desktop grids!
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-150 px-2.5 py-1 rounded text-[10px] font-mono leading-none">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full system backup is active</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-w-xl">
            {trashedApps.map((app) => {
              // Custom rendering of the icons to match main application theme config
              const isSystemApp = app.type === 'system';
              return (
                <div
                  key={app.id}
                  className="p-3 bg-white border border-stone-200/80 rounded-xl hover:border-stone-300 flex items-center justify-between transition-all group hover:shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-150 flex items-center justify-center shrink-0">
                      {app.icon.startsWith('http') ? (
                        <img src={app.icon} className="w-7 h-7 rounded object-contain" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-stone-950 truncate">{app.title}</span>
                      <span className="text-[9px] font-mono text-stone-400 block mt-0.5 uppercase tracking-wider">
                        Type: {app.type} App | ID: {app.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(app)}
                      className="p-1 px-2 text-[10px] text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-150 border border-stone-200 rounded-md font-semibold transition active:scale-95 flex items-center gap-1"
                      title="Restore app back to desktop"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-1 px-2 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md font-semibold transition cursor-pointer"
                      title="Remove permanently"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info system guidance footer */}
      <div className="mt-4 pt-3 border-t border-stone-200/70 flex items-center gap-2 text-stone-500 text-[10px] font-mono leading-relaxed">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>Deleted game records and catalog settings can always be reinstalled via the standard App Store.</span>
      </div>
    </div>
  );
}
