'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Layers, Truck, ShieldAlert, ShieldCheck, Search, Loader2, 
  ChevronRight, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Package, PackageX, Filter, Tag, CheckSquare, Square, X, Folder, FolderOpen
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Data Interfaces
interface ClientItem {
  id: number;
  clientCode: string;
  clientName: string;
  legalName?: string;
  logoUrl?: string;
  businessUnits?: Array<{
    id: number;
    unitCode?: string;
    unitName?: string;
    hasProgram?: boolean;
  }>;
}

interface ProgramItem {
  id: number;
  businessUnitId: number;
  programCode: string;
  programName: string;
  programLabel?: string;
  hasSeparateExcludeCourier?: boolean;
  tatHours?: number;
}

interface CourierServiceItem {
  id: number;
  courierId: number;
  serviceCode: string;
  serviceName: string;
  serviceType: string;
  description?: string;
}

interface ClientExclusionRecord {
  id?: number;
  clientId: number;
  programId?: number | null;
  courierServiceId: number;
  reason?: string;
  active: boolean;
}

interface ProductItem {
  id: number;
  productName: string;
  skuCode?: string;
  productCode?: string;
  primaryImageUrl?: string;
  brandName?: string;
  categoryPath?: string;
  productTypeName?: string;
  isCombo?: boolean;
}

interface ProductExclusionRecord {
  id?: number;
  productId: number;
  courierServiceId: number;
  reason?: string;
  active: boolean;
}

interface CategoryNode {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  level?: number;
  parentId?: number | null;
  children: CategoryNode[];
}

