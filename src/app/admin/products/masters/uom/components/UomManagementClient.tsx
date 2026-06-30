'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Trash2, Search, Loader2,
  ChevronLeft, ChevronRight, FolderOpen, AlertCircle, RefreshCw, Sparkles
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import UomModal from './UomModal';

interface Uom {
  uomId: number;
  uomCode: string;
  displayName: string;
  description: string;
  isActive: boolean;
}

export default function UomManagementClient() {
  const [uomList, setUomList] = useState<Uom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uomToDelete, setUomToDelete] = useState<Uom | null>(null);

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

  // Fetch UOM list (NDJSON stream)
  const fetchUoms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get<string>('/prod/uom/all', {
        headers: { Accept: 'application/x-ndjson' },
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(data);
      setUomList(parsed);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load UOM master records');
      toast.error('Failed to load UOM list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUoms();
  }, [fetchUoms]);

  // Search filter
  const filteredUoms = useMemo(() => {
    if (!searchQuery.trim()) return uomList;
    const q = searchQuery.toLowerCase();
    return uomList.filter(
      (u) =>
        u.uomCode.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.description && u.description.toLowerCase().includes(q))
    );
  }, [uomList, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUoms.slice(start, start + itemsPerPage);
  }, [filteredUoms, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUoms.length / itemsPerPage));

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

  const startIdx = filteredUoms.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredUoms.length);
  const totalCount = filteredUoms.length;

  const handleCreateClick = () => {
    setModalOpen(true);
  };

  const handleDeleteClick = (uom: Uom) => {
    setUomToDelete(uom);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!uomToDelete) return;
    setDeleteConfirmOpen(false);
    const toastId = toast.loading('Deactivating UOM...');
    try {
      await axiosInstance.delete(`/prod/uom/${uomToDelete.uomId}`);
      toast.success('UOM deactivated successfully', { id: toastId });
      fetchUoms();
    } catch (err: any) {
      console.error(err);
      toast.error('Deactivation failed', { id: toastId });
    } finally {
      setUomToDelete(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-blue-600 dark:text-blue-400" />
            UOM Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage product units of measurement, codes, display names, and descriptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
          >
            <Plus size={14} /> Create UOM
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search UOM code, name, description…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-955/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
          />
        </div>
        <button
          onClick={fetchUoms}
          className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
          title="Refresh List"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Fetching UOM records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchUoms}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <FolderOpen size={44} className="text-slate-300 dark:text-slate-755 mb-3" />
            <p className="text-sm font-medium">No UOM records found</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-955/25">
                  <th className="w-16 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">#</th>
                  <th className="w-48 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">UOM Code</th>
                  <th className="w-64 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Display Name</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Description</th>
                  <th className="w-36 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Status</th>
                  <th className="w-24 py-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginated.map((m, idx) => (
                  <tr
                    key={m.uomId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center tabular-nums">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {m.uomCode}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {m.displayName}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-655 dark:text-slate-450 truncate">
                      {m.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        m.isActive 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-955/20 dark:text-emerald-400' 
                          : 'bg-slate-105 text-slate-655 dark:bg-slate-855 dark:text-slate-400'
                      }`}>
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleDeleteClick(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-655 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                          title="Deactivate UOM"
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
        {!loading && !error && filteredUoms.length > 0 && (
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
                className="p-1.5 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
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
                      : 'hover:bg-slate-105 dark:hover:bg-slate-800 text-black dark:text-slate-400'
                    }`}
                  >
                    {pn}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <UomModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchUoms();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-955/60 backdrop-blur-sm transition-opacity" onClick={() => setDeleteConfirmOpen(false)} />
          <div className="relative bg-white dark:bg-slate-905 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-955/30 flex items-center justify-center text-red-655 dark:text-red-405 mb-4 mx-auto">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider text-center mb-2">
              Deactivate UOM?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Are you sure you want to deactivate UOM <strong className="text-slate-800 dark:text-white">"{uomToDelete?.uomCode}"</strong>? This will turn off the status.
            </p>
            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-705 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-655 dark:text-slate-355"
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
