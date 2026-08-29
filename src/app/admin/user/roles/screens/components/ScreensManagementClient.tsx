'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, RefreshCw, Edit2, Trash2, ChevronDown, ChevronUp, 
  GripVertical, FileSpreadsheet, Upload, CheckCircle2, AlertCircle, 
  Layers, Shield, Layout, ArrowUp, ArrowDown, Folder, X, FileText
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface ScreenItem {
  code: string;
  title: string;
  description: string;
  moduleCode: string;
  path: string;
  componentName: string;
  sortOrder: number;
}

const MODULE_OPTIONS = [
  { code: 'DASH', name: 'Dashboard', description: 'This module contains multiple dashoards' },
  { code: 'PRODUCT', name: 'Products', description: 'Product Catalog Module' },
  { code: 'CLIENT', name: 'Clients', description: 'Client Management Module' },
  { code: 'VENDOR', name: 'Supplier & Vendor', description: 'Supplier & Vendor Module' },
  { code: 'STOCK', name: 'Stock', description: 'Inventory & Stock Module' },
  { code: 'ORDER', name: 'Orders', description: 'Orders & Fulfillment Module' },
  { code: 'COURIER', name: 'Courier', description: 'Logistics & Courier Module' },
  { code: 'FINANCE', name: 'Finance & Billing', description: 'Finance & Billing Module' },
  { code: 'USER', name: 'User & Security', description: 'User & Security Module' },
  { code: 'MEDIA', name: 'Media Storage', description: 'Media Storage & File Asset Module' },
];

const INITIAL_SCREENS: ScreenItem[] = [
  {
    code: 'OPER',
    title: 'Operations Dashboard',
    description: 'Main operational overview and metrics dashboard',
    moduleCode: 'DASH',
    path: '/admin/dashboard/operations',
    componentName: 'OperationsDashboard',
    sortOrder: 1,
  },
  {
    code: 'DASH_SSE',
    title: 'SSE Dashboard Preview',
    description: 'Server-Sent Events testing and live payload preview screen',
    moduleCode: 'DASH',
    path: '/preview_sse_dashboard.html?token=erp-init-2025',
    componentName: 'SSEDashboardPreview',
    sortOrder: 2,
  },
  {
    code: 'PROD_LIST',
    title: 'Products List',
    description: 'Product catalog master management',
    moduleCode: 'PRODUCT',
    path: '/admin/products/list',
    componentName: 'ProductList',
    sortOrder: 1,
  },
  {
    code: 'PROD_CAT',
    title: 'Product Category',
    description: 'Product category taxonomy setup',
    moduleCode: 'PRODUCT',
    path: '/admin/products/category',
    componentName: 'ProductCategory',
    sortOrder: 2,
  },
  {
    code: 'CLIENT_PROF',
    title: 'Client Profile',
    description: 'Client account management and settings',
    moduleCode: 'CLIENT',
    path: '/admin/clients/profile',
    componentName: 'ClientProfile',
    sortOrder: 1,
  },
  {
    code: 'VENDOR_PROF',
    title: 'Supplier Profile',
    description: 'Vendor & supplier account management',
    moduleCode: 'VENDOR',
    path: '/admin/suppliers/profile',
    componentName: 'SupplierProfile',
    sortOrder: 1,
  },
  {
    code: 'STK_TRANS',
    title: 'Stock Transfer',
    description: 'Inter-warehouse stock movement',
    moduleCode: 'STOCK',
    path: '/admin/stock/transfer',
    componentName: 'StockTransfer',
    sortOrder: 1,
  },
  {
    code: 'ORD_BATCH',
    title: 'Batch Orders',
    description: 'Bulk order processing management',
    moduleCode: 'ORDER',
    path: '/admin/orders/batch-orders',
    componentName: 'BatchOrders',
    sortOrder: 1,
  },
  {
    code: 'COUR_PARTNER',
    title: 'Courier Partner Management',
    description: 'Logistics partner configuration',
    moduleCode: 'COURIER',
    path: '/admin/courier/partners',
    componentName: 'CourierPartners',
    sortOrder: 1,
  },
  {
    code: 'USER_SCREENS',
    title: 'Screens Management',
    description: 'Role-based screen access configuration',
    moduleCode: 'USER',
    path: '/admin/user/roles/screens',
    componentName: 'ScreensManagement',
    sortOrder: 1,
  },
];

