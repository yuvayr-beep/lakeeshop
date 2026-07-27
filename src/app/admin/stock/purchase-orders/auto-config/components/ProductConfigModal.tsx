'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, Sparkles, Search } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Product {
  id: number;
  baseProductName: string;
  defaultSku: string;
  brandName?: string;
}

interface ProductConfig {
  productId: number;
  productCode: string;
  productName: string;
  brand: string;
  historicalDays: number;
  recentDays: number;
}

interface ProductConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config?: ProductConfig | null; // If passed, modal is in Edit mode
}

export default function ProductConfigModal({ open, onClose, onSuccess, config }: ProductConfigModalProps) {
  const isEdit = !!config;

  // Form Fields
  const [productId, setProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productList, setProductList] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [historicalDays, setHistoricalDays] = useState(10);
  const [recentDays, setRecentDays] = useState(3);
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse NDJSON helper
  const parseNdjson = (data: any): Product[] => {
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
          .map((line) => JSON.parse(line));
      }
    }
    return [];
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set initial form states
  useEffect(() => {
    if (open) {
      if (config) {
        setProductId(config.productId);
        setProductSearch(`${config.productName} (${config.productCode})`);
        setHistoricalDays(config.historicalDays);
        setRecentDays(config.recentDays);
      } else {
        setProductId(null);
        setProductSearch('');
        setHistoricalDays(10);
        setRecentDays(3);
      }
      setProductList([]);
    }
  }, [open, config]);

  // Debounced product search
  useEffect(() => {
    if (!open || isEdit) return;
    if (productSearch.trim().length < 2 || productId) {
      setProductList([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      setLoadingProducts(true);
      const isSku = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(productSearch);
      const url = isSku 
        ? `/prod/products?sku=${encodeURIComponent(productSearch.trim())}` 
        : `/prod/products?name=${encodeURIComponent(productSearch.trim())}`;
      
      axiosInstance
        .get(url, { headers: { Accept: 'application/x-ndjson' } })
        .then(({ data }) => {
          setProductList(parseNdjson(data));
        })
        .catch((err) => console.error('Failed to search products:', err))
        .finally(() => setLoadingProducts(false));
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [productSearch, productId, open, isEdit]);

  const handleProductSelect = (prod: Product) => {
    setProductId(prod.id);
    setProductSearch(`${prod.baseProductName} (${prod.defaultSku})`);
    setShowDropdown(false);
  };

  const handleClearProduct = () => {
    setProductId(null);
    setProductSearch('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error('Please select a Product');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating override...' : 'Creating override...');

    const payload = {
      historicalDays: Number(historicalDays),
      recentDays: Number(recentDays),
    };

    try {
      await axiosInstance.put(`/stock/auto-po/product-override/${productId}`, payload);
      toast.success('Product override configured successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'An error occurred. Please try again.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {isEdit ? 'Edit Product Override' : 'Create Product Override'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? `Modifying Product ID: ${config?.productId}` : 'Configure custom auto replenishment parameters for a specific product'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Product Selection */}
          <div className="relative" ref={containerRef}>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
              Product <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search product by name or SKU..."
                value={productSearch}
                disabled={isEdit}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowDropdown(true);
                  if (productId) handleClearProduct();
                }}
                onFocus={() => {
                  if (!isEdit) setShowDropdown(true);
                }}
                className="w-full h-10 pl-9 pr-20 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
              />
              {loadingProducts && (
                <Loader2 size={14} className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
              )}
              {productId && !isEdit && (
                <button
                  type="button"
                  onClick={handleClearProduct}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 hover:text-red-650 bg-red-50 dark:bg-red-950/25 px-2 py-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Product Dropdown Options */}
            {showDropdown && productList.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                {productList.map((prod) => (
                  <button
                    key={`prod-opt-${prod.id}`}
                    type="button"
                    onClick={() => handleProductSelect(prod)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 truncate flex flex-col"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{prod.baseProductName}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">SKU: {prod.defaultSku} {prod.brandName ? `| Brand: ${prod.brandName}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Historical Days
              </label>
              <input
                type="number"
                value={historicalDays}
                onChange={(e) => setHistoricalDays(Number(e.target.value))}
                min={0}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Recent Days
              </label>
              <input
                type="number"
                value={recentDays}
                onChange={(e) => setRecentDays(Number(e.target.value))}
                min={0}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-350 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isEdit ? 'Update Override' : 'Save Override'}
          </button>
        </div>

      </div>
    </div>
  );
}
