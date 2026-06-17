'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Upload, RefreshCw, Package, AlertCircle } from 'lucide-react';
import ProductTable from './ProductTable';
import ProductFilters from './ProductFilters';
import EmptyState from '@/components/ui/EmptyState';
import { Product, ProductImage } from '../data/mockProducts';
import axiosInstance from '@/lib/axios';

type ApiProductImage = ProductImage & { priority?: number };

interface ApiProduct {
  id: number | string;
  baseProductName?: string;
  defaultSku?: string;
  categoryPath?: string;
  brandName?: string;
  productTypeName?: string;
  modelName?: string;
  modelNumber?: string;
  taxPercentage?: number | string | null;
  status?: boolean;
  hsnCode?: string;
  mrp?: number | null;
  costPrice?: number | null;
  preferredShipmentMode?: string | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  isCombo?: boolean;
  images?: ApiProductImage[] | string | null;
  shortDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

const getCategoryLeaf = (categoryPath?: string) => {
  if (!categoryPath) return '-';
  const parts = categoryPath.split('>').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || categoryPath;
};

const normalizeImages = (images: ApiProduct['images']): ProductImage[] => {
  if (!images) return [];
  if (typeof images === 'string') return [{ url: images, alt: 'Product image' }];
  return [...images]
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .filter((image) => Boolean(image.url))
    .map((image) => ({ url: image.url, alt: image.alt || 'Product image' }));
};

const toProduct = (product: ApiProduct): Product => {
  const length = product.length ?? 0;
  const width = product.width ?? 0;
  const height = product.height ?? 0;

  return {
    id: String(product.id),
    sku: product.defaultSku || '-',
    name: product.baseProductName || '-',
    category: getCategoryLeaf(product.categoryPath),
    brand: product.brandName || '-',
    manufacturer: product.brandName || '-',
    productTypeName: product.productTypeName || '-',
    modelName: product.modelName || '-',
    modelNumber: product.modelNumber || '-',
    taxSlab: product.taxPercentage !== null && product.taxPercentage !== undefined ? `${product.taxPercentage}%` : '-',
    status: product.status ? 'active' : 'inactive',
    uom: '',
    hsnCode: product.hsnCode || '-',
    unitPrice: Number(product.costPrice ?? 0),
    mrp: Number(product.mrp ?? 0),
    stockQty: 0,
    shipMode: product.preferredShipmentMode || '-',
    weight: product.weight !== null && product.weight !== undefined ? `${product.weight}` : undefined,
    dimensions: length || width || height ? `${length}x${width}x${height}` : undefined,
    description: product.shortDescription,
    isCombo: Boolean(product.isCombo),
    images: normalizeImages(product.images),
    createdAt: product.createdAt || '',
    updatedAt: product.updatedAt || '',
  };
};

const parseProductResponse = (raw: string): Product[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as ApiProduct[] | ApiProduct;
    return (Array.isArray(parsed) ? parsed : [parsed]).map(toProduct);
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => toProduct(JSON.parse(line) as ApiProduct));
  }
};

interface ExportJobStatus {
  jobId: string;
  status: string;
  message?: string | null;
  percentComplete?: number | null;
  downloadUrl?: string | null;
  fileName?: string | null;
  totalRecords?: number | null;
  processedRecords?: number | null;
  errorMessage?: string | null;
}

