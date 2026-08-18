'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Search, Barcode, Plus, Loader2, CheckCircle2,
  Trash2, ShieldAlert, Info, Layers, Tag, Activity, FileText,
  Package, QrCode, MapPin, RotateCcw, ChevronRight, Upload, Check, Download
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

export default function DamagedProductsClient() {
  // Modes: 'catalog' (search from catalog dropdown) vs 'barcode' (scan barcode)
  const [mode, setMode] = useState<'catalog' | 'barcode'>('catalog');

  // Shared catalogs
  const [productsList, setProductsList] = useState<ProductCatalogItem[]>([]);
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

  // Damage Entry Form State
  const [quantity, setQuantity] = useState<number>(1);
  const [source, setSource] = useState<string>('WAREHOUSE');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Excel Upload
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  // Fetch product list for autocomplete lookup
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingInitial(true);
        const { data } = await axiosInstance.get('/prod/products', {
          headers: { Accept: 'application/x-ndjson' }
        });
        setProductsList(parseNdjson(data));
      } catch (err) {
        console.error('Failed to load products list:', err);
        toast.error('Failed to load product catalog.');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchCatalog();
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
      toast.error('Error fetching product metadata from server.');
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
    setSource('WAREHOUSE');
    setReason('');
  };

  // Submit damage record update
  const handleSubmitDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productDetails) {
      toast.warning('Please search and select a product first.');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason field is required to submit damage record.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, any> = {
        productId: productDetails.id,
        quantity: quantity,
        source: source,
        reason: reason.trim()
      };

      // If unit level barcode scanned, append matching unit context
      if (mode === 'barcode' && scannedUnit) {
        body.inventoryUnitId = scannedUnit.inventoryUnitId;
        body.grnId = scannedUnit.grnId || 0;
        body.poId = 0; // default PO ID
      }

      const { data } = await axiosInstance.post('/stock/damaged', body);

      if (data?.success) {
        toast.success(`Successfully marked product stock as damaged (Record ID: ${data.data?.id})`);
        handleReset();
      } else {
        toast.error(data?.message || 'Failed to report damage stock.');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'API request failed.';
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading damaged log template...');
    try {
      const response = await axiosInstance.get('/stock/damaged/template', {
        responseType: 'blob',
        headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `damaged_log_template_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Template downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download template', { id: toastId });
    }
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const toastId = toast.loading('Uploading damaged Excel file...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await axiosInstance.post('/stock/damaged/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Damaged logs uploaded and processed successfully!', { id: toastId });
      setSelectedFile(null);
      setShowUploadArea(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + (err.response?.data?.message || err.message), { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
        <span className="text-sm text-slate-500 font-bold">Loading damage manager...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-500 animate-pulse" />
            Damaged & Defective Stock
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Record, track, and classify stock damaged in warehouses or retail outlets, and assign specific repair/write-off reason codes.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowUploadArea(!showUploadArea)}
            className={`flex items-center justify-center gap-2 h-10 px-4 text-xs font-bold rounded-xl shadow-sm transition-all border ${
              showUploadArea
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] border-[var(--primary)]'
                : 'bg-[var(--primary-light-bg)] text-[var(--primary)] border border-[var(--primary)]/30'
            }`}
          >
            <Upload size={14} /> Upload
          </button>
        </div>
      </div>

      {/* Upload Files Expandable Area */}
      {showUploadArea && (
        <div className="bg-slate-50 dark:bg-slate-955 border border-dashed border-slate-205 dark:border-slate-805 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Bulk Damaged Log Upload via Excel
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download the damaged log template, fill in the details, and upload it below.
              </p>
            </div>
            <button
              onClick={() => {
                setShowUploadArea(false);
                setSelectedFile(null);
              }}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-105 dark:hover:bg-slate-850 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <label
              className="flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed border-slate-350 hover:border-blue-500 dark:border-slate-750 dark:hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-955 dark:hover:bg-slate-950/40 rounded-xl cursor-pointer transition-all p-4 text-center"
            >
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-955 text-blue-600 dark:text-blue-450 rounded-xl shadow-sm">
                  <FileText size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedFile ? (
                    <span className="text-blue-600 font-bold">{selectedFile.name}</span>
                  ) : (
                    <span>Drag your file here or <span className="text-blue-600 hover:underline">Browse</span></span>
                  )}
                </p>
                <p className="text-[10px] text-slate-450">File format: .xls & .xlsx</p>
              </div>
              <input
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </label>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-750 transition-colors shadow-sm"
              >
                <Download size={12} />
                Download Template Excel
              </button>

              {selectedFile && (
                <button
                  onClick={handleUploadExcel}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
                >
                  {uploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  {uploading ? 'Uploading...' : 'Submit Upload'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex justify-start">
        <div className="bg-slate-105 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1 border border-slate-200 dark:border-slate-750">
          <button
            onClick={() => { setMode('catalog'); handleReset(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              mode === 'catalog'
                ? 'bg-white dark:bg-slate-900 text-red-500 shadow-md scale-100'
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
                ? 'bg-white dark:bg-slate-900 text-red-500 shadow-md scale-100'
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
                  <Search size={14} className="text-red-500" />
                  Product Search
                </h6>
                {(selectedCatalogItem || catalogSearch) && (
                  <button
                    onClick={handleReset}
                    className="text-[10px] text-slate-500 hover:text-red-500 font-bold flex items-center gap-1 transition-all"
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
                      className="w-full h-10 pl-3 pr-8 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-red-500 rounded-xl focus:outline-none text-slate-805 dark:text-slate-200 font-semibold"
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
                  <Barcode size={14} className="text-red-500" />
                  Scan barcode / serial
                </h6>
                {(scannedUnit || barcodeSearch) && (
                  <button
                    onClick={handleReset}
                    className="text-[10px] text-slate-500 hover:text-red-500 font-bold flex items-center gap-1 transition-all"
                  >
                    <RotateCcw size={10} />
                    Reset
                  </button>
                )}
              </div>
              <form onSubmit={handleSearchBarcode} className="p-5">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Barcode ID / Serial Scan *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcodeSearch}
                      onChange={(e) => setBarcodeSearch(e.target.value)}
                      placeholder="Scan/input unique barcode ID..."
                      className="flex-1 h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-red-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-mono"
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
              <Loader2 className="animate-spin text-red-500" size={24} />
              <span className="text-xs text-slate-400 font-bold">Fetching product specifications...</span>
            </div>
          )}

          {/* PRODUCT SPECIFICATION DISPLAY */}
          {productDetails && !loadingDetails && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Info size={14} className="text-[var(--primary)]" />
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Product Specifications
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
                    <span className="text-xs font-bold text-slate-755 dark:text-slate-300 block mt-0.5">{productDetails.brandName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Model Name</span>
                    <span className="text-xs font-bold text-slate-755 dark:text-slate-300 block mt-0.5">{productDetails.modelName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Model Number</span>
                    <span className="text-xs font-bold text-slate-755 dark:text-slate-300 block mt-0.5">{productDetails.modelNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Product Type</span>
                    <span className="text-xs font-bold text-slate-755 dark:text-slate-300 block mt-0.5">{productDetails.productTypeName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Tax Rate</span>
                    <span className="text-xs font-bold text-slate-755 dark:text-slate-300 block mt-0.5">{productDetails.taxPercentage ? `${productDetails.taxPercentage}%` : 'N/A'}</span>
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
                <QrCode size={14} className="text-red-500" />
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Scanned Unit Profile
                </h6>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-755 dark:text-slate-300">
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

        {/* Right Column: Update Damage Details form */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 rounded-t-2xl">
              <ShieldAlert size={15} className="text-red-500" />
              <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mark Stock as Damaged / Defective
              </h6>
            </div>

            <form onSubmit={handleSubmitDamage} className="p-5 space-y-4">
              {/* Product selection safeguard warning */}
              {!productDetails && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
                  <Info size={18} className="text-amber-600 dark:text-amber-450 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">Selection Required</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-0.5">
                      Please look up a product or scan a unit barcode using the left-hand panel before entering damage details.
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Damage Quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  disabled={!productDetails || mode === 'barcode'} // Barcode scans are always exactly 1 unit
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="1"
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-red-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-bold disabled:opacity-50"
                />
                {mode === 'barcode' && (
                  <span className="text-[10px] text-slate-405 block mt-1 italic">
                    Quantity is locked to 1 for unique barcode scanning transfers.
                  </span>
                )}
              </div>



              {/* Reason Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Damage / Defect Reason *
                </label>
                <textarea
                  value={reason}
                  disabled={!productDetails}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Scratched display glass, broken side panel during staging"
                  rows={4}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-red-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !productDetails}
                  className="w-full h-11 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  Report Damaged Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
