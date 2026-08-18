'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  TrendingUp, RefreshCw, Download, Search, X, Loader2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle, 
  Boxes, Package, ArrowUpRight, ArrowDownLeft, Tag, CheckCircle2, ArrowUpDown, Calendar, Percent, DollarSign
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Stock Movement Audit Item Interface
interface StockMovementItem {
  productId: number;
  productCode: string;
  productName: string;
  brand?: string | null;
  taxPercentage: number;
  openingQty: number;
  closingQty: number;
  totalPurchaseQty: number;
  totalSaleQty: number;
  openingCostOrg: number;
  openingValueOrgTaxable: number;
  openingValueOrgTax: number;
  openingValueOrgTotal: number;
  closingCostOrg: number;
  closingValueOrgTaxable: number;
  closingValueOrgTax: number;
  closingValueOrgTotal: number;
  closingCostLatest: number;
  closingValueLatestTaxable: number;
  closingValueLatestTax: number;
  closingValueLatestTotal: number;
}

// Product Option Interface
interface ProductOption {
  id: number;
  baseProductName?: string;
  productName?: string;
  defaultSku?: string;
  skuCode?: string;
  productCode?: string;
}

// Brand Option Interface
interface BrandOption {
  brandId?: number;
  id?: number;
  brandName?: string;
  name?: string;
  displayName?: string;
  code?: string;
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

// Format Currency (INR)
const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  const num = Number(val);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function MovementAuditClient() {
  // Date Range Filters (Required)
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);

