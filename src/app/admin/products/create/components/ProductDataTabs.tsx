'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DollarSign, Package, Truck, Link2, Sliders, Settings2,
  Plus, X, ChevronDown, Trash2, Edit3, Shuffle, ArrowUp, ArrowDown,
} from 'lucide-react';
import { SearchSelect } from './ProductSidebar';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

type Tab = 'general' | 'inventory' | 'shipping' | 'linked' | 'attributes' | 'combo' | 'alternate' | 'advanced';

const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'general', label: 'General', icon: <DollarSign size={15} />, desc: 'Pricing & tax' },
  { id: 'inventory', label: 'Inventory', icon: <Package size={15} />, desc: 'Stock & SKU' },
  { id: 'shipping', label: 'Shipping', icon: <Truck size={15} />, desc: 'Weight & dims' },
  { id: 'linked', label: 'Linked Products', icon: <Link2 size={15} />, desc: 'Upsells & cross-sells' },
  { id: 'attributes', label: 'Attributes', icon: <Sliders size={15} />, desc: 'Variants & specs' },
  { id: 'combo', label: 'Combo Products', icon: <Package size={15} />, desc: 'Bundle components' },
  { id: 'alternate', label: 'Alternate', icon: <Shuffle size={15} />, desc: 'Alternate options' },
  { id: 'advanced', label: 'Advanced', icon: <Settings2 size={15} />, desc: 'Notes & order' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-1 items-start py-2 border-b border-slate-300 dark:border-slate-700 last:border-b-0">
      <div className="pt-1.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {hint && <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-9 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-400 dark:border-slate-650 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-955 dark:text-white font-medium placeholder:text-slate-500 ${props.className ?? ''}`}
    />
  );
}

function StyledSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full h-9 px-3 pr-8 text-sm bg-white dark:bg-slate-950 border border-slate-400 dark:border-slate-650 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-955 dark:text-white font-medium appearance-none"
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
    </div>
  );
}

export interface ProductDataState {
  // General
  mrp: string;
  costPrice: string;
  defaultCourierPrice: string;
  saleSchedule: boolean;
  saleFrom: string;
  saleTo: string;
  modelName: string;
  modelNumber: string;
  selectedHsn: string;
  eanCode: string;
  // Inventory
  sku: string;
  manageStock: boolean;
  stockQty: string;
  allowBackorders: string;
  lowStockThreshold: string;
  stockStatus: string;
  soldIndividually: boolean;
  // Shipping
  weight: string;
  length: string;
  width: string;
  height: string;
  shippingClass: string;
  preferredShipmentMode: string;
  // Linked
  upsells: string;
  crossSells: string;
  // Attributes
  variant: string;
  size: string;
  capacity: string;
  packQuantity: string;
  gender: string;
  materialCode: string;
  colorCode: string;
  patternFinishCode: string;
  editionCode: string;
  // Advanced
  selectedWarranty: string;
  selectedHandling: string;
  isSplit: boolean;
  splitQuantity: string;
  surfaceQuantity: string;
  // Combo
  comboProducts: { componentProductId: number; quantity: number; name: string }[];
  // Product type
  productType: 'simple' | 'grouped';
  externalProduct: boolean;
}

interface ProductDataTabsProps {
  data: ProductDataState;
  onChange: (data: ProductDataState) => void;
  hideLinkedProducts?: boolean;
  productId?: string;
}

export const defaultProductDataState: ProductDataState = {
  mrp: '',
  costPrice: '',
  defaultCourierPrice: '',
  saleSchedule: false,
  saleFrom: '',
  saleTo: '',
  modelName: '',
  modelNumber: '',
  selectedHsn: '1',
  eanCode: '',
  sku: '',
  manageStock: false,
  stockQty: '',
  allowBackorders: 'no',
  lowStockThreshold: '',
  stockStatus: 'instock',
  soldIndividually: false,
  weight: '',
  length: '',
  width: '',
  height: '',
  shippingClass: '',
  preferredShipmentMode: 'DP',
  upsells: '',
  crossSells: '',
  variant: '',
  size: '',
  capacity: '',
  packQuantity: '',
  gender: '',
  materialCode: '',
  colorCode: '',
  patternFinishCode: '',
  editionCode: '',
  selectedWarranty: 'WAR1',
  selectedHandling: 'HHH',
  isSplit: false,
  splitQuantity: '',
  surfaceQuantity: '1',
  comboProducts: [],
  productType: 'simple',
  externalProduct: false,
};



