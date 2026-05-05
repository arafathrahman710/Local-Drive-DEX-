import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type FileType = 'folder' | 'image' | 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'archive' | 'video' | 'audio' | 'unknown';

export interface DriveItem {
  id: string;
  name: string;
  type: FileType;
  isFolder: boolean;
  size?: string;
  modified: string;
  created?: string;
  owner?: string;
  shared?: boolean;
  imageUrl?: string;
  color?: string; // For folders
  starred?: boolean;
  trashed?: boolean;
  location?: string;
  parentId?: string | null;
}

interface DriveContextType {
  items: DriveItem[];
  createFolder: (name: string, parentId?: string | null) => void;
  uploadFiles: (files: FileList) => void;
  moveToTrash: (id: string, isFolder: boolean) => void;
  restoreFromTrash: (id: string) => void;
  deletePermanently: (id: string) => void;
  renameItem: (id: string, newName: string) => void;
  changeFolderColor: (id: string, color: string) => void;
  toggleStarred: (id: string) => void;
  undoTrash: () => void;
  emptyTrash: () => void;
  viewItemInfo: (item: DriveItem | null) => void;
  infoItem: DriveItem | null;
  viewMedia: (item: DriveItem | null) => void;
  mediaItem: DriveItem | null;
  renamingItem: DriveItem | null;
  setRenamingItem: (item: DriveItem | null) => void;
  movingItem: DriveItem | null;
  setMovingItem: (item: DriveItem | null) => void;
  moveItem: (itemId: string, destinationId: string | null) => void;
  openItem: (item: DriveItem) => void;
  downloadItem: (item: DriveItem) => void;
  // Selection
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  // Settings
  settings: {
    showDeleteWarning: boolean;
    font: string;
    backgroundColor: string | null;
    uiTheme: string;
    mediaDownloadQuality: number;
  };
  updateSettings: (updates: Partial<{ showDeleteWarning: boolean, font: string, backgroundColor: string | null, uiTheme: string, mediaDownloadQuality: number }>) => void;
  resetSettings: () => void;
  // Deletion
  batchMoveToTrash: (ids: string[]) => void;
  isDeleteModalOpen: boolean;
  setDeleteModalOpen: (open: boolean) => void;
  confirmDelete: (dontShowAgain?: boolean) => void;
  currentFolderId: string | null;
  navigateToFolder: (id: string | null) => void;
  currentPage: string;
  setCurrentPage: (page: any) => void;
  goBack: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  isFeatureShowcaseOpen: boolean;
  setIsFeatureShowcaseOpen: (open: boolean) => void;
  // telegram
  isTgLoggedIn: boolean;
  tgUser: any | null;
  tgAuthStep: 'phone' | 'code' | 'none';
  setTgAuthStep: (step: 'phone' | 'code' | 'none') => void;
  sendTgCode: (phone: string) => Promise<void>;
  signInTg: (code: string) => Promise<void>;
  logoutTg: () => Promise<void>;
}

