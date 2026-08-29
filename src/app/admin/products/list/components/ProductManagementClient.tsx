'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Upload, RefreshCw, Package, AlertCircle, Zap, ChevronDown, LayoutGrid, List } from 'lucide-react';
import ProductTable, { HierarchicalStockBreakdownDto } from './ProductTable';
import ProductGrid from './ProductGrid';
import ProductFilters from './ProductFilters';
import EmptyState from '@/components/ui/EmptyState';
import { Product, ProductImage } from '../data/mockProducts';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import QuickProductModal from './QuickProductModal';
import ProductImportModal from './ProductImportModal';
import ProductExportModal from './ProductExportModal';
import AdminLayout from '@/app/admin/components/AdminLayout';


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
  isSplit?: boolean;
  eanCode?: string | null;
  variant?: string | null;
  size?: string | null;
  capacity?: string | null;
  packQuantity?: number | null;
  colorCode?: string | null;
  materialCode?: string | null;
  gender?: string | null;
  patternFinishCode?: string | null;
  editionCode?: string | null;
  warrantyCode?: string | null;
  handlingCode?: string | null;
  splitQuantity?: number | null;
  surfaceQuantity?: number | null;
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
    productStatusCode: product.productStatusCode ||
      (product as any).product_status_code ||
      'TEMP_BLOCKED',
    offlineStatusCode: product.offlineStatusCode ||
      (product as any).offline_status_code ||
      'OFFLINE',
    defaultCourierPrice: product.defaultCourierPrice ?? 0,
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

interface ProductStatus {
  productStatusId: number;
  statusCode: string;
  displayName: string;
  description: string;
  isActive: boolean;
}

const parseStatusResponse = (raw: string): ProductStatus[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as ProductStatus[] | ProductStatus;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ProductStatus);
  }
};

const DEFAULT_STATUSES: ProductStatus[] = [
  { productStatusId: 1, statusCode: 'ACTIVE', displayName: 'Active', description: 'Product is active and available', isActive: true },
  { productStatusId: 2, statusCode: 'BLOCKED', displayName: 'Blocked', description: 'Product is blocked and unavailable', isActive: true },
  { productStatusId: 3, statusCode: 'TEMP_BLOCKED', displayName: 'Temporary blocked', description: 'Product is temporarily blocked', isActive: true },
];

interface OfflineStatus {
  id: number;
  statusCode: string;
  displayName: string;
  description: string;
  isActive: boolean;
}

const parseOfflineStatusResponse = (raw: string): OfflineStatus[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as OfflineStatus[] | OfflineStatus;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as OfflineStatus);
  }
};

const DEFAULT_OFFLINE_STATUSES: OfflineStatus[] = [
  { id: 1, statusCode: 'ONLINE', displayName: 'Online', description: 'Product is available for ordering and procurement.', isActive: true },
  { id: 2, statusCode: 'OFFLINE', displayName: 'Offline', description: 'Product is offline and no longer available.', isActive: true },
  { id: 3, statusCode: 'TEMP_OFFLINE', displayName: 'Temporary Offline', description: 'Product is temporarily offline.', isActive: true },
];

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
};

const logProductApiCall = (method: string, endpoint: string, bodyPayload: any, rawResponse: any, parsedList: any[], totalCount?: number) => {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || 'YOUR_ACCESS_TOKEN') : 'YOUR_ACCESS_TOKEN';
  const fullUrl = `https://v2.lakeetech.com${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  let curl = `curl -X '${method.toUpperCase()}' \\\n  '${fullUrl}' \\\n  -H 'accept: application/x-ndjson'`;
  curl += ` \\\n  -H 'Authorization: Bearer ${token}'`;
  if (bodyPayload) {
    curl += ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(bodyPayload)}'`;
  }

  console.group(`%c[Product List API Request] ${method.toUpperCase()} ${endpoint}`, 'color: #2563eb; font-weight: bold; font-size: 12px;');
  console.log('%ccURL Command:', 'color: #10b981; font-weight: bold;');
  console.log(curl);
  if (totalCount !== undefined) {
    console.log('%cTotal Count (x-total-count):', 'color: #059669; font-weight: bold;', totalCount);
  }
  console.log('%cRaw API Response:', 'color: #d97706; font-weight: bold;', rawResponse);
  console.log(`%cParsed Products (${parsedList.length} items):`, 'color: #8b5cf6; font-weight: bold;', parsedList);
  console.groupEnd();
};

interface FetchProductResult {
  products: ApiProduct[];
  totalCount?: number;
}

