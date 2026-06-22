'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Search, Filter } from 'lucide-react';

interface CategoryNode {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  level: number;
  parentId: number | null;
  jsonPath: Record<string, string>;
  children: CategoryNode[];
}

interface Filters {
  categoryCode: string;
  brand: string;
  productType: string;
  minMrp: string;
  maxMrp: string;
  minCostPrice: string;
  maxCostPrice: string;
  isCombo: string;
  isOffline: string;
  isBlocked: string;
  isExternal: string;
}

interface ProductFiltersProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
  flatCategories: any[];
  treeCategories: CategoryNode[];
  brands: any[];
  productTypes: any[];
  statuses: any[];
  offlineStatuses: any[];
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
          {isSelected && (
            <span className="text-[9px] leading-none">✓</span>
          )}
        </button>

        <span
          onClick={() => onSelect(currentPath, node.categoryName)}
          className={`flex items-center gap-1.5 cursor-pointer select-none truncate ${
            isSelected
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xs flex-shrink-0">
            {hasChildren ? '📁' : '📄'}
          </span>
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

  const selectedItem = items.find((item) => String(getId(item)) === value);
  const filteredItems = items.filter((item) =>
    getSearchString(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex-1" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full h-9 px-3 pr-8 text-left text-xs bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-350 flex items-center justify-between transition-all"
      >
        <span className="truncate">
          {selectedItem ? getLabel(selectedItem) : placeholder}
        </span>
        <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full h-8 px-2 text-xs bg-slate-100/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-750 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-48 py-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between text-slate-500 dark:text-slate-450`}
            >
              <span>Clear selection</span>
            </button>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const idStr = String(getId(item));
                const isSelected = idStr === value;
                return (
                  <button
                    key={idStr}
                    type="button"
                    onClick={() => {
                      onChange(idStr);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-750 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{getLabel(item)}</span>
                    {isSelected && <Check size={12} className="text-blue-500 flex-shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductFilters({
  filters,
  onChange,
  onClear,
  flatCategories,
  treeCategories,
  brands,
  productTypes,
  statuses,
  offlineStatuses,
}: ProductFiltersProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const set = (key: keyof Filters, val: string) => {
    onChange({ ...filters, [key]: val });
  };

  const getCategoryCodePath = (id: string) => {
    const path: string[] = [];
    let current = flatCategories.find((c) => String(c.categoryId) === id);
    while (current) {
      path.unshift(current.categoryCode || '');
      current = flatCategories.find((c) => c.categoryId === current.parentId);
    }
    return path.filter(Boolean).join('-');
  };

  // Find selected category name
  const getSelectedCategoryName = () => {
    if (!filters.categoryCode) return 'All Categories';
    const found = flatCategories.find(
      (c) => getCategoryCodePath(String(c.categoryId)) === filters.categoryCode
    );
    return found ? found.categoryName : filters.categoryCode;
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter flat categories for search list
  const filteredFlatCategories = flatCategories.filter((c) =>
    c.categoryName.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Filter size={13} className="text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Advanced Filters</span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors font-medium"
        >
          <X size={12} />
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Category Dropdown with Tree selection */}
        <div className="relative" ref={categoryContainerRef}>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Category Tree</label>
          <button
            type="button"
            onClick={() => {
              setCategoryDropdownOpen(!categoryDropdownOpen);
              setCategorySearch('');
            }}
            className="w-full h-9 px-3 pr-8 text-left text-xs bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-350 flex items-center justify-between transition-all"
          >
            <span className="truncate">{getSelectedCategoryName()}</span>
            <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
          </button>

          {categoryDropdownOpen && (
            <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-450" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search category name..."
                    className="w-full h-8 pl-7 pr-2 text-xs bg-slate-100/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-750 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-2 max-h-60">
                <button
                  type="button"
                  onClick={() => {
                    set('categoryCode', '');
                    setCategoryDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500 mb-1"
                >
                  Clear Category Filter
                </button>

                {categorySearch ? (
                  /* Flat list matching search */
                  <div className="space-y-0.5">
                    {filteredFlatCategories.length > 0 ? (
                      filteredFlatCategories.map((c) => {
                        const path = getCategoryCodePath(String(c.categoryId));
                        const isSelected = path === filters.categoryCode;
                        return (
                          <button
                            key={c.categoryId}
                            type="button"
                            onClick={() => {
                              set('categoryCode', path);
                              setCategoryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[11px] block text-slate-700 dark:text-slate-300 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold' : ''
                            }`}
                          >
                            <div className="font-semibold">{c.categoryName}</div>
                            <div className="text-[9px] text-slate-400 truncate mt-0.5">{path}</div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-400">No categories match search</div>
                    )}
                  </div>
                ) : (
                  /* Tree Mode */
                  <div className="space-y-0.5">
                    {treeCategories.length > 0 ? (
                      treeCategories.map((root) => (
                        <TreeNode
                          key={root.categoryId}
                          node={root}
                          selectedCodePath={filters.categoryCode}
                          onSelect={(codePath) => {
                            set('categoryCode', codePath);
                            setCategoryDropdownOpen(false);
                          }}
                          expandedIds={expandedIds}
                          onToggleExpand={toggleExpand}
                          getCategoryCodePath={getCategoryCodePath}
                        />
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-400">No categories found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Brand Dropdown search */}
        <DropdownSearchSelect
          label="Brand"
          value={filters.brand}
          onChange={(val) => set('brand', val)}
          items={brands}
          getLabel={(b) => b.brandName}
          getSearchString={(b) => b.brandName}
          getId={(b) => b.brandName} // Brand filter uses brandName (e.g., Samsung, Apple)
          placeholder="All Brands"
        />

        {/* 3. Product Type Dropdown search */}
        <DropdownSearchSelect
          label="Product Type"
          value={filters.productType}
          onChange={(val) => set('productType', val)}
          items={productTypes}
          getLabel={(t) => t.displayName}
          getSearchString={(t) => t.displayName}
          getId={(t) => t.code} // Product Type uses code (e.g. KITCHEN APPLIANCES)
          placeholder="All Product Types"
        />

        {/* 4. Is Offline (Offline status dropdown) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Offline Status</label>
          <select
            value={filters.isOffline}
            onChange={(e) => set('isOffline', e.target.value)}
            className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-750 dark:text-slate-300"
          >
            <option value="">All Offline Statuses</option>
            {offlineStatuses.map((opt) => (
              <option key={`opt-offline-${opt.statusCode}`} value={opt.statusCode}>
                {opt.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Is Blocked (Status dropdown) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Block Status</label>
          <select
            value={filters.isBlocked}
            onChange={(e) => set('isBlocked', e.target.value)}
            className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-750 dark:text-slate-300"
          >
            <option value="">All Block Statuses</option>
            {statuses.map((opt) => (
              <option key={`opt-status-${opt.statusCode}`} value={opt.statusCode}>
                {opt.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* 6. MRP Range */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">MRP Range</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={filters.minMrp}
              onChange={(e) => set('minMrp', e.target.value)}
              className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxMrp}
              onChange={(e) => set('maxMrp', e.target.value)}
              className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* 7. Cost Price Range */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Cost Price Range</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={filters.minCostPrice}
              onChange={(e) => set('minCostPrice', e.target.value)}
              className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxCostPrice}
              onChange={(e) => set('maxCostPrice', e.target.value)}
              className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* 8. Combo and External */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Is Combo</label>
            <select
              value={filters.isCombo}
              onChange={(e) => set('isCombo', e.target.value)}
              className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-750 dark:text-slate-300"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Is External</label>
            <select
              value={filters.isExternal}
              onChange={(e) => set('isExternal', e.target.value)}
              className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-750 dark:text-slate-300"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
