'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Edit3, Trash2, Download, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, Eye, Truck, Check, X, Building2, MapPin, Settings
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { useAppDispatch } from '@/redux/hooks';
import { selectCourier } from '@/redux/slices/courierSlice';
import { CourierPartner } from '@/types/courier';
import CourierWizardModal from './CourierWizardModal';
import CourierViewModal from './CourierViewModal';
import CourierDeleteModal from './CourierDeleteModal';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function CourierPartnersClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Data state
  const [couriers, setCouriers] = useState<CourierPartner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // UI & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal States
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);
  const [editingCourier, setEditingCourier] = useState<CourierPartner | null>(null);

  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewCourier, setViewCourier] = useState<CourierPartner | null>(null);

  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [courierToDelete, setCourierToDelete] = useState<CourierPartner | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // NDJSON & JSON Parser helper
  const parseCourierResponse = (raw: any): CourierPartner[] => {
    if (typeof raw === 'string') {
      const parsed: CourierPartner[] = [];
      raw.split(/\r?\n/).forEach((line) => {
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
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.data)) return raw.data;
      if (raw.data && typeof raw.data === 'object') return [raw.data];
    }
    return [];
  };

  // Fetch Couriers API
  const fetchCouriers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/courier', {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseCourierResponse(response.data);
      setCouriers(parsed);
      setSelectedIds([]); // Clear selection on refresh
    } catch (err: any) {
      console.error('Failed to load courier list:', err);
      setError('Failed to load courier partners. Please try again.');
      toast.error('Failed to load courier partners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  // Search Filter logic
  const filteredCouriers = useMemo(() => {
    if (!searchQuery.trim()) return couriers;
    const q = searchQuery.toLowerCase().trim();
    return couriers.filter((c) => {
      return (
        (c.courierCode && c.courierCode.toLowerCase().includes(q)) ||
        (c.courierName && c.courierName.toLowerCase().includes(q)) ||
        (c.vendorNo && c.vendorNo.toLowerCase().includes(q)) ||
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        (c.originCityCode && c.originCityCode.toLowerCase().includes(q)) ||
        (c.originBranchCode && c.originBranchCode.toLowerCase().includes(q))
      );
    });
  }, [couriers, searchQuery]);

  // Paginated List
  const paginatedCouriers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCouriers.slice(start, start + itemsPerPage);
  }, [filteredCouriers, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredCouriers.length / itemsPerPage));

  // Reset page if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentPageIds = paginatedCouriers.map((c) => c.id);
      const combined = Array.from(new Set([...selectedIds, ...currentPageIds]));
      setSelectedIds(combined);
    } else {
      const currentPageIds = paginatedCouriers.map((c) => c.id);
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((sid) => sid !== id)));
  };

  const isAllPageSelected =
    paginatedCouriers.length > 0 && paginatedCouriers.every((c) => selectedIds.includes(c.id));

  // Handlers for Modals
  const handleCreateClick = () => {
    setEditingCourier(null);
    setWizardOpen(true);
  };

  const handleConfigClick = (courier: CourierPartner) => {
    dispatch(selectCourier(courier));
    router.push(`/admin/courier/config?courierId=${courier.id}`);
  };

  const handleEditClick = (courier: CourierPartner) => {
    setEditingCourier(courier);
    setWizardOpen(true);
  };

  const handleViewClick = (courier: CourierPartner) => {
    setViewCourier(courier);
    setViewOpen(true);
  };

  const handleDeleteClick = (courier: CourierPartner) => {
    setCourierToDelete(courier);
    setDeleteOpen(true);
  };

  const handleBulkDeleteClick = () => {
    setCourierToDelete(null);
    setDeleteOpen(true);
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

  // Excel Export Handler
  const handleExportExcel = async () => {
    if (filteredCouriers.length === 0) {
      toast.error('No courier data available to export.');
      return;
    }

    setExportingExcel(true);
    const toastId = toast.loading('Generating Courier spreadsheet...');

    try {
      const headers = [
        'ID',
        'Courier Code',
        'Courier Name',
        'Vendor No',
        'Business Name',
        'Origin City',
        'Origin Branch',
        'Courier Since',
        'PAN No',
        'Primary Email',
        'Liability Type',
        'Limit Amount',
        'FSC %',
        'AWB Charge'
      ];

      const rows = filteredCouriers.map((c) => [
        c.id,
        c.courierCode || '',
        c.courierName || '',
        c.vendorNo || '',
        c.businessName || '',
        c.originCityCode || '',
        c.originBranchCode || '',
        c.courierSinceDate || '',
        c.courierPan || '',
        c.emailId || '',
        c.liabilityType || '',
        c.liabilityLimitAmt ?? 0,
        c.fscPercentage ?? 0,
        c.abwChargeAmount ?? 0
      ]);

      const XLSX = await loadSheetJS();
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Courier Partners');

      XLSX.writeFile(workbook, `Courier_Partners_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Spreadsheet downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error('Failed to generate export file.', { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  const startIdx = filteredCouriers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredCouriers.length);

  return (
    <div className="space-y-5 pb-12">
      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3 pl-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold">{selectedIds.length} Courier(s) Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, name, vendor no, city..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end ml-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap mr-1">
            Showing {filteredCouriers.length} records
          </span>

          <button
            type="button"
            onClick={fetchCouriers}
            disabled={loading}
            className="flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel || filteredCouriers.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:opacity-95 cursor-pointer"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus size={15} />
            <span>Add Courier Partner</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                  />
                </th>
                <th className="p-4 w-14 text-center">S.No</th>
                <th className="p-4 w-16 text-center">Image</th>
                <th className="p-4">Courier Code</th>
                <th className="p-4">Courier Name</th>
                <th className="p-4">Origin City</th>
                <th className="p-4">Origin Branch</th>
                <th className="p-4">Vendor No</th>
                <th className="p-4">Business Name</th>
                <th className="p-4">Courier Since</th>
                <th className="p-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
                      <span className="text-xs font-semibold">Loading Courier Partners...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCouriers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Courier Partners Found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? 'No partners match your search query.' : 'Click "Add Courier Partner" to create your first carrier account.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCouriers.map((courier, index) => {
                  const isSelected = selectedIds.includes(courier.id);
                  const sno = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr
                      key={courier.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(courier.id, e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700 text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                        />
                      </td>

                      {/* S.No */}
                      <td className="p-4 text-center font-bold text-slate-400">{sno}</td>

                      {/* Image / Logo */}
                      <td className="p-4 text-center">
                        <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center mx-auto overflow-hidden shadow-2xs">
                          {courier.logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={courier.logoUrl}
                              alt={courier.courierName}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <Truck size={16} className="text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Courier Code */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--primary-light-bg)] text-[var(--primary)] inline-block">
                          {courier.courierCode}
                        </span>
                      </td>

                      {/* Courier Name */}
                      <td className="p-4 font-bold text-slate-800 dark:text-white">
                        {courier.courierName}
                      </td>

                      {/* Origin City */}
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">
                        {courier.originCityCode || '-'}
                      </td>

                      {/* Origin Branch */}
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">
                        {courier.originBranchCode || '-'}
                      </td>

                      {/* Vendor No */}
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {courier.vendorNo || '-'}
                      </td>

                      {/* Business Name */}
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                        {courier.businessName || '-'}
                      </td>

                      {/* Courier Since */}
                      <td className="p-4 text-slate-500 dark:text-slate-400">
                        {courier.courierSinceDate || '-'}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Config / Services Gear button */}
                          <button
                            onClick={() => handleConfigClick(courier)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            title="Configure Services & Modes"
                          >
                            <Settings size={15} />
                          </button>

                          {/* View button */}
                          <button
                            onClick={() => handleViewClick(courier)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => handleEditClick(courier)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Edit Courier"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteClick(courier)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Courier"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredCouriers.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing <strong>{startIdx}</strong> to <strong>{endIdx}</strong> of <strong>{filteredCouriers.length}</strong> entries
              </span>

              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
              >
                {PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} per page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CourierWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={fetchCouriers}
        courierToEdit={editingCourier}
      />

      <CourierViewModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        courierData={viewCourier}
      />

      <CourierDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={fetchCouriers}
        courierToDelete={courierToDelete}
        selectedIds={selectedIds}
      />
    </div>
  );
}
