'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Search, RefreshCw, Loader2, 
  Layers, ChevronLeft, ChevronRight, FileSpreadsheet, X
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner } from '@/types/courier';
import { CourierZone } from '@/types/courierZone';
import ZoneModal from './ZoneModal';
import ZoneBulkUploadModal from './ZoneBulkUploadModal';
import ZoneDeleteModal from './ZoneDeleteModal';

interface CourierZonesTabProps {
  courier: CourierPartner | null;
}

const LIMIT_OPTIONS = [20, 50, 100, 250];

export default function CourierZonesTab({ courier }: CourierZonesTabProps) {
  const [zones, setZones] = useState<CourierZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [shipModeFilter, setShipModeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [editingZone, setEditingZone] = useState<CourierZone | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [zoneToDelete, setZoneToDelete] = useState<CourierZone | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);

  // NDJSON & JSON Parser Helper
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

  // Fetch Zones List
  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const courierId = courier?.id || 1;
      const params: Record<string, any> = {
        courierId,
      };

      if (shipModeFilter !== 'ALL' && shipModeFilter) {
        params.shipMode = shipModeFilter;
      }

      const res = await axiosInstance.get('/courier/zones', {
        params,
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson' },
      });

      const parsed = parseNdjson<CourierZone>(res.data);
      setZones(parsed);
    } catch (err: any) {
      console.error('Failed to load courier zones:', err);
      setError('Failed to load courier zones list.');
      toast.error('Failed to load courier zones');
    } finally {
      setLoading(false);
    }
  }, [courier?.id, shipModeFilter, parseNdjson]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [shipModeFilter, searchQuery, limit]);

  // Filtered list
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = z.zoneCode?.toLowerCase().includes(q);
      const nameMatch = z.zoneName?.toLowerCase().includes(q);
      const modeMatch = z.shipMode?.toLowerCase().includes(q);
      return codeMatch || nameMatch || modeMatch;
    });
  }, [zones, searchQuery]);

  const hasActiveFilters = shipModeFilter !== 'ALL' || Boolean(searchQuery);

  const resetAllFilters = () => {
    setShipModeFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleCreate = () => {
    setEditingZone(null);
    setAddModalOpen(true);
  };

  const handleEdit = (item: CourierZone) => {
    setEditingZone(item);
    setAddModalOpen(true);
  };

  const handleDelete = (item: CourierZone) => {
    setZoneToDelete(item);
    setDeleteModalOpen(true);
  };

  // Pagination calculation
  const totalItems = filteredZones.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentOffset = (currentPage - 1) * limit;
  const paginatedZones = useMemo(() => {
    return filteredZones.slice(currentOffset, currentOffset + limit);
  }, [filteredZones, currentOffset, limit]);

  const startIdx = totalItems === 0 ? 0 : currentOffset + 1;
  const endIdx = Math.min(currentOffset + limit, totalItems);

  return (
    <div className="space-y-4">
      {/* Filters & Actions Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        {/* Top Line: Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search zone code or name..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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

            {/* Filter by Ship Mode Dropdown */}
            <div className="w-full sm:w-44">
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
              onClick={fetchZones}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors shadow-sm"
              title="Refresh List"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              title="Bulk Upload Zones Excel"
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
              Add Zone
            </button>
          </div>
        </div>

        {/* Bottom Line: Limit picker */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="text-xs font-semibold text-slate-400">
            Zones configured for <strong className="text-slate-700 dark:text-slate-200">{courier?.courierName || 'Selected Courier'}</strong>
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

      {/* Zones Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Zone Code</th>
                <th className="p-4">Zone Name / Description</th>
                <th className="p-4 text-center">Ship Mode</th>
                <th className="p-4">Courier Partner</th>
                <th className="p-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
                      <span className="text-xs font-semibold">Loading courier zones...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedZones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Courier Zones Found</p>
                      <p className="text-xs text-slate-400">
                        {hasActiveFilters
                          ? 'No zone records match your selected search and filter criteria.'
                          : 'Click "Add Zone" or "Excel Upload" to configure courier delivery zones.'}
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
                paginatedZones.map((item, idx) => {
                  const sno = currentOffset + idx + 1;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{sno}</td>

                      {/* Zone Code */}
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-[var(--primary)] border border-slate-200 dark:border-slate-700 inline-block shadow-2xs">
                          {item.zoneCode}
                        </span>
                      </td>

                      {/* Zone Name */}
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                        {item.zoneName}
                      </td>

                      {/* Ship Mode */}
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {item.shipMode}
                        </span>
                      </td>

                      {/* Courier Partner */}
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{item.courierName || courier?.courierName || 'Courier'}</span>
                        {item.courierCode && (
                          <span className="ml-1 text-[11px] text-slate-400">({item.courierCode})</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Edit Zone"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Zone"
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
            {totalItems > 0 ? (
              <span>
                Showing <strong>{startIdx}</strong> to <strong>{endIdx}</strong> of <strong>{totalItems}</strong> records (Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>)
              </span>
            ) : (
              <span>No zone records to display</span>
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
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ZoneModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchZones}
        courier={courier}
        zoneToEdit={editingZone}
      />

      <ZoneBulkUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={fetchZones}
        courier={courier}
      />

      <ZoneDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={fetchZones}
        zoneToDelete={zoneToDelete}
      />
    </div>
  );
}
