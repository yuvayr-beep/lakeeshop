'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Search, RefreshCw, Loader2, 
  MapPin, ChevronLeft, ChevronRight, FileSpreadsheet, ShieldAlert, CheckCircle, XCircle, Filter, X
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner } from '@/types/courier';
import { CourierService } from '@/types/courierService';
import { ServiceablePincode } from '@/types/courierPincode';
import PincodeModal from './PincodeModal';
import PincodeBulkUploadModal from './PincodeBulkUploadModal';
import PincodeBlockModal from './PincodeBlockModal';
import PincodeDeleteModal from './PincodeDeleteModal';

interface CourierPincodesTabProps {
  courier: CourierPartner | null;
}

const LIMIT_OPTIONS = [50, 100, 250, 500, 1000];

export default function CourierPincodesTab({ courier }: CourierPincodesTabProps) {
  const [pincodes, setPincodes] = useState<ServiceablePincode[]>([]);
  const [services, setServices] = useState<CourierService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // API Server-side Filters
  const [serviceIdFilter, setServiceIdFilter] = useState<string>('ALL');
  const [shipModeFilter, setShipModeFilter] = useState<string>('ALL');
  const [pincodeQuery, setPincodeQuery] = useState<string>('');
  const [debouncedPincode, setDebouncedPincode] = useState<string>('');

  // Client-side Quick Availability Filters
  const [codFilter, setCodFilter] = useState<'ALL' | 'COD_YES' | 'PREPAID_YES' | 'ACTIVE_ONLY'>('ALL');

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [editingPincode, setEditingPincode] = useState<ServiceablePincode | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [blockModalOpen, setBlockModalOpen] = useState<boolean>(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [pincodeToDelete, setPincodeToDelete] = useState<ServiceablePincode | null>(null);

  // Pagination (limit & offset)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(100);

  // NDJSON Parser Helper
  const parseNdjson = useCallback(<T,>(raw: any): T[] => {
    if (typeof raw === 'string') {
      const parsed: T[] = [];
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
  }, []);

  // Debounce pincode search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPincode(pincodeQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [pincodeQuery]);

  // Reset to page 1 whenever any filter or limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [serviceIdFilter, shipModeFilter, debouncedPincode, limit]);

  // Fetch Services list for serviceId dropdown filter & mapping
  const fetchServices = useCallback(async () => {
    if (!courier?.id) return;
    try {
      const res = await axiosInstance.get(`/courier/services/courier/${courier.id}`, {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsedServices = parseNdjson<CourierService>(res.data);
      setServices(parsedServices);
    } catch (e) {
      console.error('Failed to load services for pincode tab:', e);
    }
  }, [courier?.id, parseNdjson]);

  // Fetch Serviceable Pincodes List using /courier/serviceable-pincodes with courierId, serviceId, shipMode, pincode, limit, offset
  const fetchPincodes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const offset = (currentPage - 1) * limit;
      const params: Record<string, any> = {
        limit,
        offset,
      };

      if (courier?.id) {
        params.courierId = courier.id;
      }
      if (serviceIdFilter !== 'ALL' && serviceIdFilter) {
        params.serviceId = Number(serviceIdFilter);
      }
      if (shipModeFilter !== 'ALL' && shipModeFilter) {
        params.shipMode = shipModeFilter;
      }
      if (debouncedPincode) {
        params.pincode = debouncedPincode;
      }

      const res = await axiosInstance.get('/courier/serviceable-pincodes', {
        params,
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson' },
      });

      const parsed = parseNdjson<ServiceablePincode>(res.data);
      setPincodes(parsed);
    } catch (err: any) {
      console.error('Failed to load serviceable pincodes:', err);
      setError('Failed to load serviceable pincodes list.');
      toast.error('Failed to load serviceable pincodes');
    } finally {
      setLoading(false);
    }
  }, [courier?.id, serviceIdFilter, shipModeFilter, debouncedPincode, limit, currentPage, parseNdjson]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    fetchPincodes();
  }, [fetchPincodes]);

  // Display Helper for Service Name
  const getServiceName = (item: ServiceablePincode): string => {
    if (item.serviceName) {
      return `${item.serviceName} (${item.serviceType || item.serviceCode || 'MODE'})`;
    }
    if (item.serviceCode) {
      return `${item.serviceCode} (${item.serviceType || 'MODE'})`;
    }
    const s = services.find((srv) => srv.id === item.courierServiceId);
    if (s) return `${s.serviceName || s.serviceCode} (${s.serviceType})`;
    return `Service #${item.courierServiceId}`;
  };

  // Client-side Availability Quick Filters
  const filteredPincodes = useMemo(() => {
    return pincodes.filter((p) => {
      let matchesFilter = true;
      if (codFilter === 'COD_YES') matchesFilter = Boolean(p.codAvailable);
      if (codFilter === 'PREPAID_YES') matchesFilter = Boolean(p.prepaidAvailable);
      if (codFilter === 'ACTIVE_ONLY') matchesFilter = p.active !== false && p.status !== false;

      return matchesFilter;
    });
  }, [pincodes, codFilter]);

  const hasActiveFilters =
    serviceIdFilter !== 'ALL' ||
    shipModeFilter !== 'ALL' ||
    Boolean(pincodeQuery) ||
    codFilter !== 'ALL';

  const resetAllFilters = () => {
    setServiceIdFilter('ALL');
    setShipModeFilter('ALL');
    setPincodeQuery('');
    setDebouncedPincode('');
    setCodFilter('ALL');
    setCurrentPage(1);
  };

  const handleCreate = () => {
    setEditingPincode(null);
    setAddModalOpen(true);
  };

  const handleEdit = (item: ServiceablePincode) => {
    setEditingPincode(item);
    setAddModalOpen(true);
  };

  const handleDelete = (item: ServiceablePincode) => {
    setPincodeToDelete(item);
    setDeleteModalOpen(true);
  };

  const currentOffset = (currentPage - 1) * limit;
  const startIdx = filteredPincodes.length === 0 ? 0 : currentOffset + 1;
  const endIdx = currentOffset + filteredPincodes.length;
  const hasNextPage = pincodes.length === limit;

  return (
    <div className="space-y-4">
      {/* Filters & Actions Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        {/* Top Line: Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Filter by Pincode Input */}
            <div className="relative w-full sm:w-56">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={pincodeQuery}
                onChange={(e) => setPincodeQuery(e.target.value)}
                placeholder="Filter by pincode..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              {pincodeQuery && (
                <button
                  onClick={() => setPincodeQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter by Courier Service Dropdown (serviceId) */}
            <div className="w-full sm:w-48">
              <select
                value={serviceIdFilter}
                onChange={(e) => setServiceIdFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="ALL">All Services</option>
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.serviceName || srv.serviceCode} ({srv.serviceType})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Shipping Mode Dropdown (shipMode) */}
            <div className="w-full sm:w-40">
              <select
                value={shipModeFilter}
                onChange={(e) => setShipModeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="ALL">All Ship Modes</option>
                <option value="SURFACE">SURFACE</option>
                <option value="DP">DP</option>
                <option value="BOTH">BOTH</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 rounded-xl transition-all flex items-center gap-1.5"
                title="Reset all search filters"
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            <button
              onClick={fetchPincodes}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors shadow-sm"
              title="Refresh List"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setBlockModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              title="Bulk Block or Unblock Pincodes"
            >
              <ShieldAlert size={15} />
              Block / Unblock
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              title="Bulk Upload Pincodes Excel"
            >
              <FileSpreadsheet size={15} />
              Excel Upload
            </button>

            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:opacity-95"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Plus size={16} />
              Add Pincode
            </button>
          </div>
        </div>

        {/* Bottom Line: Quick Availability Pills & Records Limit Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'COD_YES', label: 'COD Available' },
              { id: 'PREPAID_YES', label: 'Prepaid Available' },
              { id: 'ACTIVE_ONLY', label: 'Active Only' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCodFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  codFilter === f.id
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Limit per page:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pincodes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Pincode</th>
                <th className="p-4">Courier Service</th>
                <th className="p-4 text-center">COD Available</th>
                <th className="p-4 text-center">Prepaid Available</th>
                <th className="p-4 text-center">Expected Delivery</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
                      <span className="text-xs font-semibold">Loading serviceable pincodes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPincodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MapPin size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Serviceable Pincodes Found</p>
                      <p className="text-xs text-slate-400">
                        {hasActiveFilters
                          ? 'No pincodes match your selected search and filter criteria.'
                          : 'Click "Add Pincode" or "Excel Upload" to add serviceability mappings.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetAllFilters}
                          className="mt-2 text-xs font-bold text-[var(--primary)] hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPincodes.map((item, idx) => {
                  const sno = currentOffset + idx + 1;
                  const isActive = item.active !== false && item.status !== false;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{sno}</td>

                      {/* Pincode */}
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 inline-block shadow-2xs">
                          {item.pincode}
                        </span>
                      </td>

                      {/* Courier Service */}
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                        {getServiceName(item)}
                      </td>

                      {/* COD Available */}
                      <td className="p-4 text-center">
                        {item.codAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle size={12} />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <XCircle size={12} />
                            No
                          </span>
                        )}
                      </td>

                      {/* Prepaid Available */}
                      <td className="p-4 text-center">
                        {item.prepaidAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <CheckCircle size={12} />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <XCircle size={12} />
                            No
                          </span>
                        )}
                      </td>

                      {/* Expected Delivery */}
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.expectedDeliveryDays ? `${item.expectedDeliveryDays} Days` : 'Standard'}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Edit Pincode"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Pincode"
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

        {/* Footer Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {filteredPincodes.length > 0 ? (
              <span>
                Showing <strong>{startIdx}</strong> to <strong>{endIdx}</strong> (Page <strong>{currentPage}</strong> with limit <strong>{limit}</strong>)
              </span>
            ) : (
              <span>No pincode records to display</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              Page {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!hasNextPage || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PincodeModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchPincodes}
        courier={courier}
        services={services}
        pincodeToEdit={editingPincode}
      />

      <PincodeBulkUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={fetchPincodes}
        courier={courier}
      />

      <PincodeBlockModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        onSuccess={fetchPincodes}
        courier={courier}
      />

      <PincodeDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={fetchPincodes}
        pincodeToDelete={pincodeToDelete}
      />
    </div>
  );
}
