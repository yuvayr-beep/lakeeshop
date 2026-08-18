'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, X, Calendar } from 'lucide-react';
import axiosInstance from '@/lib/axios';

interface POFiltersProps {
  filters: {
    startDate: string;
    endDate: string;
    productid: string;
    brand: string;
    supplierId: string;
    status: string;
    isAuto: string;
  };
  onChange: (newFilters: any) => void;
  onReset: () => void;
}

const statusOptions = [
  { value: '0', label: 'DRAFT' },
  { value: '1', label: 'OPEN' },
  { value: '2', label: 'PARTIALLY RECEIVED' },
  { value: '3', label: 'CLOSED' },
  { value: '4', label: 'PRECLOSED' },
  { value: '5', label: 'CANCELLED' },
];

const originOptions = [
  { value: 'true', label: 'Auto PO' },
  { value: 'false', label: 'Manual PO' },
];

const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  if (typeof raw !== 'string') {
    try {
      return [JSON.parse(JSON.stringify(raw))];
    } catch {
      return [];
    }
  }
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

export default function POFilters({ filters, onChange, onReset }: POFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Searchable Product states
  const [productSearch, setProductSearch] = useState('');
  const [isProductFocused, setIsProductFocused] = useState(false);

  // Filter products locally based on typing
  const filteredProducts = React.useMemo(() => {
    if (!productSearch || String(productSearch).trim() === '') return products;
    // If the search string exactly matches the selected product name, don't filter
    const matched = products.find((p) => String(p.id) === String(filters.productid));
    if (matched && (matched.baseProductName || matched.defaultSku) === productSearch) {
      return products;
    }
    const term = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        (p.baseProductName && p.baseProductName.toLowerCase().includes(term)) ||
        (p.defaultSku && p.defaultSku.toLowerCase().includes(term))
    );
  }, [products, productSearch, filters.productid]);

  // Sync selected product with input field display name
  useEffect(() => {
    if (filters.productid) {
      const match = products.find((p) => String(p.id) === String(filters.productid));
      if (match) {
        setProductSearch(match.baseProductName || match.defaultSku || '');
      }
    } else {
      setProductSearch('');
    }
  }, [filters.productid, products]);

  // Searchable Brand states
  const [brandSearch, setBrandSearch] = useState('');
  const [isBrandFocused, setIsBrandFocused] = useState(false);

  // Filter brands locally based on typing
  const filteredBrands = React.useMemo(() => {
    if (!brandSearch || String(brandSearch).trim() === '') return brands;
    if (filters.brand === brandSearch) return brands;
    const term = brandSearch.toLowerCase();
    return brands.filter(
      (b) =>
        b.brandName && b.brandName.toLowerCase().includes(term)
    );
  }, [brands, brandSearch, filters.brand]);

  // Sync selected brand with input field display name
  useEffect(() => {
    if (filters.brand) {
      setBrandSearch(filters.brand);
    } else {
      setBrandSearch('');
    }
  }, [filters.brand]);



  useEffect(() => {
    async function loadFilterData() {
      try {
        setLoading(true);
        // Load Suppliers
        const supRes = await axiosInstance.get('/vendor/suppliers', {
          headers: { Accept: 'application/x-ndjson' },
        });
        setSuppliers(parseNdjson(supRes.data));

        // Load Brands
        const brandRes = await axiosInstance.get('/prod/brands', {
          headers: { Accept: 'application/x-ndjson' },
        });
        setBrands(parseNdjson(brandRes.data));

        // Load Products
        const prodRes = await axiosInstance.get('/prod/products', {
          headers: { Accept: 'application/x-ndjson' },
        });
        setProducts(parseNdjson(prodRes.data));
      } catch (err) {
        console.error('Failed to load filter reference data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFilterData();
  }, []);

  const handleFieldChange = (field: string, value: string) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 shadow-sm mb-6 transition-all duration-300">
      {/* Primary Filters (Date Range & Supplier) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
            <Calendar size={13} className="text-[var(--primary)]" />
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFieldChange('startDate', e.target.value)}
            className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-slate-800 dark:text-slate-200 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
            <Calendar size={13} className="text-[var(--primary)]" />
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFieldChange('endDate', e.target.value)}
            className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-slate-800 dark:text-slate-200 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Supplier</label>
          <select
            value={filters.supplierId}
            onChange={(e) => handleFieldChange('supplierId', e.target.value)}
            className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((sup, idx) => (
              <option key={`supplier-${sup.id || idx}`} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex-1 h-10 px-4 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              isOpen
                ? 'bg-[var(--primary-light-bg)] border-[var(--primary)]/40 text-[var(--primary)]'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Filter size={15} />
            {isOpen ? 'Hide Filters' : 'Advanced Filters'}
          </button>
          <button
            onClick={onReset}
            className="h-10 w-10 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg flex items-center justify-center transition-colors"
            title="Reset Filters"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Advanced Filters Expandable Section */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={`status-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Origin (PO Type)</label>
            <select
              value={filters.isAuto}
              onChange={(e) => handleFieldChange('isAuto', e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-slate-800 dark:text-slate-200"
            >
              <option value="">All Origins</option>
              {originOptions.map((opt) => (
                <option key={`origin-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Contains Product</label>
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onFocus={() => setIsProductFocused(true)}
                onBlur={() => {
                  // Wait a short delay to allow option click to register
                  setTimeout(() => setIsProductFocused(false), 200);
                }}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsProductFocused(true);
                  if (!e.target.value) {
                    handleFieldChange('productid', '');
                  }
                }}
                placeholder="Search product..."
                className="w-full h-10 pl-3 pr-8 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-slate-800 dark:text-slate-200"
              />
              {filters.productid && (
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange('productid', '');
                    setProductSearch('');
                  }}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown Options */}
            {isProductFocused && filteredProducts.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                {filteredProducts.slice(0, 100).map((p, idx) => (
                  <button
                    key={`search-prod-${p.id || idx}`}
                    type="button"
                    onMouseDown={() => {
                      handleFieldChange('productid', String(p.id));
                      setProductSearch(p.baseProductName || p.defaultSku || '');
                      setIsProductFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold truncate">{p.baseProductName || 'Unnamed Product'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.defaultSku}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Contains Brand</label>
            <div className="relative">
              <input
                type="text"
                value={brandSearch}
                onFocus={() => setIsBrandFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsBrandFocused(false), 200);
                }}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  setIsBrandFocused(true);
                  if (!e.target.value) {
                    handleFieldChange('brand', '');
                  }
                }}
                placeholder="Search brand..."
                className="w-full h-10 pl-3 pr-8 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all text-slate-800 dark:text-slate-200"
              />
              {filters.brand && (
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange('brand', '');
                    setBrandSearch('');
                  }}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown Options */}
            {isBrandFocused && filteredBrands.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                {filteredBrands.map((b, idx) => (
                  <button
                    key={`search-brand-${b.brandId || idx}`}
                    type="button"
                    onMouseDown={() => {
                      handleFieldChange('brand', b.brandName || '');
                      setBrandSearch(b.brandName || '');
                      setIsBrandFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold">{b.brandName || 'Unnamed Brand'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
