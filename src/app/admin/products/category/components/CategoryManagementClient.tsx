'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Search, Trash2, Edit3, RefreshCw, Folder, FolderOpen, 
  ChevronLeft, ChevronRight, AlertCircle, ChevronDown, ArrowUpDown, Sparkles, Download
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import CategoryModal from './CategoryModal';

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

export default function CategoryManagementClient() {
  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  
  // Selection and Sorting
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<keyof Category>('categoryName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Row expansion state for tree hierarchy
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Export State
  const [exportingExcel, setExportingExcel] = useState(false);

  // Parse NDJSON response helper
  const parseNdjson = (rawString: any): Category[] => {
    if (typeof rawString === 'string') {
      const parsed: Category[] = [];
      rawString.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            parsed.push(JSON.parse(trimmed));
          } catch (e) {
            console.error('Error parsing NDJSON line:', trimmed, e);
          }
        }
      });
      return parsed;
    }
    if (Array.isArray(rawString)) {
      return rawString;
    }
    return [];
  };

  // Fetch Categories List
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/prod/categories/client/0/export', {
        headers: {
          Accept: 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
      });
      const parsedData = parseNdjson(response.data);
      setCategories(parsedData);
      setSelectedIds([]);
      setExpandedRowIds(new Set()); // Reset expansions on reload
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Single Deletion
  const handleDeleteCategory = async (categoryId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }

    const toastId = toast.loading(`Deleting category "${name}"...`);
    try {
      await axiosInstance.delete(`/prod/categories/${categoryId}`);
      toast.success('Category deleted successfully!', { id: toastId });
      fetchCategories();
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete category.';
      toast.error(errMsg, { id: toastId });
    }
  };

  // Bulk Deletion
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected categories?`)) {
      return;
    }

    const toastId = toast.loading(`Deleting ${selectedIds.length} categories...`);
    try {
      await Promise.all(selectedIds.map((id) => axiosInstance.delete(`/prod/categories/${id}`)));
      toast.success('Selected categories deleted successfully!', { id: toastId });
      setSelectedIds([]);
      fetchCategories();
    } catch (err: any) {
      console.error('Failed to delete some categories:', err);
      toast.error('Failed to delete some selected categories. Please check dependencies and try again.', { id: toastId });
      fetchCategories();
    }
  };

  // Open Edit Modal
  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  // Open Create Modal
  const handleCreateClick = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  // Format Path
  const formatPath = (jsonPath: Record<string, string> | string | any) => {
    if (!jsonPath) return '-';
    let pathMap = jsonPath;
    if (typeof jsonPath === 'string') {
      try {
        pathMap = JSON.parse(jsonPath);
      } catch {
        return jsonPath;
      }
    }
    if (typeof pathMap === 'object') {
      const sortedKeys = Object.keys(pathMap).sort((a, b) => Number(a) - Number(b));
      return sortedKeys.map((key) => pathMap[key]).join(' ➔ ');
    }
    return String(jsonPath);
  };

  // Find Parent Name and Code
  const getParentInfo = (parentId: number | null) => {
    if (parentId === null || parentId === undefined) return '-';
    const parent = categories.find((c) => c.categoryId === parentId);
    if (!parent) return `ID: ${parentId}`;
    return `${parent.categoryName} (${parent.categoryCode})`;
  };

  // Sort and Filter logic
  const handleSort = (field: keyof Category) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Check if hierarchy mode is active
  const isHierarchyMode = searchQuery === '' && levelFilter === 'all';

  // Toggle Row Expansion
  const toggleRowExpand = (categoryId: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Expand / Collapse all handlers
  const handleExpandAll = () => {
    const parentIds = categories
      .filter((c) => categories.some((child) => child.parentId === c.categoryId))
      .map((c) => c.categoryId);
    setExpandedRowIds(new Set(parentIds));
  };

  const handleCollapseAll = () => {
    setExpandedRowIds(new Set());
  };

  // Recursive Tree building
  const categoryTree = useMemo(() => {
    if (!isHierarchyMode) return [];

    const map = new Map<number, CategoryNode>();
    const roots: CategoryNode[] = [];

    // Initialize map
    categories.forEach((cat) => {
      map.set(cat.categoryId, {
        ...cat,
        children: [],
      });
    });

    // Populate children
    categories.forEach((cat) => {
      const node = map.get(cat.categoryId)!;
      if (cat.parentId === null || cat.parentId === undefined || !map.has(cat.parentId)) {
        roots.push(node);
      } else {
        const parentNode = map.get(cat.parentId)!;
        parentNode.children.push(node);
      }
    });

    return roots;
  }, [categories, isHierarchyMode]);

  // Recursively sort Tree Nodes
  const sortTreeNodes = useCallback((nodes: CategoryNode[]): CategoryNode[] => {
    return [...nodes]
      .map((node) => {
        if (node.children.length > 0) {
          node.children = sortTreeNodes(node.children);
        }
        return node;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === null || valA === undefined) return sortOrder === 'asc' ? 1 : -1;
        if (valB === null || valB === undefined) return sortOrder === 'asc' ? -1 : 1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' 
          ? (valA as number) - (valB as number) 
          : (valB as number) - (valA as number);
      });
  }, [sortField, sortOrder]);

  const sortedRoots = useMemo(() => {
    if (!isHierarchyMode) return [];
    return sortTreeNodes(categoryTree);
  }, [categoryTree, sortTreeNodes, isHierarchyMode]);

  // Flat filtering for Search Mode
  const filteredCategories = useMemo(() => {
    if (isHierarchyMode) return [];
    return categories
      .filter((cat) => {
        const matchSearch =
          cat.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.categoryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getParentInfo(cat.parentId).toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchLevel =
          levelFilter === 'all' ? true : String(cat.level) === levelFilter;

        return matchSearch && matchLevel;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === null || valA === undefined) return sortOrder === 'asc' ? 1 : -1;
        if (valB === null || valB === undefined) return sortOrder === 'asc' ? -1 : 1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' 
          ? (valA as number) - (valB as number) 
          : (valB as number) - (valA as number);
      });
  }, [categories, searchQuery, levelFilter, sortField, sortOrder, isHierarchyMode]);

  // Paginated Roots (for Hierarchy Mode)
  const paginatedRoots = useMemo(() => {
    if (!isHierarchyMode) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRoots.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRoots, currentPage, itemsPerPage, isHierarchyMode]);

  // Helper to flat traverse visible parts of the tree
  const getVisibleRows = useCallback((nodes: CategoryNode[], depth = 0): Array<{ node: CategoryNode; depth: number }> => {
    let rows: Array<{ node: CategoryNode; depth: number }> = [];
    nodes.forEach((node) => {
      rows.push({ node, depth });
      const hasChildren = node.children.length > 0;
      if (hasChildren && expandedRowIds.has(node.categoryId)) {
        rows = [...rows, ...getVisibleRows(node.children, depth + 1)];
      }
    });
    return rows;
  }, [expandedRowIds]);

  // Final rows to display in table
  const displayRows = useMemo(() => {
    if (isHierarchyMode) {
      return getVisibleRows(paginatedRoots);
    } else {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedCats = filteredCategories.slice(startIndex, startIndex + itemsPerPage);
      return paginatedCats.map((cat) => ({ node: cat as CategoryNode, depth: 0 }));
    }
  }, [isHierarchyMode, paginatedRoots, filteredCategories, currentPage, itemsPerPage, getVisibleRows]);

  // Total pages calculation
  const totalPages = useMemo(() => {
    if (isHierarchyMode) {
      return Math.ceil(sortedRoots.length / itemsPerPage);
    } else {
      return Math.ceil(filteredCategories.length / itemsPerPage);
    }
  }, [isHierarchyMode, sortedRoots.length, filteredCategories.length, itemsPerPage]);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  // Checkbox Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageIds = displayRows.map((r) => r.node.categoryId);
    if (e.target.checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (categoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, categoryId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  const isAllPageSelected = displayRows.length > 0 && displayRows.every((r) => selectedIds.includes(r.node.categoryId));

  const loadSheetJS = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        resolve((window as any).XLSX);
      };
      script.onerror = (err) => {
        reject(err);
      };
      document.body.appendChild(script);
    });
  };

  const handleExportExcel = async () => {
    if (categories.length === 0) {
      toast.error('No category data available to export.');
      return;
    }
    
    setExportingExcel(true);
    const toastId = toast.loading('Generating Excel file...');
    
    try {
      const listToExport = searchQuery.trim() !== '' || levelFilter !== 'all' ? filteredCategories : categories;
      
      const headers = [
        'Category ID',
        'Category Code',
        'Category Name',
        'Level',
        'Parent ID',
        'Parent Category Name & Code',
        'Full Path'
      ];
      
      const rows = listToExport.map((cat) => {
        const parentIdVal = cat.parentId;
        let parentDisplay = '-';
        if (parentIdVal !== null && parentIdVal !== undefined) {
          const parent = categories.find((c) => c.categoryId === parentIdVal);
          if (parent) {
            parentDisplay = `${parent.categoryName} (${parent.categoryCode})`;
          } else {
            parentDisplay = `ID: ${parentIdVal}`;
          }
        }
        
        return [
          cat.categoryId,
          cat.categoryCode,
          cat.categoryName,
          cat.level,
          cat.parentId ?? 'None',
          parentDisplay,
          formatPath(cat.jsonPath)
        ];
      });
      
      const XLSX = await loadSheetJS();
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-fit column widths
      const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        rows.forEach(row => {
          const val = String(row[i] ?? '');
          if (val.length > maxLen) {
            maxLen = val.length;
          }
        });
        return { wch: maxLen + 3 };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", `categories_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Successfully exported ${listToExport.length} categories to Excel`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export category data to Excel.', { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderOpen size={20} className="text-blue-600 dark:text-blue-400" />
            Product Categories
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your store hierarchical product categories, levels, and path mappings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isHierarchyMode && (
            <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2.5 mr-1">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}

          <button
            onClick={fetchCategories}
            className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || categories.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            <Download size={15} />
            Export Excel
          </button>

          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
          >
            <Plus size={15} />
            Create Category
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, code or parent..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
          />
        </div>

        {/* Level Dropdown Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-550 dark:text-slate-400 whitespace-nowrap">Level:</label>
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3.5 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
          >
            <option value="all">All Levels</option>
            <option value="1">Level 1 (Roots)</option>
            <option value="2">Level 2 (Sub-folders)</option>
            <option value="3">Level 3 (Leaf nodes)</option>
          </select>
        </div>

        {/* Page Size Selection */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-550 dark:text-slate-400 whitespace-nowrap">Rows:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-10 px-3.5 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Info mode badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          <Sparkles size={12} className="text-blue-500" />
          <span>Current View: {isHierarchyMode ? 'Folder Hierarchy View' : 'Flat Search Results'}</span>
        </div>
        {isHierarchyMode && (
          <span className="text-[10px] text-slate-400 italic">
            * Click category names or chevrons to toggle folders
          </span>
        )}
      </div>

      {/* Main Content (Table) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Fetching category records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchCategories}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : displayRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <FolderOpen size={44} className="text-slate-300 dark:text-slate-750 mb-3" />
            <p className="text-sm font-medium">No category records found</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms or filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                  {/* Checkbox Column */}
                  <th className="w-12 py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                    />
                  </th>
                  
                  {/* Code */}
                  <th 
                    className="w-36 py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors select-none"
                    onClick={() => handleSort('categoryCode')}
                  >
                    <div className="flex items-center gap-1.5">
                      Category Code
                      <ArrowUpDown size={12} className="text-slate-400" />
                    </div>
                  </th>

                  {/* Name */}
                  <th 
                    className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors select-none"
                    onClick={() => handleSort('categoryName')}
                  >
                    <div className="flex items-center gap-1.5">
                      Category Name
                      <ArrowUpDown size={12} className="text-slate-400" />
                    </div>
                  </th>

                  {/* Level */}
                  <th 
                    className="w-24 py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors select-none text-center"
                    onClick={() => handleSort('level')}
                  >
                    <div className="flex items-center gap-1.5 justify-center">
                      Level
                      <ArrowUpDown size={12} className="text-slate-400" />
                    </div>
                  </th>

                  {/* Parent Category */}
                  <th 
                    className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors select-none"
                    onClick={() => handleSort('parentId')}
                  >
                    <div className="flex items-center gap-1.5">
                      Parent Category
                      <ArrowUpDown size={12} className="text-slate-400" />
                    </div>
                  </th>

                  {/* Path */}
                  <th className="w-1/3 py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                    Path Mappings (jsonPath)
                  </th>

                  {/* Actions */}
                  <th className="w-28 py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {displayRows.map((row) => {
                  const item = row.node;
                  const isSelected = selectedIds.includes(item.categoryId);
                  const isExpanded = expandedRowIds.has(item.categoryId);
                  const hasChildren = item.children && item.children.length > 0;

                  return (
                    <tr 
                      key={item.categoryId}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                        isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(item.categoryId, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                        />
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-white truncate">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-350 px-2 py-1 rounded-md font-mono tracking-wider">
                          {item.categoryCode}
                        </span>
                      </td>

                      {/* Name with indentation guide lines */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        <div 
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: `${row.depth * 22}px` }}
                        >
                          {/* Guides for deeper levels */}
                          {row.depth > 0 && (
                            <span className="inline-block border-l border-dashed border-slate-300 dark:border-slate-800 h-6 -ml-2 mr-1" />
                          )}

                          {isHierarchyMode && hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRowExpand(item.categoryId);
                                }}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronDown size={13} className="text-slate-500 dark:text-slate-400" />
                              ) : (
                                <ChevronRight size={13} className="text-slate-500 dark:text-slate-400" />
                              )}
                            </button>
                          ) : isHierarchyMode ? (
                            <div className="w-5 h-5 flex-shrink-0" />
                          ) : null}

                          {isHierarchyMode && (
                            isExpanded ? (
                              <FolderOpen size={14} className="text-amber-500 flex-shrink-0" />
                            ) : (
                              <Folder size={14} className="text-amber-500 flex-shrink-0" />
                            )
                          )}
                          
                          <span 
                            className={`truncate select-none ${isHierarchyMode && hasChildren ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-450 hover:underline' : ''}`}
                            onClick={() => {
                              if (isHierarchyMode && hasChildren) {
                                toggleRowExpand(item.categoryId);
                              }
                            }}
                          >
                            {item.categoryName}
                          </span>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-4 text-xs font-bold text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] ${
                          item.level === 1 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450'
                            : item.level === 2
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-450'
                              : 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-450'
                        }`}>
                          Lvl {item.level}
                        </span>
                      </td>

                      {/* Parent */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                        {getParentInfo(item.parentId)}
                      </td>

                      {/* Path */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-sm">
                        <span className="text-[11px] leading-relaxed select-all">
                          {formatPath(item.jsonPath)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                            title="Edit Category"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(item.categoryId, item.categoryName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-650 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer pagination info */}
        {!loading && (isHierarchyMode ? sortedRoots.length > 0 : filteredCategories.length > 0) && (
          (() => {
            const startVal = isHierarchyMode
              ? (sortedRoots.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1)
              : (filteredCategories.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1);
              
            const endVal = isHierarchyMode
              ? Math.min(currentPage * itemsPerPage, sortedRoots.length)
              : Math.min(currentPage * itemsPerPage, filteredCategories.length);
              
            const totalVal = isHierarchyMode ? sortedRoots.length : filteredCategories.length;
            const totalLabel = isHierarchyMode ? 'root categories' : 'matching categories';

            return (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                    Showing {startVal}–{endVal} of {totalVal} {totalLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-black dark:text-slate-400">Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-slate-300"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {pageNumbers.map((pn, idx) =>
                    typeof pn === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-black dark:text-slate-400">…</span>
                    ) : (
                      <button
                        key={`page-${pn}`}
                        onClick={() => setCurrentPage(pn)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${pn === currentPage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-slate-400'
                        }`}
                      >
                        {pn}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })()
        )}

      </div>

      {/* Category Modal Popup */}
      <CategoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={fetchCategories}
        categoryToEdit={editingCategory}
        flatCategories={categories}
      />

    </div>
  );
}
