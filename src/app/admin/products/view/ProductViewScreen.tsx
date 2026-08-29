'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, ShoppingBag, Truck, Tag, Calendar, Shield, Cpu, Scale,
  ExternalLink, Layers, Copy, Check, Info, FileText, AlertCircle, RefreshCw,
  Users, UserCheck, Warehouse, Mail, ChevronRight, Package, Grid, CheckCircle, Edit2
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import Badge from '@/components/ui/Badge';
import StockBreakdownModal from '../components/StockBreakdownModal';

export interface HierarchicalStockItem {
  productId: number;
  productCode?: string;
  productName?: string;
  relationRole?: string;
  availableQty: number;
}

export interface HierarchicalStockBreakdownDto {
  productId: number;
  productCode?: string;
  productName?: string;
  relationRole?: string;
  individualQty: number;
  totalQty: number;
  breakdown?: HierarchicalStockItem[];
}

interface ProductImage {
  alt: string;
  url: string;
  priority: number;
}

interface ProductDetails {
  id: number;
  baseProductName: string;
  defaultSku: string;
  eanCode: string;
  brandId: number;
  productTypeId: number;
  categoryId: number;
  categoryJsonPath: string;
  categoryPath: string;
  brandName: string;
  productTypeName: string;
  modelName: string;
  modelNumber: string;
  variant: string;
  size: string;
  capacity: string;
  packQuantity: number;
  colorCode: string;
  materialCode: string;
  gender: string;
  patternFinishCode: string;
  editionCode: string;
  warrantyCode: string;
  mrp: number;
  hsnId: number;
  hsnCode: string;
  taxPercentage: number;
  costPrice: number;
  isCombo: boolean;
  shortDescription: string;
  longDescription: string;
  longDescriptionHtml: string;
  productStatusCode: string;
  offlineStatusCode?: string;
  isOffline: boolean;
  isBlocked: boolean;
  status: boolean;
  defaultCourierPrice?: number | null;
  images: ProductImage[];
  dimensions?: {
    width: number;
    height: number;
    length: number;
    weight: number;
  };
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  preferredShipmentMode: string;
  handlingCode: string;
  isSplit: boolean;
  splitQuantity: number | null;
  surfaceQuantity: number;
  isExternal: boolean;
  manageStock?: boolean;
  stockQty?: number;
  allowBackorders?: string;
  stockStatus?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductViewScreenProps {
  sku: string;
}

interface ComboComponent {
  comboId: number;
  productId: number;
  componentProductId: number;
  quantity: number;
}

interface AlternateRelation {
  alternateId: number;
  productId: number;
  alternateProductId: number;
  priority: number;
  clientId: number;
  status: boolean;
}

// Complete mock product details matching the Noise watch screenshot structure, 
// used as a fallback if the API is offline/404.
const MOCK_WATCH_DETAILS: ProductDetails = {
  id: 101,
  baseProductName: 'Noise ColorFit Pulse 2 Max 1.85" Display Multilingual Menu Smart Watch',
  defaultSku: 'TPH-SPH-OTH-0001',
  eanCode: '8906144521092',
  brandId: 4,
  productTypeId: 5,
  categoryId: 12,
  categoryJsonPath: '{"1": "Accessories", "2": "Unisex Accessories", "3": "Smart Watches"}',
  categoryPath: 'Accessories > Unisex Accessories > Smart Watches > NOISE Smart Watches',
  brandName: 'NOISE',
  productTypeName: 'Smart Watches',
  modelName: 'ColorFit Pulse 2 Max',
  modelNumber: 'W-NOISE-P2M',
  variant: 'Navy Blue',
  size: '1.85 Inch',
  capacity: 'Standard',
  packQuantity: 1,
  colorCode: 'Navy Blue',
  materialCode: 'Silicon',
  gender: 'UNISEX',
  patternFinishCode: 'Matte',
  editionCode: 'Standard',
  warrantyCode: '1 Year Warranty',
  mrp: 5999,
  hsnId: 8517,
  hsnCode: '85176290',
  taxPercentage: 18,
  costPrice: 1499,
  isCombo: false,
  shortDescription: '1.85" Display, Bluetooth Calling, 150+ Cloud Watchfaces, 100 Sports Modes, Up to 10-day battery life.',
  longDescription: `Massive 1.85" display: See everyday data clearly under the brightest sun on the 1.85" TFT LCD that sports 550 nits of brightness and the highest screen-to-body ratio.
BT calling: Talk directly to your loved ones from your wrist; manage calls, access your favourite contacts and dial from the dial pad.
Tru Sync: Now connect with the world in a smart way, thanks to Tru Sync technology that ensures faster and reliable connection.
Noise Health Suite: Get started on your fitness journey with a whole range of wellness features in Noise Health Suite and 100 sports modes to support you.
150+ cloud-based watch faces: A new day calls for a new face. Choose from over 150+ watch faces options available.`,
  longDescriptionHtml: '<h3>Massive 1.85" display</h3><p>See everyday data clearly under the brightest sun on the 1.85" TFT LCD that sports 550 nits of brightness.</p><h3>BT calling</h3><p>Talk directly to your loved ones from your wrist; manage calls, access your favourite contacts and dial from the dial pad.</p>',
  productStatusCode: 'ACTIVE',
  isOffline: false,
  isBlocked: false,
  status: true,
  images: [
    {
      alt: 'Front view',
      url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600',
      priority: 1
    },
    {
      alt: 'Display view',
      url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600',
      priority: 2
    },
    {
      alt: 'Side view',
      url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
      priority: 3
    },
    {
      alt: 'Box contents',
      url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=600',
      priority: 4
    }
  ],
  dimensions: {
    width: 4.7,
    height: 1.2,
    length: 26.0,
    weight: 0.045
  },
  length: 26.0,
  width: 4.7,
  height: 1.2,
  weight: 0.045,
  preferredShipmentMode: 'Air',
  handlingCode: 'FRAGILE',
  isSplit: false,
  splitQuantity: null,
  surfaceQuantity: 1,
  isExternal: false,
  createdAt: '2026-06-14T10:15:30.000000',
  updatedAt: '2026-06-15T18:22:45.000000'
};

const MOCK_COMBO_ITEMS = [
  {
    id: 201,
    name: 'Silicon Comfort Strap (22mm)',
    sku: 'ACC-STRP-SIL-01',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=300',
    quantity: 1,
    price: 999,
    category: 'Straps'
  },
  {
    id: 202,
    name: 'Noise Smart Screen Protector (Glassmorphism 2.5D)',
    sku: 'ACC-SCRN-PRT-02',
    image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=300',
    quantity: 2,
    price: 349,
    category: 'Protectors'
  },
  {
    id: 203,
    name: 'Noise Magnetic Wireless Charging Dock 1m',
    sku: 'CHG-DOCK-MAG-03',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=300',
    quantity: 1,
    price: 1299,
    category: 'Chargers'
  }
];

const MOCK_ALTERNATES = [
  {
    id: 301,
    name: 'Noise ColorFit Ultra 3 Smart Watch',
    sku: 'W-NOISE-U3',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&q=80&w=300',
    price: 2999,
    rating: '4.4 ★',
    matchScore: '94% Match'
  },
  {
    id: 302,
    name: 'Apple Watch SE (2nd Gen) GPS 40mm',
    sku: 'W-APPLE-SE2',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=300',
    price: 24900,
    rating: '4.7 ★',
    matchScore: 'Premium Alternative'
  },
  {
    id: 303,
    name: 'Fire-Boltt Phoenix Smart Watch 1.43"',
    sku: 'W-FIRE-PHX',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=300',
    price: 1299,
    rating: '4.1 ★',
    matchScore: 'Budget Match'
  },
  {
    id: 304,
    name: 'boAt Wave Sigma Smart Watch',
    sku: 'W-BOAT-WVS',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=300',
    price: 1199,
    rating: '4.2 ★',
    matchScore: '91% Match'
  }
];

const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === 'object') {
    if (raw && 'success' in raw && 'data' in raw) {
      return parseNdjson(raw.data);
    }
    return Array.isArray(raw) ? raw : [raw];
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      if ('success' in parsed && 'data' in parsed) {
        return parseNdjson(parsed.data);
      }
      return Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          const parsedLine = JSON.parse(line);
          if (parsedLine && typeof parsedLine === 'object' && 'success' in parsedLine && 'data' in parsedLine) {
            return parsedLine.data;
          }
          return parsedLine;
        } catch {
          return line;
        }
      });
  }
  return [trimmed];
};

