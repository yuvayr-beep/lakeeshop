'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  BarChart3, RefreshCw, Download, Search, X, Loader2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle, 
  Boxes, Package, DollarSign, Tag, CheckCircle2, ArrowUpDown
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Stock Status Item Interface
interface StockStatusItem {
  productId: number;
  productCode: string;
  productName: string;
  brand?: string | null;
  availableQty: number;
  averageCourierPrice: number;
  originalCost: number;
  originalValue: number;
  latestCost: number;
  latestValue: number;
}

// Product Search Dropdown Item Interface
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

// Helper: Parse NDJSON or standard JSON response
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

// Helper: Format Currency (INR)
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

export default function CurrentStockStatusClient() {
  // Main Data States
  const [reportData, setReportData] = useState<StockStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pagination & View Mode States (0-indexed backend page, 1-indexed UI page)
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Selected Filters
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  // Product Search Dropdown States (from admin/products/client-share)
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);

  // Brand Dropdown States (from admin/products/brand)
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState<boolean>(false);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  // Sorting Table Columns
  const [sortField, setSortField] = useState<keyof StockStatusItem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Refs for click outside dropdowns
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
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
  // 1. FETCH MAIN REPORT DATA (GET /stock/reports/current-status OR /page)
  // ---------------------------------------------------------------------------
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError('');

    // Build Query Parameters
    const params = new URLSearchParams();
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
      ? `/stock/reports/current-status${queryString}`
      : `/stock/reports/current-status/page${queryString}`;

    console.log('====================================');
    console.log(`[API REQUEST] GET ${endpointUrl} (${viewAll ? 'UNPAGINATED ALL PRODUCTS' : 'PAGINATED'})`);
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

      const parsed = parseNdjson(res.data) as StockStatusItem[];
      setReportData(parsed);

      // Check pagination boundary if in paginated mode
      setHasNextPage(!viewAll && parsed.length >= size);
    } catch (err: any) {
      console.error('Failed to fetch Current Stock Status Report:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to load report data.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [viewAll, page, size, selectedProductId, selectedBrand]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // ---------------------------------------------------------------------------
  // 2. PRODUCT SEARCH DROPDOWN API (from admin/products/client-share pattern)
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
  // 3. BRAND LIST API (from admin/products/brand pattern)
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

  // Filtered Brands based on search query
  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return brandOptions;
    const q = brandSearchQuery.toLowerCase();
    return brandOptions.filter((b) => {
      const name = b.brandName || b.name || b.displayName || b.code || '';
      return name.toLowerCase().includes(q);
    });
  }, [brandOptions, brandSearchQuery]);

  // ---------------------------------------------------------------------------
  // 4. EXCEL DOWNLOAD HANDLER (GET /stock/reports/current-status/excel)
  // ---------------------------------------------------------------------------
  const handleExportExcel = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating & downloading Excel report...');

    const params = new URLSearchParams();
    if (selectedProductId) {
      params.append('productId', String(selectedProductId));
    }
    if (selectedBrand.trim()) {
      params.append('brand', selectedBrand.trim());
    }

    const excelUrl = `/stock/reports/current-status/excel${params.toString() ? `?${params.toString()}` : ''}`;

    console.log('====================================');
    console.log(`[API REQUEST] EXCEL DOWNLOAD: GET ${excelUrl}`);
    console.log('cURL command for Swagger:');
    console.log(
      `curl -X 'GET' \\\n  'https://v2.lakeetech.com${excelUrl}' \\\n  -H 'accept: */*' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
    );
    console.log('====================================');

    try {
      const res = await axiosInstance.get(excelUrl, {
        responseType: 'blob',
        headers: { Accept: '*/*' },
      });

      const contentType = (res.headers && res.headers['content-type']) ? String(res.headers['content-type']) : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([res.data], { type: contentType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `current_stock_status_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Excel report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Failed to download Excel report:', err);
      toast.error('Failed to download Excel report.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. SORTING & STATISTICS CALCULATIONS
  // ---------------------------------------------------------------------------
  const handleSort = (field: keyof StockStatusItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const processedData = useMemo(() => {
    if (!sortField) return reportData;
    return [...reportData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === null || valA === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [reportData, sortField, sortDirection]);

  // Statistics Summary
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalOrigVal = 0;
    let totalLatestVal = 0;
    let countWithStock = 0;

    reportData.forEach((item) => {
      totalQty += item.availableQty || 0;
      totalOrigVal += item.originalValue || 0;
      totalLatestVal += item.latestValue || 0;
      if (item.availableQty > 0) countWithStock++;
    });

    return {
      totalItems: reportData.length,
      countWithStock,
      totalQty,
      totalOrigVal,
      totalLatestVal,
    };
  }, [reportData]);

  // Clear All Filters
  const handleClearFilters = () => {
    setSelectedProductId(null);
    setSelectedProduct(null);
    setSelectedBrand('');
    setProductSearchQuery('');
    setBrandSearchQuery('');
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
              <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
              Current Stock Status Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live inventory valuation, available quantities, courier costs, and valuation tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-2xs"
              title="Refresh Report Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-2xs transition-all hover:shadow-sm"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export Excel
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Products Loaded</p>
              <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                {stats.totalItems} <span className="text-xs font-normal text-slate-400">({stats.countWithStock} in stock)</span>
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Available Qty</p>
              <h4 className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.totalQty.toLocaleString('en-IN')} units
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Original Valuation</p>
              <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                {formatCurrency(stats.totalOrigVal)}
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
              <Tag size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Latest Valuation</p>
              <h4 className="text-base font-extrabold text-violet-600 dark:text-violet-400 mt-0.5">
                {formatCurrency(stats.totalLatestVal)}
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
                Filter Stock Reports
              </h3>
            </div>

            {(selectedProductId || selectedBrand || viewAll) && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
              >
                <X size={14} /> Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            
            {/* --------------------------------------------------------------- */}
            {/* 1. PRODUCT SEARCH & SELECT DROPDOWN */}
            {/* --------------------------------------------------------------- */}
            <div className="space-y-1.5 relative" ref={productDropdownRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>1. Select Product</span>
                {selectedProductId && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                    ID: {selectedProductId}
                  </span>
                )}
              </label>

              {selectedProduct ? (
                <div className="h-10 px-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-xl flex items-center justify-between text-xs">
                  <div className="truncate font-semibold text-blue-950 dark:text-blue-100 pr-2">
                    <span className="font-bold">{selectedProduct.productName || selectedProduct.baseProductName}</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 ml-1.5 font-mono">
                      ({selectedProduct.defaultSku || selectedProduct.productCode || selectedProduct.skuCode})
                    </span>
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
                    placeholder="Search product by name or SKU..."
                    className="w-full h-10 pl-9 pr-9 text-xs bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                  />
                  {loadingProducts && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600" />
                  )}
                </div>
              )}

              {/* Product Dropdown Results Popup */}
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

            {/* --------------------------------------------------------------- */}
            {/* 2. BRAND SEARCH & SELECT DROPDOWN */}
            {/* --------------------------------------------------------------- */}
            <div className="space-y-1.5 relative" ref={brandDropdownRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Select Brand
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
                    placeholder="Search brand (e.g. Bajaj, Samsung)..."
                    className="w-full h-10 pl-9 pr-9 text-xs bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-all"
                  />
                  {loadingBrands && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-amber-600" />
                  )}
                </div>
              )}

              {/* Brand Dropdown Results Popup */}
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

            {/* --------------------------------------------------------------- */}
            {/* 3. ROWS PER PAGE / VIEW MODE SELECTOR */}
            {/* --------------------------------------------------------------- */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                View Mode / Rows
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
                className="w-full h-10 px-3 text-xs bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-semibold cursor-pointer"
              >
                <option value={10}>10 rows (Paginated)</option>
                <option value={20}>20 rows (Default Paginated)</option>
                <option value={50}>50 rows (Paginated)</option>
                <option value={100}>100 rows (Paginated)</option>
                <option value="ALL">✨ All Products</option>
              </select>
            </div>

          </div>
        </div>

        {/* =================================================================== */}
        {/* REPORT DATA TABLE SECTION */}
        {/* =================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden">
          
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3">
              <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {viewAll ? 'Fetching all products...' : 'Fetching stock status report data...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchReportData}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : processedData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <Boxes size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No stock status records found
              </p>
              <p className="text-[11px] text-slate-400">
                Try clearing selected product/brand filters or choosing another view mode.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('productId')}>
                      <div className="flex items-center gap-1">
                        <span>Product ID</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('productCode')}>
                      <div className="flex items-center gap-1">
                        <span>Code / SKU</span>
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
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('availableQty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Available Qty</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('averageCourierPrice')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Avg Courier Price</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('originalCost')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Original Cost</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('originalValue')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Original Value</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('latestCost')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Latest Cost</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('latestValue')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Latest Value</span>
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
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                        #{row.productId}
                      </td>

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

                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                          row.availableQty > 0 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/60 dark:border-slate-700'
                        }`}>
                          {row.availableQty}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(row.averageCourierPrice)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(row.originalCost)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(row.originalValue)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(row.latestCost)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-violet-700 dark:text-violet-300">
                        {formatCurrency(row.latestValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================================== */}
          {/* PAGINATION / VIEW FOOTER BAR */}
          {/* =================================================================== */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-950/20">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              {viewAll ? (
                <span>Showing <span className="font-bold text-blue-600 dark:text-blue-400">All {reportData.length} Products</span></span>
              ) : (
                <span>Showing page <span className="font-bold text-slate-800 dark:text-slate-100">{page + 1}</span> ({reportData.length} records loaded)</span>
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