export default function ProductDataTabs({ data, onChange, hideLinkedProducts, productId }: ProductDataTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [showHsnCreate, setShowHsnCreate] = useState(false);
  const [hsnForm, setHsnForm] = useState({
    code: '',
    description: '',
    gstRate: '18',
    effectiveFrom: new Date().toISOString().split('T')[0]
  });
  const [hsnCodes, setHsnCodes] = useState<{ id: number; code: string; description: string; gstRate: string }[]>([]);
  const [warranties, setWarranties] = useState([
    { warrantyTypeId: 1, warrantyCode: 'WAR1', displayName: 'Warranty 1' },
    { warrantyTypeId: 2, warrantyCode: 'WAR2', displayName: 'Warranty 2' },
    { warrantyTypeId: 3, warrantyCode: 'WAR7', displayName: 'Warrent 777' },
  ]);
  const [showWarrantyCreate, setShowWarrantyCreate] = useState(false);
  const [warrantyForm, setWarrantyForm] = useState({ warrantyCode: '', displayName: '', description: '' });
  const [handlingCodes, setHandlingCodes] = useState([
    { handlingTypeId: 1, handlingCode: 'TESTH1', displayName: 'Test Handling Code' },
    { handlingTypeId: 2, handlingCode: 'HHH', displayName: 'Test HHH' },
  ]);
  const [showHandlingCreate, setShowHandlingCreate] = useState(false);
  const [handlingForm, setHandlingForm] = useState({ handlingCode: '', displayName: '', description: '' });

  // Multiple SKUs management state
  const [skus, setSkus] = useState<any[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [editingSkuId, setEditingSkuId] = useState<number | null>(null);
  const [skuForm, setSkuForm] = useState({
    skuCode: '',
    price: '',
    attributes: {
      color: '',
      size: ''
    },
    isDefault: false
  });

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

  const fetchSkus = useCallback(async () => {
    if (!productId) return;
    setLoadingSkus(true);
    try {
      const response = await axiosInstance.get(`/prod/sku/product/${productId}`);
      const parsed = parseNdjson(response.data);
      setSkus(parsed);
    } catch (err) {
      console.warn('Failed to fetch SKUs by product endpoint, trying query param or list:', err);
      try {
        const response = await axiosInstance.get(`/prod/sku`);
        const parsed = parseNdjson(response.data);
        const filtered = parsed.filter((s: any) => String(s.productId) === String(productId));
        setSkus(filtered);
      } catch (err2) {
        console.error('Failed to load SKUs:', err2);
      }
    } finally {
      setLoadingSkus(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchSkus();
    }
  }, [productId, fetchSkus]);

  const handleEditSkuClick = (skuItem: any) => {
    setEditingSkuId(skuItem.skuId);
    setSkuForm({
      skuCode: skuItem.skuCode,
      price: String(skuItem.price || ''),
      attributes: {
        color: skuItem.attributes?.color || '',
        size: skuItem.attributes?.size || ''
      },
      isDefault: !!skuItem.isDefault
    });
    setShowSkuModal(true);
  };

  const saveSku = async () => {
    if (!skuForm.skuCode.trim()) {
      toast.error('SKU Code is required');
      return;
    }
    try {
      const payload = {
        productId: Number(productId),
        skuCode: skuForm.skuCode.trim(),
        clientId: 0,
        attributes: {
          color: skuForm.attributes.color.trim() || undefined,
          size: skuForm.attributes.size.trim() || undefined
        },
        price: Number(skuForm.price || 0),
        isDefault: skuForm.isDefault
      };

      if (editingSkuId) {
        await axiosInstance.put(`/prod/sku/${editingSkuId}`, payload);
        toast.success('SKU updated successfully');
      } else {
        await axiosInstance.post('/prod/sku', payload);
        toast.success('SKU added successfully');
      }

      setSkuForm({
        skuCode: '',
        price: '',
        attributes: { color: '', size: '' },
        isDefault: false
      });
      setEditingSkuId(null);
      setShowSkuModal(false);
      fetchSkus();
    } catch (err: any) {
      console.error('Failed to save SKU:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save SKU');
    }
  };

  const deleteSku = async (skuId: number) => {
    if (!window.confirm('Are you sure you want to delete this SKU?')) return;
    try {
      await axiosInstance.delete(`/prod/sku/${skuId}`);
      toast.success('SKU deleted successfully');
      fetchSkus();
    } catch (err: any) {
      console.error('Failed to delete SKU:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete SKU');
    }
  };

  const [shipmentModes, setShipmentModes] = useState<{ modeCode: string; displayName: string }[]>([
    { modeCode: 'DP', displayName: 'Direct Parcel (DP)' },
    { modeCode: 'SF', displayName: 'Surface' },
  ]);

  // Load HSN Codes from /prod/hsn
  useEffect(() => {
    const fetchHsnCodes = async () => {
      try {
        const response = await axiosInstance.get('/prod/hsn', {
          headers: { 'accept': 'application/x-ndjson' }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setHsnCodes(parsed.map(h => ({
            id: h.hsnId,
            code: h.hsnCode,
            description: h.description || '',
            gstRate: String(h.taxPercentage)
          })));
        }
      } catch (err) {
        console.warn('Failed to load HSN codes from API, using static defaults:', err);
        setHsnCodes([
          { id: 1, code: 'HSN001', description: 'General goods', gstRate: '5' },
          { id: 2, code: 'HSN054', description: 'Sample Goods', gstRate: '18' }
        ]);
      }
    };
    fetchHsnCodes();
  }, []);

  // Load Warranties from /prod/warranty/all
  useEffect(() => {
    const fetchWarranties = async () => {
      try {
        const response = await axiosInstance.get('/prod/warranty/all', {
          headers: {
            'accept': 'application/x-ndjson'
          }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setWarranties(parsed.map(w => ({
            warrantyTypeId: w.warrantyTypeId,
            warrantyCode: w.warrantyCode,
            displayName: w.displayName || w.warrantyCode
          })));
        }
      } catch (err) {
        console.warn('Failed to load warranties from API, using static defaults:', err);
      }
    };
    fetchWarranties();
  }, []);

  // Load Handling Codes from /prod/handling-type/all
  useEffect(() => {
    const fetchHandlingCodes = async () => {
      try {
        const response = await axiosInstance.get('/prod/handling-type/all', {
          headers: {
            'accept': 'application/x-ndjson'
          }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setHandlingCodes(parsed.map(hc => ({
            handlingTypeId: hc.handlingTypeId,
            handlingCode: hc.handlingCode,
            displayName: hc.displayName || hc.handlingCode
          })));
        }
      } catch (err) {
        console.warn('Failed to load handling codes from API, using static defaults:', err);
      }
    };
    fetchHandlingCodes();
  }, []);

  useEffect(() => {
    const fetchShipmentModes = async () => {
      try {
        const response = await axiosInstance.get('/prod/shipment-modes/all', {
          headers: {
            'accept': 'application/x-ndjson'
          }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setShipmentModes(parsed.map(sm => ({
            modeCode: sm.modeCode,
            displayName: sm.displayName || sm.modeCode
          })));
        }
      } catch (err) {
        console.warn('Failed to load shipment modes from API, using static defaults:', err);
      }
    };
    fetchShipmentModes();
  }, []);

  const [materials, setMaterials] = useState<{ materialCode: string; displayName: string }[]>([
    { materialCode: 'MAT007', displayName: 'Test 3' },
    { materialCode: 'MAT008', displayName: 'Test 2' },
    { materialCode: 'MAT009', displayName: 'Test 1' },
  ]);
  const [colors, setColors] = useState<{ colorCode: string; displayName: string }[]>([
    { colorCode: 'BLU', displayName: 'Blue' },
    { colorCode: 'WHI', displayName: 'White' },
    { colorCode: 'BLK', displayName: 'Black' },
    { colorCode: 'RED', displayName: 'Red' },
  ]);
  const [patterns, setPatterns] = useState<{ patternCode: string; displayName: string }[]>([
    { patternCode: 'PAT', displayName: 'Pattern Test' },
  ]);
  const [editions, setEditions] = useState<{ editionCode: string; displayName: string }[]>([
    { editionCode: 'STT', displayName: 'TEST Edition' },
  ]);

  // Load Materials
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axiosInstance.get('/prod/material/all', {
          headers: { 'accept': 'application/x-ndjson' }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setMaterials(parsed.map(m => ({
            materialCode: m.materialCode,
            displayName: m.displayName || m.materialCode
          })));
        }
      } catch (err) {
        console.warn('Failed to load materials from API:', err);
      }
    };
    fetchMaterials();
  }, []);

  // Load Colors
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await axiosInstance.get('/prod/colors/all', {
          headers: { 'accept': 'application/x-ndjson' }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setColors(parsed.map(c => ({
            colorCode: c.colorCode,
            displayName: c.displayName || c.colorCode
          })));
        }
      } catch (err) {
        console.warn('Failed to load colors from API:', err);
      }
    };
    fetchColors();
  }, []);

  // Load Patterns
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const response = await axiosInstance.get('/prod/pattern/all', {
          headers: { 'accept': 'application/x-ndjson' }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setPatterns(parsed.map(p => ({
            patternCode: p.patternCode,
            displayName: p.displayName || p.patternCode
          })));
        }
      } catch (err) {
        console.warn('Failed to load patterns from API:', err);
      }
    };
    fetchPatterns();
  }, []);

  // Load Editions
  useEffect(() => {
    const fetchEditions = async () => {
      try {
        const response = await axiosInstance.get('/prod/editions/all', {
          headers: { 'accept': 'application/x-ndjson' }
        });
        const rawData = response.data;
        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try { parsed.push(JSON.parse(line)); } catch { }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }
        if (parsed.length > 0) {
          setEditions(parsed.map(e => ({
            editionCode: e.editionCode,
            displayName: e.displayName || e.editionCode
          })));
        }
      } catch (err) {
        console.warn('Failed to load editions from API:', err);
      }
    };
    fetchEditions();
  }, []);

  const [showComboModal, setShowComboModal] = useState(false);
  const [comboModalProductId, setComboModalProductId] = useState('');
  const [comboModalQuantity, setComboModalQuantity] = useState(1);
  const [availableProducts, setAvailableProducts] = useState<{ id: number; name: string }[]>([]);

  // Alternate products management state
  const [alternates, setAlternates] = useState<any[]>([]);
  const [loadingAlternates, setLoadingAlternates] = useState(false);
  const [showAlternateModal, setShowAlternateModal] = useState(false);
  const [alternateModalProductId, setAlternateModalProductId] = useState('');

  const fetchAlternates = useCallback(async () => {
    if (!productId) return;
    setLoadingAlternates(true);
    try {
      const response = await axiosInstance.get(`/prod/alternate/product/${productId}`, {
        headers: { 'accept': 'application/x-ndjson' }
      });
      const parsed = parseNdjson(response.data);
      const sorted = parsed.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));
      setAlternates(sorted);
    } catch (err) {
      console.error('Failed to load alternates:', err);
    } finally {
      setLoadingAlternates(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchAlternates();
    }
  }, [productId, fetchAlternates]);

  const addAlternateProduct = async () => {
    if (!alternateModalProductId) return;
    const altPid = Number(alternateModalProductId);
    
    if (alternates.some((a) => a.alternateProductId === altPid)) {
      toast.error('Product is already added as an alternate');
      return;
    }

    try {
      const maxPriority = alternates.reduce((max, a) => Math.max(max, a.priority || 0), 0);
      const payload = {
        productId: Number(productId),
        alternateProductId: altPid,
        priority: maxPriority + 1,
        clientId: 0
      };

      await axiosInstance.post('/prod/alternate', payload);
      toast.success('Alternate product added successfully');
      setAlternateModalProductId('');
      setShowAlternateModal(false);
      fetchAlternates();
    } catch (err: any) {
      console.error('Failed to add alternate product:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to add alternate product');
    }
  };

  const removeAlternateProduct = async (alternateId: number) => {
    if (!window.confirm('Are you sure you want to remove this alternate product?')) return;
    try {
      await axiosInstance.delete(`/prod/alternate/${alternateId}`);
      toast.success('Alternate product removed successfully');
      fetchAlternates();
    } catch (err: any) {
      console.error('Failed to remove alternate product:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to remove alternate product');
    }
  };

  const moveAlternatePriority = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= alternates.length) return;

    const itemA = alternates[index];
    const itemB = alternates[targetIndex];

    const newPriorityA = targetIndex + 1;
    const newPriorityB = index + 1;

    try {
      const payloadA = {
        productId: Number(productId),
        alternateProductId: itemA.alternateProductId,
        priority: newPriorityA,
        clientId: itemA.clientId || 0
      };

      const payloadB = {
        productId: Number(productId),
        alternateProductId: itemB.alternateProductId,
        priority: newPriorityB,
        clientId: itemB.clientId || 0
      };

      await Promise.all([
        axiosInstance.put(`/prod/alternate/${itemA.alternateId}`, payloadA),
        axiosInstance.put(`/prod/alternate/${itemB.alternateId}`, payloadB)
      ]);

      toast.success('Priority updated successfully');
      fetchAlternates();
    } catch (err: any) {
      console.error('Failed to update priority:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update priority');
    }
  };

  useEffect(() => {
    const fetchAvailableProducts = async () => {
      try {
        const response = await axiosInstance.get('/prod/products', {
          headers: {
            'accept': 'application/x-ndjson',
          },
          responseType: 'text',
        });

        const productsList: { id: number; name: string }[] = [];
        const lines = response.data.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed && parsed.id) {
                productsList.push({
                  id: parsed.id,
                  name: parsed.baseProductName || `Product #${parsed.id}`,
                });
              }
            } catch (err) {
              console.error('Failed to parse line:', line, err);
            }
          }
        }
        setAvailableProducts(productsList);
      } catch (err) {
        console.error('Error fetching available products:', err);
      }
    };
    fetchAvailableProducts();
  }, []);

  const set = (key: keyof ProductDataState, value: unknown) => onChange({ ...data, [key]: value });

  useEffect(() => {
    if (activeTab === 'combo' && data.productType !== 'grouped') {
      setActiveTab('general');
    }
  }, [data.productType, activeTab]);

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'combo' && data.productType !== 'grouped') return false;
    if (t.id === 'linked' && hideLinkedProducts) return false;
    return true;
  });

  const addHsn = async () => {
    if (!hsnForm.code.trim()) {
      toast.error('HSN Code is required');
      return;
    }
    try {
      const payload = {
        hsnCode: hsnForm.code.trim(),
        description: hsnForm.description.trim() || null,
        taxPercentage: Number(hsnForm.gstRate) || 0,
        effectiveFrom: hsnForm.effectiveFrom
      };
      const response = await axiosInstance.post('/prod/hsn', payload);
      const created = response.data;
      const mapped = {
        id: created.hsnId,
        code: created.hsnCode,
        description: created.description || '',
        gstRate: String(created.taxPercentage)
      };
      setHsnCodes((prev) => [...prev, mapped]);
      set('selectedHsn', String(created.hsnId));
      setHsnForm({
        code: '',
        description: '',
        gstRate: '18',
        effectiveFrom: new Date().toISOString().split('T')[0]
      });
      setShowHsnCreate(false);
      toast.success('HSN Code created successfully');
    } catch (err: any) {
      console.error('Failed to create HSN Code:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create HSN Code');
    }
  };

  const addWarranty = () => {
    if (!warrantyForm.warrantyCode.trim()) return;
    const newId = warranties.length + 1;
    setWarranties([...warranties, { warrantyTypeId: newId, warrantyCode: warrantyForm.warrantyCode, displayName: warrantyForm.displayName }]);
    set('selectedWarranty', warrantyForm.warrantyCode);
    setWarrantyForm({ warrantyCode: '', displayName: '', description: '' });
    setShowWarrantyCreate(false);
  };

  const addHandling = () => {
    if (!handlingForm.handlingCode.trim()) return;
    const newId = handlingCodes.length + 1;
    setHandlingCodes([...handlingCodes, { handlingTypeId: newId, handlingCode: handlingForm.handlingCode, displayName: handlingForm.displayName }]);
    set('selectedHandling', handlingForm.handlingCode);
    setHandlingForm({ handlingCode: '', displayName: '', description: '' });
    setShowHandlingCreate(false);
  };

  const addComboProduct = () => {
    if (!comboModalProductId) return;
    const pid = Number(comboModalProductId);
    if (data.comboProducts.find((c) => c.componentProductId === pid)) return;
    const product = availableProducts.find((p) => p.id === pid);
    if (!product) return;
    set('comboProducts', [...data.comboProducts, { componentProductId: pid, quantity: comboModalQuantity, name: product.name }]);
    setComboModalProductId('');
    setComboModalQuantity(1);
    setShowComboModal(false);
  };

  const removeComboProduct = (id: number) => {
    set('comboProducts', data.comboProducts.filter((c) => c.componentProductId !== id));
  };

  const updateComboQty = (id: number, qty: number) => {
    set('comboProducts', data.comboProducts.map((c) => c.componentProductId === id ? { ...c, quantity: qty } : c));
  };

  const inputCls = 'w-full h-9 px-3 text-sm bg-white dark:bg-slate-955 border border-slate-400 dark:border-slate-650 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-955 dark:text-white font-medium placeholder:text-slate-500';
  const toggleCls = (active: boolean) => `relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${active ? 'bg-indigo-600' : 'bg-slate-400 dark:bg-slate-600'}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
      {/* Type bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">TYPE</span>
        <div className="relative">
          <select
            value={data.productType}
            onChange={(e) => set('productType', e.target.value as 'simple' | 'grouped')}
            className="h-8 pl-3 pr-8 text-sm bg-white dark:bg-slate-955 border border-slate-400 dark:border-slate-650 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-955 dark:text-white font-medium appearance-none"
          >
            <option value="simple">Single product</option>
            <option value="grouped">Combo product</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-slate-600 dark:text-slate-400">External Product</span>
          <button
            type="button"
            onClick={() => set('externalProduct', !data.externalProduct)}
            className={toggleCls(data.externalProduct)}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${data.externalProduct ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Tab sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 rounded-bl-xl overflow-hidden">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-300 dark:border-slate-700 last:border-b-0 ${activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-r-2 border-r-indigo-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <span className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>{tab.icon}</span>
              <div>
                <div className="text-xs font-semibold">{tab.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{tab.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 p-5 min-w-0">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div>
              <Field label="Pricing & Courier Cost" hint="Base selling price, purchase cost, and courier cost in INR">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">MRP *</label>
                    <StyledInput type="number" placeholder="0.00" value={data.mrp} onChange={(e) => set('mrp', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cost Price</label>
                    <StyledInput type="number" placeholder="0.00" value={data.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cou Price</label>
                    <StyledInput type="number" placeholder="0.00" value={data.defaultCourierPrice} onChange={(e) => set('defaultCourierPrice', e.target.value)} />
                  </div>
                </div>
              </Field>
              <Field label="Model Details" hint="Name & number identifiers">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Model Name</label>
                    <StyledInput placeholder="e.g. TestMode4" value={data.modelName} onChange={(e) => set('modelName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Model Number</label>
                    <StyledInput placeholder="e.g. HK00019C" value={data.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} />
                  </div>
                </div>
              </Field>
              <Field label="HSN Code" hint="Harmonized System Nomenclature">
                <div className="flex gap-2">
                  <SearchSelect
                    value={data.selectedHsn}
                    onChange={(val) => set('selectedHsn', val)}
                    items={hsnCodes}
                    getLabel={(h) => `${h.code} — ${h.gstRate}%`}
                    getSearchString={(h) => `${h.code} ${h.description} ${h.gstRate}`}
                    getId={(h) => String(h.id)}
                    placeholder="Select HSN Code"
                  />
                  <button type="button" onClick={() => setShowHsnCreate(true)} className="flex items-center justify-center p-2 h-9 w-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0">
                    <Plus size={16} />
                  </button>
                </div>
              </Field>
              <Field label="EAN Code" hint="Barcode identifier">
                <StyledInput placeholder="e.g. TESTEANCODE113" value={data.eanCode} onChange={(e) => set('eanCode', e.target.value)} />
              </Field>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div>
              <Field label="SKU" hint="Unique stock-keeping unit">
                <StyledInput placeholder="e.g. TPH-SPH-OTH-0001" value={data.sku} onChange={(e) => set('sku', e.target.value)} disabled={!!productId} className={productId ? 'opacity-70 bg-slate-50 dark:bg-slate-900 cursor-not-allowed' : ''} />
              </Field>

              {productId && (
                <div className="mt-8 border-t border-slate-350 dark:border-slate-700/60 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Product Stock Keeping Units (SKUs)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage multiple custom SKUs, prices, and attributes for this product.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSkuId(null);
                        setSkuForm({
                          skuCode: '',
                          price: '',
                          attributes: { color: '', size: '' },
                          isDefault: false
                        });
                        setShowSkuModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Plus size={14} /> Add SKU
                    </button>
                  </div>

                  {loadingSkus ? (
                    <div className="py-8 text-center text-xs text-slate-500">Loading SKUs...</div>
                  ) : skus.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-450">No additional SKUs created yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-300 dark:border-slate-800 rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-850">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">SKU Code</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Price</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Attributes</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                          {skus.map((skuItem) => {
                            const isPrimary = skuItem.skuCode === data.sku || skuItem.isDefault;
                            return (
                              <tr key={skuItem.skuId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                <td className="px-4 py-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-250">
                                  {skuItem.skuCode}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                                  ₹{skuItem.price}
                                </td>
                                <td className="px-4 py-2.5 text-xs">
                                  <div className="flex gap-1.5 flex-wrap">
                                    {skuItem.attributes && Object.entries(skuItem.attributes).map(([k, v]) => (
                                      v ? (
                                        <span key={k} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-650 dark:text-slate-400">
                                          {k}: <strong className="text-slate-800 dark:text-slate-200">{String(v)}</strong>
                                        </span>
                                      ) : null
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-xs">
                                  {isPrimary ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-250/30">
                                      Default / Primary
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-900 text-slate-550 dark:text-slate-400">
                                      Additional
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right text-xs">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditSkuClick(skuItem)}
                                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title="Edit SKU"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    {!isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => deleteSku(skuItem.skuId)}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        title="Delete SKU"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SHIPPING TAB */}
          {activeTab === 'shipping' && (
            <div>
              <Field label="Weight (kg)">
                <StyledInput type="number" step="0.01" placeholder="0.00" value={data.weight} onChange={(e) => set('weight', e.target.value)} />
              </Field>
              <Field label="Dimensions (cm)" hint="Length × Width × Height">
                <div className="grid grid-cols-3 gap-2">
                  <StyledInput type="number" step="0.1" placeholder="Length" value={data.length} onChange={(e) => set('length', e.target.value)} />
                  <StyledInput type="number" step="0.1" placeholder="Width" value={data.width} onChange={(e) => set('width', e.target.value)} />
                  <StyledInput type="number" step="0.1" placeholder="Height" value={data.height} onChange={(e) => set('height', e.target.value)} />
                </div>
              </Field>
              <Field label="Preferred Shipment Mode">
                <StyledSelect value={data.preferredShipmentMode} onChange={(e) => set('preferredShipmentMode', e.target.value)}>
                  {shipmentModes.map((sm) => (
                    <option key={sm.modeCode} value={sm.modeCode}>
                      {sm.displayName}
                    </option>
                  ))}
                </StyledSelect>
              </Field>
            </div>
          )}

          {/* LINKED PRODUCTS TAB */}
          {activeTab === 'linked' && (
            <div>
              <Field label="Upsells" hint="Products to recommend instead">
                <StyledInput placeholder="Search products…" value={data.upsells} onChange={(e) => set('upsells', e.target.value)} />
              </Field>
              <Field label="Cross-sells" hint="Products to recommend alongside">
                <StyledInput placeholder="Search products…" value={data.crossSells} onChange={(e) => set('crossSells', e.target.value)} />
              </Field>
            </div>
          )}

          {/* ATTRIBUTES TAB */}
          {activeTab === 'attributes' && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Variant</label>
                  <StyledInput placeholder="e.g. 1" value={data.variant} onChange={(e) => set('variant', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Size</label>
                  <StyledInput placeholder="e.g. 25" value={data.size} onChange={(e) => set('size', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Capacity</label>
                  <StyledInput placeholder="e.g. 256" value={data.capacity} onChange={(e) => set('capacity', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Pack Quantity</label>
                  <StyledInput type="number" min="1" placeholder="1" value={data.packQuantity} onChange={(e) => set('packQuantity', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Gender</label>
                  <StyledSelect value={data.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option value="MEN">Male</option>
                    <option value="WOMEN">Female</option>
                    <option value="UNISEX">Unisex</option>
                  </StyledSelect>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Material Code</label>
                  <SearchSelect
                    value={data.materialCode}
                    onChange={(val) => set('materialCode', val)}
                    items={materials}
                    getLabel={(m) => `${m.materialCode} — ${m.displayName}`}
                    getSearchString={(m) => `${m.materialCode} ${m.displayName}`}
                    getId={(m) => m.materialCode}
                    placeholder="Select Material"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Color Code</label>
                  <SearchSelect
                    value={data.colorCode}
                    onChange={(val) => set('colorCode', val)}
                    items={colors}
                    getLabel={(c) => `${c.colorCode} — ${c.displayName}`}
                    getSearchString={(c) => `${c.colorCode} ${c.displayName}`}
                    getId={(c) => c.colorCode}
                    placeholder="Select Color"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Pattern Finish Code</label>
                  <SearchSelect
                    value={data.patternFinishCode}
                    onChange={(val) => set('patternFinishCode', val)}
                    items={patterns}
                    getLabel={(p) => `${p.patternCode} — ${p.displayName}`}
                    getSearchString={(p) => `${p.patternCode} ${p.displayName}`}
                    getId={(p) => p.patternCode}
                    placeholder="Select Pattern Finish"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Edition Code</label>
                  <SearchSelect
                    value={data.editionCode}
                    onChange={(val) => set('editionCode', val)}
                    items={editions}
                    getLabel={(e) => `${e.editionCode} — ${e.displayName}`}
                    getSearchString={(e) => `${e.editionCode} ${e.displayName}`}
                    getId={(e) => e.editionCode}
                    placeholder="Select Edition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* COMBO PRODUCTS TAB */}
          {activeTab === 'combo' && data.productType === 'grouped' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Add products to this combo bundle</p>
                <button type="button" onClick={() => setShowComboModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus size={13} /> Add Product
                </button>
              </div>
              {data.comboProducts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  No products added yet. Click "Add Product" to start building your combo.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">Product Name</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 w-28">Quantity</th>
                      <th className="py-2 px-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.comboProducts.map((cp) => (
                      <tr key={cp.componentProductId} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{cp.name}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            value={cp.quantity}
                            onChange={(e) => updateComboQty(cp.componentProductId, Number(e.target.value))}
                            className={`${inputCls} w-20`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <button type="button" onClick={() => removeComboProduct(cp.componentProductId)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ALTERNATE TAB */}
          {activeTab === 'alternate' && (
            <div>
              {!productId ? (
                <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/10 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">
                  <p className="text-sm font-semibold text-slate-650 dark:text-slate-300">
                    Alternate products can only be configured after the product has been created.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-455 mt-1">
                    Please publish/save the product first.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Alternate Products</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage alternative or substitute products. Change priority using move controls.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAlternateModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Plus size={14} /> Add Alternate Product
                    </button>
                  </div>

                  {loadingAlternates ? (
                    <div className="py-8 text-center text-xs text-slate-500">Loading alternate products...</div>
                  ) : alternates.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      No alternate products added yet. Click "Add Alternate Product" to configure.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-750 rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Product ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Product Name</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 w-24">Priority</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 w-32">Move</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                          {alternates.map((alt, idx) => {
                            const name = availableProducts.find((p) => p.id === alt.alternateProductId)?.name || `Product #${alt.alternateProductId}`;
                            return (
                              <tr key={alt.alternateId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                <td className="px-4 py-3 text-xs font-mono font-bold text-slate-650 dark:text-slate-350">
                                  #{alt.alternateProductId}
                                </td>
                                <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {name}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono font-bold text-center text-slate-700 dark:text-slate-300">
                                  {alt.priority}
                                </td>
                                <td className="px-4 py-3 text-xs text-center">
                                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-850 p-0.5 bg-slate-50 dark:bg-slate-900/50">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => moveAlternatePriority(idx, 'up')}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                      title="Move Up"
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                    <div className="w-px bg-slate-200 dark:bg-slate-850 mx-0.5" />
                                    <button
                                      type="button"
                                      disabled={idx === alternates.length - 1}
                                      onClick={() => moveAlternatePriority(idx, 'down')}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                      title="Move Down"
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-xs">
                                  <button
                                    type="button"
                                    onClick={() => removeAlternateProduct(alt.alternateId)}
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Delete Alternate"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && (
            <div>
              <Field label="Warranty Code" hint="Select warranty type for this product">
                <div className="flex gap-2">
                  <SearchSelect
                    value={data.selectedWarranty}
                    onChange={(val) => set('selectedWarranty', val)}
                    items={warranties}
                    getLabel={(w) => `${w.warrantyCode} - ${w.displayName}`}
                    getSearchString={(w) => `${w.warrantyCode} ${w.displayName}`}
                    getId={(w) => w.warrantyCode}
                    placeholder="Select Warranty"
                  />
                  <button type="button" onClick={() => setShowWarrantyCreate(true)} className="flex items-center gap-1 px-3 h-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
              </Field>
              <Field label="Handling Code" hint="Select handling type for this product">
                <div className="flex gap-2">
                  <SearchSelect
                    value={data.selectedHandling}
                    onChange={(val) => set('selectedHandling', val)}
                    items={handlingCodes}
                    getLabel={(h) => `${h.handlingCode} - ${h.displayName}`}
                    getSearchString={(h) => `${h.handlingCode} ${h.displayName}`}
                    getId={(h) => h.handlingCode}
                    placeholder="Select Handling Code"
                  />
                  <button type="button" onClick={() => setShowHandlingCreate(true)} className="flex items-center gap-1 px-3 h-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
              </Field>
              <Field label="Split Shipment" hint="Enable if product can be split across multiple shipments">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set('isSplit', !data.isSplit)} className={toggleCls(data.isSplit)}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${data.isSplit ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Allow split shipment</span>
                </div>
              </Field>
              {data.isSplit && (
                <Field label="Split Quantity">
                  <StyledInput type="number" min="0" placeholder="0" value={data.splitQuantity} onChange={(e) => set('splitQuantity', e.target.value)} />
                </Field>
              )}
              <Field label="Surface Quantity" hint="Number of surfaces or units">
                <StyledInput type="number" min="1" placeholder="1" value={data.surfaceQuantity} onChange={(e) => set('surfaceQuantity', e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* HSN Create Modal */}
      {showHsnCreate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add HSN Code</span>
              <button type="button" onClick={() => setShowHsnCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">HSN Code *</label>
                <input type="text" value={hsnForm.code} onChange={(e) => setHsnForm({ ...hsnForm, code: e.target.value })} placeholder="e.g. HSNNEW11" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <input type="text" value={hsnForm.description} onChange={(e) => setHsnForm({ ...hsnForm, description: e.target.value })} placeholder="Description" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tax Percentage *</label>
                <input type="number" value={hsnForm.gstRate} onChange={(e) => setHsnForm({ ...hsnForm, gstRate: e.target.value })} placeholder="e.g. 18" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Effective From *</label>
                <input type="date" value={hsnForm.effectiveFrom} onChange={(e) => setHsnForm({ ...hsnForm, effectiveFrom: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowHsnCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={addHsn} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Create Modal */}
      {showWarrantyCreate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Warranty</span>
              <button type="button" onClick={() => setShowWarrantyCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <input type="text" value={warrantyForm.warrantyCode} onChange={(e) => setWarrantyForm({ ...warrantyForm, warrantyCode: e.target.value })} placeholder="Warranty Code" className={inputCls} />
              <input type="text" value={warrantyForm.displayName} onChange={(e) => setWarrantyForm({ ...warrantyForm, displayName: e.target.value })} placeholder="Display Name" className={inputCls} />
              <textarea value={warrantyForm.description} onChange={(e) => setWarrantyForm({ ...warrantyForm, description: e.target.value })} placeholder="Description" rows={3} className={`${inputCls} h-auto py-2 resize-none`} />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowWarrantyCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={addWarranty} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Handling Create Modal */}
      {showHandlingCreate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Handling Code</span>
              <button type="button" onClick={() => setShowHandlingCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <input type="text" value={handlingForm.handlingCode} onChange={(e) => setHandlingForm({ ...handlingForm, handlingCode: e.target.value })} placeholder="Handling Code" className={inputCls} />
              <input type="text" value={handlingForm.displayName} onChange={(e) => setHandlingForm({ ...handlingForm, displayName: e.target.value })} placeholder="Display Name" className={inputCls} />
              <textarea value={handlingForm.description} onChange={(e) => setHandlingForm({ ...handlingForm, description: e.target.value })} placeholder="Description" rows={3} className={`${inputCls} h-auto py-2 resize-none`} />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowHandlingCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={addHandling} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Combo Add Modal */}
      {showComboModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-t-xl">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Product to Combo</span>
              <button type="button" onClick={() => setShowComboModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <SearchSelect
                value={comboModalProductId}
                onChange={setComboModalProductId}
                items={availableProducts.filter((p) => !data.comboProducts.find((c) => c.componentProductId === p.id))}
                getLabel={(p) => p.name}
                getSearchString={(p) => p.name}
                getId={(p) => String(p.id)}
                placeholder="Select a product"
              />
              <input type="number" min="1" value={comboModalQuantity} onChange={(e) => setComboModalQuantity(Number(e.target.value))} placeholder="Quantity" className={inputCls} />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowComboModal(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={addComboProduct} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Alternate Add Modal */}
      {showAlternateModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-t-xl">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Alternate Product</span>
              <button
                type="button"
                onClick={() => setShowAlternateModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Select Alternate Product *</label>
              <SearchSelect
                value={alternateModalProductId}
                onChange={setAlternateModalProductId}
                items={availableProducts.filter(
                  (p) =>
                    p.id !== Number(productId) &&
                    !alternates.some((a) => a.alternateProductId === p.id)
                )}
                getLabel={(p) => p.name}
                getSearchString={(p) => p.name}
                getId={(p) => String(p.id)}
                placeholder="Select a product"
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAlternateModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addAlternateProduct}
                disabled={!alternateModalProductId}
                className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKU Create Modal */}
      {showSkuModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {editingSkuId ? 'Edit Product SKU' : 'Add Product SKU'}
              </span>
              <button
                type="button"
                onClick={() => setShowSkuModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">SKU Code *</label>
                <input
                  type="text"
                  value={skuForm.skuCode}
                  onChange={(e) => setSkuForm({ ...skuForm, skuCode: e.target.value })}
                  placeholder="e.g. TES-TES-YUV-001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={skuForm.price}
                  onChange={(e) => setSkuForm({ ...skuForm, price: e.target.value })}
                  placeholder="e.g. 0.1"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Color Attribute</label>
                <input
                  type="text"
                  value={skuForm.attributes.color}
                  onChange={(e) => setSkuForm({
                    ...skuForm,
                    attributes: { ...skuForm.attributes, color: e.target.value }
                  })}
                  placeholder="e.g. black"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Size Attribute</label>
                <input
                  type="text"
                  value={skuForm.attributes.size}
                  onChange={(e) => setSkuForm({
                    ...skuForm,
                    attributes: { ...skuForm.attributes, size: e.target.value }
                  })}
                  placeholder="e.g. 128GB"
                  className={inputCls}
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultSku"
                  checked={skuForm.isDefault}
                  onChange={(e) => setSkuForm({ ...skuForm, isDefault: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-transparent"
                />
                <label htmlFor="isDefaultSku" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  Set as Default SKU for this product
                </label>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSkuModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSku}
                className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingSkuId ? 'Save Changes' : 'Add SKU'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
