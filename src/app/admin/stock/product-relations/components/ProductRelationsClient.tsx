'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Search, Trash2, RefreshCw, ChevronLeft, ChevronRight, 
  AlertCircle, ChevronDown, ArrowUpDown, Sparkles, Download, 
  Link2, Box, Boxes, Loader2, Link
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import RelationModal from './RelationModal';
import Modal from '@/components/ui/Modal';

interface ChildProduct {
  productId: number;
  productCode: string;
  productName: string;
}

interface ParentRelation {
  parentId: number;
  parentCode: string;
  parentName: string;
  children: ChildProduct[];
}

export default function ProductRelationsClient() {
  const [relations, setRelations] = useState<ParentRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<keyof ParentRelation>('parentName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Row expansion state
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('expanded_relations_ids');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem('expanded_relations_ids', JSON.stringify(Array.from(expandedRowIds)));
  }, [expandedRowIds]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedParent, setPreselectedParent] = useState<{ id: number; name: string; code: string } | null>(null);
  
  // Export State
  const [exportingExcel, setExportingExcel] = useState(false);

  // NDJSON parser helper
  const parseNdjson = (rawString: any): ParentRelation[] => {
    if (typeof rawString === 'string') {
      const parsed: ParentRelation[] = [];
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

  // Fetch Parent-Child relations
  const fetchRelations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/stock/products/relations/parent-list', {
        headers: {
          Accept: 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
      });
      const parsedData = parseNdjson(response.data);
      setRelations(parsedData);
    } catch (err: any) {
      console.error('Failed to fetch product relations:', err);
      setError('Failed to load product relations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  // Custom Delete Confirm modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [relationToDelete, setRelationToDelete] = useState<{ childId: number; childName: string } | null>(null);

  // Single Relationship Deletion
  const handleDeleteRelation = (childId: number, childName: string) => {
    setRelationToDelete({ childId, childName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRelation = async () => {
    if (!relationToDelete) return;
    const { childId, childName } = relationToDelete;
    
    setDeleteConfirmOpen(false);
    setRelationToDelete(null);

    const toastId = toast.loading(`Deleting relation for variant "${childName}"...`);
    try {
      await axiosInstance.delete(`/stock/products/relations/${childId}`);
      toast.success('Relationship deleted successfully!', { id: toastId });
      fetchRelations();
    } catch (err: any) {
      console.error('Failed to delete relationship:', err);
      let errMsg = 'Failed to delete relationship.';
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
    }
  };

  // Open Create Modal with optional parent preselected
  const handleAddChildClick = (parent: ParentRelation) => {
    setPreselectedParent({
      id: parent.parentId,
      name: parent.parentName,
      code: parent.parentCode
    });
    setModalOpen(true);
  };

  const handleCreateClick = () => {
    setPreselectedParent(null);
    setModalOpen(true);
  };

  // Sorting Handler
  const handleSort = (field: keyof ParentRelation) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Toggle Row Expansion
  const toggleRowExpand = (parentId: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    const parentIds = relations.map((r) => r.parentId);
    setExpandedRowIds(new Set(parentIds));
  };

  const handleCollapseAll = () => {
    setExpandedRowIds(new Set());
  };

  // Sort and Filter logic
  const filteredRelations = useMemo(() => {
    return relations
      .filter((rel) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const matchParent = 
          rel.parentName.toLowerCase().includes(query) ||
          rel.parentCode.toLowerCase().includes(query);

        const matchChildren = rel.children.some((child) => 
          child.productName.toLowerCase().includes(query) ||
          child.productCode.toLowerCase().includes(query)
        );

        return matchParent || matchChildren;
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
  }, [relations, searchQuery, sortField, sortOrder]);

  // Paginated relations
  const paginatedRelations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRelations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRelations, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = Math.ceil(filteredRelations.length / itemsPerPage);

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
    if (relations.length === 0) {
      toast.error('No product relations data available to export.');
      return;
    }
    
    setExportingExcel(true);
    const toastId = toast.loading('Generating Excel file...');
    
    try {
      const headers = [
        'Parent SKU Code',
        'Parent Product Name',
        'Child SKU Code',
        'Child Product Name'
      ];
      
      const rows: any[] = [];
      relations.forEach((parent) => {
        if (parent.children && parent.children.length > 0) {
          parent.children.forEach((child) => {
            rows.push([
              parent.parentCode,
              parent.parentName,
              child.productCode,
              child.productName
            ]);
          });
        } else {
          rows.push([
            parent.parentCode,
            parent.parentName,
            'None',
            'None'
          ]);
        }
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Product Relations");
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", `product_relations_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Successfully exported ${relations.length} mappings to Excel`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export mappings data to Excel.', { id: toastId });
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
            <Boxes size={22} className="text-blue-600 dark:text-blue-400" />
            Product Relations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Map parent-variant dependencies, manage sibling items, and track sibling products.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <button
            onClick={fetchRelations}
            className="flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || relations.length === 0}
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
            Create Relation
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
            placeholder="Search by Parent or Child name, code/SKU..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 hover:border-slate-300 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
          />
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
          <span>Hierarchy list mode</span>
        </div>
        <span className="text-[10px] text-slate-400 italic">
          * Click parent rows or chevrons to display mapping variants
        </span>
      </div>

      {/* Main Content (Table) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Fetching relation mappings...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchRelations}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginatedRelations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <Boxes size={44} className="text-slate-300 dark:text-slate-750 mb-3" />
            <p className="text-sm font-medium">No product relations found</p>
            <p className="text-xs text-slate-500 mt-1">Try searching another term or create a new mapping.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                  
                  {/* Chevron expansion cell placeholder */}
                  <th className="w-12 py-3.5 px-4 text-center"></th>
                  
                  {/* Code */}
                  <th 
                    className="w-48 py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors select-none"
                    onClick={() => handleSort('parentCode')}
                  >
                    <div className="flex items-center gap-1.5">
                      Product SKU / Code
                      <ArrowUpDown size={12} className="text-slate-400" />
                    </div>
                  </th>

                  {/* Name */}
                  <th 
                    className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors select-none"
                    onClick={() => handleSort('parentName')}
                  >
                    <div className="flex items-center gap-1.5">
                      Product Name
                      <ArrowUpDown size={12} className="text-slate-400" />
                    </div>
                  </th>

                  {/* Variant Count */}
                  <th className="w-32 py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">
                    Variants
                  </th>

                  {/* Actions */}
                  <th className="w-28 py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginatedRelations.map((parent) => {
                  const isExpanded = expandedRowIds.has(parent.parentId);
                  const hasChildren = parent.children && parent.children.length > 0;

                  return (
                    <React.Fragment key={`parent-${parent.parentId}`}>
                      
                      {/* Parent Row */}
                      <tr 
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50/10 dark:bg-blue-950/5' : ''
                        }`}
                        onClick={() => toggleRowExpand(parent.parentId)}
                      >
                        {/* Expand Chevron */}
                        <td className="py-3.5 px-4 text-center">
                          {hasChildren ? (
                            <button
                              type="button"
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-650 transition-colors flex-shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronDown size={14} className="text-slate-500" />
                              ) : (
                                <ChevronRight size={14} className="text-slate-500" />
                              )}
                            </button>
                          ) : (
                            <div className="w-5 h-5 flex-shrink-0" />
                          )}
                        </td>

                        {/* SKU */}
                        <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-white truncate">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-350 px-2 py-1 rounded-md font-mono tracking-wider">
                            {parent.parentCode}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          <div className="flex items-center gap-2">
                            <Box size={14} className="text-indigo-500 flex-shrink-0" />
                            <span className="truncate">{parent.parentName}</span>
                          </div>
                        </td>

                        {/* Variant Count Badge */}
                        <td className="py-3.5 px-4 text-xs font-bold text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] ${
                            hasChildren 
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-405'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {hasChildren ? `${parent.children.length} variants` : 'No variants'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleAddChildClick(parent)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                              title="Add Sibling / Child Variant"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Child Rows */}
                      {isExpanded && hasChildren && parent.children.map((child) => (
                        <tr 
                          key={`child-${child.productId}`}
                          className="bg-slate-50/40 dark:bg-slate-900/10 hover:bg-slate-100/50 dark:hover:bg-slate-850/10 transition-colors"
                        >
                          {/* Guides for indentation */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <span className="inline-block border-l border-dashed border-slate-300 dark:border-slate-800 h-8" />
                            </div>
                          </td>

                          {/* Child SKU */}
                          <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-350 truncate">
                            <div className="flex items-center gap-2 pl-2">
                              <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono tracking-wider">
                                {child.productCode}
                              </span>
                            </div>
                          </td>

                          {/* Child Name */}
                          <td className="py-3 px-4 text-xs font-medium text-slate-650 dark:text-slate-300 truncate">
                            <div className="flex items-center gap-2">
                              <Link2 size={13} className="text-emerald-500 flex-shrink-0" />
                              <span className="truncate">{child.productName}</span>
                            </div>
                          </td>

                          {/* Empty badge placeholder for alignment */}
                          <td className="py-3 px-4 text-center"></td>

                          {/* Child delete action */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleDeleteRelation(child.productId, child.productName)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                                title="Remove Variant Relation"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer pagination info */}
        {!loading && filteredRelations.length > 0 && (
          (() => {
            const startVal = filteredRelations.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
            const endVal = Math.min(currentPage * itemsPerPage, filteredRelations.length);
            const totalVal = filteredRelations.length;

            return (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                    Showing {startVal}–{endVal} of {totalVal} parent records
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-black dark:text-slate-400">Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-slate-350"
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

      {/* Relation Modal Popup */}
      <RelationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPreselectedParent(null);
        }}
        onSuccess={fetchRelations}
        preselectedParent={preselectedParent}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRelationToDelete(null);
        }}
        title="Remove Variant Relation"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false);
                setRelationToDelete(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteRelation}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
            >
              Remove
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
              Are you sure you want to remove the variant relation?
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium leading-relaxed">
              This action will break the mapping connection for child variant <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-350">{relationToDelete?.childName}</span>.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
