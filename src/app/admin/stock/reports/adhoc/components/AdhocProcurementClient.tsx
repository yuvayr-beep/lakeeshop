'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShoppingBag, RefreshCw, Download, X, Loader2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle, 
  Boxes, Package, ArrowUpDown, Calendar, DollarSign, Edit3, Save
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Ad-hoc Procurement Item Interface
interface AdhocProcurementItem {
  id: number;
  adhocBatchId?: number | null;
  supplierInvoiceId?: number | null;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  productId?: number | null;
  supplierProductName: string;
  supplierQty: number;
  supplierCost: number;
  supplierTax: number;
  supplierHsn?: string | null;
  totalValue: number;
}

// Default Date Range (Last 30 days)
const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

// Parse NDJSON / JSON array helper
const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.content)) return raw.content;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.result)) return raw.result;
    return [raw];
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseNdjson(parsed);
      } catch {}
    }
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }
  return [];
};

// Format Currency
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format Date string
const formatDateOnly = (dateStr: string | undefined | null) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function AdhocProcurementClient() {
  // Date Range Filters (Only startDate & endDate)
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);

  // Main Data States
  const [adhocData, setAdhocData] = useState<AdhocProcurementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pagination & View All States
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof AdhocProcurementItem | null>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<AdhocProcurementItem | null>(null);
  const [editSupplierName, setEditSupplierName] = useState<string>('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState<string>('');
  const [editInvoiceDate, setEditInvoiceDate] = useState<string>('');
  const [editSupplierProductName, setEditSupplierProductName] = useState<string>('');
  const [editSupplierQty, setEditSupplierQty] = useState<number>(0);
  const [editSupplierCost, setEditSupplierCost] = useState<number>(0);
  const [editSupplierTax, setEditSupplierTax] = useState<number>(0);
  const [editSupplierHsn, setEditSupplierHsn] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Fetch Ad-hoc Procurement Data
  const fetchAdhocData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params: Record<string, any> = {
        startDate,
        endDate,
      };

      if (!viewAll) {
        params.page = page;
        params.size = size;
      } else {
        params.page = 0;
        params.size = 2000;
      }

      const endpoint = viewAll ? '/stock/reports/adhoc-procurements' : '/stock/reports/adhoc-procurements/page';
      const res = await axiosInstance.get(endpoint, {
        params,
        headers: {
          Accept: 'application/x-ndjson, application/json, */*',
        },
      });

      const parsedItems = parseNdjson(res.data);
      setAdhocData(parsedItems);

      if (!viewAll) {
        setHasNextPage(parsedItems.length === size);
      } else {
        setHasNextPage(false);
      }
    } catch (err: any) {
      console.error('Error fetching ad-hoc procurement report data:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to load ad-hoc procurement report data';
      setError(errMsg);
      toast.error(errMsg);
      setAdhocData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, size, viewAll]);

  useEffect(() => {
    fetchAdhocData();
  }, [fetchAdhocData]);

  // Handle Excel Export (Job polling workflow)
  const handleExportExcel = async () => {
    setExporting(true);
    toast.info('Initializing Ad-hoc Procurement Excel export job...');

    try {
      const params = {
        startDate,
        endDate,
      };

      const initRes = await axiosInstance.get('/stock/reports/adhoc-procurements/excel', { params });
      const jobData = initRes.data?.data || initRes.data;
      const jobId = jobData?.jobId;

      if (!jobId) {
        toast.error('Failed to receive Export Job ID.');
        setExporting(false);
        return;
      }

      // Poll for job completion
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axiosInstance.get(`/stock/reports/export-jobs/${jobId}`);
          const currentJob = statusRes.data?.data || statusRes.data;
          const status = currentJob?.status;

          if (status === 'SUCCESS' || status === 'COMPLETED') {
            clearInterval(pollInterval);
            toast.success('Ad-hoc Procurement Excel generated! Downloading...');

            const downloadPath = currentJob?.downloadUrl || `/stock/reports/download/${jobId}`;
            const fileRes = await axiosInstance.get(downloadPath, { responseType: 'blob' });

            const blob = new Blob([fileRes.data], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentJob?.fileName || `ADHOC_PROCUREMENT_REPORT_${startDate}_${endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setExporting(false);
          } else if (status === 'FAILED' || status === 'ERROR') {
            clearInterval(pollInterval);
            toast.error(`Excel Export failed: ${currentJob?.errorMessage || 'Unknown error'}`);
            setExporting(false);
          }
        } catch (pollErr) {
          console.error('Error polling export job status:', pollErr);
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error initiating Excel export:', err);
      toast.error(err?.response?.data?.message || 'Failed to start Excel export job');
      setExporting(false);
    }
  };

  // Sort Handler
  const handleSort = (field: keyof AdhocProcurementItem) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Process & Sort Data
  const processedData = useMemo(() => {
    let result = [...adhocData];

    if (sortField) {
      result.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [adhocData, sortField, sortDirection]);

  // Calculated Summary Statistics
  const stats = useMemo(() => {
    const totalCount = adhocData.length;
    let totalQty = 0;
    let totalValue = 0;

    adhocData.forEach((row) => {
      totalQty += row.supplierQty || 0;
      totalValue += row.totalValue || 0;
    });

    return {
      totalCount,
      totalQty,
      totalValue,
    };
  }, [adhocData]);

  // Open Edit Modal
  const handleOpenEdit = (item: AdhocProcurementItem) => {
    setEditingItem(item);
    setEditSupplierName(item.supplierName || '');
    setEditInvoiceNumber(item.invoiceNumber || '');
    setEditInvoiceDate(item.invoiceDate ? item.invoiceDate.split('T')[0] : '');
    setEditSupplierProductName(item.supplierProductName || '');
    setEditSupplierQty(item.supplierQty || 0);
    setEditSupplierCost(item.supplierCost || 0);
    setEditSupplierTax(item.supplierTax || 0);
    setEditSupplierHsn(item.supplierHsn || '');
  };

  // Save Edit (PUT /stock/reports/adhoc-procurements/{id})
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    const toastId = toast.loading('Updating ad-hoc procurement item details...');

    try {
      const calculatedTotal = Number(editSupplierQty) * Number(editSupplierCost) * (1 + Number(editSupplierTax) / 100);

      const payload = {
        id: editingItem.id,
        adhocBatchId: editingItem.adhocBatchId || 0,
        supplierInvoiceId: editingItem.supplierInvoiceId || 0,
        supplierName: editSupplierName,
        invoiceNumber: editInvoiceNumber,
        invoiceDate: editInvoiceDate,
        productId: editingItem.productId || 0,
        supplierProductName: editSupplierProductName,
        supplierQty: Number(editSupplierQty),
        supplierCost: Number(editSupplierCost),
        supplierTax: Number(editSupplierTax),
        supplierHsn: editSupplierHsn,
        totalValue: calculatedTotal || editingItem.totalValue || 0,
      };

      await axiosInstance.put(`/stock/reports/adhoc-procurements/${editingItem.id}`, payload);
      toast.success('Ad-hoc procurement details updated successfully!', { id: toastId });
      setEditingItem(null);
      fetchAdhocData();
    } catch (err: any) {
      console.error('Failed to update ad-hoc procurement:', err);
      toast.error(err?.response?.data?.message || 'Failed to update ad-hoc procurement details', { id: toastId });
    } finally {
      setSavingEdit(false);
    }
  };

  // Clear Filters
  const handleClearFilters = () => {
    setStartDate(defaultDates.startDate);
    setEndDate(defaultDates.endDate);
    setPage(0);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 space-y-4">

        {/* =================================================================== */}
        {/* FILTER CONTROL BAR (WITH INLINE SUMMARY STATISTICS) */}
        {/* =================================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3 shrink-0">
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            {/* Filter Heading + Inline Summary Statistics */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-200 dark:border-slate-800">
                <Filter size={16} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Ad-hoc Procurement Filters
                </h3>
              </div>

              {/* Stats 1: Procurements Loaded */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Boxes size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Procurements Loaded:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.totalCount.toLocaleString('en-IN')} records
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden xl:block shrink-0" />

              {/* Stats 2: Total Qty */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Package size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Qty:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.totalQty.toLocaleString('en-IN')} units
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden xl:block shrink-0" />

              {/* Stats 3: Total Valuation */}
              <div className="flex items-center gap-1.5 shrink-0">
                <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Valuation:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(stats.totalValue)}
                </span>
              </div>
            </div>
          </div>

          {/* SINGLE-LINE FILTER CONTROL GRID (ONLY DATE FILTERS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-2.5 items-end max-w-2xl">
            
            {/* 1. START DATE (REQUIRED) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={13} className="text-blue-600" />
                <span>Start Date *</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="w-full h-10 px-3 text-xs font-medium bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* 2. END DATE (REQUIRED) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={13} className="text-blue-600" />
                <span>End Date *</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="w-full h-10 px-3 text-xs font-medium bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* 3. ACTIONS: REFRESH & EXPORT EXCEL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-transparent select-none hidden xl:block">
                Actions
              </label>
              <div className="flex items-center gap-1.5 h-10">
                <button
                  type="button"
                  onClick={fetchAdhocData}
                  disabled={loading}
                  className="flex items-center justify-center h-10 w-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-2xs shrink-0"
                  title="Refresh Report Data"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-2xs transition-all hover:shadow-sm whitespace-nowrap"
                >
                  {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  <span>Export Excel (Job)</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* =================================================================== */}
        {/* REPORT DATA TABLE */}
        {/* =================================================================== */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden flex flex-col">
          
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3 flex-1 flex flex-col justify-center">
              <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {viewAll ? 'Fetching all ad-hoc procurement records...' : 'Fetching ad-hoc procurement report data...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4 flex-1 flex flex-col justify-center">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchAdhocData}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : processedData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center">
              <ShoppingBag size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No ad-hoc procurement records found for date range ({startDate} to {endDate})
              </p>
              <p className="text-[11px] text-slate-400">
                Try selecting a different date range.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-full whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800 shadow-2xs">
                  <tr className="bg-slate-50 dark:bg-slate-955 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('id')}>
                      <div className="flex items-center gap-1">
                        <span>ID</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('invoiceNumber')}>
                      <div className="flex items-center gap-1">
                        <span>Invoice No</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('invoiceDate')}>
                      <div className="flex items-center gap-1">
                        <span>Invoice Date</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('supplierName')}>
                      <div className="flex items-center gap-1">
                        <span>Supplier Name</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('supplierProductName')}>
                      <div className="flex items-center gap-1">
                        <span>Supplier Product Name</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('supplierHsn')}>
                      <div className="flex items-center gap-1">
                        <span>HSN Code</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('supplierQty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Qty</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('supplierCost')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Unit Cost</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('supplierTax')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Tax %</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('totalValue')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Valuation</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center">
                      <span>Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium whitespace-nowrap">
                  {processedData.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-slate-800 dark:text-slate-200 whitespace-nowrap"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        #{row.id}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                        {row.invoiceNumber ? (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60 whitespace-nowrap">
                            {row.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                        {formatDateOnly(row.invoiceDate)}
                      </td>

                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {row.supplierName || 'Unassigned'}
                      </td>

                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap" title={row.supplierProductName}>
                        {row.supplierProductName}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {row.supplierHsn || '—'}
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {row.supplierQty}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatCurrency(row.supplierCost)}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row.supplierTax ? `${row.supplierTax}%` : '0%'}
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        {formatCurrency(row.totalValue)}
                      </td>

                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                          title="Edit ad-hoc procurement details"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================================== */}
          {/* FOOTER BAR */}
          {/* =================================================================== */}
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-955/20 shrink-0">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              {viewAll ? (
                <span>Showing <span className="font-bold text-blue-600 dark:text-blue-400">All {adhocData.length} Ad-hoc Procurements</span></span>
              ) : (
                <span>Showing page <span className="font-bold text-slate-800 dark:text-slate-100">{page + 1}</span> ({adhocData.length} records loaded)</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rows per page:</span>
                <select
                  value={viewAll ? 'ALL' : size}
                  onChange={(e) => {
                    if (e.target.value === 'ALL') {
                      setViewAll(true);
                    } else {
                      setViewAll(false);
                      setSize(Number(e.target.value));
                    }
                    setPage(0);
                  }}
                  className="h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <option value={10}>10 rows</option>
                  <option value={20}>20 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value="ALL">✨ All Procurements</option>
                </select>
              </div>

              {!viewAll ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    disabled={page === 0 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <span className="px-3 py-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg font-bold font-mono text-slate-700 dark:text-slate-300">
                    Page {page + 1}
                  </span>

                  <button
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!hasNextPage || loading}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

        </div>

        {/* =================================================================== */}
        {/* EDIT AD-HOC PROCUREMENT MODAL (PUT /stock/reports/adhoc-procurements/{id}) */}
        {/* =================================================================== */}
        {editingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Ad-hoc Procurement Details
                  </h3>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. SUPPLIER NAME */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>

                {/* 2. INVOICE NUMBER */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                {/* 3. INVOICE DATE */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={editInvoiceDate}
                    onChange={(e) => setEditInvoiceDate(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                  />
                </div>

                {/* 4. HSN CODE */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={editSupplierHsn}
                    onChange={(e) => setEditSupplierHsn(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* 5. SUPPLIER PRODUCT NAME (Full width) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Supplier Product Name
                  </label>
                  <input
                    type="text"
                    value={editSupplierProductName}
                    onChange={(e) => setEditSupplierProductName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>

                {/* 6. QUANTITY */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Supplier Qty
                  </label>
                  <input
                    type="number"
                    value={editSupplierQty}
                    onChange={(e) => setEditSupplierQty(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                {/* 7. UNIT COST */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSupplierCost}
                    onChange={(e) => setEditSupplierCost(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                {/* 8. TAX PERCENTAGE */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Tax Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSupplierTax}
                    onChange={(e) => setEditSupplierTax(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-2xs disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
}
