'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AlertTriangle, RefreshCw, Download, Search, X, Loader2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle, 
  Boxes, Package, ArrowUpRight, Tag, CheckCircle2, ArrowUpDown, Calendar, DollarSign, Clock, FileSpreadsheet
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Stagnant Stock Item Interface
interface StagnantItem {
  product_id: number;
  product_code: string;
  product_name: string;
  available_qty: number;
  stock_value: number;
  last_received_date?: string | null;
  last_order_date?: string | null;
  stagnant_since_date?: string | null;
  stagnant_days: number;
}

// Summary Interface
interface StagnantSummary {
  total_stagnant_products?: number;
  total_stagnant_qty?: number;
  total_stagnant_value?: number;
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

export default function StagnantStockClient() {
  // Date Range Filters (Required)
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data & Summary States
  const [stagnantData, setStagnantData] = useState<StagnantItem[]>([]);
  const [summary, setSummary] = useState<StagnantSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pagination & View Mode States
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [viewAll, setViewAll] = useState<boolean>(false);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof StagnantItem | null>('stagnant_days');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch Stagnant Stock Data from External Python Service Endpoint
  const fetchStagnantData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await axiosInstance.get('/reports/report/stagnant', {
        params: {
          fromdate: startDate,
          todate: endDate,
        },
      });

      const raw = res.data;
      let items: StagnantItem[] = [];
      let summaryObj: StagnantSummary | null = null;

      if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.data)) {
          items = raw.data;
        } else if (Array.isArray(raw)) {
          items = raw;
        }
        if (raw.summary) {
          summaryObj = raw.summary;
        }
      }

      setStagnantData(items);
      setSummary(summaryObj);
    } catch (err: any) {
      console.error('Error fetching stagnant stock report data:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to load stagnant stock report data';
      setError(errMsg);
      toast.error(errMsg);
      setStagnantData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStagnantData();
  }, [fetchStagnantData]);

  // Client-side search & filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return stagnantData;
    const query = searchQuery.toLowerCase().trim();
    return stagnantData.filter(
      (item) =>
        (item.product_code && item.product_code.toLowerCase().includes(query)) ||
        (item.product_name && item.product_name.toLowerCase().includes(query)) ||
        item.product_id.toString().includes(query)
    );
  }, [stagnantData, searchQuery]);

  // Sort Handler
  const handleSort = (field: keyof StagnantItem) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sorted Data
  const sortedData = useMemo(() => {
    let result = [...filteredData];

    if (sortField) {
      result.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filteredData, sortField, sortDirection]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    if (viewAll) return sortedData;
    const startIdx = page * size;
    return sortedData.slice(startIdx, startIdx + size);
  }, [sortedData, page, size, viewAll]);

  const totalPages = Math.ceil(sortedData.length / size);

  // Computed summary metrics
  const stats = useMemo(() => {
    const totalProducts = summary?.total_stagnant_products ?? stagnantData.length;
    let totalQty = summary?.total_stagnant_qty ?? 0;
    let totalValue = summary?.total_stagnant_value ?? 0;

    if (!summary) {
      totalQty = stagnantData.reduce((acc, curr) => acc + (curr.available_qty || 0), 0);
      totalValue = stagnantData.reduce((acc, curr) => acc + (curr.stock_value || 0), 0);
    }

    return {
      totalProducts,
      totalQty,
      totalValue,
    };
  }, [stagnantData, summary]);

  // Export CSV
  const handleExportCsv = () => {
    setExporting(true);
    try {
      if (sortedData.length === 0) {
        toast.error('No stagnant stock data available to export.');
        setExporting(false);
        return;
      }

      const headers = [
        'Product ID',
        'Product Code',
        'Product Name',
        'Available Qty',
        'Stock Value (INR)',
        'Last Received Date',
        'Last Order Date',
        'Stagnant Since Date',
        'Stagnant Days',
      ];

      const csvRows = [
        headers.join(','),
        ...sortedData.map((row) =>
          [
            row.product_id,
            `"${row.product_code || ''}"`,
            `"${(row.product_name || '').replace(/"/g, '""')}"`,
            row.available_qty || 0,
            row.stock_value || 0,
            `"${row.last_received_date || ''}"`,
            `"${row.last_order_date || ''}"`,
            `"${row.stagnant_since_date || ''}"`,
            row.stagnant_days || 0,
          ].join(',')
        ),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `STAGNANT_STOCK_REPORT_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Stagnant Stock CSV exported successfully!');
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      toast.error('Failed to export CSV file');
    } finally {
      setExporting(false);
    }
  };

  // Clear Filters
  const handleClearFilters = () => {
    setSearchQuery('');
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
            {/* Filter Heading + Inline Summary Statistics + Clear Filters */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-200 dark:border-slate-800">
                <Filter size={16} className="text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Stagnant Stock Filters
                </h3>
              </div>

              {/* Stats 1: Total Stagnant Products */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Boxes size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Stagnant Products:</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  {stats.totalProducts.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden xl:block shrink-0" />

              {/* Stats 2: Total Stagnant Qty */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Package size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Stagnant Qty:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalQty.toLocaleString('en-IN')} units
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden xl:block shrink-0" />

              {/* Stats 3: Total Stagnant Valuation */}
              <div className="flex items-center gap-1.5 shrink-0">
                <DollarSign size={14} className="text-red-600 dark:text-red-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Stagnant Valuation:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(stats.totalValue)}
                </span>
              </div>

              {/* Clear Filters Button (Inlined as last item) */}
              {(searchQuery || viewAll) && (
                <>
                  <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 shrink-0 ml-1"
                  >
                    <X size={14} /> Clear Filters
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SINGLE-LINE FILTER CONTROL GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end">
            
            {/* 1. START DATE (fromdate) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={13} className="text-blue-600" />
                <span>From Date *</span>
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

            {/* 2. END DATE (todate) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={13} className="text-blue-600" />
                <span>To Date *</span>
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

            {/* 3. SEARCH PRODUCT FILTER */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Search Product / SKU
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search code, name..."
                  className="w-full h-10 pl-9 pr-9 text-xs bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-all"
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
            </div>

            {/* 4. ACTIONS: REFRESH & EXPORT EXCEL/CSV */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-transparent select-none hidden md:block">
                Actions
              </label>
              <div className="flex items-center gap-1.5 h-10">
                <button
                  type="button"
                  onClick={fetchStagnantData}
                  disabled={loading}
                  className="flex items-center justify-center h-10 w-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-2xs shrink-0"
                  title="Refresh Stagnant Stock Data"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin text-amber-600' : ''} />
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exporting || sortedData.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-2xs transition-all hover:shadow-sm whitespace-nowrap"
                >
                  {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  <span>Export Report (CSV)</span>
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
              <RefreshCw className="animate-spin text-amber-600 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Fetching stagnant stock report data from report service...
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4 flex-1 flex flex-col justify-center">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchStagnantData}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center">
              <AlertTriangle size={40} className="mx-auto text-amber-400 dark:text-amber-600" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No stagnant stock records found for date range ({startDate} to {endDate})
              </p>
              <p className="text-[11px] text-slate-400">
                Try selecting a different date range or search keyword.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-full whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800 shadow-2xs">
                  <tr className="bg-slate-50 dark:bg-slate-955 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('product_code')}>
                      <div className="flex items-center gap-1">
                        <span>Product Code</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('product_name')}>
                      <div className="flex items-center gap-1">
                        <span>Product Name</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('available_qty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Available Qty</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('stock_value')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Stock Value</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('last_received_date')}>
                      <div className="flex items-center gap-1">
                        <span>Last Received</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('last_order_date')}>
                      <div className="flex items-center gap-1">
                        <span>Last Order</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('stagnant_since_date')}>
                      <div className="flex items-center gap-1">
                        <span>Stagnant Since</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('stagnant_days')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Stagnant Days</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium whitespace-nowrap">
                  {paginatedData.map((row) => (
                    <tr
                      key={row.product_id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-slate-800 dark:text-slate-200 whitespace-nowrap"
                    >
                      <td className="py-2 px-3 font-mono text-[11px] font-bold whitespace-nowrap">
                        {row.product_code ? (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
                            {row.product_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap" title={row.product_name}>
                        {row.product_name}
                      </td>

                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60">
                          {row.available_qty || 0}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-bold text-red-700 dark:text-red-300 whitespace-nowrap">
                        {formatCurrency(row.stock_value)}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDateOnly(row.last_received_date)}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDateOnly(row.last_order_date)}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDateOnly(row.stagnant_since_date)}
                      </td>

                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                          (row.stagnant_days || 0) >= 90
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : (row.stagnant_days || 0) >= 30
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        } whitespace-nowrap`}>
                          {row.stagnant_days || 0} days
                        </span>
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
                <span>Showing <span className="font-bold text-amber-600 dark:text-amber-400">All {sortedData.length} Stagnant Stock Products</span></span>
              ) : (
                <span>Showing page <span className="font-bold text-slate-800 dark:text-slate-100">{page + 1} of {totalPages || 1}</span> ({sortedData.length} total records filtered)</span>
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
                  className="h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <option value={10}>10 rows</option>
                  <option value={20}>20 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value="ALL">✨ All Stagnant Products</option>
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
                    Page {page + 1} of {totalPages || 1}
                  </span>

                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                    disabled={page >= totalPages - 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

        </div>

      </div>
  );
}
