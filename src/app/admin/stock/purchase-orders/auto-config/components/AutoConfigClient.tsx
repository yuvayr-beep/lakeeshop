'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Download, Upload, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, AlertCircle, FolderOpen, FileText, Check, 
  Zap, Settings, Package, Sliders
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import BrandConfigModal from './BrandConfigModal';
import ProductConfigModal from './ProductConfigModal';

type Brand = {
  brandId: number;
  brandName: string;
};

type BrandConfig = {
  id: number;
  brandId: number | null;
  algorithmType: 'LEGACY' | 'STOCK_VELOCITY';
  historicalDays: number;
  recentDays: number;
  maxStockDays: number;
  safetyBufferDays: number;
  scheduledTime1: string;
  scheduledTime2: string;
  pipelineExpiryDays: number;
};

type ProductOverride = {
  productId: number;
  productCode: string;
  productName: string;
  brand: string;
  historicalDays: number;
  recentDays: number;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function AutoConfigClient() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'brand' | 'product'>('brand');

  // Common Data / Brand Map
  const [brands, setBrands] = useState<Brand[]>([]);
  const brandMap = useMemo(() => {
    const map: Record<number, string> = {};
    brands.forEach((b) => {
      map[b.brandId] = b.brandName;
    });
    return map;
  }, [brands]);

  // Brand Tab State
  const [brandConfigs, setBrandConfigs] = useState<BrandConfig[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [brandError, setBrandError] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [selectedBrandConfigIds, setSelectedBrandConfigIds] = useState<number[]>([]);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrandConfig, setEditingBrandConfig] = useState<BrandConfig | null>(null);
  const [brandCurrentPage, setBrandCurrentPage] = useState(1);
  const [brandItemsPerPage, setBrandItemsPerPage] = useState(15);
  const [brandShowUpload, setBrandShowUpload] = useState(false);
  const [brandSelectedFile, setBrandSelectedFile] = useState<File | null>(null);
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandExporting, setBrandExporting] = useState(false);

  // Product Tab State
  const [productOverrides, setProductOverrides] = useState<ProductOverride[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState('');
  
  // Product Filters
  const [filterBrand, setFilterBrand] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductConfig, setEditingProductConfig] = useState<ProductOverride | null>(null);
  
  // Product Pagination (Server-side)
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productItemsPerPage, setProductItemsPerPage] = useState(15);
  const [totalProductItems, setTotalProductItems] = useState(0); // Approximate or exact total
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  const [productShowUpload, setProductShowUpload] = useState(false);
  const [productSelectedFile, setProductSelectedFile] = useState<File | null>(null);
  const [productUploading, setProductUploading] = useState(false);
  const [productExporting, setProductExporting] = useState(false);

  // Trigger State
  const [triggering, setTriggering] = useState(false);

  // Confirm delete modals
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'brand' | 'product'; id: number; name: string } | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  // Parse NDJSON helper
  const parseNdjson = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      const lines = data.split('\n').filter(Boolean);
      return lines.map((l) => JSON.parse(l) as T);
    }
    return [];
  };

  // Fetch Brands for Lookup & Dropdown
  const fetchBrandsList = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/prod/brands', {
        headers: { Accept: 'application/x-ndjson' },
      });
      setBrands(parseNdjson<Brand>(data));
    } catch (err) {
      console.error('Failed to load brands mapping list:', err);
    }
  }, []);

  // Fetch Brand configs (NDJSON)
  const fetchBrandConfigs = useCallback(async () => {
    setLoadingBrands(true);
    setBrandError('');
    try {
      const { data } = await axiosInstance.get('/stock/auto-po/config', {
        headers: { Accept: 'application/x-ndjson' },
      });
      setBrandConfigs(parseNdjson<BrandConfig>(data));
      setSelectedBrandConfigIds([]);
    } catch (err: any) {
      console.error(err);
      setBrandError('Failed to load brand configurations.');
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  // Fetch Product overrides (NDJSON, paginated, filtered)
  const fetchProductOverrides = useCallback(async () => {
    setLoadingProducts(true);
    setProductError('');
    try {
      let url = `/stock/auto-po/product-overrides?page=${productCurrentPage - 1}&size=${productItemsPerPage}`;
      if (filterBrand.trim()) {
        url += `&brand=${encodeURIComponent(filterBrand.trim())}`;
      }
      if (filterProductId.trim()) {
        url += `&productId=${encodeURIComponent(filterProductId.trim())}`;
      }

      const { data } = await axiosInstance.get(url, {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson<ProductOverride>(data);
      setProductOverrides(parsed);
      
      // Determine if there is a next page based on length
      setHasMoreProducts(parsed.length === productItemsPerPage);
      setSelectedProductIds([]);
    } catch (err: any) {
      console.error(err);
      setProductError('Failed to load product overrides.');
    } finally {
      setLoadingProducts(false);
    }
  }, [productCurrentPage, productItemsPerPage, filterBrand, filterProductId]);

  useEffect(() => {
    fetchBrandsList();
  }, [fetchBrandsList]);

  useEffect(() => {
    if (activeTab === 'brand') {
      fetchBrandConfigs();
    } else {
      fetchProductOverrides();
    }
  }, [activeTab, fetchBrandConfigs, fetchProductOverrides]);

  // Brand Filtering (Client-side)
  const filteredBrandConfigs = useMemo(() => {
    if (!brandSearchQuery.trim()) return brandConfigs;
    const q = brandSearchQuery.toLowerCase();
    return brandConfigs.filter((c) => {
      const brandName = c.brandId ? (brandMap[c.brandId] || '').toLowerCase() : 'global default';
      return brandName.includes(q) || c.algorithmType.toLowerCase().includes(q);
    });
  }, [brandConfigs, brandSearchQuery, brandMap]);

  const paginatedBrandConfigs = useMemo(() => {
    const start = (brandCurrentPage - 1) * brandItemsPerPage;
    return filteredBrandConfigs.slice(start, start + brandItemsPerPage);
  }, [filteredBrandConfigs, brandCurrentPage, brandItemsPerPage]);

  const brandTotalPages = Math.max(1, Math.ceil(filteredBrandConfigs.length / brandItemsPerPage));

  // Selection Helper: Brand
  const handleSelectAllBrands = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBrandConfigIds(paginatedBrandConfigs.map((c) => c.id));
    } else {
      setSelectedBrandConfigIds([]);
    }
  };

  const handleSelectBrandRow = (id: number, checked: boolean) => {
    setSelectedBrandConfigIds((prev) => (checked ? [...prev, id] : prev.filter((bid) => bid !== id)));
  };

  const isAllBrandPageSelected = paginatedBrandConfigs.length > 0 && paginatedBrandConfigs.every((c) => selectedBrandConfigIds.includes(c.id));

  // Selection Helper: Product
  const handleSelectAllProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProductIds(productOverrides.map((p) => p.productId));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectProductRow = (id: number, checked: boolean) => {
    setSelectedProductIds((prev) => (checked ? [...prev, id] : prev.filter((pid) => pid !== id)));
  };

  const isAllProductPageSelected = productOverrides.length > 0 && productOverrides.every((p) => selectedProductIds.includes(p.productId));

  // Trigger Manual execution
  const handleTriggerAutoPO = async () => {
    setTriggering(true);
    const toastId = toast.loading('Manually executing Auto-PO generation pipeline...');
    try {
      const { data } = await axiosInstance.post('/stock/auto-po/trigger');
      toast.success(data?.data || 'Auto-PO pipeline completed successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Trigger failed to execute: ' + (err.response?.data?.message || err.message), { id: toastId });
    } finally {
      setTriggering(false);
    }
  };

  // Brand CRUD actions
  const handleCreateBrandConfig = () => {
    setEditingBrandConfig(null);
    setBrandModalOpen(true);
  };

  const handleEditBrandConfig = (config: BrandConfig) => {
    setEditingBrandConfig(config);
    setBrandModalOpen(true);
  };

  // Product Override CRUD actions
  const handleCreateProductConfig = () => {
    setEditingProductConfig(null);
    setProductModalOpen(true);
  };

  const handleEditProductConfig = (override: ProductOverride) => {
    setEditingProductConfig(override);
    setProductModalOpen(true);
  };

  // Delete configuration trigger
  const handleDeleteTrigger = (type: 'brand' | 'product', id: number, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id, name } = deleteTarget;
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);

    const toastId = toast.loading(`Deleting override for ${name}...`);
    try {
      if (type === 'brand') {
        await axiosInstance.delete(`/stock/auto-po/config/${id}`);
        setSelectedBrandConfigIds((prev) => prev.filter((prevId) => prevId !== id));
        fetchBrandConfigs();
      } else {
        // Product deletion is PUT override to historicalDays/recentDays = 0
        await axiosInstance.put(`/stock/auto-po/product-override/${id}`, {
          historicalDays: 0,
          recentDays: 0
        });
        setSelectedProductIds((prev) => prev.filter((prevId) => prevId !== id));
        fetchProductOverrides();
      }
      toast.success('Configuration deleted successfully', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Deletion failed: ' + (err.response?.data?.message || err.message), { id: toastId });
    }
  };

  // Bulk Delete
  const handleBulkDeleteTrigger = () => {
    setBatchDeleteOpen(true);
  };

  const confirmBatchDelete = async () => {
    setBatchDeleteOpen(false);
    const toastId = toast.loading('Deleting selected items...');
    try {
      if (activeTab === 'brand') {
        await Promise.all(selectedBrandConfigIds.map((id) => axiosInstance.delete(`/stock/auto-po/config/${id}`)));
        setSelectedBrandConfigIds([]);
        fetchBrandConfigs();
      } else {
        await Promise.all(selectedProductIds.map((id) => 
          axiosInstance.put(`/stock/auto-po/product-override/${id}`, {
            historicalDays: 0,
            recentDays: 0
          })
        ));
        setSelectedProductIds([]);
        fetchProductOverrides();
      }
      toast.success('Batch delete completed successfully', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to complete some delete actions', { id: toastId });
    }
  };

  // Excel Downloads
  const handleExportExcel = async () => {
    const toastId = toast.loading('Downloading Excel sheet...');
    if (activeTab === 'brand') {
      setBrandExporting(true);
      try {
        const response = await axiosInstance.get('/stock/auto-po/brand-overrides/excel?page=0&size=100', {
          responseType: 'blob',
          headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `brand_auto_po_config_${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Brand overrides exported successfully', { id: toastId });
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to export brand configs to Excel', { id: toastId });
      } finally {
        setBrandExporting(false);
      }
    } else {
      setProductExporting(true);
      try {
        const response = await axiosInstance.get(`/stock/auto-po/product-overrides/excel?page=${productCurrentPage - 1}&size=${productItemsPerPage}`, {
          responseType: 'blob',
          headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `product_auto_po_overrides_${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Product overrides exported successfully', { id: toastId });
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to export product overrides to Excel', { id: toastId });
      } finally {
        setProductExporting(false);
      }
    }
  };

  // Templates download
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading template...');
    try {
      const urlPath = activeTab === 'brand' 
        ? '/stock/auto-po/brand-override/template' 
        : '/stock/auto-po/product-override/template';
      const response = await axiosInstance.get(urlPath, {
        responseType: 'blob',
        headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeTab}_override_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Template downloaded successfully', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download template', { id: toastId });
    }
  };

  // Excel Upload
  const handleUploadExcel = async () => {
    const file = activeTab === 'brand' ? brandSelectedFile : productSelectedFile;
    if (!file) return;

    if (activeTab === 'brand') setBrandUploading(true);
    else setProductUploading(true);

    const toastId = toast.loading(`Uploading Excel file for ${activeTab}...`);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const urlPath = activeTab === 'brand'
        ? '/stock/auto-po/brand-override/upload'
        : '/stock/auto-po/product-override/upload';

      await axiosInstance.post(urlPath, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('File uploaded and processed successfully!', { id: toastId });
      if (activeTab === 'brand') {
        setBrandSelectedFile(null);
        setBrandShowUpload(false);
        fetchBrandConfigs();
      } else {
        setProductSelectedFile(null);
        setProductShowUpload(false);
        fetchProductOverrides();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + (err.response?.data?.message || err.message), { id: toastId });
    } finally {
      if (activeTab === 'brand') setBrandUploading(false);
      else setProductUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings size={22} className="text-blue-600 dark:text-blue-400" />
            Auto-PO Configuration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage automatic Purchase Order configurations, algorithm formulas, overrides, and schedule parameters.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Trigger Auto-PO Pipeline */}
          <button
            onClick={handleTriggerAutoPO}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
          >
            {triggering ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} className="fill-white" />
            )}
            Trigger Auto-PO
          </button>
        </div>
      </div>

      {/* Navigation Tabs and actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        {/* Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl max-w-fit">
          <button
            onClick={() => setActiveTab('brand')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'brand'
                ? 'bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white'
            }`}
          >
            <Sliders size={14} />
            Brand Config
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'product'
                ? 'bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white'
            }`}
          >
            <Package size={14} />
            Product Override
          </button>
        </div>

        {/* Tab specific top actions */}
        <div className="flex items-center gap-2.5 self-end">
          {activeTab === 'brand' ? (
            <>
              {selectedBrandConfigIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteTrigger}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedBrandConfigIds.length})
                </button>
              )}
              <button
                onClick={handleExportExcel}
                disabled={brandExporting || brandConfigs.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50"
              >
                <Download size={14} /> Export Excel
              </button>
              <button
                onClick={() => setBrandShowUpload(!brandShowUpload)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                  brandShowUpload
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
                }`}
              >
                <Upload size={14} /> Upload
              </button>
              <button
                onClick={handleCreateBrandConfig}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
              >
                <Plus size={14} /> Add Config
              </button>
            </>
          ) : (
            <>
              {selectedProductIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteTrigger}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedProductIds.length})
                </button>
              )}
              <button
                onClick={handleExportExcel}
                disabled={productExporting || productOverrides.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50"
              >
                <Download size={14} /> Export Excel
              </button>
              <button
                onClick={() => setProductShowUpload(!productShowUpload)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                  productShowUpload
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
                }`}
              >
                <Upload size={14} /> Upload
              </button>
              <button
                onClick={handleCreateProductConfig}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
              >
                <Plus size={14} /> Add Override
              </button>
            </>
          )}
        </div>
      </div>

      {/* Brand Tab Content */}
      {activeTab === 'brand' && (
        <div className="space-y-6">
          {/* Brand Upload Section */}
          {brandShowUpload && (
            <div className="bg-slate-50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Bulk Brand Override Excel Upload
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Download the brand override template, fill the details, and upload the Excel spreadsheet.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBrandShowUpload(false);
                    setBrandSelectedFile(null);
                  }}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-750 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                <label className="flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed border-slate-350 hover:border-blue-500 dark:border-slate-700 dark:hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 rounded-xl cursor-pointer transition-all p-4 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                      <FileText size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {brandSelectedFile ? (
                        <span className="text-blue-650 font-bold">{brandSelectedFile.name}</span>
                      ) : (
                        <span>Drag your file here or <span className="text-blue-600 hover:underline">Browse</span></span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">File format: .xls & .xlsx</p>
                  </div>
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBrandSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm"
                  >
                    <Download size={12} />
                    Download Template
                  </button>

                  {brandSelectedFile && (
                    <button
                      onClick={handleUploadExcel}
                      disabled={brandUploading}
                      className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      {brandUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      {brandUploading ? 'Uploading...' : 'Submit Upload'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by brand name or algorithm..."
                value={brandSearchQuery}
                onChange={(e) => {
                  setBrandSearchQuery(e.target.value);
                  setBrandCurrentPage(1);
                }}
                className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
              />
            </div>
            <button
              onClick={fetchBrandConfigs}
              className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition-colors shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={15} className={loadingBrands ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Brand Configurations Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            {loadingBrands ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-medium">Fetching configurations...</p>
              </div>
            ) : brandError ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
                <AlertCircle size={36} className="text-red-500 mb-3" />
                <p className="text-sm font-semibold">{brandError}</p>
                <button
                  onClick={fetchBrandConfigs}
                  className="mt-4 px-4 py-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 rounded-xl text-xs font-bold"
                >
                  Retry Load
                </button>
              </div>
            ) : paginatedBrandConfigs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
                <FolderOpen size={44} className="text-slate-350 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium">No brand configurations configured</p>
                <p className="text-xs text-slate-550 mt-1">Configure overrides to run custom Auto-PO replenishment cycles.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                      <th className="w-12 py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isAllBrandPageSelected}
                          onChange={handleSelectAllBrands}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded cursor-pointer"
                        />
                      </th>
                      <th className="w-16 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">S.No</th>
                      <th className="w-52 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Brand</th>
                      <th className="w-44 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Algorithm</th>
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Historical Days</th>
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Days</th>
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Max Stock Days</th>
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Schedule Time 1</th>
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Schedule Time 2</th>
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pipeline Expiry</th>
                      <th className="w-28 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                    {paginatedBrandConfigs.map((config, index) => {
                      const isSelected = selectedBrandConfigIds.includes(config.id);
                      const serialNumber = (brandCurrentPage - 1) * brandItemsPerPage + index + 1;
                      const brandName = config.brandId === null ? 'Global Default' : (brandMap[config.brandId] || `Brand ID: ${config.brandId}`);
                      return (
                        <tr
                          key={config.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectBrandRow(config.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-500">{serialNumber}</td>
                          <td className="py-2.5 px-4 text-xs font-bold text-slate-900 dark:text-white truncate">
                            <span className={config.brandId === null ? 'italic text-slate-550 dark:text-slate-400' : ''}>
                              {brandName}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs font-medium">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              config.algorithmType === 'STOCK_VELOCITY'
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {config.algorithmType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{config.historicalDays} days</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{config.recentDays} days</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{config.maxStockDays} days</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{config.scheduledTime1}</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{config.scheduledTime2}</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{config.pipelineExpiryDays} days</td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditBrandConfig(config)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                                title="Edit Configuration"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTrigger('brand', config.id, brandName)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                title="Delete Override"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {!loadingBrands && filteredBrandConfigs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black dark:text-slate-400">
                    Showing {(brandCurrentPage - 1) * brandItemsPerPage + 1}–{Math.min(brandCurrentPage * brandItemsPerPage, filteredBrandConfigs.length)} of {filteredBrandConfigs.length} overrides
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-black dark:text-slate-400">Per page:</span>
                    <select
                      value={brandItemsPerPage}
                      onChange={(e) => {
                        setBrandItemsPerPage(Number(e.target.value));
                        setBrandCurrentPage(1);
                      }}
                      className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-black dark:text-slate-350"
                    >
                      {PER_PAGE_OPTIONS.map((opt) => (
                        <option key={`brand-page-${opt}`} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBrandCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={brandCurrentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 text-black dark:text-slate-400"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: brandTotalPages }, (_, i) => i + 1).map((pn) => (
                    <button
                      key={`brand-pn-${pn}`}
                      onClick={() => setBrandCurrentPage(pn)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        pn === brandCurrentPage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-slate-400'
                      }`}
                    >
                      {pn}
                    </button>
                  ))}
                  <button
                    onClick={() => setBrandCurrentPage((p) => Math.min(brandTotalPages, p + 1))}
                    disabled={brandCurrentPage === brandTotalPages}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 text-black dark:text-slate-400"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Override Tab Content */}
      {activeTab === 'product' && (
        <div className="space-y-6">
          {/* Product Upload Section */}
          {productShowUpload && (
            <div className="bg-slate-50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Bulk Product Override Excel Upload
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Download the template override Excel sheet, input historical/recent override rules, and submit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProductShowUpload(false);
                    setProductSelectedFile(null);
                  }}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-750 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                <label className="flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed border-slate-350 hover:border-blue-500 dark:border-slate-700 dark:hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 rounded-xl cursor-pointer transition-all p-4 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                      <FileText size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {productSelectedFile ? (
                        <span className="text-blue-650 font-bold">{productSelectedFile.name}</span>
                      ) : (
                        <span>Drag your file here or <span className="text-blue-600 hover:underline">Browse</span></span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">File format: .xls & .xlsx</p>
                  </div>
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setProductSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm"
                  >
                    <Download size={12} />
                    Download Template
                  </button>

                  {productSelectedFile && (
                    <button
                      onClick={handleUploadExcel}
                      disabled={productUploading}
                      className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      {productUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      {productUploading ? 'Uploading...' : 'Submit Upload'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar with Brand and Product searches */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Filter Product ID */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by Product ID..."
                value={filterProductId}
                onChange={(e) => {
                  setFilterProductId(e.target.value);
                  setProductCurrentPage(1);
                }}
                className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all font-semibold"
              />
            </div>

            {/* Filter Brand */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by Brand (e.g. Bajaj)..."
                value={filterBrand}
                onChange={(e) => {
                  setFilterBrand(e.target.value);
                  setProductCurrentPage(1);
                }}
                className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setFilterBrand('');
                  setFilterProductId('');
                  setProductCurrentPage(1);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-350 transition-colors shadow-sm"
              >
                Clear Filters
              </button>
              <button
                onClick={fetchProductOverrides}
                className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition-colors shadow-sm"
                title="Search / Refresh"
              >
                <RefreshCw size={15} className={loadingProducts ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-medium">Fetching overrides...</p>
              </div>
            ) : productError ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
                <AlertCircle size={36} className="text-red-500 mb-3" />
                <p className="text-sm font-semibold">{productError}</p>
                <button
                  onClick={fetchProductOverrides}
                  className="mt-4 px-4 py-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 rounded-xl text-xs font-bold"
                >
                  Retry Load
                </button>
              </div>
            ) : productOverrides.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
                <FolderOpen size={44} className="text-slate-350 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium">No product overrides configured</p>
                <p className="text-xs text-slate-550 mt-1">Configure product overrides to adjust historical ordering velocity days.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                      <th className="w-12 py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isAllProductPageSelected}
                          onChange={handleSelectAllProducts}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded cursor-pointer"
                        />
                      </th>
                      <th className="w-20 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">S.No</th>
                      <th className="w-24 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product ID</th>
                      <th className="w-48 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product Code</th>
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product Name</th>
                      <th className="w-32 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Brand</th>
                      <th className="w-36 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Historical Days</th>
                      <th className="w-36 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Days</th>
                      <th className="w-28 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                    {productOverrides.map((override, index) => {
                      const isSelected = selectedProductIds.includes(override.productId);
                      const serialNumber = (productCurrentPage - 1) * productItemsPerPage + index + 1;
                      return (
                        <tr
                          key={override.productId}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectProductRow(override.productId, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-500">{serialNumber}</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{override.productId}</td>
                          <td className="py-2.5 px-4 text-xs font-bold text-slate-900 dark:text-white truncate">{override.productCode}</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={override.productName}>
                            {override.productName}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-medium text-slate-650 dark:text-slate-400">{override.brand}</td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {override.historicalDays !== null ? `${override.historicalDays} days` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {override.recentDays !== null ? `${override.recentDays} days` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditProductConfig(override)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                                title="Edit Override"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTrigger('product', override.productId, override.productCode)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                title="Delete Override"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer - Product */}
            {!loadingProducts && productOverrides.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black dark:text-slate-400">
                    Page {productCurrentPage} (Showing {productOverrides.length} records)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-black dark:text-slate-400">Per page:</span>
                    <select
                      value={productItemsPerPage}
                      onChange={(e) => {
                        setProductItemsPerPage(Number(e.target.value));
                        setProductCurrentPage(1);
                      }}
                      className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-black dark:text-slate-350"
                    >
                      {PER_PAGE_OPTIONS.map((opt) => (
                        <option key={`prod-page-opt-${opt}`} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setProductCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={productCurrentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 text-black dark:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Page {productCurrentPage}
                  </span>
                  <button
                    onClick={() => setProductCurrentPage((p) => p + 1)}
                    disabled={!hasMoreProducts}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 text-black dark:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Auto-PO Override"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteTarget(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-350 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
            >
              Delete Override
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
              Are you sure you want to delete this configuration?
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium leading-relaxed">
              This will remove the custom Auto-PO override for <span className="font-bold text-slate-800 dark:text-slate-250">{deleteTarget?.name}</span> and revert it to default settings.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        title="Delete Selected Overrides"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setBatchDeleteOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-350 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmBatchDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
            >
              Confirm Delete
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
              Delete multiple overrides?
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium leading-relaxed">
              You are about to delete <span className="font-bold text-slate-850 dark:text-white">
                {activeTab === 'brand' ? selectedBrandConfigIds.length : selectedProductIds.length} selected configuration overrides
              </span>. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Brand Form Modal */}
      {brandModalOpen && (
        <BrandConfigModal
          open={brandModalOpen}
          onClose={() => setBrandModalOpen(false)}
          brands={brands}
          config={editingBrandConfig}
          onSuccess={() => {
            setBrandModalOpen(false);
            fetchBrandConfigs();
          }}
        />
      )}

      {/* Product Form Modal */}
      {productModalOpen && (
        <ProductConfigModal
          open={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          config={editingProductConfig}
          onSuccess={() => {
            setProductModalOpen(false);
            fetchProductOverrides();
          }}
        />
      )}
    </div>
  );
}