const initialItems: DriveItem[] = [
  { id: 'f1', name: 'Work Documents', type: 'folder', isFolder: true, modified: '2:30 PM', created: '10 Jan 2026', owner: 'me', shared: false, location: 'My Drive', parentId: null },
  { id: 'f2', name: 'Personal Photos', type: 'folder', isFolder: true, modified: 'Yesterday', created: '15 Feb 2026', owner: 'me', shared: true, location: 'My Drive', parentId: null },
  { id: 'f3', name: 'Design Assets', type: 'folder', isFolder: true, modified: 'May 1', created: '20 Mar 2026', owner: 'me', shared: false, location: 'My Drive', parentId: null },
  { id: 'f4', name: 'Invoices 2026', type: 'folder', isFolder: true, modified: 'Apr 28', created: '5 Apr 2026', owner: 'me', shared: false, location: 'My Drive', starred: true, parentId: null },
  
  { id: 'd1', name: 'Q2_Financial_Report.pdf', type: 'pdf', isFolder: false, modified: '8:30 AM', created: '2 May 2026', owner: 'me', size: '3.24 MB', location: 'My Drive > Work Documents', parentId: 'f1' },
  { id: 'd2', name: 'Project_Alpha_Brief.docx', type: 'document', isFolder: false, modified: 'Yesterday', created: '1 May 2026', owner: 'Sarah', size: '1.5 MB', shared: true, location: 'Shared with me' },
  { id: 'd3', name: 'User_Metrics_August.xlsx', type: 'spreadsheet', isFolder: false, modified: 'Apr 25', created: '20 Apr 2026', owner: 'me', size: '4.8 MB', location: 'My Drive', starred: true },
  { id: 'demo-1', name: 'macos-theme-for-windows-11.png', type: 'image', isFolder: false, modified: 'Just now', created: '2 May 2026', owner: 'me', size: '2.4 MB', imageUrl: '/macos-theme-for-windows-11-24h2-v0-1z04qks1x9xd1.png', location: 'My Drive', starred: true },
  { id: 'd4', name: 'Q3_Brand_Assets.png', type: 'image', isFolder: false, modified: 'Apr 24', created: '15 Apr 2026', owner: 'me', size: '12 MB', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop', location: 'My Drive > Design Assets' },
  { id: 'd5', name: 'All-Hands_Deck.pptx', type: 'presentation', isFolder: false, modified: 'Apr 20', created: '10 Apr 2026', owner: 'Mike', size: '25 MB', location: 'Shared with me' },
];

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export function DriveProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DriveItem[]>(initialItems);
  const [trashedItemsStack, setTrashedItemsStack] = useState<DriveItem[]>([]);
  const [infoItem, setInfoItem] = useState<DriveItem | null>(null);
  const [mediaItem, setMediaItem] = useState<DriveItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<DriveItem | null>(null);
  const [movingItem, setMovingItem] = useState<DriveItem | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [navigationHistory, setNavigationHistory] = useState<{page: string, folderId: string | null}[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFeatureShowcaseOpen, setIsFeatureShowcaseOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Telegram State
  const [isTgLoggedIn, setIsTgLoggedIn] = useState(false);
  const [tgUser, setTgUser] = useState<any | null>(null);
  const [tgAuthStep, setTgAuthStep] = useState<'phone' | 'code' | 'none'>('none');
  const [tgLoading, setTgLoading] = useState(false);

  useEffect(() => {
    checkTgStatus();
  }, []);

  const checkTgStatus = async () => {
    try {
      const res = await fetch('/api/tg/status');
      const data = await res.json();
      setIsTgLoggedIn(data.loggedIn);
      if (data.loggedIn) {
        setTgUser(data.user);
        refreshTgFiles();
      }
    } catch (err) {
      console.error("Failed to check TG status", err);
    }
  };

  const refreshTgFiles = async () => {
    try {
      const res = await fetch('/api/tg/files');
      if (res.ok) {
        const data = await res.json();
        // Convert TG files type to DriveItem type
        const tgItems: DriveItem[] = data.map((f: any) => ({
          ...f,
          modified: new Date(f.date).toLocaleDateString(),
          owner: 'me',
          location: 'My Drive',
          parentId: null,
          type: mapMimeToType(f.type)
        }));
        setItems(tgItems);
      }
    } catch (err) {
      console.error("Failed to fetch TG files", err);
    }
  };

  const mapMimeToType = (mime: string): FileType => {
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'video';
    if (mime.includes('audio')) return 'audio';
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('msword') || mime.includes('officedocument.word') || mime.includes('document')) return 'document';
    if (mime.includes('excel') || mime.includes('officedocument.spreadsheet') || mime.includes('sheet')) return 'spreadsheet';
    if (mime.includes('powerpoint') || mime.includes('officedocument.presentation') || mime.includes('presentation')) return 'presentation';
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) return 'archive';
    return 'unknown';
  };

  const sendTgCode = async (phone: string) => {
    setTgLoading(true);
    try {
      const res = await fetch('/api/tg/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        setTgAuthStep('code');
        showToast("Code sent to your Telegram!");
      } else {
        const err = await res.json();
        showToast(`Error: ${err.error}`);
      }
    } catch (err) {
      showToast("Connection error");
    } finally {
      setTgLoading(false);
    }
  };

  const signInTg = async (code: string) => {
    setTgLoading(true);
    try {
      const res = await fetch('/api/tg/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) {
        const data = await res.json();
        setIsTgLoggedIn(true);
        setTgUser(data.user);
        setTgAuthStep('none');
        showToast("Logged in successfully!");
        refreshTgFiles();
      } else {
        const err = await res.json();
        showToast(`Error: ${err.error}`);
      }
    } catch (err) {
      showToast("Connection error");
    } finally {
      setTgLoading(false);
    }
  };

  const logoutTg = async () => {
    await fetch('/api/tg/logout', { method: 'POST' });
    setIsTgLoggedIn(false);
    setTgUser(null);
    setItems([]);
    showToast("Logged out from Telegram");
  };
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved as 'light' | 'dark' | 'system';
      return 'system';
    }
    return 'system';
  });
  const [settings, setSettings] = useState({
    showDeleteWarning: true,
    font: localStorage.getItem('font') || 'Default',
    backgroundColor: localStorage.getItem('backgroundColor') || null,
    uiTheme: localStorage.getItem('uiTheme') || 'Standard',
    mediaDownloadQuality: parseInt(localStorage.getItem('mediaDownloadQuality') || '100')
  });
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const updateSettings = (updates: Partial<{ showDeleteWarning: boolean, font: string, backgroundColor: string | null, uiTheme: string, mediaDownloadQuality: number }>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      if (updates.font) localStorage.setItem('font', updates.font);
      if (updates.uiTheme) localStorage.setItem('uiTheme', updates.uiTheme);
      if (updates.backgroundColor !== undefined) {
        if (updates.backgroundColor === null) {
          localStorage.removeItem('backgroundColor');
        } else {
          localStorage.setItem('backgroundColor', updates.backgroundColor);
        }
      }
      if (updates.mediaDownloadQuality !== undefined) {
        localStorage.setItem('mediaDownloadQuality', updates.mediaDownloadQuality.toString());
      }
      return newSettings;
    });
  };

  const resetSettings = () => {
    setTheme('system');
    localStorage.removeItem('theme');
    
    setSettings({
      showDeleteWarning: true,
      font: 'Default',
      backgroundColor: null,
      uiTheme: 'Standard',
      mediaDownloadQuality: 100
    });
    
    localStorage.removeItem('font');
    localStorage.removeItem('backgroundColor');
    localStorage.removeItem('uiTheme');
    localStorage.removeItem('mediaDownloadQuality');
    
    showToast('All settings reset to default');
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (currentTheme: 'light' | 'dark' | 'system') => {
      let effectiveTheme: 'light' | 'dark' = 'light';
      
      if (currentTheme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        effectiveTheme = currentTheme;
      }
      
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Listen for system theme changes if in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const batchMoveToTrash = (ids: string[]) => {
    if (settings.showDeleteWarning) {
      setPendingDeleteIds(ids);
      setDeleteModalOpen(true);
    } else {
      performBatchMoveToTrash(ids);
    }
  };

  const confirmDelete = (dontShowAgain?: boolean) => {
    performBatchMoveToTrash(pendingDeleteIds);
    if (dontShowAgain) {
      updateSettings({ showDeleteWarning: false });
    }
    setDeleteModalOpen(false);
    setPendingDeleteIds([]);
  };

  const performBatchMoveToTrash = (ids: string[]) => {
    const itemsToTrash = items.filter(item => ids.includes(item.id));
    if (itemsToTrash.length === 0) return;
    
    setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, trashed: true } : item));
    setTrashedItemsStack(prev => [...prev, ...itemsToTrash]);
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    setToastMessage(`${itemsToTrash.length} ${itemsToTrash.length === 1 ? 'item' : 'items'} moved to trash.`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const updatePageAndHistory = (page: string) => {
    // Before moving to new page, save current state to history
    setNavigationHistory(prev => [...prev, { page: currentPage, folderId: currentFolderId }]);
    setCurrentPage(page);
    setCurrentFolderId(null); // When switching main pages, clear current folder
  };

  const goBack = () => {
    if (navigationHistory.length === 0) {
      if (currentFolderId) {
        setCurrentFolderId(null);
      } else if (currentPage !== 'home') {
        setCurrentPage('home');
      }
      return;
    };
    
    const prev = navigationHistory[navigationHistory.length - 1];
    setCurrentPage(prev.page);
    setCurrentFolderId(prev.folderId);
    setNavigationHistory(prev => prev.slice(0, -1));
  };

  const createFolder = (name: string, parentId?: string | null) => {
    const parent = (parentId !== undefined ? parentId : currentFolderId);
    const parentFolder = parent ? items.find(i => i.id === parent) : null;
    const location = parentFolder ? `My Drive > ${parentFolder.name}` : 'My Drive';

    const newFolder: DriveItem = {
      id: `folder-${Date.now()}`,
      name,
      type: 'folder',
      isFolder: true,
      modified: 'Just now',
      created: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      owner: 'me',
      location,
      parentId: parent
    };
    setItems(prev => [newFolder, ...prev]);
  };

  const uploadFiles = async (files: FileList) => {
    if (!isTgLoggedIn) {
      showToast("Please login to Telegram first");
      setTgAuthStep('phone');
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('file', file);
    });

    showToast(`Uploading ${files.length} file(s) to Telegram...`);
    
    try {
      const res = await fetch('/api/tg/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        showToast("Uploaded successfully!");
        refreshTgFiles();
      } else {
        showToast("Upload failed");
      }
    } catch (err) {
      showToast("Network error during upload");
    }
  };

  const moveToTrash = (id: string, isFolder: boolean) => {
    const itemToTrash = items.find(item => item.id === id);
    if (!itemToTrash) return;
    
    setItems(prev => prev.map(item => item.id === id ? { ...item, trashed: true } : item));
    setTrashedItemsStack(prev => [...prev, itemToTrash]);
    setToastMessage(`${isFolder ? 'Folder' : 'File'} moved to trash.`);
    // Toast logic to hide undo handled in global component
  };

  const undoTrash = () => {
    if (trashedItemsStack.length === 0) return;
    const lastTrashed = trashedItemsStack[trashedItemsStack.length - 1];
    setItems(prev => prev.map(item => item.id === lastTrashed.id ? { ...item, trashed: false } : item));
    setTrashedItemsStack(prev => prev.slice(0, -1));
    setToastMessage(null);
  };

  const restoreFromTrash = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, trashed: false } : item));
  };

  const emptyTrash = () => {
    setItems(prev => prev.filter(item => !item.trashed));
    // Clear undo stack since they are permanently gone
    setTrashedItemsStack([]);
    setToastMessage('Trash emptied.');
  };

  const deletePermanently = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const renameItem = (id: string, newName: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));
  };

  const changeFolderColor = (id: string, color: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, color } : item));
  };

  const toggleStarred = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, starred: !item.starred } : item));
  };

  const viewItemInfo = (item: DriveItem | null) => {
    setInfoItem(item);
  };

  const viewMedia = (item: DriveItem | null) => {
    setMediaItem(item);
  };

  const downloadItem = async (item: DriveItem) => {
    if (isTgLoggedIn) {
      showToast(`Downloading ${item.name} from Telegram...`);
      window.location.href = `/api/tg/download/${item.id}`;
      return;
    }

    let url = item.imageUrl || '#';
    let filename = item.name;

    if (item.type === 'image' && settings.mediaDownloadQuality < 100 && item.imageUrl) {
      showToast(`Compressing ${item.name} at ${settings.mediaDownloadQuality}% quality...`);
      try {
        const img = new globalThis.Image();
        img.src = item.imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          const quality = settings.mediaDownloadQuality / 100;
          url = canvas.toDataURL('image/jpeg', quality);
          if (!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
            filename = filename.replace(/\.[^/.]+$/, "") + ".jpg";
          }
        }
      } catch (err) {
        console.error("Compression failed", err);
      }
    } else if (item.type === 'video' && settings.mediaDownloadQuality < 100) {
      showToast(`Requesting compressed video from server... (${settings.mediaDownloadQuality}%)`);
      // Mock API call structure for video compression
      console.log(`fetch('/api/download-video?id=${item.id}&quality=${settings.mediaDownloadQuality}')`);
      setTimeout(() => showToast(`Mock: Downloaded compressed video.`), 1500);
      return; 
    }

    const link = document.createElement('a');
    link.href = url; 
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (item.type !== 'video' || settings.mediaDownloadQuality === 100) {
      showToast(`Downloading ${filename}...`);
    }
  };

  const openItem = (item: DriveItem) => {
    if (item.isFolder) {
      navigateToFolder(item.id);
    } else if (['image', 'video', 'audio'].includes(item.type)) {
      viewMedia(item);
    } else {
      // Don't auto-download. Instead show info or just notify
      viewItemInfo(item);
      showToast(`Selected ${item.name}. Use menu to download.`);
    }
  };

  const moveItem = (itemId: string, destinationId: string | null) => {
    const destFolder = destinationId ? items.find(i => i.id === destinationId) : null;
    const newLocation = destFolder ? `My Drive > ${destFolder.name}` : 'My Drive';
    
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, parentId: destinationId, location: newLocation };
      }
      return item;
    }));
    
    showToast(`Moved to ${destFolder ? destFolder.name : 'My Drive'}`);
  };

  const navigateToFolder = (id: string | null) => {
    if (id !== currentFolderId) {
      setNavigationHistory(prev => [...prev, { page: currentPage, folderId: currentFolderId }]);
    }
    setCurrentFolderId(id);
    if (id) {
      setCurrentPage('my-drive');
    }
  };

  return (
    <DriveContext.Provider value={{
      items, createFolder, uploadFiles, moveToTrash, restoreFromTrash,
      deletePermanently, renameItem, changeFolderColor, toggleStarred, undoTrash, emptyTrash,
      viewItemInfo, infoItem, viewMedia, mediaItem, renamingItem, setRenamingItem, movingItem, setMovingItem, moveItem, openItem, downloadItem, 
      selectedIds, toggleSelection, clearSelection, theme, setTheme, toggleTheme, settings, updateSettings, resetSettings,
      batchMoveToTrash, isDeleteModalOpen, setDeleteModalOpen, confirmDelete,
      currentFolderId, navigateToFolder, currentPage, setCurrentPage: updatePageAndHistory,
      goBack, toastMessage, showToast, isFeatureShowcaseOpen, setIsFeatureShowcaseOpen,
      isTgLoggedIn, tgUser, tgAuthStep, setTgAuthStep, sendTgCode, signInTg, logoutTg
    }}>
      {children}
    </DriveContext.Provider>
  );
}

export function useDrive() {
  const context = useContext(DriveContext);
  if (context === undefined) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
}