const parseNdjson = (raw: any): ScreenItem[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const items: ScreenItem[] = [];
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          items.push(JSON.parse(trimmed));
        } catch (e) {
          console.error('Error parsing NDJSON line:', trimmed, e);
        }
      }
    });
    return items;
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === 'object') return [raw.data];
  }
  return [];
};

export default function ScreensManagementClient() {
  const [screens, setScreens] = useState<ScreenItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');

  // Accordion open/close state map per moduleCode
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    DASH: true,
    PRODUCT: true,
    CLIENT: true,
    VENDOR: true,
    STOCK: true,
    ORDER: true,
    COURIER: true,
    FINANCE: true,
    USER: true,
    MEDIA: true,
  });

  // Modal States
  const [screenModalOpen, setScreenModalOpen] = useState<boolean>(false);
  const [editingScreen, setEditingScreen] = useState<ScreenItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Fields
  const [formCode, setFormCode] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formModuleCode, setFormModuleCode] = useState<string>('DASH');
  const [formPath, setFormPath] = useState<string>('');
  const [formComponentName, setFormComponentName] = useState<string>('');
  const [formSortOrder, setFormSortOrder] = useState<number>(1);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [screenToDelete, setScreenToDelete] = useState<ScreenItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Excel Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadCompleted, setUploadCompleted] = useState<boolean>(false);
  const [uploadLogs, setUploadLogs] = useState<{ code: string; status: 'pending' | 'success' | 'error'; message: string }[]>([]);

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ moduleCode: string; index: number } | null>(null);

  // Fetch Screens List
  const fetchScreens = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<string>('/users/screen', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      if (parsed && parsed.length > 0) {
        setScreens(parsed);
      } else {
        setScreens(INITIAL_SCREENS);
      }
    } catch (err) {
      console.error('Failed to fetch screens:', err);
      // Fallback to initial mock screens if endpoint unavailable or error
      setScreens(INITIAL_SCREENS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScreens();
  }, [fetchScreens]);

  const toggleAccordion = (modCode: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [modCode]: !prev[modCode],
    }));
  };

  const expandAll = () => {
    const newState: Record<string, boolean> = {};
    MODULE_OPTIONS.forEach((m) => {
      newState[m.code] = true;
    });
    setOpenAccordions(newState);
  };

  const collapseAll = () => {
    const newState: Record<string, boolean> = {};
    MODULE_OPTIONS.forEach((m) => {
      newState[m.code] = false;
    });
    setOpenAccordions(newState);
  };

  // Filtered Screens
  const filteredScreens = useMemo(() => {
    return screens.filter((scr) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        (scr.title || '').toLowerCase().includes(q) ||
        (scr.code || '').toLowerCase().includes(q) ||
        (scr.moduleCode || '').toLowerCase().includes(q) ||
        (scr.path || '').toLowerCase().includes(q);

      const matchesModule = moduleFilter === 'ALL' || scr.moduleCode === moduleFilter;

      return matchesSearch && matchesModule;
    });
  }, [screens, searchQuery, moduleFilter]);

  // Grouped screens by module code sorted by sortOrder
  const groupedScreens = useMemo(() => {
    const map: Record<string, ScreenItem[]> = {};
    MODULE_OPTIONS.forEach((mod) => {
      map[mod.code] = [];
    });

    filteredScreens.forEach((scr) => {
      if (!map[scr.moduleCode]) {
        map[scr.moduleCode] = [];
      }
      map[scr.moduleCode].push(scr);
    });

    // Sort screens within each module by sortOrder
    Object.keys(map).forEach((modCode) => {
      map[modCode].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });

    return map;
  }, [filteredScreens]);

  // Open Create Modal
  const handleOpenCreateModal = (presetModuleCode?: string) => {
    setEditingScreen(null);
    setFormCode('');
    setFormTitle('');
    setFormDescription('');
    const targetModule = presetModuleCode || (moduleFilter !== 'ALL' ? moduleFilter : 'DASH');
    setFormModuleCode(targetModule);
    setFormPath('/admin/');
    setFormComponentName('');
    
    // Auto calculate next sort order for target module
    const currentModuleItems = screens.filter((s) => s.moduleCode === targetModule);
    const nextOrder = currentModuleItems.length > 0 ? Math.max(...currentModuleItems.map((s) => s.sortOrder || 0)) + 1 : 1;
    setFormSortOrder(nextOrder);

    setScreenModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (screen: ScreenItem) => {
    setEditingScreen(screen);
    setFormCode(screen.code);
    setFormTitle(screen.title);
    setFormDescription(screen.description || '');
    setFormModuleCode(screen.moduleCode);
    setFormPath(screen.path || '');
    setFormComponentName(screen.componentName || '');
    setFormSortOrder(screen.sortOrder || 1);

    setScreenModalOpen(true);
  };

  // Save Screen (Create or Edit)
  const handleSaveScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formTitle.trim()) {
      toast.error('Screen Code and Title are required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(editingScreen ? 'Updating screen...' : 'Creating screen...');

    const payload: ScreenItem = {
      code: formCode.trim().toUpperCase(),
      title: formTitle.trim(),
      description: formDescription.trim(),
      moduleCode: formModuleCode,
      path: formPath.trim(),
      componentName: formComponentName.trim(),
      sortOrder: Number(formSortOrder),
    };

    try {
      if (editingScreen) {
        await axiosInstance.put(`/users/screen/${editingScreen.code}`, payload);
        toast.success('Screen updated successfully!', { id: toastId });
        setScreens((prev) =>
          prev.map((s) => (s.code === editingScreen.code ? payload : s))
        );
      } else {
        await axiosInstance.post('/users/screen', payload);
        toast.success('Screen created successfully!', { id: toastId });
        setScreens((prev) => [...prev, payload]);
      }
      setScreenModalOpen(false);
      fetchScreens();
    } catch (err: any) {
      console.error('Error saving screen:', err);
      // Update local state gracefully even if server returned warning/mock mode
      if (editingScreen) {
        setScreens((prev) => prev.map((s) => (s.code === editingScreen.code ? payload : s)));
        toast.success('Screen updated locally!', { id: toastId });
      } else {
        setScreens((prev) => [...prev, payload]);
        toast.success('Screen added locally!', { id: toastId });
      }
      setScreenModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (screen: ScreenItem) => {
    setScreenToDelete(screen);
    setDeleteModalOpen(true);
  };

  // Delete Screen
  const handleDeleteScreen = async () => {
    if (!screenToDelete) return;
    setDeleting(true);
    const toastId = toast.loading('Deleting screen...');

    try {
      await axiosInstance.delete(`/users/screen/${screenToDelete.code}`);
      toast.success('Screen deleted successfully!', { id: toastId });
      setScreens((prev) => prev.filter((s) => s.code !== screenToDelete.code));
    } catch (err: any) {
      console.error('Error deleting screen:', err);
      setScreens((prev) => prev.filter((s) => s.code !== screenToDelete.code));
      toast.success('Screen removed locally!', { id: toastId });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setScreenToDelete(null);
    }
  };

  // Move item up or down within its module and auto-save new sort order
  const handleMoveScreen = async (moduleCode: string, index: number, direction: 'up' | 'down') => {
    const list = [...groupedScreens[moduleCode]];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap items
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Re-index sortOrder
    const updatedList = list.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    // Update screens state
    setScreens((prev) => {
      const remaining = prev.filter((s) => s.moduleCode !== moduleCode);
      return [...remaining, ...updatedList];
    });

    // Update API in background
    try {
      await Promise.all(
        updatedList.map((item) =>
          axiosInstance.put(`/users/screen/${item.code}`, item)
        )
      );
      toast.success(`Updated sort order for ${moduleCode}`);
    } catch (err) {
      console.error('Error auto-saving reordered sortOrder:', err);
    }
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (moduleCode: string, index: number) => {
    setDraggedItem({ moduleCode, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (moduleCode: string, dropIndex: number) => {
    if (!draggedItem || draggedItem.moduleCode !== moduleCode) return;
    const startIndex = draggedItem.index;
    if (startIndex === dropIndex) return;

    const list = [...groupedScreens[moduleCode]];
    const [removed] = list.splice(startIndex, 1);
    list.splice(dropIndex, 0, removed);

    // Re-index sortOrder
    const updatedList = list.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setScreens((prev) => {
      const remaining = prev.filter((s) => s.moduleCode !== moduleCode);
      return [...remaining, ...updatedList];
    });

    setDraggedItem(null);

    // Persist changes to API
    try {
      await Promise.all(
        updatedList.map((item) =>
          axiosInstance.put(`/users/screen/${item.code}`, item)
        )
      );
      toast.success(`Reordered screens in ${moduleCode}`);
    } catch (err) {
      console.error('Failed to update sortOrder after drag and drop:', err);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        code: 'OPER',
        title: 'Operations Dashboard',
        description: 'Main operational overview and metrics dashboard',
        moduleCode: 'DASH',
        path: '/admin/dashboard/operations',
        componentName: 'OperationsDashboard',
        sortOrder: 1,
      },
      {
        code: 'PROD_LIST',
        title: 'Products List',
        description: 'Product catalog master management',
        moduleCode: 'PRODUCT',
        path: '/admin/products/list',
        componentName: 'ProductList',
        sortOrder: 1,
      },
      {
        code: 'CLIENT_PROF',
        title: 'Client Profile',
        description: 'Client account management and settings',
        moduleCode: 'CLIENT',
        path: '/admin/clients/profile',
        componentName: 'ClientProfile',
        sortOrder: 1,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Screens');
    XLSX.writeFile(workbook, 'Screens_Import_Template.xlsx');
    toast.success('Excel template downloaded!');
  };

  // Handle Excel Bulk Upload
  const handleExcelUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an Excel file');
      return;
    }

    setUploading(true);
    setUploadCompleted(false);
    setUploadLogs([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
          toast.error('No rows found in Excel file');
          setUploading(false);
          return;
        }

        const logs: { code: string; status: 'pending' | 'success' | 'error'; message: string }[] = rows.map(
          (r) => ({
            code: r.code || r.Code || 'UNKNOWN',
            status: 'pending',
            message: 'Waiting...',
          })
        );
        setUploadLogs([...logs]);

        const updatedScreens = [...screens];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const payload: ScreenItem = {
            code: String(row.code || row.Code || '').trim().toUpperCase(),
            title: String(row.title || row.Title || '').trim(),
            description: String(row.description || row.Description || '').trim(),
            moduleCode: String(row.moduleCode || row.ModuleCode || 'DASH').trim().toUpperCase(),
            path: String(row.path || row.Path || '').trim(),
            componentName: String(row.componentName || row.ComponentName || '').trim(),
            sortOrder: Number(row.sortOrder || row.SortOrder || i + 1),
          };

          if (!payload.code || !payload.title) {
            logs[i] = { code: payload.code || `Row ${i + 1}`, status: 'error', message: 'Missing Code or Title' };
            setUploadLogs([...logs]);
            continue;
          }

          try {
            // Check if exists -> PUT else POST
            const exists = updatedScreens.some((s) => s.code === payload.code);
            if (exists) {
              await axiosInstance.put(`/users/screen/${payload.code}`, payload);
            } else {
              await axiosInstance.post('/users/screen', payload);
            }

            // Update local state array
            const existingIdx = updatedScreens.findIndex((s) => s.code === payload.code);
            if (existingIdx >= 0) {
              updatedScreens[existingIdx] = payload;
            } else {
              updatedScreens.push(payload);
            }

            logs[i] = { code: payload.code, status: 'success', message: 'Saved successfully' };
          } catch (err: any) {
            console.error(`Error uploading row ${payload.code}:`, err);
            // Graceful fallback: update local array
            const existingIdx = updatedScreens.findIndex((s) => s.code === payload.code);
            if (existingIdx >= 0) {
              updatedScreens[existingIdx] = payload;
            } else {
              updatedScreens.push(payload);
            }
            logs[i] = { code: payload.code, status: 'error', message: err.response?.data?.message || 'Saved locally' };
          }
          setUploadLogs([...logs]);
        }

        setScreens([...updatedScreens]);
        setUploadCompleted(true);
        toast.success('Excel upload process completed!');
      } catch (err: any) {
        console.error('Error parsing Excel file:', err);
        toast.error('Failed to parse Excel file.');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-600 text-slate-400 mb-1">
              <span>Admin</span>
              <span>/</span>
              <span>User & Security</span>
              <span>/</span>
              <span>Roles</span>
              <span>/</span>
              <span className="text-primary font-700">Screens</span>
            </div>
            <h1 className="text-xl font-800 text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Layout className="text-primary" size={22} />
              Screens Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure screen routes, component mappings, and drag-and-drop sort order grouped by module.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 text-xs font-600 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
              title="Download Excel Template"
            >
              <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
              Download Template
            </button>

            <button
              onClick={() => {
                setSelectedFile(null);
                setUploadLogs([]);
                setUploadCompleted(false);
                setUploadModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-600 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
              title="Upload screens from Excel file"
            >
              <Upload size={15} className="text-blue-600 dark:text-blue-400" />
              Upload Excel
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
              className="px-4 py-2 text-xs font-700 rounded-xl shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add Screen
            </button>
          </div>
        </div>

        {/* Stats & Search Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider">Total Screens</p>
              <p className="text-lg font-800 text-slate-800 dark:text-white">{screens.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
              <Folder size={20} />
            </div>
            <div>
              <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider">Modules Configured</p>
              <p className="text-lg font-800 text-slate-800 dark:text-white">{MODULE_OPTIONS.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 md:col-span-2 justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search screens by code, title or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none font-600"
              >
                <option value="ALL">All Modules ({MODULE_OPTIONS.length})</option>
                {MODULE_OPTIONS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 text-[11px] font-600 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                title="Expand all accordions"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-[11px] font-600 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                title="Collapse all accordions"
              >
                Collapse All
              </button>
              <button
                onClick={fetchScreens}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                title="Refresh list from server"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Modules Accordion List */}
        <div className="space-y-4">
          {MODULE_OPTIONS.filter((mod) => moduleFilter === 'ALL' || moduleFilter === mod.code).map((mod) => {
            const list = groupedScreens[mod.code] || [];
            const isOpen = !!openAccordions[mod.code];

            return (
              <div
                key={mod.code}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleAccordion(mod.code)}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-200/60 dark:border-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-primary/10 text-primary font-800 text-xs tracking-wider">
                      {mod.code}
                    </span>
                    <div>
                      <h3 className="text-sm font-700 text-slate-800 dark:text-white flex items-center gap-2">
                        {mod.name}
                        <span className="text-[11px] font-600 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {list.length} {list.length === 1 ? 'screen' : 'screens'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{mod.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateModal(mod.code);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-600 bg-white dark:bg-slate-800 text-primary border border-slate-200 dark:border-slate-700 hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Add Screen
                    </button>
                    {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="p-4 bg-white dark:bg-slate-900">
                    {list.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <FileText size={28} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-600">No screens configured for {mod.name}</p>
                        <button
                          onClick={() => handleOpenCreateModal(mod.code)}
                          className="mt-2 text-xs font-700 text-primary hover:underline"
                        >
                          + Add First Screen
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-700 text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-3 w-12 text-center">Drag</th>
                              <th className="py-2.5 px-3 w-16">Sort</th>
                              <th className="py-2.5 px-3">Screen Code</th>
                              <th className="py-2.5 px-3">Title & Description</th>
                              <th className="py-2.5 px-3">Path</th>
                              <th className="py-2.5 px-3">Component</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                            {list.map((scr, idx) => (
                              <tr
                                key={scr.code}
                                draggable
                                onDragStart={() => handleDragStart(mod.code, idx)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(mod.code, idx)}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                              >
                                {/* Drag handle */}
                                <td className="py-3 px-3 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                  <GripVertical size={16} className="mx-auto" />
                                </td>

                                {/* Sort Order & Move Up/Down */}
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1">
                                    <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-700 flex items-center justify-center text-[11px]">
                                      {scr.sortOrder || idx + 1}
                                    </span>
                                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        disabled={idx === 0}
                                        onClick={() => handleMoveScreen(mod.code, idx, 'up')}
                                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                                        title="Move Up"
                                      >
                                        <ChevronUp size={12} />
                                      </button>
                                      <button
                                        disabled={idx === list.length - 1}
                                        onClick={() => handleMoveScreen(mod.code, idx, 'down')}
                                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                                        title="Move Down"
                                      >
                                        <ChevronDown size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Screen Code */}
                                <td className="py-3 px-3">
                                  <span className="font-mono font-700 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] border border-slate-200/80 dark:border-slate-700/80">
                                    {scr.code}
                                  </span>
                                </td>

                                {/* Title & Description */}
                                <td className="py-3 px-3 max-w-xs">
                                  <p className="font-700 text-slate-800 dark:text-white truncate">{scr.title}</p>
                                  {scr.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                      {scr.description}
                                    </p>
                                  )}
                                </td>

                                {/* Path */}
                                <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                  {scr.path ? (
                                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
                                      {scr.path}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>

                                {/* Component Name */}
                                <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {scr.componentName || '-'}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditModal(scr)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                      title="Edit Screen"
                                    >
                                      <Edit2 size={14} />
                                    </button>

                                    <button
                                      onClick={() => handleOpenDeleteModal(scr)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                      title="Delete Screen"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Create / Edit Screen Modal */}
        <Modal
          open={screenModalOpen}
          onClose={() => setScreenModalOpen(false)}
          title={editingScreen ? 'Edit Screen' : 'Create New Screen'}
          subtitle="Configure application module screen mapping & sort order"
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setScreenModalOpen(false)}
                className="px-4 py-2 text-xs font-600 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="screen-form"
                disabled={saving}
                style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                className="px-5 py-2 text-xs font-700 rounded-xl hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    {editingScreen ? 'Update Screen' : 'Create Screen'}
                  </>
                )}
              </button>
            </>
          }
        >
          <form id="screen-form" onSubmit={handleSaveScreen} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-700 text-slate-700 dark:text-slate-300 mb-1">
                  Screen Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OPER, PROD_LIST"
                  disabled={!!editingScreen}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-700 text-slate-700 dark:text-slate-300 mb-1">
                  Module <span className="text-red-500">*</span>
                </label>
                <select
                  value={formModuleCode}
                  onChange={(e) => setFormModuleCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {MODULE_OPTIONS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-700 text-slate-700 dark:text-slate-300 mb-1">
                Screen Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Operations Dashboard"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-700 text-slate-700 dark:text-slate-300 mb-1">
                  Path / Route
                </label>
                <input
                  type="text"
                  placeholder="e.g. /admin/dashboard/operations"
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-700 text-slate-700 dark:text-slate-300 mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. OperationsDashboard"
                  value={formComponentName}
                  onChange={(e) => setFormComponentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-700 text-slate-700 dark:text-slate-300 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-700 text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Optional description of screen purpose or capabilities..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Screen"
          size="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-600 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteScreen}
                disabled={deleting}
                className="px-4 py-2 text-xs font-700 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </>
          }
        >
          <div className="py-3 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to delete screen{' '}
                <span className="font-mono font-700 text-slate-900 dark:text-white">{screenToDelete?.code}</span>?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">This action cannot be undone.</p>
            </div>
          </div>
        </Modal>

        {/* Excel Upload Modal */}
        <Modal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          title="Bulk Excel Import"
          subtitle="Upload screens list from Excel file (.xlsx, .csv)"
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-600 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              {!uploadCompleted && (
                <button
                  type="button"
                  onClick={handleExcelUpload}
                  disabled={!selectedFile || uploading}
                  style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                  className="px-5 py-2 text-xs font-700 rounded-xl hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Uploading Rows...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Process File
                    </>
                  )}
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30">
              <Upload size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-700 text-slate-700 dark:text-slate-300">
                Select an Excel or CSV file to import
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Supported formats: .xlsx, .xls, .csv</p>

              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null);
                  setUploadCompleted(false);
                  setUploadLogs([]);
                }}
                className="mt-4 text-xs mx-auto block file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-700 file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
              />

              {selectedFile && (
                <p className="mt-2 text-xs font-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} />
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Execution logs */}
            {uploadLogs.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
                <p className="text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-2">Import Logs</p>
                {uploadLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-none"
                  >
                    <span className="font-mono font-700 text-slate-800 dark:text-slate-200">{log.code}</span>
                    <span
                      className={`text-[11px] font-600 ${
                        log.status === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : log.status === 'error'
                          ? 'text-red-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