// Category Tree Node Recursive Rendering Component
function CategoryTreeNode({
  node,
  selectedCategoryCode,
  onSelectCategory,
  expandedCategoryIds,
  onToggleCategoryExpand,
}: {
  node: CategoryNode;
  selectedCategoryCode: string;
  onSelectCategory: (cat: CategoryNode) => void;
  expandedCategoryIds: Set<number>;
  onToggleCategoryExpand: (id: number) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedCategoryIds.has(node.categoryId);
  const isSelected = selectedCategoryCode === node.categoryCode || selectedCategoryCode === node.categoryName;

  return (
    <div className="pl-2 relative">
      <div className="flex items-center gap-1.5 py-1 text-xs group">
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCategoryExpand(node.categoryId);
            }}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-400 dark:text-slate-500 transition-colors text-[10px]"
          >
            {isExpanded ? '▼' : '►'}
          </button>
        ) : (
          <div className="w-4 h-4 flex-shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelectCategory(node)}
          className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center flex-shrink-0 ${
            isSelected
              ? 'border-amber-600 bg-amber-600 text-white'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-amber-400'
          }`}
        >
          {isSelected && <span className="text-[9px] leading-none">✓</span>}
        </button>

        <span
          onClick={() => {
            if (hasChildren) {
              onToggleCategoryExpand(node.categoryId);
            }
            onSelectCategory(node);
          }}
          className={`flex items-center gap-1.5 cursor-pointer select-none truncate ${
            hasChildren
              ? 'text-slate-700 dark:text-slate-300 font-semibold'
              : isSelected
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xs flex-shrink-0">{hasChildren ? '📁' : '📄'}</span>
          <span className="truncate">{node.categoryName}</span>
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l border-dashed border-slate-200 dark:border-slate-800 ml-1.5 pl-1">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.categoryId}
              node={child}
              selectedCategoryCode={selectedCategoryCode}
              onSelectCategory={onSelectCategory}
              expandedCategoryIds={expandedCategoryIds}
              onToggleCategoryExpand={onToggleCategoryExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Preset Exclusion Reasons for Dropdown
const PRESET_EXCLUSION_REASONS = [
  'High-Value Product Restriction',
  'Client Commercial Contract Exclusion',
  'Non-Serviceable Area / SLA Delay',
  'Fragile / Special Handling Required',
  'Carrier Operational Issue',
  'Custom Reason / Other',
];

// NDJSON & JSON parser helper
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
      .split('\n')
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

export default function CourierExclusionsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CLIENT' | 'PRODUCT'>('CLIENT');

  // Shared Data: All Courier Services from GET /courier/services
  const [allCourierServices, setAllCourierServices] = useState<CourierServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  // Global Exclusion Reason Selection for Client & Product
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>(PRESET_EXCLUSION_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState<string>('');

  // ---------------------------------------------------------------------------
  // TAB 1: CLIENT EXCLUSIONS STATES
  // ---------------------------------------------------------------------------
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [clientSearch, setClientSearch] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState<boolean>(false);

  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [loadingPrograms, setLoadingPrograms] = useState<boolean>(false);

  const [clientExclusions, setClientExclusions] = useState<ClientExclusionRecord[]>([]);
  const [loadingClientExclusions, setLoadingClientExclusions] = useState<boolean>(false);
  const [togglingServiceId, setTogglingServiceId] = useState<number | null>(null);
  const [reasonInputs, setReasonInputs] = useState<Record<number, string>>({});

  // ---------------------------------------------------------------------------
  // TAB 2: PRODUCT EXCLUSIONS STATES (3-COLUMN MULTI-SELECT & TREE CATEGORIES)
  // ---------------------------------------------------------------------------
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  // Master Filter Options & Category Tree
  const [masterBrands, setMasterBrands] = useState<any[]>([]);
  const [masterProductTypes, setMasterProductTypes] = useState<any[]>([]);
  const [treeCategories, setTreeCategories] = useState<CategoryNode[]>([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number>>(new Set());
  const [showCategoryTreeModal, setShowCategoryTreeModal] = useState<boolean>(false);

  // Product Filter States for Column 1
  const [productSearch, setProductSearch] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [comboFilter, setComboFilter] = useState<string>('ALL');

  const [productExclusions, setProductExclusions] = useState<ProductExclusionRecord[]>([]);
  const [loadingProductExclusions, setLoadingProductExclusions] = useState<boolean>(false);
  const [togglingProdServiceId, setTogglingProdServiceId] = useState<number | null>(null);

  // ===========================================================================
  // MASTER FILTER DATA FETCHING (Brands, Product Types, Categories Tree)
  // ===========================================================================
  const fetchMasterFilterData = useCallback(async () => {
    try {
      // 1. Fetch Brands
      axiosInstance.get('/prod/brands', { headers: { Accept: 'application/x-ndjson' } })
        .then(res => setMasterBrands(parseNdjson(res.data)))
        .catch(err => console.warn('Could not load brands:', err));

      // 2. Fetch Product Types
      axiosInstance.get('/prod/types', { headers: { Accept: 'application/x-ndjson' } })
        .then(res => setMasterProductTypes(parseNdjson(res.data)))
        .catch(err => console.warn('Could not load product types:', err));

      // 3. Fetch Categories & Build Tree
      axiosInstance.get('/prod/categories/client/0/export', { headers: { Accept: 'application/x-ndjson' } })
        .then(res => {
          const parsedCats = parseNdjson(res.data);
          const map = new Map<number, CategoryNode>();
          const roots: CategoryNode[] = [];

          parsedCats.forEach((cat: any) => {
            const id = cat.categoryId || cat.id;
            if (id) {
              map.set(id, {
                categoryId: id,
                categoryCode: cat.categoryCode || cat.code || cat.categoryName,
                categoryName: cat.categoryName || cat.name || `Category #${id}`,
                level: cat.level,
                parentId: cat.parentId,
                children: [],
              });
            }
          });

          parsedCats.forEach((cat: any) => {
            const id = cat.categoryId || cat.id;
            if (!id) return;
            const node = map.get(id)!;
            if (cat.parentId === null || cat.parentId === undefined || !map.has(cat.parentId)) {
              roots.push(node);
            } else {
              const parentNode = map.get(cat.parentId)!;
              parentNode.children.push(node);
            }
          });

          setTreeCategories(roots);
        })
        .catch(err => console.warn('Could not load categories:', err));
    } catch (err) {
      console.warn('Master filter load error:', err);
    }
  }, []);

  // Category Tree Expand/Collapse Toggle
  const handleToggleCategoryExpand = (id: number) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectCategoryNode = (cat: CategoryNode) => {
    if (categoryFilter === cat.categoryCode) {
      setCategoryFilter('');
      setSelectedCategoryName('');
    } else {
      setCategoryFilter(cat.categoryCode);
      setSelectedCategoryName(cat.categoryName);
    }
  };

  // ===========================================================================
  // BACKEND PRODUCT API SEARCH & FILTERING (POST /prod/products/bulk & GET /prod/products)
  // ===========================================================================
  const fetchFilteredProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const q = productSearch.trim();
      let skuParts: string[] = [];
      let isBulkSkuSearch = false;

      if (q) {
        if (q.includes(',') || q.includes(';') || q.includes('\n') || q.includes('\r')) {
          skuParts = q.split(/[,\n\r;]+/).map((p) => p.trim()).filter(Boolean);
          isBulkSkuSearch = skuParts.length > 0;
        } else {
          const spaceParts = q.split(/\s+/).map((p) => p.trim()).filter(Boolean);
          const isAllSkus = spaceParts.length > 1 && spaceParts.every((p) => /^[A-Z0-9-]+$/i.test(p) && p.includes('-'));
          if (isAllSkus) {
            skuParts = spaceParts;
            isBulkSkuSearch = true;
          }
        }
      }

      let parsedRaw: any[] = [];

      if (isBulkSkuSearch) {
        const res = await axiosInstance.post<string>('/prod/products/bulk', skuParts, {
          headers: {
            Accept: 'application/x-ndjson',
            'Content-Type': 'application/json',
          },
          responseType: 'text',
          transformResponse: [(data) => data],
        });
        parsedRaw = parseNdjson(res.data);
      } else {
        const params = new URLSearchParams();
        if (q) {
          const isSku = /^[A-Z0-9-]+$/i.test(q) && q.includes('-');
          if (isSku) {
            params.append('sku', q);
          } else {
            params.append('name', q);
          }
        }
        if (brandFilter) {
          params.append('brand', brandFilter);
        }
        if (productTypeFilter) {
          params.append('productType', productTypeFilter);
        }
        if (categoryFilter) {
          params.append('sku', categoryFilter);
        }
        if (comboFilter === 'COMBO') {
          params.append('isCombo', 'true');
        } else if (comboFilter === 'SINGLE') {
          params.append('isCombo', 'false');
        }

        const queryString = params.toString();
        const url = `/prod/products?${queryString ? `${queryString}&` : ''}_t=${Date.now()}`;

        const res = await axiosInstance.get(url, {
          headers: {
            Accept: 'application/x-ndjson',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        parsedRaw = parseNdjson(res.data);
      }
      const formattedProducts: ProductItem[] = parsedRaw.map((p: any) => ({
        id: p.id,
        productName: p.baseProductName || p.productName || p.defaultSku || `Product #${p.id}`,
        skuCode: p.defaultSku || p.skuCode || p.productCode,
        productCode: p.productCode || p.defaultSku,
        primaryImageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0].url : p.primaryImageUrl,
        brandName: p.brandName,
        categoryPath: p.categoryPath,
        productTypeName: p.productTypeName || p.typeName,
        isCombo: Boolean(p.isCombo),
      }));

      formattedProducts.sort((a, b) => (a.productName || '').localeCompare(b.productName || '', undefined, { sensitivity: 'base' }));
      setProducts(formattedProducts);
    } catch (err) {
      console.warn('Could not fetch products via /prod/products, falling back to export:', err);
      // Fallback export fetch
      try {
        const fallbackRes = await axiosInstance.get('/prod/sku/product/0/export', {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsedFallback = parseNdjson(fallbackRes.data).map((p: any) => ({
          id: p.id,
          productName: p.baseProductName || p.productName || p.defaultSku || `Product #${p.id}`,
          skuCode: p.defaultSku || p.skuCode || p.productCode,
          productCode: p.productCode || p.defaultSku,
          primaryImageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0].url : p.primaryImageUrl,
          brandName: p.brandName,
          categoryPath: p.categoryPath,
          isCombo: Boolean(p.isCombo),
        }));
        parsedFallback.sort((a: any, b: any) => (a.productName || '').localeCompare(b.productName || '', undefined, { sensitivity: 'base' }));
        setProducts(parsedFallback);
      } catch (fErr) {
        console.error('Fallback export failed:', fErr);
      }
    } finally {
      setLoadingProducts(false);
    }
  }, [productSearch, brandFilter, productTypeFilter, categoryFilter, comboFilter]);

  // Debounced Filter Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchFilteredProducts();
    }, 350);
    return () => clearTimeout(handler);
  }, [fetchFilteredProducts]);

  // ===========================================================================
  // INITIAL DATA FETCH (Clients, Services, Master Filters, Exclusions)
  // ===========================================================================
  const loadInitialData = useCallback(async () => {
    setLoadingClients(true);
    setLoadingServices(true);

    try {
      // 1. Fetch Clients
      const clientRes = await axiosInstance.get('/client', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsedClients = parseNdjson(clientRes.data).sort((a, b) =>
        (a.clientName || '').localeCompare(b.clientName || '', undefined, { sensitivity: 'base' })
      );
      setClients(parsedClients);
      if (parsedClients.length > 0) {
        setSelectedClient(parsedClients[0]);
      }

      // 2. Fetch ALL Courier Services (GET /courier/services)
      const serviceRes = await axiosInstance.get('/courier/services', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsedServices = parseNdjson(serviceRes.data).sort((a, b) =>
        (a.serviceName || '').localeCompare(b.serviceName || '', undefined, { sensitivity: 'base' })
      );
      setAllCourierServices(parsedServices);

      // 3. Fetch Master Filter Options
      fetchMasterFilterData();

      // 4. Fetch Client Exclusions
      fetchClientExclusions();

      // 5. Fetch Product Exclusions
      fetchProductExclusions();
    } catch (err) {
      console.error('Error loading initial data for exclusions:', err);
      toast.error('Failed to load initial data');
    } finally {
      setLoadingClients(false);
      setLoadingServices(false);
    }
  }, [fetchMasterFilterData]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Unique Brand Options combining API master brands & dynamic product brand names
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    masterBrands.forEach((b) => {
      const bName = b.brandName || b.name || b.displayName;
      if (bName && bName.trim()) brandsSet.add(bName.trim());
    });
    products.forEach((p) => {
      if (p.brandName && p.brandName.trim()) brandsSet.add(p.brandName.trim());
    });
    return Array.from(brandsSet).sort();
  }, [masterBrands, products]);

  // Available Product Types
  const availableProductTypes = useMemo(() => {
    const typesSet = new Set<string>();
    masterProductTypes.forEach((t) => {
      const tName = t.displayName || t.code || t.productTypeName || t.typeName || t.name;
      if (tName && tName.trim()) typesSet.add(tName.trim());
    });
    products.forEach((p) => {
      if (p.productTypeName && p.productTypeName.trim()) typesSet.add(p.productTypeName.trim());
    });
    return Array.from(typesSet).sort();
  }, [masterProductTypes, products]);

  // Fetch Programs when Selected Client changes
  useEffect(() => {
    if (!selectedClient) {
      setPrograms([]);
      setSelectedProgram(null);
      return;
    }

    const buList = selectedClient.businessUnits || [];
    if (buList.length === 0) {
      setPrograms([]);
      setSelectedProgram(null);
      return;
    }

    const fetchClientProgs = async () => {
      setLoadingPrograms(true);
      const allProgs: ProgramItem[] = [];
      try {
        for (const bu of buList) {
          if (!bu.id) continue;
          try {
            const res = await axiosInstance.get(`/client/program/${bu.id}`, {
              headers: { Accept: 'application/x-ndjson' },
            });
            const parsed = parseNdjson(res.data);
            parsed.forEach((p: any) => {
              if (p && p.id) {
                // Filter condition: user requires hasSeparateExcludeCourier === true
                if (p.hasSeparateExcludeCourier === true) {
                  allProgs.push(p);
                }
              }
            });
          } catch (e) {
            console.warn(`Could not load programs for BU ${bu.id}:`, e);
          }
        }
        allProgs.sort((a, b) => (a.programName || '').localeCompare(b.programName || '', undefined, { sensitivity: 'base' }));
        setPrograms(allProgs);
        setSelectedProgram(allProgs.length > 0 ? allProgs[0] : null);
      } catch (err) {
        console.error('Error fetching programs for client:', err);
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchClientProgs();
  }, [selectedClient]);

  // Fetch Client Exclusions
  const fetchClientExclusions = async () => {
    setLoadingClientExclusions(true);
    console.log('====================================');
    console.log('[API REQUEST] GET /courier/exclusions/client/all');
    console.log('cURL command for Swagger:');
    console.log(
      `curl -X 'GET' \\\n  'https://v2.lakeetech.com/courier/exclusions/client/all' \\\n  -H 'accept: application/x-ndjson, application/json, */*' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
    );
    console.log('====================================');

    try {
      const res = await axiosInstance.get('/courier/exclusions/client/all');
      console.log('[API RESPONSE] GET /courier/exclusions/client/all:', res.data);
      const raw = res.data?.data || res.data;
      setClientExclusions(parseNdjson(raw));
    } catch (err) {
      console.warn('Could not fetch client exclusions:', err);
    } finally {
      setLoadingClientExclusions(false);
    }
  };

  // Fetch Product Exclusions
  const fetchProductExclusions = async () => {
    setLoadingProductExclusions(true);
    console.log('====================================');
    console.log('[API REQUEST] GET /courier/exclusions/product/all');
    console.log('cURL command for Swagger:');
    console.log(
      `curl -X 'GET' \\\n  'https://v2.lakeetech.com/courier/exclusions/product/all' \\\n  -H 'accept: application/x-ndjson, application/json, */*' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
    );
    console.log('====================================');

    try {
      const res = await axiosInstance.get('/courier/exclusions/product/all');
      console.log('[API RESPONSE] GET /courier/exclusions/product/all:', res.data);
      const raw = res.data?.data || res.data;
      setProductExclusions(parseNdjson(raw));
    } catch (err) {
      console.warn('Could not fetch product exclusions:', err);
    } finally {
      setLoadingProductExclusions(false);
    }
  };

  // Compute Active Reason Text
  const getActiveReasonText = () => {
    if (selectedPresetReason === 'Custom Reason / Other') {
      return customReasonText.trim() || 'Custom Exclusion Reason';
    }
    return selectedPresetReason;
  };

  // ===========================================================================
  // TAB 1: CLIENT EXCLUSION HANDLERS
  // ===========================================================================
  const getClientExclusionRecord = (courierServiceId: number) => {
    if (!selectedClient) return null;
    const targetProgramId = selectedProgram ? selectedProgram.id : null;
    return (
      clientExclusions.find(
        (excl) =>
          excl.clientId === selectedClient.id &&
          (excl.programId === targetProgramId || (!excl.programId && !targetProgramId)) &&
          excl.courierServiceId === courierServiceId &&
          excl.active !== false
      ) || null
    );
  };

  const handleToggleClientExclusion = async (service: CourierServiceItem) => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }

    const targetProgramId = selectedProgram ? selectedProgram.id : null;
    const matchingRecords = clientExclusions.filter(
      (excl) =>
        excl.clientId === selectedClient.id &&
        (excl.programId === targetProgramId || (!excl.programId && !targetProgramId)) &&
        excl.courierServiceId === service.id
    );

    const isCurrentlyBlocked = matchingRecords.some((rec) => rec.active !== false) || matchingRecords.length > 0;
    const nextActiveState = !isCurrentlyBlocked; // true = block, false = unblock

    setTogglingServiceId(service.id);
    const toastId = toast.loading(nextActiveState ? `Blocking ${service.serviceName}...` : `Unblocking ${service.serviceName}...`);

    const finalReason = reasonInputs[service.id]?.trim() || getActiveReasonText();

    try {
      if (nextActiveState) {
        // BLOCK: POST /courier/exclusions/client
        const payload = {
          clientId: selectedClient.id,
          programId: targetProgramId,
          courierServiceId: service.id,
          reason: finalReason,
          active: true,
        };

        console.log('====================================');
        console.log('[API REQUEST] POST /courier/exclusions/client (BLOCK)');
        console.log('Client ID:', selectedClient.id);
        console.log('Program ID:', targetProgramId);
        console.log('Courier Service ID:', service.id);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('cURL command for Swagger:');
        console.log(
          `curl -X 'POST' \\\n  'https://v2.lakeetech.com/courier/exclusions/client' \\\n  -H 'accept: application/json' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\\n  -d '${JSON.stringify(payload, null, 2)}'`
        );
        console.log('====================================');

        const res = await axiosInstance.post('/courier/exclusions/client', payload);
        console.log('[API RESPONSE] POST /courier/exclusions/client:', res.data);
        toast.success(`Blocked ${service.serviceName} for ${selectedClient.clientName}`, { id: toastId });
      } else {
        // UNBLOCK: DELETE /courier/exclusions/client/{id}
        const recordsWithId = matchingRecords.filter((r) => r.id !== undefined && r.id !== null);

        if (recordsWithId.length > 0) {
          for (const rec of recordsWithId) {
            const exclId = rec.id;
            console.log('====================================');
            console.log(`[API REQUEST] DELETE /courier/exclusions/client/${exclId} (UNBLOCK)`);
            console.log('Exclusion Record ID:', exclId);
            console.log('Client ID:', selectedClient.id);
            console.log('Program ID:', targetProgramId);
            console.log('Courier Service ID:', service.id);
            console.log('cURL command for Swagger:');
            console.log(
              `curl -X 'DELETE' \\\n  'https://v2.lakeetech.com/courier/exclusions/client/${exclId}' \\\n  -H 'accept: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
            );
            console.log('====================================');

            const res = await axiosInstance.delete(`/courier/exclusions/client/${exclId}`);
            console.log(`[API RESPONSE] DELETE /courier/exclusions/client/${exclId}:`, res.data);
          }
        } else {
          // Fallback if no record ID found in local state
          const payload = {
            clientId: selectedClient.id,
            programId: targetProgramId,
            courierServiceId: service.id,
            reason: finalReason,
            active: false,
          };
          console.log('====================================');
          console.log('[API REQUEST] POST /courier/exclusions/client (UNBLOCK Fallback)');
          console.log('Payload:', JSON.stringify(payload, null, 2));
          console.log('====================================');
          const res = await axiosInstance.post('/courier/exclusions/client', payload);
          console.log('[API RESPONSE] POST /courier/exclusions/client:', res.data);
        }
        toast.success(`Unblocked ${service.serviceName}`, { id: toastId });
      }

      // Re-fetch client exclusions list to stay 100% in sync with backend
      await fetchClientExclusions();
    } catch (err: any) {
      console.error('Failed to toggle client exclusion:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update block status.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setTogglingServiceId(null);
    }
  };

  // Filtered Client List (Sorted A-Z by clientName)
  const filteredClients = clients
    .filter((c) => {
      if (!clientSearch.trim()) return true;
      const q = clientSearch.toLowerCase();
      return c.clientName.toLowerCase().includes(q) || c.clientCode.toLowerCase().includes(q);
    })
    .sort((a, b) => (a.clientName || '').localeCompare(b.clientName || '', undefined, { sensitivity: 'base' }));

  // ===========================================================================
  // TAB 2: PRODUCT EXCLUSION MULTI-SELECT & BULK HANDLERS
  // ===========================================================================
  const handleToggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAllProducts = () => {
    const currentFilteredIds = products.map((p) => p.id);
    const isAllSelected =
      currentFilteredIds.length > 0 && currentFilteredIds.every((id) => selectedProductIds.includes(id));

    if (isAllSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      const newSet = new Set([...selectedProductIds, ...currentFilteredIds]);
      setSelectedProductIds(Array.from(newSet));
    }
  };

  const isBulkBlockedForService = (serviceId: number) => {
    if (selectedProductIds.length === 0) return false;
    return selectedProductIds.every((prodId) =>
      productExclusions.some((excl) => excl.productId === prodId && excl.courierServiceId === serviceId && excl.active !== false)
    );
  };

  const handleToggleBulkProductExclusion = async (service: CourierServiceItem) => {
    if (selectedProductIds.length === 0) {
      toast.error('Please select at least 1 product in Column 2 first');
      return;
    }

    const isAllCurrentlyBlocked = isBulkBlockedForService(service.id);
    const nextActiveState = !isAllCurrentlyBlocked; // true = block all selected, false = unblock all selected

    setTogglingProdServiceId(service.id);
    const toastId = toast.loading(
      nextActiveState
        ? `Blocking ${service.serviceName} for ${selectedProductIds.length} product(s)...`
        : `Unblocking ${service.serviceName} for ${selectedProductIds.length} product(s)...`
    );

    const finalReason = getActiveReasonText();
    let successCount = 0;

    try {
      for (const prodId of selectedProductIds) {
        const matchingRecords = productExclusions.filter(
          (excl) => excl.productId === prodId && excl.courierServiceId === service.id
        );

        if (nextActiveState) {
          // BLOCK: POST /courier/exclusions/product
          const existingRecord = matchingRecords[0];
          const payload: Record<string, any> = {
            productId: prodId,
            courierServiceId: service.id,
            reason: finalReason,
            active: true,
          };

          if (existingRecord?.id) {
            payload.id = existingRecord.id;
          }

          console.log('====================================');
          console.log(`[API REQUEST] POST /courier/exclusions/product (BLOCK)`);
          console.log('Product ID:', prodId);
          console.log('Courier Service ID:', service.id);
          console.log('Payload:', JSON.stringify(payload, null, 2));
          console.log('cURL command for Swagger:');
          console.log(
            `curl -X 'POST' \\\n  'https://v2.lakeetech.com/courier/exclusions/product' \\\n  -H 'accept: application/json' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\\n  -d '${JSON.stringify(payload, null, 2)}'`
          );
          console.log('====================================');

          try {
            const res = await axiosInstance.post('/courier/exclusions/product', payload);
            console.log('[API RESPONSE] POST /courier/exclusions/product:', res.data);
            successCount++;
          } catch (itemErr) {
            console.error(`Error saving product exclusion for product ID ${prodId}:`, itemErr);
          }
        } else {
          // UNBLOCK: DELETE /courier/exclusions/product/{id}
          const recordsWithId = matchingRecords.filter((r) => r.id !== undefined && r.id !== null);

          if (recordsWithId.length > 0) {
            for (const rec of recordsWithId) {
              const exclId = rec.id;
              console.log('====================================');
              console.log(`[API REQUEST] DELETE /courier/exclusions/product/${exclId} (UNBLOCK)`);
              console.log('Exclusion Record ID:', exclId);
              console.log('Product ID:', prodId);
              console.log('Courier Service ID:', service.id);
              console.log('cURL command for Swagger:');
              console.log(
                `curl -X 'DELETE' \\\n  'https://v2.lakeetech.com/courier/exclusions/product/${exclId}' \\\n  -H 'accept: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE'`
              );
              console.log('====================================');

              try {
                const res = await axiosInstance.delete(`/courier/exclusions/product/${exclId}`);
                console.log(`[API RESPONSE] DELETE /courier/exclusions/product/${exclId}:`, res.data);
                successCount++;
              } catch (itemErr) {
                console.error(`Error deleting product exclusion record ID ${exclId}:`, itemErr);
              }
            }
          } else {
            // Fallback if no local record ID exists
            const payload: Record<string, any> = {
              productId: prodId,
              courierServiceId: service.id,
              reason: finalReason,
              active: false,
            };
            console.log('====================================');
            console.log(`[API REQUEST] POST /courier/exclusions/product (UNBLOCK Fallback)`);
            console.log('Product ID:', prodId);
            console.log('Courier Service ID:', service.id);
            console.log('Payload:', JSON.stringify(payload, null, 2));
            console.log('====================================');
            try {
              const res = await axiosInstance.post('/courier/exclusions/product', payload);
              console.log('[API RESPONSE] POST /courier/exclusions/product:', res.data);
              successCount++;
            } catch (itemErr) {
              console.error(`Error sending unblock fallback for product ID ${prodId}:`, itemErr);
            }
          }
        }
      }

      // Re-fetch clean list from server to stay 100% in sync
      await fetchProductExclusions();

      if (nextActiveState) {
        toast.success(`Blocked ${service.serviceName} for ${successCount} product(s)`, { id: toastId });
      } else {
        toast.success(`Unblocked ${service.serviceName} for ${successCount} product(s)`, { id: toastId });
      }
    } catch (err: any) {
      console.error('Failed to toggle bulk product exclusion:', err);
      toast.error('Failed to update product blocklist status', { id: toastId });
    } finally {
      setTogglingProdServiceId(null);
    }
  };

  const isAllFilteredSelected =
    products.length > 0 && products.every((p) => selectedProductIds.includes(p.id));

  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Client & Product Courier Blocklists"
      pageSubtitle="Courier Partners > Exclusions Engine"
      pageIcon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
    >
      <div className="space-y-6 pb-12">
        {/* Tab Navigation & Inline Action */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('CLIENT')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'CLIENT'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Building2 size={16} />
              Tab 1: Client & Program Exclusions
            </button>

            <button
              onClick={() => setActiveTab('PRODUCT')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'PRODUCT'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <PackageX size={16} />
              Tab 2: Product Courier Exclusions
            </button>
          </div>

          <button
            onClick={() => {
              loadInitialData();
              fetchFilteredProducts();
            }}
            className="px-3.5 py-2 mb-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
          >
            <RefreshCw size={14} className={loadingClients || loadingServices || loadingProducts ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CLIENT EXCLUSIONS (3-COLUMN WORKFLOW) */}
        {/* =================================================================== */}
        {activeTab === 'CLIENT' && (
          <div className="space-y-6">
            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 flex items-center gap-3">
              <ShieldAlert className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
              <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
                <strong>Client Courier Exclusion Workflow:</strong> Select a client in Column 1 &rarr; Select an optional Program Channel in Column 2 (if program has custom courier overrides) &rarr; Set exclusion reason and toggle block/unblock status across all courier services in Column 3.
              </p>
            </div>

            {/* 3-COLUMN GRID CONTAINER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* ------------------------------------------------------------- */}
              {/* COLUMN 1: SELECT CLIENT */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                      1. Select Client
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {filteredClients.length} Clients
                  </span>
                </div>

                {/* Search Client */}
                <div className="relative flex-shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search client code or name..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                  />
                </div>

                {/* Client List Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {loadingClients ? (
                    <div className="py-12 text-center text-slate-400">
                      <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
                      <span className="text-xs font-semibold">Loading clients...</span>
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No clients matching search.
                    </div>
                  ) : (
                    filteredClients.map((client) => {
                      const isSelected = selectedClient?.id === client.id;
                      return (
                        <div
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center flex-shrink-0 shadow-2xs">
                              {client.logoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={client.logoUrl}
                                  alt={client.clientName}
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              ) : (
                                <Building2 size={18} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {client.clientName}
                              </p>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700 mt-0.5">
                                {client.clientCode}
                              </span>
                            </div>
                          </div>

                          <ChevronRight size={16} className={`flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 2: SELECT PROGRAM CHANNEL */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                      2. Program Channel
                    </h3>
                  </div>
                  {selectedClient && (
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedClient.clientName}
                    </span>
                  )}
                </div>

                {!selectedClient ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <Building2 size={32} className="text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-bold">No Client Selected</p>
                    <p className="text-[11px]">Select a client in Column 1 to view program channel options.</p>
                  </div>
                ) : loadingPrograms ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="animate-spin text-indigo-600 mb-2" size={24} />
                    <span className="text-xs font-semibold">Fetching programs...</span>
                  </div>
                ) : programs.length > 0 ? (
                  <div className="flex-1 flex flex-col min-h-0 space-y-3">
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 rounded-2xl p-3 text-[11px] text-indigo-900 dark:text-indigo-200 leading-tight">
                      Listing programs configured with custom courier exclusions.
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                      {programs.map((prog) => {
                        const isSelected = selectedProgram?.id === prog.id;
                        return (
                          <div
                            key={prog.id}
                            onClick={() => setSelectedProgram(prog)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-sm ring-1 ring-indigo-500/30'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                  {prog.programName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                  {prog.programCode}
                                </span>
                              </div>
                              {prog.programLabel && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {prog.programLabel}
                                </p>
                              )}
                            </div>

                            <ChevronRight size={16} className={`flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-50/60 dark:bg-slate-800/20 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-center space-y-3">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Client-Level Exclusion Active
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xs">
                        This client does not require program-specific courier exclusion overrides. Exclusions will apply directly to <strong>{selectedClient.clientName}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 3: ALL COURIER SERVICES & REASON DROPDOWN */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                      3. Courier Services Blocklist
                    </h3>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900">
                    {allCourierServices.length} Services Available
                  </span>
                </div>

                {/* Highlighted Exclusion Reason Header & Selection Dropdown */}
                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl p-3.5 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2 flex-shrink-0 shadow-2xs">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-indigo-200/60 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                      <Tag size={12} />
                    </span>
                    <span>Exclusion Reason</span>
                  </label>

                  <select
                    value={selectedPresetReason}
                    onChange={(e) => setSelectedPresetReason(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-bold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-indigo-950 dark:text-indigo-100 transition-all shadow-2xs"
                  >
                    {PRESET_EXCLUSION_REASONS.map((reasonStr) => (
                      <option key={reasonStr} value={reasonStr}>
                        {reasonStr}
                      </option>
                    ))}
                  </select>

                  {selectedPresetReason === 'Custom Reason / Other' && (
                    <input
                      type="text"
                      value={customReasonText}
                      onChange={(e) => setCustomReasonText(e.target.value)}
                      placeholder="Type custom exclusion reason..."
                      className="w-full h-8.5 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 mt-1.5"
                    />
                  )}
                </div>

                {/* All Courier Services List Table (Single Line Rows) */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin min-h-0">
                  {!selectedClient ? (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      Select a client in Column 1 to manage blocklist.
                    </div>
                  ) : loadingServices ? (
                    <div className="py-16 text-center text-slate-400">
                      <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
                      <span className="text-xs font-semibold">Loading all courier services...</span>
                    </div>
                  ) : allCourierServices.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      No courier services found.
                    </div>
                  ) : (
                    allCourierServices.map((service) => {
                      const exclRecord = getClientExclusionRecord(service.id);
                      const isBlocked = exclRecord ? exclRecord.active : false;
                      const isToggling = togglingServiceId === service.id;

                      return (
                        <div
                          key={service.id}
                          className={`px-3.5 py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isBlocked
                              ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                              : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {service.serviceName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
                              {service.serviceCode}
                            </span>
                            {service.serviceType && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                {service.serviceType}
                              </span>
                            )}
                          </div>

                          {/* Block Toggle Checkbox */}
                          <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
                            {isToggling ? (
                              <Loader2 size={16} className="animate-spin text-blue-600" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isBlocked}
                                disabled={isToggling}
                                onChange={() => handleToggleClientExclusion(service)}
                                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                            )}
                            <span className={`text-xs font-bold ${isBlocked ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {isBlocked ? 'BLOCKED' : 'ALLOWED'}
                            </span>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: PRODUCT EXCLUSIONS WORKFLOW (3-COLUMN ADVANCED FILTERS ENGINE) */}
        {/* =================================================================== */}
        {activeTab === 'PRODUCT' && (
          <div className="space-y-6">
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-4 flex items-center gap-3">
              <PackageX className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={20} />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                <strong>Product Courier Exclusion Engine:</strong> Use live backend filters & Category Tree in Column 1 &rarr; Multi-select target products in Column 2 &rarr; Select an exclusion reason and bulk-toggle block/unblock status across courier services in Column 3.
              </p>
            </div>

            {/* 3-COLUMN GRID CONTAINER FOR PRODUCT EXCLUSIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* ------------------------------------------------------------- */}
              {/* COLUMN 1: PRODUCT ADVANCED FILTERS & CATEGORY TREE */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-amber-600 dark:text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                      1. Product Filters
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch('');
                      setBrandFilter('');
                      setProductTypeFilter('');
                      setCategoryFilter('');
                      setSelectedCategoryName('');
                      setComboFilter('ALL');
                    }}
                    className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Clear All
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  {/* Search Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Search by SKU (comma-separated for bulk), Product Name
                    </label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search by SKU (comma-separated for bulk), Product Name"
                        className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Category Tree Selector (Same as admin/products/list) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <FolderOpen size={12} className="text-amber-600" />
                        <span>Category Tree Filter</span>
                      </label>
                      {categoryFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('');
                            setSelectedCategoryName('');
                          }}
                          className="text-[10px] font-bold text-red-600 hover:underline"
                        >
                          Clear Category
                        </button>
                      )}
                    </div>

                    {categoryFilter && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
                        <span className="truncate">Selected: {selectedCategoryName || categoryFilter}</span>
                        <X size={13} className="cursor-pointer flex-shrink-0" onClick={() => { setCategoryFilter(''); setSelectedCategoryName(''); }} />
                      </div>
                    )}

                    {/* Category Tree Box */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 p-2.5 max-h-48 overflow-y-auto scrollbar-thin">
                      {treeCategories.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-3 text-center">Loading category tree...</div>
                      ) : (
                        treeCategories.map((rootNode) => (
                          <CategoryTreeNode
                            key={rootNode.categoryId}
                            node={rootNode}
                            selectedCategoryCode={categoryFilter}
                            onSelectCategory={(cat) => {
                              if (categoryFilter === cat.categoryCode) {
                                setCategoryFilter('');
                                setSelectedCategoryName('');
                              } else {
                                setCategoryFilter(cat.categoryCode);
                                setSelectedCategoryName(cat.categoryName);
                              }
                            }}
                            expandedCategoryIds={expandedCategoryIds}
                            onToggleCategoryExpand={handleToggleCategoryExpand}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Brand Filter Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Brand Filter
                    </label>
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                    >
                      <option value="">All Brands ({availableBrands.length})</option>
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product Type Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Product Type Filter
                    </label>
                    <select
                      value={productTypeFilter}
                      onChange={(e) => setProductTypeFilter(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                    >
                      <option value="">All Product Types ({availableProductTypes.length})</option>
                      {availableProductTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Combo Product Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Combo / Single Products
                    </label>
                    <select
                      value={comboFilter}
                      onChange={(e) => setComboFilter(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                    >
                      <option value="ALL">All Products (Combo & Single)</option>
                      <option value="SINGLE">Single Products Only</option>
                      <option value="COMBO">Combo Bundles Only</option>
                    </select>
                  </div>

                  {/* Active Filter Summary Box */}
                  <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Live API Query Status:</span>
                      {loadingProducts && <Loader2 size={12} className="animate-spin text-amber-600" />}
                    </div>
                    <p className="font-semibold">{products.length} Product(s) Found</p>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 2: PRODUCTS LIST (MULTI-SELECT & SELECT ALL) */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-amber-600 dark:text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                      2. Select Products
                    </h3>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900">
                    {selectedProductIds.length} Selected
                  </span>
                </div>

                {/* Multi-Select Action Bar (Select All Toggle) */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-3 flex-shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleSelectAllProducts}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Select All Filtered ({products.length})
                    </span>
                  </label>

                  {selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProductIds([])}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Deselect All
                    </button>
                  )}
                </div>

                {/* Product Multi-Select List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {loadingProducts ? (
                    <div className="py-12 text-center text-slate-400">
                      <Loader2 className="animate-spin text-amber-600 mx-auto mb-2" size={24} />
                      <span className="text-xs font-semibold">Fetching matching products...</span>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No products matching active search / filter criteria.
                    </div>
                  ) : (
                    products.map((prod) => {
                      const isSelected = selectedProductIds.includes(prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleToggleProductSelection(prod.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 shadow-sm ring-1 ring-amber-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Individual Product Selection Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProductSelection(prod.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer flex-shrink-0"
                            />

                            <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center flex-shrink-0 shadow-2xs">
                              {prod.primaryImageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={prod.primaryImageUrl}
                                  alt={prod.productName}
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              ) : (
                                <Package size={16} className="text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {prod.productName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {(prod.skuCode || prod.productCode) && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700">
                                    {prod.skuCode || prod.productCode}
                                  </span>
                                )}
                                {prod.brandName && (
                                  <span className="text-[10px] font-semibold text-slate-400 truncate">
                                    {prod.brandName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {isSelected ? 'SELECTED' : 'SELECT'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 3: BULK MANAGE PRODUCT COURIER SERVICES BLOCKLIST */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-red-600 dark:text-red-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                      3. Manage Product Blocklist
                    </h3>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900">
                    {selectedProductIds.length} Product(s) Target
                  </span>
                </div>

                {/* Highlighted Exclusion Reason Header & Selection Dropdown */}
                <div className="bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl p-3.5 border border-amber-200/80 dark:border-amber-800/60 space-y-2 flex-shrink-0 shadow-2xs">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                      <Tag size={12} />
                    </span>
                    <span>Exclusion Reason</span>
                  </label>

                  <select
                    value={selectedPresetReason}
                    onChange={(e) => setSelectedPresetReason(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-amber-950 dark:text-amber-100 transition-all shadow-2xs"
                  >
                    {PRESET_EXCLUSION_REASONS.map((reasonStr) => (
                      <option key={reasonStr} value={reasonStr}>
                        {reasonStr}
                      </option>
                    ))}
                  </select>

                  {selectedPresetReason === 'Custom Reason / Other' && (
                    <input
                      type="text"
                      value={customReasonText}
                      onChange={(e) => setCustomReasonText(e.target.value)}
                      placeholder="Type custom exclusion reason..."
                      className="w-full h-8.5 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-100 mt-1.5"
                    />
                  )}
                </div>

                {/* Services List Table (Single Line Rows) */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin min-h-0">
                  {selectedProductIds.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      Select 1 or more products in Column 2 to manage blocklist.
                    </div>
                  ) : loadingServices ? (
                    <div className="py-16 text-center text-slate-400">
                      <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
                      <span className="text-xs font-semibold">Loading all courier services...</span>
                    </div>
                  ) : allCourierServices.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      No courier services found.
                    </div>
                  ) : (
                    allCourierServices.map((service) => {
                      const isBlocked = isBulkBlockedForService(service.id);
                      const isToggling = togglingProdServiceId === service.id;

                      return (
                        <div
                          key={service.id}
                          className={`px-3.5 py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isBlocked
                              ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                              : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {service.serviceName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
                              {service.serviceCode}
                            </span>
                            {service.serviceType && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex-shrink-0">
                                {service.serviceType}
                              </span>
                            )}
                          </div>

                          {/* Block Toggle Checkbox */}
                          <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
                            {isToggling ? (
                              <Loader2 size={16} className="animate-spin text-red-600" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isBlocked}
                                disabled={isToggling}
                                onChange={() => handleToggleBulkProductExclusion(service)}
                                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                            )}
                            <span className={`text-xs font-bold ${isBlocked ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {isBlocked ? 'BLOCKED' : 'ALLOWED'}
                            </span>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
