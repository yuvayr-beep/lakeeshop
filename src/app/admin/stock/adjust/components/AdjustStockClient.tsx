'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders, Search, Barcode, Plus, Loader2, CheckCircle2,
  RotateCcw, Info, Layers, Tag, ShieldAlert, Package, QrCode
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Interfaces
interface ProductCatalogItem {
  id: number;
  baseProductName: string;
  productCode: string;
  sku: string;
}

interface ProductDetails {
  id: number;
  baseProductName: string;
  defaultSku: string;
  brandName: string;
  productTypeName: string;
  modelName: string;
  modelNumber: string;
  categoryPath: string;
  mrp?: number;
  hsnCode?: string;
  taxPercentage?: number;
}

interface InventoryUnit {
  inventoryUnitId: number;
  productId: number;
  productCode: string;
  productName: string;
  locationId: number;
  locationCode: string;
  barcode: string;
  inventoryStatus: number;
  serialNumber: string | null;
  receivedDate: string;
  grnId: number | null;
  grnNumber: string | null;
  supplierInvoiceNumber: string | null;
  supplierName: string | null;
}

interface AdjustmentType {
  code: number;
  name: string;
  description: string;
  status: boolean;
}

export default function AdjustStockClient() {
  // Modes: 'catalog' (search from catalog dropdown) vs 'barcode' (scan barcode)
  const [mode, setMode] = useState<'catalog' | 'barcode'>('catalog');

  // Shared catalogs & metadata
  const [productsList, setProductsList] = useState<ProductCatalogItem[]>([]);
  const [adjustmentTypes, setAdjustmentTypes] = useState<AdjustmentType[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Autocomplete Dropdown State (for Catalog Mode)
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProductCatalogItem | null>(null);

  // Barcode Mode State
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [scannedUnit, setScannedUnit] = useState<InventoryUnit | null>(null);

  // Fetched Details
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Adjust Form State
  const [quantity, setQuantity] = useState<number>(1);
  const [newStatus, setNewStatus] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse NDJSON helper
  const parseNdjson = (text: string) => {
    if (!text) return [];
    return text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((item) => item !== null);
  };

  // Fetch initial products and adjustment types
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingInitial(true);
        const [prodRes, typesRes] = await Promise.all([
          axiosInstance.get('/prod/products', {
            headers: { Accept: 'application/x-ndjson' }
          }),
          axiosInstance.get('/stock/adjustments/types', {
            headers: { Accept: 'application/x-ndjson' }
          })
        ]);
        setProductsList(parseNdjson(prodRes.data));
        
        const parsedTypes = parseNdjson(typesRes.data) as AdjustmentType[];
        const activeTypes = parsedTypes.filter(t => t.status);
        setAdjustmentTypes(activeTypes);
        
        if (activeTypes.length > 0) {
          setNewStatus(String(activeTypes[0].code));
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        toast.error('Failed to load initial setup data.');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitialData();
  }, []);

  // Filter list for dropdown search
  const filteredProducts = useMemo(() => {
    if (!catalogSearch) return [];
    const query = catalogSearch.toLowerCase();
    return productsList.filter(
      (p) =>
        p.baseProductName?.toLowerCase().includes(query) ||
        p.productCode?.toLowerCase().includes(query) ||
        String(p.id).includes(query)
    ).slice(0, 10);
  }, [productsList, catalogSearch]);

  // Fetch full details of selected product
  const fetchProductDetails = async (productId: number) => {
    setLoadingDetails(true);
    try {
      const { data } = await axiosInstance.get(`/prod/products/${productId}`);
      if (data?.success && data?.data) {
        setProductDetails(data.data);
      } else {
        toast.error('Product details not found.');
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      toast.error('Error fetching product metadata.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle autocomplete item select
  const handleSelectCatalogItem = (item: ProductCatalogItem) => {
    setSelectedCatalogItem(item);
    setCatalogSearch(item.baseProductName);
    setIsFocused(false);
    fetchProductDetails(item.id);
  };

  // Handle Barcode lookup
  const handleSearchBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;

    setLoadingDetails(true);
    setScannedUnit(null);
    setProductDetails(null);

    try {
      const { data } = await axiosInstance.get(`/stock/units?barcode=${barcodeSearch.trim()}`);
      if (data && data.length > 0) {
        const unit = data[0] as InventoryUnit;
        setScannedUnit(unit);
        // Automatically fetch product metadata for the unit
        await fetchProductDetails(unit.productId);
        toast.success('Unit scanned and matched successfully!');
      } else {
        toast.error('No inventory unit found matching this barcode.');
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      toast.error('Error searching barcode.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Reset forms & lookups
  const handleReset = () => {
    setCatalogSearch('');
    setSelectedCatalogItem(null);
    setBarcodeSearch('');
    setScannedUnit(null);
    setProductDetails(null);
    setQuantity(1);
    setRemarks('');
    if (adjustmentTypes.length > 0) {
      setNewStatus(String(adjustmentTypes[0].code));
    }
  };

  // Submit stock adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productDetails) {
      toast.warning('Please select a product first.');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    if (!newStatus) {
      toast.error('Please select an adjustment status.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, any> = {
        productId: productDetails.id,
        quantity: quantity,
        newStatus: Number(newStatus),
        remarks: remarks.trim()
      };

      // If unit-level barcode scanned, append matching unit ID
      if (mode === 'barcode' && scannedUnit) {
        body.inventoryUnitId = scannedUnit.inventoryUnitId;
      }

      const { data } = await axiosInstance.post('/stock/adjustments', body);

      if (data?.success) {
        toast.success('Stock adjustment processed successfully.');
        handleReset();
      } else {
        toast.error(data?.message || 'Failed to adjust stock status.');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'API request failed.';
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
        <span className="text-sm text-slate-500 font-bold">Loading stock adjuster...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Sliders size={22} className="text-[var(--primary)]" />
          Adjust Stock
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Adjust the status of specific inventory units (using barcode scan) or available quantities of a product on a FIFO basis.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-start">
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1 border border-slate-200 dark:border-slate-750">
          <button
            onClick={() => { setMode('catalog'); handleReset(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              mode === 'catalog'
                ? 'bg-white dark:bg-slate-900 text-[var(--primary)] shadow-md scale-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800'
            }`}
          >
            <Package size={15} />
            Search Catalog Product
          </button>
          <button
            onClick={() => { setMode('barcode'); handleReset(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              mode === 'barcode'
                ? 'bg-white dark:bg-slate-900 text-[var(--primary)] shadow-md scale-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800'
            }`}
          >
            <Barcode size={15} />
            Scan Barcode
          </button>
        </div>
      </div>

      {/* 50/50 Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Search Form and Product Details */}
        <div className="space-y-6">
          {mode === 'catalog' ? (
            // CATALOG MODE SEARCH
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Search size={14} className="text-[var(--primary)]" />
                  Product Search
                </h6>
                {(selectedCatalogItem || catalogSearch) && (
                  <button
                    onClick={handleReset}
                    className="text-[10px] text-slate-500 hover:text-[var(--primary)] font-bold flex items-center gap-1 transition-all"
                  >
                    <RotateCcw size={10} />
                    Reset
                  </button>
                )}
              </div>
              <div className="p-5">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Lookup Product *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={catalogSearch}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                      onChange={(e) => {
                        setCatalogSearch(e.target.value);
                        setIsFocused(true);
                        if (selectedCatalogItem) {
                          setSelectedCatalogItem(null);
                          setProductDetails(null);
                        }
                      }}
                      placeholder="Type product name, code or SKU..."
                      className="w-full h-10 pl-3 pr-8 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-[var(--primary)] rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                    />
                    {selectedCatalogItem && (
                      <span className="absolute right-3 top-3 text-emerald-500">
                        <CheckCircle2 size={15} />
                      </span>
                    )}
                  </div>
                  {/* Dropdown Options */}
                  {isFocused && filteredProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                      {filteredProducts.map((p) => (
                        <button
                          key={`catalog-p-${p.id}`}
                          type="button"
                          onMouseDown={() => handleSelectCatalogItem(p)}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-105 dark:border-slate-800 last:border-b-0"
                        >
                          <div className="font-semibold">{p.baseProductName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.productCode}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // BARCODE MODE SEARCH
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Barcode size={14} className="text-[var(--primary)]" />
                  Scan barcode
                </h6>
                {(scannedUnit || barcodeSearch) && (
                  <button
                    onClick={handleReset}
                    className="text-[10px] text-slate-500 hover:text-[var(--primary)] font-bold flex items-center gap-1 transition-all"
                  >
                    <RotateCcw size={10} />
                    Reset
                  </button>
                )}
              </div>
              <form onSubmit={handleSearchBarcode} className="p-5">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Barcode Scan *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcodeSearch}
                      onChange={(e) => setBarcodeSearch(e.target.value)}
                      placeholder="Scan/input unique barcode ID..."
                      className="flex-1 h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-[var(--primary)] rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* LOADING details */}
          {loadingDetails && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
              <span className="text-xs text-slate-400 font-bold">Fetching product specifications...</span>
            </div>
          )}

          {/* PRODUCT SPECIFICATION DISPLAY */}
          {productDetails && !loadingDetails && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Info size={14} className="text-[var(--primary)]" />
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Product Details
                </h6>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Product Name</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 block">{productDetails.baseProductName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Product Code / SKU</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block mt-0.5">{productDetails.defaultSku}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Brand</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5">{productDetails.brandName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Model Name</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5">{productDetails.modelName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Model Number</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5">{productDetails.modelNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Product Type</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5">{productDetails.productTypeName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Tax Rate</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mt-0.5">{productDetails.taxPercentage ? `${productDetails.taxPercentage}%` : 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Category Hierarchy</span>
                  <div className="flex items-center gap-1 mt-1 text-xs font-bold text-[var(--primary)] bg-[var(--primary-light-bg)] p-2 rounded-xl border border-[var(--primary)]/30">
                    <Layers size={13} className="text-[var(--primary)]" />
                    <span>{productDetails.categoryPath}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* UNIT SPECIFICATION (For scanned items) */}
          {mode === 'barcode' && scannedUnit && !loadingDetails && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <QrCode size={14} className="text-[var(--primary)]" />
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Scanned Unit Profile
                </h6>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Inventory Unit ID</span>
                  <span className="font-bold text-slate-800 dark:text-white font-mono mt-0.5 block">{scannedUnit.inventoryUnitId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Current Location</span>
                  <span className="mt-0.5 block">
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 rounded font-bold uppercase text-[10px]">
                      {scannedUnit.locationCode}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Supplier</span>
                  <span className="font-bold text-slate-800 dark:text-white mt-0.5 block truncate" title={scannedUnit.supplierName || ''}>
                    {scannedUnit.supplierName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Invoice Number</span>
                  <span className="font-mono mt-0.5 block">{scannedUnit.supplierInvoiceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Goods Receipt Code</span>
                  <span className="font-mono mt-0.5 block">{scannedUnit.grnNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Received Date</span>
                  <span className="mt-0.5 block">{scannedUnit.receivedDate ? new Date(scannedUnit.receivedDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Update Adjustment Details Form */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 rounded-t-2xl">
              <ShieldAlert size={15} className="text-[var(--primary)]" />
              <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Submit Stock Adjustment
              </h6>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4">
              {/* Product selection safeguard warning */}
              {!productDetails && (
                <div className="p-4 bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
                  <Info size={18} className="text-amber-600 dark:text-amber-450 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">Selection Required</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-0.5">
                      Please look up a product or scan a unit barcode using the left-hand panel before entering adjustment details.
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Adjustment Quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  disabled={!productDetails || mode === 'barcode'} // Barcode scans are always exactly 1 unit
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="1"
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-[var(--primary)] rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-bold disabled:opacity-50"
                />
                {mode === 'barcode' && (
                  <span className="text-[10px] text-slate-400 block mt-1 italic">
                    Quantity is locked to 1 for unique barcode unit adjustments.
                  </span>
                )}
              </div>

              {/* New Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  New Status / Adjustment Type *
                </label>
                <select
                  value={newStatus}
                  disabled={!productDetails}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-[var(--primary)] rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold disabled:opacity-50"
                >
                  {adjustmentTypes.map((type) => (
                    <option key={`adj-type-${type.code}`} value={type.code}>
                      {type.name} ({type.description})
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Remarks / Reason
                </label>
                <textarea
                  value={remarks}
                  disabled={!productDetails}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide adjustment reason details..."
                  rows={4}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-[var(--primary)] rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 disabled:opacity-50"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !productDetails}
                  className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  Submit Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
