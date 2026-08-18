'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Trash2, ArrowRight, Search, FileUp, Loader2, RefreshCw, AlertCircle, Calendar, Filter, Download, Tag, FileText, Plus, Merge } from 'lucide-react';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchOrderItem } from '@/types/batchOrder';
import { DeleteBatchModal } from './DeleteBatchModal';
import { CreateSingleOrderModal } from './CreateSingleOrderModal';
import { CombineOrdersModal } from './CombineOrdersModal';

interface Step1UploadFormProps {
  onBatchCreated: (batchId: number, uploadResult?: any) => void;
}

export const Step1UploadForm: React.FC<Step1UploadFormProps> = ({ onBatchCreated }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('33');
  const [businessUnitId, setBusinessUnitId] = useState<string>('6');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [orderFileDate, setOrderFileDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSingleOrderModal, setShowSingleOrderModal] = useState<boolean>(false);
  const [showCombineModal, setShowCombineModal] = useState<boolean>(false);

  const clientOptions = [
    { id: '33', name: 'AXIS BANK', buId: '6' },
    { id: '34', name: 'EARNEST', buId: '6' },
    { id: '35', name: 'XOXODAY', buId: '6' },
    { id: '36', name: 'HDFC BANK', buId: '6' },
    { id: '37', name: 'ICICI BANK', buId: '6' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select an Order Excel file to upload.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const res = await batchOrderService.uploadBatch(
        Number(selectedClientId),
        Number(businessUnitId),
        1,
        selectedFile
      );

      const batchData = res?.data || res;
      const batchId = batchData?.batchId;

      if (!batchId) {
        throw new Error(res?.message || 'Upload succeeded but batch ID was not returned.');
      }

      await batchOrderService.validateBatch(batchId);
      onBatchCreated(batchId, batchData);
    } catch (err: any) {
      console.error('Batch Upload Error:', err);
      let msg = err.response?.data?.message || err.message || 'Error uploading order file.';
      
      if (
        msg.toLowerCase().includes('duplicate upload') ||
        msg.toLowerCase().includes('file_hash') ||
        msg.toLowerCase().includes('bad sql grammar') ||
        msg.toLowerCase().includes('executemany')
      ) {
        msg = 'Duplicate File Upload Detected: This exact order file has already been uploaded for this client. Please upload a new order spreadsheet or resume processing the existing batch from the table below.';
      }
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="font-semibold">{errorMessage}</div>
        </div>
      )}

      {/* Header Row: Heading + Combine API Orders Button + Create Order Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Batch Order Excel Upload
            </h2>
            <p className="text-xs text-slate-500">
              Select client details and upload batch order spreadsheet (.xlsx, .csv)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowCombineModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 shadow-2xs hover:bg-purple-100 hover:shadow-xs dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300 transition-all shrink-0 active:scale-95"
          >
            <Merge className="h-4 w-4" />
            <span>Combine API Orders</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSingleOrderModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 hover:shadow-md transition-all shrink-0 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {/* Single Order Creation Modal */}
      <CreateSingleOrderModal
        isOpen={showSingleOrderModal}
        onClose={() => setShowSingleOrderModal(false)}
        onOrderCreated={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshRecentBatches'));
          }
        }}
      />

      {/* Combine Orders Modal */}
      <CombineOrdersModal
        isOpen={showCombineModal}
        onClose={() => setShowCombineModal(false)}
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshRecentBatches'));
          }
        }}
      />

      <form onSubmit={handleUploadSubmit} className="mt-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Client Name */}
          <div className="w-full sm:w-60 lg:w-64">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Client Name <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                const found = clientOptions.find((c) => c.id === e.target.value);
                if (found) setBusinessUnitId(found.buId);
              }}
              className="w-full h-[42px] rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Order File Date */}
          <div className="w-full sm:w-48 lg:w-52">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Order File Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={orderFileDate}
              onChange={(e) => setOrderFileDate(e.target.value)}
              className="w-full h-[42px] rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Order File */}
          <div className="flex-1 min-w-[260px]">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Order File (.xlsx, .csv) <span className="text-red-500">*</span>
              </label>
              {selectedFile && (
                <span
                  title={`Ready: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[220px]"
                >
                  Ready: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
            <div className="flex h-[42px] items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Upload Button */}
          <div className="shrink-0">
            <button
              type="submit"
              disabled={uploading}
              className="flex h-[42px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Batch File
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

interface RecentOrderBatchesCardProps {
  onResumeBatch: (batchId: number, batchNo?: string) => void;
}

// Helper to determine status details and UI badges
const getBatchStatusDetails = (b: BatchOrderItem) => {
  const totalCount = b.totalOrderCount ?? b.totalRows ?? 0;
  const passCount = b.passCount ?? b.savedRows ?? b.passRows ?? 0;
  const failCount = b.failCount ?? b.failedRows ?? 0;

  // 1. If 0 failures and passCount > 0 (or passCount === totalCount), batch is PASSED/VALIDATED
  if (failCount === 0 && passCount > 0 && totalCount > 0) {
    const val = b.batchStatus !== undefined ? b.batchStatus : b.status;
    const num = Number(val);
    if (num === 3) {
      return {
        code: 3,
        label: 'SUBMITTED',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      };
    }
    return {
      code: 2,
      label: 'VALIDATED',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    };
  }

  // 2. If failCount > 0 and 0 passed -> FAILED
  if (failCount > 0 && passCount === 0) {
    return {
      code: 4,
      label: 'FAILED',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    };
  }

  // 3. Evaluate by numeric batchStatus enum if present
  const val = b.batchStatus !== undefined ? b.batchStatus : b.status;
  const num = Number(val);

  if (!isNaN(num) && num > 0) {
    switch (num) {
      case 1:
        return {
          code: 1,
          label: 'RECEIVED',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        };
      case 2:
        return {
          code: 2,
          label: 'VALIDATED',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 3:
        return {
          code: 3,
          label: 'SUBMITTED',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        };
      case 4:
        return {
          code: 4,
          label: 'FAILED',
          badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
        };
      case 5:
        return {
          code: 5,
          label: 'MOVED / CANCELLED',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        };
      default:
        break;
    }
  }

  const str = String(val || '').toUpperCase();
  if (str.includes('RECEIV') || str.includes('UPLOAD')) {
    return {
      code: 1,
      label: 'RECEIVED',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    };
  }
  if (str.includes('VALIDAT') || str.includes('PASS')) {
    return {
      code: 2,
      label: 'VALIDATED',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  if (str.includes('SUBMIT')) {
    return {
      code: 3,
      label: 'SUBMITTED',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    };
  }
  if (str.includes('FAIL')) {
    return {
      code: 4,
      label: 'FAILED',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    };
  }
  if (str.includes('MOVE') || str.includes('CANCEL')) {
    return {
      code: 5,
      label: 'MOVED / CANCELLED',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };
  }

  return {
    code: 0,
    label: str || 'UNKNOWN',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  };
};

// Helper to determine Source details and UI badges
const getSourceDetails = (sourceId?: number | string) => {
  const num = Number(sourceId);
  switch (num) {
    case 1:
      return {
        code: 1,
        label: 'EXCEL',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 2:
      return {
        code: 2,
        label: 'API',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      };
    case 3:
      return {
        code: 3,
        label: 'B2B',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      };
    case 4:
      return {
        code: 4,
        label: 'MANUAL',
        badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
      };
    default:
      return {
        code: 0,
        label: sourceId !== undefined && sourceId !== null ? String(sourceId) : 'EXCEL',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
      };
  }
};

export const RecentOrderBatchesCard: React.FC<RecentOrderBatchesCardProps> = ({ onResumeBatch }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const past30DaysDate = new Date();
  past30DaysDate.setDate(past30DaysDate.getDate() - 30);
  const past30DaysStr = past30DaysDate.toISOString().split('T')[0];

  const [filterStartDate, setFilterStartDate] = useState<string>(past30DaysStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);
  const [filterClientId, setFilterClientId] = useState<string>('ALL');
  const [filterBatchStatus, setFilterBatchStatus] = useState<string>('DEFAULT');
  const [filterSourceId, setFilterSourceId] = useState<string>('ALL');

  const [batchList, setBatchList] = useState<BatchOrderItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [batchToDelete, setBatchToDelete] = useState<BatchOrderItem | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const clientOptions = [
    { id: '33', name: 'AXIS BANK', buId: '6' },
    { id: '34', name: 'EARNEST', buId: '6' },
    { id: '35', name: 'XOXODAY', buId: '6' },
    { id: '36', name: 'HDFC BANK', buId: '6' },
    { id: '37', name: 'ICICI BANK', buId: '6' },
  ];

  const handleDownloadCount = async (
    e: React.MouseEvent,
    batchId: number | undefined,
    type: 'ALL' | 'PASS' | 'WARN' | 'FAIL',
    batchNo?: string
  ) => {
    e.stopPropagation();
    if (!batchId) return;
    const key = `${batchId}_${type}`;
    try {
      setDownloadingKey(key);
      await batchOrderService.downloadBatchOrders(batchId, type, batchNo);
    } catch (err) {
      console.error(`Failed to download ${type} orders for batch ${batchId}:`, err);
      alert(`Failed to download ${type} orders file. Please try again.`);
    } finally {
      setDownloadingKey(null);
    }
  };

  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await batchOrderService.getBatchList({
        startDate: filterStartDate,
        endDate: filterEndDate,
        clientId: filterClientId !== 'ALL' ? filterClientId : undefined,
        batchStatus: filterBatchStatus !== 'DEFAULT' && filterBatchStatus !== 'ALL' ? filterBatchStatus : undefined,
        sourceId: filterSourceId !== 'ALL' ? filterSourceId : undefined,
      });

      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      if (Array.isArray(list)) {
        setBatchList(list);
      } else {
        setBatchList([]);
      }
    } catch (err) {
      console.warn('Could not fetch batch list:', err);
      setBatchList([]);
    } finally {
      setLoadingBatches(false);
    }
  }, [filterStartDate, filterEndDate, filterClientId, filterBatchStatus, filterSourceId]);

  useEffect(() => {
    fetchBatches();

    const handleRefresh = () => {
      fetchBatches();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('refreshRecentBatches', handleRefresh);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('refreshRecentBatches', handleRefresh);
      }
    };
  }, [fetchBatches]);

  const handleDeleteTrigger = (batch: BatchOrderItem) => {
    setBatchToDelete(batch);
  };

  const filteredBatches = batchList.filter((b) => {
    const matchesSearch =
      !searchQuery ||
      b.batchNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clientCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.orderFileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(b.batchId || b.id).includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterSourceId !== 'ALL' && b.sourceId !== undefined && b.sourceId !== null) {
      if (Number(b.sourceId) !== Number(filterSourceId)) {
        return false;
      }
    }

    const statusDetails = getBatchStatusDetails(b);

    if (filterBatchStatus === 'DEFAULT') {
      // By default display 2 (VALIDATED) and 1 (RECEIVED) status list
      return statusDetails.code === 1 || statusDetails.code === 2;
    } else if (filterBatchStatus !== 'ALL') {
      return statusDetails.code === Number(filterBatchStatus);
    }

    return true;
  });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Order Batches
          </h3>
          <p className="text-xs text-slate-500">
            Fetched for date range ({filterStartDate} to {filterEndDate})
          </p>
        </div>

        {/* Date & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-xs"
            />
          </div>

          {/* Client Filter Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-xs font-medium"
            >
              <option value="ALL">All Clients</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Source ID Filter Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterSourceId}
              onChange={(e) => setFilterSourceId(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-xs font-medium"
            >
              <option value="ALL">All Sources (Default)</option>
              <option value="1">1: EXCEL</option>
              <option value="2">2: API</option>
              <option value="3">3: B2B</option>
              <option value="4">4: MANUAL</option>
            </select>
          </div>

          {/* Batch Status Filter Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterBatchStatus}
              onChange={(e) => setFilterBatchStatus(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-xs font-medium"
            >
              <option value="DEFAULT">RECEIVED & VALIDATED</option>
              <option value="ALL">All Statuses</option>
              <option value="1">RECEIVED</option>
              <option value="2">VALIDATED</option>
              <option value="3">SUBMITTED</option>
              <option value="4">FAILED</option>
              <option value="5">MOVED / CANCELLED</option>
            </select>
          </div>

          <button
            onClick={fetchBatches}
            title="Refresh order batches"
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batch or file..."
              className="w-48 rounded-xl border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <th className="px-4 py-3 font-semibold uppercase">CLIENT NAME</th>
              <th className="px-4 py-3 font-semibold uppercase">BATCH NO & FILE</th>
              <th className="px-4 py-3 font-semibold uppercase">SOURCE</th>
              <th className="px-4 py-3 font-semibold uppercase">UPLOADED AT</th>
              <th className="px-4 py-3 font-semibold uppercase">STATUS</th>
              <th className="px-4 py-3 font-semibold uppercase">TOTAL</th>
              <th className="px-4 py-3 font-semibold uppercase">PASS</th>
              <th className="px-4 py-3 font-semibold uppercase">WARN</th>
              <th className="px-4 py-3 font-semibold uppercase">FAIL</th>
              <th className="px-4 py-3 text-center font-semibold uppercase">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loadingBatches ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                  <span className="mt-2 block text-xs">Loading order batches...</span>
                </td>
              </tr>
            ) : filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  No order batches found for date range ({filterStartDate} to {filterEndDate}) and selected filters.
                </td>
              </tr>
            ) : (
              filteredBatches.map((b) => {
                const targetBatchId = b.batchId || b.id;
                const clientDisplayName = b.clientName || b.clientCode || 'N/A';
                const dateStr = b.uploadedAt
                  ? b.uploadedAt.replace('T', ' ').substring(0, 16)
                  : b.orderDate || new Date().toISOString().split('T')[0];
                const batchNoStr = b.batchNo || (targetBatchId ? `202600${targetBatchId}` : 'N/A');
                const totalCount = b.totalOrderCount ?? b.totalRows ?? 0;
                const passCount = b.passCount ?? b.savedRows ?? b.passRows ?? 0;
                const warningCount = b.warningCount ?? b.warningRows ?? 0;
                const failCount = b.failCount ?? b.failedRows ?? 0;
                const statusInfo = getBatchStatusDetails(b);
                const sourceInfo = getSourceDetails(b.sourceId);

                return (
                  <tr
                    key={targetBatchId || Math.random()}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div>{clientDisplayName}</div>
                      {b.businessUnitName && (
                        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                          {b.businessUnitName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {batchNoStr}
                      </div>
                      {b.orderFileName && (
                        <div className="flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={b.orderFileName}>
                          <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{b.orderFileName}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${sourceInfo.badgeClass}`}>
                        {sourceInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => handleDownloadCount(e, targetBatchId, 'ALL', batchNoStr)}
                        disabled={downloadingKey === `${targetBatchId}_ALL`}
                        title="Click to download ALL orders excel"
                        className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer group transition-colors"
                      >
                        <span>{totalCount}</span>
                        {downloadingKey === `${targetBatchId}_ALL` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        ) : (
                          <Download className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => handleDownloadCount(e, targetBatchId, 'PASS', batchNoStr)}
                        disabled={downloadingKey === `${targetBatchId}_PASS`}
                        title="Click to download PASS orders excel"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline cursor-pointer group transition-colors"
                      >
                        <span>{passCount}</span>
                        {downloadingKey === `${targetBatchId}_PASS` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                        ) : (
                          <Download className="h-3 w-3 text-emerald-500/60 opacity-60 group-hover:opacity-100 group-hover:text-emerald-600 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => handleDownloadCount(e, targetBatchId, 'WARN', batchNoStr)}
                        disabled={downloadingKey === `${targetBatchId}_WARN`}
                        title="Click to download WARN orders excel"
                        className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:underline cursor-pointer group transition-colors"
                      >
                        <span>{warningCount}</span>
                        {downloadingKey === `${targetBatchId}_WARN` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                        ) : (
                          <Download className="h-3 w-3 text-amber-500/60 opacity-60 group-hover:opacity-100 group-hover:text-amber-600 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => handleDownloadCount(e, targetBatchId, 'FAIL', batchNoStr)}
                        disabled={downloadingKey === `${targetBatchId}_FAIL`}
                        title="Click to download FAIL orders excel"
                        className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400 hover:text-red-700 hover:underline cursor-pointer group transition-colors"
                      >
                        <span>{failCount}</span>
                        {downloadingKey === `${targetBatchId}_FAIL` ? (
                          <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                        ) : (
                          <Download className="h-3 w-3 text-red-500/60 opacity-60 group-hover:opacity-100 group-hover:text-red-600 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {statusInfo.label === 'SUBMITTED' || statusInfo.code === 3 ? (
                        <span className="text-slate-400 text-xs italic font-medium">Submitted</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => targetBatchId && onResumeBatch(targetBatchId, batchNoStr)}
                            title="Resume Batch Wizard"
                            className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                          >
                            <span>Resume</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTrigger(b)}
                            title="Delete Batch"
                            className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DeleteBatchModal
        isOpen={!!batchToDelete}
        onClose={() => setBatchToDelete(null)}
        onSuccess={fetchBatches}
        batchToDelete={batchToDelete}
      />
    </div>
  );
};

// Backward compatibility export
export const Step1UploadFile = Step1UploadForm;
