import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";

export type FileType =
  | "folder"
  | "image"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "archive"
  | "video"
  | "audio"
  | "unknown";

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
  spam?: boolean;
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
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleTheme: () => void;
  // Settings
  settings: {
    showDeleteWarning: boolean;
    font: string;
    backgroundColor: string | null;
    uiTheme: string;
    mediaDownloadQuality: number;
  };
  updateSettings: (
    updates: Partial<{
      showDeleteWarning: boolean;
      font: string;
      backgroundColor: string | null;
      uiTheme: string;
      mediaDownloadQuality: number;
    }>,
  ) => void;
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
  tgAuthStep: "phone" | "code" | "none";
  setTgAuthStep: (step: "phone" | "code" | "none") => void;
  sendTgCode: (phone: string) => Promise<void>;
  signInTg: (code: string) => Promise<void>;
  logoutTg: () => Promise<void>;
}

const initialItems: DriveItem[] = [];

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export function DriveProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DriveItem[]>(initialItems);

  const syncVfs = (newItems: DriveItem[], isUpdate = true) => {
    if (!isUpdate) return;
    const sessionString = localStorage.getItem("tgSession");
    if (!sessionString) return;

    const vfsState = newItems.map((i) => ({
      id: i.id,
      name: i.name,
      isFolder: i.isFolder,
      parentId: i.parentId,
      color: i.color,
      starred: i.starred,
      type: i.type,
      size: i.size,
      modified: i.modified,
    }));

    fetch("/api/tg/vfs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionString}`,
      },
      body: JSON.stringify({ vfs: vfsState }),
    }).catch((e) => console.error("VFS sync failed", e));
  };

  const updateItems = (
    updater: DriveItem[] | ((prev: DriveItem[]) => DriveItem[]),
  ) => {
    setItems((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      syncVfs(next);
      return next;
    });
  };

  const [trashedItemsStack, setTrashedItemsStack] = useState<DriveItem[]>([]);
  const [infoItem, setInfoItem] = useState<DriveItem | null>(null);
  const [mediaItem, setMediaItem] = useState<DriveItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<DriveItem | null>(null);
  const [movingItem, setMovingItem] = useState<DriveItem | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const currentFolderIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  const [currentPage, setCurrentPage] = useState<string>("home");
  const [navigationHistory, setNavigationHistory] = useState<
    { page: string; folderId: string | null }[]
  >([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFeatureShowcaseOpen, setIsFeatureShowcaseOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Telegram State
  const [isTgLoggedIn, setIsTgLoggedIn] = useState(false);
  const [tgUser, setTgUser] = useState<any | null>(null);
  const [tgAuthStep, setTgAuthStep] = useState<"phone" | "code" | "none">(
    "none",
  );
  const [tgLoading, setTgLoading] = useState(false);

  useEffect(() => {
    checkTgStatus();
  }, []);

  const checkTgStatus = async () => {
    try {
      const sessionString = localStorage.getItem("tgSession");
      const res = await fetch("/api/tg/status", {
        headers: sessionString
          ? { Authorization: `Bearer ${sessionString}` }
          : {},
      });
      const data = await res.json();
      setIsTgLoggedIn(data.loggedIn);
      if (data.loggedIn) {
        setTgUser(data.user);
        if (data.settings) {
          updateSettings(data.settings, false); // false to avoid triggering save logic
        }
        refreshTgFiles();
      } else {
        localStorage.removeItem("tgSession");
      }
    } catch (err) {
      console.error("Failed to check TG status", err);
    }
  };

  const refreshTgFiles = async (skipVfsFetch = false) => {
    try {
      const sessionString = localStorage.getItem("tgSession");

      const filesRes = await fetch("/api/tg/files", {
        headers: sessionString
          ? { Authorization: `Bearer ${sessionString}` }
          : {},
      });

      let vfsRes = null;
      if (!skipVfsFetch) {
        vfsRes = await fetch("/api/tg/vfs", {
          headers: sessionString
            ? { Authorization: `Bearer ${sessionString}` }
            : {},
        });
      }

      if (filesRes.ok) {
        const data = await filesRes.json();
        // Convert TG files type to DriveItem type
        const tgItems: DriveItem[] = data.map((f: any) => ({
          ...f,
          modified: new Date(f.date).toLocaleDateString(),
          owner: "me",
          location: "My Drive",
          parentId: null,
          trashed: f.status === "trash",
          spam: f.status === "spam",
          type: mapMimeToType(f.type),
        }));

        let storedVfs: DriveItem[] = [];
        if (!skipVfsFetch && vfsRes && vfsRes.ok) {
          const vData = await vfsRes.json();
          if (vData.vfs) storedVfs = vData.vfs;
        } else if (skipVfsFetch) {
          // fallback to current items array as VFS source of truth
          storedVfs = items;
        }

        const folders = storedVfs.filter((i) => i.isFolder);
        const finalItems = [...folders];

        const vfsFilesMap = new Map();
        storedVfs
          .filter((i) => !i.isFolder)
          .forEach((i) => vfsFilesMap.set(i.id, i));

        let hasChanges = false;
        tgItems.forEach((tgFile) => {
          if (vfsFilesMap.has(tgFile.id)) {
            const saved = vfsFilesMap.get(tgFile.id);
            const getPath = (pId: string | null): string => {
              if (!pId) return "My Drive";
              const p = folders.find(f => f.id === pId);
              return p ? `My Drive > ${p.name}` : "My Drive";
            };

            finalItems.push({
              ...tgFile,
              parentId: saved.parentId,
              starred: saved.starred,
              color: saved.color,
              name: saved.name || tgFile.name,
              location: getPath(saved.parentId),
            });
          } else {
            // new file not in VFS
            finalItems.push(tgFile);
            hasChanges = true;
          }
        });

        setItems(finalItems);
        // Sync the merged final outcome back so that newly fetched tg items get added to VFS immediately
        if (hasChanges && finalItems.length > 0) {
          syncVfs(finalItems, true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch TG files", err);
    }
  };

  const mapMimeToType = (mime: string): FileType => {
    if (mime.includes("image")) return "image";
    if (mime.includes("video")) return "video";
    if (mime.includes("audio")) return "audio";
    if (mime.includes("pdf")) return "pdf";
    if (
      mime.includes("msword") ||
      mime.includes("officedocument.word") ||
      mime.includes("document")
    )
      return "document";
    if (
      mime.includes("excel") ||
      mime.includes("officedocument.spreadsheet") ||
      mime.includes("sheet")
    )
      return "spreadsheet";
    if (
      mime.includes("powerpoint") ||
      mime.includes("officedocument.presentation") ||
      mime.includes("presentation")
    )
      return "presentation";
    if (
      mime.includes("zip") ||
      mime.includes("rar") ||
      mime.includes("compressed")
    )
      return "archive";
    return "unknown";
  };

  const sendTgCode = async (phone: string) => {
    setTgLoading(true);
    try {
      const res = await fetch("/api/tg/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("tgPhone", data.phone);
        localStorage.setItem("tgPhoneCodeHash", data.phoneCodeHash);
        localStorage.setItem("tgTempSession", data.sessionString);
        setTgAuthStep("code");
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
      const res = await fetch("/api/tg/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          phone: localStorage.getItem("tgPhone"),
          phoneCodeHash: localStorage.getItem("tgPhoneCodeHash"),
          sessionString: localStorage.getItem("tgTempSession"),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsTgLoggedIn(true);
        setTgUser(data.user);
        localStorage.setItem("tgSession", data.sessionString);
        localStorage.removeItem("tgPhone");
        localStorage.removeItem("tgPhoneCodeHash");
        localStorage.removeItem("tgTempSession");
        setTgAuthStep("none");
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
    const sessionString = localStorage.getItem("tgSession");
    if (sessionString) {
      await fetch("/api/tg/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionString}` },
      }).catch(console.error);
    }
    localStorage.removeItem("tgSession");
    setIsTgLoggedIn(false);
    setTgUser(null);
    setItems([]);
    showToast("Logged out from Telegram");
  };
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light" || saved === "system")
        return saved as "light" | "dark" | "system";
      return "system";
    }
    return "system";
  });
  const [settings, setSettings] = useState({
    showDeleteWarning: true,
    font: localStorage.getItem("font") || "Default",
    backgroundColor: localStorage.getItem("backgroundColor") || null,
    uiTheme: localStorage.getItem("uiTheme") || "Standard",
    mediaDownloadQuality: parseInt(
      localStorage.getItem("mediaDownloadQuality") || "100",
    ),
  });
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const updateSettings = (
    updates: Partial<{
      showDeleteWarning: boolean;
      font: string;
      backgroundColor: string | null;
      uiTheme: string;
      mediaDownloadQuality: number;
    }>,
    syncRemote: boolean = true,
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      if (updates.font) localStorage.setItem("font", updates.font);
      if (updates.uiTheme) localStorage.setItem("uiTheme", updates.uiTheme);
      if (updates.backgroundColor !== undefined) {
        if (updates.backgroundColor === null) {
          localStorage.removeItem("backgroundColor");
        } else {
          localStorage.setItem("backgroundColor", updates.backgroundColor);
        }
      }
      if (updates.mediaDownloadQuality !== undefined) {
        localStorage.setItem(
          "mediaDownloadQuality",
          updates.mediaDownloadQuality.toString(),
        );
      }

      // Sync to telegram
      if (syncRemote) {
        const sessionString = localStorage.getItem("tgSession");
        if (sessionString) {
          fetch("/api/tg/settings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionString}`,
            },
            body: JSON.stringify({ settings: newSettings }),
          }).catch((e) => console.error(e));
        }
      }

      return newSettings;
    });
  };

  const resetSettings = () => {
    setTheme("system");
    localStorage.removeItem("theme");

    setSettings({
      showDeleteWarning: true,
      font: "Default",
      backgroundColor: null,
      uiTheme: "Standard",
      mediaDownloadQuality: 100,
    });

    localStorage.removeItem("font");
    localStorage.removeItem("backgroundColor");
    localStorage.removeItem("uiTheme");
    localStorage.removeItem("mediaDownloadQuality");

    showToast("All settings reset to default");
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (currentTheme: "light" | "dark" | "system") => {
      let effectiveTheme: "light" | "dark" = "light";

      if (currentTheme === "system") {
        effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
      } else {
        effectiveTheme = currentTheme;
      }

      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
    };

    applyTheme(theme);
    localStorage.setItem("theme", theme);

    // Listen for system theme changes if in 'system' mode
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
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
    const itemsToTrash = items.filter((item) => ids.includes(item.id));
    if (itemsToTrash.length === 0) return;

    updateItems((prev) =>
      prev.map((item) =>
        ids.includes(item.id) ? { ...item, trashed: true } : item,
      ),
    );
    setTrashedItemsStack((prev) => [...prev, ...itemsToTrash]);
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    setToastMessage(
      `${itemsToTrash.length} ${itemsToTrash.length === 1 ? "item" : "items"} moved to trash.`,
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    let intervalId: any;

    const pingTg = async () => {
      const sessionString = localStorage.getItem("tgSession");
      if (!sessionString) return;
      try {
        const res = await fetch("/api/tg/ping", {
          headers: { Authorization: `Bearer ${sessionString}` },
        });
        const data = await res.json();
        if (!data.ok) {
          logoutTg();
          showToast("Session terminated from another device");
        }
      } catch (err) {
        console.error("Ping error", err);
      }
    };

    if (isTgLoggedIn) {
      intervalId = setInterval(pingTg, 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTgLoggedIn]);

  const updatePageAndHistory = (page: string) => {
    // Before moving to new page, save current state to history
    setNavigationHistory((prev) => [
      ...prev,
      { page: currentPage, folderId: currentFolderId },
    ]);
    setCurrentPage(page);
    setCurrentFolderId(null); // When switching main pages, clear current folder
  };

  const goBack = () => {
    if (navigationHistory.length === 0) {
      if (currentFolderId) {
        setCurrentFolderId(null);
      } else if (currentPage !== "home") {
        setCurrentPage("home");
      }
      return;
    }

    const prev = navigationHistory[navigationHistory.length - 1];
    setCurrentPage(prev.page);
    setCurrentFolderId(prev.folderId);
    setNavigationHistory((prev) => prev.slice(0, -1));
  };

  const createFolder = (name: string, parentId?: string | null) => {
    const parent = parentId !== undefined ? parentId : currentFolderId;
    const parentFolder = parent ? items.find((i) => i.id === parent) : null;
    const location = parentFolder
      ? `My Drive > ${parentFolder.name}`
      : "My Drive";

    const newFolder: DriveItem = {
      id: `folder-${Date.now()}`,
      name,
      type: "folder",
      isFolder: true,
      modified: "Just now",
      created: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      owner: "me",
      location,
      parentId: parent,
    };
    updateItems((prev) => [newFolder, ...prev]);
  };

  const uploadFiles = async (files: FileList) => {
    if (!isTgLoggedIn) {
      showToast("Please login to Telegram first");
      setTgAuthStep("phone");
      return;
    }

    showToast(`Uploading ${files.length} file(s) to Telegram...`);
    const sessionString = localStorage.getItem("tgSession");
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const CHUNK_SIZE = 512 * 1024; // 512 KB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const uploadId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
      
      let uploadSuccess = false;
      let fileId = null;
      let finalData = null;

      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const formData = new FormData();
          formData.append("chunk", chunk);
          formData.append("uploadId", uploadId);
          formData.append("chunkIndex", chunkIndex.toString());
          formData.append("totalChunks", totalChunks.toString());
          formData.append("fileName", file.name);
          formData.append("mimeType", file.type || "application/octet-stream");

          const res = await fetch("/api/tg/upload-chunk", {
            method: "POST",
            headers: sessionString
              ? { Authorization: `Bearer ${sessionString}` }
              : {},
            body: formData,
          });

          if (!res.ok) {
            const text = await res.text();
            let errorMsg = `HTTP Error ${res.status}`;
            try {
              const errorData = JSON.parse(text);
              if (errorData.error) errorMsg = errorData.error;
            } catch (e) {
              if (res.status === 413) errorMsg = "Chunk is too large for the network proxy";
              else if (res.status === 504) errorMsg = "Server connection timed out";
              else errorMsg = `Server returned invalid data (HTTP ${res.status})`;
            }
            throw new Error(errorMsg);
          }

          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error("Server returned invalid JSON data");
          }

          if (data.error) {
            throw new Error(data.error);
          }

          if (chunkIndex === totalChunks - 1) {
            // Final chunk finished
            if (data.fileId) {
               uploadSuccess = true;
               fileId = data.fileId;
               finalData = data;
            }
          }
        }

        if (uploadSuccess && fileId) {
          updateItems((prev) => {
            const parentFolder = currentFolderIdRef.current ? prev.find(i => i.id === currentFolderIdRef.current) : null;
            const newLocation = parentFolder ? `My Drive > ${parentFolder.name}` : "My Drive";
            const newItems = [
              ...prev,
              {
                id: fileId,
                name: file.name,
                isFolder: false,
                parentId: currentFolderIdRef.current,
                size: file.size.toString(),
                date: new Date().toISOString(),
                modified: new Date().toLocaleDateString(),
                owner: "me",
                location: newLocation,
                trashed: false,
                spam: false,
                type: mapMimeToType(file.type),
              },
            ];
            return newItems;
          });
          uploadedCount++;
        }
      } catch (e: any) {
        console.error("Network error during upload for ", file.name, e);
        showToast(`Failed: ${file.name} - ${e.message}`);
      }
    }

    if (uploadedCount > 0) {
      showToast(`${uploadedCount} file(s) uploaded!`);
    } else {
      showToast("Upload failed");
    }
  };

  const moveToTrash = (id: string, isFolder: boolean) => {
    const itemToTrash = items.find((item) => item.id === id);
    if (!itemToTrash) return;

    updateItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, trashed: true } : item)),
    );
    setTrashedItemsStack((prev) => [...prev, itemToTrash]);
    setToastMessage(`${isFolder ? "Folder" : "File"} moved to trash.`);
    // Toast logic to hide undo handled in global component
  };

  const undoTrash = () => {
    if (trashedItemsStack.length === 0) return;
    const lastTrashed = trashedItemsStack[trashedItemsStack.length - 1];
    updateItems((prev) =>
      prev.map((item) =>
        item.id === lastTrashed.id ? { ...item, trashed: false } : item,
      ),
    );
    setTrashedItemsStack((prev) => prev.slice(0, -1));
    setToastMessage(null);
  };

  const restoreFromTrash = (id: string) => {
    updateItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, trashed: false } : item)),
    );
  };

  const emptyTrash = () => {
    const itemsToDelete = items.filter((item) => item.trashed);
    updateItems((prev) => prev.filter((item) => !item.trashed));
    // Clear undo stack since they are permanently gone
    setTrashedItemsStack([]);
    setToastMessage("Trash emptied.");

    if (isTgLoggedIn) {
      const sessionString = localStorage.getItem("tgSession");
      if (sessionString) {
        itemsToDelete.forEach((item) => {
          // Avoid failing entire flow if one fails, but we should delete what we can.
          fetch(`/api/tg/delete/${item.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionString}` },
          }).catch((e) => console.error(e));
        });
      }
    }
  };

  const deletePermanently = (id: string) => {
    updateItems((prev) => prev.filter((item) => item.id !== id));
    if (isTgLoggedIn) {
      const sessionString = localStorage.getItem("tgSession");
      if (sessionString) {
        fetch(`/api/tg/delete/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionString}` },
        }).catch((e) => console.error(e));
      }
    }
  };

  const renameItem = (id: string, newName: string) => {
    updateItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item)),
    );
  };

  const changeFolderColor = (id: string, color: string) => {
    updateItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, color } : item)),
    );
  };

  const toggleStarred = (id: string) => {
    updateItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, starred: !item.starred } : item,
      ),
    );
  };

  const viewItemInfo = (item: DriveItem | null) => {
    setInfoItem(item);
  };

  const viewMedia = (item: DriveItem | null) => {
    setMediaItem(item);
  };

  const downloadItem = async (item: DriveItem) => {
    let filename = item.name;
    if (!filename.includes(".")) {
      if (item.type === "video") filename += ".mp4";
      else if (item.type === "audio") filename += ".mp3";
      else if (item.type === "image") filename += ".jpg";
      else filename += ".bin";
    }

    if (isTgLoggedIn) {
      showToast(`Preparing download for ${filename}...`);
      const sessionString = typeof window !== "undefined" ? localStorage.getItem("tgSession") : null;
      if (!sessionString) return;

      try {
        const downloadUrl = `/api/tg/download/${item.id}`;
        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${sessionString}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || response.statusText || "Download failed");
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error("Received HTML error page instead of file");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
        
        showToast("Download completed!");
      } catch (err: any) {
        console.error("Download error:", err);
        showToast(`Download failed: ${err.message}`);
      }
      return;
    }

    // Fallback for demo non-logged-in dummy items
    let url = item.imageUrl;
    if (url) {
      url = url.replace("inline=true", "inline=false");
    }
    if (!url) {
      url = `/api/tg/download/${item.id}`;
    }

    if (item.type === "image" && settings.mediaDownloadQuality < 100) {
      showToast(`Image compression at download is experimental.`);
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading ${filename}...`);
  };

  const openItem = (item: DriveItem) => {
    if (item.isFolder) {
      navigateToFolder(item.id);
    } else if (["image", "video", "audio"].includes(item.type)) {
      viewMedia(item);
    } else {
      // Don't auto-download. Instead show info or just notify
      viewItemInfo(item);
      showToast(`Selected ${item.name}. Use menu to download.`);
    }
  };

  const moveItem = (itemId: string, destinationId: string | null) => {
    const destFolder = destinationId
      ? items.find((i) => i.id === destinationId)
      : null;
    const newLocation = destFolder
      ? `My Drive > ${destFolder.name}`
      : "My Drive";

    updateItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, parentId: destinationId, location: newLocation };
        }
        return item;
      }),
    );

    showToast(`Moved to ${destFolder ? destFolder.name : "My Drive"}`);
  };

  const navigateToFolder = (id: string | null) => {
    if (id !== currentFolderId) {
      setNavigationHistory((prev) => [
        ...prev,
        { page: currentPage, folderId: currentFolderId },
      ]);
    }
    setCurrentFolderId(id);
    if (id) {
      setCurrentPage("my-drive");
    }
  };

  return (
    <DriveContext.Provider
      value={{
        items,
        createFolder,
        uploadFiles,
        moveToTrash,
        restoreFromTrash,
        deletePermanently,
        renameItem,
        changeFolderColor,
        toggleStarred,
        undoTrash,
        emptyTrash,
        viewItemInfo,
        infoItem,
        viewMedia,
        mediaItem,
        renamingItem,
        setRenamingItem,
        movingItem,
        setMovingItem,
        moveItem,
        openItem,
        downloadItem,
        selectedIds,
        toggleSelection,
        clearSelection,
        theme,
        setTheme,
        toggleTheme,
        settings,
        updateSettings,
        resetSettings,
        batchMoveToTrash,
        isDeleteModalOpen,
        setDeleteModalOpen,
        confirmDelete,
        currentFolderId,
        navigateToFolder,
        currentPage,
        setCurrentPage: updatePageAndHistory,
        goBack,
        toastMessage,
        showToast,
        isFeatureShowcaseOpen,
        setIsFeatureShowcaseOpen,
        isTgLoggedIn,
        tgUser,
        tgAuthStep,
        setTgAuthStep,
        sendTgCode,
        signInTg,
        logoutTg,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
}

export function useDrive() {
  const context = useContext(DriveContext);
  if (context === undefined) {
    throw new Error("useDrive must be used within a DriveProvider");
  }
  return context;
}