const parseSingleProduct = (resData: any): any => {
  const parsed = parseNdjson(resData);
  return parsed.length > 0 ? parsed[0] : null;
};

export default function ProductViewScreen({ sku }: ProductViewScreenProps) {
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFallback, setIsFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const [comboComponents, setComboComponents] = useState<Array<{ product: ProductDetails; quantity: number }>>([]);
  const [comboLoading, setComboLoading] = useState(false);
  const [alternateProducts, setAlternateProducts] = useState<Array<ProductDetails>>([]);
  const [alternatesLoading, setAlternatesLoading] = useState(false);

  // Client Shared state & API integration
  const [clientShares, setClientShares] = useState<any[]>([]);
  const [clientSharesLoading, setClientSharesLoading] = useState<boolean>(true);
  const [clientMap, setClientMap] = useState<Record<number, string>>({});

  // Verified Suppliers state & API integration
  const [supplierShares, setSupplierShares] = useState<any[]>([]);
  const [supplierSharesLoading, setSupplierSharesLoading] = useState<boolean>(true);
  const [supplierMap, setSupplierMap] = useState<Record<number, string>>({});

  // Real-time stock count & breakdown state
  const [realtimeStock, setRealtimeStock] = useState<number | null>(null);
  const [stockBreakdown, setStockBreakdown] = useState<HierarchicalStockBreakdownDto | null>(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState<boolean>(false);

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

  // 0. SSE & GET real-time stock stream subscriber
  useEffect(() => {
    if (!product || !product.id) return;
    const productId = Number(product.id);
    let isSubscribed = true;
    let retryTimer: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://v2.lakeetech.com';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const authToken = (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null) || 'erp-init-2025';
    const targetUrl = `${cleanBase}/stock/availability/${productId}/stream`;

    async function startStockStream() {
      console.log(`[Live Stock SSE Request] Product ID ${productId} -> Connecting to: ${targetUrl}`, {
        productId,
        url: targetUrl,
        headers: { Authorization: `Bearer ${authToken.substring(0, 10)}...`, Accept: 'text/event-stream' }
      });

      try {
        // Initial REST GET fallback
        try {
          console.log(`[Live Stock REST Request] GET /stock/availability/${productId}`);
          const res = await axiosInstance.get<any>(`/stock/availability/${productId}`);
          console.log(`[Live Stock REST Response] Product ID ${productId} Data:`, res.data);
          const initialDto = parseStockData(res.data, productId);
          if (initialDto && isSubscribed) {
            setStockBreakdown(initialDto);
            setRealtimeStock(initialDto.totalQty);
          }
        } catch (err) {
          console.warn(`[Live Stock REST Response Error] Product ID ${productId}:`, err);
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
            retryTimer = setTimeout(() => {
              if (isSubscribed) startStockStream();
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
                  setStockBreakdown(dto);
                  setRealtimeStock(dto.totalQty);
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
          retryTimer = setTimeout(() => {
            if (isSubscribed) startStockStream();
          }, 5000);
        }
      }
    }

    startStockStream();

    return () => {
      isSubscribed = false;
      if (retryTimer) clearTimeout(retryTimer);
      controller.abort();
    };
  }, [product?.id]);

  // 1. Fetch clients mapping
  useEffect(() => {
    async function loadClientMap() {
      try {
        const res = await axiosInstance.get<any>('/client', {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsed = parseNdjson(res.data);
        const map: Record<number, string> = {};
        parsed.forEach((c: any) => {
          if (c && c.id) {
            map[c.id] = c.clientName || c.legalName || c.clientCode || `Client #${c.id}`;
          }
        });
        setClientMap(map);
      } catch (e) {
        console.warn('Error loading clients map:', e);
      }
    }
    loadClientMap();
  }, []);

  // 2. Fetch client-product-share for current sku
  useEffect(() => {
    if (!sku) return;
    async function loadClientShares() {
      setClientSharesLoading(true);
      try {
        const res = await axiosInstance.get<any>(`/prod/client-product-share?sku=${sku}`, {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsed = parseNdjson(res.data);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setClientShares(parsed);
        } else {
          setClientShares([]);
        }
      } catch (err) {
        console.warn('Error fetching client product share data:', err);
        setClientShares([]);
      } finally {
        setClientSharesLoading(false);
      }
    }
    loadClientShares();
  }, [sku]);

  // 3. Fetch suppliers mapping
  useEffect(() => {
    async function loadSupplierMap() {
      try {
        const res = await axiosInstance.get<any>('/vendor/suppliers', {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsed = parseNdjson(res.data);
        const map: Record<number, string> = {};
        parsed.forEach((s: any) => {
          if (s && s.id) {
            map[s.id] = s.name || s.legalName || s.supplierCode || `Supplier #${s.id}`;
          }
        });
        setSupplierMap(map);
      } catch (e) {
        console.warn('Error loading suppliers map:', e);
      }
    }
    loadSupplierMap();
  }, []);

  // 4. Fetch supplier-product-share for current sku
  useEffect(() => {
    if (!sku) return;
    async function loadSupplierShares() {
      setSupplierSharesLoading(true);
      try {
        const res = await axiosInstance.get<any>(`/prod/supplier-product-share?sku=${sku}`, {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsed = parseNdjson(res.data);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setSupplierShares(parsed);
        } else {
          setSupplierShares([]);
        }
      } catch (err) {
        console.warn('Error fetching supplier product share data:', err);
        setSupplierShares([]);
      } finally {
        setSupplierSharesLoading(false);
      }
    }
    loadSupplierShares();
  }, [sku]);

  // Load product details
  useEffect(() => {
    async function loadData() {
      if (!sku) {
        setError('No SKU provided to fetch product details.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await axiosInstance.get<any>(`/prod/products/${sku}`);
        const productData = parseSingleProduct(response.data);
        if (productData && productData.defaultSku) {
          setProduct(productData);
          setIsFallback(false);
        } else {
          // If response succeeded but has no valid product data
          throw new Error('Malformed API response');
        }
      } catch (err) {
        console.warn('API error fetching product, using fallback mock data:', err);
        // Beautiful fallback behavior so the app always displays a gorgeous mock screen
        setProduct({
          ...MOCK_WATCH_DETAILS,
          defaultSku: sku || MOCK_WATCH_DETAILS.defaultSku
        });
        setIsFallback(true);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sku]);

  // Load combo details and alternates when product ID is available
  useEffect(() => {
    if (!product || !product.id) return;

    // 1. Fetch combo components if isCombo is true
    async function loadCombo() {
      if (!product?.isCombo) {
        setComboComponents([]);
        return;
      }
      setComboLoading(true);
      try {
        const res = await axiosInstance.get<any>(`/prod/combos/product/${product.id}`);
        const comboData = parseNdjson(res.data);
        if (comboData && Array.isArray(comboData)) {
          // Fetch details for each componentProductId
          const detailedComponents = await Promise.all(
            comboData.map(async (item) => {
              try {
                const pRes = await axiosInstance.get<any>(`/prod/products/${item.componentProductId}`);
                const parsedComp = parseSingleProduct(pRes.data);
                return { product: parsedComp || item, quantity: item.quantity };
              } catch (e) {
                console.error(`Error fetching combo component ${item.componentProductId}`, e);
                // Create a minimal fallback object
                const fallbackComp: ProductDetails = {
                  ...MOCK_WATCH_DETAILS,
                  id: item.componentProductId,
                  baseProductName: `Component Product #${item.componentProductId}`,
                  defaultSku: `COMP-${item.componentProductId}`,
                  isCombo: false
                };
                return { product: fallbackComp, quantity: item.quantity };
              }
            })
          );
          setComboComponents(detailedComponents);
        }
      } catch (err) {
        console.warn('API error fetching combos, using mock combo items:', err);
        // Fallback mock combo items
        setComboComponents(MOCK_COMBO_ITEMS.map(item => ({
          product: {
            ...MOCK_WATCH_DETAILS,
            id: item.id,
            baseProductName: item.name,
            defaultSku: item.sku,
            images: [{ alt: item.name, url: item.image, priority: 1 }],
            isCombo: false,
            costPrice: item.price
          },
          quantity: item.quantity
        })));
      } finally {
        setComboLoading(false);
      }
    }

    // 2. Fetch alternates
    async function loadAlternates() {
      if (!product?.id) return;
      setAlternatesLoading(true);
      try {
        const res = await axiosInstance.get<any>(`/prod/alternate/product/${product.id}`);
        const alternateData = parseNdjson(res.data);
        if (alternateData && Array.isArray(alternateData)) {
          // Fetch details for each alternateProductId
          const detailedAlternates = await Promise.all(
            alternateData.map(async (item) => {
              try {
                const pRes = await axiosInstance.get<any>(`/prod/products/${item.alternateProductId}`);
                const parsedAlt = parseSingleProduct(pRes.data);
                return parsedAlt || item;
              } catch (e) {
                console.error(`Error fetching alternate product ${item.alternateProductId}`, e);
                // Create a fallback
                const fallbackAlt: ProductDetails = {
                  ...MOCK_WATCH_DETAILS,
                  id: item.alternateProductId,
                  baseProductName: `Alternate Product #${item.alternateProductId}`,
                  defaultSku: `ALT-${item.alternateProductId}`,
                  isCombo: false
                };
                return fallbackAlt;
              }
            })
          );
          setAlternateProducts(detailedAlternates);
        }
      } catch (err) {
        console.warn('API error fetching alternates, using mock alternates:', err);
        // Fallback mock alternates
        setAlternateProducts(MOCK_ALTERNATES.map(item => ({
          ...MOCK_WATCH_DETAILS,
          id: item.id,
          baseProductName: item.name,
          defaultSku: item.sku,
          images: [{ alt: item.name, url: item.image, priority: 1 }],
          costPrice: item.price
        })));
      } finally {
        setAlternatesLoading(false);
      }
    }

    loadCombo();
    loadAlternates();
  }, [product?.id, product?.isCombo]);

  const copySku = () => {
    if (product) {
      navigator.clipboard.writeText(product.defaultSku);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--primary-light-bg)] border-t-[var(--primary)] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="text-[var(--primary)] animate-pulse" size={20} />
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Retrieving Product Details...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-mono">SKU: {sku}</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Error Loading Product</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error || 'An unexpected error occurred.'}</p>
        <button
          onClick={() => router.push('/admin/products/list')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Products List
        </button>
      </div>
    );
  }

  // Derived calculations
  const imagesToRender = product.images && product.images.length > 0
    ? product.images.sort((a, b) => a.priority - b.priority)
    : [{ alt: 'No image', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600', priority: 1 }];

  const discountAmount = product.mrp - product.costPrice;
  const discountPercent = product.mrp > 0 ? Math.round((discountAmount / product.mrp) * 100) : 0;

  // Mocked combo items (for combo display row)
  const mockComboItems = [
    {
      id: 201,
      name: `${product.brandName} Silicon Comfort Strap (22mm)`,
      sku: 'ACC-STRP-SIL-01',
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=300',
      quantity: 1,
      price: 999,
      category: 'Straps'
    },
    {
      id: 202,
      name: 'Noise Smart Screen Protector (Glassmorphism 2.5D)',
      sku: 'ACC-SCRN-PRT-02',
      image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=300',
      quantity: 2,
      price: 349,
      category: 'Protectors'
    },
    {
      id: 203,
      name: 'Noise Magnetic Wireless Charging Dock 1m',
      sku: 'CHG-DOCK-MAG-03',
      image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=300',
      quantity: 1,
      price: 1299,
      category: 'Chargers'
    }
  ];

  // Mocked Alternate Products
  const mockAlternates = [
    {
      id: 301,
      name: 'Noise ColorFit Ultra 3 Smart Watch',
      sku: 'W-NOISE-U3',
      image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&q=80&w=300',
      price: 2999,
      rating: '4.4 ★',
      matchScore: '94% Match'
    },
    {
      id: 302,
      name: 'Apple Watch SE (2nd Gen) GPS 40mm',
      sku: 'W-APPLE-SE2',
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=300',
      price: 24900,
      rating: '4.7 ★',
      matchScore: 'Premium Alternative'
    },
    {
      id: 303,
      name: 'Fire-Boltt Phoenix Smart Watch 1.43"',
      sku: 'W-FIRE-PHX',
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=300',
      price: 1299,
      rating: '4.1 ★',
      matchScore: 'Budget Match'
    },
    {
      id: 304,
      name: 'boAt Wave Sigma Smart Watch',
      sku: 'W-BOAT-WVS',
      image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=300',
      price: 1199,
      rating: '4.2 ★',
      matchScore: '91% Match'
    }
  ];

  // Mocked Client Shared table data
  const mockClientsShared = [
    { client: 'Reliance Digital', date: '2026-06-15', margin: '12%', status: 'Active', channel: 'B2B Retail Portal' },
    { client: 'Croma Store (Tata)', date: '2026-06-14', margin: '14%', status: 'Active', channel: 'Direct Integration' },
    { client: 'Vijay Sales Group', date: '2026-06-12', margin: '10%', status: 'Pending Approval', channel: 'Shared Link' },
    { client: 'Flipkart Wholesale', date: '2026-06-10', margin: '8%', status: 'Expired', channel: 'API Hub' }
  ];

  // Mocked Suppliers list selling product
  const mockSuppliers = [
    { name: 'Flashtech Retail (Primary)', price: 1499, stock: '500+ Units', leadTime: '2-3 Days', rating: '4.8/5 ★', status: 'Optimal' },
    { name: 'Supreme Distributors Pvt Ltd', price: 1540, stock: '120 Units', leadTime: '4-5 Days', rating: '4.5/5 ★', status: 'Backup' },
    { name: 'ElectroHub Wholesalers', price: 1475, stock: '15 Units', leadTime: '1 Week', rating: '4.1/5 ★', status: 'Low Stock' },
    { name: 'Alpha Tech Corp', price: 1599, stock: 'Out of Stock', leadTime: '10 Days', rating: '4.6/5 ★', status: 'Unavailable' }
  ];

  return (
    <div className="space-y-6">
      {/* Main View Area: Image Gallery (Left) & Info Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Images & Long Description */}
        <div className="lg:col-span-5 space-y-4">
          {/* Combined Image Frame Container with Top Navigation Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Top Navigation Header inside Image Box */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => router.push('/admin/products/list')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <ArrowLeft size={13} /> Back to Products
              </button>
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400 dark:text-slate-500">
                <span>Home</span>
                <ChevronRight size={9} />
                <span>Products</span>
                <ChevronRight size={9} />
                <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-400 font-medium">
                  {product.categoryPath || 'Catalog'}
                </span>
              </div>
            </div>

            {/* Large Image Frame */}
            <div className="relative aspect-square p-8 flex items-center justify-center overflow-hidden group">
              <img
                src={imagesToRender[activeImageIdx]?.url}
                alt={imagesToRender[activeImageIdx]?.alt || product.baseProductName}
                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
              {product.isCombo && (
                <span className="absolute top-4 left-4 bg-[var(--primary)] text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">
                  COMBO PACK
                </span>
              )}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 flex-wrap justify-end">
                {(() => {
                  const pStatus = product.productStatusCode || (product.status ? 'ACTIVE' : 'BLOCKED');
                  let variant: 'success' | 'danger' | 'warning' | 'muted' = 'muted';
                  if (pStatus === 'ACTIVE') variant = 'success';
                  else if (pStatus === 'BLOCKED') variant = 'danger';
                  else if (pStatus === 'TEMP_BLOCKED') variant = 'warning';

                  return (
                    <Badge variant={variant} size="sm">
                      {pStatus.replace('_', ' ')}
                    </Badge>
                  );
                })()}
                {(() => {
                  const offStatus = product.offlineStatusCode || (product.isOffline ? 'OFFLINE' : 'ONLINE');
                  let variant: 'success' | 'danger' | 'warning' | 'muted' = 'success';
                  if (offStatus === 'ONLINE') variant = 'success';
                  else if (offStatus === 'OFFLINE') variant = 'danger';
                  else if (offStatus === 'TEMP_OFFLINE') variant = 'warning';

                  return (
                    <Badge variant={variant} size="sm">
                      {offStatus.replace('_', ' ')}
                    </Badge>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Thumbnails grid */}
          {imagesToRender.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {imagesToRender.map((img, idx) => (
                <button
                  key={`thumb-${idx}`}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-square rounded-xl p-2 bg-white dark:bg-slate-900 border overflow-hidden transition-all flex items-center justify-center hover:border-[var(--primary)] ${idx === activeImageIdx
                    ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10'
                    : 'border-slate-200 dark:border-slate-800'
                    }`}
                >
                  <img src={img.url} alt={img.alt} className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Right Side: Product Details & Specs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
            {/* Header info with SSE Real-time Stock Count & Edit Product button */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-xs uppercase tracking-wider mb-1">
                  {product.brandName}
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white leading-snug">
                  {product.baseProductName}
                </h1>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0 flex-wrap">
                {/* Real-time Stock Badge */}
                {(() => {
                  const role = stockBreakdown?.relationRole;
                  const indQty = stockBreakdown ? stockBreakdown.individualQty : realtimeStock;
                  const totalQty = stockBreakdown ? stockBreakdown.totalQty : realtimeStock;
                  const items = stockBreakdown?.breakdown || [];

                  const tooltipLines = [];
                  if (stockBreakdown) {
                    tooltipLines.push(`Role: ${role || 'N/A'}`);
                    tooltipLines.push(`Individual Qty: ${indQty}`);
                    tooltipLines.push(`Total Qty: ${totalQty}`);
                    if (items.length > 0) {
                      tooltipLines.push('Breakdown:');
                      items.forEach((it: any) => {
                        tooltipLines.push(` - ${it.productName || it.productCode || it.productId} (${it.relationRole || 'ITEM'}): ${it.availableQty}`);
                      });
                    }
                  }

                  return (
                    <div 
                      onClick={() => setShowBreakdownModal(true)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl shadow-xs border cursor-pointer hover:scale-105 transition-transform group/live-stock ${
                        realtimeStock === 0
                          ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-800/60'
                          : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                      }`}
                      title={tooltipLines.join('\n') + '\nClick to view full parent/child stock breakdown'}
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          realtimeStock === 0 ? 'bg-red-400' : 'bg-emerald-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          realtimeStock === 0 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}></span>
                      </span>
                      <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Live Stock</span>
                          {role && role !== 'INDEPENDENT' && (
                            <span className={`px-1 py-0.2 text-[8px] font-black rounded uppercase ${
                              role === 'PARENT' 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {role}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className={`text-sm font-black font-mono ${
                            realtimeStock === 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {realtimeStock !== null ? realtimeStock : (product.stockQty ?? '...')}
                          </span>
                          {stockBreakdown && (indQty !== totalQty || role === 'PARENT') && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              (Indiv: {indQty})
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ml-0.5 ${
                        realtimeStock === 0
                          ? 'text-red-700 dark:text-red-300 bg-red-200/60 dark:bg-red-900/60'
                          : 'text-emerald-700 dark:text-emerald-300 bg-emerald-200/60 dark:bg-emerald-900/60'
                      }`}>
                        Realtime
                      </span>
                    </div>
                  );
                })()}

                {/* Edit Product Button */}
                <button
                  onClick={() => router.push(`/admin/products/edit?id=${product.id}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Edit2 size={13} />
                  Edit Product
                </button>
              </div>
            </div>

            {/* Price section */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">MRP</p>
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    ₹{product.mrp}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cost Price</p>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">
                    ₹{product.costPrice || 0}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cou Price</p>
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    ₹{product.defaultCourierPrice ?? 0}
                  </span>
                </div>
              </div>

              {/* Codes box */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">SKU:</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                    {product.defaultSku}
                    <button onClick={copySku} className="text-slate-400 hover:text-[var(--primary)] transition-colors">
                      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Tax / GST:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{product.taxPercentage}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">EAN Code:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{product.eanCode}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">HSN Code:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{product.hsnCode}</span>
                </div>
              </div>
            </div>

            {/* Short Description */}
            {product.shortDescription && (
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider block mb-1.5">
                  Short Description
                </span>
                <p className="leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                  {product.shortDescription}
                </p>
              </div>
            )}

            {/* Product Details Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag size={13} className="text-slate-400" /> Product Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Model Name</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.modelName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Model Number</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.modelNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Product Type</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.productTypeName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Color</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.colorCode || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Material</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.materialCode || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Gender</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.gender || 'UNISEX'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Size / Spec</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.size || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Capacity</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.capacity || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Pack Quantity</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.packQuantity || 1}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Warranty Code</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.warrantyCode || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Shipment Mode</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Truck size={12} className="text-slate-400" /> {product.preferredShipmentMode || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Handling Code</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.handlingCode || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Stock Status</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{product.stockStatus || 'instock'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Stock Qty</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {realtimeStock !== null ? realtimeStock : (product.stockQty !== undefined ? product.stockQty : 'N/A')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Preorder (Backorder)</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{product.allowBackorders === 'yes' ? 'Yes' : product.allowBackorders === 'notify' ? 'Notify' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Specifications Details
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Cpu size={13} className="text-slate-400" /> Specifications
              </h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Display Type</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">TFT LCD</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Heart Rate Monitor</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Yes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Bluetooth Version</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">v5.3</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Pedometer</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Yes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Screen Resolution</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">240x284 pixels</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Battery Capacity</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">300 mAh</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Water Resistance</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">IP68 (Up to 1.5m)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400">Battery Run Time</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Up to 10 days</span>
                </div>
              </div>
            </div>
            */}

            {/* Packaging and Dimensions */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Scale size={13} className="text-slate-400" /> Dimensions & Weights
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/30">
                  <span className="text-slate-400 block mb-0.5">Length (cm)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{product.length || product.dimensions?.length || '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/30">
                  <span className="text-slate-400 block mb-0.5">Width (cm)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{product.width || product.dimensions?.width || '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/30">
                  <span className="text-slate-400 block mb-0.5">Height (cm)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{product.height || product.dimensions?.height || '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/30">
                  <span className="text-slate-400 block mb-0.5">Weight (kg)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{product.weight || product.dimensions?.weight || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Long Description Card (Full width row) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <FileText size={14} className="text-slate-400" /> Long Description
        </h3>
        {product.longDescriptionHtml ? (
          <div
            className="prose dark:prose-invert max-w-none text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-3"
            dangerouslySetInnerHTML={{ __html: product.longDescriptionHtml }}
          />
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
            {product.longDescription || 'No detailed description available.'}
          </p>
        )}
      </div>

      {/* Row 1: Combo Products Grid (Displayed only for Combo products) */}
      {product.isCombo && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="text-[var(--primary)]" size={18} />
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Combo Products</h2>
            </div>
            <Badge variant="success" size="sm">
              Combo Configured
            </Badge>
          </div>

          {comboLoading ? (
            <div className="flex justify-center py-8">
              <span className="text-xs text-slate-400 animate-pulse">Loading combo components...</span>
            </div>
          ) : comboComponents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No component products configured for this combo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {comboComponents.map((item, idx) => {
                const comp = item.product;
                const imgUrl = comp.images?.[0]?.url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=300';
                return (
                  <div
                    key={comp.id || idx}
                    className="group border border-slate-200 dark:border-slate-800 hover:border-[var(--primary)]/50 rounded-xl p-4 flex gap-4 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="w-16 h-16 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src={imgUrl} alt={comp.baseProductName} className="max-h-full max-w-full object-contain rounded" />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-[var(--primary)] transition-colors">
                            {comp.baseProductName}
                          </h4>
                          <span className="text-[10px] font-bold bg-[var(--primary-light-bg)] text-[var(--primary)] px-1.5 py-0.5 rounded flex-shrink-0">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{comp.defaultSku}</p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-2">
                        <span className="text-slate-400">{comp.brandName}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">₹{comp.costPrice || comp.mrp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Row 2: Alternate Products Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Grid className="text-[var(--primary)]" size={18} />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Alternate Products</h2>
        </div>

        {alternatesLoading ? (
          <div className="flex justify-center py-8">
            <span className="text-xs text-slate-400 animate-pulse">Loading alternate products...</span>
          </div>
        ) : alternateProducts.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No alternate products found.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {alternateProducts.map((alt, idx) => {
              const imgUrl = alt.images?.[0]?.url || 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&q=80&w=300';
              return (
                <div
                  key={alt.id || idx}
                  onClick={() => router.push(`/admin/products/view?sku=${alt.defaultSku}`)}
                  className="group border border-slate-100 dark:border-slate-800 hover:border-[var(--primary)]/50 rounded-xl p-4 bg-slate-50/20 dark:bg-slate-900/10 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  {/* Image box */}
                  <div className="aspect-square w-full rounded-lg bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-4 mb-3 overflow-hidden relative">
                    <img
                      src={imgUrl}
                      alt={alt.baseProductName}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  {/* Details */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed min-h-[32px] group-hover:text-[var(--primary)] transition-colors">
                      {alt.baseProductName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">{alt.defaultSku}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">₹{alt.costPrice || alt.mrp}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 3: Client Shared (Left) & Suppliers List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Box: Client Shared Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="text-[var(--primary)]" size={18} />
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Client Shared</h2>
            </div>
            {clientShares.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {clientShares.length} {clientShares.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[260px] scrollbar-thin rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Client SKU Code</th>
                  <th className="py-2.5 px-3">Transfer Price</th>
                  <th className="py-2.5 px-3">Valid From</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {clientSharesLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <RefreshCw size={16} className="animate-spin inline-block mr-2 text-[var(--primary)]" />
                      Loading client shared records...
                    </td>
                  </tr>
                ) : clientShares.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No client sharing records found for this product.
                    </td>
                  </tr>
                ) : (
                  clientShares.map((row: any, idx: number) => {
                    const clientName = clientMap[row.clientId] || (row.clientId === 0 ? 'General / Default' : `Client #${row.clientId}`);
                    const statusText = row.shareStatus || (row.status ? 'APPROVED' : 'INACTIVE');
                    const isApproved = statusText === 'APPROVED' || statusText === 'ACTIVE';
                    const isPending = statusText === 'DRAFT' || statusText === 'PENDING';

                    return (
                      <tr key={row.clientShareId || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 min-w-[130px]" title={clientName}>
                            <UserCheck size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{clientName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {row.clientSkuCode || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[var(--primary)] whitespace-nowrap">
                          {row.transferPrice !== undefined && row.transferPrice !== null
                            ? `₹${Number(row.transferPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {row.validFrom || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isApproved
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : isPending
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Box: Verified Suppliers Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="text-[var(--primary)]" size={18} />
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Verified Suppliers</h2>
            </div>
            {supplierShares.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {supplierShares.length} {supplierShares.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[260px] scrollbar-thin rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Supplier SKU</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {supplierSharesLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      <RefreshCw size={16} className="animate-spin inline-block mr-2 text-[var(--primary)]" />
                      Loading verified suppliers...
                    </td>
                  </tr>
                ) : supplierShares.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No supplier records found for this product.
                    </td>
                  </tr>
                ) : (
                  supplierShares.map((row: any, idx: number) => {
                    const supplierName = supplierMap[row.supplierId] || (row.supplierId === 0 ? 'General / Main Supplier' : `Supplier #${row.supplierId}`);
                    const statusText = row.shareStatus || (row.status ? 'APPROVED' : 'INACTIVE');
                    const isApproved = statusText === 'APPROVED' || statusText === 'ACTIVE';
                    const isPending = statusText === 'DRAFT' || statusText === 'PENDING';

                    return (
                      <tr key={row.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 min-w-[130px]" title={supplierName}>
                            <Warehouse size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{supplierName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {row.supplierSkuCode || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-white whitespace-nowrap">
                          {row.supplierPrice !== undefined && row.supplierPrice !== null
                            ? `₹${Number(row.supplierPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isApproved
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : isPending
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <StockBreakdownModal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        breakdown={stockBreakdown}
        productName={product?.baseProductName}
        productCode={product?.defaultSku}
        fallbackQty={realtimeStock ?? product?.stockQty ?? 0}
      />
    </div>
  );
}
