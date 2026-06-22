'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, X, Plus, Upload, ChevronDown } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

function Panel({ title, badge, headerActions, children }: { title: string; badge?: string; headerActions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-t-xl">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{title}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{badge}</span>
          )}
          {headerActions}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface ProductImageBoxProps {
  image?: string | null;
  onChange?: (url: string | null) => void;
}

export function ProductImageBox({ image: propImage, onChange }: ProductImageBoxProps = {}) {
  const [localImage, setLocalImage] = useState<string | null>(null);
  const image = propImage !== undefined ? propImage : localImage;
  const setImage = (val: string | null) => {
    if (onChange) onChange(val);
    else setLocalImage(val);
  };
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImage(URL.createObjectURL(file));
  };

  return (
    <Panel title="Product Image">
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {image ? (
        <div className="relative group rounded-lg overflow-hidden aspect-square">
          <img src={image} alt="Product" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">Change</button>
            <button type="button" onClick={() => setImage(null)} className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={`w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dragging ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <Upload size={20} className={dragging ? 'text-indigo-600' : 'text-slate-400'} />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Drop image here</p>
            <p className="text-xs text-slate-400 mt-0.5">or click to browse</p>
          </div>
        </button>
      )}
    </Panel>
  );
}

interface ProductGalleryBoxProps {
  images?: string[];
  onChange?: (urls: string[]) => void;
}

export function ProductGalleryBox({ images: propImages, onChange }: ProductGalleryBoxProps = {}) {
  const [localImages, setLocalImages] = useState<string[]>([]);
  const images = propImages !== undefined ? propImages : localImages;
  const setImages = (val: string[] | ((prev: string[]) => string[])) => {
    if (onChange) {
      if (typeof val === 'function') {
        onChange(val(images));
      } else {
        onChange(val);
      }
    } else {
      setLocalImages(val);
    }
  };
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = Array.from(e.target.files || []).map((f) => URL.createObjectURL(f));
    setImages((p) => [...p, ...urls]);
  };

  return (
    <Panel title="Gallery" badge={images.length > 0 ? `${images.length}` : undefined}>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 h-9 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <ImagePlus size={14} /> Add images
      </button>
    </Panel>
  );
}

export function SearchSelect<T>({
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
        className="w-full h-9 px-3 pr-8 text-left text-sm bg-white dark:bg-slate-950 border border-slate-400 dark:border-slate-650 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-955 dark:text-white font-medium flex items-center justify-between"
      >
        <span className="truncate">
          {selectedItem ? getLabel(selectedItem) : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 duration-200 ${
          openUpward ? 'bottom-full mb-1 slide-in-from-bottom-1' : 'mt-1 slide-in-from-top-1'
        }`}>
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-950 dark:text-white font-medium"
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

interface SidebarSelectBoxProps {
  title: string;
  items: { id: number; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  addTitle: string;
}

function SidebarSelectBox({ title, items, selected, onSelect, onAdd, addTitle }: SidebarSelectBoxProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
    setShowCreate(false);
  };

  return (
    <Panel title={title}>
      <div className="flex gap-2">
        <SearchSelect
          value={selected}
          onChange={onSelect}
          items={items}
          getLabel={(item) => item.name}
          getSearchString={(item) => item.name}
          getId={(item) => String(item.id)}
          placeholder={`Select ${title}`}
        />
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 h-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">
          <Plus size={13} /> Add
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{addTitle}</span>
              <button type="button" onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full h-9 px-3 text-sm bg-white dark:bg-slate-955 border border-slate-400 dark:border-slate-650 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-955 dark:text-white font-medium placeholder:text-slate-500" />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={handleCreate} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
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

const getCategoryCodePath = (id: string, flatList: any[]) => {
  const path: string[] = [];
  let current = flatList.find(c => String(c.categoryId) === id);
  while (current) {
    path.unshift(current.categoryCode || '');
    current = flatList.find(c => c.categoryId === current.parentId);
  }
  return path.filter(Boolean).join('-');
};

const getAncestors = (id: string, flatList: any[]) => {
  const ancestors = new Set<number>();
  let current = flatList.find(c => String(c.categoryId) === id);
  while (current && current.parentId) {
    ancestors.add(current.parentId);
    current = flatList.find(c => c.categoryId === current.parentId);
  }
  return ancestors;
};

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
      <div className="flex items-center gap-2 py-1 text-sm group">
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

export function CategoriesBox({ categoryId, onCategoryChange }: { categoryId: string; onCategoryChange: (id: string) => void }) {
  const [flatCategories, setFlatCategories] = useState<any[]>([]);
  const [treeCategories, setTreeCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryName: '',
    categoryCode: '',
    parentId: ''
  });

  const handleCreateCategory = async () => {
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

    // Duplication Check: ONLY for parent categories (parentId is null)
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
      onCategoryChange(String(created.categoryId));
      
      setNewCategory({ categoryName: '', categoryCode: '', parentId: '' });
      setShowCreate(false);
      toast.success('Category created successfully');
    } catch (err: any) {
      console.error('Failed to create Category:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create Category');
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/prod/categories/client/0/export');
        const rawData = response.data;

        let parsed: any[] = [];
        if (typeof rawData === 'string') {
          rawData.split('\n').forEach((line) => {
            if (line.trim()) {
              try {
                parsed.push(JSON.parse(line));
              } catch (e) {
                console.error('Failed to parse line:', line, e);
              }
            }
          });
        } else if (Array.isArray(rawData)) {
          parsed = rawData;
        }

        setFlatCategories(parsed);

        const map = new Map<number, CategoryNode>();
        const roots: CategoryNode[] = [];

        parsed.forEach((cat) => {
          map.set(cat.categoryId, {
            ...cat,
            children: [],
          });
        });

        parsed.forEach((cat) => {
          const node = map.get(cat.categoryId)!;
          if (cat.parentId === null || cat.parentId === undefined || !map.has(cat.parentId)) {
            roots.push(node);
          } else {
            const parentNode = map.get(cat.parentId)!;
            parentNode.children.push(node);
          }
        });

        setTreeCategories(roots);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (categoryId && flatCategories.length > 0) {
      const ancestors = getAncestors(categoryId, flatCategories);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        ancestors.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [categoryId, flatCategories]);

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

  const codePath = getCategoryCodePath(categoryId, flatCategories);

  return (
    <Panel
      title="Categories"
      headerActions={
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-indigo-600 dark:text-indigo-400"
          title="Add Category"
        >
          <Plus size={14} />
        </button>
      }
    >
      <div className="space-y-3">
        {categoryId && codePath && (
          <div className="text-red-600 dark:text-red-500 font-bold text-sm font-mono tracking-wide">
            {codePath}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg justify-center">
            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Loading categories…
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {/* <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Root
            </div> */}
            {treeCategories.length > 0 ? (
              <div className="space-y-1">
                {treeCategories.map((root) => (
                  <TreeNode
                    key={root.categoryId}
                    node={root}
                    selectedId={categoryId}
                    onSelect={onCategoryChange}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                No categories found
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Category</span>
              <button type="button" onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
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
                    <option key={`parent-opt-box-${c.categoryId}`} value={c.categoryId}>
                      {c.categoryName} ({c.categoryCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={handleCreateCategory} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function BrandBox({ brandId, onBrandChange }: { brandId: string; onBrandChange: (id: string) => void }) {
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newBrand, setNewBrand] = useState({
    brandName: '',
    description: '',
    logoUrl: '',
    email: '',
    ccEmail: ''
  });

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

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axiosInstance.get('/prod/brands', {
          headers: { 'accept': 'application/x-ndjson' }
        });
        const parsed = parseNdjson(response.data);
        setBrands(parsed.map((b: any) => ({ id: b.brandId, name: b.brandName })));
      } catch (err) {
        console.warn('Failed to load brands from API, using defaults:', err);
        setBrands([
          { id: 6, name: 'FABER' },
          { id: 5, name: 'Bajaj' },
          { id: 1, name: 'Samsung' },
          { id: 2, name: 'Apple' },
          { id: 3, name: 'HUL' },
          { id: 4, name: 'Dabur' },
          { id: 7, name: 'ITC' },
        ]);
      }
    };
    fetchBrands();
  }, []);

  const handleCreate = async () => {
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
      const mapped = { id: created.brandId, name: created.brandName };
      setBrands((prev) => [...prev, mapped]);
      onBrandChange(String(created.brandId));
      setNewBrand({ brandName: '', description: '', logoUrl: '', email: '', ccEmail: '' });
      setShowCreate(false);
      toast.success('Brand created successfully');
    } catch (err: any) {
      console.error('Failed to create Brand:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create Brand');
    }
  };

  return (
    <Panel title="Brand">
      <div className="flex gap-2">
        <SearchSelect
          value={brandId}
          onChange={onBrandChange}
          items={brands}
          getLabel={(item) => item.name}
          getSearchString={(item) => item.name}
          getId={(item) => String(item.id)}
          placeholder="Select Brand"
        />
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center justify-center p-2 h-9 w-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0">
          <Plus size={16} />
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Brand</span>
              <button type="button" onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
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
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={handleCreate} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function ProductTypeBox({ productTypeId, onProductTypeChange }: { productTypeId: string; onProductTypeChange: (id: string) => void }) {
  const [productTypes, setProductTypes] = useState<{ id: number; name: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState({
    code: '',
    displayName: '',
    namingTemplate: '{brand} {model_name} {capacity} {color}'
  });

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

  useEffect(() => {
    const fetchProductTypes = async () => {
      try {
        const response = await axiosInstance.get('/prod/types', {
          headers: { 'accept': 'application/x-ndjson' }
        });
        const parsed = parseNdjson(response.data);
        setProductTypes(parsed.map((t: any) => ({ id: t.productTypeId, name: t.displayName })));
      } catch (err) {
        console.warn('Failed to load product types from API, using defaults:', err);
        setProductTypes([
          { id: 4, name: 'Kitchen Appliances' },
          { id: 1, name: 'Smart Phone2Test' },
          { id: 2, name: 'Simple Product' },
          { id: 3, name: 'Laptops' },
          { id: 5, name: 'Accessories' },
        ]);
      }
    };
    fetchProductTypes();
  }, []);

  const handleCreate = async () => {
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
      const mapped = { id: created.productTypeId, name: created.displayName };
      setProductTypes((prev) => [...prev, mapped]);
      onProductTypeChange(String(created.productTypeId));
      setNewType({ code: '', displayName: '', namingTemplate: '{brand} {model_name} {capacity} {color}' });
      setShowCreate(false);
      toast.success('Product Type created successfully');
    } catch (err: any) {
      console.error('Failed to create Product Type:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create Product Type');
    }
  };

  return (
    <Panel title="Product Type">
      <div className="flex gap-2">
        <SearchSelect
          value={productTypeId}
          onChange={onProductTypeChange}
          items={productTypes}
          getLabel={(item) => item.name}
          getSearchString={(item) => item.name}
          getId={(item) => String(item.id)}
          placeholder="Select Product Type"
        />
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center justify-center p-2 h-9 w-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0">
          <Plus size={16} />
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Product Type</span>
              <button type="button" onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
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
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={handleCreate} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
