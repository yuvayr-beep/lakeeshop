'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Trash2, ArrowUp, ArrowDown, Loader2, Save, Shuffle, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface ProductItem {
  id: number;
  name: string;
  sku: string;
}

interface AlternateItem {
  alternateId?: number;
  alternateProductId: number;
  alternateProductName: string;
  alternateProductSku: string;
  priority: number;
}

interface AlternateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedProduct?: { id: number; name: string; sku: string } | null;
}

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

export default function AlternateModal({
  open,
  onClose,
  onSuccess,
  preselectedProduct,
}: AlternateModalProps) {
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Selected Primary Product
  const [primaryProductId, setPrimaryProductId] = useState<string>('');
  const [primaryProductSearch, setPrimaryProductSearch] = useState<string>('');
  const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false);

  // Selected Alternate Product to add
  const [selectedAltProductId, setSelectedAltProductId] = useState<string>('');
  const [altProductSearch, setAltProductSearch] = useState<string>('');
  const [showAltDropdown, setShowAltDropdown] = useState(false);

  // Alternate items list for the current primary product
  const [alternateList, setAlternateList] = useState<AlternateItem[]>([]);
  const [loadingAlternates, setLoadingAlternates] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const primaryRef = useRef<HTMLDivElement>(null);
  const altRef = useRef<HTMLDivElement>(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (primaryRef.current && !primaryRef.current.contains(event.target as Node)) {
        setShowPrimaryDropdown(false);
      }
      if (altRef.current && !altRef.current.contains(event.target as Node)) {
        setShowAltDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all products for search dropdowns
  useEffect(() => {
    if (!open) return;
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await axiosInstance.get('/prod/products', {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsed = parseNdjson(response.data);
        const mapped: ProductItem[] = parsed.map((p: any) => ({
          id: Number(p.id),
          name: p.baseProductName || `Product #${p.id}`,
          sku: p.defaultSku || `SKU-${p.id}`,
        }));
        setAllProducts(mapped);
      } catch (err) {
        console.error('Failed to load products list:', err);
        toast.error('Failed to load products list.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [open]);

  // Reset or preselect state when modal opens
  useEffect(() => {
    if (open) {
      if (preselectedProduct) {
        setPrimaryProductId(String(preselectedProduct.id));
        setPrimaryProductSearch(`${preselectedProduct.name} (${preselectedProduct.sku})`);
        fetchExistingAlternates(preselectedProduct.id);
      } else {
        setPrimaryProductId('');
        setPrimaryProductSearch('');
        setAlternateList([]);
      }
      setSelectedAltProductId('');
      setAltProductSearch('');
    }
  }, [open, preselectedProduct]);

  // Fetch existing alternates if editing a primary product
  const fetchExistingAlternates = async (prodId: number) => {
    setLoadingAlternates(true);
    try {
      const response = await axiosInstance.get(`/prod/alternate/product/${prodId}`, {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson(response.data);

      // Fetch names for alternate IDs
      const mappedList: AlternateItem[] = await Promise.all(
        parsed.map(async (item: any) => {
          let name = `Product #${item.alternateProductId}`;
          let sku = `ALT-${item.alternateProductId}`;
          try {
            const pRes = await axiosInstance.get(`/prod/products/${item.alternateProductId}`);
            const pData = pRes.data?.data || pRes.data;
            if (pData) {
              name = pData.baseProductName || name;
              sku = pData.defaultSku || sku;
            }
          } catch {
            // fallback
          }
          return {
            alternateId: item.alternateId,
            alternateProductId: item.alternateProductId,
            alternateProductName: name,
            alternateProductSku: sku,
            priority: item.priority || 1,
          };
        })
      );

      mappedList.sort((a, b) => a.priority - b.priority);
      setAlternateList(mappedList);
    } catch (err) {
      console.warn('Failed to load existing alternates for product:', err);
      setAlternateList([]);
    } finally {
      setLoadingAlternates(false);
    }
  };

  // Handle Primary Product Select
  const handleSelectPrimary = (p: ProductItem) => {
    setPrimaryProductId(String(p.id));
    setPrimaryProductSearch(`${p.name} (${p.sku})`);
    setShowPrimaryDropdown(false);
    fetchExistingAlternates(p.id);
  };

  // Add Alternate product to list
  const handleAddAlternate = () => {
    if (!selectedAltProductId) {
      toast.error('Please select an alternate product to add');
      return;
    }

    const altIdNum = Number(selectedAltProductId);
    if (String(altIdNum) === primaryProductId) {
      toast.error('A product cannot be an alternate of itself');
      return;
    }

    if (alternateList.some((a) => a.alternateProductId === altIdNum)) {
      toast.error('Product is already added as an alternate');
      return;
    }

    const foundProd = allProducts.find((p) => p.id === altIdNum);
    const maxPriority = alternateList.reduce((max, item) => Math.max(max, item.priority || 0), 0);

    const newItem: AlternateItem = {
      alternateProductId: altIdNum,
      alternateProductName: foundProd?.name || `Product #${altIdNum}`,
      alternateProductSku: foundProd?.sku || `SKU-${altIdNum}`,
      priority: maxPriority + 1,
    };

    setAlternateList((prev) => [...prev, newItem]);
    setSelectedAltProductId('');
    setAltProductSearch('');
    setShowAltDropdown(false);
  };

  // Move priority up / down
  const movePriority = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= alternateList.length) return;

    const newList = [...alternateList];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Recalculate priority
    const reordered = newList.map((item, idx) => ({
      ...item,
      priority: idx + 1,
    }));

    setAlternateList(reordered);
  };

  // Remove alternate product item
  const handleRemoveItem = async (index: number) => {
    const item = alternateList[index];
    if (item.alternateId) {
      if (!window.confirm(`Are you sure you want to remove ${item.alternateProductName}?`)) return;
      try {
        await axiosInstance.delete(`/prod/alternate/${item.alternateId}`);
        toast.success('Alternate mapping removed');
      } catch (err: any) {
        console.error('Failed to delete alternate mapping:', err);
        toast.error('Failed to remove alternate mapping');
        return;
      }
    }
    setAlternateList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit Save all alternate mappings
  const handleSubmitSave = async () => {
    if (!primaryProductId) {
      toast.error('Please select a Primary Product');
      return;
    }

    if (alternateList.length === 0) {
      toast.error('Please add at least one Alternate Product');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Saving alternate products...');

    try {
      const pId = Number(primaryProductId);
      // Save / Update each alternate product payload
      await Promise.all(
        alternateList.map(async (item, idx) => {
          const payload = {
            productId: pId,
            alternateProductId: item.alternateProductId,
            priority: idx + 1,
            clientId: 0,
          };
          if (item.alternateId) {
            return axiosInstance.put(`/prod/alternate/${item.alternateId}`, payload);
          } else {
            return axiosInstance.post('/prod/alternate', payload);
          }
        })
      );

      toast.success('Alternate products saved successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save alternate products:', err);
      toast.error(err.response?.data?.message || 'Failed to save alternate products', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrimaryProducts = allProducts.filter((p) =>
    `${p.name} ${p.sku}`.toLowerCase().includes(primaryProductSearch.toLowerCase().trim())
  );

  const filteredAltProducts = allProducts.filter((p) =>
    String(p.id) !== primaryProductId &&
    `${p.name} ${p.sku}`.toLowerCase().includes(altProductSearch.toLowerCase().trim())
  );

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={preselectedProduct ? `Manage Alternate Products — ${preselectedProduct.sku}` : 'Add Alternate Product Relation'}
      subtitle="Select a primary product and assign alternate substitute products"
      size="2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitSave}
            disabled={submitting || !primaryProductId || alternateList.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={13} />
                Save Alternates
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5 py-1">
        {/* Primary Product Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            1. Select Primary Product <span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={primaryRef}>
            <div className="relative">
              <input
                type="text"
                value={primaryProductSearch}
                onFocus={() => setShowPrimaryDropdown(true)}
                onChange={(e) => {
                  setPrimaryProductSearch(e.target.value);
                  setPrimaryProductId('');
                  setShowPrimaryDropdown(true);
                }}
                placeholder={loadingProducts ? 'Loading products...' : 'Search primary product by name or SKU...'}
                className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {primaryProductSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryProductSearch('');
                    setPrimaryProductId('');
                    setAlternateList([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown list */}
            {showPrimaryDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto scrollbar-thin py-1">
                {filteredPrimaryProducts.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center">No products found</div>
                ) : (
                  filteredPrimaryProducts.map((p) => (
                    <button
                      key={`prim-${p.id}`}
                      type="button"
                      onClick={() => handleSelectPrimary(p)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors border-b border-slate-100 dark:border-slate-850 last:border-b-0"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[300px]">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                        {p.sku}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Alternate Product Component */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            2. Add Alternate / Substitute Products
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1" ref={altRef}>
              <div className="relative">
                <input
                  type="text"
                  value={altProductSearch}
                  disabled={!primaryProductId}
                  onFocus={() => setShowAltDropdown(true)}
                  onChange={(e) => {
                    setAltProductSearch(e.target.value);
                    setSelectedAltProductId('');
                    setShowAltDropdown(true);
                  }}
                  placeholder={!primaryProductId ? 'First select a primary product above...' : 'Search alternate product to add...'}
                  className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Alternate dropdown list */}
              {showAltDropdown && primaryProductId && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto scrollbar-thin py-1">
                  {filteredAltProducts.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 text-center">No available alternate products</div>
                  ) : (
                    filteredAltProducts.map((p) => (
                      <button
                        key={`alt-${p.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedAltProductId(String(p.id));
                          setAltProductSearch(`${p.name} (${p.sku})`);
                          setShowAltDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors border-b border-slate-100 dark:border-slate-850 last:border-b-0"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[300px]">
                          {p.name}
                        </span>
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                          {p.sku}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddAlternate}
              disabled={!selectedAltProductId}
              className="flex items-center gap-1 px-4 h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Alternate Products List Display */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Assigned Alternate Products ({alternateList.length})
            </span>
            <span className="text-[10px] text-slate-400">Order by priority using ↑ ↓ arrows</span>
          </div>

          {loadingAlternates ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading alternate products...
            </div>
          ) : alternateList.length === 0 ? (
            <div className="py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs text-center">
              <Shuffle size={20} className="mb-1 text-slate-300 dark:text-slate-600" />
              <span>No alternate products assigned yet.</span>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 max-h-[220px] overflow-y-auto scrollbar-thin">
              {alternateList.map((item, idx) => (
                <div key={`alt-item-${idx}`} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.alternateProductName}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {item.alternateProductSku}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePriority(idx, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Move Priority Up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === alternateList.length - 1}
                      onClick={() => movePriority(idx, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Move Priority Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1"
                      title="Remove Alternate Mapping"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
