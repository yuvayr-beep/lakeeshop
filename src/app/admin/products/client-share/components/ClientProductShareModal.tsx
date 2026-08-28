'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, Sparkles, Search } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Client {
  id: number;
  clientCode: string;
  clientName: string;
  logoUrl?: string;
  businessUnits?: Array<{ id: number; buCode?: string; buName?: string }>;
}

interface Product {
  id: number;
  baseProductName: string;
  defaultSku: string;
  productTypeId: number;
}

interface Sku {
  skuId: number;
  skuCode: string;
  price: number;
}

interface ClientProductShareModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  share?: any | null; // Selected share object for edit mode
  currentClientId?: number | null; // Passed to pre-populate client
  clientsList?: Client[]; // Passed down to avoid duplicate loading
}

const parseNdjson = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return [data];
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return line;
          }
        });
    }
  }
  return [];
};

export default function ClientProductShareModal({
  open,
  onClose,
  onSuccess,
  share,
  currentClientId,
  clientsList = [],
}: ClientProductShareModalProps) {
  const isEdit = !!share;
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // General lists
  const [clients, setClients] = useState<Client[]>(clientsList);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);

  // Loading states
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search queries for dropdowns
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Form states matching full API parameter specification
  const [clientId, setClientId] = useState<string>('');
  const [businessUnitId, setBusinessUnitId] = useState<number>(0);
  const [productId, setProductId] = useState<string>('');
  const [skuId, setSkuId] = useState<string>('');
  const [priceTypeId, setPriceTypeId] = useState<number>(0);
  const [clientSkuCode, setClientSkuCode] = useState('');
  const [minQty, setMinQty] = useState<number>(1);
  const [bufferStock, setBufferStock] = useState<number>(0);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [shippingPrice, setShippingPrice] = useState<number>(0);
  const [taxPrice, setTaxPrice] = useState<number>(0);
  const [customerDiscount, setCustomerDiscount] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [transferPrice, setTransferPrice] = useState<number>(0);
  const [courierPrice, setCourierPrice] = useState<number>(0);
  const [lakeePrice, setLakeePrice] = useState<number>(0);
  const [lakeeCourierPrice, setLakeeCourierPrice] = useState<number>(0);
  const [commissionPercent, setCommissionPercent] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [isListed, setIsListed] = useState<boolean>(true);
  const [isFeatured, setIsFeatured] = useState<boolean>(true);

  // Helper: Format date to YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync passed client list or fetch clients
  useEffect(() => {
    if (clientsList && clientsList.length > 0) {
      setClients(clientsList);
    } else if (open) {
      setLoadingClients(true);
      axiosInstance
        .get('/client', { headers: { Accept: 'application/x-ndjson' } })
        .then(({ data }) => {
          const parsed = parseNdjson(data) as Client[];
          setClients(parsed);
        })
        .catch((err) => console.error('Failed to load clients:', err))
        .finally(() => setLoadingClients(false));
    }
  }, [open, clientsList]);

  // Initial fetch of product catalog so dropdown has options right away
  useEffect(() => {
    if (open) {
      setLoadingProducts(true);
      axiosInstance
        .get('/prod/products', {
          headers: { Accept: 'application/x-ndjson, application/json, */*' },
          responseType: 'text',
          transformResponse: [(data) => data],
        })
        .then(({ data }) => {
          const parsed = parseNdjson(data) as Product[];
          setInitialProducts(parsed);
          setProducts(parsed);
        })
        .catch((err) => console.warn('Failed to load initial products:', err))
        .finally(() => setLoadingProducts(false));
    }
  }, [open]);

  // Handle product search as query
  useEffect(() => {
    if (!open) return;
    const q = productSearch.trim().toLowerCase();

    if (!q) {
      setProducts(initialProducts);
      return;
    }

    // 1. Filter initial products locally for instant UX
    const localMatches = initialProducts.filter((p) => {
      const nameMatch = p.baseProductName && p.baseProductName.toLowerCase().includes(q);
      const skuMatch = p.defaultSku && p.defaultSku.toLowerCase().includes(q);
      return nameMatch || skuMatch;
    });
    setProducts(localMatches);

    // 2. Fetch live search from backend for any extended SKU/Name matches
    const delayDebounce = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const [bySkuRes, byNameRes] = await Promise.allSettled([
          axiosInstance.get(`/prod/products?sku=${encodeURIComponent(productSearch.trim())}`, {
            headers: { Accept: 'application/x-ndjson, application/json, */*' },
            responseType: 'text',
            transformResponse: [(data) => data],
          }),
          axiosInstance.get(`/prod/products?name=${encodeURIComponent(productSearch.trim())}`, {
            headers: { Accept: 'application/x-ndjson, application/json, */*' },
            responseType: 'text',
            transformResponse: [(data) => data],
          }),
        ]);

        let fetchedProducts: Product[] = [];
        if (bySkuRes.status === 'fulfilled') {
          fetchedProducts.push(...(parseNdjson(bySkuRes.value.data) as Product[]));
        }
        if (byNameRes.status === 'fulfilled') {
          fetchedProducts.push(...(parseNdjson(byNameRes.value.data) as Product[]));
        }

        const map = new Map<number, Product>();
        [...localMatches, ...fetchedProducts].forEach((p) => {
          if (p && p.id) map.set(Number(p.id), p);
        });

        setProducts(Array.from(map.values()));
      } catch (err) {
        console.error('Failed to search products:', err);
      } finally {
        setLoadingProducts(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [productSearch, open, initialProducts]);

  // Fetch SKUs once product changes
  useEffect(() => {
    if (!productId || productId === '') {
      setSkus([]);
      return;
    }
    setLoadingSkus(true);
    axiosInstance
      .get(`/prod/sku/product/${productId}`, {
        headers: { Accept: 'application/x-ndjson, application/json, */*' },
        responseType: 'text',
        transformResponse: [(data) => data],
      })
      .then(({ data }) => {
        const parsed = parseNdjson(data) as Sku[];
        setSkus(parsed);
        if (parsed.length > 0 && !isEdit) {
          setSkuId(String(parsed[0].skuId));
          setClientSkuCode(parsed[0].skuCode);
        }
      })
      .catch((err) => {
        console.error('Failed to load skus:', err);
        setSkus([]);
      })
      .finally(() => setLoadingSkus(false));
  }, [productId, isEdit]);

  // Load share details if in Edit mode, else defaults
  useEffect(() => {
    if (open) {
      if (share) {
        setClientId(String(share.clientId ?? ''));
        setBusinessUnitId(share.businessUnitId ?? 0);
        setProductId(String(share.productId ?? ''));
        setSkuId(String(share.skuId ?? ''));
        setPriceTypeId(share.priceTypeId ?? 0);
        setClientSkuCode(share.clientSkuCode || '');
        setMinQty(share.minQty ?? 1);
        setBufferStock(share.bufferStock ?? 0);
        setLeadTimeDays(share.leadTimeDays ?? 0);
        setBasePrice(share.basePrice ?? 0);
        setShippingPrice(share.shippingPrice ?? 0);
        setTaxPrice(share.taxPrice ?? 0);
        setCustomerDiscount(share.customerDiscount ?? 0);
        setSellingPrice(share.sellingPrice ?? 0);
        setTransferPrice(share.transferPrice ?? 0);
        setCourierPrice(share.courierPrice ?? 0);
        setLakeePrice(share.lakeePrice ?? 0);
        setLakeeCourierPrice(share.lakeeCourierPrice ?? 0);
        setCommissionPercent(share.commissionPercent ?? 0);
        setDiscountPercent(share.discountPercent ?? 0);
        setValidFrom(share.validFrom ? share.validFrom.split('T')[0] : getTodayString());
        setValidTo(share.validTo ? share.validTo.split('T')[0] : getTodayString());
        setIsListed(share.isListed ?? true);
        setIsFeatured(share.isFeatured ?? true);

        if (share.productId) {
          axiosInstance.get(`/prod/products/${share.productId}`)
            .then(({ data }) => {
              if (data?.success && data?.data) {
                setProductSearch(data.data.baseProductName || '');
              } else if (data && data.baseProductName) {
                setProductSearch(data.baseProductName);
              }
            })
            .catch(() => {});
        }
      } else {
        const cId = currentClientId ? String(currentClientId) : '';
        setClientId(cId);
        const selClient = (clientsList || clients || []).find((c) => String(c.id) === cId);
        if (selClient && selClient.businessUnits && selClient.businessUnits.length > 0) {
          setBusinessUnitId(selClient.businessUnits[0].id);
        } else {
          setBusinessUnitId(0);
        }
        setProductId('');
        setSkuId('');
        setPriceTypeId(0);
        setClientSkuCode('');
        setMinQty(1);
        setBufferStock(0);
        setLeadTimeDays(0);
        setBasePrice(0);
        setShippingPrice(0);
        setTaxPrice(0);
        setCustomerDiscount(0);
        setSellingPrice(0);
        setTransferPrice(0);
        setCourierPrice(0);
        setLakeePrice(0);
        setLakeeCourierPrice(0);
        setCommissionPercent(0);
        setDiscountPercent(0);
        setValidFrom(getTodayString());
        setValidTo(getTodayString());
        setIsListed(true);
        setIsFeatured(true);
        setProductSearch('');
      }
    }
  }, [open, share, currentClientId, clientsList, clients]);

  // Auto-populate priceTypeId, clientSkuCode on product select
  const handleProductSelect = (prod: Product) => {
    setProductId(String(prod.id));
    setProductSearch(prod.baseProductName);
    setPriceTypeId(prod.productTypeId || 0);
    setClientSkuCode(prod.defaultSku || '');
    setShowProductDropdown(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      toast.error('Client is required');
      return;
    }
    if (!productId) {
      toast.error('Product is required');
      return;
    }
    if (!skuId) {
      toast.error('SKU is required');
      return;
    }

    const expectedTransferPrice = Number((Number(sellingPrice) + Number(courierPrice)).toFixed(2));
    const actualTransferPrice = Number(transferPrice);
    if (Math.abs(actualTransferPrice - expectedTransferPrice) > 0.01) {
      toast.error(`Transfer Price must equal Selling Price + Courier Price. Got: ${actualTransferPrice}, expected: ${expectedTransferPrice}`);
      return;
    }

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating client product share...' : 'Creating client product share...');

    // Full payload structure matching exact parameter specification
    const payload = {
      clientId: Number(clientId),
      businessUnitId: Number(businessUnitId),
      productId: Number(productId),
      skuId: Number(skuId),
      priceTypeId: Number(priceTypeId) || 0,
      clientSkuCode: clientSkuCode.trim() || undefined,
      minQty: Number(minQty),
      bufferStock: Number(bufferStock),
      leadTimeDays: Number(leadTimeDays),
      basePrice: Number(basePrice),
      shippingPrice: Number(shippingPrice),
      taxPrice: Number(taxPrice),
      customerDiscount: Number(customerDiscount),
      sellingPrice: Number(sellingPrice),
      transferPrice: Number(transferPrice),
      courierPrice: Number(courierPrice),
      lakeePrice: Number(lakeePrice),
      lakeeCourierPrice: Number(lakeeCourierPrice),
      commissionPercent: Number(commissionPercent),
      discountPercent: Number(discountPercent),
      validFrom: validFrom,
      validTo: validTo,
      isListed: isListed,
      isFeatured: isFeatured,
    };

    console.log('=== CLIENT PRODUCT SHARE SUBMIT REQUEST ===');
    console.log('URL:', isEdit && share ? `/prod/client-product-share/${share.clientShareId}` : '/prod/client-product-share');
    console.log('Method:', isEdit && share ? 'PUT' : 'POST');
    console.log('Request Body:', payload);
    console.log('Request Body JSON:', JSON.stringify(payload, null, 2));

    try {
      let res;
      if (isEdit && share) {
        res = await axiosInstance.put(`/prod/client-product-share/${share.clientShareId}`, payload);
      } else {
        res = await axiosInstance.post('/prod/client-product-share', payload);
      }
      console.log('=== CLIENT PRODUCT SHARE SUBMIT RESPONSE SUCCESS ===');
      console.log('Response Status:', res.status);
      console.log('Response Body:', res.data);
      toast.success(isEdit ? 'Product Share updated successfully!' : 'Product Share created successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('=== CLIENT PRODUCT SHARE SUBMIT RESPONSE ERROR ===');
      console.error('Error Status:', err.response?.status);
      console.error('Error Response Body:', err.response?.data);
      console.error('Full Error Object:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Action failed. Please verify the details.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {isEdit ? 'Edit Client Share' : 'Create Client Share'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? `Modifying Share ID: ${share?.clientShareId}` : 'Share a product SKU with a client and define custom pricing & logistics parameters'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Identification */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
              1. Product Identification
            </h3>
            {/* Hidden Fields for Client ID, Business Unit ID, and Price Type ID */}
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="businessUnitId" value={businessUnitId} />
            <input type="hidden" name="priceTypeId" value={priceTypeId} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Product ID (Search Autocomplete Input) */}
              <div className="relative md:col-span-2" ref={productDropdownRef}>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Search & Select Product <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required={!productId}
                    placeholder="Type name or SKU to search products..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                      if (productId) setProductId('');
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
                  />
                  {loadingProducts && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
                  )}
                </div>

                {/* Dropdown Options */}
                {showProductDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingProducts && products.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 size={15} className="animate-spin text-blue-500" />
                        Searching product catalog...
                      </div>
                    ) : products.length > 0 ? (
                      products.map((prod) => (
                        <button
                          key={`prod-opt-${prod.id}`}
                          type="button"
                          onClick={() => handleProductSelect(prod)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 truncate flex flex-col gap-0.5 transition-colors"
                        >
                          <p className="font-semibold text-slate-800 dark:text-slate-100">{prod.baseProductName}</p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">SKU: {prod.defaultSku}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No products found matching &quot;{productSearch}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SKU Selection (fetched based on ProductId) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={loadingSkus || !productId}
                  value={skuId}
                  onChange={(e) => {
                    setSkuId(e.target.value);
                    const selected = skus.find((s) => String(s.skuId) === e.target.value);
                    if (selected) {
                      setClientSkuCode(selected.skuCode);
                    }
                  }}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200"
                >
                  <option value="">{loadingSkus ? 'Fetching SKUs...' : !productId ? 'Select Product First' : 'Select SKU'}</option>
                  {skus.map((s) => (
                    <option key={`sku-opt-${s.skuId}`} value={s.skuId}>
                      {s.skuCode} {s.price ? `(Price: ${s.price})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client SKU Code */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client SKU Code <span className="text-slate-400 font-normal">(Change if different)</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientSkuCode}
                  onChange={(e) => setClientSkuCode(e.target.value)}
                  placeholder="e.g. APR-ACS-FSJ-0001"
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Logistics & Settings */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
              2. Quantities & Logistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min Qty
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={minQty}
                  onChange={(e) => setMinQty(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Buffer Stock
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={bufferStock}
                  onChange={(e) => setBufferStock(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing & Discounts */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
              3. Pricing Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Base Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shipping Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={shippingPrice}
                  onChange={(e) => setShippingPrice(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tax Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxPrice}
                  onChange={(e) => setTaxPrice(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Discount
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={customerDiscount}
                  onChange={(e) => setCustomerDiscount(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => {
                    const sp = Number(e.target.value);
                    setSellingPrice(sp);
                    setTransferPrice(Number((sp + courierPrice).toFixed(2)));
                  }}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transferPrice}
                  onChange={(e) => setTransferPrice(Number(e.target.value))}
                  className={`w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border rounded-xl focus:outline-none focus:ring-2 text-slate-800 dark:text-slate-100 ${
                    Math.abs(Number(transferPrice) - (Number(sellingPrice) + Number(courierPrice))) > 0.01
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500/20'
                  }`}
                />
                {Math.abs(Number(transferPrice) - (Number(sellingPrice) + Number(courierPrice))) > 0.01 && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 font-semibold leading-tight">
                    Transfer Price must equal Selling Price + Courier Price. Got: {transferPrice}, expected: {Number((Number(sellingPrice) + Number(courierPrice)).toFixed(2))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Courier Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={courierPrice}
                  onChange={(e) => {
                    const cp = Number(e.target.value);
                    setCourierPrice(cp);
                    setTransferPrice(Number((sellingPrice + cp).toFixed(2)));
                  }}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lakee Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={lakeePrice}
                  onChange={(e) => setLakeePrice(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lakee Courier Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={lakeeCourierPrice}
                  onChange={(e) => setLakeeCourierPrice(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commission (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Validity & Visibility */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
              4. Validity Period & Status Flags
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valid From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valid To <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isListed}
                  onChange={(e) => setIsListed(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-blue-600 cursor-pointer"
                />
                <span>Is Listed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-blue-600 cursor-pointer"
                />
                <span>Is Featured</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {isEdit ? 'Saving Changes...' : 'Creating Share...'}
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isEdit ? 'Save Changes' : 'Create Share'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
