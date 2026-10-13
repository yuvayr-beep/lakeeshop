'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Download, Upload, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, Truck, AlertCircle, FileText, Check, X, Filter
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierActual } from '@/types/courierActual';
import { CourierPartner } from '@/types/courier';
import CourierActualModal from './CourierActualModal';
import CourierActualDeleteModal from './CourierActualDeleteModal';

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

// NDJSON & JSON Parser helper
const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return line;
          }
        });
    }
  }
  return [];
};

export default function CourierActualsClient() {
  // Data State
  const [actuals, setActuals] = useState<CourierActual[]>([]);
  const [couriers, setCouriers] = useState<CourierPartner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Filters State
  const [courierCodeFilter, setCourierCodeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // UI & Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingActual, setEditingActual] = useState<CourierActual | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [actualToDelete, setActualToDelete] = useState<CourierActual | null>(null);

  const [exporting, setExporting] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showUploadArea, setShowUploadArea] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Pagination (client-side)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // SheetJS Loader helper
  const loadSheetJS = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        resolve((window as any).XLSX);
      };
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [courierCodeFilter, debouncedSearch, itemsPerPage]);

  // Fetch Couriers list for filter dropdown & modal selection
  const fetchCouriers = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/courier', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data) as CourierPartner[];
      const sorted = parsed.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      setCouriers(sorted);
    } catch (err) {
      console.error('Failed to fetch courier list:', err);
    }
  }, []);

  // Fetch Actuals list
  const fetchActuals = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params: Record<string, any> = {};
      if (courierCodeFilter !== 'ALL' && courierCodeFilter) {
        params.courierCode = courierCodeFilter;
      }
      if (debouncedSearch) {
        params.awbNumber = debouncedSearch;
      }

      const response = await axiosInstance.get('/courier/actuals', {
        params,
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      const parsed = parseNdjson(response.data) as CourierActual[];
      setActuals(parsed);
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Failed to fetch courier actuals:', err);
      setError('Failed to load courier actual records.');
      toast.error('Failed to load courier actuals');
    } finally {
      setLoading(false);
    }
  }, [courierCodeFilter, debouncedSearch]);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  useEffect(() => {
    fetchActuals();
  }, [fetchActuals]);

  // Client-side search filter fallback
  const filteredActuals = useMemo(() => {
    if (!searchQuery.trim()) return actuals;
    const q = searchQuery.toLowerCase().trim();
    return actuals.filter((a) => {
      return (
        (a.awbNumber && a.awbNumber.toLowerCase().includes(q)) ||
        (a.courierCode && a.courierCode.toLowerCase().includes(q)) ||
        (a.courierName && a.courierName.toLowerCase().includes(q)) ||
        String(a.billedWeight).includes(q) ||
        String(a.actualCost).includes(q)
      );
    });
  }, [actuals, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredActuals.slice(start, start + itemsPerPage);
  }, [filteredActuals, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredActuals.length / itemsPerPage));

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((sid) => sid !== id)));
  };

  const isAllPageSelected = paginated.length > 0 && paginated.every((a) => selectedIds.includes(a.id));

  // CRUD Action handlers
  const handleCreateClick = () => {
    setEditingActual(null);
    setModalOpen(true);
  };

  const handleEdit = (item: CourierActual) => {
    setEditingActual(item);
    setModalOpen(true);
  };

  const handleDelete = (item: CourierActual) => {
    setActualToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected actual records?`)) {
      return;
    }
    const toastId = toast.loading(`Deleting ${selectedIds.length} actual records…`);
    try {
      await Promise.all(selectedIds.map((id) => axiosInstance.delete(`/courier/actuals/${id}`)));
      toast.success('Selected records deleted successfully', { id: toastId });
      setSelectedIds([]);
      fetchActuals();
    } catch (err: any) {
      console.error(err);
      toast.error('Batch delete failed', { id: toastId });
    }
  };

  // Data Export Excel Handler
  const handleExportExcel = async () => {
    if (filteredActuals.length === 0) {
      toast.error('No actual records available to export.');
      return;
    }

    setExporting(true);
    const toastId = toast.loading('Generating Courier Actuals Excel data file...');

    try {
      const headers = [
        'ID',
        'Courier Code',
        'Courier Name',
        'AWB Number',
        'Billed Weight (Kg)',
        'Actual Cost (₹)',
        'Created At',
        'Created By'
      ];

      const rows = filteredActuals.map((a) => [
        a.id,
        a.courierCode || '',
        a.courierName || '',
        a.awbNumber || '',
        a.billedWeight ?? 0,
        a.actualCost ?? 0,
        a.createdAt || '',
        a.createdByName || ''
      ]);

      const XLSX = await loadSheetJS();
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Courier Actuals');

      XLSX.writeFile(workbook, `Courier_Actuals_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Spreadsheet downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error('Failed to generate export file.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // Template Download Handler: GET /courier/actuals/template
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading Courier Actuals Excel Template…');
    try {
      try {
        const response = await axiosInstance.get('/courier/actuals/template', {
          responseType: 'blob',
          headers: { Accept: '*/*' },
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `courier_actuals_upload_template.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Template downloaded successfully!', { id: toastId });
        return;
      } catch (e1) {
        console.warn('API template download endpoint failed, generating local fallback template...', e1);
      }

      // Local SheetJS Fallback template
      const XLSX = await loadSheetJS();
      const sampleData = [
        {
          courierCode: 'DLRY',
          awbNumber: '8778878778',
          billedWeight: 0.65,
          actualCost: 45.00,
        },
        {
          courierCode: 'DLRY',
          awbNumber: '8997786887',
          billedWeight: 0.55,
          actualCost: 50.00,
        },
        {
          courierCode: 'BDDP',
          awbNumber: '8667767668',
          billedWeight: 0.75,
          actualCost: 65.00,
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Actuals');
      XLSX.writeFile(wb, `courier_actuals_upload_template.xlsx`);
      toast.success('Template generated and downloaded!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Template download failed', { id: toastId });
    }
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Upload Excel Handler: POST /courier/actuals/upload
  const handleUploadExcel = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const toastId = toast.loading('Uploading actual courier costs excel file...');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axiosInstance.post('/courier/actuals/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsedLines = parseNdjson(response.data);
      if (parsedLines.length === 0) {
        toast.success('Actual courier costs uploaded successfully', { id: toastId });
      } else {
        parsedLines.forEach((item: any) => {
          if (typeof item === 'object' && item !== null) {
            if (item.success !== false) {
              toast.success(item.message || 'Actual courier costs uploaded successfully', { id: toastId });
            } else {
              toast.error(item.message || item.error || 'Upload failed', { id: toastId });
            }
          }
        });
      }
      setSelectedFile(null);
      setShowUploadArea(false);
      fetchActuals();
    } catch (err: any) {
      console.error('Upload failed:', err);
      const msg = err.response?.data?.message || 'Failed to upload actual courier costs file.';
      toast.error(msg, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const resetAllFilters = () => {
    setCourierCodeFilter('ALL');
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters = courierCodeFilter !== 'ALL' || Boolean(searchQuery);
  const start = filteredActuals.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, filteredActuals.length);
  const total = filteredActuals.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Single-line Search, Filter, and Action Toolbar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search & Courier Dropdown Filter */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search AWB number, courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Courier Code Filter Dropdown */}
          <div className="w-full sm:w-48">
            <select
              value={courierCodeFilter}
              onChange={(e) => setCourierCodeFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Couriers</option>
              {couriers.map((c) => (
                <option key={c.id || c.courierCode} value={c.courierCode}>
                  {c.courierName} ({c.courierCode})
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="h-10 px-3 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
              title="Reset all search filters"
            >
              <X size={14} />
              Clear
            </button>
          )}

          <button
            onClick={fetchActuals}
            className="flex items-center justify-center w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm shrink-0"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 h-10 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all whitespace-nowrap"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <button
            onClick={handleExportExcel}
            disabled={exporting || actuals.length === 0}
            className="flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download size={14} /> Export Excel
          </button>

          <button
            onClick={() => setShowUploadArea(!showUploadArea)}
            className={`flex items-center gap-2 h-10 px-4 text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 ${
              showUploadArea
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
            }`}
          >
            <Upload size={14} /> Upload
          </button>

          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow whitespace-nowrap shrink-0"
          >
            <Plus size={14} /> Create Record
          </button>
        </div>
      </div>

      {/* Upload Files Expandable Area */}
      {showUploadArea && (
        <div className="shrink-0 bg-slate-50 dark:bg-slate-950/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Bulk Courier Actual Costs Upload via Excel
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download sample template, fill in courier code, AWB number, billed weight, and actual cost, then upload below.
              </p>
            </div>
            <button
              onClick={() => {
                setShowUploadArea(false);
                setSelectedFile(null);
              }}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <label
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all p-4 group ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10 shadow-inner'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/55 dark:bg-slate-950/20 dark:hover:bg-slate-950/40'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2 text-center pointer-events-none">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                  <FileText size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedFile ? (
                    <span className="text-blue-600 font-bold">{selectedFile.name}</span>
                  ) : (
                    <span>
                      Drag your file here or <span className="text-blue-600 hover:underline">Browse</span>
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400">File format: .xls & .xlsx</p>
              </div>
              <input
                type="file"
                accept=".xls,.xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </label>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
              >
                <Upload size={12} className="rotate-180" />
                Download Sample Excel
              </button>

              {selectedFile && (
                <button
                  onClick={handleUploadExcel}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
                >
                  {uploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  {uploading ? 'Uploading...' : 'Submit Upload'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content (Table) */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Fetching courier actual records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchActuals}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <Truck size={44} className="text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium">No courier actual records found</p>
            <p className="text-xs text-slate-500 mt-1">
              {hasActiveFilters ? 'Try adjusting your search filters above.' : 'Click "Create Record" or "Upload" to add actual cost records.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
                <tr className="border-b border-slate-150 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="w-12 py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                    />
                  </th>
                  <th className="w-16 py-3 px-4 text-center">#</th>
                  <th className="w-36 py-3 px-4">Courier Partner</th>
                  <th className="py-3 px-4">AWB Number</th>
                  <th className="py-3 px-4 text-center">Billed Weight (Kg)</th>
                  <th className="py-3 px-4 text-right">Actual Cost (₹)</th>
                  <th className="py-3 px-4">Created Info</th>
                  <th className="w-28 py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 text-xs font-medium">
                {paginated.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id);
                  const sno = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                        isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                        />
                      </td>

                      {/* S.No */}
                      <td className="py-2.5 px-4 text-center font-bold text-slate-400">{sno}</td>

                      {/* Courier Partner */}
                      <td className="py-2.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 inline-block">
                          {item.courierCode}
                        </span>
                        {item.courierName && (
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                            {item.courierName}
                          </p>
                        )}
                      </td>

                      {/* AWB Number */}
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {item.awbNumber}
                      </td>

                      {/* Billed Weight */}
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 inline-block">
                          {item.billedWeight} Kg
                        </span>
                      </td>

                      {/* Actual Cost */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{Number(item.actualCost).toFixed(2)}
                      </td>

                      {/* Created Info */}
                      <td className="py-2.5 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{item.createdByName || '-'}</p>
                        <p className="text-[10px] opacity-75">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</p>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                            title="Edit Record"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination Info */}
        {!loading && filteredActuals.length > 0 && (
          <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{total}</strong> records
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none text-slate-700 dark:text-slate-300"
                >
                  {PER_PAGE_OPTIONS.map((opt) => (
                    <option key={`per-page-${opt}`} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CourierActualModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchActuals}
        couriers={couriers}
        actualToEdit={editingActual}
      />

      <CourierActualDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={fetchActuals}
        actualToDelete={actualToDelete}
      />
    </div>
  );
}
