'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Filter, Download, Upload, RefreshCw, Package, AlertCircle, List, LayoutGrid } from 'lucide-react';
import ProductMeasurementsTable from './ProductMeasurementsTable';
import ProductMeasurementsGrid from './ProductMeasurementsGrid';
import ProductMeasurementsEditModal from './ProductMeasurementsEditModal';
import ProductMeasurementsFilters, { ProductMeasurementsFiltersState } from './ProductMeasurementsFilters';
import ProductModal from '@/app/admin/products/list/components/ProductModal';
import ProductMeasurementsImportModal from './ProductMeasurementsImportModal';
import ProductMeasurementsExportModal from './ProductMeasurementsExportModal';
import EmptyState from '@/components/ui/EmptyState';
import { Product, ProductImage } from '@/app/admin/products/list/data/mockProducts';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type ApiProductImage = ProductImage & { priority?: number };

interface ApiProduct {
  id: number | string;
  baseProductName?: string;
  defaultSku?: string;
  categoryPath?: string;
  categoryJsonPath?: string;
  brandName?: string;
  brandId?: number | null;
  productTypeName?: string;
  productTypeId?: number | null;
  modelName?: string;
  modelNumber?: string;
  taxPercentage?: number | string | null;
  status?: boolean;
  hsnCode?: string;
  hsnId?: number | null;
  mrp?: number | null;
  costPrice?: number | null;
  preferredShipmentMode?: string | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  isCombo?: boolean;
  comboItems?: any[];
  images?: ApiProductImage[] | string | null;
  shortDescription?: string;
  longDescription?: string | null;
  longDescriptionHtml?: string | null;
  createdAt?: string;
  updatedAt?: string;
  productStatusCode?: string;
  offlineStatusCode?: string;
  isBlocked?: boolean;
  isOffline?: boolean;
  defaultCourierPrice?: number | null;
  isExternal?: boolean;
  eanCode?: string | null;
  variant?: string | null;
  size?: string | null;
  capacity?: string | null;
  colorCode?: string | null;
  materialCode?: string | null;
  gender?: string | null;
  patternFinishCode?: string | null;
  editionCode?: string | null;
  warrantyCode?: string | null;
  handlingCode?: string | null;
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
  const weight = product.weight !== null && product.weight !== undefined ? Number(product.weight) : null;

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
    productStatusCode: product.productStatusCode || (product as any).product_status_code || 'TEMP_BLOCKED',
    offlineStatusCode: product.offlineStatusCode || (product as any).offline_status_code || 'OFFLINE',
    defaultCourierPrice: product.defaultCourierPrice ?? 0,
    uom: '',
    hsnCode: product.hsnCode || '-',
    unitPrice: Number(product.costPrice ?? 0),
    mrp: Number(product.mrp ?? 0),
    stockQty: 0,
    shipMode: product.preferredShipmentMode || '-',
    weight: weight !== null ? `${weight}` : undefined,
    weightNum: weight,
    length: length,
    width: width,
    height: height,
    dimensions: length || width || height ? `${length} × ${width} × ${height} cm` : undefined,
    description: product.shortDescription,
    isCombo: Boolean(product.isCombo),
    images: normalizeImages(product.images),
    createdAt: product.createdAt || '',
    updatedAt: product.updatedAt || '',
  };
};

const parseNdjson = (raw: string): any[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
};interface FetchProductResult {
  products: ApiProduct[];
  totalCount: number;
}

