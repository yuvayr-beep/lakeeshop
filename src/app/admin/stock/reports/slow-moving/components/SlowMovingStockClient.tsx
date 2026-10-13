'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, RefreshCw, Download, Search, X, Loader2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle, 
  Boxes, Package, ArrowDownLeft, Tag, CheckCircle2, ArrowUpDown, Calendar, Percent, ShoppingBag
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Slow Moving Item Interface
interface SlowMovingItem {
  product_id: number;
  product_code: string;
  product_name: string;
  open_stock: number;
  stock_purchased: number;
  total_stock: number;
  orders_qty: number;
  sales_percentage: number;
}

// Summary Interface
interface SlowMovingSummary {
  total_slow_moving_products?: number;
  total_open_stock?: number;
  total_purchased_stock?: number;
  total_stock?: number;
  total_orders_qty?: number;
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

export default function SlowMovingStockClient() {
  // Date Range Filters (Required)
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);

  // Threshold Percentage Filter
  const [percentageThreshold, setPercentageThreshold] = useState<number>(10);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data & Summary States
  const [slowMovingData, setSlowMovingData] = useState<SlowMovingItem[]>([]);
  const [summary, setSummary] = useState<SlowMovingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pagination & View Mode States
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [viewAll, setViewAll] = useState<boolean>(false);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof SlowMovingItem | null>('sales_percentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch Slow Moving Stock Data from External Python Service Endpoint
  const fetchSlowMovingData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await axiosInstance.get('/reports/report/slow_moving', {
        params: {
          fromdate: startDate,
          todate: endDate,
          percentage: percentageThreshold,
        },
      });

      const raw = res.data;
      let items: SlowMovingItem[] = [];
      let summaryObj: SlowMovingSummary | null = null;

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

      setSlowMovingData(items);
      setSummary(summaryObj);
    } catch (err: any) {
      console.error('Error fetching slow moving stock report data:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to load slow moving stock report data';
      setError(errMsg);
      toast.error(errMsg);
      setSlowMovingData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, percentageThreshold]);

  useEffect(() => {
    fetchSlowMovingData();
  }, [fetchSlowMovingData]);

