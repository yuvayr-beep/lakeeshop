'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FileText, RefreshCw, Download, Search, X, Loader2, 
  ChevronLeft, ChevronRight, Filter, AlertCircle, 
  Boxes, Package, ArrowDownLeft, Tag, CheckCircle2, ArrowUpDown, Calendar, DollarSign, Building2, ChevronDown, ChevronUp, Edit3, Save, Warehouse
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Supplier Invoice GRN Item Interface
interface SupplierInvoiceGrnItem {
  id: number;
  grnId: number;
  grnNumber: string;
  grnDate: string;
  warehouseId: number;
  warehouseName: string;
  invoiceNumber: string;
  invoiceDate: string;
  productId: number;
  productCode: string;
  productName: string;
  brand: string;
  hsnCode: string;
  taxPercentage: number;
  invoiceQty: number;
  receivedQty: number;
  unitPrice: number;
  totalValue: number;
  shortSupply: number;
}

// Grouped Invoice Interface for Accordion
interface GroupedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  grnNumber: string;
  grnDate: string;
  warehouseName: string;
  warehouseId: number;
  items: SupplierInvoiceGrnItem[];
  totalQty: number;
  totalReceivedQty: number;
  totalValue: number;
  itemCount: number;
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

// Warehouse Option Interface
interface WarehouseOption {
  id: number;
  name: string;
  type?: string;
  address?: string;
  city?: string;
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

export default function SupplierInvoiceReportClient() {
  // Date Range Filters (Required)
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);

  // Additional Filter States
  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState<boolean>(false);

  // Main Data States
  const [reportItems, setReportItems] = useState<SupplierInvoiceGrnItem[]>([]);
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

