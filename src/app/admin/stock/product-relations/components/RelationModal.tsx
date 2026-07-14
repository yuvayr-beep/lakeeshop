'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, Sparkles, Search, Check, Link2, Box, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Product {
  id: number;
  baseProductName: string;
  defaultSku: string;
}

interface RelationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedParent?: { id: number; name: string; code: string } | null;
}

export default function RelationModal({
  open,
  onClose,
  onSuccess,
  preselectedParent,
}: RelationModalProps) {
  // Form states
  const [parentId, setParentId] = useState<string>('');
  const [parentSearch, setParentSearch] = useState<string>('');
  const [parentList, setParentList] = useState<Product[]>([]);
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);

  const [childSearch, setChildSearch] = useState<string>('');
  const [childList, setChildList] = useState<Product[]>([]);
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Selected children for multi-add
  const [selectedChildren, setSelectedChildren] = useState<Product[]>([]);

  const [saving, setSaving] = useState(false);

  // Refs for closing dropdowns on click outside
  const parentContainerRef = useRef<HTMLDivElement>(null);
  const childContainerRef = useRef<HTMLDivElement>(null);

  // Parse NDJSON
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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (parentContainerRef.current && !parentContainerRef.current.contains(event.target as Node)) {
        setShowParentDropdown(false);
      }
      if (childContainerRef.current && !childContainerRef.current.contains(event.target as Node)) {
        setShowChildDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-populate parent if provided
  useEffect(() => {
    if (open) {
      if (preselectedParent) {
        setParentId(String(preselectedParent.id));
        setParentSearch(`${preselectedParent.name} (${preselectedParent.code})`);
      } else {
        setParentId('');
        setParentSearch('');
      }
      setChildSearch('');
      setSelectedChildren([]);
      setParentList([]);
      setChildList([]);
    }
  }, [open, preselectedParent]);

  // Debounced search for Parent Products
  useEffect(() => {
    if (!open || preselectedParent) return;
    if (parentSearch.trim().length < 2 || parentId) {
      setParentList([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      setLoadingParents(true);
      const isSku = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(parentSearch);
      const url = isSku 
        ? `/prod/products?sku=${encodeURIComponent(parentSearch.trim())}` 
        : `/prod/products?name=${encodeURIComponent(parentSearch.trim())}`;
      
      axiosInstance
        .get(url, { headers: { Accept: 'application/x-ndjson' } })
        .then(({ data }) => {
          setParentList(parseNdjson(data));
        })
        .catch((err) => console.error('Failed to load parents:', err))
        .finally(() => setLoadingParents(false));
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [parentSearch, parentId, open, preselectedParent]);

  // Debounced search for Child Products
  useEffect(() => {
    if (!open) return;
    if (childSearch.trim().length < 2) {
      setChildList([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      setLoadingChildren(true);
      const isSku = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(childSearch);
      const url = isSku 
        ? `/prod/products?sku=${encodeURIComponent(childSearch.trim())}` 
        : `/prod/products?name=${encodeURIComponent(childSearch.trim())}`;
      
      axiosInstance
        .get(url, { headers: { Accept: 'application/x-ndjson' } })
        .then(({ data }) => {
          setChildList(parseNdjson(data));
        })
        .catch((err) => console.error('Failed to load children:', err))
        .finally(() => setLoadingChildren(false));
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [childSearch, open]);

  // Parent Select handler
  const handleParentSelect = (prod: Product) => {
    setParentId(String(prod.id));
    setParentSearch(`${prod.baseProductName} (${prod.defaultSku})`);
    setShowParentDropdown(false);
  };

  // Child Select handler (Adds to selected children list)
  const handleChildSelect = (prod: Product) => {
    if (selectedChildren.some((c) => c.id === prod.id)) {
      toast.error('Product already added to relation list');
      return;
    }
    if (String(prod.id) === parentId) {
      toast.error('A product cannot be a child of itself');
      return;
    }
    setSelectedChildren((prev) => [...prev, prod]);
    setChildSearch('');
    setShowChildDropdown(false);
  };

  // Remove child from selected list
  const handleRemoveChild = (id: number) => {
    setSelectedChildren((prev) => prev.filter((c) => c.id !== id));
  };

  // Clear Parent Selection
  const handleClearParent = () => {
    setParentId('');
    setParentSearch('');
  };

  // Save relations API trigger
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentId) {
      toast.error('Please select a Parent Product.');
      return;
    }
    if (selectedChildren.length === 0) {
      toast.error('Please add at least one Child Product.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Establishing parent-variant mapping...');

    try {
      // Parallel relations POST payload
      await Promise.all(
        selectedChildren.map((child) => 
          axiosInstance.post('/stock/products/relations', {
            parentId: Number(parentId),
            childId: Number(child.id)
          })
        )
      );

      toast.success('Product relations created successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create relations:', err);
      let errMsg = 'Establish mapping failed.';
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'string') {
          errMsg = data;
        } else if (typeof data === 'object') {
          errMsg = data.message || data.error || data.details || JSON.stringify(data);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
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

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Create Product Relations
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Establish hierarchical relations between parent items and their sub-variants/child components.
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

        {/* Modal Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Parent Selection */}
          <div className="relative" ref={parentContainerRef}>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-2">
              Parent Product <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Parent product by name or SKU..."
                value={parentSearch}
                disabled={!!preselectedParent}
                onChange={(e) => {
                  setParentSearch(e.target.value);
                  setShowParentDropdown(true);
                  if (parentId) handleClearParent();
                }}
                onFocus={() => {
                  if (!preselectedParent) setShowParentDropdown(true);
                }}
                className="w-full h-10 pl-9 pr-20 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
              />
              {loadingParents && (
                <Loader2 size={14} className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
              )}
              {parentId && !preselectedParent && (
                <button
                  type="button"
                  onClick={handleClearParent}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 hover:text-red-650 bg-red-50 dark:bg-red-950/25 px-2 py-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Parent Dropdown Options */}
            {showParentDropdown && parentList.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                {parentList.map((prod) => (
                  <button
                    key={`parent-opt-${prod.id}`}
                    type="button"
                    onClick={() => handleParentSelect(prod)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 truncate flex flex-col"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{prod.baseProductName}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">SKU: {prod.defaultSku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Child Selection */}
          <div className="relative" ref={childContainerRef}>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-2">
              Child Product(s) / Variants <span className="text-red-500">*</span>
            </label>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">
              Search and add variants to build mappings. Multiple items can be mapped to a single parent.
            </p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search variant child items to add..."
                value={childSearch}
                onChange={(e) => {
                  setChildSearch(e.target.value);
                  setShowChildDropdown(true);
                }}
                onFocus={() => setShowChildDropdown(true)}
                className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
              {loadingChildren && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
              )}
            </div>

            {/* Child Dropdown Options */}
            {showChildDropdown && childList.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                {childList.map((prod) => (
                  <button
                    key={`child-opt-${prod.id}`}
                    type="button"
                    onClick={() => handleChildSelect(prod)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 truncate flex flex-col"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{prod.baseProductName}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">SKU: {prod.defaultSku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Children List Box */}
          <div className="space-y-2">
            <span className="block text-[11px] font-bold text-slate-450 uppercase tracking-wider">
              Selected Child Products ({selectedChildren.length})
            </span>
            {selectedChildren.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 dark:text-slate-500 bg-slate-50/20">
                No child variants selected yet. Use the search bar above to map items.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-150 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {selectedChildren.map((child) => (
                  <div key={`sel-${child.id}`} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950/20 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <div className="flex items-center gap-2 truncate min-w-0 pr-3">
                      <Link2 size={13} className="text-emerald-500 flex-shrink-0" />
                      <div className="truncate text-xs font-semibold text-slate-750 dark:text-slate-250">
                        {child.baseProductName}
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
                        {child.defaultSku}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChild(child.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      title="Remove from selection"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Create Relations
          </button>
        </div>

      </div>
    </div>
  );
}
