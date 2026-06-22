'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Upload, RefreshCw, Package, AlertCircle, Zap } from 'lucide-react';
import ProductTable from './ProductTable';
import ProductFilters from './ProductFilters';
import EmptyState from '@/components/ui/EmptyState';
import { Product, ProductImage } from '../data/mockProducts';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import QuickProductModal from './QuickProductModal';


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
  productStatusCode?: string;
  offlineStatusCode?: string;
  isBlocked?: boolean;
  isOffline?: boolean;
  defaultCourierPrice?: number | null;
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

export default function ProductManagementClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<keyof Product>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [statuses, setStatuses] = useState<ProductStatus[]>(DEFAULT_STATUSES);
  const [offlineStatuses, setOfflineStatuses] = useState<OfflineStatus[]>(DEFAULT_OFFLINE_STATUSES);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

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
      const params = new URLSearchParams();

      if (search.trim()) {
        const q = search.trim();
        // Check if query is a SKU (alphanumeric and dashes, e.g. ATM-AAC-AOT-0001)
        const isSku = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(q);
        if (isSku) {
          params.append('sku', q);
        } else {
          params.append('name', q);
        }
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
      const url = `/prod/products?${queryString ? `${queryString}&` : ''}_t=${Date.now()}`;

      const response = await axiosInstance.get<string>(url, {
        headers: {
          Accept: 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
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
  }, [search, filters]);

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

  useEffect(() => {
    return () => clearExportPolling();
  }, []);

  useEffect(() => {
    if (exportDownloadUrl && !downloadTriggeredRef.current) {
      downloadTriggeredRef.current = true;
      window.open(exportDownloadUrl, '_blank');
    }
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
      const params = new URLSearchParams();

      if (search.trim()) {
        const q = search.trim();
        const isSku = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(q);
        if (isSku) {
          params.append('sku', q);
        } else {
          params.append('name', q);
        }
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
      const url = `/prod/products?${queryString ? `${queryString}&` : ''}_t=${Date.now()}`;

      setExportSearchedProgress(30);

      const response = await axiosInstance.get<string>(url, {
        headers: {
          Accept: 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      setExportSearchedProgress(50);

      const rawProducts = parseNdjson(response.data);
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
  const hasSearchOrFilter = search.trim() !== '' || activeFilterCount > 0;

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

          {/* Download All Products (API Server Export) */}
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="relative overflow-hidden flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
          >
            {exporting && (
              <span
                className="absolute inset-y-0 left-0 bg-emerald-500/30"
                style={{ width: `${Math.max(1, exportProgress)}%` }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Download size={13} className={exporting ? "animate-bounce" : ""} />
              {exporting ? `Preparing All ${exportProgress}%` : 'Download All Products'}
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
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-150"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </div>

      <QuickProductModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onSuccess={fetchProducts}
      />

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, name, brand, or category…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${filtersOpen || activeFilterCount > 0
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
        >
          <Filter size={13} />
          Advanced Filters
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
        <div className="space-y-4">
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
    </div>
  );
}
