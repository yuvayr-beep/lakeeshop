'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  SlidersHorizontal, RefreshCw, Download, Search, X, Loader2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle, 
  Boxes, Package, ArrowDownLeft, Tag, CheckCircle2, ArrowUpDown, Calendar, Layers, DollarSign, MapPin
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Stock Adjustment Item Interface
interface StockAdjustmentItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  brand?: string | null;
  inventoryUnitId?: number | null;
  referenceId?: string | null;
  adjustmentType: string;
  qty: number;
  remarks?: string | null;
  transactionDate: string;
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

// Location Option Interface
interface LocationOption {
  id: number;
  warehouseId?: number;
  warehouseName?: string;
  locationCode?: string;
  rackNo?: string | null;
  shelfNo?: string | null;
  binNo?: string | null;
  zoneName?: string | null;
  locationType?: number;
  description?: string | null;
  status?: boolean;
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

// Format Date string
const formatDateTime = (dateStr: string | undefined | null) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

export default function StockAdjustmentsClient() {
  // Date Range Filters (Required)
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);

  // Filter States
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);

  // Main Data States
  const [adjustmentData, setAdjustmentData] = useState<StockAdjustmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pagination & View All States
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

  // Sorting
  const [sortField, setSortField] = useState<keyof StockAdjustmentItem | null>('transactionDate');
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

  // Fetch Stock Adjustments Data
  const fetchAdjustmentData = useCallback(async () => {
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
        params.size = 2000; // fetch all records
      }

      if (selectedProductId) {
        params.productId = selectedProductId;
      }

      if (selectedBrand) {
        params.brand = selectedBrand;
      }

      if (adjustmentTypeFilter) {
        params.adjustmentType = adjustmentTypeFilter;
      }

      if (selectedLocationId) {
        params.locationId = selectedLocationId;
      }

      const endpoint = viewAll ? '/stock/reports/adjustments' : '/stock/reports/adjustments/page';
      const res = await axiosInstance.get(endpoint, {
        params,
        headers: {
          Accept: 'application/x-ndjson, application/json',
        },
      });

      const parsedItems = parseNdjson(res.data);
      setAdjustmentData(parsedItems);

      if (!viewAll) {
        setHasNextPage(parsedItems.length === size);
      } else {
        setHasNextPage(false);
      }
    } catch (err: any) {
      console.error('Error fetching stock adjustments report data:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to load stock adjustments report data';
      setError(errMsg);
      toast.error(errMsg);
      setAdjustmentData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, size, viewAll, selectedProductId, selectedBrand, adjustmentTypeFilter, selectedLocationId]);

  useEffect(() => {
    fetchAdjustmentData();
  }, [fetchAdjustmentData]);

  // Fetch Active Locations API (/stock/location/active)
  useEffect(() => {
    const fetchActiveLocations = async () => {
      setLoadingLocations(true);
      try {
        const res = await axiosInstance.get('/stock/location/active', {
          headers: {
            Accept: 'application/x-ndjson, application/json',
          },
        });
        const items = parseNdjson(res.data);
        setLocationOptions(items);
      } catch (err) {
        console.error('Failed to fetch active locations:', err);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchActiveLocations();
  }, []);

  // Product Search API (/prod/products)
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

  // Brand List API (/prod/brands)
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

  // Handle Excel Export (Large job workflow)
  const handleExportExcel = async () => {
    setExporting(true);
    toast.info('Initializing Stock Adjustments Excel export job...');

    try {
      const params: Record<string, any> = {
        startDate,
        endDate,
      };
      if (selectedProductId) params.productId = selectedProductId;
      if (selectedBrand) params.brand = selectedBrand;
      if (adjustmentTypeFilter) params.adjustmentType = adjustmentTypeFilter;
      if (selectedLocationId) params.locationId = selectedLocationId;

      const initRes = await axiosInstance.get('/stock/reports/adjustments/excel', { params });
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
            toast.success('Stock Adjustments Excel generated! Downloading...');

            const downloadPath = currentJob?.downloadUrl || `/stock/reports/download/${jobId}`;
            const fileRes = await axiosInstance.get(downloadPath, { responseType: 'blob' });

            const blob = new Blob([fileRes.data], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentJob?.fileName || `STOCK_ADJUSTMENT_REPORT_${startDate}_${endDate}.xlsx`;
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
  const handleSort = (field: keyof StockAdjustmentItem) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Process & Sort Data
  const processedData = useMemo(() => {
    let result = [...adjustmentData];

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
  }, [adjustmentData, sortField, sortDirection]);

  // Calculated Summary Statistics
  const stats = useMemo(() => {
    const totalCount = adjustmentData.length;
    let totalQty = 0;
    let scrapCount = 0;
    let damageCount = 0;

    adjustmentData.forEach((row) => {
      const qty = row.qty || 0;
      totalQty += qty;

      if (row.adjustmentType === 'SCRAP') scrapCount++;
      if (row.adjustmentType === 'DAMAGE' || row.adjustmentType === 'DEFECTIVE') damageCount++;
    });

    return {
      totalCount,
      totalQty,
      scrapCount,
      damageCount,
    };
  }, [adjustmentData]);

  // Clear Filters
  const handleClearFilters = () => {
    setSelectedProductId(null);
    setSelectedProduct(null);
    setSelectedBrand('');
    setSelectedLocationId('');
    setProductSearchQuery('');
    setBrandSearchQuery('');
    setAdjustmentTypeFilter('');
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
                <Filter size={16} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Stock Adjustment Filters
                </h3>
              </div>

              {/* Stats 1: Total Adjustments */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Boxes size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Adjustments Loaded:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.totalCount.toLocaleString('en-IN')} records
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden xl:block shrink-0" />

              {/* Stats 2: Total Adjusted Qty */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowDownLeft size={14} className="text-red-600 dark:text-red-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Adjusted Qty:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {stats.totalQty.toLocaleString('en-IN')} units
                </span>
              </div>

              {/* Clear Filters Button (Inlined as last item) */}
              {(selectedProductId || selectedBrand || selectedLocationId || viewAll || adjustmentTypeFilter) && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-2.5 items-end">
            
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

            {/* 3. ADJUSTMENT TYPE DROPDOWN */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers size={13} className="text-purple-600" />
                <span>Adjustment Type</span>
              </label>
              <select
                value={adjustmentTypeFilter}
                onChange={(e) => {
                  setAdjustmentTypeFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full h-10 px-3 text-xs font-bold bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="">All Types (Default)</option>
                <option value="SCRAP">SCRAP (Scrap Stock)</option>
                <option value="WRITE_OFF">WRITE_OFF (Write Off Stock)</option>
                <option value="DAMAGE">DAMAGE (Damaged Stock)</option>
                <option value="DEFECTIVE">DEFECTIVE (Defective Stock)</option>
                <option value="OTHER">OTHER (Other Adjustments)</option>
              </select>
            </div>

            {/* 4. LOCATION FILTER DROPDOWN */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin size={13} className="text-emerald-600" />
                <span>Location</span>
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setPage(0);
                }}
                className="w-full h-10 px-3 text-xs font-bold bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="">All Locations (Default)</option>
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.locationCode || `LOC-${loc.id}`} {loc.warehouseName ? `(${loc.warehouseName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. PRODUCT SEARCH & SELECT */}
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
                    placeholder="Search product..."
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

            {/* 6. BRAND SEARCH & SELECT */}
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

            {/* 7. ACTIONS: REFRESH & EXPORT EXCEL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-transparent select-none hidden xl:block">
                Actions
              </label>
              <div className="flex items-center gap-1.5 h-10">
                <button
                  type="button"
                  onClick={fetchAdjustmentData}
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
                {viewAll ? 'Fetching all stock adjustment records...' : 'Fetching stock adjustments report data...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4 flex-1 flex flex-col justify-center">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchAdjustmentData}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : processedData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center">
              <SlidersHorizontal size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No stock adjustment records found for date range ({startDate} to {endDate})
              </p>
              <p className="text-[11px] text-slate-400">
                Try selecting a different date range or clearing product/brand/location/type filters.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-full whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800 shadow-2xs">
                  <tr className="bg-slate-50 dark:bg-slate-955 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('id')}>
                      <div className="flex items-center gap-1">
                        <span>Log ID</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('transactionDate')}>
                      <div className="flex items-center gap-1">
                        <span>Date & Time</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('productCode')}>
                      <div className="flex items-center gap-1">
                        <span>Code / SKU</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('productName')}>
                      <div className="flex items-center gap-1">
                        <span>Product Name</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('brand')}>
                      <div className="flex items-center gap-1">
                        <span>Brand</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('adjustmentType')}>
                      <div className="flex items-center gap-1">
                        <span>Adjustment Type</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('referenceId')}>
                      <div className="flex items-center gap-1">
                        <span>Ref / Unit ID</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('qty')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Adjusted Qty</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => handleSort('remarks')}>
                      <div className="flex items-center gap-1">
                        <span>Remarks</span>
                        <ArrowUpDown size={12} />
                      </div>
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
                        {formatDateTime(row.transactionDate)}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                        {row.productCode ? (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
                            {row.productCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap" title={row.productName}>
                        {row.productName}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {row.brand ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 whitespace-nowrap">
                            {row.brand}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unbranded</span>
                        )}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.adjustmentType === 'SCRAP'
                            ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200/60'
                            : row.adjustmentType === 'DAMAGE' || row.adjustmentType === 'DEFECTIVE'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60'
                            : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60'
                        } whitespace-nowrap`}>
                          {row.adjustmentType || 'ADJUSTMENT'}
                        </span>
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                        {row.referenceId ? (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 font-bold whitespace-nowrap">
                            {row.referenceId}
                          </span>
                        ) : row.inventoryUnitId ? (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 font-bold whitespace-nowrap">
                            Unit #{row.inventoryUnitId}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/60">
                          {row.qty || 0}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap" title={row.remarks || ''}>
                        {row.remarks || '—'}
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
                <span>Showing <span className="font-bold text-blue-600 dark:text-blue-400">All {adjustmentData.length} Stock Adjustment Records</span></span>
              ) : (
                <span>Showing page <span className="font-bold text-slate-800 dark:text-slate-100">{page + 1}</span> ({adjustmentData.length} records loaded)</span>
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
                  <option value="ALL">✨ All Adjustments</option>
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

      </div>
  );
}
