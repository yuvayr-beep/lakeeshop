'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Download, Upload, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, FolderOpen, AlertCircle, ChevronDown, Sparkles,
  FileText, Check, X
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
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[] | null>(null);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'failed' | 'success'>('failed');

  // Accordion Expand State for Timeline History
  const [expandedHsnCodes, setExpandedHsnCodes] = useState<string[]>([]);
  const [hsnHistory, setHsnHistory] = useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  // Pagination (client‑side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Parse NDJSON helper
  const parseNdjson = (rawData: any): any[] => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if (typeof rawData === 'object') {
      if (Array.isArray(rawData.data)) return rawData.data;
      return [rawData];
    }
    if (typeof rawData === 'string') {
      const trimmed = rawData.trim();
      if (!trimmed) return [];
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
          if (Array.isArray(parsed?.data)) return parsed.data;
          return [parsed];
        } catch {}
      }
      return trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((item): item is any => item !== null);
    }
    return [];
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
      if (extension === 'xlsx' || extension === 'xls') {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Dynamic loader for SheetJS
  const loadSheetJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => resolve((window as any).XLSX);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  // Download ONLY failed HSN records in Excel (.xlsx)
  const handleDownloadFailedHsnExcel = async () => {
    if (!uploadResults || uploadResults.length === 0) {
      toast.error('No upload results available to export');
      return;
    }

    const failedRows = uploadResults.filter((r) => !r.success);
    if (failedRows.length === 0) {
      toast.info('No failed HSN records found to download.');
      return;
    }

    const toastId = toast.loading(`Generating Excel file for ${failedRows.length} failed HSN records...`);
    try {
      const headers = ['Row Number', 'HSN Code', 'Failure Reason / Error Message', 'Status'];
      const rows = failedRows.map((row, idx) => {
        let rowNum = String(idx + 1);
        let reason = row.message || row.error || 'Failed';

        // Extract Row N from message if present e.g. "Row 2: No active open-ended HSN record found for UPDATE"
        const match = reason.match(/^Row\s+(\d+):\s*(.*)$/i);
        if (match) {
          rowNum = match[1];
          reason = match[2];
        }

        return [
          rowNum,
          row.key || row.hsnCode || '-',
          reason,
          'Failed'
        ];
      });

      const XLSX = await loadSheetJS();
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet['!cols'] = [
        { wch: 14 },
        { wch: 22 },
        { wch: 60 },
        { wch: 14 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed HSN Records');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `failed_hsn_records_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully downloaded ${failedRows.length} failed HSN records in Excel!`, { id: toastId });
    } catch (err: any) {
      console.error('Failed to export failed rows using SheetJS, falling back to CSV:', err);
      try {
        const headers = ['Row Number', 'HSN Code', 'Failure Reason', 'Status'];
        const csvRows = [headers.join(',')];
        failedRows.forEach((row, idx) => {
          let rowNum = String(idx + 1);
          let reason = row.message || row.error || 'Failed';
          const match = reason.match(/^Row\s+(\d+):\s*(.*)$/i);
          if (match) {
            rowNum = match[1];
            reason = match[2];
          }
          const escapedReason = `"${reason.replace(/"/g, '""')}"`;
          const escapedHsn = `"${(row.key || row.hsnCode || '-').replace(/"/g, '""')}"`;
          csvRows.push([rowNum, escapedHsn, escapedReason, '"Failed"'].join(','));
        });
        const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.setAttribute('download', `failed_hsn_records_${Date.now()}.csv`);
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);
        toast.success(`Downloaded ${failedRows.length} failed HSN records as CSV`, { id: toastId });
      } catch (fallbackErr) {
        toast.error('Failed to generate export file', { id: toastId });
      }
    }
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const toastId = toast.loading('Uploading HSN excel file...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const { data } = await axiosInstance.post<string>('/prod/hsn/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/x-ndjson'
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const lines = parseNdjson(data);
      toast.dismiss(toastId);

      setUploadResults(lines);
      const failCount = lines.filter((l) => !l.success).length;
      const successCount = lines.filter((l) => l.success).length;

      if (failCount > 0) {
        setResultsFilter('failed');
      } else {
        setResultsFilter('all');
      }

      if (lines.length > 0) {
        if (failCount === 0) {
          toast.success(`All ${successCount} HSN records processed successfully!`);
        } else if (successCount === 0) {
          toast.error(`All ${failCount} HSN records failed. Download the failed Excel below.`, { duration: 6000 });
        } else {
          toast.info(`Import completed: ${successCount} succeeded, ${failCount} failed. You can download the failed records.`, { duration: 6000 });
        }
      } else {
        toast.info('Upload processed.');
      }
      setSelectedFile(null);
      // Keep upload area visible so user can inspect and download failed records
      setShowUploadArea(true);
      fetchHsnList();
    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      let errorResults: any[] = [];
      if (err.response?.data) {
        errorResults = parseNdjson(err.response.data);
      }
      if (errorResults.length > 0) {
        setUploadResults(errorResults);
        setResultsFilter('failed');
        const failCount = errorResults.filter((r) => !r.success).length;
        toast.error(`Upload failed: ${failCount} records failed. Download the failed Excel below.`, { duration: 6000 });
        setShowUploadArea(true);
      } else {
        toast.error(err.response?.data?.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden font-sans">
      {/* Single-line Search and Action Toolbar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2.5 w-full md:flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
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
            className="flex items-center justify-center w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm shrink-0"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {uploadResults && uploadResults.filter((x) => !x.success).length > 0 && (
            <button
              onClick={handleDownloadFailedHsnExcel}
              className="flex items-center gap-1.5 h-10 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow whitespace-nowrap shrink-0"
              title="Download Failed HSN Records (.xlsx)"
            >
              <Download size={13} />
              <span>Failed HSN Excel ({uploadResults.filter((x) => !x.success).length})</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            disabled={exporting || hsnList.length === 0}
            className="flex items-center gap-1.5 h-10 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={() => setShowUploadArea(!showUploadArea)}
            className={`flex items-center gap-1.5 h-10 px-3 text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 relative ${
              showUploadArea
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
            }`}
          >
            <Upload size={13} /> Upload
            {uploadResults && uploadResults.filter((x) => !x.success).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-1.5 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow whitespace-nowrap shrink-0"
          >
            <Plus size={14} /> Create HSN
          </button>
        </div>
      </div>

      {/* Upload Files Expandable Area */}
      {showUploadArea && (
        <div className="shrink-0 bg-slate-50 dark:bg-slate-950/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Bulk HSN Upload via Excel Upload
                </h3>
                {uploadResults && uploadResults.filter((x) => !x.success).length > 0 && (
                  <span className="text-[11px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <AlertCircle size={11} />
                    {uploadResults.filter((x) => !x.success).length} Failed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download the sample Excel template, fill in the HSN details, and upload it below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {uploadResults && uploadResults.filter((x) => !x.success).length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadFailedHsnExcel}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Download Excel file of failed HSN records"
                >
                  <Download size={13} />
                  <span>Download Failed Excel</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowUploadArea(false);
                  setSelectedFile(null);
                }}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>

          {/* Results Summary and Failed Rows Inspection */}
          {uploadResults && uploadResults.length > 0 && (
            <div className="mb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200">
              {/* Summary Header */}
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Upload Results:
                  </span>
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                    {uploadResults.length} Processed
                  </span>
                  {uploadResults.filter((x) => x.success).length > 0 && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      {uploadResults.filter((x) => x.success).length} Succeeded
                    </span>
                  )}
                  {uploadResults.filter((x) => !x.success).length > 0 && (
                    <span className="text-xs bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <AlertCircle size={12} />
                      {uploadResults.filter((x) => !x.success).length} Failed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {uploadResults.filter((x) => !x.success).length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadFailedHsnExcel}
                      title="Download Excel spreadsheet of only failed HSN records"
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Download size={13} />
                      <span>Download Failed HSN Records ({uploadResults.filter((x) => !x.success).length}) Excel</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadResults(null);
                      setSelectedFile(null);
                    }}
                    className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  >
                    Clear Results
                  </button>
                </div>
              </div>

              {/* Filter Sub-Tabs */}
              <div className="px-3.5 py-2 bg-slate-100/70 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium text-[11px] mr-1">Filter View:</span>
                <button
                  type="button"
                  onClick={() => setResultsFilter('failed')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                    resultsFilter === 'failed'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>Failed</span>
                  <span className="font-mono text-[10px]">({uploadResults.filter((x) => !x.success).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultsFilter('success')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                    resultsFilter === 'success'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>Successful</span>
                  <span className="font-mono text-[10px]">({uploadResults.filter((x) => x.success).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultsFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                    resultsFilter === 'all'
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>All Rows</span>
                  <span className="font-mono text-[10px]">({uploadResults.length})</span>
                </button>
              </div>

              {/* Result Items List */}
              <div className="max-h-60 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-1">
                {uploadResults
                  .filter((row) => {
                    if (resultsFilter === 'failed') return !row.success;
                    if (resultsFilter === 'success') return row.success;
                    return true;
                  })
                  .map((row, idx) => (
                    <div
                      key={`hsn-res-${idx}`}
                      className={`flex items-start justify-between py-2 px-2.5 rounded-lg text-xs gap-3 ${
                        row.success
                          ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10'
                          : 'bg-red-50/50 dark:bg-red-950/15 hover:bg-red-50/70 dark:hover:bg-red-950/25'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {row.success ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertCircle size={10} strokeWidth={3} />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {row.key || row.hsnCode || 'Row ' + (idx + 1)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              row.success ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}>
                              {row.success ? 'Success' : 'Failed'}
                            </span>
                          </div>
                          <span className={`text-[11px] mt-0.5 ${
                            row.success
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400 font-medium'
                          }`}>
                            {row.message || (row.success ? 'Uploaded successfully' : 'Failed to update')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

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
                accept=".xls,.xlsx"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-750 transition-colors shadow-sm"
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
                    <RefreshCw size={12} className="animate-spin" />
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

      {/* Main Content (Table Container) */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
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
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
                <tr className="border-b border-slate-150 dark:border-slate-800/80">
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
