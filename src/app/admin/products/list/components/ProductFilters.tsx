'use client';
import React from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, BRANDS, PRODUCT_TYPES, TAX_SLABS } from '../data/mockProducts';

interface Filters {
  category: string;
  brand: string;
  productType: string;
  status: string;
  taxSlab: string;
}

interface ProductFiltersProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = ['active', 'inactive', 'discontinued'];

export default function ProductFilters({ filters, onChange, onClear }: ProductFiltersProps) {
  const set = (key: keyof Filters, val: string) => onChange({ ...filters, [key]: val });
  const hasAny = Object.values(filters).some(Boolean);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Filter Products</span>
        {hasAny && (
          <button onClick={onClear} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
            <X size={11} />
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { key: 'category' as const, label: 'Category', options: CATEGORIES },
          { key: 'brand' as const, label: 'Brand', options: BRANDS },
          { key: 'productType' as const, label: 'Product Type', options: PRODUCT_TYPES },
          { key: 'status' as const, label: 'Status', options: STATUS_OPTIONS },
          { key: 'taxSlab' as const, label: 'Tax Slab', options: TAX_SLABS },
        ].map((f) => (
          <div key={`filter-${f.key}`}>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{f.label}</label>
            <select
              value={filters[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="">All {f.label}s</option>
              {f.options.map((opt) => (
                <option key={`opt-${f.key}-${opt}`} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
