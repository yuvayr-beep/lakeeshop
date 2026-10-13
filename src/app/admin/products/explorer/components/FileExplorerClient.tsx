'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileCode,
  FileVideo,
  FileAudio,
  Upload,
  Download,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Search,
  ArrowRight,
  HardDrive,
  Cloud,
  Server,
  X,
  Maximize2,
  Plus,
  ChevronRight,
  Layers,
  ArrowUp,
  FileCheck,
  PackageCheck,
  Loader2,
  Info,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  StorageProviderType,
  listMediaStream,
  uploadMediaFile,
  deleteMediaFile,
  getMediaViewUrl,
  getMediaDownloadUrl,
  getBatchDownloadZipUrl,
  getMediaExportExcelUrl,
  fetchAllMediaMetadata,
  syncProductImagesAndCatalog,
  MediaMetadataRecord,
} from '@/services/mediaApi';

// Helper to format bytes into readable string
function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Format timestamp
function formatDate(timestamp: number | string | undefined): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return String(timestamp);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Get readable type description from file name
function getFileType(fileName: string, isDir: boolean): { typeName: string; category: string } {
  if (isDir) return { typeName: 'File folder', category: 'folder' };
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return { typeName: 'Microsoft Excel Worksheet', category: 'excel' };
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
    return { typeName: `${ext.toUpperCase()} Image`, category: 'image' };
  }
  if (['pdf'].includes(ext)) {
    return { typeName: 'PDF Document', category: 'pdf' };
  }
  if (['txt', 'log'].includes(ext)) {
    return { typeName: 'Text Document', category: 'text' };
  }
  if (['md'].includes(ext)) {
    return { typeName: 'Markdown Document', category: 'text' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { typeName: 'Compressed Archive', category: 'archive' };
  }
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
    return { typeName: 'Video File', category: 'video' };
  }
  if (['mp3', 'wav', 'ogg'].includes(ext)) {
    return { typeName: 'Audio File', category: 'audio' };
  }
  if (['json', 'js', 'ts', 'tsx', 'html', 'css', 'sql'].includes(ext)) {
    return { typeName: `${ext.toUpperCase()} Source File`, category: 'code' };
  }
  if (['lnk'].includes(ext)) {
    return { typeName: 'Shortcut', category: 'shortcut' };
  }

  return { typeName: `${ext.toUpperCase() || 'Unknown'} File`, category: 'file' };
}

// Render icon based on category
function renderFileIcon(category: string, isDir: boolean, name?: string) {
  if (isDir) {
    return <Folder className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />;
  }
  switch (category) {
    case 'excel':
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'image':
      return <FileImage className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'pdf':
      return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    case 'archive':
      return <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'code':
      return <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />;
    case 'video':
      return <FileVideo className="w-4 h-4 text-purple-400 shrink-0" />;
    case 'audio':
      return <FileAudio className="w-4 h-4 text-pink-400 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-slate-400 shrink-0" />;
  }
}

interface LocalItem {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  lastModified: number;
  isDir: boolean;
  handle?: any;
  fileObj?: File;
}

