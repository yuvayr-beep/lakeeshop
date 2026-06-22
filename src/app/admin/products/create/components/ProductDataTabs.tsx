'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign, Package, Truck, Link2, Sliders, Settings2,
  Plus, X, ChevronDown, Trash2,
} from 'lucide-react';
import { SearchSelect } from './ProductSidebar';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

type Tab = 'general' | 'inventory' | 'shipping' | 'linked' | 'attributes' | 'combo' | 'advanced';

const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'general', label: 'General', icon: <DollarSign size={15} />, desc: 'Pricing & tax' },
  { id: 'inventory', label: 'Inventory', icon: <Package size={15} />, desc: 'Stock & SKU' },
  { id: 'shipping', label: 'Shipping', icon: <Truck size={15} />, desc: 'Weight & dims' },
  { id: 'linked', label: 'Linked Products', icon: <Link2 size={15} />, desc: 'Upsells & cross-sells' },
  { id: 'attributes', label: 'Attributes', icon: <Sliders size={15} />, desc: 'Variants & specs' },
  { id: 'combo', label: 'Combo Products', icon: <Package size={15} />, desc: 'Bundle components' },
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



export default function ProductDataTabs({ data, onChange, hideLinkedProducts }: ProductDataTabsProps) {
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
                <StyledInput placeholder="e.g. TPH-SPH-OTH-0001" value={data.sku} onChange={(e) => set('sku', e.target.value)} />
              </Field>
              {/* <Field label="Manage Stock">
                <button type="button" onClick={() => set('manageStock', !data.manageStock)} className={toggleCls(data.manageStock)}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${data.manageStock ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </Field>
              {data.manageStock ? (
                <>
                  <Field label="Stock Quantity">
                    <StyledInput type="number" min="0" placeholder="0" value={data.stockQty} onChange={(e) => set('stockQty', e.target.value)} />
                  </Field>
                  <Field label="Allow Backorders">
                    <StyledSelect value={data.allowBackorders} onChange={(e) => set('allowBackorders', e.target.value)}>
                      <option value="no">Do not allow</option>
                      <option value="notify">Allow, but notify customer</option>
                      <option value="yes">Allow</option>
                    </StyledSelect>
                  </Field>
                  <Field label="Low Stock Threshold">
                    <StyledInput type="number" min="0" placeholder="0" value={data.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} />
                  </Field>
                </>
              ) : (
                <Field label="Stock Status">
                  <StyledSelect value={data.stockStatus} onChange={(e) => set('stockStatus', e.target.value)}>
                    <option value="instock">In stock</option>
                    <option value="outofstock">Out of stock</option>
                    <option value="onbackorder">On backorder</option>
                  </StyledSelect>
                </Field>
              )}
              <Field label="Sold Individually" hint="Limit purchases to 1 per order">
                <button type="button" onClick={() => set('soldIndividually', !data.soldIndividually)} className={toggleCls(data.soldIndividually)}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${data.soldIndividually ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </Field> */}
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
    </div>
  );
}