export default function ProductManagementClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<keyof Product>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    productType: '',
    status: '',
    taxSlab: '',
  });
  const [exporting, setExporting] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const [exportTotalRecords, setExportTotalRecords] = useState<number | null>(null);
  const [exportProcessedRecords, setExportProcessedRecords] = useState<number | null>(null);
  const [exportError, setExportError] = useState('');
  const exportPollingRef = useRef<number | null>(null);
  const downloadTriggeredRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get<string>('/prod/products', {
        headers: {
          Accept: 'application/x-ndjson',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      setProducts(parseProductResponse(response.data));
      setSelectedIds([]);
      setPage(1);
    } catch (err) {
      console.error(err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 401
        ? 'Unauthorized. Please sign in again and refresh the product list.'
        : 'Failed to load products. Please refresh and try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearExportPolling = () => {
    if (exportPollingRef.current !== null) {
      window.clearTimeout(exportPollingRef.current);
      exportPollingRef.current = null;
    }
  };

  const pollExportJob = useCallback(async (jobId: string) => {
    const updateFromJob = (data: ExportJobStatus) => {
      setExportJobId(data.jobId);
      setExportStatus(data.status || '');
      setExportProgress(data.percentComplete ?? 0);
      setExportTotalRecords(data.totalRecords ?? null);
      setExportProcessedRecords(data.processedRecords ?? null);
      if (data.downloadUrl) setExportDownloadUrl(data.downloadUrl);
    };

    try {
      const { data } = await axiosInstance.get<ExportJobStatus>(`/prod/products/export/job/${jobId}`, {
        headers: { Accept: '*/*' },
      });

      updateFromJob(data);

      if (data.downloadUrl || data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
        setExporting(false);
        clearExportPolling();
        return;
      }

      exportPollingRef.current = window.setTimeout(() => pollExportJob(jobId), 1500);
    } catch (err) {
      console.error(err);
      setExportError('Failed to poll export job. Please try again.');
      setExporting(false);
      clearExportPolling();
    }
  }, []);

  const handleExport = async () => {
    setExportError('');
    setExportStatus('PENDING');
    setExportProgress(0);
    setExportDownloadUrl(null);
    setExportJobId(null);
    setExportTotalRecords(null);
    setExportProcessedRecords(null);
    downloadTriggeredRef.current = false;
    setExporting(true);

    try {
      const { data } = await axiosInstance.post<ExportJobStatus>('/prod/products/export', null, {
        headers: { Accept: '*/*' },
      });

      if (!data?.jobId) {
        throw new Error('Export job response is malformed.');
      }

      setExportJobId(data.jobId);
      setExportStatus(data.status || '');
      setExportProgress(data.percentComplete ?? 0);
      setExportTotalRecords(data.totalRecords ?? null);
      setExportProcessedRecords(data.processedRecords ?? null);
      if (data.downloadUrl) {
        setExportDownloadUrl(data.downloadUrl);
        setExporting(false);
        return;
      }

      exportPollingRef.current = window.setTimeout(() => pollExportJob(data.jobId), 1500);
    } catch (err) {
      console.error(err);
      setExportError('Failed to start export. Please try again.');
      setExporting(false);
      clearExportPolling();
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    return () => clearExportPolling();
  }, []);

  useEffect(() => {
    if (exportDownloadUrl && !downloadTriggeredRef.current) {
      downloadTriggeredRef.current = true;
      window.open(exportDownloadUrl, '_blank');
    }
  }, [exportDownloadUrl]);

  const filtered = useMemo(() => {
    let data = [...products];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (filters.category) data = data.filter((p) => p.category === filters.category);
    if (filters.brand) data = data.filter((p) => p.brand === filters.brand);
    if (filters.productType) data = data.filter((p) => p.productTypeName === filters.productType);
    if (filters.status) data = data.filter((p) => p.status === filters.status);
    if (filters.taxSlab) data = data.filter((p) => p.taxSlab === filters.taxSlab);

    data.sort((a, b) => {
      const av = a[sortCol] as string | number | boolean;
      const bv = b[sortCol] as string | number | boolean;
      const aStr = String(av);
      const bStr = String(bv);
      if (aStr < bStr) return sortDir === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [products, search, filters, sortCol, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const totalPages = Math.ceil(filtered.length / perPage);

  const handleSort = (col: keyof Product) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleEdit = (p: Product) => {
    router.push(`/admin/products/edit?id=${p.id}`);
  };

  const handleView = (p: Product) => {
    router.push(`/admin/products/view?sku=${p.sku}`);
  };

  const handleAdd = () => {
    router.push('/admin/products/create');
  };

  const activeCount = products.filter((p) => p.status === 'active').length;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Product Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} products · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="relative overflow-hidden flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
          >
            {exporting && (
              <span
                className="absolute inset-y-0 left-0 bg-blue-500/30"
                style={{ width: `${Math.max(1, exportProgress)}%` }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Download size={13} />
              {exporting ? `Exporting ${exportProgress}%` : 'Export'}
            </span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
            <Upload size={13} />
            Import
          </button>
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading' : 'Refresh'}
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-150"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, name, brand, or category…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-9 pl-8 pr-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' :'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Filter size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <ProductFilters
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
          onClear={() => { setFilters({ category: '', brand: '', productType: '', status: '', taxSlab: '' }); setPage(1); }}
        />
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button className="px-3 py-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 rounded-lg hover:opacity-80 transition-opacity">
              Deactivate Selected
            </button>
            <button className="px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg hover:opacity-80 transition-opacity">
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table or Empty State */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl p-10 text-center">
          <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Loading products...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl">
          <EmptyState
            icon={<Package size={24} className="text-slate-400" />}
            title="No products found"
            description="No products match your current search or filter criteria. Try adjusting your filters or adding a new product."
            action={
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} />
                Add Product
              </button>
            }
          />
        </div>
      ) : (
        <ProductTable
          products={paginated}
          allProducts={filtered}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={handleEdit}
          onView={handleView}
          page={page}
          perPage={perPage}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
      )}
    </div>
  );
}
