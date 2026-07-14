'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Download, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, AlertCircle, Home, MapPin, Check
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import WarehouseModal from './WarehouseModal';
import Modal from '@/components/ui/Modal';

interface Warehouse {
  id: number;
  name: string;
  type: string;
  address: string;
  status: boolean;
}

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function WarehouseManagementClient() {
  // Data state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Delete Confirm modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [exportingExcel, setExportingExcel] = useState(false);

  // NDJSON parser helper
  const parseNdjson = (rawString: any): Warehouse[] => {
    if (typeof rawString === 'string') {
      const parsed: Warehouse[] = [];
      rawString.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            parsed.push(JSON.parse(trimmed));
          } catch (e) {
            console.error('Error parsing NDJSON line:', trimmed, e);
          }
        }
      });
      return parsed;
    }
    if (Array.isArray(rawString)) {
      return rawString;
    }
    return [];
  };

  // Fetch active warehouses
  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/stock/warehouse/active', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson(response.data);
      setWarehouses(parsed);
      setSelectedIds([]); // Clear selection on reload
    } catch (err: any) {
      console.error('Failed to load warehouses:', err);
      setError('Failed to load warehouse records.');
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Search filter
  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return warehouses;
    const q = searchQuery.toLowerCase();
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.type.toLowerCase().includes(q) ||
        w.address.toLowerCase().includes(q)
    );
  }, [warehouses, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWarehouses.slice(start, start + itemsPerPage);
  }, [filteredWarehouses, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredWarehouses.length / itemsPerPage));

  // Pagination calculation
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

  const startIdx = filteredWarehouses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredWarehouses.length);
  const totalCount = filteredWarehouses.length;

  // Selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map((w) => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((sid) => sid !== id)));
  };

  const isAllPageSelected = paginated.length > 0 && paginated.every((w) => selectedIds.includes(w.id));

  // CRUD actions
  const handleCreateClick = () => {
    setEditingWarehouse(null);
    setModalOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setModalOpen(true);
  };

  // Delete Action triggers custom Modal
  const handleDeleteTrigger = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;
    const { id, name } = warehouseToDelete;
    
    setDeleteConfirmOpen(false);
    setWarehouseToDelete(null);

    const toastId = toast.loading(`Deleting warehouse "${name}"...`);
    try {
      await axiosInstance.delete(`/stock/warehouse/${id}`);
      toast.success('Warehouse deleted successfully', { id: toastId });
      setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
      fetchWarehouses();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Failed to delete warehouse.';
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'string') {
          errMsg = data;
        } else if (typeof data === 'object') {
          errMsg = data.message || data.error || data.details || JSON.stringify(data);
        }
      }
      toast.error(errMsg, { id: toastId });
    }
  };

  const handleDeleteSelectedTrigger = () => {
    if (selectedIds.length === 0) return;
    setBatchDeleteOpen(true);
  };

  const confirmBatchDelete = async () => {
    setBatchDeleteOpen(false);
    const count = selectedIds.length;
    const toastId = toast.loading(`Deleting ${count} warehouses...`);
    
    try {
      await Promise.all(selectedIds.map((id) => axiosInstance.delete(`/stock/warehouse/${id}`)));
      toast.success('Selected warehouses deleted successfully', { id: toastId });
      setSelectedIds([]);
      fetchWarehouses();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete some warehouses.', { id: toastId });
    }
  };

  // SheetJS Export Loader
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

  // Excel Export
  const handleExportExcel = async () => {
    if (warehouses.length === 0) {
      toast.error('No warehouse data available to export.');
      return;
    }
    
    setExportingExcel(true);
    const toastId = toast.loading('Generating Excel file...');
    
    try {
      const headers = ['Warehouse ID', 'Warehouse Name', 'Type', 'Address', 'Status'];
      const rows = warehouses.map((w) => [
        w.id,
        w.name,
        w.type,
        w.address,
        w.status ? 'Active' : 'Inactive'
      ]);
      
      const XLSX = await loadSheetJS();
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-fit column widths
      const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        rows.forEach(row => {
          const val = String(row[i] ?? '');
          if (val.length > maxLen) {
            maxLen = val.length;
          }
        });
        return { wch: maxLen + 3 };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Warehouses");
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", `warehouses_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Successfully exported ${warehouses.length} warehouses to Excel`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export warehouses to Excel.', { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Home size={22} className="text-blue-600 dark:text-blue-400" />
            Warehouse Setup
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure warehouses, distribution centers, and storage hubs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelectedTrigger}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || warehouses.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            <Download size={14} />
            Export Excel
          </button>
          
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
          >
            <Plus size={14} />
            Create Warehouse
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
            placeholder="Search warehouse by name, type, address..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
          />
        </div>
        <button
          onClick={fetchWarehouses}
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
            <p className="text-sm font-medium">Fetching warehouse records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchWarehouses}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <Home size={44} className="text-slate-300 dark:text-slate-750 mb-3" />
            <p className="text-sm font-medium">No warehouse records found</p>
            <p className="text-xs text-slate-550 mt-1">Add a new warehouse to start configuration.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                  <th className="w-12 py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                    />
                  </th>
                  <th className="w-20 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">#</th>
                  <th className="w-64 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Warehouse Name</th>
                  <th className="w-40 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Type</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Address</th>
                  <th className="w-28 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Status</th>
                  <th className="w-28 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginated.map((w, index) => {
                  const isSelected = selectedIds.includes(w.id);
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={w.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                        isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(w.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {serialNumber}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-bold text-slate-900 dark:text-white truncate">
                        {w.name}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-650 dark:text-slate-300">
                        <span className="capitalize bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                          {w.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 truncate" title={w.address}>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{w.address}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {w.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(w)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                            title="Edit Warehouse"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTrigger(w)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                            title="Delete Warehouse"
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
        {!loading && filteredWarehouses.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-250 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                Showing {startIdx}–{endIdx} of {totalCount} warehouses
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
      <WarehouseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        warehouse={editingWarehouse}
        onSuccess={() => {
          setModalOpen(false);
          fetchWarehouses();
        }}
      />

      {/* Single Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setWarehouseToDelete(null);
        }}
        title="Delete Warehouse"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false);
                setWarehouseToDelete(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-350 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
            >
              Delete
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
              Are you sure you want to delete this warehouse?
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium leading-relaxed">
              This will delete <span className="font-bold text-slate-800 dark:text-slate-250">{warehouseToDelete?.name}</span>. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        title="Delete Selected Warehouses"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setBatchDeleteOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-350 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmBatchDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
            >
              Delete Selected
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
              Delete multiple warehouses?
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium leading-relaxed">
              You are about to delete <span className="font-bold text-slate-850 dark:text-white">{selectedIds.length} selected warehouses</span>. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