  // Accordion Expanded State (Set of invoice keys)
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<SupplierInvoiceGrnItem | null>(null);
  const [editInvoiceNo, setEditInvoiceNo] = useState<string>('');
  const [editInvoiceDate, setEditInvoiceDate] = useState<string>('');
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0);
  const [editInvoiceQty, setEditInvoiceQty] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  // Refs
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

  // Fetch Active Warehouses API (/stock/warehouse/active)
  useEffect(() => {
    const fetchActiveWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const res = await axiosInstance.get('/stock/warehouse/active', {
          headers: { Accept: 'application/x-ndjson, application/json, */*' },
        });
        const parsed = parseNdjson(res.data);
        setWarehouseOptions(parsed);
      } catch (err) {
        console.error('Failed to fetch active warehouses:', err);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchActiveWarehouses();
  }, []);

  // Product Search API (/prod/products)
  useEffect(() => {
    if (!productSearchQuery.trim() || productSearchQuery.trim().length < 2) {
      setProductOptions([]);
      return;
    }

    const timer = setTimeout(() => {
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
          console.error('Failed to search products:', err);
          setProductOptions([]);
        })
        .finally(() => setLoadingProducts(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [productSearchQuery]);

  // Brand List API (/prod/brands)
  useEffect(() => {
    const fetchBrands = async () => {
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
    };
    fetchBrands();
  }, []);

  // Filtered Brands
  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return brandOptions;
    const q = brandSearchQuery.toLowerCase();
    return brandOptions.filter((b) => {
      const name = b.brandName || b.name || b.displayName || b.code || '';
      return name.toLowerCase().includes(q);
    });
  }, [brandOptions, brandSearchQuery]);

  // Fetch Report Data
  const fetchReportData = useCallback(async () => {
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

      if (selectedProductId) params.productId = selectedProductId;
      if (selectedBrand) params.brand = selectedBrand;
      if (invoiceNumberInput.trim()) params.invoiceNumber = invoiceNumberInput.trim();
      if (selectedWarehouseId) params.warehouseId = selectedWarehouseId;

      const endpointUrl = viewAll ? '/stock/reports/supplier-invoices' : '/stock/reports/supplier-invoices/page';
      const res = await axiosInstance.get(endpointUrl, {
        params,
        headers: { Accept: 'application/x-ndjson, application/json, */*' },
      });

      const parsed = parseNdjson(res.data) as SupplierInvoiceGrnItem[];
      setReportItems(parsed);
      setHasNextPage(!viewAll && parsed.length >= size);

      // Always keep collapsed by default; user can expand manually
      setExpandedInvoices({});

    } catch (err: any) {
      console.error('Error fetching Supplier Invoice GRN Report:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to load supplier invoice report data';
      setError(errMsg);
      toast.error(errMsg);
      setReportItems([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, size, viewAll, selectedProductId, selectedBrand, invoiceNumberInput, selectedWarehouseId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Group Data by invoiceNumber for Accordion Model
  const groupedInvoices = useMemo(() => {
    const groupsMap: Record<string, GroupedInvoice> = {};

    reportItems.forEach((item) => {
      const invKey = item.invoiceNumber || `NO_INV_${item.grnNumber || item.id}`;

      if (!groupsMap[invKey]) {
        groupsMap[invKey] = {
          invoiceNumber: item.invoiceNumber || 'N/A',
          invoiceDate: item.invoiceDate || item.grnDate || '',
          grnNumber: item.grnNumber || 'N/A',
          grnDate: item.grnDate || '',
          warehouseName: item.warehouseName || 'Warehouse',
          warehouseId: item.warehouseId,
          items: [],
          totalQty: 0,
          totalReceivedQty: 0,
          totalValue: 0,
          itemCount: 0,
        };
      }

      const grp = groupsMap[invKey];
      grp.items.push(item);
      grp.totalQty += item.invoiceQty || 0;
      grp.totalReceivedQty += item.receivedQty || 0;
      grp.totalValue += item.totalValue || 0;
      grp.itemCount += 1;
    });

    return Object.values(groupsMap);
  }, [reportItems]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalLineItems = reportItems.length;
    const totalInvoices = groupedInvoices.length;
    let totalQty = 0;
    let totalValue = 0;

    reportItems.forEach((row) => {
      totalQty += row.invoiceQty || 0;
      totalValue += row.totalValue || 0;
    });

    return {
      totalInvoices,
      totalLineItems,
      totalQty,
      totalValue,
    };
  }, [reportItems, groupedInvoices]);

  // Toggle Accordion Group
  const toggleAccordion = (invKey: string) => {
    setExpandedInvoices((prev) => ({
      ...prev,
      [invKey]: !prev[invKey],
    }));
  };

  // Expand / Collapse All
  const toggleAllAccordions = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    groupedInvoices.forEach((grp) => {
      updated[grp.invoiceNumber] = expand;
    });
    setExpandedInvoices(updated);
  };

  // Open Edit Modal for GRN Item
  const handleOpenEdit = (item: SupplierInvoiceGrnItem) => {
    setEditingItem(item);
    setEditInvoiceNo(item.invoiceNumber || '');
    setEditInvoiceDate(item.invoiceDate ? item.invoiceDate.split('T')[0] : '');
    setEditUnitPrice(item.unitPrice || 0);
    setEditInvoiceQty(item.invoiceQty || 0);
  };

  // Save Edit (PUT /stock/reports/supplier-invoices/{id})
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    const toastId = toast.loading('Updating GRN item invoice details...');

    try {
      const calculatedTotal = Number(editUnitPrice) * Number(editInvoiceQty) * (1 + (editingItem.taxPercentage || 0) / 100);

      const payload = {
        id: editingItem.id,
        grnId: editingItem.grnId || 0,
        grnNumber: editingItem.grnNumber || '',
        grnDate: editingItem.grnDate || '',
        warehouseId: editingItem.warehouseId || 0,
        warehouseName: editingItem.warehouseName || '',
        invoiceNumber: editInvoiceNo,
        invoiceDate: editInvoiceDate,
        productId: editingItem.productId || 0,
        productCode: editingItem.productCode || '',
        productName: editingItem.productName || '',
        brand: editingItem.brand || '',
        hsnCode: editingItem.hsnCode || '',
        taxPercentage: editingItem.taxPercentage || 0,
        invoiceQty: Number(editInvoiceQty),
        receivedQty: editingItem.receivedQty || 0,
        unitPrice: Number(editUnitPrice),
        totalValue: calculatedTotal || editingItem.totalValue || 0,
        shortSupply: editingItem.shortSupply || 0,
      };

      await axiosInstance.put(`/stock/reports/supplier-invoices/${editingItem.id}`, payload);
      toast.success('Supplier invoice item updated successfully!', { id: toastId });
      setEditingItem(null);
      fetchReportData();
    } catch (err: any) {
      console.error('Failed to update supplier invoice item:', err);
      toast.error(err?.response?.data?.message || 'Failed to update invoice item', { id: toastId });
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Excel Export (Large job workflow)
  const handleExportExcel = async () => {
    setExporting(true);
    toast.info('Initializing Supplier Invoice Excel export job...');

    try {
      const params: Record<string, any> = {
        startDate,
        endDate,
      };
      if (selectedProductId) params.productId = selectedProductId;
      if (selectedBrand) params.brand = selectedBrand;
      if (invoiceNumberInput.trim()) params.invoiceNumber = invoiceNumberInput.trim();
      if (selectedWarehouseId) params.warehouseId = selectedWarehouseId;

      const initRes = await axiosInstance.get('/stock/reports/supplier-invoices/excel', { params });
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
            toast.success('Supplier Invoice Excel generated! Downloading...');

            const downloadPath = currentJob?.downloadUrl || `/stock/reports/download/${jobId}`;
            const fileRes = await axiosInstance.get(downloadPath, { responseType: 'blob' });

            const blob = new Blob([fileRes.data], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentJob?.fileName || `SUPPLIER_INVOICE_REPORT_${startDate}_${endDate}.xlsx`;
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

  // Clear Filters
  const handleClearFilters = () => {
    setSelectedProductId(null);
    setSelectedProduct(null);
    setSelectedBrand('');
    setSelectedWarehouseId('');
    setInvoiceNumberInput('');
    setProductSearchQuery('');
    setBrandSearchQuery('');
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
                  Supplier Invoice Filters
                </h3>
              </div>

              {/* Stats 1: Total Invoices */}
              <div className="flex items-center gap-1.5 shrink-0">
                <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Invoices:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {stats.totalInvoices.toLocaleString('en-IN')} invoices ({stats.totalLineItems} items)
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

              {/* Stats 3: Total Value */}
              <div className="flex items-center gap-1.5 shrink-0">
                <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Valuation:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(stats.totalValue)}
                </span>
              </div>

              {/* Clear Filters Button (Inlined as last item) */}
              {(selectedProductId || selectedBrand || selectedWarehouseId || invoiceNumberInput || viewAll) && (
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

            {/* 3. WAREHOUSE DROPDOWN */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Warehouse size={13} className="text-amber-600" />
                <span>Warehouse</span>
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value);
                  setPage(0);
                }}
                className="w-full h-10 px-3 text-xs font-bold bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="">All Warehouses (Default)</option>
                {warehouseOptions.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} {wh.city ? `(${wh.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. INVOICE NUMBER INPUT */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText size={13} className="text-purple-600" />
                <span>Invoice Number</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={invoiceNumberInput}
                  onChange={(e) => {
                    setInvoiceNumberInput(e.target.value);
                    setPage(0);
                  }}
                  placeholder="e.g. INV001/001"
                  className="w-full h-10 px-3 pr-8 text-xs font-bold bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 dark:text-slate-100"
                />
                {invoiceNumberInput && (
                  <button
                    onClick={() => {
                      setInvoiceNumberInput('');
                      setPage(0);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* 5. PRODUCT SEARCH & SELECT */}
            <div className="space-y-1.5 relative" ref={productDropdownRef}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Product Filter</span>
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
                  onClick={fetchReportData}
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
        {/* REPORT DATA TABLE (ACCORDION MODEL BY INVOICE NUMBER) */}
        {/* =================================================================== */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden flex flex-col">
          
          {/* Accordion Controls Bar */}
          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold">
              <span>Grouped by <strong className="text-slate-900 dark:text-white">Invoice Number</strong></span>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full font-bold text-[10px]">
                {groupedInvoices.length} Invoices
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAllAccordions(true)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <ChevronDown size={13} /> Expand All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => toggleAllAccordions(false)}
                className="text-[11px] font-bold text-slate-500 hover:underline flex items-center gap-1"
              >
                <ChevronUp size={13} /> Collapse All
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3 flex-1 flex flex-col justify-center">
              <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Fetching supplier invoice GRN items audit report...
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4 flex-1 flex flex-col justify-center">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchReportData}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : groupedInvoices.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center">
              <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No supplier invoice records found for date range ({startDate} to {endDate})
              </p>
              <p className="text-[11px] text-slate-400">
                Try selecting a different date range or clearing product/brand/warehouse/invoice filters.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-full whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-955 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Invoice Details</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">GRN Ref & Date</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Warehouse</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center">Items</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Invoice Qty</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Received Qty</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Total Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 font-medium whitespace-nowrap">
                  {groupedInvoices.map((grp) => {
                    const isExpanded = !!expandedInvoices[grp.invoiceNumber];

                    return (
                      <React.Fragment key={grp.invoiceNumber}>
                        {/* PARENT ACCORDION ROW */}
                        <tr
                          onClick={() => toggleAccordion(grp.invoiceNumber)}
                          className="bg-slate-50/80 hover:bg-blue-50/60 dark:bg-slate-850 dark:hover:bg-slate-800/80 cursor-pointer transition-colors text-slate-900 dark:text-white font-bold border-t border-slate-200/60 dark:border-slate-800 whitespace-nowrap"
                        >
                          <td className="py-3 px-3 text-center text-slate-400">
                            {isExpanded ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} />}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold border border-blue-200 dark:border-blue-800">
                                {grp.invoiceNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                Date: {formatDateOnly(grp.invoiceDate)}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 font-bold mr-2">
                              {grp.grnNumber}
                            </span>
                            <span className="text-slate-500 font-normal">{formatDateOnly(grp.grnDate)}</span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60">
                              {grp.warehouseName}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {grp.itemCount} item(s)
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-xs font-bold whitespace-nowrap">
                            {grp.totalQty.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {grp.totalReceivedQty.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                            {formatCurrency(grp.totalValue)}
                          </td>
                        </tr>

                        {/* EXPANDED CHILD ITEMS TABLE */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0 bg-slate-50/30 dark:bg-slate-950/40">
                              <div className="p-3 pl-8 pr-4 border-b border-slate-200/60 dark:border-slate-800">
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                        <th className="py-2 px-3">Product SKU & Code</th>
                                        <th className="py-2 px-3">Product Name</th>
                                        <th className="py-2 px-3">Brand</th>
                                        <th className="py-2 px-3">HSN Code</th>
                                        <th className="py-2 px-3 text-right">Tax %</th>
                                        <th className="py-2 px-3 text-right">Unit Price</th>
                                        <th className="py-2 px-3 text-right">Invoice Qty</th>
                                        <th className="py-2 px-3 text-right">Received Qty</th>
                                        <th className="py-2 px-3 text-right">Short Supply</th>
                                        <th className="py-2 px-3 text-right">Total Value</th>
                                        <th className="py-2 px-3 text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                                      {grp.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            {item.productCode || 'N/A'}
                                          </td>
                                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100" title={item.productName}>
                                            {item.productName}
                                          </td>
                                          <td className="py-2 px-3">
                                            {item.brand ? (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60">
                                                {item.brand}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 italic">Unbranded</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                            {item.hsnCode || '—'}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                            {item.taxPercentage ? `${item.taxPercentage}%` : '0%'}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                                            {formatCurrency(item.unitPrice)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                            {item.invoiceQty}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {item.receivedQty}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono">
                                            {item.shortSupply > 0 ? (
                                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200">
                                                -{item.shortSupply}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400">0</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                            {formatCurrency(item.totalValue)}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEdit(item);
                                              }}
                                              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                                              title="Edit GRN Item Details (Price, Qty, Invoice No)"
                                            >
                                              <Edit3 size={13} /> Edit
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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
                <span>Showing <span className="font-bold text-blue-600 dark:text-blue-400">All {reportItems.length} Supplier Invoice GRN Items</span></span>
              ) : (
                <span>Showing page <span className="font-bold text-slate-800 dark:text-slate-100">{page + 1}</span> ({reportItems.length} items loaded across {groupedInvoices.length} invoices)</span>
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
                  <option value="ALL">✨ All Invoices</option>
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
        {/* EDIT GRN ITEM INVOICE DETAILS MODAL (PUT /stock/reports/supplier-invoices/{id}) */}
        {/* =================================================================== */}
        {editingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit GRN Item Invoice Details
                  </h3>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1 text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{editingItem.productName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono">
                  <span>SKU: {editingItem.productCode}</span>
                  <span>GRN: {editingItem.grnNumber}</span>
                  <span>ID: #{editingItem.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. INVOICE NUMBER */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={editInvoiceNo}
                    onChange={(e) => setEditInvoiceNo(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                {/* 2. INVOICE DATE */}
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

                {/* 3. UNIT PRICE */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                {/* 4. INVOICE QTY */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Invoice Qty
                  </label>
                  <input
                    type="number"
                    value={editInvoiceQty}
                    onChange={(e) => setEditInvoiceQty(Number(e.target.value))}
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
