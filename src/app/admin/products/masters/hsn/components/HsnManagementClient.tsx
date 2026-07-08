'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Download, Upload, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, FolderOpen, AlertCircle, ChevronDown, Sparkles
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import HsnModal from './HsnModal';

type Hsn = {
  hsnId: number;
  hsnCode: string;
  description: string;
  taxPercentage: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: boolean;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function HsnManagementClient() {
  // Data state
  const [hsnList, setHsnList] = useState<Hsn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  // Commented out delete selection:
  // const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHsn, setEditingHsn] = useState<Hsn | null>(null);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Accordion Expand State for Timeline History
  const [expandedHsnCodes, setExpandedHsnCodes] = useState<string[]>([]);
  const [hsnHistory, setHsnHistory] = useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  // Pagination (client‑side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Parse NDJSON helper
  const parseNdjson = (raw: any): any[] => {
    if (!raw) return [];
    if (typeof raw !== 'string') {
      if (Array.isArray(raw)) return raw;
      return [raw];
    }
    try {
      return raw.split('\n').map(line => line.trim()).filter(Boolean).map((line) => JSON.parse(line));
    } catch (e) {
      console.error('Failed to parse NDJSON string:', e);
      return [];
    }
  };

  // Fetch HSN list (NDJSON)
  const fetchHsnList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get<string>('/prod/hsn', {
        headers: { Accept: 'application/x-ndjson' },
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(data);
      setHsnList(parsed);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load HSN codes');
      toast.error('Failed to load HSN codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHsnList();
  }, [fetchHsnList]);

  // Search filter
  const filteredHsn = useMemo(() => {
    if (!searchQuery.trim()) return hsnList;
    const q = searchQuery.toLowerCase();
    return hsnList.filter(
      (h) =>
        h.hsnCode.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q))
    );
  }, [hsnList, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHsn.slice(start, start + itemsPerPage);
  }, [filteredHsn, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredHsn.length / itemsPerPage));

  // Page Numbers pagination calculation
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  const start = filteredHsn.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, filteredHsn.length);
  const total = filteredHsn.length;

  // Toggle Accordion / History loader
  const toggleRow = async (hsnCode: string) => {
    const isCurrentlyExpanded = expandedHsnCodes.includes(hsnCode);
    if (isCurrentlyExpanded) {
      setExpandedHsnCodes(prev => prev.filter(c => c !== hsnCode));
    } else {
      setExpandedHsnCodes(prev => [...prev, hsnCode]);
      // Load history if not loaded yet
      if (!hsnHistory[hsnCode] && !loadingHistory[hsnCode]) {
        setLoadingHistory(prev => ({ ...prev, [hsnCode]: true }));
        try {
          const { data } = await axiosInstance.get(`/prod/hsn/history/${hsnCode}`, {
            headers: { Accept: 'application/x-ndjson' },
            transformResponse: [(data) => data],
          });
          const parsed = parseNdjson(data);
          setHsnHistory(prev => ({ ...prev, [hsnCode]: parsed }));
        } catch (err) {
          console.error(`Failed to load history for ${hsnCode}:`, err);
          toast.error(`Failed to load history for HSN ${hsnCode}`);
        } finally {
          setLoadingHistory(prev => ({ ...prev, [hsnCode]: false }));
        }
      }
    }
  };

  // CRUD actions
  const handleCreateClick = () => {
    setEditingHsn(null);
    setModalOpen(true);
  };

  const handleEdit = (hsn: Hsn) => {
    setEditingHsn(hsn);
    setModalOpen(true);
  };

  // Commented out delete logic:
  /*
  const handleDelete = async (hsnId: number, hsnCode: string) => {
    if (!window.confirm(`Are you sure you want to delete HSN Code "${hsnCode}"?`)) {
      return;
    }
    const toastId = toast.loading('Deleting HSN code…');
    try {
      await axiosInstance.delete(`/prod/hsn/${hsnId}`);
      toast.success('HSN Code deleted', { id: toastId });
      fetchHsnList();
    } catch (err: any) {
      console.error(err);
      toast.error('Delete failed', { id: toastId });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected HSN codes?`)) {
      return;
    }
    const toastId = toast.loading(`Deleting ${selectedIds.length} HSN records…`);
    try {
      await Promise.all(selectedIds.map((id) => axiosInstance.delete(`/prod/hsn/${id}`)));
      toast.success('Selected HSN codes deleted', { id: toastId });
      setSelectedIds([]);
      fetchHsnList();
    } catch (err: any) {
      console.error(err);
      toast.error('Batch delete failed', { id: toastId });
    }
  };
  */

  // Export Excel (template endpoint)
  const handleExportExcel = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating Excel…');
    try {
      const response = await axiosInstance.post(
        '/prod/hsn/template',
        { prepopulateAll: true },
        { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hsn_export_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exported Excel', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // Template download (same endpoint)
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading template…');
    try {
      const response = await axiosInstance.post(
        '/prod/hsn/template',
        { prepopulateAll: true },
        { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hsn_template_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Template downloaded', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Template download failed', { id: toastId });
    }
  };

  // Upload handling
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading('Uploading…');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axiosInstance.post<string>('/prod/hsn/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const lines = parseNdjson(data);
      toast.dismiss(toastId);
      
      let successCount = 0;
      let failCount = 0;
      lines.forEach((line) => {
        if (line.success) {
          successCount++;
          toast.success(line.message || `Uploaded successfully: ${line.key}`);
        } else {
          failCount++;
          toast.error(line.message || `Upload failed for key: ${line.key}`);
        }
      });
      if (lines.length > 0) {
        toast.info(`Import completed: ${successCount} succeeded, ${failCount} failed.`);
      }
      fetchHsnList();
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed', { id: toastId });
    } finally {
      setUploading(false);
      (e.target as HTMLInputElement).value = '';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Edit3 size={20} className="text-blue-600 dark:text-blue-400" />
            HSN Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage HSN codes, view rate version timeline history, and upload sheets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={exporting || hsnList.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            <Download size={14} /> Export Excel
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-250 dark:border-slate-700 shadow-sm transition-colors"
          >
            <Download size={14} /> Template
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-250 dark:border-slate-700 shadow-sm cursor-pointer transition-colors">
            <Upload size={14} /> Upload
            <input type="file" accept=".xlsx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
          >
            <Plus size={14} /> Create HSN
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search HSN code, description…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
          />
        </div>
        <button
          onClick={fetchHsnList}
          className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
          title="Refresh List"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Content (Table) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Fetching HSN records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchHsnList}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <FolderOpen size={44} className="text-slate-300 dark:text-slate-750 mb-3" />
            <p className="text-sm font-medium">No HSN records found</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                  <th className="w-12 py-2 px-4 text-center"></th>
                  <th className="w-16 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">#</th>
                  <th className="w-36 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">HSN Code</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Description</th>
                  <th className="w-32 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Tax Rate (%)</th>
                  <th className="w-32 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Effective From</th>
                  <th className="w-32 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Effective To</th>
                  <th className="w-28 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Status</th>
                  <th className="w-24 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginated.map((hsn, idx) => {
                  const isExpanded = expandedHsnCodes.includes(hsn.hsnCode);
                  return (
                    <React.Fragment key={hsn.hsnId}>
                      <tr
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                          isExpanded ? 'bg-blue-50/10 dark:bg-blue-950/5' : ''
                        }`}
                      >
                        <td className="py-2 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRow(hsn.hsnCode)}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            title="View History Timeline"
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </td>
                        <td className="py-2 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center tabular-nums">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-2 px-4 text-xs font-bold text-slate-880 dark:text-slate-200 truncate">
                          <button
                            type="button"
                            onClick={() => toggleRow(hsn.hsnCode)}
                            className="hover:underline text-left"
                            title="Click to view history timeline"
                          >
                            {hsn.hsnCode}
                          </button>
                        </td>
                        <td className="py-2 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                          {hsn.description ?? '-'}
                        </td>
                        <td className="py-2 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {hsn.taxPercentage}%
                        </td>
                        <td className="py-2 px-4 text-xs font-medium text-slate-500 dark:text-slate-455 tabular-nums">
                          {hsn.effectiveFrom}
                        </td>
                        <td className="py-2 px-4 text-xs font-medium text-slate-500 dark:text-slate-455 tabular-nums">
                          {hsn.effectiveTo ?? '-'}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            hsn.status 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400'
                          }`}>
                            {hsn.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(hsn)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                              title="Update HSN Version"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
 
                      {/* Expanded History Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30 dark:bg-slate-950/5">
                          <td colSpan={9} className="px-6 py-4 border-b border-slate-150 dark:border-slate-800">
                            <div className="border-l-2 border-blue-550 dark:border-blue-500 ml-4 pl-6 space-y-4 py-2 relative">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-blue-600" />
                                HSN Version History: {hsn.hsnCode}
                              </h4>
                              {loadingHistory[hsn.hsnCode] ? (
                                <div className="text-xs text-slate-550 dark:text-slate-400 flex items-center gap-2 animate-pulse">
                                  <Loader2 size={14} className="animate-spin text-blue-500" /> Loading timeline history...
                                </div>
                              ) : !hsnHistory[hsn.hsnCode] || hsnHistory[hsn.hsnCode].length === 0 ? (
                                <div className="text-xs text-slate-450 italic">No history versions found.</div>
                              ) : (
                                <div className="space-y-4">
                                  {hsnHistory[hsn.hsnCode].map((version) => (
                                    <div key={version.hsnId} className="relative flex flex-col gap-1.5">
                                      {/* Timeline dot */}
                                      <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900 ${
                                        version.status 
                                          ? 'border-emerald-500 dark:border-emerald-400' 
                                          : 'border-slate-300 dark:border-slate-600'
                                      }`} />
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                          Tax Rate: <strong className="text-black dark:text-white tabular-nums">{version.taxPercentage}%</strong>
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                                          version.status 
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                            : 'bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400'
                                        }`}>
                                          {version.status ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                      {version.description && (
                                        <p className="text-xs text-slate-550 dark:text-slate-400 max-w-2xl">
                                          {version.description}
                                        </p>
                                      )}
                                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-550">
                                        Effective: {version.effectiveFrom} {version.effectiveTo ? `to ${version.effectiveTo}` : 'onwards'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer pagination info */}
        {!loading && filteredHsn.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-250 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                Showing {start}–{end} of {total} HSN records
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-black dark:text-slate-400">Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-slate-300"
                >
                  {PER_PAGE_OPTIONS.map((opt) => (
                    <option key={`per-page-${opt}`} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((pn, idx) =>
                typeof pn === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-black dark:text-slate-400">…</span>
                ) : (
                  <button
                    key={`page-${pn}`}
                    onClick={() => setCurrentPage(pn)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${pn === currentPage
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-slate-400'
                    }`}
                  >
                    {pn}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalOpen && (
        <HsnModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          hsn={editingHsn}
          onSuccess={() => {
            setModalOpen(false);
            fetchHsnList();
          }}
        />
      )}
    </div>
  );
}
