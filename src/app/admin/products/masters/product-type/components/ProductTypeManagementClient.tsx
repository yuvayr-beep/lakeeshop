'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, Edit3, Trash2, Search, Loader2, Download, Upload,
  ChevronLeft, ChevronRight, FolderOpen, AlertCircle, RefreshCw, Sparkles,
  FileText, Check
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import ProductTypeModal from './ProductTypeModal';

interface ProductType {
  productTypeId: number;
  code: string;
  displayName: string;
  namingTemplate: string;
  status: boolean;
}

export default function ProductTypeManagementClient() {
  const [typeList, setTypeList] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ProductType | null>(null);

  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch product types list (NDJSON stream)
  const fetchProductTypes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get<string>('/prod/types', {
        headers: { Accept: 'application/x-ndjson' },
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(data);
      setTypeList(parsed);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load product type master records');
      toast.error('Failed to load product types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductTypes();
  }, [fetchProductTypes]);

  // Search filter
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return typeList;
    const q = searchQuery.toLowerCase();
    return typeList.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.displayName.toLowerCase().includes(q) ||
        (t.namingTemplate && t.namingTemplate.toLowerCase().includes(q))
    );
  }, [typeList, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTypes.slice(start, start + itemsPerPage);
  }, [filteredTypes, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredTypes.length / itemsPerPage));

  // Page numbers helper
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

  const startIdx = filteredTypes.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredTypes.length);
  const totalCount = filteredTypes.length;

  const handleCreateClick = () => {
    setEditingType(null);
    setModalOpen(true);
  };

  const handleEditClick = (type: ProductType) => {
    setEditingType(type);
    setModalOpen(true);
  };

  const handleDeleteClick = (type: ProductType) => {
    setTypeToDelete(type);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!typeToDelete) return;
    setDeleteConfirmOpen(false);
    const toastId = toast.loading('Deactivating product type...');
    try {
      await axiosInstance.delete(`/prod/types/${typeToDelete.productTypeId}`);
      toast.success('Product type deactivated successfully', { id: toastId });
      fetchProductTypes();
    } catch (err: any) {
      console.error(err);
      toast.error('Deactivation failed', { id: toastId });
    } finally {
      setTypeToDelete(null);
    }
  };

  // Export spreadsheet using template endpoint
  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating Excel export…');
    try {
      const response = await axiosInstance.post(
        '/prod/types/template',
        { prepopulateAll: true },
        { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `product_type_export_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exported Excel successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // Download template file
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading template…');
    try {
      const response = await axiosInstance.post(
        '/prod/types/template',
        { prepopulateAll: true },
        { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `product_type_template_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Template downloaded successfully!', { id: toastId });
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

  const handleUploadExcel = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const toastId = toast.loading('Uploading product type excel file...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const { data } = await axiosInstance.post<string>('/prod/types/upload', formData, {
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
          toast.success(line.message || `Uploaded: ${line.key}`);
        } else {
          failCount++;
          toast.error(line.message || `Failed key: ${line.key}`);
        }
      });
      if (lines.length > 0) {
        toast.info(`Import completed: ${successCount} succeeded, ${failCount} failed.`);
      }
      setSelectedFile(null);
      setShowUploadArea(false);
      fetchProductTypes();
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed', { id: toastId });
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
              placeholder="Search code, name, naming template…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
            />
          </div>
          <button
            onClick={fetchProductTypes}
            className="flex items-center justify-center w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm shrink-0"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExport}
            disabled={exporting || typeList.length === 0}
            className="flex items-center gap-1.5 h-10 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={() => setShowUploadArea(!showUploadArea)}
            className={`flex items-center gap-1.5 h-10 px-3 text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 ${
              showUploadArea
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
            }`}
          >
            <Upload size={13} /> Upload
          </button>
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-1.5 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow whitespace-nowrap shrink-0"
          >
            <Plus size={14} /> Create Product Type
          </button>
        </div>
      </div>

      {/* Upload Files Expandable Area */}
      {showUploadArea && (
        <div className="shrink-0 bg-slate-50 dark:bg-slate-950/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Bulk Product Type Upload via Excel Upload
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download the sample Excel template, fill in the product type details, and upload it below.
              </p>
            </div>
            <button
              onClick={() => {
                setShowUploadArea(false);
                setSelectedFile(null);
              }}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-all"
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

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Fetching product type records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchProductTypes}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <FolderOpen size={44} className="text-slate-300 dark:text-slate-755 mb-3" />
            <p className="text-sm font-medium">No product type records found</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms above.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
                <tr className="border-b border-slate-150 dark:border-slate-800/80">
                  <th className="w-16 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">#</th>
                  <th className="w-48 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Type Code</th>
                  <th className="w-64 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Product Type Name</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Naming Template</th>
                  <th className="w-36 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Status</th>
                  <th className="w-24 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginated.map((pt, idx) => (
                  <tr
                    key={pt.productTypeId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center tabular-nums">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {pt.code}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {pt.displayName}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-650 dark:text-slate-400 truncate font-mono">
                      {pt.namingTemplate || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        pt.status 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-655 dark:bg-slate-855 dark:text-slate-400'
                      }`}>
                        {pt.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(pt)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                          title="Edit Product Type"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(pt)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-655 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                          title="Deactivate Product Type"
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

        {/* Pagination Footer */}
        {!loading && !error && filteredTypes.length > 0 && (
          <div className="px-4 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans flex-shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 select-none">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{startIdx}</span> to{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{endIdx}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCount}</span> entries
            </div>

            <div className="flex items-center gap-4">
              {/* Items Per Page */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold select-none">Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
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

      {/* Modal */}
      {modalOpen && (
        <ProductTypeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          productType={editingType}
          onSuccess={() => {
            setModalOpen(false);
            fetchProductTypes();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setDeleteConfirmOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-655 dark:text-red-400 mb-4 mx-auto">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider text-center mb-2">
              Deactivate Product Type?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Are you sure you want to deactivate product type <strong className="text-slate-800 dark:text-white">"{typeToDelete?.code}"</strong> ({typeToDelete?.displayName})? This will turn off the status.
            </p>
            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-705 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-655 dark:text-slate-350"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all hover:shadow"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
