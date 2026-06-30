'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Download, Upload, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, Image as ImageIcon, FolderOpen, AlertCircle 
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import BrandModal from './BrandModal';
import ImageModal from '@/app/admin/components/ImageModal';
import CcEmailModal from '@/app/admin/components/CcEmailModal';

type Brand = {
  brandId: number;
  brandName: string;
  description: string;
  logoUrl?: string | null;
  email?: string | null;
  ccEmail?: string | null;
  status: boolean;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function BrandManagementClient() {
  // Data state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [showImage, setShowImage] = useState<string | null>(null);
  const [showCc, setShowCc] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Pagination (client‑side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch brands (NDJSON)
  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get<string>('/prod/brands', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const lines = data.split('\n').filter(Boolean);
      const parsed = lines.map((l) => JSON.parse(l) as Brand);
      setBrands(parsed);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load brands');
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Search filter
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const q = searchQuery.toLowerCase();
    return brands.filter(
      (b) =>
        b.brandName.toLowerCase().includes(q) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.ccEmail && b.ccEmail.toLowerCase().includes(q))
    );
  }, [brands, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBrands.slice(start, start + itemsPerPage);
  }, [filteredBrands, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / itemsPerPage));

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

  const start = filteredBrands.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, filteredBrands.length);
  const total = filteredBrands.length;

  // Selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map((b) => b.brandId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((sid) => sid !== id)));
  };

  const isAllPageSelected = paginated.length > 0 && paginated.every((b) => selectedIds.includes(b.brandId));

  // CRUD actions
  const handleCreateClick = () => {
    setEditingBrand(null);
    setModalOpen(true);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setModalOpen(true);
  };

  const handleDelete = async (brandId: number, brandName: string) => {
    if (!window.confirm(`Are you sure you want to delete brand "${brandName}"?`)) {
      return;
    }
    const toastId = toast.loading('Deleting brand…');
    try {
      await axiosInstance.delete(`/prod/brands/${brandId}`);
      toast.success('Brand deleted', { id: toastId });
      setSelectedIds((prev) => prev.filter((id) => id !== brandId));
      fetchBrands();
    } catch (err: any) {
      console.error(err);
      toast.error('Delete failed', { id: toastId });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected brands?`)) {
      return;
    }
    const toastId = toast.loading(`Deleting ${selectedIds.length} brands…`);
    try {
      await Promise.all(selectedIds.map((id) => axiosInstance.delete(`/prod/brands/${id}`)));
      toast.success('Selected brands deleted', { id: toastId });
      setSelectedIds([]);
      fetchBrands();
    } catch (err: any) {
      console.error(err);
      toast.error('Batch delete failed', { id: toastId });
    }
  };

  // Export Excel (template endpoint)
  const handleExportExcel = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating Excel…');
    try {
      const response = await axiosInstance.post(
        '/prod/brands/template',
        { prepopulateAll: true },
        { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brands_export_${Date.now()}.xlsx`;
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
        '/prod/brands/template',
        { prepopulateAll: true },
        { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brand_template_${Date.now()}.xlsx`;
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
      const { data } = await axiosInstance.post<string>('/prod/brands/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'text',
      });
      const lines = data.split('\n').filter(Boolean);
      lines.forEach((line) => {
        const parsed = JSON.parse(line);
        if (parsed.success) toast.success(parsed.message, { id: toastId });
        else toast.error(parsed.message, { id: toastId });
      });
      fetchBrands();
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed', { id: toastId });
    } finally {
      setUploading(false);
      (e.target as HTMLInputElement).value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Edit3 size={20} className="text-blue-600 dark:text-blue-400" />
            Brand Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage brands, upload logos, export and import via Excel.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={handleExportExcel}
            disabled={exporting || brands.length === 0}
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
            <Plus size={14} /> Create Brand
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
            placeholder="Search brand, email…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
          />
        </div>
        <button
          onClick={fetchBrands}
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
            <p className="text-sm font-medium">Fetching brand records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchBrands}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <FolderOpen size={44} className="text-slate-300 dark:text-slate-750 mb-3" />
            <p className="text-sm font-medium">No brand records found</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                  <th className="w-12 py-2 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                    />
                  </th>
                  <th className="w-20 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Logo</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Brand Name</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Email</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">CC Email</th>
                  <th className="w-28 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginated.map((brand) => {
                  const isSelected = selectedIds.includes(brand.brandId);
                  return (
                    <tr
                      key={brand.brandId}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                        isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      <td className="py-1.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(brand.brandId, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                        />
                      </td>
                      <td className="py-1.5 px-4">
                        {brand.logoUrl ? (
                          <button
                            onClick={() => setShowImage(brand.logoUrl!)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 overflow-hidden transition-colors"
                            title="View Logo"
                          >
                            <img
                              src={brand.logoUrl}
                              alt={brand.brandName}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <ImageIcon size={14} />
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {brand.brandName}
                      </td>
                      <td className="py-1.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                        {brand.email ?? '-'}
                      </td>
                      <td className="py-1.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                        {brand.ccEmail ? (
                          <button
                            className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700"
                            onClick={() => setShowCc(brand.ccEmail!)}
                          >
                            {brand.ccEmail.split(',').length} email{brand.ccEmail.split(',').length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-1.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(brand)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                            title="Edit Brand"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(brand.brandId, brand.brandName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-650 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                            title="Delete Brand"
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

        {/* Footer pagination info */}
        {!loading && filteredBrands.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-250 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                Showing {start}–{end} of {total} brands
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
        <BrandModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          brand={editingBrand}
          onSuccess={() => {
            setModalOpen(false);
            fetchBrands();
          }}
        />
      )}
      {showImage && (
        <ImageModal src={showImage} onClose={() => setShowImage(null)} />
      )}
      {showCc && (
        <CcEmailModal ccList={showCc} onClose={() => setShowCc(null)} />
      )}
    </div>
  );
}