const fetchProductData = async (
  search: string,
  filters: any,
  pageIndex: number = 0,
  pageSize: number = 10
): Promise<FetchProductResult> => {
  const q = search.trim();
  let responseData = '';
  let requestMethod = 'GET';
  let requestUrl = '';
  let requestBody: any = null;
  let responseHeaders: any = null;

  const hasAdvanceFilter = Object.values(filters || {}).some(
    (val) => val !== undefined && val !== null && String(val).trim() !== ''
  );

  if (!q) {
    const params = new URLSearchParams();
    if (!hasAdvanceFilter) {
      params.append('page', String(pageIndex));
      params.append('size', String(pageSize));
    }

    if (filters.categoryCode) {
      params.append('sku', filters.categoryCode);
    }
    if (filters.brand) {
      params.append('brand', filters.brand);
    }
    if (filters.productType) {
      params.append('productType', filters.productType);
    }
    if (filters.minMrp) {
      params.append('minMrp', filters.minMrp);
    }
    if (filters.maxMrp) {
      params.append('maxMrp', filters.maxMrp);
    }
    if (filters.minCostPrice) {
      params.append('minCostPrice', filters.minCostPrice);
    }
    if (filters.maxCostPrice) {
      params.append('maxCostPrice', filters.maxCostPrice);
    }
    if (filters.isCombo !== '') {
      params.append('isCombo', filters.isCombo);
    }
    if (filters.isOffline) {
      params.append('isOffline', filters.isOffline);
    }
    if (filters.isBlocked) {
      params.append('isBlocked', filters.isBlocked);
    }
    if (filters.isExternal !== '') {
      params.append('isExternal', filters.isExternal);
    }

    const queryString = params.toString();
    requestUrl = `/prod/products?${queryString ? `${queryString}&` : ''}_t=${Date.now()}`;

    const response = await axiosInstance.get<string>(requestUrl, {
      headers: {
        Accept: 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    responseData = response.data;
    responseHeaders = response.headers;
  } else {
    let skuParts: string[] = [];
    let isBulkSkuSearch = false;

    if (q.includes(',') || q.includes(';') || q.includes('\n') || q.includes('\r')) {
      skuParts = q.split(/[,\n\r;]+/).map(p => p.trim()).filter(Boolean);
      isBulkSkuSearch = skuParts.length > 0;
    } else {
      // Check if space-separated parts all look like SKUs
      const spaceParts = q.split(/\s+/).map(p => p.trim()).filter(Boolean);
      const isAllSkus = spaceParts.length > 1 && spaceParts.every(p => /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(p));
      if (isAllSkus) {
        skuParts = spaceParts;
        isBulkSkuSearch = true;
      }
    }

    if (isBulkSkuSearch) {
      requestMethod = 'POST';
      requestUrl = '/prod/products/bulk';
      requestBody = skuParts;
      const response = await axiosInstance.post<string>(requestUrl, skuParts, {
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'application/json',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      responseData = response.data;
      responseHeaders = response.headers;
    } else {
      const params = new URLSearchParams();
      if (!hasAdvanceFilter) {
        params.append('page', String(pageIndex));
        params.append('size', String(pageSize));
      }

      const isSku = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(q);
      if (isSku) {
        params.append('sku', q);
      } else {
        params.append('name', q);
      }

      if (filters.categoryCode) {
        params.append('sku', filters.categoryCode);
      }
      if (filters.brand) {
        params.append('brand', filters.brand);
      }
      if (filters.productType) {
        params.append('productType', filters.productType);
      }
      if (filters.minMrp) {
        params.append('minMrp', filters.minMrp);
      }
      if (filters.maxMrp) {
        params.append('maxMrp', filters.maxMrp);
      }
      if (filters.minCostPrice) {
        params.append('minCostPrice', filters.minCostPrice);
      }
      if (filters.maxCostPrice) {
        params.append('maxCostPrice', filters.maxCostPrice);
      }
      if (filters.isCombo !== '') {
        params.append('isCombo', filters.isCombo);
      }
      if (filters.isOffline) {
        params.append('isOffline', filters.isOffline);
      }
      if (filters.isBlocked) {
        params.append('isBlocked', filters.isBlocked);
      }
      if (filters.isExternal !== '') {
        params.append('isExternal', filters.isExternal);
      }

      const queryString = params.toString();
      requestUrl = `/prod/products?${queryString ? `${queryString}&` : ''}_t=${Date.now()}`;

      const response = await axiosInstance.get<string>(requestUrl, {
        headers: {
          Accept: 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      responseData = response.data;
      responseHeaders = response.headers;
    }
  }

  let rawProducts = parseNdjson(responseData) as ApiProduct[];

  // Apply client-side filters for bulk SKU search
  if (q && requestUrl.includes('/prod/products/bulk')) {
    if (filters.brand) {
      rawProducts = rawProducts.filter(p => p.brandName?.toLowerCase() === filters.brand.toLowerCase());
    }
    if (filters.productType) {
      rawProducts = rawProducts.filter(p => p.productTypeName?.toLowerCase() === filters.productType.toLowerCase());
    }
    if (filters.categoryCode) {
      const cleanCode = filters.categoryCode.toLowerCase().replace(/-/g, ' ');
      rawProducts = rawProducts.filter(p => {
        const catPath = p.categoryPath?.toLowerCase() || '';
        return catPath.includes(cleanCode);
      });
    }
    if (filters.minMrp) {
      rawProducts = rawProducts.filter(p => p.mrp !== null && p.mrp !== undefined && Number(p.mrp) >= Number(filters.minMrp));
    }
    if (filters.maxMrp) {
      rawProducts = rawProducts.filter(p => p.mrp !== null && p.mrp !== undefined && Number(p.mrp) <= Number(filters.maxMrp));
    }
    if (filters.minCostPrice) {
      rawProducts = rawProducts.filter(p => p.costPrice !== null && p.costPrice !== undefined && Number(p.costPrice) >= Number(filters.minCostPrice));
    }
    if (filters.maxCostPrice) {
      rawProducts = rawProducts.filter(p => p.costPrice !== null && p.costPrice !== undefined && Number(p.costPrice) <= Number(filters.maxCostPrice));
    }
    if (filters.isCombo !== '') {
      const comboBool = filters.isCombo === 'true';
      rawProducts = rawProducts.filter(p => {
        const val = p.isCombo !== undefined ? Boolean(p.isCombo) : false;
        return val === comboBool;
      });
    }
    if (filters.isOffline) {
      rawProducts = rawProducts.filter(p => p.offlineStatusCode === filters.isOffline);
    }
    if (filters.isBlocked) {
      rawProducts = rawProducts.filter(p => p.productStatusCode === filters.isBlocked);
    }
    if (filters.isExternal !== '') {
      const extBool = filters.isExternal === 'true';
      rawProducts = rawProducts.filter(p => {
        const val = p.isExternal !== undefined ? Boolean(p.isExternal) : false;
        return val === extBool;
      });
    }
  }

  let totalCount: number | undefined = undefined;
  if (responseHeaders) {
    let headerVal: any = undefined;
    if (typeof responseHeaders.get === 'function') {
      headerVal = responseHeaders.get('x-total-count') || responseHeaders.get('X-Total-Count');
    }
    if (!headerVal) {
      headerVal = responseHeaders['x-total-count'] ||
                  responseHeaders['X-Total-Count'] ||
                  responseHeaders['x-total-elements'] ||
                  responseHeaders['total-count'] ||
                  responseHeaders['total'];
    }
    if (headerVal !== undefined && headerVal !== null) {
      const parsedHeader = parseInt(String(headerVal), 10);
      if (!isNaN(parsedHeader)) {
        totalCount = parsedHeader;
      }
    }
  }

  logProductApiCall(requestMethod, requestUrl, requestBody, responseData, rawProducts, totalCount);

  return { products: rawProducts, totalCount };
};

export default function ProductManagementClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<string | number, number>>({});
  const [stockBreakdownMap, setStockBreakdownMap] = useState<Record<string | number, HierarchicalStockBreakdownDto>>({});

  const parseStockData = (parsedJson: any, targetProductId: number): HierarchicalStockBreakdownDto | null => {
    if (parsedJson === undefined || parsedJson === null) return null;

    const rawObj = (parsedJson && typeof parsedJson === 'object' && 'data' in parsedJson && typeof parsedJson.data === 'object' && parsedJson.data !== null)
      ? parsedJson.data
      : parsedJson;

    if (typeof rawObj === 'number') {
      return {
        productId: targetProductId,
        individualQty: rawObj,
        totalQty: rawObj,
      };
    }

    if (typeof parsedJson === 'number') {
      return {
        productId: targetProductId,
        individualQty: parsedJson,
        totalQty: parsedJson,
      };
    }

    if (rawObj && typeof rawObj === 'object' && ('individualQty' in rawObj || 'totalQty' in rawObj || 'availableQty' in rawObj)) {
      const individualQty = typeof rawObj.individualQty === 'number' ? rawObj.individualQty : (typeof rawObj.availableQty === 'number' ? rawObj.availableQty : 0);
      const totalQty = typeof rawObj.totalQty === 'number' ? rawObj.totalQty : individualQty;

      return {
        productId: Number(rawObj.productId || targetProductId),
        productCode: rawObj.productCode,
        productName: rawObj.productName,
        relationRole: rawObj.relationRole || 'INDEPENDENT',
        individualQty,
        totalQty,
        breakdown: Array.isArray(rawObj.breakdown) ? rawObj.breakdown : [],
      };
    }

    return null;
  };
  const [totalServerCount, setTotalServerCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'create' | 'edit' | 'status' | 'offline'>('create');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<keyof Product>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [statuses, setStatuses] = useState<ProductStatus[]>(DEFAULT_STATUSES);
  const [offlineStatuses, setOfflineStatuses] = useState<OfflineStatus[]>(DEFAULT_OFFLINE_STATUSES);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [brands, setBrands] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [flatCategories, setFlatCategories] = useState<any[]>([]);
  const [treeCategories, setTreeCategories] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    categoryCode: '',
    brand: '',
    productType: '',
    minMrp: '',
    maxMrp: '',
    minCostPrice: '',
    maxCostPrice: '',
    isCombo: '',
    isOffline: '',
    isBlocked: '',
    isExternal: '',
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

  const [exportingSearched, setExportingSearched] = useState(false);
  const [exportSearchedProgress, setExportSearchedProgress] = useState<number>(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchBrands = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/prod/brands', {
        headers: { Accept: 'application/x-ndjson' },
      });
      setBrands(parseNdjson(response.data));
    } catch (err) {
      console.warn('Failed to load brands:', err);
    }
  }, []);

  const fetchProductTypes = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/prod/types', {
        headers: { Accept: 'application/x-ndjson' },
      });
      setProductTypes(parseNdjson(response.data));
    } catch (err) {
      console.warn('Failed to load product types:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/prod/categories/client/0/export', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsedCats = parseNdjson(response.data);
      setFlatCategories(parsedCats);

      // Build tree
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
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { products: rawProducts, totalCount } = await fetchProductData(search, filters, page - 1, perPage);
      setProducts(rawProducts.map(toProduct));
      setTotalServerCount(totalCount ?? null);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 401
        ? 'Unauthorized. Please sign in again and refresh the product list.'
        : 'Failed to load products. Please refresh and try again.');
      setProducts([]);
      setTotalServerCount(null);
    } finally {
      setLoading(false);
    }
  }, [search, filters, page, perPage]);

  interface ExportJobStatus {
    jobId: string;
    status: string;
    percentComplete?: number;
    downloadUrl?: string | null;
    totalRecords?: number;
    processedRecords?: number;
  }

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
      setExportProgress(data.percentComplete ?? (data.status === 'COMPLETED' ? 100 : 0));
      setExportTotalRecords(data.totalRecords ?? null);
      setExportProcessedRecords(data.processedRecords ?? null);

      const effectiveUrl = data.downloadUrl || (data.status === 'COMPLETED' ? `/prod/products/export/job/${data.jobId}/download` : null);
      if (effectiveUrl) {
        setExportDownloadUrl(effectiveUrl);
      }
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

  const handleExportAll = async () => {
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

  const handleResetExportAll = () => {
    setExportError('');
    setExportStatus('');
    setExportProgress(0);
    setExportDownloadUrl(null);
    setExportJobId(null);
    setExportTotalRecords(null);
    setExportProcessedRecords(null);
    setExporting(false);
    clearExportPolling();
  };

  useEffect(() => {
    return () => clearExportPolling();
  }, []);

  useEffect(() => {
    // Auto-open disabled: user clicks "Download Excel" button in ProductExportModal once progress reaches 100%
  }, [exportDownloadUrl]);

  const loadSheetJS = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        resolve((window as any).XLSX);
      };
      script.onerror = (err) => {
        reject(err);
      };
      document.body.appendChild(script);
    });
  };

  const handleExportSearched = async () => {
    setExportSearchedProgress(10);
    setExportingSearched(true);

    try {
      setExportSearchedProgress(30);

      const { products: rawProducts } = await fetchProductData(search, filters, 0, 10000);

      setExportSearchedProgress(50);

      if (rawProducts.length === 0) {
        toast.error('No products found to export');
        setExportingSearched(false);
        return;
      }

      // Generate Excel XLSX file
      const headers = [
        "baseProductName",
        "defaultSku",
        "eanCode",
        "brandId",
        "productTypeId",
        "categoryJsonPath",
        "categoryPath",
        "brandName",
        "productTypeName",
        "modelName",
        "modelNumber",
        "variant",
        "size",
        "capacity",
        "packQuantity",
        "colorCode",
        "materialCode",
        "gender",
        "patternFinishCode",
        "editionCode",
        "warrantyCode",
        "mrp",
        "hsnId",
        "hsnCode",
        "taxPercentage",
        "costPrice",
        "isCombo",
        "shortDescription",
        "longDescription",
        "longDescriptionHtml",
        "productStatusCode",
        "offlineStatusCode",
        "imageUrl1",
        "imageUrl2",
        "imageUrl3",
        "length",
        "width",
        "height",
        "weight",
        "preferredShipmentMode",
        "handlingCode",
        "isSplit",
        "splitQuantity",
        "surfaceQuantity",
        "isExternal",
        "defaultCourierPrice",
        "createdAt",
        "updatedAt",
        "comboItems"
      ];

      const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
          const cleanStr = dateStr.replace('Z', '');
          const d = new Date(cleanStr);
          if (isNaN(d.getTime())) {
            return dateStr.replace('T', ' ').split('.')[0];
          }
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        } catch {
          return dateStr;
        }
      };

      const rows = rawProducts.map((p) => {
        const imagesArr = Array.isArray(p.images) ? p.images : [];
        const firstThreeImages = [...imagesArr].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

        const isComboStr = p.isCombo ? "yes" : "no";
        const isSplitStr = p.isSplit ? "yes" : "no";
        const comboItemsStr = (p.comboItems !== null && p.comboItems !== undefined && Array.isArray(p.comboItems)) ? "yes" : "no";

        const categoryJsonPathStr = typeof p.categoryJsonPath === 'object' ? JSON.stringify(p.categoryJsonPath) : p.categoryJsonPath;

        return [
          p.baseProductName || '',
          p.defaultSku || '',
          p.eanCode || '',
          p.brandId !== null && p.brandId !== undefined ? Number(p.brandId) : '',
          p.productTypeId !== null && p.productTypeId !== undefined ? Number(p.productTypeId) : '',
          categoryJsonPathStr || '',
          p.categoryPath || '',
          p.brandName || '',
          p.productTypeName || '',
          p.modelName || '',
          p.modelNumber || '',
          p.variant || '',
          p.size || '',
          p.capacity || '',
          p.packQuantity !== null && p.packQuantity !== undefined ? Number(p.packQuantity) : '',
          p.colorCode || '',
          p.materialCode || '',
          p.gender || '',
          p.patternFinishCode || '',
          p.editionCode || '',
          p.warrantyCode || '',
          p.mrp !== null && p.mrp !== undefined ? Number(p.mrp) : '',
          p.hsnId !== null && p.hsnId !== undefined ? Number(p.hsnId) : '',
          p.hsnCode || '',
          p.taxPercentage !== null && p.taxPercentage !== undefined ? Number(p.taxPercentage) : '',
          p.costPrice !== null && p.costPrice !== undefined ? Number(p.costPrice) : '',
          isComboStr,
          p.shortDescription || '',
          p.longDescription || '',
          p.longDescriptionHtml || '',
          p.productStatusCode || 'TEMP_BLOCKED',
          p.offlineStatusCode || 'OFFLINE',
          firstThreeImages[0]?.url || '',
          firstThreeImages[1]?.url || '',
          firstThreeImages[2]?.url || '',
          p.length !== null && p.length !== undefined ? Number(p.length) : '',
          p.width !== null && p.width !== undefined ? Number(p.width) : '',
          p.height !== null && p.height !== undefined ? Number(p.height) : '',
          p.weight !== null && p.weight !== undefined ? Number(p.weight) : '',
          p.preferredShipmentMode || '',
          p.handlingCode || '',
          isSplitStr,
          p.splitQuantity !== null && p.splitQuantity !== undefined ? Number(p.splitQuantity) : '',
          p.surfaceQuantity !== null && p.surfaceQuantity !== undefined ? Number(p.surfaceQuantity) : '',
          p.isExternal !== null && p.isExternal !== undefined ? p.isExternal : '',
          p.defaultCourierPrice !== null && p.defaultCourierPrice !== undefined ? Number(p.defaultCourierPrice) : 0,
          formatDateTime(p.createdAt),
          formatDateTime(p.updatedAt),
          comboItemsStr
        ];
      });

      setExportSearchedProgress(75);

      const XLSX = await loadSheetJS();
      setExportSearchedProgress(90);

      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", `products_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSearchedProgress(100);
      toast.success(`Successfully exported ${rawProducts.length} products to Excel`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export product data to Excel.');
    } finally {
      setExportingSearched(false);
    }
  };

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await axiosInstance.get<string>('/prod/status/all', {
        headers: {
          Accept: 'application/x-ndjson',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      setStatuses(parseStatusResponse(response.data));
    } catch (err) {
      console.warn('Failed to load product statuses from API, using default statuses:', err);
    }
  }, []);

  const fetchOfflineStatuses = useCallback(async () => {
    try {
      const response = await axiosInstance.get<string>('/prod/offline-status/all', {
        headers: {
          Accept: 'application/x-ndjson',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      setOfflineStatuses(parseOfflineStatusResponse(response.data));
    } catch (err) {
      console.warn('Failed to load offline statuses from API, using default offline statuses:', err);
    }
  }, []);

  const handleBulkStatusChange = async (statusCode: string) => {
    setUpdatingStatus(statusCode);
    const toastId = toast.loading(`Updating status to ${statusCode}...`);
    const payload = selectedIds
      .map((id) => {
        const prod = products.find((p) => p.id === id);
        return {
          sku: prod?.sku || '',
          statusCode: statusCode,
          reason: 'Bulk status update',
        };
      })
      .filter((item) => item.sku);

    try {
      await axiosInstance.put('/prod/products/status/bulk', payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id)
            ? {
              ...p,
              productStatusCode: statusCode,
              status: statusCode === 'ACTIVE' ? 'active' : 'inactive',
            }
            : p
        )
      );
      toast.success(`Updated ${selectedIds.length} products to ${statusCode}`, { id: toastId });
      setSelectedIds([]);
    } catch (err) {
      console.warn('Backend API bulk update failed, updating UI locally:', err);
      setProducts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id)
            ? {
              ...p,
              productStatusCode: statusCode,
              status: statusCode === 'ACTIVE' ? 'active' : 'inactive',
            }
            : p
        )
      );
      toast.success(`Updated ${selectedIds.length} products to ${statusCode} (Local)`, { id: toastId });
      setSelectedIds([]);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleBulkOfflineStatusChange = async (statusCode: string) => {
    setUpdatingStatus(statusCode);
    const toastId = toast.loading(`Updating offline status to ${statusCode}...`);
    const payload = selectedIds
      .map((id) => {
        const prod = products.find((p) => p.id === id);
        return {
          sku: prod?.sku || '',
          offlineStatusCode: statusCode,
          reason: 'Bulk offline status update',
        };
      })
      .filter((item) => item.sku);

    try {
      await axiosInstance.put('/prod/products/offline-status/bulk', payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      setProducts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id)
            ? {
              ...p,
              offlineStatusCode: statusCode,
            }
            : p
        )
      );
      toast.success(`Updated offline status of ${selectedIds.length} products to ${statusCode}`, { id: toastId });
      setSelectedIds([]);
    } catch (err) {
      console.warn('Backend API bulk offline status update failed, updating UI locally:', err);
      setProducts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id)
            ? {
              ...p,
              offlineStatusCode: statusCode,
            }
            : p
        )
      );
      toast.success(`Updated offline status of ${selectedIds.length} products to ${statusCode} (Local)`, { id: toastId });
      setSelectedIds([]);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteSelected = async () => {
    const toastId = toast.loading(`Deleting ${selectedIds.length} products...`);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          axiosInstance.delete(`/prod/products/${id}`)
        )
      );
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      toast.success(`Deleted ${selectedIds.length} products`, { id: toastId });
      setSelectedIds([]);
    } catch (err) {
      console.warn('Backend API delete failed, deleting locally:', err);
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      toast.success(`Deleted ${selectedIds.length} products (Local)`, { id: toastId });
      setSelectedIds([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchStatuses();
    fetchOfflineStatuses();
    fetchBrands();
    fetchProductTypes();
    fetchCategories();
  }, [fetchProducts, fetchStatuses, fetchOfflineStatuses, fetchBrands, fetchProductTypes, fetchCategories]);

  const filtered = useMemo(() => {
    let data = [...products];

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
  }, [products, sortCol, sortDir]);

  const paginated = useMemo(() => {
    if (filtered.length > perPage) {
      const start = (page - 1) * perPage;
      return filtered.slice(start, start + perPage);
    }
    return filtered;
  }, [filtered, page, perPage]);

  useEffect(() => {
    if (!paginated || paginated.length === 0) return;

    let isSubscribed = true;
    const controller = new AbortController();
    const retryTimers: Record<number, NodeJS.Timeout> = {};

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://v2.lakeetech.com';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const authToken = (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null) || 'erp-init-2025';

    paginated.forEach((p) => {
      if (!p.id) return;
      const productId = Number(p.id);
      const targetUrl = `${cleanBase}/stock/availability/${productId}/stream`;

      async function listenStream() {
        console.log(`[Live Stock SSE Request] Product ID ${productId} -> Connecting to: ${targetUrl}`, {
          productId,
          url: targetUrl,
          headers: { Authorization: `Bearer ${authToken.substring(0, 10)}...`, Accept: 'text/event-stream' }
        });

        try {
          // Initial REST endpoint GET fallback
          try {
            console.log(`[Live Stock REST Request] GET /stock/availability/${productId}`);
            const res = await axiosInstance.get(`/stock/availability/${productId}`);
            console.log(`[Live Stock REST Response] Product ID ${productId} Data:`, res.data);
            const initialDto = parseStockData(res.data, productId);
            if (initialDto && isSubscribed) {
              setStockBreakdownMap((prev) => ({ ...prev, [p.id]: initialDto }));
              setStockMap((prev) => ({ ...prev, [p.id]: initialDto.totalQty }));
            }
          } catch (restErr) {
            console.warn(`[Live Stock REST Response Error] Product ID ${productId}:`, restErr);
          }

          const response = await fetch(targetUrl, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Accept': 'text/event-stream',
            },
            signal: controller.signal,
          });

          console.log(`[Live Stock SSE Connection Response] Product ID ${productId} -> Status: ${response.status} ${response.statusText}`);

          if (!response.ok) {
            if (isSubscribed) {
              console.warn(`[Live Stock SSE Stream Error Response] Product ID ${productId} HTTP ${response.status} -> Retrying in 8s...`);
              retryTimers[productId] = setTimeout(() => {
                if (isSubscribed) listenStream();
              }, 8000);
            }
            return;
          }

          if (!response.body) return;

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (isSubscribed) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.substring(5).trim();
                try {
                  const data = JSON.parse(jsonStr);
                  console.log(`[Live Stock SSE Stream Response Data] Product ID ${productId}:`, data);
                  const dto = parseStockData(data, productId);
                  if (dto && isSubscribed) {
                    setStockBreakdownMap((prev) => ({ ...prev, [p.id]: dto }));
                    setStockMap((prev) => ({ ...prev, [p.id]: dto.totalQty }));
                  }
                } catch (e) {
                  console.log(`[Live Stock SSE Stream Raw Response String] Product ID ${productId}:`, jsonStr);
                }
              }
            }
          }
        } catch (err: any) {
          if (!controller.signal.aborted && isSubscribed) {
            console.error(`[Live Stock SSE Stream Exception] Product ID ${productId}:`, err);
            retryTimers[productId] = setTimeout(() => {
              if (isSubscribed) listenStream();
            }, 5000);
          }
        }
      }

      listenStream();
    });

    return () => {
      isSubscribed = false;
      Object.values(retryTimers).forEach((t) => clearTimeout(t));
      controller.abort();
    };
  }, [paginated]);

  const hasAdvanceFilter = useMemo(() => {
    return Object.values(filters || {}).some(
      (val) => val !== undefined && val !== null && String(val).trim() !== ''
    );
  }, [filters]);

  const total = useMemo(() => {
    if (hasAdvanceFilter) {
      return filtered.length;
    }
    if (totalServerCount !== null && totalServerCount !== undefined) {
      return totalServerCount;
    }
    if (filtered.length > perPage) {
      return filtered.length;
    }
    if (filtered.length === perPage) {
      return (page * perPage) + 1;
    }
    return Math.max(0, (page - 1) * perPage + filtered.length);
  }, [hasAdvanceFilter, totalServerCount, filtered.length, page, perPage]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / perPage));
  }, [total, perPage]);

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
  const hasSearchOrFilter = search.trim() !== '' || activeFilterCount > 0;

  return (
    <AdminLayout
      fullWidth={true}
      screenFit={true}
      pageTitle="Product Management"
      pageSubtitle={`${total} products · ${activeCount} active on page`}
      pageIcon={<Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
        {/* Unified Single-Line Search & Toolbar Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU (comma-separated for bulk), Product Name"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* Advanced Filters Button */}
            <button
              onClick={() => setFiltersOpen((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Filter size={13} />
              <span>Advanced Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Grid/List View Button */}
            <button
              onClick={() => setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'))}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-150 text-slate-600 dark:text-slate-300"
              title={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
            >
              {viewMode === 'list' ? (
                <>
                  <LayoutGrid size={13} />
                  <span>Grid View</span>
                </>
              ) : (
                <>
                  <List size={13} />
                  <span>List View</span>
                </>
              )}
            </button>

            {/* Download Button */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-all duration-150"
            >
              <Download size={13} />
              <span>Download</span>
            </button>

            {/* Import Button */}
            <button
              onClick={() => {
                setImportMode('create');
                setImportModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 active:scale-95 transition-all duration-150"
            >
              <Upload size={13} />
              <span>Import</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Loading' : 'Refresh'}</span>
            </button>

            {/* Quick Product Create Button */}
            <style>{`
              @keyframes thunder-pulse {
                0%, 100% {
                  transform: scale(1);
                  filter: drop-shadow(0 0 1px rgba(245, 158, 11, 0.4));
                }
                50% {
                  transform: scale(1.15);
                  filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.8));
                }
              }
              .animate-thunder-zap {
                animation: thunder-pulse 1.8s infinite ease-in-out;
              }
            `}</style>
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              title="Quick Product Create"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md group relative overflow-hidden flex-shrink-0"
            >
              <Zap size={15} className="animate-thunder-zap text-white group-hover:scale-110 transition-transform" />
            </button>

            {/* Add Product Button */}
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-150"
            >
              <Plus size={14} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

      {/* Filters panel */}
      {filtersOpen && (
        <ProductFilters
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
          onClear={() => {
            setFilters({
              categoryCode: '',
              brand: '',
              productType: '',
              minMrp: '',
              maxMrp: '',
              minCostPrice: '',
              maxCostPrice: '',
              isCombo: '',
              isOffline: '',
              isBlocked: '',
              isExternal: '',
            });
            setSearchInput('');
            setPage(1);
          }}
          flatCategories={flatCategories}
          treeCategories={treeCategories}
          brands={brands}
          productTypes={productTypes}
          statuses={statuses}
          offlineStatuses={offlineStatuses}
        />
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {statuses.map((status) => {
              let btnStyle = "bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800/40";
              if (status.statusCode === 'ACTIVE') {
                btnStyle = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40";
              } else if (status.statusCode === 'BLOCKED') {
                btnStyle = "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40";
              } else if (status.statusCode === 'TEMP_BLOCKED') {
                btnStyle = "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40";
              }

              const label = status.statusCode === 'ACTIVE'
                ? 'Activate'
                : status.statusCode === 'BLOCKED'
                  ? 'Block'
                  : `${status.displayName}`;

              return (
                <button
                  key={status.productStatusId}
                  onClick={() => handleBulkStatusChange(status.statusCode)}
                  disabled={updatingStatus !== null}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${btnStyle}`}
                >
                  {label}
                </button>
              );
            })}

            {offlineStatuses.length > 0 && (
              <div className="flex items-center gap-1.5 border-l border-slate-300 dark:border-slate-700 pl-3">
                {offlineStatuses.map((status) => {
                  let btnStyle = "bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800/40";
                  if (status.statusCode === 'ONLINE') {
                    btnStyle = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40";
                  } else if (status.statusCode === 'OFFLINE') {
                    btnStyle = "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40";
                  } else if (status.statusCode === 'TEMP_OFFLINE') {
                    btnStyle = "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40";
                  }

                  return (
                    <button
                      key={status.id}
                      onClick={() => handleBulkOfflineStatusChange(status.statusCode)}
                      disabled={updatingStatus !== null}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${btnStyle}`}
                      title={status.description}
                    >
                      {status.statusCode === 'TEMP_OFFLINE' ? 'Temporary Offline' : status.displayName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* <button
              onClick={handleDeleteSelected}
              disabled={updatingStatus !== null}
              className="px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Selected
            </button> */}
            <button
              onClick={() => setSelectedIds([])}
              disabled={updatingStatus !== null}
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
        <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
          {viewMode === 'list' ? (
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
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
              stockMap={stockMap}
              stockBreakdownMap={stockBreakdownMap}
            />
          ) : (
            <ProductGrid
              products={paginated}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onEdit={handleEdit}
              onView={handleView}
              page={page}
              perPage={perPage}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
              stockMap={stockMap}
              stockBreakdownMap={stockBreakdownMap}
            />
          )}

          {hasSearchOrFilter && filtered.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleExportSearched}
                disabled={exportingSearched}
                className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md"
              >
                {exportingSearched && (
                  <span
                    className="absolute inset-y-0 left-0 bg-blue-500/30 animate-pulse"
                    style={{ width: `${Math.max(1, exportSearchedProgress)}%` }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Download size={14} className={exportingSearched ? "animate-bounce" : ""} />
                  {exportingSearched ? `Exporting Searched Results ${exportSearchedProgress}%` : `Export ${filtered.length} Searched Products to Excel`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      <ProductImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchProducts}
        initialMode={importMode}
      />

      <ProductExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportAll={handleExportAll}
        onResetExportAll={handleResetExportAll}
        exportingAll={exporting}
        exportProgress={exportProgress}
        exportDownloadUrl={exportDownloadUrl}
      />
    </div>
  </AdminLayout>
);
}
