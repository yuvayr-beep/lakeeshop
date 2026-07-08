'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Save, ChevronDown, ChevronRight, Folder, FolderOpen, AlertCircle, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Category {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  level: number;
  parentId: number | null;
  jsonPath: Record<string, string> | string;
  clientId?: number;
  status?: boolean;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryToEdit?: Category | null; // If passed, modal is in Edit mode
  flatCategories: Category[];
}

export default function CategoryModal({
  open,
  onClose,
  onSuccess,
  categoryToEdit,
  flatCategories,
}: CategoryModalProps) {
  const isEdit = !!categoryToEdit;

  // Form Fields
  const [categoryName, setCategoryName] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);

  // States
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Reset/populate form values on open/edit change
  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        setCategoryName(categoryToEdit.categoryName);
        setCategoryCode(categoryToEdit.categoryCode);
        setParentId(categoryToEdit.parentId);
      } else {
        setCategoryName('');
        setCategoryCode('');
        setParentId(null);
      }
      setExpandedIds(new Set());
    }
  }, [open, categoryToEdit]);

  // Build tree from flat categories, excluding the category being edited and its descendants to prevent circular reference
  const treeCategories = useMemo(() => {
    // Helper to get all descendant IDs of a category
    const getDescendantIds = (catId: number): Set<number> => {
      const descendants = new Set<number>();
      const queue = [catId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        flatCategories.forEach((c) => {
          if (c.parentId === currentId && !descendants.has(c.categoryId)) {
            descendants.add(c.categoryId);
            queue.push(c.categoryId);
          }
        });
      }
      return descendants;
    };

    const excludedIds = isEdit && categoryToEdit ? getDescendantIds(categoryToEdit.categoryId) : new Set<number>();
    if (isEdit && categoryToEdit) {
      excludedIds.add(categoryToEdit.categoryId);
    }

    const filteredCats = flatCategories.filter((c) => !excludedIds.has(c.categoryId));

    const map = new Map<number, CategoryNode>();
    const roots: CategoryNode[] = [];

    filteredCats.forEach((cat) => {
      map.set(cat.categoryId, {
        ...cat,
        children: [],
      });
    });

    filteredCats.forEach((cat) => {
      const node = map.get(cat.categoryId)!;
      if (cat.parentId === null || cat.parentId === undefined || !map.has(cat.parentId)) {
        roots.push(node);
      } else {
        const parentNode = map.get(cat.parentId)!;
        parentNode.children.push(node);
      }
    });

    return roots;
  }, [flatCategories, categoryToEdit, isEdit]);

  // Expand selected parent category ancestors automatically
  useEffect(() => {
    if (parentId && flatCategories.length > 0) {
      const ancestors = new Set<number>();
      let current = flatCategories.find((c) => c.categoryId === parentId);
      while (current && current.parentId) {
        ancestors.add(current.parentId);
        current = flatCategories.find((c) => c.categoryId === current!.parentId);
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        ancestors.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [parentId, flatCategories]);

  const parentCategory = useMemo(() => {
    if (parentId === null) return null;
    return flatCategories.find((c) => c.categoryId === parentId) || null;
  }, [parentId, flatCategories]);

  // level automatically calculated
  const level = useMemo(() => {
    if (!parentCategory) return 1;
    return parentCategory.level + 1;
  }, [parentCategory]);

  // jsonPath automatically generated
  const generatedJsonPath = useMemo(() => {
    let parentPathMap: Record<string, string> = {};
    if (parentCategory) {
      const pathRaw = parentCategory.jsonPath;
      if (typeof pathRaw === 'string') {
        try {
          parentPathMap = JSON.parse(pathRaw);
        } catch {
          parentPathMap = {};
        }
      } else if (pathRaw && typeof pathRaw === 'object') {
        parentPathMap = { ...pathRaw };
      }
    }

    const pathMap = { ...parentPathMap };
    pathMap[String(level)] = categoryName || 'Category Name';
    return pathMap;
  }, [parentCategory, level, categoryName]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error('Category Name is required.');
      return;
    }
    if (!categoryCode.trim()) {
      toast.error('Category Code is required.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating category...' : 'Creating category...');

    const payload = {
      categoryName: categoryName.trim(),
      categoryCode: categoryCode.trim().toUpperCase(),
      level,
      parentId,
      jsonPath: generatedJsonPath,
      clientId: 0,
    };

    try {
      if (isEdit && categoryToEdit) {
        await axiosInstance.put(`/prod/categories/${categoryToEdit.categoryId}`, payload);
        toast.success('Category updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/prod/categories', payload);
        toast.success('Category created successfully!', { id: toastId });
      }
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

  // Category Tree Node inside Modal
  const renderTreeNode = (node: CategoryNode) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.categoryId);
    const isSelected = node.categoryId === parentId;

    return (
      <div key={node.categoryId} className="pl-3.5 relative">
        <div className="flex items-center gap-2 py-1.5 text-xs">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(node.categoryId)}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}

          <button
            type="button"
            onClick={() => setParentId(node.categoryId)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all select-none text-left truncate flex-1 ${
              isSelected
                ? 'bg-blue-500 border-blue-600 text-white font-medium shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isExpanded ? (
              <FolderOpen size={14} className={isSelected ? 'text-white' : 'text-amber-500'} />
            ) : (
              <Folder size={14} className={isSelected ? 'text-white' : 'text-amber-500'} />
            )}
            <span className="truncate flex-1">{node.categoryName}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              L{node.level}
            </span>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-dashed border-slate-200 dark:border-slate-800 ml-1.5 pl-2 mt-0.5 space-y-0.5">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (!open) return null;

  // Path string for display preview
  const previewPathString = Object.keys(generatedJsonPath)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => generatedJsonPath[key])
    .join(' > ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {isEdit ? 'Edit Category' : 'Create Category'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? `Modifying Category ID: ${categoryToEdit?.categoryId}` : 'Add a new product category to the store'}
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

        {/* Modal Content - Dual Columns */}
        <form onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          
          {/* Left Column: Form Inputs */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[70vh] md:max-h-full border-r border-slate-150 dark:border-slate-800/80">
            {/* Category Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Smart Mobiles, Chargers"
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
              />
            </div>

            {/* Category Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                placeholder="e.g. SMT, CHR (Max 10 chars)"
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-semibold uppercase"
              />
            </div>

            {/* Level (Auto-assigned) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1.5">
                Assigned Level (Read-Only)
              </label>
              <div className="w-full h-10 px-3.5 flex items-center bg-slate-100/60 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 rounded-xl font-semibold select-none">
                Level {level}
              </div>
            </div>

            {/* Selected Parent Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">
                Selected Parent Category
              </label>
              <div className="w-full h-10 px-3.5 flex items-center justify-between bg-slate-150/40 dark:bg-slate-950/25 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-350 rounded-xl font-medium">
                <span className="truncate">
                  {parentCategory 
                    ? `${parentCategory.categoryName} (${parentCategory.categoryCode})` 
                    : 'None (Root Category)'
                  }
                </span>
                {parentId !== null && (
                  <button
                    type="button"
                    onClick={() => setParentId(null)}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-lg transition-colors ml-2"
                  >
                    Clear Parent
                  </button>
                )}
              </div>
            </div>

            {/* Path Preview */}
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 rounded-xl p-4 mt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-450 uppercase tracking-wide mb-1.5">
                <AlertCircle size={12} className="text-blue-500" />
                Category Path Preview
              </div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 leading-relaxed break-words">
                {previewPathString}
              </p>
            </div>
          </div>

          {/* Right Column: Parent Category Tree */}
          <div className="w-full md:w-[45%] p-6 overflow-y-auto max-h-[50vh] md:max-h-full flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/30">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wide mb-3 flex-shrink-0">
              Select Parent Category
            </label>
            <p className="text-[10px] text-slate-400 dark:text-slate-550 mb-4 flex-shrink-0">
              Navigate and select the parent node in the category tree below. Choose "None" by clicking "Clear Parent" on the left or selecting the option below.
            </p>

            {/* Set as Root Category Option */}
            <div className="mb-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setParentId(null)}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  parentId === null
                    ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/25 dark:border-blue-900 dark:text-blue-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800'
                }`}
              >
                ⭐ Set as Root Category (No Parent)
              </button>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950/20 p-4 space-y-1 scrollbar-thin">
              {treeCategories.length > 0 ? (
                treeCategories.map((root) => renderTreeNode(root))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  No parent categories available
                </div>
              )}
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
            {isEdit ? 'Update Category' : 'Save Category'}
          </button>
        </div>

      </div>
    </div>
  );
}
