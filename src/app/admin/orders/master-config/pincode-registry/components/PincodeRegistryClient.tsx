'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  MapPin, Search, Plus, UploadCloud, Download, RefreshCw, Trash2, 
  CheckCircle2, AlertTriangle, Filter, ChevronLeft, ChevronRight, 
  Loader2, FileSpreadsheet, Building2, X, Check, ShieldAlert, ArrowLeft
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface PincodeItem {
  id: number;
  pincode: string;
  cityName: string;
  stateName: string;
  stateCode: string;
}

interface StateItem {
  stateName: string;
  stateCode: string;
}

// NDJSON & JSON Parser helper
const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const items: any[] = [];
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          items.push(JSON.parse(trimmed));
        } catch (e) {
          console.error('Error parsing NDJSON line:', trimmed, e);
        }
      }
    });
    return items;
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === 'object') return [raw.data];
  }
  return [];
};

export default function PincodeRegistryClient() {
  // Main Data States
  const [pincodes, setPincodes] = useState<PincodeItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [loadingPincodes, setLoadingPincodes] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);

  // Pagination (Server-side 0-indexed page)
  const [page, setPage] = useState(0); // 0-based index for API
  const [pageSize, setPageSize] = useState(25);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Filter States
  const [pincodeFilter, setPincodeFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // Multi-Select State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Create Pincode Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingPincode, setCreatingPincode] = useState(false);
  const [newPincode, setNewPincode] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newStateName, setNewStateName] = useState('');
  const [newStateCode, setNewStateCode] = useState('');

  // Excel Bulk Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    idsToDelete: number[];
    isBulk: boolean;
  }>({
    isOpen: false,
    idsToDelete: [],
    isBulk: false,
  });
  const [deleting, setDeleting] = useState(false);

  // Center-Screen Feedback Popup Modal State
  const [feedbackPopup, setFeedbackPopup] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Fetch States Dropdown List
  const fetchStates = useCallback(async () => {
    setLoadingStates(true);
    try {
      const response = await axiosInstance.get('/order/pincode/states');
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        setStates(data);
      }
    } catch (err) {
      console.error('Fetch states error:', err);
    } finally {
      setLoadingStates(false);
    }
  }, []);

  // Fetch Pincodes List from API
  const fetchPincodes = useCallback(async () => {
    setLoadingPincodes(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(pageSize));

      const cleanPin = pincodeFilter.trim();
      if (cleanPin.length === 6) {
        params.append('pincode', cleanPin);
      }
      
      if (stateFilter.trim()) {
        params.append('state', stateFilter.trim());
      }
      
      const cleanCity = cityFilter.trim();
      if (cleanCity.length >= 3) {
        params.append('city', cleanCity);
      }

      const response = await axiosInstance.get(`/order/pincode/list?${params.toString()}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      const parsed = parseNdjson(response.data);
      setPincodes(parsed);
      setHasMoreData(parsed.length >= pageSize);
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Fetch pincodes error:', err);
      toast.error('Failed to load pincodes registry data.');
      setPincodes([]);
    } finally {
      setLoadingPincodes(false);
    }
  }, [page, pageSize, pincodeFilter, stateFilter, cityFilter]);

  // Search readiness validation (pincode must be 0 or 6 digits, city must be 0 or >=3 chars)
  const isPincodeSearchValid = pincodeFilter.trim().length === 0 || pincodeFilter.trim().length === 6;
  const isCitySearchValid = cityFilter.trim().length === 0 || cityFilter.trim().length >= 3;

  // Initial Load & Filter Change Effect
  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  useEffect(() => {
    if (isPincodeSearchValid && isCitySearchValid) {
      fetchPincodes();
    }
  }, [page, pageSize, stateFilter, fetchPincodes, isPincodeSearchValid, isCitySearchValid]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setPincodeFilter('');
    setStateFilter('');
    setCityFilter('');
    setPage(0);
  };

  // State selection in Create Modal
  const handleSelectStateInCreate = (selectedStateName: string) => {
    setNewStateName(selectedStateName);
    const foundState = states.find((s) => s.stateName === selectedStateName);
    if (foundState) {
      setNewStateCode(foundState.stateCode);
    } else {
      setNewStateCode('');
    }
  };

  // Create Pincode Submit Handler
  const handleCreatePincode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPincode.trim() || newPincode.trim().length < 6) {
      toast.error('Please enter a valid 6-digit Pincode.');
      return;
    }
    if (!newCityName.trim()) {
      toast.error('Please enter a City Name.');
      return;
    }
    if (!newStateName.trim() || !newStateCode.trim()) {
      toast.error('Please select a State.');
      return;
    }

    setCreatingPincode(true);
    const toastId = toast.loading('Creating new pincode...');

    const payload = {
      pincode: newPincode.trim(),
      cityName: newCityName.trim(),
      stateName: newStateName.trim(),
      stateCode: newStateCode.trim(),
    };

    try {
      const response = await axiosInstance.post('/order/pincode', payload);
      if (response.data?.success !== false) {
        toast.dismiss(toastId);
        setIsCreateModalOpen(false);
        setNewPincode('');
        setNewCityName('');
        setNewStateName('');
        setNewStateCode('');
        fetchPincodes();
        setFeedbackPopup({
          isOpen: true,
          type: 'success',
          title: 'Pincode Added',
          message: `Pincode ${payload.pincode} (${payload.cityName}, ${payload.stateName}) created successfully!`,
        });
      } else {
        toast.dismiss(toastId);
        const errMsg = response.data?.message || 'Failed to create pincode.';
        setFeedbackPopup({
          isOpen: true,
          type: 'error',
          title: 'Creation Failed',
          message: errMsg,
        });
      }
    } catch (err: any) {
      console.error('Create pincode error:', err);
      toast.dismiss(toastId);
      const errMsg = err.response?.data?.message || 'Failed to create pincode. Please try again.';
      setFeedbackPopup({
        isOpen: true,
        type: 'error',
        title: 'Creation Failed',
        message: errMsg,
      });
    } finally {
      setCreatingPincode(false);
    }
  };

  // Delete Action Handlers
  const handleOpenDeleteModal = (id: number) => {
    setDeleteModal({
      isOpen: true,
      idsToDelete: [id],
      isBulk: false,
    });
  };

  const handleOpenBulkDeleteModal = () => {
    if (selectedIds.length === 0) return;
    setDeleteModal({
      isOpen: true,
      idsToDelete: selectedIds,
      isBulk: true,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.idsToDelete.length === 0) return;

    setDeleting(true);
    const toastId = toast.loading(`Deleting ${deleteModal.idsToDelete.length} pincode(s)...`);

    let successCount = 0;
    let failCount = 0;

    for (const id of deleteModal.idsToDelete) {
      try {
        await axiosInstance.delete(`/order/pincode/${id}`);
        successCount++;
      } catch (err) {
        console.error(`Delete pincode ${id} error:`, err);
        failCount++;
      }
    }

    setDeleting(false);
    setDeleteModal({ isOpen: false, idsToDelete: [], isBulk: false });
    toast.dismiss(toastId);

    if (failCount === 0) {
      setFeedbackPopup({
        isOpen: true,
        type: 'success',
        title: 'Deleted Successfully',
        message: `${successCount} pincode entry(ies) deleted successfully.`,
      });
    } else {
      setFeedbackPopup({
        isOpen: true,
        type: 'error',
        title: 'Delete Process Completed',
        message: `Deleted ${successCount} item(s). Failed to delete ${failCount} item(s).`,
      });
    }

    fetchPincodes();
  };

  // Checkbox Select Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === pincodes.length && pincodes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pincodes.map((p) => p.id));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Download Registry Excel File
  const handleDownloadRegistry = async () => {
    const toastId = toast.loading('Downloading pincode registry file...');
    try {
      const response = await axiosInstance.get('/order/pincode/download', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pincode_registry_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Pincode registry downloaded!', { id: toastId });
    } catch (err) {
      console.error('Download registry error:', err);
      toast.error('Failed to download pincode registry file.', { id: toastId });
    }
  };

  // Download Upload Template Excel File
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading upload template file...');
    try {
      const response = await axiosInstance.get('/order/pincode/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pincodes_upload_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Upload template downloaded!', { id: toastId });
    } catch (err) {
      console.error('Download template error:', err);
      toast.error('Failed to download template file.', { id: toastId });
    }
  };

  // Upload Excel File Submit Handler
  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }

    setUploadingFile(true);
    const toastId = toast.loading('Uploading & processing pincode file...');

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await axiosInstance.post('/order/pincode/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.status === 'error' || response.data?.success === false) {
        toast.dismiss(toastId);
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setFeedbackPopup({
          isOpen: true,
          type: 'error',
          title: 'Upload Error',
          message: response.data?.message || 'Failed to upload pincode Excel file.',
        });
      } else {
        toast.dismiss(toastId);
        setIsUploadModalOpen(false);
        setUploadFile(null);
        fetchPincodes();
        setFeedbackPopup({
          isOpen: true,
          type: 'success',
          title: 'Upload Successful',
          message: 'Pincodes file uploaded and processed successfully!',
        });
      }
    } catch (err: any) {
      console.error('Upload Excel error:', err);
      toast.dismiss(toastId);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      const errMsg = err.response?.data?.message || 'Failed to upload file. Please check Excel format.';
      setFeedbackPopup({
        isOpen: true,
        type: 'error',
        title: 'Upload Failed',
        message: errMsg,
      });
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 w-full">

        {/* Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <MapPin size={14} />
              <span>Orders / Master Configuration</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-850 dark:text-white tracking-tight flex items-center gap-2.5">
              <MapPin className="text-blue-600 dark:text-blue-400" size={26} />
              Pincode Registry Master
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Master repository for order serviceability pincodes across India. Search by Pincode, State, or City, add entries manually, or bulk import via Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchPincodes}
              disabled={loadingPincodes}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loadingPincodes ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              type="button"
              onClick={handleDownloadRegistry}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <Download size={15} className="text-blue-600 dark:text-blue-400" />
              <span>Download Registry</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <UploadCloud size={15} />
              <span>Bulk Excel Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold shadow-md transition-all duration-150 flex items-center gap-2 hover:scale-[1.02]"
            >
              <Plus size={16} />
              <span>Add Pincode</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Filter size={15} className="text-blue-600 dark:text-blue-400" />
              <span>Filter & Search Registry</span>
            </div>

            {(pincodeFilter || stateFilter || cityFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                <X size={14} />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
            {/* Pincode Input Filter */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                Pincode Search (Exactly 6 Digits)
              </label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={pincodeFilter}
                  onChange={(e) => {
                    setPincodeFilter(e.target.value.replace(/\D/g, ''));
                    setPage(0);
                  }}
                  placeholder="Enter 6-digit Pincode..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              {pincodeFilter.trim().length > 0 && pincodeFilter.trim().length < 6 && (
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 pl-1">
                  Type 6 digits to search ({pincodeFilter.trim().length}/6)
                </p>
              )}
            </div>

            {/* State Select Filter */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                Filter by State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">All States ({states.length})</option>
                {states.map((s) => (
                  <option key={s.stateCode} value={s.stateName}>
                    {s.stateName} (Code: {s.stateCode})
                  </option>
                ))}
              </select>
            </div>

            {/* City Input Filter */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                City Search (Min 3 Chars)
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => {
                    setCityFilter(e.target.value);
                    setPage(0);
                  }}
                  placeholder="e.g. CHE, DEL, LUCK..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                />
              </div>
              {cityFilter.trim().length > 0 && cityFilter.trim().length < 3 && (
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 pl-1">
                  Type min 3 characters to search ({cityFilter.trim().length}/3)
                </p>
              )}
            </div>

            {/* Page Size Selector */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                Rows Per Page
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
              >
                <option value={10}>10 Rows</option>
                <option value={25}>25 Rows</option>
                <option value={50}>50 Rows</option>
                <option value={100}>100 Rows</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Select Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 animate-in fade-in duration-150 text-xs">
            <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-300">
              <ShieldAlert size={18} className="text-red-600 dark:text-red-400" />
              <span>{selectedIds.length} item(s) selected</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold"
              >
                Deselect All
              </button>

              <button
                type="button"
                onClick={handleOpenBulkDeleteModal}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 size={14} />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Pincode List Table Container */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4 pl-6 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === pincodes.length && pincodes.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4"
                    />
                  </th>
                  <th className="p-4">Pincode</th>
                  <th className="p-4">City Name</th>
                  <th className="p-4">State Name</th>
                  <th className="p-4 text-center">State Code</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loadingPincodes ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-blue-600" />
                        <span>Loading pincodes from master registry...</span>
                      </div>
                    </td>
                  </tr>
                ) : pincodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MapPin size={32} className="text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold text-slate-600 dark:text-slate-400">No Pincodes Found</span>
                        <span className="text-xs text-slate-400">Try adjusting your filters or search terms.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pincodes.map((item) => {
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${
                          isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="p-4 pl-6 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            className="rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4"
                          />
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200 dark:border-blue-900/40">
                            {item.pincode}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-white uppercase">
                          {item.cityName}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                          {item.stateName}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[11px] text-slate-600 dark:text-slate-300">
                            {item.stateCode || '-'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-[11px] transition-all"
                            title="Delete Pincode Entry"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 gap-3">
            <div>
              Current Page: <strong className="text-slate-800 dark:text-white">{page + 1}</strong> | Displaying <strong className="text-slate-800 dark:text-white">{pincodes.length}</strong> items
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page === 0 || loadingPincodes}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 font-semibold transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                <span>Previous Page</span>
              </button>

              <button
                type="button"
                disabled={!hasMoreData || loadingPincodes}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 font-semibold transition-colors flex items-center gap-1"
              >
                <span>Next Page</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* CREATE SINGLE PINCODE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-6 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-850 dark:text-white">Add New Pincode</h3>
                  <p className="text-xs text-slate-400">Add serviceability pincode to master registry</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePincode} className="px-6 pb-6 space-y-4 text-xs">
              {/* Pincode */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={newPincode}
                  onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 600028"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              {/* City Name */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  City Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Chennai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                  required
                />
              </div>

              {/* State Select */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStateName}
                  onChange={(e) => handleSelectStateInCreate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="">-- Select State --</option>
                  {states.map((s) => (
                    <option key={s.stateCode} value={s.stateName}>
                      {s.stateName} (Code: {s.stateCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto State Code */}
              {newStateCode && (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] flex items-center justify-between text-blue-900 dark:text-blue-300">
                  <span>State Code:</span>
                  <strong className="font-mono text-xs">{newStateCode}</strong>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPincode}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {creatingPincode ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Pincode</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EXCEL UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-6 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-850 dark:text-white">Bulk Excel Upload</h3>
                  <p className="text-xs text-slate-400">Import pincodes via spreadsheet template</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadExcel} className="px-6 pb-6 space-y-5 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Need standard template?</div>
                  <p className="text-[11px] text-slate-500">Download sample Excel file layout before uploading</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 font-semibold text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download size={13} />
                  <span>Download Template</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Select Excel File (.xlsx, .xls) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/60 dark:file:text-blue-300 transition-all border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-white dark:bg-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile || !uploadFile}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Uploading File...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      <span>Start Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center border-4 border-red-100 dark:border-red-900/30">
                <Trash2 size={32} />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                Confirm Pincode Deletion
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Are you sure you want to delete {deleteModal.idsToDelete.length} pincode entry(ies)? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, idsToDelete: [], isBulk: false })}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all duration-150 hover:scale-[1.01] flex items-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTER-SCREEN FEEDBACK POPUP MODAL */}
      {feedbackPopup.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              {feedbackPopup.type === 'success' ? (
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center border-4 border-emerald-100 dark:border-emerald-900/30">
                  <CheckCircle2 size={36} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center border-4 border-red-100 dark:border-red-900/30">
                  <AlertTriangle size={36} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                {feedbackPopup.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                {feedbackPopup.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFeedbackPopup((prev) => ({ ...prev, isOpen: false }))}
                className={`w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-150 hover:scale-[1.01] ${
                  feedbackPopup.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {feedbackPopup.type === 'success' ? 'OK / Continue' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
