/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  FileImage, 
  Trash2, 
  Download, 
  Search, 
  Info,
  ChevronRight,
  ExternalLink,
  Edit2,
  FolderPlus,
  FilePlus,
  ArrowLeft,
  Check,
  X,
  FolderOpen
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { playAsmrClick, playAsmrTick, playBubbleSound } from './SoundEngine';

interface SystemAppFilesProps {
  theme: ThemeConfig;
}

interface VirtualFile {
  id: string;
  name: string;
  type: string; // 'image', 'text', 'folder'
  size: string;
  content: string; // base64 payload or raw text content
  url?: string;
  date: string;
  parentId?: string | null;
}

export default function SystemAppFiles({ theme }: SystemAppFilesProps) {
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Selection & Inspector state
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
  
  // Renaming state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedName, setRenamedName] = useState('');

  // Editing file content state
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const soundTick = () => playAsmrTick();
  const soundClick = () => playAsmrClick();

  const loadFiles = () => {
    const data = localStorage.getItem('landala_virtual_files');
    if (data) {
      try {
        setFiles(JSON.parse(data));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Seed default/sample files to start with
      const defaultSamples: VirtualFile[] = [
        {
          id: 'sample-welcome',
          name: 'welcome_note.txt',
          type: 'text',
          size: '1.2 KB',
          content: 'Welcome to Landala OS File Manager!\nAny files you download or emulated screenshots from the Chromium browser will appear right here in this secure workspace directory.\n\nYou can click on any file below to preview its parameters, open it in full view, or export it to your actual local machine filesystem.\n\nEnjoy a peaceful operating system environment!',
          date: new Date().toLocaleString(),
          parentId: null
        },
        {
          id: 'sample-folder-downloads',
          name: 'Downloads',
          type: 'folder',
          size: '--',
          content: '',
          date: new Date().toLocaleString(),
          parentId: null
        }
      ];
      localStorage.setItem('landala_virtual_files', JSON.stringify(defaultSamples));
      setFiles(defaultSamples);
    }
  };

  useEffect(() => {
    loadFiles();
    // Poll for changes in case other windows (like Browser) save files
    const interval = setInterval(loadFiles, 2000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize selection reference to latest file data
  useEffect(() => {
    if (selectedFile) {
      const latest = files.find(f => f.id === selectedFile.id);
      if (!latest) {
        setSelectedFile(null);
      } else if (JSON.stringify(latest) !== JSON.stringify(selectedFile)) {
        setSelectedFile(latest);
      }
    }
  }, [files]);

  // Recurse to delete folder + all children recursively
  const getKeysToDelete = (parentId: string, allFiles: VirtualFile[]): string[] => {
    let ids: string[] = [parentId];
    const directChildren = allFiles.filter(f => f.parentId === parentId);
    directChildren.forEach(child => {
      ids = [...ids, ...getKeysToDelete(child.id, allFiles)];
    });
    return ids;
  };

  const handleDeleteFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundClick();
    
    const fileToDelete = files.find(f => f.id === id);
    if (!fileToDelete) return;

    let nextFiles: VirtualFile[] = [];
    if (fileToDelete.type === 'folder') {
      const keysToDelete = getKeysToDelete(id, files);
      nextFiles = files.filter(f => !keysToDelete.includes(f.id));
    } else {
      nextFiles = files.filter(f => f.id !== id);
    }

    localStorage.setItem('landala_virtual_files', JSON.stringify(nextFiles));
    setFiles(nextFiles);
    
    if (selectedFile?.id === id) {
      setSelectedFile(null);
      setIsRenaming(false);
      setIsEditingContent(false);
    }
  };

  const handleCreateFolder = () => {
    soundClick();
    const newFolder: VirtualFile = {
      id: `folder-${Date.now()}`,
      name: 'Untitled Folder',
      type: 'folder',
      size: '--',
      content: '',
      date: new Date().toLocaleString(),
      parentId: currentFolderId
    };
    
    const nextFiles = [newFolder, ...files];
    localStorage.setItem('landala_virtual_files', JSON.stringify(nextFiles));
    setFiles(nextFiles);
    setSelectedFile(newFolder);
    setRenamedName('Untitled Folder');
    setIsRenaming(true);
    setIsEditingContent(false);
  };

  const handleCreateFile = () => {
    soundClick();
    const newFile: VirtualFile = {
      id: `file-${Date.now()}`,
      name: 'notes.txt',
      type: 'text',
      size: '22 B',
      content: 'A peaceful text file.',
      date: new Date().toLocaleString(),
      parentId: currentFolderId
    };

    const nextFiles = [newFile, ...files];
    localStorage.setItem('landala_virtual_files', JSON.stringify(nextFiles));
    setFiles(nextFiles);
    setSelectedFile(newFile);
    setRenamedName('notes.txt');
    setIsRenaming(true);
    setIsEditingContent(false);
  };

  const handleStartRename = () => {
    if (!selectedFile) return;
    soundClick();
    setRenamedName(selectedFile.name);
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    if (!selectedFile || !renamedName.trim()) return;
    soundClick();

    const updatedFiles = files.map(f => {
      if (f.id === selectedFile.id) {
        return { ...f, name: renamedName.trim() };
      }
      return f;
    });

    localStorage.setItem('landala_virtual_files', JSON.stringify(updatedFiles));
    setFiles(updatedFiles);
    setSelectedFile({ ...selectedFile, name: renamedName.trim() });
    setIsRenaming(false);
    playBubbleSound();
  };

  const handleStartEditContent = () => {
    if (!selectedFile || selectedFile.type !== 'text') return;
    soundClick();
    setEditedContent(selectedFile.content);
    setIsEditingContent(true);
  };

  const handleSaveContent = () => {
    if (!selectedFile || selectedFile.type !== 'text') return;
    soundClick();

    const bytes = new Blob([editedContent]).size;
    const sizeStr = bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;

    const updatedFiles = files.map(f => {
      if (f.id === selectedFile.id) {
        return { 
          ...f, 
          content: editedContent,
          size: sizeStr
        };
      }
      return f;
    });

    localStorage.setItem('landala_virtual_files', JSON.stringify(updatedFiles));
    setFiles(updatedFiles);
    setSelectedFile({ 
      ...selectedFile, 
      content: editedContent,
      size: sizeStr
    });
    setIsEditingContent(false);
    playBubbleSound();
  };

  const handleDownloadToLocal = (file: VirtualFile) => {
    soundClick();
    const link = document.createElement('a');
    if (file.type === 'image' && file.content.startsWith('data:')) {
      link.href = file.content;
    } else {
      const blob = new Blob([file.content], { type: 'text/plain' });
      link.href = URL.createObjectURL(blob);
    }
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFolder = (folderId: string) => {
    soundClick();
    setCurrentFolderId(folderId);
    setSelectedFile(null);
    setIsRenaming(false);
    setIsEditingContent(false);
  };

  const handleGoBack = () => {
    soundClick();
    if (!currentFolderId) return;
    const currentFolder = files.find(f => f.id === currentFolderId);
    setCurrentFolderId(currentFolder ? (currentFolder.parentId || null) : null);
    setSelectedFile(null);
    setIsRenaming(false);
    setIsEditingContent(false);
  };

  // Determine path items for navigation bar
  const getPathBreadcrumbs = () => {
    const list: { id: string | null; name: string }[] = [{ id: null, name: 'Root' }];
    let currId = currentFolderId;
    const temp: { id: string | null; name: string }[] = [];
    
    while (currId) {
      const folderObj = files.find(f => f.id === currId);
      if (folderObj) {
        temp.unshift({ id: folderObj.id, name: folderObj.name });
        currId = folderObj.parentId || null;
      } else {
        break;
      }
    }
    return [...list, ...temp];
  };

  // Compute files to display
  const filteredFiles = files.filter(f => {
    if (searchQuery.trim()) {
      return (
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.url && f.url.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return (f.parentId || null) === currentFolderId;
  });

  const getParentFolderName = () => {
    if (!currentFolderId) return '';
    const parent = files.find(f => f.id === currentFolderId);
    return parent ? ` / ${parent.name}` : '';
  };

  return (
    <div className="h-full flex flex-col font-sans bg-stone-900 border border-stone-850 rounded-xl overflow-hidden select-none text-stone-200">
      
      {/* Search Bar / Action Toolbar */}
      <div className="bg-stone-950 border-b border-stone-850 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-emerald-400" />
          <div className="flex items-center text-xs font-mono select-none">
            {getPathBreadcrumbs().map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-stone-600 mx-1" />}
                <button
                  onClick={() => {
                    soundClick();
                    setCurrentFolderId(b.id);
                    setSelectedFile(null);
                  }}
                  className={`hover:text-white transition ${
                    b.id === currentFolderId ? 'text-emerald-450 font-bold' : 'text-stone-400'
                  }`}
                >
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Create Files/Folders Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateFolder}
            className="p-1.5 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[11px] font-mono rounded-xl flex items-center gap-1.5 transition text-stone-300 hover:text-white"
            title="Create a virtual directory folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Folder</span>
          </button>

          <button
            onClick={handleCreateFile}
            className="p-1.5 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[11px] font-mono rounded-xl flex items-center gap-1.5 transition text-stone-300 hover:text-white"
            title="Create a new workspace text file"
          >
            <FilePlus className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Text File</span>
          </button>

          <div className="relative flex items-center w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3" />
            <input
              type="text"
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3 py-1 text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-605 transition"
            />
          </div>
        </div>

      </div>

      {/* Main split work area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Directory Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          
          {/* Back Navigation Bar */}
          {currentFolderId && !searchQuery && (
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-xs font-mono text-stone-400 hover:text-white transition px-2 py-1.5 rounded-lg border border-stone-800 hover:border-stone-700 bg-stone-950/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back Up</span>
            </button>
          )}

          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 max-w-xs mx-auto">
              <Folder className="w-12 h-12 text-stone-700 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase font-mono tracking-wider">Empty Directory</p>
                <p className="text-[11px] text-stone-500 leading-relaxed mt-1">
                  Create folders or notes above, or capture emulated screenshots in the Browser.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredFiles.map((file) => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => { soundTick(); setSelectedFile(file); }}
                    onDoubleClick={() => {
                      if (file.type === 'folder') {
                        handleOpenFolder(file.id);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative group flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-md' 
                        : 'bg-stone-950/40 border-stone-850/60 hover:bg-stone-950/75 hover:border-stone-750'
                    }`}
                  >
                    
                    {/* Top block */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        {file.type === 'folder' ? (
                          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-450 border border-amber-500/20">
                            <Folder className="w-5 h-5 fill-amber-500/20" />
                          </div>
                        ) : file.type === 'image' ? (
                          <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-450 border border-sky-500/20">
                            <FileImage className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-450 border border-emerald-500/20">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <span className="text-[9px] font-mono text-stone-500 font-bold group-hover:text-stone-400 transition">
                          {file.size}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-xs font-bold font-mono tracking-wide truncate pr-6 text-stone-100 group-hover:text-white transition">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate font-mono">
                          {file.type.toUpperCase()} node
                        </p>
                      </div>
                    </div>

                    {/* Bottom action panel */}
                    <div className="mt-4 pt-2 border-t border-stone-850/40 flex items-center justify-between text-stone-500">
                      <span className="text-[9px] font-mono truncate max-w-[80px]">
                        {file.date.split(',')[0]}
                      </span>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                        {file.type === 'folder' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenFolder(file.id); }}
                            className="p-1 rounded text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition"
                            title="Open Directory"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteFile(file.id, e)}
                          className="p-1 rounded text-red-450 hover:bg-red-500/20 hover:text-red-300 transition"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: File Inspect Sidebar */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-stone-850 bg-stone-950 p-4 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
          {selectedFile ? (
            <div className="space-y-4 flex flex-col h-full justify-between">
              
              <div className="space-y-4">
                
                {/* Visual File Name Card / Renamer */}
                <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest font-extrabold block">
                      Properties & Identity
                    </span>
                    <button
                      onClick={() => { setSelectedFile(null); setIsRenaming(false); }}
                      className="text-stone-500 hover:text-stone-300 text-xs font-mono"
                    >
                      Close
                    </button>
                  </div>
                  
                  {isRenaming ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={renamedName}
                        onChange={(e) => setRenamedName(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="file_name.txt"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename();
                          if (e.key === 'Escape') setIsRenaming(false);
                        }}
                        autoFocus
                      />
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setIsRenaming(false)}
                          className="px-2 py-0.5 border border-stone-700 hover:bg-stone-800 rounded text-[10px] text-stone-400 font-mono transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveRename}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-mono transition flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" />
                          <span>Apply</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedFile.type === 'folder' ? (
                          <Folder className="w-8 h-8 text-amber-400 shrink-0 fill-amber-500/10" />
                        ) : selectedFile.type === 'image' ? (
                          <FileImage className="w-8 h-8 text-sky-450 shrink-0" />
                        ) : (
                          <FileText className="w-8 h-8 text-emerald-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate font-mono">
                            {selectedFile.name}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {selectedFile.size} • {selectedFile.type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleStartRename}
                        className="p-1 rounded border border-stone-800 bg-stone-950 text-stone-400 hover:text-white hover:bg-stone-900 transition"
                        title="Rename item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* File Contents Preview Container */}
                {selectedFile.type !== 'folder' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">
                        File Contents
                      </span>
                      {selectedFile.type === 'text' && !isEditingContent && (
                        <button
                          onClick={handleStartEditContent}
                          className="text-[10px] font-mono text-emerald-450 hover:underline flex items-center gap-1"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>Edit File Content</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden p-3 max-h-64 overflow-y-auto custom-scrollbar relative">
                      {isEditingContent ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            rows={8}
                            className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-xs font-mono text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 select-text leading-relaxed"
                          />
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setIsEditingContent(false)}
                              className="px-2.5 py-1 border border-stone-700 hover:bg-stone-800 text-xs font-mono text-stone-400 rounded-lg transition"
                            >
                              Discard
                            </button>
                            <button
                              onClick={handleSaveContent}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono rounded-lg transition flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : selectedFile.type === 'image' ? (
                        <div className="space-y-2 select-none">
                          <img
                            src={selectedFile.content}
                            alt={selectedFile.name}
                            className="w-full max-h-40 object-contain rounded-lg border border-stone-805 bg-stone-950"
                          />
                          <div className="text-[9px] text-stone-500 text-center uppercase tracking-wider font-mono">
                            JPEG Base64 Payload Asset
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed select-text font-mono text-[11px] text-stone-300">
                          {selectedFile.content}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional parameters logs */}
                <div className="space-y-2 pt-2 border-t border-stone-850">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-stone-500">Node Saved:</span>
                    <span className="text-stone-300 truncate">{selectedFile.date}</span>
                  </div>
                  {selectedFile.url && selectedFile.url !== 'system' && (
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-stone-500">Source:</span>
                      <a 
                        href={selectedFile.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline truncate max-w-[150px] flex items-center gap-1"
                        title={selectedFile.url}
                      >
                        <span className="truncate">{selectedFile.url}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action operations buttons */}
              <div className="space-y-2 pt-4">
                {selectedFile.type === 'folder' ? (
                  <button
                    onClick={() => handleOpenFolder(selectedFile.id)}
                    className="w-full py-2 bg-stone-900 border border-stone-850 hover:bg-stone-800 font-mono text-xs font-bold rounded-xl text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Enter Directory</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownloadToLocal(selectedFile)}
                    className="w-full py-2 bg-stone-900 border border-stone-850 hover:bg-stone-800 font-mono text-xs font-bold rounded-xl text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download to Local Disk</span>
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteFile(selectedFile.id)}
                  className="w-full py-2 bg-red-950/30 border border-red-900/40 hover:bg-red-950/60 font-mono text-xs font-bold rounded-xl text-red-450 flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Erase Permanently</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-3 font-mono text-stone-600">
              <Info className="w-8 h-8 text-stone-700" />
              <p className="text-[11px] leading-relaxed">
                Select any folder, downloaded image, or text notes on the grid to inspect details, rename items, or modify raw text content instantly.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
