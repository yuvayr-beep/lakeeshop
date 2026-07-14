'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Download, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, AlertCircle, Map, Layers, Check
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import LocationModal from './LocationModal';
import Modal from '@/components/ui/Modal';

interface Location {
  id: number;
  warehouseId: number | null;
  warehouseName: string | null;
  locationCode: string | null;
  rackNo: string | null;
  shelfNo: string | null;
  binNo: string | null;
  zoneName: string | null;
  locationType: number | null;
  description: string | null;
  capacityWeight: number | null;
  capacityVolume: number | null;
  status: boolean;
}

interface LocationType {
  code: number;
  name: string;
}

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

const STATIC_TYPE_MAP: Record<number, string> = {
  1: 'BIN',
  2: 'PALLET',
  3: 'FLOOR',
  4: 'STAGING',
  5: 'DAMAGE',
  6: 'QC'
};

export default function LocationManagementClient() {
  // Data state
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationTypes, setLocationTypes] = useState<LocationType[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Delete Confirm modals state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Parse NDJSON
  const parseNdjson = (rawString: any): Location[] => {
    if (typeof rawString === 'string') {
      const parsed: Location[] = [];
      rawString.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            // Check for malformed JSON where string properties are unquoted (e.g. "warehouseName":ATM Square)
            // We fix unquoted values for "warehouseName": ATM Square
            let cleanedLine = trimmed;
            if (cleanedLine.includes('"warehouseName":') && !cleanedLine.includes('"warehouseName":"')) {
              cleanedLine = cleanedLine.replace(/"warehouseName":\s*([^,"}]+)/, '"warehouseName":"$1"');
            }
            parsed.push(JSON.parse(cleanedLine));
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

  // Fetch active location types
  const fetchLocationTypes = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/stock/location/types');
      if (Array.isArray(data)) {
        setLocationTypes(data);
      }
    } catch (err) {
      console.error('Failed to load location types:', err);
    }
  }, []);

  // Fetch active locations
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/stock/location/active', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson(response.data);
      setLocations(parsed);
      setSelectedIds([]); // Clear selection
    } catch (err: any) {
      console.error('Failed to load locations:', err);
      setError('Failed to load inventory storage locations.');
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocationTypes();
    fetchLocations();
  }, [fetchLocationTypes, fetchLocations]);

  // Translate location type ID to text
  const getLocationTypeName = (typeCode: number | null): string => {
    if (typeCode === null) return 'UNKNOWN';
    const match = locationTypes.find((t) => t.code === typeCode);
    return match ? match.name : (STATIC_TYPE_MAP[typeCode] || `TYPE-${typeCode}`);
  };

  // Search filter
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const q = searchQuery.toLowerCase();
    return locations.filter((loc) => {
      const code = (loc.locationCode || '').toLowerCase();
      const whName = (loc.warehouseName || '').toLowerCase();
      const zone = (loc.zoneName || '').toLowerCase();
      const desc = (loc.description || '').toLowerCase();
      const typeStr = getLocationTypeName(loc.locationType).toLowerCase();
      
      return (
        code.includes(q) ||
        whName.includes(q) ||
        zone.includes(q) ||
        desc.includes(q) ||
        typeStr.includes(q)
      );
    });
  }, [locations, searchQuery, locationTypes]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLocations.slice(start, start + itemsPerPage);
  }, [filteredLocations, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / itemsPerPage));

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

  const startIdx = filteredLocations.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredLocations.length);
  const totalCount = filteredLocations.length;

  // Selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((sid) => sid !== id)));
  };

  const isAllPageSelected = paginated.length > 0 && paginated.every((l) => selectedIds.includes(l.id));

  // CRUD Actions
  const handleCreateClick = () => {
    setEditingLocation(null);
    setModalOpen(true);
  };

  const handleEdit = (loc: Location) => {
    setEditingLocation(loc);
    setModalOpen(true);
  };

  // Delete Action triggers custom Modal
  const handleDeleteTrigger = (loc: Location) => {
    setLocationToDelete(loc);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    const { id, locationCode } = locationToDelete;

    setDeleteConfirmOpen(false);
    setLocationToDelete(null);

    const toastId = toast.loading(`Deleting location "${locationCode}"...`);
    try {
      await axiosInstance.delete(`/stock/location/${id}`);
      toast.success('Storage location deleted successfully', { id: toastId });
      setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
      fetchLocations();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Failed to delete storage location.';
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
    const toastId = toast.loading(`Deleting ${count} storage locations...`);

    try {
      await Promise.all(selectedIds.map((id) => axiosInstance.delete(`/stock/location/${id}`)));
      toast.success('Selected storage locations deleted successfully', { id: toastId });
      setSelectedIds([]);
      fetchLocations();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete some storage locations.', { id: toastId });
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
      script.onload = () => resolve((window as any).XLSX);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  // Excel Export
  const handleExportExcel = async () => {
    if (locations.length === 0) {
      toast.error('No storage location data available to export.');
      return;
    }

    setExportingExcel(true);
    const toastId = toast.loading('Generating Excel file...');

    try {
      const headers = [
        'Location ID',
        'Location Code',
        'Warehouse',
        'Zone',
        'Rack',
        'Shelf',
        'Bin',
        'Location Type',
        'Capacity Weight (kg)',
        'Capacity Volume (L)',
        'Description',
        'Status'
      ];
      
      const rows = locations.map((loc) => [
        loc.id,
        loc.locationCode || '',
        loc.warehouseName || '',
        loc.zoneName || '',
        loc.rackNo || '',
        loc.shelfNo || '',
        loc.binNo || '',
        getLocationTypeName(loc.locationType),
        loc.capacityWeight ?? '',
        loc.capacityVolume ?? '',
        loc.description || '',
        loc.status ? 'Active' : 'Inactive'
      ]);

      const XLSX = await loadSheetJS();
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Auto-fit column widths
      const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        rows.forEach((row) => {
          const val = String(row[i] ?? '');
          if (val.length > maxLen) {
            maxLen = val.length;
          }
        });
        return { wch: maxLen + 3 };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Storage Locations");

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", `storage_locations_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${locations.length} locations to Excel`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export storage locations to Excel.', { id: toastId });
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
            <Layers size={22} className="text-blue-600 dark:text-blue-400" />
            Inventory Storage Locations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure warehouses bins, shelves, racks, staging, and QC spots.
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
            disabled={exportingExcel || locations.length === 0}
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
            Create Location
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
            placeholder="Search code, warehouse, zone, type, description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
          />
        </div>
        <button
          onClick={fetchLocations}
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
            <p className="text-sm font-medium">Fetching storage locations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchLocations}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <Layers size={44} className="text-slate-300 dark:text-slate-750 mb-3" />
            <p className="text-sm font-medium">No storage locations found</p>
            <p className="text-xs text-slate-550 mt-1">Add a new warehouse storage location to start configuration.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
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
                  <th className="w-44 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Location Code</th>
                  <th className="w-48 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Warehouse</th>
                  <th className="w-24 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Zone</th>
                  <th className="w-48 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Position (R/S/B)</th>
                  <th className="w-36 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Type</th>
                  <th className="w-44 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Capacities</th>
                  <th className="w-24 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Status</th>
                  <th className="w-24 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginated.map((loc, index) => {
                  const isSelected = selectedIds.includes(loc.id);
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={loc.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                        isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(loc.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {serialNumber}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-bold text-slate-900 dark:text-white truncate">
                        {loc.locationCode || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-350 truncate">
                        {loc.warehouseName || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-650 dark:text-slate-300">
                        {loc.zoneName ? (
                          <span className="font-mono bg-blue-50 dark:bg-blue-950/15 text-blue-650 dark:text-blue-400 px-1.5 py-0.5 rounded">
                            {loc.zoneName}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-450">
                        <span className="tabular-nums">
                          Rack: {loc.rackNo || '-'} / Shelf: {loc.shelfNo || '-'} / Bin: {loc.binNo || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-300 px-2 py-0.5 rounded text-[10px]">
                          {getLocationTypeName(loc.locationType)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-650 dark:text-slate-400">
                        <div className="flex flex-col gap-0.5 text-[10px] tabular-nums">
                          <span>W: {loc.capacityWeight !== null ? `${loc.capacityWeight} kg` : 'N/A'}</span>
                          <span>V: {loc.capacityVolume !== null ? `${loc.capacityVolume} L` : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          loc.status
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {loc.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(loc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                            title="Edit Location"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTrigger(loc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-650 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                            title="Delete Location"
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
        {!loading && filteredLocations.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-250 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                Showing {startIdx}–{endIdx} of {totalCount} locations
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
      <LocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        locationItem={editingLocation}
        locationTypes={locationTypes}
        onSuccess={() => {
          setModalOpen(false);
          fetchLocations();
        }}
      />

      {/* Single Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setLocationToDelete(null);
        }}
        title="Delete Storage Location"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false);
                setLocationToDelete(null);
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
              Delete storage location?
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-555 mt-1 font-medium leading-relaxed font-mono">
              Are you sure you want to delete storage location "{locationToDelete?.locationCode}"? This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        title="Delete Selected Locations"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setBatchDeleteOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-300 transition-all"
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
              Delete multiple locations?
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium leading-relaxed">
              You are about to delete <span className="font-bold text-slate-850 dark:text-white">{selectedIds.length} selected locations</span>. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
