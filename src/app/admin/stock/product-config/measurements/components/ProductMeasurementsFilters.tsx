'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Search, RotateCcw } from 'lucide-react';

interface CategoryNode {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  level: number;
  parentId: number | null;
  jsonPath: Record<string, string>;
  children: CategoryNode[];
}

export interface ProductMeasurementsFiltersState {
  categoryCode: string;
  brand: string;
  productType: string;
}

interface ProductMeasurementsFiltersProps {
  filters: ProductMeasurementsFiltersState;
  onChange: (f: ProductMeasurementsFiltersState) => void;
  onClear: () => void;
  flatCategories: any[];
  treeCategories: CategoryNode[];
  brands: any[];
  productTypes: any[];
}

// Category tree node rendering
function TreeNode({
  node,
  selectedCodePath,
  onSelect,
  expandedIds,
  onToggleExpand,
  getCategoryCodePath,
}: {
  node: CategoryNode;
  selectedCodePath: string;
  onSelect: (codePath: string, name: string) => void;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  getCategoryCodePath: (id: string) => string;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.categoryId);
  const currentPath = getCategoryCodePath(String(node.categoryId));
  const isSelected = currentPath === selectedCodePath;

  return (
    <div className="pl-3 relative">
      <div className="flex items-center gap-2 py-1.5 text-xs group">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.categoryId)}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          >
            {isExpanded ? '▼' : '►'}
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}

        <button
          type="button"
          onClick={() => onSelect(currentPath, node.categoryName)}
          className={`w-4 h-4 rounded border transition-all flex items-center justify-center flex-shrink-0 ${
            isSelected
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-blue-400'
          }`}
        >
          {isSelected && <span className="text-[9px] leading-none">✓</span>}
        </button>

        <span
          onClick={() => onSelect(currentPath, node.categoryName)}
          className={`flex items-center gap-1.5 cursor-pointer select-none truncate ${
            isSelected
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xs flex-shrink-0">{hasChildren ? '📁' : '📄'}</span>
          <span className="truncate">{node.categoryName}</span>
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l border-dashed border-slate-200 dark:border-slate-800 ml-1.5 pl-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.categoryId}
              node={child}
              selectedCodePath={selectedCodePath}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              getCategoryCodePath={getCategoryCodePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Search dropdown component
function DropdownSearchSelect<T>({
  value,
  onChange,
  items,
  getLabel,
  getSearchString,
  getId,
  placeholder = 'Select...',
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  items: T[];
  getLabel: (item: T) => string;
  getSearchString: (item: T) => string;
  getId: (item: T) => string;
  placeholder?: string;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = items.find((i) => getId(i) === value || getLabel(i) === value);
  const displayLabel = selectedItem ? getLabel(selectedItem) : value || placeholder;

  const filteredItems = items.filter((item) =>
    getSearchString(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
      >
        <span className={`truncate ${value ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}>
          {displayLabel}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin p-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                !value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>All / Any</span>
              {!value && <Check size={12} />}
            </button>

            {filteredItems.map((item) => {
              const id = getId(item);
              const lbl = getLabel(item);
              const isSelected = value === id || value === lbl;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onChange(id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{lbl}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductMeasurementsFilters({
  filters,
  onChange,
  onClear,
  flatCategories,
  treeCategories,
  brands,
  productTypes,
}: ProductMeasurementsFiltersProps) {
  const [catSearch, setCatSearch] = useState('');
  const [expandedCatIds, setExpandedCatIds] = useState<Set<number>>(new Set());
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryCodePath = (catIdStr: string): string => {
    const targetId = Number(catIdStr);
    if (!targetId || isNaN(targetId)) return '';

    const catMap = new Map<number, any>();
    flatCategories.forEach((c) => catMap.set(c.categoryId, c));

    let current = catMap.get(targetId);
    if (!current) return '';

    const names: string[] = [];
    while (current) {
      names.unshift(current.categoryName);
      if (current.parentId && catMap.has(current.parentId)) {
        current = catMap.get(current.parentId);
      } else {
        break;
      }
    }
    return names.join(' > ');
  };

  const handleToggleExpand = (id: number) => {
    setExpandedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCategoryLabel = filters.categoryCode ? filters.categoryCode : 'Select Category';

  return (
    <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Category Tree Dropdown */}
        <div className="space-y-1 relative" ref={catDropdownRef}>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
          <div
            onClick={() => setCatDropdownOpen(!catDropdownOpen)}
            className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
          >
            <span className={`truncate ${filters.categoryCode ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}>
              {selectedCategoryLabel}
            </span>
            <div className="flex items-center gap-1">
              {filters.categoryCode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ ...filters, categoryCode: '' });
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>

          {catDropdownOpen && (
            <div className="absolute z-50 w-72 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Filter category tree..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto scrollbar-thin p-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, categoryCode: '' });
                    setCatDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors mb-1 ${
                    !filters.categoryCode ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  All Categories
                </button>

                {treeCategories.map((node) => (
                  <TreeNode
                    key={node.categoryId}
                    node={node}
                    selectedCodePath={filters.categoryCode}
                    onSelect={(codePath) => {
                      onChange({ ...filters, categoryCode: codePath });
                      setCatDropdownOpen(false);
                    }}
                    expandedIds={expandedCatIds}
                    onToggleExpand={handleToggleExpand}
                    getCategoryCodePath={getCategoryCodePath}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Brand Dropdown */}
        <DropdownSearchSelect
          label="Brand"
          value={filters.brand}
          onChange={(val) => onChange({ ...filters, brand: val })}
          items={brands}
          getLabel={(b) => b.brandName || b.name || ''}
          getSearchString={(b) => b.brandName || b.name || ''}
          getId={(b) => b.brandName || b.name || ''}
          placeholder="Select Brand..."
        />

        {/* 3. Product Type Dropdown */}
        <DropdownSearchSelect
          label="Product Type"
          value={filters.productType}
          onChange={(val) => onChange({ ...filters, productType: val })}
          items={productTypes}
          getLabel={(pt) => pt.productTypeName || pt.name || ''}
          getSearchString={(pt) => pt.productTypeName || pt.name || ''}
          getId={(pt) => pt.productTypeName || pt.name || ''}
          placeholder="Select Product Type..."
        />
      </div>

      {/* Clear Filters Button */}
      <div className="flex justify-end pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
        >
          <RotateCcw size={13} />
          Reset Filters
        </button>
      </div>
    </div>
  );
}