  // Main Data States
  const [movementData, setMovementData] = useState<StockMovementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pagination & View Mode States
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Product & Brand Filter States
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  // Product Search Dropdown States
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);

  // Brand Search Dropdown States
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState<boolean>(false);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  // Sorting Table Columns
  const [sortField, setSortField] = useState<keyof StockMovementItem | null>('closingValueLatestTotal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Refs for clicking outside
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // 1. FETCH STOCK MOVEMENT AUDIT REPORT (GET /stock/reports/stock-movement OR /page)
  // ---------------------------------------------------------------------------
  const fetchMovementData = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Date filter is required. Please select both Start Date and End Date.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    if (!viewAll) {
      params.append('page', String(page));
      params.append('size', String(size));
    }

    if (selectedProductId) {
      params.append('productId', String(selectedProductId));
    }
    if (selectedBrand.trim()) {
      params.append('brand', selectedBrand.trim());
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const endpointUrl = viewAll
      ? `/stock/reports/stock-movement${queryString}`
      : `/stock/reports/stock-movement/page${queryString}`;

    console.log('====================================');
    console.log(`[API REQUEST] GET ${endpointUrl} (${viewAll ? 'UNPAGINATED' : 'PAGINATED'})`);
    console.log('cURL command for Swagger:');
    console.log(
      `curl -X 'GET' \\\n  'https://v2.lakeetech.com${endpointUrl}' \\\n  -H 'accept: application/x-ndjson' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
    );
    console.log('====================================');

    try {
      const res = await axiosInstance.get(endpointUrl, {
        headers: { Accept: 'application/x-ndjson, application/json, */*' },
      });
      console.log(`[API RESPONSE] GET ${endpointUrl}:`, res.data);

      const parsed = parseNdjson(res.data) as StockMovementItem[];
      setMovementData(parsed);
      setHasNextPage(!viewAll && parsed.length >= size);
    } catch (err: any) {
      console.error('Failed to fetch Stock Movement Audit Report:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to load stock movement data.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, viewAll, page, size, selectedProductId, selectedBrand]);

  useEffect(() => {
    fetchMovementData();
  }, [fetchMovementData]);

  // ---------------------------------------------------------------------------
  // 2. PRODUCT SEARCH API
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!productSearchQuery.trim() || productSearchQuery.trim().length < 2) {
      setProductOptions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      setLoadingProducts(true);
      const queryStr = productSearchQuery.trim();
      const isSku = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(queryStr);
      const url = isSku 
        ? `/prod/products?sku=${encodeURIComponent(queryStr)}` 
        : `/prod/products?name=${encodeURIComponent(queryStr)}`;

      axiosInstance
        .get(url, { headers: { Accept: 'application/x-ndjson, application/json, */*' } })
        .then(({ data }) => {
          const parsed = parseNdjson(data) as ProductOption[];
          setProductOptions(parsed);
          setShowProductDropdown(true);
        })
        .catch((err) => {
          console.error('Failed to load products for filter:', err);
          setProductOptions([]);
        })
        .finally(() => setLoadingProducts(false));
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [productSearchQuery]);

  // ---------------------------------------------------------------------------
  // 3. BRAND LIST API
  // ---------------------------------------------------------------------------
  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true);
    try {
      const res = await axiosInstance.get('/prod/brands', {
        headers: { Accept: 'application/x-ndjson, application/json, */*' },
      });
      const parsed = parseNdjson(res.data) as BrandOption[];
      setBrandOptions(parsed);
    } catch (err) {
      console.warn('Failed to fetch brands list:', err);
      setBrandOptions([]);
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return brandOptions;
    const q = brandSearchQuery.toLowerCase();
    return brandOptions.filter((b) => {
      const name = b.brandName || b.name || b.displayName || b.code || '';
      return name.toLowerCase().includes(q);
    });
  }, [brandOptions, brandSearchQuery]);

  // ---------------------------------------------------------------------------
  // 4. EXCEL EXPORT JOB POLLING & API DOWNLOAD
  // ---------------------------------------------------------------------------
  const handleExportExcel = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both Start Date and End Date for Export.');
      return;
    }

    setExporting(true);
    const toastId = toast.loading('Initializing Excel export job...');

    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    if (selectedProductId) {
      params.append('productId', String(selectedProductId));
    }
    if (selectedBrand.trim()) {
      params.append('brand', selectedBrand.trim());
    }

    const excelUrl = `/stock/reports/stock-movement/excel?${params.toString()}`;

    console.log('====================================');
    console.log(`[API REQUEST] EXCEL JOB INIT: GET ${excelUrl}`);
    console.log('cURL command for Swagger:');
    console.log(
      `curl -X 'GET' \\\n  'https://v2.lakeetech.com${excelUrl}' \\\n  -H 'accept: */*' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
    );
    console.log('====================================');

    try {
      const initRes = await axiosInstance.get(excelUrl, {
        headers: { Accept: '*/*' },
      });
      console.log(`[API RESPONSE] EXCEL JOB INIT:`, initRes.data);

      const jobData = initRes.data?.data || initRes.data;
      const jobId = jobData?.jobId;

      if (!jobId) {
        toast.error('Export job initialization failed: No jobId returned.', { id: toastId });
        return;
      }

      toast.loading(`Export job ${jobId.slice(0, 8)}... initialized. Polling completion...`, { id: toastId });

      // Step 2: Poll export job status
      let attempts = 0;
      const maxAttempts = 30;
      let isSuccess = false;
      let finalJobData: any = null;

      while (attempts < maxAttempts && !isSuccess) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const jobPollUrl = `/stock/reports/export-jobs/${jobId}`;
        console.log(`[API REQUEST] EXCEL JOB POLL (Attempt ${attempts}): GET ${jobPollUrl}`);

        try {
          const pollRes = await axiosInstance.get(jobPollUrl, {
            headers: { Accept: '*/*' },
          });
          console.log(`[API RESPONSE] EXCEL JOB POLL (Attempt ${attempts}):`, pollRes.data);

          const statusData = pollRes.data?.data || pollRes.data;
          const status = statusData?.status;

          if (status === 'SUCCESS') {
            isSuccess = true;
            finalJobData = statusData;
            break;
          } else if (status === 'FAILED' || status === 'ERROR') {
            const err = statusData?.errorMessage || 'Export job failed on server.';
            toast.error(`Export failed: ${err}`, { id: toastId });
            return;
          } else {
            toast.loading(`Processing export job... (${status || 'PENDING'}) [${attempts * 2}s]`, { id: toastId });
          }
        } catch (pollErr: any) {
          console.warn(`Poll attempt ${attempts} error:`, pollErr);
        }
      }

      if (isSuccess && finalJobData) {
        const downloadEndpoint = finalJobData.downloadUrl || `/stock/reports/download/${jobId}`;
        console.log('====================================');
        console.log(`[API REQUEST] EXCEL FILE DOWNLOAD: GET ${downloadEndpoint}`);
        console.log('cURL command for Swagger:');
        console.log(
          `curl -X 'GET' \\\n  'https://v2.lakeetech.com${downloadEndpoint}' \\\n  -H 'accept: */*' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
        );
        console.log('====================================');

        toast.loading('Downloading Excel file...', { id: toastId });

        try {
          // Call GET /stock/reports/download/{jobId} with Auth token and blob responseType
          const fileRes = await axiosInstance.get(downloadEndpoint, {
            responseType: 'blob',
            headers: { Accept: '*/*' },
          });

          const blob = new Blob([fileRes.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', finalJobData.fileName || `stock_movement_${jobId}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(blobUrl);

          toast.success('Stock movement Excel report downloaded successfully!', { id: toastId });
        } catch (downloadErr: any) {
          console.warn('Failed API blob download, falling back to direct URL:', downloadErr);
          const filePath = finalJobData.filePath;
          const directUrl = filePath 
            ? `https://download.lakeeshop.com/${filePath.startsWith('/') ? filePath.slice(1) : filePath}`
            : `https://v2.lakeetech.com${downloadEndpoint}`;

          const link = document.createElement('a');
          link.href = directUrl;
          link.target = '_blank';
          link.setAttribute('download', finalJobData.fileName || `stock_movement_${jobId}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('Excel download triggered!', { id: toastId });
        }
      } else {
        toast.error('Export job timed out. Please try again.', { id: toastId });
      }
    } catch (err: any) {
      console.error('Failed to export stock movement report:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to start export job.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. SORTING & STATISTICS
  // ---------------------------------------------------------------------------
  const handleSort = (field: keyof StockMovementItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const processedData = useMemo(() => {
    if (!sortField) return movementData;
    return [...movementData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === null || valA === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [movementData, sortField, sortDirection]);

  // Statistics Summary
  const stats = useMemo(() => {
    let totalPurchases = 0;
    let totalSales = 0;
    let totalClosingQty = 0;
    let totalClosingValue = 0;

    movementData.forEach((item) => {
      totalPurchases += item.totalPurchaseQty || 0;
      totalSales += item.totalSaleQty || 0;
      totalClosingQty += item.closingQty || 0;
      totalClosingValue += item.closingValueLatestTotal || 0;
    });

    return {
      totalItems: movementData.length,
      totalPurchases,
      totalSales,
      totalClosingQty,
      totalClosingValue,
    };
  }, [movementData]);

  // Clear All Filters
  const handleClearFilters = () => {
    setSelectedProductId(null);
    setSelectedProduct(null);
    setSelectedBrand('');
    setProductSearchQuery('');
    setBrandSearchQuery('');
    setStartDate(defaultDates.startDate);
    setEndDate(defaultDates.endDate);
    setPage(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        
        {/* =================================================================== */}
        {/* HEADER SECTION */}
        {/* =================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
              Stock Movement Report (Audit)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Complete inventory movement audit: Opening & Closing stock, purchases, sales, GST tax breakdowns, and costs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchMovementData}
              disabled={loading}
              className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-2xs"
              title="Refresh Stock Movement Report Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-2xs transition-all hover:shadow-sm"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export Excel (Job)
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SUMMARY STATISTICS CARDS */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Boxes size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Products Audited</p>
              <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                {stats.totalItems.toLocaleString('en-IN')}
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Purchases / Sales Qty</p>
              <h4 className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{stats.totalPurchases.toLocaleString('en-IN')} / -{stats.totalSales.toLocaleString('en-IN')} units
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Closing Stock Quantity</p>
              <h4 className="text-base font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                {stats.totalClosingQty.toLocaleString('en-IN')} units
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Closing Value</p>
              <h4 className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(stats.totalClosingValue)}
              </h4>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* FILTER CONTROL BAR */}
        {/* =================================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Movement Audit Filters
              </h3>
            </div>

            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
            >
              <X size={14} /> Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            
            {/* START DATE (REQUIRED) */}
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

            {/* END DATE (REQUIRED) */}
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

            {/* PRODUCT SEARCH & SELECT */}
            <div className="space-y-1.5 relative" ref={productDropdownRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Product Filter</span>
                {selectedProductId && (
                  <span className="text-[10px] text-blue-600 font-mono">
                    ID: {selectedProductId}
                  </span>
                )}
              </label>

              {selectedProduct ? (
                <div className="h-10 px-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-xl flex items-center justify-between text-xs">
                  <div className="truncate font-semibold text-blue-950 dark:text-blue-100 pr-2">
                    <span className="font-bold">{selectedProduct.productName || selectedProduct.baseProductName}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedProductId(null);
                      setProductSearchQuery('');
                      setPage(0);
                    }}
                    className="p-1 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 rounded-lg text-blue-700 dark:text-blue-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search product name/SKU..."
                    className="w-full h-10 pl-9 pr-9 text-xs bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                  />
                  {loadingProducts && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600" />
                  )}
                </div>
              )}

              {/* Product Dropdown Popup */}
              {showProductDropdown && !selectedProduct && productOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
                  {productOptions.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        setSelectedProduct(prod);
                        setSelectedProductId(prod.id);
                        setShowProductDropdown(false);
                        setPage(0);
                      }}
                      className="p-2.5 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {prod.productName || prod.baseProductName}
                        </p>
                        <span className="inline-block text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          SKU: {prod.defaultSku || prod.productCode || prod.skuCode || 'N/A'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        ID: {prod.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BRAND SEARCH & SELECT */}
            <div className="space-y-1.5 relative" ref={brandDropdownRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Brand Filter
              </label>

              {selectedBrand ? (
                <div className="h-10 px-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl flex items-center justify-between text-xs">
                  <div className="truncate font-bold text-amber-950 dark:text-amber-100 pr-2">
                    Brand: {selectedBrand}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBrand('');
                      setBrandSearchQuery('');
                      setPage(0);
                    }}
                    className="p-1 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={brandSearchQuery}
                    onChange={(e) => {
                      setBrandSearchQuery(e.target.value);
                      setShowBrandDropdown(true);
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                    placeholder="Search brand..."
                    className="w-full h-10 pl-9 pr-9 text-xs bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-all"
                  />
                  {loadingBrands && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-amber-600" />
                  )}
                </div>
              )}

              {/* Brand Dropdown Popup */}
              {showBrandDropdown && !selectedBrand && filteredBrands.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
                  {filteredBrands.map((b, idx) => {
                    const bName = b.brandName || b.name || b.displayName || b.code || '';
                    if (!bName) return null;
                    return (
                      <div
                        key={b.brandId || b.id || idx}
                        onClick={() => {
                          setSelectedBrand(bName);
                          setShowBrandDropdown(false);
                          setPage(0);
                        }}
                        className="p-2.5 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {bName}
                        </span>
                        <CheckCircle2 size={14} className="text-amber-500 opacity-0 hover:opacity-100" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Rows / View Mode Selection */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                View Mode / Rows Per Page:
              </label>
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
                className="h-8 px-3 text-xs bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-semibold cursor-pointer"
              >
                <option value={10}>10 rows (Paginated)</option>
                <option value={20}>20 rows (Default Paginated)</option>
                <option value={50}>50 rows (Paginated)</option>
                <option value={100}>100 rows (Paginated)</option>
                <option value="ALL">✨ All Products</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-400 font-medium italic">
              Date Filter Range: <span className="font-bold text-slate-700 dark:text-slate-300">{startDate}</span> to <span className="font-bold text-slate-700 dark:text-slate-300">{endDate}</span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* REPORT DATA TABLE */}
        {/* =================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden">
          
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3">
              <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {viewAll ? 'Fetching all stock movement records...' : 'Fetching stock movement report data...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchMovementData}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : processedData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <TrendingUp size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No stock movement audit records found for date range ({startDate} to {endDate})
              </p>
              <p className="text-[11px] text-slate-400">
                Try selecting a different date range or clearing product/brand filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-[1300px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('productCode')}>
                      <div className="flex items-center gap-1">
                        <span>Product Code</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('productName')}>
                      <div className="flex items-center gap-1">
                        <span>Product Name</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('brand')}>
                      <div className="flex items-center gap-1">
                        <span>Brand</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('taxPercentage')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Tax %</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('openingQty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Opening Stock</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('totalPurchaseQty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Purchases</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('totalSaleQty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Sales</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('closingQty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Closing Stock</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('closingCostLatest')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Closing Cost</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('closingValueLatestTaxable')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Taxable Value</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('closingValueLatestTax')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Tax Amount</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('closingValueLatestTotal')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Closing Value</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {processedData.map((row) => (
                    <tr
                      key={row.productId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-slate-800 dark:text-slate-200"
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] font-bold">
                        {row.productCode ? (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                            {row.productCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold max-w-xs truncate text-slate-900 dark:text-slate-100" title={row.productName}>
                        {row.productName}
                      </td>

                      <td className="py-3.5 px-4">
                        {row.brand ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                            {row.brand}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unbranded</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {row.taxPercentage || 0}%
                      </td>

                      {/* OPENING STOCK (Qty & Total Value tooltip) */}
                      <td className="py-3.5 px-4 text-right font-mono" title={`Opening Value: ${formatCurrency(row.openingValueOrgTotal)}`}>
                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          {row.openingQty || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatCurrency(row.openingValueOrgTotal)}
                        </div>
                      </td>

                      {/* PURCHASES QTY */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                          row.totalPurchaseQty > 0 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60'
                            : 'text-slate-400'
                        }`}>
                          +{row.totalPurchaseQty || 0}
                        </span>
                      </td>

                      {/* SALES QTY */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                          row.totalSaleQty > 0 
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60'
                            : 'text-slate-400'
                        }`}>
                          -{row.totalSaleQty || 0}
                        </span>
                      </td>

                      {/* CLOSING STOCK QTY */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                          row.closingQty > 0 
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60'
                            : 'text-slate-400'
                        }`}>
                          {row.closingQty || 0}
                        </span>
                      </td>

                      {/* CLOSING COST LATEST */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(row.closingCostLatest)}
                      </td>

                      {/* TAXABLE VALUE */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(row.closingValueLatestTaxable)}
                      </td>

                      {/* TAX AMOUNT */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.closingValueLatestTax)}
                      </td>

                      {/* TOTAL CLOSING VALUE */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(row.closingValueLatestTotal)}
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
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-950/20">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              {viewAll ? (
                <span>Showing <span className="font-bold text-blue-600 dark:text-blue-400">All {movementData.length} Stock Movement Audit Records</span></span>
              ) : (
                <span>Showing page <span className="font-bold text-slate-800 dark:text-slate-100">{page + 1}</span> ({movementData.length} records loaded)</span>
              )}
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
    </AdminLayout>
  );
}