export default function FileExplorerClient() {
  // ==========================================
  // Left Pane: Local Windows PC Files
  // ==========================================
  const [localPath, setLocalPath] = useState<string>('C:\\Users\\Admin\\OneDrive\\Desktop\\');
  const [localDirectoryHandle, setLocalDirectoryHandle] = useState<any | null>(null);
  const [localHistory, setLocalHistory] = useState<{ name: string; handle: any }[]>([]);
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);
  const [selectedLocalIds, setSelectedLocalIds] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState<string>('');
  const [localSortCol, setLocalSortCol] = useState<'name' | 'size' | 'type' | 'lastModified'>('name');
  const [localSortAsc, setLocalSortAsc] = useState<boolean>(true);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // Right Pane: Server Files (lmedia)
  // ==========================================
  const [serverProvider, setServerProvider] = useState<StorageProviderType>('LOCAL');
  // Constrain server explorer strictly to /opt/lakee/products/ folder
  const [serverPath, setServerPath] = useState<string>('products/');
  const [allServerKeys, setAllServerKeys] = useState<string[]>([]);
  const [metadataMap, setMetadataMap] = useState<Record<string, MediaMetadataRecord>>({});
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [selectedServerKeys, setSelectedServerKeys] = useState<Set<string>>(new Set());
  const [serverSearch, setServerSearch] = useState<string>('');
  const [serverSortCol, setServerSortCol] = useState<'name' | 'type'>('name');
  const [serverSortAsc, setServerSortAsc] = useState<boolean>(true);

  // ==========================================
  // Sync Product Images State
  // ==========================================
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // ==========================================
  // Drag & Drop & Upload State
  // ==========================================
  const [draggedLocalItems, setDraggedLocalItems] = useState<LocalItem[]>([]);
  const [isOverRightPane, setIsOverRightPane] = useState<boolean>(false);
  const [uploadingProgress, setUploadingProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);

  // ==========================================
  // Lightbox / File Preview Modal
  // ==========================================
  const [previewItem, setPreviewItem] = useState<{
    fileKey: string;
    publicUrl: string;
    isImage: boolean;
    name: string;
    originalName?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ==========================================
  // Initialize Initial Demo Local Files
  // ==========================================
  useEffect(() => {
    const mockFiles: LocalItem[] = [
      { id: '1', name: 'Desktop_121026', size: 0, type: 'File folder', category: 'folder', lastModified: Date.now() - 3600000 * 4, isDir: true },
      { id: '2', name: 'all_products_export_1791797849138.xlsx', size: 4713 * 1024, type: 'Microsoft Excel Worksheet', category: 'excel', lastModified: Date.now() - 3600000 * 2, isDir: false },
      { id: '3', name: 'product_creation_template_1791798256385.xlsx', size: 58 * 1024, type: 'Microsoft Excel Worksheet', category: 'excel', lastModified: Date.now() - 3600000 * 2.5, isDir: false },
      { id: '4', name: 'vshsnTaxtimeline.csv', size: 3 * 1024, type: 'Microsoft Excel Comma Separated', category: 'excel', lastModified: Date.now() - 3600000 * 3, isDir: false },
      { id: '5', name: 'hsn_template_1791792102440.xlsx', size: 12 * 1024, type: 'Microsoft Excel Worksheet', category: 'excel', lastModified: Date.now() - 3600000 * 3.5, isDir: false },
      { id: '6', name: 'product_edit_template_1791789103437_new.xlsx', size: 18 * 1024, type: 'Microsoft Excel Worksheet', category: 'excel', lastModified: Date.now() - 3600000 * 4, isDir: false },
      { id: '7', name: 'failed_products_edit_1791791866353.xlsx', size: 25 * 1024, type: 'Microsoft Excel Worksheet', category: 'excel', lastModified: Date.now() - 3600000 * 4.2, isDir: false },
      { id: '8', name: 'all_products_export_1791787340325.xlsx', size: 4335 * 1024, type: 'Microsoft Excel Worksheet', category: 'excel', lastModified: Date.now() - 3600000 * 5, isDir: false },
      { id: '9', name: 'CPL-ACS-SCC-0009.jpg', size: 116 * 1024, type: 'JPEG Image', category: 'image', lastModified: Date.now() - 3600000 * 6, isDir: false },
      { id: '10', name: 'CPL-ACS-SCC-0009B.jpg', size: 120 * 1024, type: 'JPEG Image', category: 'image', lastModified: Date.now() - 3600000 * 6.5, isDir: false },
      { id: '11', name: 'CPL-ACS-SCC-0009C.jpg', size: 122 * 1024, type: 'JPEG Image', category: 'image', lastModified: Date.now() - 3600000 * 7, isDir: false },
      { id: '12', name: 'Important.txt', size: 13 * 1024, type: 'Text Document', category: 'text', lastModified: Date.now() - 86400000 * 20, isDir: false },
    ];
    setLocalItems(mockFiles);
  }, []);

  // ==========================================
  // Fetch Server Files & Metadata All
  // ==========================================
  const fetchServerFiles = async () => {
    setServerLoading(true);
    try {
      const [items, meta] = await Promise.all([
        listMediaStream(serverProvider, ''),
        fetchAllMediaMetadata(),
      ]);
      // Capture all known keys, including any products metadata items
      const metaKeys = Object.keys(meta).filter((k) => k.startsWith('products/'));
      const combined = Array.from(new Set([...items, ...metaKeys]));
      setAllServerKeys(combined);
      setMetadataMap(meta);
    } catch (err: any) {
      console.error('Failed to stream server files or metadata:', err);
      toast.error('Could not fetch server file list');
    } finally {
      setServerLoading(false);
    }
  };

  useEffect(() => {
    fetchServerFiles();
  }, [serverProvider]);

  // ==========================================
  // Open Real Windows Folder using File System Access API
  // ==========================================
  const handleOpenLocalFolder = async () => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        setLocalDirectoryHandle(dirHandle);
        setLocalHistory([{ name: dirHandle.name, handle: dirHandle }]);
        setLocalPath(`C:\\Users\\Admin\\${dirHandle.name}\\`);
        await readDirectoryEntries(dirHandle);
        toast.success(`Connected to Windows folder: ${dirHandle.name}`);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Directory picker error:', err);
          folderInputRef.current?.click();
        }
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  // Read entries from a FileSystemDirectoryHandle
  const readDirectoryEntries = async (dirHandle: any) => {
    try {
      const items: LocalItem[] = [];
      for await (const entry of dirHandle.values()) {
        const isDir = entry.kind === 'directory';
        const { typeName, category } = getFileType(entry.name, isDir);

        if (isDir) {
          items.push({
            id: entry.name,
            name: entry.name,
            size: 0,
            type: typeName,
            category,
            lastModified: Date.now(),
            isDir: true,
            handle: entry,
          });
        } else {
          try {
            const file = await entry.getFile();
            items.push({
              id: entry.name,
              name: entry.name,
              size: file.size,
              type: typeName,
              category,
              lastModified: file.lastModified,
              isDir: false,
              handle: entry,
              fileObj: file,
            });
          } catch {
            items.push({
              id: entry.name,
              name: entry.name,
              size: 0,
              type: typeName,
              category,
              lastModified: Date.now(),
              isDir: false,
              handle: entry,
            });
          }
        }
      }
      setLocalItems(items);
      setSelectedLocalIds(new Set());
    } catch (err) {
      console.error('Error reading directory entries:', err);
      toast.error('Failed to read folder entries');
    }
  };

  // Navigate into local subfolder
  const handleEnterLocalFolder = async (folderItem: LocalItem) => {
    if (!folderItem.handle) return;
    try {
      setLocalHistory((prev) => [...prev, { name: folderItem.name, handle: folderItem.handle }]);
      setLocalPath((prev) => `${prev}${folderItem.name}\\`);
      await readDirectoryEntries(folderItem.handle);
    } catch (err) {
      console.error('Failed to enter folder:', err);
      toast.error('Cannot open directory');
    }
  };

  // Navigate up one folder on local PC
  const handleLocalNavigateUp = async () => {
    if (localHistory.length <= 1) {
      return;
    }
    const newHistory = [...localHistory];
    newHistory.pop();
    const parent = newHistory[newHistory.length - 1];
    setLocalHistory(newHistory);
    const parts = localPath.replace(/\\$/, '').split('\\');
    parts.pop();
    setLocalPath(parts.join('\\') + '\\');
    await readDirectoryEntries(parent.handle);
  };

  // Fallback file input change
  const handleFallbackFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const items: LocalItem[] = Array.from(fileList).map((file, idx) => {
      const { typeName, category } = getFileType(file.name, false);
      return {
        id: `local-${idx}-${file.name}`,
        name: file.name,
        size: file.size,
        type: typeName,
        category,
        lastModified: file.lastModified,
        isDir: false,
        fileObj: file,
      };
    });

    setLocalItems(items);
    setSelectedLocalIds(new Set());
    setLocalPath(`Imported Folder (${fileList.length} files)`);
    toast.success(`Loaded ${fileList.length} files from Windows PC`);
  };

  // ==========================================
  // Server Directory Navigation (1-Level Focus)
  // ==========================================
  interface ServerDisplayItem {
    fullKey: string;
    relativeName: string;
    originalFilename?: string;
    isDir: boolean;
    size?: number;
    category: string;
    typeName: string;
    createdAt?: string;
  }

  const serverDisplayItems = useMemo(() => {
    const list: ServerDisplayItem[] = [];
    const seen = new Set<string>();

    for (const item of allServerKeys) {
      // Strictly only allow items within products/ directory
      if (!item.startsWith('products/')) continue;
      if (item === 'products/') continue;
      if (serverPath && (!item.startsWith(serverPath) || item === serverPath)) continue;
      const remainder = serverPath ? item.substring(serverPath.length) : item;
      if (!remainder) continue;

      const slashIdx = remainder.indexOf('/');
      if (slashIdx === -1) {
        // Direct file
        if (!seen.has(remainder)) {
          seen.add(remainder);
          const meta = metadataMap[item] || metadataMap[remainder];
          const origName = meta?.originalFilename;
          const { typeName, category } = getFileType(origName || remainder, false);

          list.push({
            fullKey: item,
            relativeName: remainder,
            originalFilename: origName,
            isDir: false,
            category,
            typeName,
            size: meta?.fileSize,
            createdAt: meta?.createdAt,
          });
        }
      } else if (slashIdx === remainder.length - 1) {
        // Direct subfolder
        const folderName = remainder;
        if (!seen.has(folderName)) {
          seen.add(folderName);
          list.push({
            fullKey: item,
            relativeName: folderName,
            isDir: true,
            category: 'folder',
            typeName: 'Server Directory',
          });
        }
      } else {
        // Sub-sub item: collapse into direct parent subfolder
        const directFolder = remainder.substring(0, slashIdx + 1);
        if (!seen.has(directFolder)) {
          seen.add(directFolder);
          list.push({
            fullKey: `${serverPath}${directFolder}`,
            relativeName: directFolder,
            isDir: true,
            category: 'folder',
            typeName: 'Server Directory',
          });
        }
      }
    }

    // Filter by search (matching BOTH originalFilename and relativeName/key)
    const filtered = serverSearch
      ? list.filter((i) => {
          const q = serverSearch.toLowerCase();
          const orig = i.originalFilename?.toLowerCase() || '';
          const rel = i.relativeName.toLowerCase();
          return orig.includes(q) || rel.includes(q);
        })
      : list;

    // Sort: Folders first, then by name
    return filtered.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      const nameA = a.originalFilename || a.relativeName;
      const nameB = b.originalFilename || b.relativeName;
      const cmp = nameA.localeCompare(nameB);
      return serverSortAsc ? cmp : -cmp;
    });
  }, [allServerKeys, serverPath, serverSearch, serverSortAsc, metadataMap]);

  // Navigate into server folder (strictly within products/ only)
  const handleEnterServerFolder = (folderKey: string) => {
    if (!folderKey.startsWith('products/')) return;
    setServerPath(folderKey);
    setSelectedServerKeys(new Set());
  };

  // Navigate up on server, never allow going above products/
  const handleServerNavigateUp = () => {
    if (!serverPath || serverPath === 'products/' || !serverPath.startsWith('products/')) {
      setServerPath('products/');
      return;
    }
    const clean = serverPath.replace(/\/$/, '');
    const parts = clean.split('/');
    parts.pop();
    const next = parts.join('/') + '/';
    if (next.startsWith('products/')) {
      setServerPath(next);
    } else {
      setServerPath('products/');
    }
    setSelectedServerKeys(new Set());
  };

  // ==========================================
  // Upload Selected Local Files to Server
  // ==========================================
  const handleUploadSelectedToServer = async () => {
    const itemsToUpload = localItems.filter((item) => !item.isDir && selectedLocalIds.has(item.id));
    if (itemsToUpload.length === 0) {
      toast.warning('Select one or more files in the left pane to upload');
      return;
    }

    const toastId = toast.loading(`Uploading ${itemsToUpload.length} file(s) to server...`);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < itemsToUpload.length; i++) {
      const item = itemsToUpload[i];
      setUploadingProgress({ current: i + 1, total: itemsToUpload.length, fileName: item.name });

      try {
        let fileToUpload: File | undefined = item.fileObj;
        if (!fileToUpload && item.handle && typeof item.handle.getFile === 'function') {
          fileToUpload = await item.handle.getFile();
        }

        if (!fileToUpload) {
          throw new Error('Could not access local file content');
        }

        const res = await uploadMediaFile(fileToUpload, serverProvider, serverPath);
        if (res.fileKey) {
          setMetadataMap((prev) => ({
            ...prev,
            [res.fileKey]: {
              id: res.id || 0,
              fileKey: res.fileKey,
              originalFilename: res.originalFilename || item.name,
              contentType: res.contentType || fileToUpload.type,
              fileSize: res.fileSize || fileToUpload.size,
              providerType: serverProvider,
              publicUrl: res.publicUrl || '',
            },
            [res.fileKey.split('/').pop() || '']: {
              id: res.id || 0,
              fileKey: res.fileKey,
              originalFilename: res.originalFilename || item.name,
              contentType: res.contentType || fileToUpload.type,
              fileSize: res.fileSize || fileToUpload.size,
              providerType: serverProvider,
              publicUrl: res.publicUrl || '',
            },
          }));
        }
        successCount++;
      } catch (err: any) {
        console.error(`Upload failed for ${item.name}:`, err);
        failCount++;
      }
    }

    setUploadingProgress(null);
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)!`, { id: toastId });
      fetchServerFiles();
    } else {
      toast.error(`Failed to upload ${failCount} file(s)`, { id: toastId });
    }
  };

  // ==========================================
  // Drag and Drop Handling (Left Pane -> Right Pane)
  // ==========================================
  const handleDragStartLocal = (item: LocalItem, e: React.DragEvent) => {
    if (item.isDir) return;
    const items = selectedLocalIds.has(item.id)
      ? localItems.filter((i) => selectedLocalIds.has(i.id) && !i.isDir)
      : [item];

    setDraggedLocalItems(items);
    e.dataTransfer.setData('application/json', JSON.stringify(items.map((i) => i.id)));
  };

  const handleDropOnServer = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverRightPane(false);

    // Case 1: Dragged from OS Desktop into browser
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const toastId = toast.loading(`Uploading ${files.length} file(s) from desktop...`);
      let uploaded = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadingProgress({ current: i + 1, total: files.length, fileName: file.name });
        try {
          const res = await uploadMediaFile(file, serverProvider, serverPath);
          if (res.fileKey) {
            setMetadataMap((prev) => ({
              ...prev,
              [res.fileKey]: {
                id: res.id || 0,
                fileKey: res.fileKey,
                originalFilename: res.originalFilename || file.name,
                contentType: res.contentType || file.type,
                fileSize: res.fileSize || file.size,
                providerType: serverProvider,
                publicUrl: res.publicUrl || '',
              },
            }));
          }
          uploaded++;
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
        }
      }

      setUploadingProgress(null);
      toast.success(`Uploaded ${uploaded} file(s) from desktop!`, { id: toastId });
      fetchServerFiles();
      return;
    }

    // Case 2: Dragged from Left Pane (Local PC items)
    if (draggedLocalItems.length > 0) {
      const toastId = toast.loading(`Uploading ${draggedLocalItems.length} file(s) to server...`);
      let uploaded = 0;

      for (let i = 0; i < draggedLocalItems.length; i++) {
        const item = draggedLocalItems[i];
        setUploadingProgress({ current: i + 1, total: draggedLocalItems.length, fileName: item.name });
        try {
          let fileObj = item.fileObj;
          if (!fileObj && item.handle) {
            fileObj = await item.handle.getFile();
          }
          if (fileObj) {
            const res = await uploadMediaFile(fileObj, serverProvider, serverPath);
            if (res.fileKey) {
              setMetadataMap((prev) => ({
                ...prev,
                [res.fileKey]: {
                  id: res.id || 0,
                  fileKey: res.fileKey,
                  originalFilename: res.originalFilename || item.name,
                  contentType: res.contentType || fileObj.type,
                  fileSize: res.fileSize || fileObj.size,
                  providerType: serverProvider,
                  publicUrl: res.publicUrl || '',
                },
              }));
            }
            uploaded++;
          }
        } catch (err) {
          console.error(`Drop upload failed for ${item.name}:`, err);
        }
      }

      setUploadingProgress(null);
      setDraggedLocalItems([]);
      toast.success(`Uploaded ${uploaded} file(s) to server!`, { id: toastId });
      fetchServerFiles();
    }
  };

  // ==========================================
  // ⚡ Sync Product Images Action
  // ==========================================
  const handleSyncProductImages = async () => {
    if (
      !confirm(
        'This will:\n1. Delete older duplicate files with the same name from storage to free up disk space.\n2. Automatically group images by product code (e.g. CPL-ACS-SCC-0009.jpg, B.jpg, C.jpg).\n3. Update images in the catalog database for each matching product.\n\nProceed with Sync?'
      )
    ) {
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading('⚡ Syncing product images & cleaning duplicates in catalog...');

    try {
      const result = await syncProductImagesAndCatalog();
      toast.success(
        `⚡ Sync Complete! Updated ${result.updatedCatalogCount} products in catalog. Deleted ${result.deletedOldFilesCount} duplicates.`,
        { id: toastId, duration: 6000 }
      );
      await fetchServerFiles();
    } catch (err: any) {
      console.error('Sync failed:', err);
      toast.error(`Sync failed: ${err.message || 'Server error'}`, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // ==========================================
  // Delete Server File
  // ==========================================
  const handleDeleteServerFile = async (fileKey: string) => {
    if (fileKey.endsWith('/')) {
      toast.error('Directory deletion is prohibited for security');
      return;
    }
    if (!confirm(`Are you sure you want to delete file "${fileKey}"?`)) return;

    const toastId = toast.loading(`Deleting ${fileKey}...`);
    try {
      await deleteMediaFile(fileKey);
      toast.success('File deleted successfully', { id: toastId });
      setAllServerKeys((prev) => prev.filter((k) => k !== fileKey));
      setSelectedServerKeys((prev) => {
        const next = new Set(prev);
        next.delete(fileKey);
        return next;
      });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(`Delete failed: ${err.message || 'Server error'}`, { id: toastId });
    }
  };

  // Batch delete selected server files
  const handleBatchDeleteServer = async () => {
    const filesToDelete = Array.from(selectedServerKeys).filter((k) => !k.endsWith('/'));
    if (filesToDelete.length === 0) return;
    if (!confirm(`Delete ${filesToDelete.length} selected file(s)?`)) return;

    const toastId = toast.loading(`Deleting ${filesToDelete.length} files...`);
    let deleted = 0;
    for (const key of filesToDelete) {
      try {
        await deleteMediaFile(key);
        deleted++;
      } catch (err) {
        console.error(`Failed to delete ${key}:`, err);
      }
    }
    toast.success(`Deleted ${deleted} files`, { id: toastId });
    fetchServerFiles();
    setSelectedServerKeys(new Set());
  };

  // Batch Download ZIP
  const handleBatchDownload = () => {
    const keys = Array.from(selectedServerKeys).filter((k) => !k.endsWith('/'));
    if (keys.length === 0) {
      toast.warning('Select one or more server files to download as ZIP');
      return;
    }
    const zipUrl = getBatchDownloadZipUrl(keys);
    window.open(zipUrl, '_blank');
  };

  // Export Excel Report
  const handleExportExcel = () => {
    const url = getMediaExportExcelUrl(serverProvider, serverPath);
    window.open(url, '_blank');
  };

  // Copy Key / URL to Clipboard
  const handleCopyKey = (key: string, originalName?: string) => {
    const publicUrl = getMediaViewUrl(key);
    navigator.clipboard.writeText(publicUrl);
    setCopiedKey(key);
    toast.success(`Copied Public URL for ${originalName || key}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Preview Modal
  const handlePreviewFile = (fileKey: string, name: string, originalName?: string) => {
    const viewUrl = getMediaViewUrl(fileKey);
    const effectiveName = originalName || name;
    const ext = effectiveName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);

    setPreviewItem({
      fileKey,
      publicUrl: viewUrl,
      isImage,
      name,
      originalName,
    });
  };

  // ==========================================
  // Local Stats Calculation (Matching Screenshot)
  // ==========================================
  const filteredLocalItems = useMemo(() => {
    let items = localSearch
      ? localItems.filter((i) => i.name.toLowerCase().includes(localSearch.toLowerCase()))
      : localItems;

    return items.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      let cmp = 0;
      if (localSortCol === 'name') cmp = a.name.localeCompare(b.name);
      else if (localSortCol === 'size') cmp = a.size - b.size;
      else if (localSortCol === 'type') cmp = a.type.localeCompare(b.type);
      else if (localSortCol === 'lastModified') cmp = a.lastModified - b.lastModified;
      return localSortAsc ? cmp : -cmp;
    });
  }, [localItems, localSearch, localSortCol, localSortAsc]);

  const localTotalBytes = useMemo(
    () => localItems.reduce((acc, curr) => acc + (curr.isDir ? 0 : curr.size), 0),
    [localItems]
  );
  const localSelectedBytes = useMemo(
    () =>
      localItems
        .filter((i) => selectedLocalIds.has(i.id))
        .reduce((acc, curr) => acc + (curr.isDir ? 0 : curr.size), 0),
    [localItems, selectedLocalIds]
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-130px)] min-h-[500px] bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl font-sans text-xs select-none">
      {/* Hidden File Inputs for Local Picker fallback */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFallbackFolderSelect}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFallbackFolderSelect}
        multiple
        className="hidden"
      />

      {/* Action Toolbar */}
      <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
        {/* Left Toolbar Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleOpenLocalFolder}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Open a Windows folder directly using browser directory picker"
          >
            <FolderOpen size={13} />
            <span>Open Windows Folder</span>
          </button>

          <button
            onClick={handleUploadSelectedToServer}
            disabled={selectedLocalIds.size === 0}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            title="Upload marked files from left pane to active server directory (F5 Copy)"
          >
            <ArrowRight size={13} />
            <span>Upload to Server {selectedLocalIds.size > 0 ? `(${selectedLocalIds.size})` : ''}</span>
          </button>

          <button
            onClick={fetchServerFiles}
            disabled={serverLoading}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium flex items-center gap-1 transition-all cursor-pointer"
            title="Refresh server directory stream"
          >
            <RefreshCw size={12} className={serverLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {selectedServerKeys.size > 1 && (
            <button
              onClick={handleBatchDownload}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded font-medium flex items-center gap-1 transition-all cursor-pointer"
              title="Download selected server files as ZIP archive"
            >
              <Download size={12} />
              <span>Batch ZIP ({selectedServerKeys.size})</span>
            </button>
          )}

          {selectedServerKeys.size > 0 && (
            <button
              onClick={handleBatchDeleteServer}
              className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded font-medium flex items-center gap-1 transition-all cursor-pointer"
              title="Delete selected server files (F8 Delete)"
            >
              <Trash2 size={12} />
              <span>Delete ({selectedServerKeys.size})</span>
            </button>
          )}
        </div>

        {/* Right Toolbar Actions: Sync Product Images & Export Excel (Replaced Server Provider dropdown) */}
        <div className="flex items-center gap-2">
          {/* ⚡ Sync Product Images Button */}
          <button
            onClick={handleSyncProductImages}
            disabled={isSyncing}
            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Sync product images to catalog and delete older duplicate files from storage"
          >
            <Zap size={13} className={isSyncing ? 'animate-spin' : 'fill-slate-950'} />
            <span>{isSyncing ? 'Syncing...' : '⚡ Sync Product Images'}</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded font-medium flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            title="Download Excel audit spreadsheet of hosted media"
          >
            <FileSpreadsheet size={13} />
            <span>Export Excel</span>
          </button>

          {/* Commented out Server Storage Provider Switcher
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Server Provider:</span>
            <select
              value={serverProvider}
              onChange={(e) => setServerProvider(e.target.value as StorageProviderType)}
              className="bg-slate-800 border border-slate-700 text-sky-400 px-2.5 py-1 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="LOCAL">Local Server (/opt/lakee)</option>
              <option value="S3">AWS S3 Bucket</option>
              <option value="NGINX">Remote Server (NGINX)</option>
            </select>
          </div>
          */}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DUAL-PANE FILE COMMANDER WORKSPACE */}
      {/* ======================================================== */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-0 overflow-hidden">
        {/* ====================================================== */}
        {/* LEFT PANE: LOCAL WINDOWS PC */}
        {/* ====================================================== */}
        <div className="flex flex-col min-h-0 bg-slate-950">
          {/* Path Header */}
          <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <HardDrive size={13} className="text-sky-400 shrink-0" />
              <input
                type="text"
                readOnly
                value={localPath}
                className="bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-slate-200 w-full truncate focus:outline-none"
                title={localPath}
              />
            </div>

            {/* Local Search Input */}
            <div className="relative w-36 shrink-0">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter local…"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 pl-6 pr-2 py-0.5 rounded text-[10px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[30px_1fr_90px_130px_130px] bg-slate-900 border-b border-slate-800 text-[10px] font-semibold text-slate-400 px-2 py-1.5">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={
                  filteredLocalItems.length > 0 &&
                  filteredLocalItems.filter((i) => !i.isDir).every((i) => selectedLocalIds.has(i.id))
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLocalIds(new Set(filteredLocalItems.filter((i) => !i.isDir).map((i) => i.id)));
                  } else {
                    setSelectedLocalIds(new Set());
                  }
                }}
                className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <div
              className="cursor-pointer hover:text-white flex items-center gap-1"
              onClick={() => {
                setLocalSortCol('name');
                setLocalSortAsc(!localSortAsc);
              }}
            >
              <span>Name</span>
              {localSortCol === 'name' && <span>{localSortAsc ? '▲' : '▼'}</span>}
            </div>
            <div
              className="text-right cursor-pointer hover:text-white pr-2"
              onClick={() => {
                setLocalSortCol('size');
                setLocalSortAsc(!localSortAsc);
              }}
            >
              Size {localSortCol === 'size' && (localSortAsc ? '▲' : '▼')}
            </div>
            <div
              className="cursor-pointer hover:text-white truncate"
              onClick={() => {
                setLocalSortCol('type');
                setLocalSortAsc(!localSortAsc);
              }}
            >
              Type {localSortCol === 'type' && (localSortAsc ? '▲' : '▼')}
            </div>
            <div
              className="cursor-pointer hover:text-white"
              onClick={() => {
                setLocalSortCol('lastModified');
                setLocalSortAsc(!localSortAsc);
              }}
            >
              Changed {localSortCol === 'lastModified' && (localSortAsc ? '▲' : '▼')}
            </div>
          </div>

          {/* Local Files Table Body */}
          <div className="flex-1 overflow-y-auto font-mono text-[11px] divide-y divide-slate-900/60">
            {/* Parent Directory Navigation Row */}
            {localHistory.length > 1 && (
              <div
                onClick={handleLocalNavigateUp}
                className="grid grid-cols-[30px_1fr_90px_130px_130px] px-2 py-1 hover:bg-slate-850 bg-slate-900/40 text-sky-400 font-bold cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">📁</div>
                <div>.. [Parent directory]</div>
                <div className="text-right pr-2 text-slate-500">&lt;DIR&gt;</div>
                <div className="text-slate-500">Parent</div>
                <div className="text-slate-500">-</div>
              </div>
            )}

            {filteredLocalItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No local files found in directory</p>
                <button
                  onClick={handleOpenLocalFolder}
                  className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-xs transition-colors"
                >
                  Open Windows Folder
                </button>
              </div>
            ) : (
              filteredLocalItems.map((item) => {
                const isSelected = selectedLocalIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    draggable={!item.isDir}
                    onDragStart={(e) => handleDragStartLocal(item, e)}
                    onClick={() => {
                      if (item.isDir) {
                        handleEnterLocalFolder(item);
                      } else {
                        setSelectedLocalIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }
                    }}
                    className={`grid grid-cols-[30px_1fr_90px_130px_130px] items-center px-2 py-1 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-950/70 text-sky-200 border-l-2 border-sky-500'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      {!item.isDir ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedLocalIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            });
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                      ) : (
                        <span className="text-slate-600 text-[10px]">📁</span>
                      )}
                    </div>

                    {/* File / Folder Name */}
                    <div className="flex items-center gap-2 truncate pr-2">
                      {renderFileIcon(item.category, item.isDir, item.name)}
                      <span className={`truncate ${item.isDir ? 'font-semibold text-sky-400' : 'text-slate-200'}`}>
                        {item.name}
                      </span>
                    </div>

                    {/* Size */}
                    <div className="text-right pr-2 text-slate-400">
                      {item.isDir ? '<DIR>' : formatBytes(item.size)}
                    </div>

                    {/* Type */}
                    <div className="truncate text-slate-400 text-[10px]">{item.type}</div>

                    {/* Date Modified */}
                    <div className="text-slate-500 text-[10px]">{formatDate(item.lastModified)}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Local Status Bar */}
          <div className="bg-slate-900 px-3 py-1.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <div>
              <span className="text-sky-400 font-semibold">{formatBytes(localSelectedBytes)}</span> of{' '}
              <span className="text-slate-300">{formatBytes(localTotalBytes)}</span> in{' '}
              <span className="text-sky-400 font-semibold">{selectedLocalIds.size}</span> of{' '}
              <span className="text-slate-300">{localItems.length}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {filteredLocalItems.length !== localItems.length ? `(${filteredLocalItems.length} filtered)` : ''}
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* RIGHT PANE: SERVER STORAGE (lmedia with Original File Name) */}
        {/* ====================================================== */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsOverRightPane(true);
          }}
          onDragLeave={() => setIsOverRightPane(false)}
          onDrop={handleDropOnServer}
          className={`flex flex-col min-h-0 bg-slate-950 transition-all ${
            isOverRightPane ? 'ring-2 ring-emerald-500 bg-emerald-950/20' : ''
          }`}
        >
          {/* Path Header */}
          <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Cloud size={13} className="text-emerald-400 shrink-0" />
              <input
                type="text"
                readOnly
                value={`/opt/lakee/${serverPath}`}
                className="bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-400 w-full truncate focus:outline-none"
                title={`/opt/lakee/${serverPath}`}
              />
            </div>

            {/* Server Search Input */}
            <div className="relative w-44 shrink-0">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by Name or SKU…"
                value={serverSearch}
                onChange={(e) => setServerSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 pl-6 pr-2 py-0.5 rounded text-[10px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[30px_1fr_80px_110px_90px] bg-slate-900 border-b border-slate-800 text-[10px] font-semibold text-slate-400 px-2 py-1.5">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={
                  serverDisplayItems.length > 0 &&
                  serverDisplayItems.filter((i) => !i.isDir).every((i) => selectedServerKeys.has(i.fullKey))
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedServerKeys(
                      new Set(serverDisplayItems.filter((i) => !i.isDir).map((i) => i.fullKey))
                    );
                  } else {
                    setSelectedServerKeys(new Set());
                  }
                }}
                className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <div
              className="cursor-pointer hover:text-white flex items-center gap-1"
              onClick={() => {
                setServerSortCol('name');
                setServerSortAsc(!serverSortAsc);
              }}
            >
              <span>Original Name / Server Key</span>
              {serverSortCol === 'name' && <span>{serverSortAsc ? '▲' : '▼'}</span>}
            </div>
            <div className="text-right pr-2">Size</div>
            <div className="truncate">Type</div>
            <div className="text-center">Actions</div>
          </div>

          {/* Server Files Table Body */}
          <div className="flex-1 overflow-y-auto font-mono text-[11px] divide-y divide-slate-900/60 relative">
            {/* Drag & Drop Visual Overlay */}
            {isOverRightPane && (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 pointer-events-none border-2 border-dashed border-emerald-400 text-emerald-300">
                <Upload size={36} className="animate-bounce mb-2" />
                <p className="font-bold text-sm">Drop files here to upload</p>
                <p className="text-[11px] text-emerald-400/80">Target: /opt/lakee/{serverPath}</p>
              </div>
            )}

            {/* Parent Directory Navigation Row - completely hidden at root /opt/lakee/products/ */}
            {serverPath !== 'products/' && serverPath.startsWith('products/') && (
              <div
                onClick={handleServerNavigateUp}
                className="grid grid-cols-[30px_1fr_80px_110px_90px] px-2 py-1 hover:bg-slate-850 bg-slate-900/40 text-emerald-400 font-bold cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center">📁</div>
                <div>.. [Parent Directory]</div>
                <div className="text-right pr-2 text-slate-500">&lt;DIR&gt;</div>
                <div className="text-slate-500">Parent Directory</div>
                <div className="text-center text-slate-500">-</div>
              </div>
            )}

            {serverLoading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-400" />
                <p>Streaming server storage items & metadata…</p>
              </div>
            ) : serverDisplayItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Cloud className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                <p>No files found in server directory</p>
                <p className="text-[10px] text-slate-600 mt-1">Drag and drop files from the left pane to upload</p>
              </div>
            ) : (
              serverDisplayItems.map((item) => {
                const isSelected = selectedServerKeys.has(item.fullKey);
                return (
                  <div
                    key={item.fullKey}
                    onClick={() => {
                      if (item.isDir) {
                        handleEnterServerFolder(item.fullKey);
                      } else {
                        setSelectedServerKeys((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.fullKey)) next.delete(item.fullKey);
                          else next.add(item.fullKey);
                          return next;
                        });
                      }
                    }}
                    className={`grid grid-cols-[30px_1fr_80px_110px_90px] items-center px-2 py-1 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/70 text-emerald-200 border-l-2 border-emerald-500'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      {!item.isDir ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedServerKeys((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(item.fullKey);
                              else next.delete(item.fullKey);
                              return next;
                            });
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      ) : (
                        <span className="text-slate-600 text-[10px]">📁</span>
                      )}
                    </div>

                    {/* Original Name & Server Key */}
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {renderFileIcon(item.category, item.isDir, item.originalFilename || item.relativeName)}
                      <div className="min-w-0 flex-1 truncate">
                        {item.isDir ? (
                          <span className="font-semibold text-emerald-400 truncate block">
                            {item.relativeName}
                          </span>
                        ) : item.originalFilename ? (
                          <>
                            <div className="font-semibold text-slate-100 truncate text-[11px] leading-tight">
                              {item.originalFilename}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate leading-tight mt-0.5">
                              <span className="px-1 py-0.2 bg-slate-800 text-sky-400 rounded text-[9px] border border-slate-700 mr-1">
                                Key
                              </span>
                              {item.relativeName}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-200 truncate block font-medium">
                            {item.relativeName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Size */}
                    <div className="text-right pr-2 text-slate-400">
                      {item.isDir ? '<DIR>' : item.size ? formatBytes(item.size) : '-'}
                    </div>

                    {/* Type */}
                    <div className="truncate text-slate-400 text-[10px]">{item.typeName}</div>

                    {/* Actions */}
                    <div
                      className="flex items-center justify-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.isDir ? (
                        <button
                          onClick={() => handleEnterServerFolder(item.fullKey)}
                          title="Open Directory"
                          className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded cursor-pointer"
                        >
                          📂
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handlePreviewFile(item.fullKey, item.relativeName, item.originalFilename)}
                            title="Preview / Lightbox"
                            className="text-sky-400 hover:text-sky-300 p-0.5 rounded cursor-pointer transition-colors"
                          >
                            👁️
                          </button>
                          <a
                            href={getMediaDownloadUrl(item.fullKey)}
                            title="Download File Stream"
                            className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded cursor-pointer transition-colors"
                          >
                            ⬇️
                          </a>
                          <button
                            onClick={() => handleCopyKey(item.fullKey, item.originalFilename)}
                            title="Copy Public URL for Product"
                            className="text-amber-400 hover:text-amber-300 p-0.5 rounded cursor-pointer transition-colors"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleDeleteServerFile(item.fullKey)}
                            title="Delete File (Files Only)"
                            className="text-rose-400 hover:text-rose-300 p-0.5 rounded cursor-pointer transition-colors"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Server Status Bar */}
          <div className="bg-slate-900 px-3 py-1.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <div>
              <span className="text-emerald-400 font-semibold">{selectedServerKeys.size}</span> selected of{' '}
              <span className="text-slate-300">{serverDisplayItems.length} items</span> in{' '}
              <span className="text-emerald-400">/opt/lakee/{serverPath}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Provider: <span className="text-slate-300 font-semibold">{serverProvider}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. PREVIEW LIGHTBOX MODAL */}
      {/* ======================================================== */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-850 border-b border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-sky-400" />
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-slate-100 truncate block">
                    {previewItem.originalName || previewItem.name}
                  </span>
                  {previewItem.originalName && (
                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                      Key: {previewItem.fileKey}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-950 min-h-[300px] max-h-[60vh] overflow-auto">
              {previewItem.isImage ? (
                <img
                  src={previewItem.publicUrl}
                  alt={previewItem.originalName || previewItem.name}
                  className="max-h-[50vh] max-w-full object-contain rounded-lg border border-slate-800 shadow-md"
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-300 font-medium">{previewItem.originalName || previewItem.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Non-image file format</p>
                </div>
              )}
            </div>

            {/* Modal Footer & Product Copy Helper */}
            <div className="px-4 py-3 bg-slate-850 border-t border-slate-750 flex items-center justify-between gap-3 text-xs">
              <div className="flex-1 min-w-0">
                <span className="text-slate-400 block text-[10px] mb-0.5">Public URL / Key:</span>
                <input
                  type="text"
                  readOnly
                  value={previewItem.publicUrl}
                  className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-[10px] select-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-3">
                <button
                  onClick={() => handleCopyKey(previewItem.fileKey, previewItem.originalName)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Copy size={13} />
                  <span>Copy URL for Product</span>
                </button>
                <a
                  href={previewItem.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink size={13} />
                  <span>Open in Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