const fetchProductData = async (
  search: string,
  filters: ProductMeasurementsFiltersState,
  pageIndex: number = 0,
  pageSize: number = 20
): Promise<FetchProductResult> => {
  const q = search.trim();
  let responseData = '';
  let totalHeaderCount: number | undefined = undefined;

  const hasAdvanceFilter = Object.values(filters || {}).some(
    (val) => val !== undefined && val !== null && String(val).trim() !== ''
  );

  if (!q) {
    const params = new URLSearchParams();
    params.append('page', String(pageIndex));
    params.append('size', String(pageSize));

    if (filters.categoryCode) params.append('sku', filters.categoryCode);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.productType) params.append('productType', filters.productType);

    const url = `/prod/products?${params.toString()}&_t=${Date.now()}`;

    const response = await axiosInstance.get<string>(url, {
      headers: { Accept: 'application/x-ndjson', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      responseType: 'text',
      transformResponse: [(data) => data],
    });

    const headerCount = response.headers['x-total-count'];
    if (headerCount) totalHeaderCount = parseInt(headerCount, 10);
    responseData = response.data;
  } else {
    let skuParts: string[] = [];
    let isBulkSkuSearch = false;

    if (q.includes(',') || q.includes(';') || q.includes('\n') || q.includes('\r')) {
      skuParts = q.split(/[,\n\r;]+/).map((p) => p.trim()).filter(Boolean);
      isBulkSkuSearch = skuParts.length > 0;
    } else {
      const spaceParts = q.split(/\s+/).map((p) => p.trim()).filter(Boolean);
      const isAllSkus = spaceParts.length > 1 && spaceParts.every((p) => /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(p));
      if (isAllSkus) {
        skuParts = spaceParts;
        isBulkSkuSearch = true;
      }
    }

    if (isBulkSkuSearch) {
      const response = await axiosInstance.post<string>(
        `/prod/products/by-skus?page=${pageIndex}&size=${pageSize}&_t=${Date.now()}`,
        { skus: skuParts },
        {
          headers: { Accept: 'application/x-ndjson', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          responseType: 'text',
          transformResponse: [(data) => data],
        }
      );
      const headerCount = response.headers['x-total-count'];
      if (headerCount) totalHeaderCount = parseInt(headerCount, 10);
      responseData = response.data;
    } else {
      const response = await axiosInstance.get<string>(
        `/prod/products/search?q=${encodeURIComponent(q)}&page=${pageIndex}&size=${pageSize}&_t=${Date.now()}`,
        {
          headers: { Accept: 'application/x-ndjson', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          responseType: 'text',
          transformResponse: [(data) => data],
        }
      );
      const headerCount = response.headers['x-total-count'];
      if (headerCount) totalHeaderCount = parseInt(headerCount, 10);
      responseData = response.data;
    }
  }

  const list = parseNdjson(responseData) as ApiProduct[];
  const filtered = list.filter((p) => {
    if (filters.categoryCode && p.categoryPath && !p.categoryPath.toLowerCase().includes(filters.categoryCode.toLowerCase())) return false;
    if (filters.brand && p.brandName !== filters.brand) return false;
    if (filters.productType && p.productTypeName !== filters.productType) return false;
    return true;
  });

  return {
    products: filtered,
    totalCount: totalHeaderCount !== undefined ? totalHeaderCount : filtered.length,
  };
};

const initialFilters: ProductMeasurementsFiltersState = {
  categoryCode: '',
  brand: '',
  productType: '',
};

export default function ProductMeasurementsManagementClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<keyof Product>('sku');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Filter option data
  const [brands, setBrands] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [flatCategories, setFlatCategories] = useState<any[]>([]);
  const [treeCategories, setTreeCategories] = useState<any[]>([]);

  // Popup Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);

  const handleViewProduct = (p: Product) => {
    router.push(`/admin/products/view?sku=${encodeURIComponent(p.sku)}`);
  };

  // Import / Export Modal States
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [brandsRes, typesRes, catsRes] = await Promise.allSettled([
        axiosInstance.get('/prod/brands', { headers: { Accept: 'application/x-ndjson' } }),
        axiosInstance.get('/prod/types', { headers: { Accept: 'application/x-ndjson' } }),
        axiosInstance.get('/prod/categories/client/0/export', { headers: { Accept: 'application/x-ndjson' } }),
      ]);

      if (brandsRes.status === 'fulfilled') setBrands(parseNdjson(brandsRes.value.data));
      if (typesRes.status === 'fulfilled') setProductTypes(parseNdjson(typesRes.value.data));
      if (catsRes.status === 'fulfilled') {
        const parsedCats = parseNdjson(catsRes.value.data);
        setFlatCategories(parsedCats);

        const map = new Map<number, any>();
        const roots: any[] = [];
        parsedCats.forEach((cat: any) => {
          map.set(cat.categoryId, { ...cat, children: [] });
        });
        parsedCats.forEach((cat: any) => {
          const node = map.get(cat.categoryId)!;
          if (cat.parentId === null || cat.parentId === undefined || !map.has(cat.parentId)) {
            roots.push(node);
          } else {
            const parentNode = map.get(cat.parentId)!;
            parentNode.children.push(node);
          }
        });
        setTreeCategories(roots);
      }
    } catch (err) {
      console.warn('Error loading filter options:', err);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProductData(search, filters, page - 1, perPage);
      const mapped = result.products.map(toProduct);
      setProducts(mapped);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      console.error('Error fetching product list:', err);
      setError('Failed to load products. Please check server or retry.');
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, filters, page, perPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSort = (col: keyof Product) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setSearch('');
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      let va: any = a[sortCol] ?? '';
      let vb: any = b[sortCol] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortCol, sortDir]);

  const total = totalCount || sortedProducts.length;
  const totalPages = Math.ceil(total / perPage) || 1;

  // Edit popup trigger
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  // On Save Success in Edit Modal -> update state locally immediately
  const handleEditSuccess = (updatedFields: {
    id: string;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
  }) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === updatedFields.id) {
          const l = updatedFields.length ?? 0;
          const w = updatedFields.width ?? 0;
          const h = updatedFields.height ?? 0;
          const wt = updatedFields.weight;

          return {
            ...p,
            weightNum: wt,
            weight: wt !== null ? `${wt}` : undefined,
            length: l,
            width: w,
            height: h,
            dimensions: l || w || h ? `${l} × ${w} × ${h} cm` : undefined,
          };
        }
        return p;
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Control Bar (Single Line: Search, Filters, View Switch, Export, Import, Refresh) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-3 shrink-0">
        {/* Search Input */}
        <div className="relative w-full xl:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by SKU, Product Name, or comma-separated SKUs..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white font-medium transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Controls in Single Line */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full xl:w-auto">
          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
              activeFilterCount > 0
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View Mode Toggle (List or Grid) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all"
          >
            <Download size={14} />
            Export
          </button>

          {/* Import Button */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all"
          >
            <Upload size={14} />
            Import
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm shrink-0">
          <ProductMeasurementsFilters
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
            onClear={handleResetFilters}
            flatCategories={flatCategories}
            treeCategories={treeCategories}
            brands={brands}
            productTypes={productTypes}
          />
        </div>
      )}

      {/* Main Content Area (Fixed Container & Scrollable Body) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <RefreshCw size={32} className="animate-spin text-blue-600 mb-3" />
            <p className="text-xs font-semibold">Loading products...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <AlertCircle size={32} className="text-red-500 mb-3" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <EmptyState
              icon={<Package size={24} className="text-slate-400" />}
              title="No products found"
              description="No products matched your search or filters. Try resetting search parameters."
              action={
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              }
            />
          </div>
        ) : viewMode === 'table' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ProductMeasurementsTable
              products={sortedProducts}
              allProducts={products}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              onEdit={handleOpenEditModal}
              onView={handleViewProduct}
              page={page}
              perPage={perPage}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ProductMeasurementsGrid
              products={sortedProducts}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onEdit={handleOpenEditModal}
              onView={handleViewProduct}
              page={page}
              perPage={perPage}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Edit Popup Modal */}
      <ProductMeasurementsEditModal
        product={editingProduct}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={handleEditSuccess}
      />

      {/* Import & Export Modals */}
      <ProductMeasurementsImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={loadProducts}
      />

      <ProductMeasurementsExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
