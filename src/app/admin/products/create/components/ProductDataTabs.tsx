'use client';
import React, { useState, useEffect } from 'react';
import {
  DollarSign, Package, Truck, Link2, Sliders, Settings2,
  Plus, X, ChevronDown, Trash2,
} from 'lucide-react';

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
    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-1 items-start py-4 border-b border-slate-200 dark:border-slate-700/60 last:border-b-0">
      <div className="pt-2.5">
        <p className="text-sm text-slate-700 dark:text-slate-300">{label}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="pt-1.5">{children}</div>
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-9 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 ${props.className ?? ''}`}
    />
  );
}

function StyledSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full h-9 px-3 pr-8 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 appearance-none"
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

export interface ProductDataState {
  // General
  mrp: string;
  costPrice: string;
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
}

export const defaultProductDataState: ProductDataState = {
  mrp: '',
  costPrice: '',
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
  selectedWarranty: '1',
  selectedHandling: '1',
  isSplit: false,
  splitQuantity: '',
  surfaceQuantity: '1',
  comboProducts: [],
  productType: 'simple',
  externalProduct: false,
};

export default function ProductDataTabs({ data, onChange }: ProductDataTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [showHsnCreate, setShowHsnCreate] = useState(false);
  const [hsnForm, setHsnForm] = useState({ code: '', description: '', gstRate: '' });
  const [hsnCodes, setHsnCodes] = useState([
    { id: 1, code: 'HSN001', description: 'General goods', gstRate: '5' },
    { id: 2, code: '6109', description: 'T-shirts, singlets and vests', gstRate: '5' },
    { id: 3, code: '8517', description: 'Telephone and network equipment', gstRate: '18' },
  ]);
  const [warranties, setWarranties] = useState([
    { warrantyTypeId: 1, warrantyCode: 'WAR1', displayName: 'Warranty 1' },
    { warrantyTypeId: 2, warrantyCode: 'WAR2', displayName: 'Warranty 2' },
  ]);
  const [showWarrantyCreate, setShowWarrantyCreate] = useState(false);
  const [warrantyForm, setWarrantyForm] = useState({ warrantyCode: '', displayName: '', description: '' });
  const [handlingCodes, setHandlingCodes] = useState([
    { handlingTypeId: 1, handlingCode: 'TESTH1', displayName: 'Test Handling Code' },
    { handlingTypeId: 2, handlingCode: 'TESTH2', displayName: 'Test Handling Code 2' },
  ]);
  const [showHandlingCreate, setShowHandlingCreate] = useState(false);
  const [handlingForm, setHandlingForm] = useState({ handlingCode: '', displayName: '', description: '' });
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboModalProductId, setComboModalProductId] = useState('');
  const [comboModalQuantity, setComboModalQuantity] = useState(1);
  const [availableProducts] = useState([
    { id: 6, name: 'Test Product 2' },
    { id: 12, name: 'Test Product 3' },
    { id: 15, name: 'Product A' },
    { id: 20, name: 'Product B' },
  ]);

  const set = (key: keyof ProductDataState, value: unknown) => onChange({ ...data, [key]: value });

  useEffect(() => {
    if (activeTab === 'combo' && data.productType !== 'grouped') {
      setActiveTab('general');
    }
  }, [data.productType, activeTab]);

  const visibleTabs = TABS.filter((t) => t.id !== 'combo' || data.productType === 'grouped');

  const addHsn = () => {
    if (!hsnForm.code.trim()) return;
    const newId = hsnCodes.length + 1;
    setHsnCodes([...hsnCodes, { id: newId, code: hsnForm.code, description: hsnForm.description, gstRate: hsnForm.gstRate }]);
    set('selectedHsn', String(newId));
    setHsnForm({ code: '', description: '', gstRate: '' });
    setShowHsnCreate(false);
  };

  const addWarranty = () => {
    if (!warrantyForm.warrantyCode.trim()) return;
    const newId = warranties.length + 1;
    setWarranties([...warranties, { warrantyTypeId: newId, warrantyCode: warrantyForm.warrantyCode, displayName: warrantyForm.displayName }]);
    set('selectedWarranty', String(newId));
    setWarrantyForm({ warrantyCode: '', displayName: '', description: '' });
    setShowWarrantyCreate(false);
  };

  const addHandling = () => {
    if (!handlingForm.handlingCode.trim()) return;
    const newId = handlingCodes.length + 1;
    setHandlingCodes([...handlingCodes, { handlingTypeId: newId, handlingCode: handlingForm.handlingCode, displayName: handlingForm.displayName }]);
    set('selectedHandling', String(newId));
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

  const inputCls = 'w-full h-9 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400';
  const toggleCls = (active: boolean) => `relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
      {/* Type bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">TYPE</span>
        <div className="relative">
          <select
            value={data.productType}
            onChange={(e) => set('productType', e.target.value as 'simple' | 'grouped')}
            className="h-8 pl-3 pr-8 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 appearance-none"
          >
            <option value="simple">Single product</option>
            <option value="grouped">Combo product</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {data.productType === 'grouped' && (
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
        )}
      </div>

      <div className="flex">
        {/* Tab sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/30">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-200 dark:border-slate-700/60 last:border-b-0 ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-r-2 border-r-indigo-600' :'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>{tab.icon}</span>
              <div>
                <div className="text-xs font-medium">{tab.label}</div>
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
              <Field label="MRP" hint="Base selling price in INR">
                <StyledInput type="number" placeholder="0.00" value={data.mrp} onChange={(e) => set('mrp', e.target.value)} />
              </Field>
              <Field label="Cost Price" hint="Your purchase cost">
                <div className="space-y-2">
                  <StyledInput type="number" placeholder="0.00" value={data.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button type="button" onClick={() => set('saleSchedule', !data.saleSchedule)} className={toggleCls(data.saleSchedule)}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${data.saleSchedule ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Schedule sale</span>
                  </label>
                  {data.saleSchedule && (
                    <div className="grid grid-cols-2 gap-2">
                      <StyledInput type="date" value={data.saleFrom} onChange={(e) => set('saleFrom', e.target.value)} />
                      <StyledInput type="date" value={data.saleTo} onChange={(e) => set('saleTo', e.target.value)} />
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Model Name">
                <StyledInput placeholder="e.g. TestMode4" value={data.modelName} onChange={(e) => set('modelName', e.target.value)} />
              </Field>
              <Field label="Model Number">
                <StyledInput placeholder="e.g. HK00019C" value={data.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} />
              </Field>
              <Field label="HSN Code" hint="Harmonized System Nomenclature">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <StyledSelect value={data.selectedHsn} onChange={(e) => set('selectedHsn', e.target.value)}>
                      {hsnCodes.map((h) => (
                        <option key={h.id} value={h.id}>{h.code} — {h.description}</option>
                      ))}
                    </StyledSelect>
                  </div>
                  <button type="button" onClick={() => setShowHsnCreate(true)} className="flex items-center gap-1 px-3 h-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus size={13} /> Add
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
              <Field label="Manage Stock">
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
              </Field>
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
                  <option value="DP">Direct Parcel (DP)</option>
                  <option value="Surface">Surface</option>
                  <option value="Air">Air</option>
                  <option value="Express">Express</option>
                  <option value="Cold Chain">Cold Chain</option>
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
                  <StyledInput placeholder="e.g. MAT007" value={data.materialCode} onChange={(e) => set('materialCode', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Color Code</label>
                  <StyledInput placeholder="e.g. RED" value={data.colorCode} onChange={(e) => set('colorCode', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Pattern Finish Code</label>
                  <StyledInput placeholder="e.g. PAT" value={data.patternFinishCode} onChange={(e) => set('patternFinishCode', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Edition Code</label>
                  <StyledInput placeholder="e.g. STT" value={data.editionCode} onChange={(e) => set('editionCode', e.target.value)} />
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
                  <div className="flex-1">
                    <StyledSelect value={data.selectedWarranty} onChange={(e) => set('selectedWarranty', e.target.value)}>
                      {warranties.map((w) => (
                        <option key={w.warrantyTypeId} value={w.warrantyTypeId}>{w.warrantyCode} - {w.displayName}</option>
                      ))}
                    </StyledSelect>
                  </div>
                  <button type="button" onClick={() => setShowWarrantyCreate(true)} className="flex items-center gap-1 px-3 h-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
              </Field>
              <Field label="Handling Code" hint="Select handling type for this product">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <StyledSelect value={data.selectedHandling} onChange={(e) => set('selectedHandling', e.target.value)}>
                      {handlingCodes.map((h) => (
                        <option key={h.handlingTypeId} value={h.handlingTypeId}>{h.handlingCode} - {h.displayName}</option>
                      ))}
                    </StyledSelect>
                  </div>
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
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add HSN Code</span>
              <button type="button" onClick={() => setShowHsnCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <input type="text" value={hsnForm.code} onChange={(e) => setHsnForm({ ...hsnForm, code: e.target.value })} placeholder="HSN Code" className={inputCls} />
              <input type="text" value={hsnForm.description} onChange={(e) => setHsnForm({ ...hsnForm, description: e.target.value })} placeholder="Description" className={inputCls} />
              <input type="text" value={hsnForm.gstRate} onChange={(e) => setHsnForm({ ...hsnForm, gstRate: e.target.value })} placeholder="GST Rate (%)" className={inputCls} />
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
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Product to Combo</span>
              <button type="button" onClick={() => setShowComboModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <select value={comboModalProductId} onChange={(e) => setComboModalProductId(e.target.value)} className={`${inputCls} pr-8 appearance-none`}>
                  <option value="">Select a product</option>
                  {availableProducts.filter((p) => !data.comboProducts.find((c) => c.componentProductId === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
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
