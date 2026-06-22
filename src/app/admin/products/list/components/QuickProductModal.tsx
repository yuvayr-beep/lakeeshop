'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Send, Plus, ChevronDown, Zap } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface QuickProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface HsnCode {
  hsnId: number;
  hsnCode: string;
  description: string;
  taxPercentage: number;
  status: boolean;
}

interface Brand {
  brandId: number;
  brandName: string;
  description?: string;
  status: boolean;
}

interface ProductType {
  productTypeId: number;
  code: string;
  displayName: string;
  status: boolean;
}

interface ShipmentMode {
  shipmentModeId: number;
  modeCode: string;
  displayName: string;
  description?: string;
  isActive: boolean;
}

interface CategoryNode {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  level: number;
  parentId: number | null;
  jsonPath: Record<string, string>;
  children: CategoryNode[];
}

// Local SearchSelect component for high flexibility and zero-dependency compilation
function SearchSelect<T>({
  value,
  onChange,
  items,
  getLabel,
  getSearchString,
  getId,
  placeholder = 'Search...',
}: {
  value: string;
  onChange: (value: string) => void;
  items: T[];
  getLabel: (item: T) => string;
  getSearchString: (item: T) => string;
  getId: (item: T) => string;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
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

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 260);
    }
  }, [isOpen]);

  const selectedItem = items.find((item) => String(getId(item)) === value);

  const filteredItems = items.filter((item) =>
    getSearchString(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full h-9 px-3 pr-8 text-left text-sm bg-slate-50/50 hover:bg-slate-50/80 dark:bg-slate-950/30 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 flex items-center justify-between transition-all"
      >
        <span className="truncate">
          {selectedItem ? getLabel(selectedItem) : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col ${
          openUpward ? 'bottom-full mb-1' : 'mt-1'
        }`}>
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full h-8 px-2 text-xs bg-slate-100/50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200"
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-48 py-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const idStr = String(getId(item));
                return (
                  <button
                    key={idStr}
                    type="button"
                    onClick={() => {
                      onChange(idStr);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/55 flex flex-col gap-0.5 ${
                      idStr === value ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>{getLabel(item)}</div>
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

// Category tree node rendering
function TreeNode({
  node,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand
}: {
  node: CategoryNode;
  selectedId: string;
  onSelect: (id: string) => void;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.categoryId);
  const isSelected = String(node.categoryId) === selectedId;

  return (
    <div className="pl-3 relative">
      <div className="flex items-center gap-2 py-1.5 text-sm group">
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
          disabled={hasChildren}
          onClick={() => onSelect(String(node.categoryId))}
          className={`w-4 h-4 rounded border transition-all flex items-center justify-center flex-shrink-0 ${hasChildren
            ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
            : isSelected
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-indigo-400'
            }`}
        >
          {isSelected && !hasChildren && (
            <span className="text-[10px] leading-none">✓</span>
          )}
        </button>

        <span
          onClick={() => {
            if (hasChildren) {
              onToggleExpand(node.categoryId);
            } else {
              onSelect(String(node.categoryId));
            }
          }}
          className={`flex items-center gap-1.5 cursor-pointer select-none truncate ${hasChildren
            ? 'text-slate-600 dark:text-slate-400 font-medium'
            : isSelected
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <span className="text-sm flex-shrink-0">
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
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuickProductModal({ open, onClose, onSuccess }: QuickProductModalProps) {
  // Field values
  const [productName, setProductName] = useState('');
  const [eanCode, setEanCode] = useState('');
  const [selectedHsnId, setSelectedHsnId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');
  const [selectedShipmentMode, setSelectedShipmentMode] = useState('DP');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Dropdown list data
  const [hsnList, setHsnList] = useState<HsnCode[]>([]);
  const [brandList, setBrandList] = useState<Brand[]>([]);
  const [productTypeList, setProductTypeList] = useState<ProductType[]>([]);
  const [shipmentModeList, setShipmentModeList] = useState<ShipmentMode[]>([]);
  
  // Category tree states
  const [flatCategories, setFlatCategories] = useState<any[]>([]);
  const [treeCategories, setTreeCategories] = useState<CategoryNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Loading & Creating states
  const [loadingData, setLoadingData] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Add Item inline popups states
  const [showAddHsn, setShowAddHsn] = useState(false);
  const [newHsn, setNewHsn] = useState({
    code: '',
    description: '',
    taxPercentage: '18',
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({
    brandName: '',
    description: '',
    logoUrl: '',
    email: '',
    ccEmail: ''
  });

  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState({
    code: '',
    displayName: '',
    namingTemplate: '{brand} {model_name} {capacity} {color}'
  });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryName: '',
    categoryCode: '',
    parentId: ''
  });

  // Close popup logic if clicked escape & reset state values on open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setProductName('');
      setEanCode('');
      setSelectedCategoryId('');
      setExpandedIds(new Set());
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Parse NDJSON helper
  const parseNdjson = (rawData: any) => {
    if (typeof rawData === 'string') {
      const parsed: any[] = [];
      rawData.split('\n').forEach((line) => {
        if (line.trim()) {
          try {
            parsed.push(JSON.parse(line));
          } catch {}
        }
      });
      return parsed;
    }
    if (Array.isArray(rawData)) {
      return rawData;
    }
    return [];
  };

  // Fetch dropdown and tree data on modal open
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch HSN
        const hsnRes = await axiosInstance.get('/prod/hsn', { headers: { Accept: 'application/x-ndjson' } });
        const parsedHsn = parseNdjson(hsnRes.data);
        setHsnList(parsedHsn);
        if (parsedHsn.length > 0) {
          setSelectedHsnId(String(parsedHsn[0].hsnId));
        }

        // 2. Fetch Brands
        const brandRes = await axiosInstance.get('/prod/brands', { headers: { Accept: 'application/x-ndjson' } });
        const parsedBrands = parseNdjson(brandRes.data);
        setBrandList(parsedBrands);
        if (parsedBrands.length > 0) {
          setSelectedBrandId(String(parsedBrands[0].brandId));
        }

        // 3. Fetch Product Types
        const typeRes = await axiosInstance.get('/prod/types', { headers: { Accept: 'application/x-ndjson' } });
        const parsedTypes = parseNdjson(typeRes.data);
        setProductTypeList(parsedTypes);
        if (parsedTypes.length > 0) {
          setSelectedProductTypeId(String(parsedTypes[0].productTypeId));
        }

        // 4. Fetch Shipment Modes
        const shipRes = await axiosInstance.get('/prod/shipment-modes/all', { headers: { Accept: 'application/x-ndjson' } });
        const parsedShip = parseNdjson(shipRes.data);
        setShipmentModeList(parsedShip);
        if (parsedShip.length > 0) {
          const defaultMode = parsedShip.find((s: any) => s.modeCode === 'DP') || parsedShip[0];
          setSelectedShipmentMode(defaultMode.modeCode);
        }

        // 5. Fetch Categories
        const catRes = await axiosInstance.get('/prod/categories/client/0/export', { headers: { Accept: 'application/x-ndjson' } });
        const parsedCats = parseNdjson(catRes.data);
        setFlatCategories(parsedCats);

        // Build category tree
        const map = new Map<number, CategoryNode>();
        const roots: CategoryNode[] = [];

        parsedCats.forEach((cat: any) => {
          map.set(cat.categoryId, {
            ...cat,
            children: [],
          });
        });

        parsedCats.forEach((cat: any) => {
          const node = map.get(cat.categoryId)!;
          if (cat.parentId === null || cat.parentId === undefined || !map.has(cat.parentId)) {
            roots.push(node);
          } else {
            const parentNode = map.get(cat.parentId)!;
            parentNode.children.push(node);
          }
        });

        setTreeCategories(roots);

        // No default category selection - let the user select manually
      } catch (err) {
        console.error('Failed to fetch master data:', err);
        toast.error('Failed to load form dropdown data. Please try again.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [open]);

  // Handle category tree expand / toggle
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

  // Expand selected category ancestors
  useEffect(() => {
    if (selectedCategoryId && flatCategories.length > 0) {
      const ancestors = new Set<number>();
      let current = flatCategories.find(c => String(c.categoryId) === selectedCategoryId);
      while (current && current.parentId) {
        ancestors.add(current.parentId);
        current = flatCategories.find(c => c.categoryId === current.parentId);
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        ancestors.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [selectedCategoryId, flatCategories]);

  // Get selected category code path
  const getCategoryCodePath = (id: string) => {
    const path: string[] = [];
    let current = flatCategories.find(c => String(c.categoryId) === id);
    while (current) {
      path.unshift(current.categoryCode || '');
      current = flatCategories.find(c => c.categoryId === current.parentId);
    }
    return path.filter(Boolean).join('-');
  };

  // Add Item handlers
  const handleAddHsn = async () => {
    if (!newHsn.code.trim()) {
      toast.error('HSN Code is required');
      return;
    }
    try {
      const payload = {
        hsnCode: newHsn.code.trim(),
        description: newHsn.description.trim() || null,
        taxPercentage: Number(newHsn.taxPercentage) || 0,
        effectiveFrom: newHsn.effectiveFrom
      };
      const response = await axiosInstance.post('/prod/hsn', payload);
      const created = response.data;
      setHsnList((prev) => [...prev, created]);
      setSelectedHsnId(String(created.hsnId));
      setNewHsn({
        code: '',
        description: '',
        taxPercentage: '18',
        effectiveFrom: new Date().toISOString().split('T')[0]
      });
      setShowAddHsn(false);
      toast.success('HSN Code created successfully');
    } catch (err: any) {
      console.error('Failed to create HSN Code:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create HSN Code');
    }
  };

  const handleAddBrand = async () => {
    if (!newBrand.brandName.trim()) {
      toast.error('Brand Name is required');
      return;
    }
    try {
      const payload = {
        brandName: newBrand.brandName.trim(),
        description: newBrand.description.trim() || null,
        logoUrl: newBrand.logoUrl.trim() || null,
        email: newBrand.email.trim() || null,
        ccEmail: newBrand.ccEmail.trim() || null
      };
      const response = await axiosInstance.post('/prod/brands', payload);
      const created = response.data;
      setBrandList((prev) => [...prev, created]);
      setSelectedBrandId(String(created.brandId));
      setNewBrand({ brandName: '', description: '', logoUrl: '', email: '', ccEmail: '' });
      setShowAddBrand(false);
      toast.success('Brand created successfully');
    } catch (err: any) {
      console.error('Failed to create Brand:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create Brand');
    }
  };

  const handleAddType = async () => {
    if (!newType.displayName.trim()) {
      toast.error('Product Type Name is required');
      return;
    }
    if (!newType.code.trim()) {
      toast.error('Type Code is required');
      return;
    }
    try {
      const payload = {
        code: newType.code.trim(),
        displayName: newType.displayName.trim(),
        namingTemplate: newType.namingTemplate.trim() || null
      };
      const response = await axiosInstance.post('/prod/types', payload);
      const created = response.data;
      setProductTypeList((prev) => [...prev, created]);
      setSelectedProductTypeId(String(created.productTypeId));
      setNewType({ code: '', displayName: '', namingTemplate: '{brand} {model_name} {capacity} {color}' });
      setShowAddType(false);
      toast.success('Product Type created successfully');
    } catch (err: any) {
      console.error('Failed to create Product Type:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create Product Type');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.categoryName.trim()) {
      toast.error('Category Name is required');
      return;
    }
    if (!newCategory.categoryCode.trim()) {
      toast.error('Category Code is required');
      return;
    }

    const categoryCodeUpper = newCategory.categoryCode.trim().toUpperCase();
    const parentIdVal = newCategory.parentId ? Number(newCategory.parentId) : null;

    // Duplication Check: ONLY for parent categories (i.e. parentId is null)
    if (parentIdVal === null) {
      const codeExists = flatCategories.some(
        (c) => c.categoryCode && c.categoryCode.toUpperCase() === categoryCodeUpper
      );
      if (codeExists) {
        toast.error('Category code already exists for parent category');
        return;
      }
    }

    try {
      const parentNode = parentIdVal
        ? flatCategories.find((c) => c.categoryId === parentIdVal)
        : null;
      const levelVal = parentNode ? parentNode.level + 1 : 1;

      const payload = {
        categoryName: newCategory.categoryName.trim(),
        categoryCode: categoryCodeUpper,
        parentId: parentIdVal,
        level: levelVal,
        clientId: 0
      };

      const response = await axiosInstance.post('/prod/categories', payload);
      const created = response.data;

      const updatedFlat = [...flatCategories, created];
      setFlatCategories(updatedFlat);

      const map = new Map<number, CategoryNode>();
      const roots: CategoryNode[] = [];

      updatedFlat.forEach((cat: any) => {
        map.set(cat.categoryId, {
          ...cat,
          children: []
        });
      });

      updatedFlat.forEach((cat: any) => {
        const node = map.get(cat.categoryId)!;
        if (cat.parentId === null || cat.parentId === undefined || !map.has(cat.parentId)) {
          roots.push(node);
        } else {
          const parentNode = map.get(cat.parentId)!;
          parentNode.children.push(node);
        }
      });

      setTreeCategories(roots);
      setSelectedCategoryId(String(created.categoryId));
      
      setNewCategory({ categoryName: '', categoryCode: '', parentId: '' });
      setShowAddCategory(false);
      toast.success('Category created successfully');
    } catch (err: any) {
      console.error('Failed to create Category:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create Category');
    }
  };

  // Publish / submit handler
  const handlePublish = async () => {
    if (!productName.trim()) {
      toast.error('Product Name is mandatory.');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('Please select a Category from the Category Tree.');
      return;
    }
    if (!selectedBrandId) {
      toast.error('Please select a Brand.');
      return;
    }
    if (!selectedProductTypeId) {
      toast.error('Please select a Product Type.');
      return;
    }

    setPublishing(true);
    const toastId = toast.loading('Publishing product...');

    const payload = {
      baseProductName: productName.trim(),
      defaultSku: '',
      eanCode: eanCode.trim() || null,
      categoryId: Number(selectedCategoryId),
      brandId: Number(selectedBrandId),
      productTypeId: Number(selectedProductTypeId),
      modelName: '',
      modelNumber: null,
      variant: null,
      size: null,
      capacity: null,
      packQuantity: 1,
      colorCode: null,
      materialCode: null,
      gender: null,
      patternFinishCode: null,
      editionCode: null,
      warrantyCode: null,
      mrp: 0,
      hsnId: Number(selectedHsnId) || null,
      costPrice: 0,
      isCombo: false,
      shortDescription: null,
      longDescription: null,
      longDescriptionHtml: null,
      images: null,
      dimensions: null,
      length: null,
      width: null,
      height: null,
      weight: null,
      preferredShipmentMode: selectedShipmentMode,
      handlingCode: null,
      isSplit: false,
      splitQuantity: null,
      surfaceQuantity: null,
      isExternal: false,
      comboItems: null
    };

    try {
      await axiosInstance.post('/prod/products', payload, {
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/x-ndjson'
        }
      });
      toast.success('Product created and published successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create product. Please try again.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setPublishing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Animation Style tag for Thunder Zap icon */}
      <style>{`
        @keyframes quick-thunder-glow {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.5)) brightness(1);
          }
          50% {
            transform: scale(1.15) rotate(8deg);
            filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.9)) brightness(1.2);
          }
        }
        .animate-quick-thunder {
          animation: quick-thunder-glow 1.8s infinite ease-in-out;
        }
      `}</style>

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Zap size={16} className="text-amber-500 animate-quick-thunder" />
            </div>
            <h2 className="text-md font-bold text-slate-800 dark:text-white tracking-wide">QUICK PRODUCT CREATION</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 overflow-y-auto min-h-0 flex">
          {loadingData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading master data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 w-full">
              
              {/* Left Div - Fields */}
              <div className="p-6 space-y-5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[70vh]">
                
                {/* 1. Product Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter a clear, descriptive product name..."
                    className="w-full bg-transparent border-none outline-none text-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold focus:ring-0 p-0"
                  />
                  <div className="h-[2px] bg-gradient-to-r from-indigo-500 via-indigo-400/50 to-transparent mt-2" />
                </div>
                {/* 2. EAN Code & Preferred Shipping Mode Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* EAN Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      EAN Code
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">Barcode identifier (Optional)</p>
                    <input
                      type="text"
                      value={eanCode}
                      onChange={(e) => setEanCode(e.target.value)}
                      placeholder="e.g. TESTEANCODE113"
                      className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-indigo-500 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 placeholder:text-slate-400 transition-all"
                    />
                  </div>

                  {/* Preferred Shipping Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Preferred Shipping Mode
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">Default transport mode</p>
                    <SearchSelect
                      value={selectedShipmentMode}
                      onChange={setSelectedShipmentMode}
                      items={shipmentModeList}
                      getLabel={(s) => `${s.modeCode} — ${s.displayName} (${s.description || ''})`}
                      getSearchString={(s) => `${s.modeCode} ${s.displayName}`}
                      getId={(s) => s.modeCode}
                      placeholder="Select Shipping Mode"
                    />
                  </div>
                </div>

                {/* 3. HSN Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    HSN Code
                  </label>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">Harmonized System Nomenclature</p>
                  <div className="flex gap-2">
                    <SearchSelect
                      value={selectedHsnId}
                      onChange={setSelectedHsnId}
                      items={hsnList}
                      getLabel={(h) => `${h.hsnCode} — ${h.taxPercentage}%`}
                      getSearchString={(h) => `${h.hsnCode} ${h.description} ${h.taxPercentage}`}
                      getId={(h) => String(h.hsnId)}
                      placeholder="Select HSN Code"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddHsn(true)}
                      className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg transition-all flex-shrink-0"
                      title="Add HSN Code"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* 4. Brand & Product Type Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Brand */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Brand
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">Barcode identifier</p>
                    <div className="flex gap-2">
                      <SearchSelect
                        value={selectedBrandId}
                        onChange={setSelectedBrandId}
                        items={brandList}
                        getLabel={(b) => b.brandName}
                        getSearchString={(b) => b.brandName}
                        getId={(b) => String(b.brandId)}
                        placeholder="Select Brand"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddBrand(true)}
                        className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg transition-all flex-shrink-0"
                        title="Add Brand"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Product Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Product Type
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">Barcode identifier</p>
                    <div className="flex gap-2">
                      <SearchSelect
                        value={selectedProductTypeId}
                        onChange={setSelectedProductTypeId}
                        items={productTypeList}
                        getLabel={(t) => t.displayName}
                        getSearchString={(t) => t.displayName}
                        getId={(t) => String(t.productTypeId)}
                        placeholder="Select Product Type"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddType(true)}
                        className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg transition-all flex-shrink-0"
                        title="Add Product Type"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Div - Category Tree */}
              <div className="p-6 flex flex-col overflow-y-auto max-h-[70vh]">
                <div className="flex items-center justify-between mb-3">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    CATEGORIES
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline"
                  >
                    <Plus size={12} className="inline" /> Add Category
                  </button>
                </div>
                
                {selectedCategoryId && getCategoryCodePath(selectedCategoryId) && (
                  <div className="mb-4 text-red-600 dark:text-red-500 font-bold text-sm font-mono tracking-wide">
                    {getCategoryCodePath(selectedCategoryId)}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30">
                  {treeCategories.length > 0 ? (
                    <div className="space-y-1">
                      {treeCategories.map((root) => (
                        <TreeNode
                          key={root.categoryId}
                          node={root}
                          selectedId={selectedCategoryId}
                          onSelect={setSelectedCategoryId}
                          expandedIds={expandedIds}
                          onToggleExpand={toggleExpand}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No categories found
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || loadingData}
            className="flex items-center gap-1.5 px-6 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send size={13} />
                Publish
              </>
            )}
          </button>
        </div>

        {/* Inline HSN Create Modal */}
        {showAddHsn && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add HSN Code</span>
                <button type="button" onClick={() => setShowAddHsn(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">HSN Code *</label>
                  <input
                    type="text"
                    value={newHsn.code}
                    onChange={(e) => setNewHsn({ ...newHsn, code: e.target.value })}
                    placeholder="e.g. HSNNEW11"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={newHsn.description}
                    onChange={(e) => setNewHsn({ ...newHsn, description: e.target.value })}
                    placeholder="Description"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tax Percentage *</label>
                  <input
                    type="number"
                    value={newHsn.taxPercentage}
                    onChange={(e) => setNewHsn({ ...newHsn, taxPercentage: e.target.value })}
                    placeholder="e.g. 18"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Effective From *</label>
                  <input
                    type="date"
                    value={newHsn.effectiveFrom}
                    onChange={(e) => setNewHsn({ ...newHsn, effectiveFrom: e.target.value })}
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddHsn(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="button" onClick={handleAddHsn} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
              </div>
            </div>
          </div>
        )}
 
        {/* Inline Brand Create Modal */}
        {showAddBrand && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Brand</span>
                <button type="button" onClick={() => setShowAddBrand(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={newBrand.brandName}
                    onChange={(e) => setNewBrand({ ...newBrand, brandName: e.target.value })}
                    placeholder="Brand Name"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={newBrand.description}
                    onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                    placeholder="Description"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={newBrand.logoUrl}
                    onChange={(e) => setNewBrand({ ...newBrand, logoUrl: e.target.value })}
                    placeholder="e.g. lakeeshop.com"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={newBrand.email}
                    onChange={(e) => setNewBrand({ ...newBrand, email: e.target.value })}
                    placeholder="e.g. brand@gmail.com"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">CC Email</label>
                  <input
                    type="email"
                    value={newBrand.ccEmail}
                    onChange={(e) => setNewBrand({ ...newBrand, ccEmail: e.target.value })}
                    placeholder="e.g. brand-cc@gmail.com"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddBrand(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="button" onClick={handleAddBrand} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
              </div>
            </div>
          </div>
        )}
 
        {/* Inline Product Type Create Modal */}
        {showAddType && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Product Type</span>
                <button type="button" onClick={() => setShowAddType(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Product Type Name *</label>
                  <input
                    type="text"
                    value={newType.displayName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
                      setNewType({ ...newType, displayName: name, code });
                    }}
                    placeholder="Product Type Name (e.g. Smart Phone)"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-200 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Type Code *</label>
                  <input
                    type="text"
                    value={newType.code}
                    onChange={(e) => setNewType({ ...newType, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_') })}
                    placeholder="e.g. PHONE1"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-200 transition-all font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Naming Template</label>
                  <input
                    type="text"
                    value={newType.namingTemplate}
                    onChange={(e) => setNewType({ ...newType, namingTemplate: e.target.value })}
                    placeholder="e.g. {brand} {model_name} {capacity} {color}"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddType(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="button" onClick={handleAddType} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Inline Category Create Modal */}
        {showAddCategory && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Category</span>
                <button type="button" onClick={() => setShowAddCategory(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-405 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={newCategory.categoryName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
                      setNewCategory({ ...newCategory, categoryName: name, categoryCode: code });
                    }}
                    placeholder="Category Name"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Category Code *</label>
                  <input
                    type="text"
                    value={newCategory.categoryCode}
                    onChange={(e) => setNewCategory({ ...newCategory, categoryCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_') })}
                    placeholder="e.g. ELECTRONICS"
                    className="w-full h-9 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 transition-all font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Parent Category</label>
                  <select
                    value={newCategory.parentId}
                    onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value })}
                    className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-950/20 border border-slate-300 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">None (Root Category)</option>
                    {flatCategories.map((c) => (
                      <option key={`parent-opt-${c.categoryId}`} value={c.categoryId}>
                        {c.categoryName} ({c.categoryCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddCategory(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="button" onClick={handleAddCategory} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