  // Client-side search & filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return slowMovingData;
    const query = searchQuery.toLowerCase().trim();
    return slowMovingData.filter(
      (item) =>
        (item.product_code && item.product_code.toLowerCase().includes(query)) ||
        (item.product_name && item.product_name.toLowerCase().includes(query)) ||
        item.product_id.toString().includes(query)
    );
  }, [slowMovingData, searchQuery]);

  // Sort Handler
  const handleSort = (field: keyof SlowMovingItem) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted Data
  const sortedData = useMemo(() => {
    let result = [...filteredData];

    if (sortField) {
      result.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (valA === undefined || valA === null) valA = 0;
        if (valB === undefined || valB === null) valB = 0;

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
    const totalProducts = summary?.total_slow_moving_products ?? slowMovingData.length;
    let totalStock = summary?.total_stock ?? 0;
    let totalPurchases = summary?.total_purchased_stock ?? 0;
    let totalOrders = summary?.total_orders_qty ?? 0;

    if (!summary) {
      totalStock = slowMovingData.reduce((acc, curr) => acc + (curr.total_stock || 0), 0);
      totalPurchases = slowMovingData.reduce((acc, curr) => acc + (curr.stock_purchased || 0), 0);
      totalOrders = slowMovingData.reduce((acc, curr) => acc + (curr.orders_qty || 0), 0);
    }

    return {
      totalProducts,
      totalStock,
      totalPurchases,
      totalOrders,
    };
  }, [slowMovingData, summary]);

  // Export CSV
  const handleExportCsv = () => {
    setExporting(true);
    try {
      if (sortedData.length === 0) {
        toast.error('No slow moving stock data available to export.');
        setExporting(false);
        return;
      }

      const headers = [
        'Product ID',
        'Product Code',
        'Product Name',
        'Open Stock',
        'Purchased Stock',
        'Total Stock',
        'Orders Qty (Sales)',
        'Sales Percentage (%)',
      ];

      const csvRows = [
        headers.join(','),
        ...sortedData.map((row) =>
          [
            row.product_id,
            `"${row.product_code || ''}"`,
            `"${(row.product_name || '').replace(/"/g, '""')}"`,
            row.open_stock || 0,
            row.stock_purchased || 0,
            row.total_stock || 0,
            row.orders_qty || 0,
            row.sales_percentage || 0,
          ].join(',')
        ),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SLOW_MOVING_STOCK_REPORT_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Slow Moving Stock CSV exported successfully!');
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
    setPercentageThreshold(10);
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
                  Slow Moving Filters
                </h3>
              </div>

              {/* Stats 1: Total Slow Moving Products */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Boxes size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Slow Moving Products:</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  {stats.totalProducts.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden xl:block shrink-0" />

              {/* Stats 2: Total Stock */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Package size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Stock:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalStock.toLocaleString('en-IN')} units
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden xl:block shrink-0" />

              {/* Stats 3: Sales Orders Qty */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ShoppingBag size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Sales Qty:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalOrders.toLocaleString('en-IN')} units
                </span>
              </div>

              {/* Clear Filters Button (Inlined as last item) */}
              {(searchQuery || viewAll || percentageThreshold !== 10) && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-end">
            
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

            {/* 3. THRESHOLD PERCENTAGE */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Percent size={13} className="text-amber-600" />
                <span>Sales Threshold</span>
              </label>
              <select
                value={percentageThreshold}
                onChange={(e) => {
                  setPercentageThreshold(Number(e.target.value));
                  setPage(0);
                }}
                className="w-full h-10 px-3 text-xs font-bold bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value={5}>Below 5% Sales</option>
                <option value={10}>Below 10% (Default)</option>
                <option value={15}>Below 15% Sales</option>
                <option value={20}>Below 20% Sales</option>
                <option value={25}>Below 25% Sales</option>
                <option value={50}>Below 50% Sales</option>
              </select>
            </div>

            {/* 4. SEARCH PRODUCT FILTER */}
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

            {/* 5. ACTIONS: REFRESH & EXPORT EXCEL/CSV */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-transparent select-none hidden md:block">
                Actions
              </label>
              <div className="flex items-center gap-1.5 h-10">
                <button
                  type="button"
                  onClick={fetchSlowMovingData}
                  disabled={loading}
                  className="flex items-center justify-center h-10 w-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-2xs shrink-0"
                  title="Refresh Slow Moving Stock Data"
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
                Fetching slow moving stock report data from report service...
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4 flex-1 flex flex-col justify-center">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchSlowMovingData}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center">
              <Activity size={40} className="mx-auto text-amber-400 dark:text-amber-600" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No slow moving stock records found for date range ({startDate} to {endDate}) at {percentageThreshold}% threshold
              </p>
              <p className="text-[11px] text-slate-400">
                Try selecting a different date range or threshold percentage.
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
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('open_stock')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Opening Stock</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('stock_purchased')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Purchased Stock</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('total_stock')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Stock</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('orders_qty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Orders Qty (Sales)</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('sales_percentage')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Sales %</span>
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

                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.open_stock || 0}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.stock_purchased || 0}
                      </td>

                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60">
                          {row.total_stock || 0}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                          {row.orders_qty || 0}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                          (row.sales_percentage || 0) === 0
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : (row.sales_percentage || 0) < 5
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        } whitespace-nowrap`}>
                          {row.sales_percentage || 0}%
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
                <span>Showing <span className="font-bold text-amber-600 dark:text-amber-400">All {sortedData.length} Slow Moving Products</span></span>
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
                  <option value="ALL">✨ All Slow Moving Products</option>
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
