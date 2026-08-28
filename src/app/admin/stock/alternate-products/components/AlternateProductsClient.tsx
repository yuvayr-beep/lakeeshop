'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Trash2, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, ChevronDown, ArrowUpDown, Download, Shuffle,
  Boxes, Loader2, ArrowUp, ArrowDown, Upload, Edit3, FileText, Check
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import AlternateModal from './AlternateModal';
import Modal from '@/components/ui/Modal';

interface AlternateProductChild {
  alternateId: number;
  productId: number;
  alternateProductId: number;
  alternateProductName: string;
  alternateProductSku: string;
  priority: number;
}

interface PrimaryProductRelation {
  productId: number;
  productName: string;
  productSku: string;
  alternates: AlternateProductChild[];
}

const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    if ('success' in raw && 'data' in raw) {
      return parseNdjson(raw.data);
    }
    return [raw];
  }
  const str = String(raw).trim();
  if (!str) return [];

  const lines = str.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: any[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed && Array.isArray(parsed.data)) {
        results.push(...parsed.data);
      } else {
        results.push(parsed);
      }
    } catch {
      // skip unparseable line
    }
  }

  return results;
};

const loadSheetJS = () => {
  return new Promise<any>((resolve, reject) => {
    if ((window as any).XLSX) {
      resolve((window as any).XLSX);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

export default function AlternateProductsClient() {
  const [relations, setRelations] = useState<PrimaryProductRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<keyof PrimaryProductRelation>('productName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Row Expansion State - Default ALWAYS COLLAPSED
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(() => new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<{ id: number; name: string; sku: string } | null>(null);

  // Delete Confirm Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ alternateId: number; name: string } | null>(null);

  // Export State
  const [exportingExcel, setExportingExcel] = useState(false);

  // Bulk Upload Expandable Area State
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[] | null>(null);
  const [dragActiveUpload, setDragActiveUpload] = useState(false);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveUpload(true);
    } else if (e.type === 'dragleave') {
      setDragActiveUpload(false);
    }
  };

  const handleUploadDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveUpload(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setSelectedUploadFile(file);
      } else {
        toast.error('Invalid file format. Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Fetch all products and their alternate products
  const fetchAlternateRelations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch all base products
      const pRes = await axiosInstance.get('/prod/products', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsedProducts = parseNdjson(pRes.data);

      // Create product lookup map
      const productMap = new Map<number, { name: string; sku: string }>();
      parsedProducts.forEach((p: any) => {
        const id = Number(p.id);
        if (id) {
          productMap.set(id, {
            name: p.baseProductName || `Product #${id}`,
            sku: p.defaultSku || `SKU-${id}`,
          });
        }
      });

      // 2. Fetch alternates for each product
      const relationList: PrimaryProductRelation[] = [];

      await Promise.all(
        parsedProducts.map(async (p: any) => {
          const pid = Number(p.id);
          if (!pid) return;
          try {
            const altRes = await axiosInstance.get(`/prod/alternate/product/${pid}`, {
              headers: { Accept: 'application/x-ndjson' },
            });
            const altData = parseNdjson(altRes.data);
            if (altData && Array.isArray(altData) && altData.length > 0) {
              const children: AlternateProductChild[] = altData.map((item: any) => {
                const altPid = Number(item.alternateProductId);
                const altLookup = productMap.get(altPid);
                return {
                  alternateId: item.alternateId,
                  productId: pid,
                  alternateProductId: altPid,
                  alternateProductName: altLookup?.name || `Alternate #${altPid}`,
                  alternateProductSku: altLookup?.sku || `ALT-${altPid}`,
                  priority: item.priority || 1,
                };
              });

              children.sort((a, b) => a.priority - b.priority);

              relationList.push({
                productId: pid,
                productName: p.baseProductName || `Product #${pid}`,
                productSku: p.defaultSku || `SKU-${pid}`,
                alternates: children,
              });
            }
          } catch {
            // Ignore if no alternates for this product
          }
        })
      );

      // Default state: Keep data ALWAYS COLLAPSED
      setExpandedRowIds(new Set());

      relationList.sort((a, b) => a.productName.localeCompare(b.productName));
      setRelations(relationList);
    } catch (err: any) {
      console.error('Failed to fetch alternate product relations:', err);
      setError('Failed to load alternate product relations. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlternateRelations();
  }, [fetchAlternateRelations]);

  // Toggle Row Expansion
  const toggleRow = (productId: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const expandAll = () => setExpandedRowIds(new Set(relations.map((r) => r.productId)));
  const collapseAll = () => setExpandedRowIds(new Set());

  // Filtered & Sorted Relations
  const filteredRelations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return relations;

    return relations.filter((parent) => {
      const parentMatches =
        parent.productName.toLowerCase().includes(query) ||
        parent.productSku.toLowerCase().includes(query) ||
        String(parent.productId).includes(query);

      const childMatches = parent.alternates.some(
        (child) =>
          child.alternateProductName.toLowerCase().includes(query) ||
          child.alternateProductSku.toLowerCase().includes(query) ||
          String(child.alternateProductId).includes(query)
      );

      return parentMatches || childMatches;
    });
  }, [relations, searchQuery]);

  const sortedRelations = useMemo(() => {
    return [...filteredRelations].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRelations, sortField, sortOrder]);

  // Pagination Math
  const totalPages = Math.ceil(sortedRelations.length / itemsPerPage) || 1;
  const paginatedRelations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRelations.slice(start, start + itemsPerPage);
  }, [sortedRelations, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const handleSort = (field: keyof PrimaryProductRelation) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Move priority up / down inline
  const handleMovePriority = async (parent: PrimaryProductRelation, index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= parent.alternates.length) return;

    const itemA = parent.alternates[index];
    const itemB = parent.alternates[targetIndex];

    const newPriorityA = targetIndex + 1;
    const newPriorityB = index + 1;

    const toastId = toast.loading('Updating priority...');
    try {
      await Promise.all([
        axiosInstance.put(`/prod/alternate/${itemA.alternateId}`, {
          productId: itemA.productId,
          alternateProductId: itemA.alternateProductId,
          priority: newPriorityA,
          clientId: 0,
        }),
        axiosInstance.put(`/prod/alternate/${itemB.alternateId}`, {
          productId: itemB.productId,
          alternateProductId: itemB.alternateProductId,
          priority: newPriorityB,
          clientId: 0,
        }),
      ]);

      toast.success('Priority updated successfully!', { id: toastId });
      fetchAlternateRelations();
    } catch (err: any) {
      console.error('Failed to update priority:', err);
      toast.error('Failed to update priority', { id: toastId });
    }
  };

  // Delete Single Alternate Relationship
  const handleDeleteAlternate = (alternateId: number, name: string) => {
    setItemToDelete({ alternateId, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAlternate = async () => {
    if (!itemToDelete) return;
    const { alternateId, name } = itemToDelete;
    setDeleteConfirmOpen(false);
    setItemToDelete(null);

    const toastId = toast.loading(`Deleting alternate product "${name}"...`);
    try {
      await axiosInstance.delete(`/prod/alternate/${alternateId}`);
      toast.success('Alternate mapping deleted successfully!', { id: toastId });
      fetchAlternateRelations();
    } catch (err: any) {
      console.error('Failed to delete alternate mapping:', err);
      toast.error('Failed to delete alternate mapping.', { id: toastId });
    }
  };

  // Download Template Excel using official API endpoint
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    const toastId = toast.loading('Downloading Excel template...');
    try {
      const response = await axiosInstance.post(
        '/prod/alternate/template',
        {
          prepopulateAll: true,
          fields: [],
        },
        {
          responseType: 'blob',
          headers: {
            Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Type': 'application/json',
          },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alternate_products_template_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Failed to download template:', err);
      toast.error('Failed to download template from server', { id: toastId });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Upload Excel file directly to backend API
  const handleUploadExcel = async () => {
    if (!selectedUploadFile) return;
    setUploadingExcel(true);
    setUploadResults(null);
    const toastId = toast.loading('Uploading and processing alternate products file...');

    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);

      const response = await axiosInstance.post('/prod/alternate/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/x-ndjson',
        },
      });

      const parsedNdjson = parseNdjson(response.data);

      const processResults = parsedNdjson.map((item: any, idx: number) => ({
        sku: item.key || `Row ${idx + 2}`,
        productName: item.key ? `Mapping` : `Row ${idx + 2}`,
        success: Boolean(item.success),
        message: item.message || (item.success ? 'Alternate mapping updated successfully' : 'Error processing row'),
      }));

      setUploadResults(processResults);
      const successCount = processResults.filter((x) => x.success).length;
      const failCount = processResults.filter((x) => !x.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully processed ${successCount} alternate mappings!`, { id: toastId });
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Processed ${successCount} successfully, ${failCount} failed.`, { id: toastId });
      } else {
        toast.error(`Failed to process ${failCount} rows.`, { id: toastId });
      }

      fetchAlternateRelations();
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload and process Excel file.', { id: toastId });
    } finally {
      setUploadingExcel(false);
    }
  };

  // Export Errors Excel from upload summary
  const handleExportErrorsExcel = async () => {
    if (!uploadResults || uploadResults.length === 0) return;
    const errorRows = uploadResults.filter((r) => !r.success);
    const dataToExport = errorRows.length > 0 ? errorRows : uploadResults;

    const toastId = toast.loading('Exporting error report to Excel...');
    try {
      const headers = ['Mapping / Line', 'Row Info', 'Status', 'Error Details'];
      const rows = dataToExport.map((row) => [
        row.sku,
        row.productName,
        row.success ? 'Success' : 'Failed',
        row.message,
      ]);

      const XLSX = await loadSheetJS();
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 60 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alternate Import Errors');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alternate_import_errors_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${dataToExport.length} rows to Excel`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export error report', { id: toastId });
    }
  };

  // Export Main List to Excel
  const handleExportExcel = async () => {
    if (relations.length === 0) {
      toast.error('No alternate products data available to export.');
      return;
    }

    setExportingExcel(true);
    const toastId = toast.loading('Generating Excel file...');

    try {
      const headers = [
        'Primary Product ID',
        'Primary SKU Code',
        'Primary Product Name',
        'Alternate Product ID',
        'Alternate SKU Code',
        'Alternate Product Name',
        'Priority',
      ];

      const rows: any[] = [];
      relations.forEach((parent) => {
        if (parent.alternates && parent.alternates.length > 0) {
          parent.alternates.forEach((child) => {
            rows.push([
              parent.productId,
              parent.productSku,
              parent.productName,
              child.alternateProductId,
              child.alternateProductSku,
              child.alternateProductName,
              child.priority,
            ]);
          });
        }
      });

      const XLSX = await loadSheetJS();
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet['!cols'] = [
        { wch: 18 },
        { wch: 22 },
        { wch: 35 },
        { wch: 20 },
        { wch: 22 },
        { wch: 35 },
        { wch: 10 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alternate Products');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alternate_products_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${rows.length} alternate mappings to Excel`, { id: toastId });
    } catch (err: any) {
      console.error('Failed to export Excel:', err);
      toast.error('Failed to generate Excel file.', { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Main Control Card / Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        {/* Single Line Toolbar containing Search, Expand All, Collapse All, Refresh, Export Excel, Upload, Create Alternate */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          {/* Search Input Box */}
          <div className="relative w-full xl:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search primary or alternate products by name/SKU..."
              className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium"
            />
          </div>

          {/* Action Toolbar Controls in same line */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end w-full xl:w-auto">
            {/* 2nd: Expand All and Collapse All buttons with same style used in admin/stock/product-relations */}
            <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2.5 mr-1">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                Collapse All
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchAlternateRelations}
              disabled={loading}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
              title="Refresh List"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || relations.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Export Excel</span>
            </button>

            {/* Upload Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowUploadArea(!showUploadArea);
                setUploadResults(null);
              }}
              className={`flex items-center justify-center gap-2 h-9 px-4 text-xs font-bold rounded-xl shadow-sm transition-all border ${
                showUploadArea
                  ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                  : 'bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
              }`}
            >
              <Upload size={14} />
              <span>Upload</span>
            </button>

            {/* 6th: Change Create Alternate Relation button name to "Create Alternate" */}
            <button
              type="button"
              onClick={() => {
                setSelectedProductForEdit(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus size={15} />
              <span>Create Alternate</span>
            </button>
          </div>
        </div>

        {/* Upload Files Expandable Area */}
        {showUploadArea && (
          <div className="mt-5 bg-slate-50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Bulk Alternate Products Upload via Excel
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Download the template Excel sheet, fill in the details, and upload it below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadArea(false);
                  setSelectedUploadFile(null);
                  setUploadResults(null);
                }}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
              <div
                onClick={() => uploadInputRef.current?.click()}
                onDragEnter={handleUploadDrag}
                onDragLeave={handleUploadDrag}
                onDragOver={handleUploadDrag}
                onDrop={handleUploadDrop}
                className={`flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all p-4 text-center ${
                  dragActiveUpload
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-slate-350 hover:border-blue-500 dark:border-slate-750 dark:hover:border-blue-500 bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                    <FileText size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {selectedUploadFile ? (
                      <span className="text-blue-600 font-bold">{selectedUploadFile.name}</span>
                    ) : (
                      <span>
                        Drag your file here or <span className="text-blue-600 hover:underline font-bold">Browse</span>
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-450">File format: .xls & .xlsx</p>
                </div>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedUploadFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-750 transition-colors shadow-sm"
                >
                  <Download size={12} />
                  Download Template Excel
                </button>

                {selectedUploadFile && (
                  <button
                    type="button"
                    onClick={handleUploadExcel}
                    disabled={uploadingExcel}
                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
                  >
                    {uploadingExcel ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {uploadingExcel ? 'Uploading...' : 'Submit Upload'}
                  </button>
                )}
              </div>

              {/* Upload Processing Summary */}
              {uploadResults && (
                <div className="w-full max-w-xl border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col max-h-[220px] mt-2">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-350">
                        Import Processing Summary
                      </span>
                      {uploadResults.filter((x) => !x.success).length > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <AlertCircle size={10} />
                          {uploadResults.filter((x) => !x.success).length} Errors
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-bold font-mono">
                        {uploadResults.length} Processed
                      </span>
                      <button
                        type="button"
                        onClick={handleExportErrorsExcel}
                        title="Download Errors Excel Report"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Download size={12} />
                        <span className="text-[11px]">Errors Excel</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-850 p-2 space-y-1">
                    {uploadResults.map((row, idx) => (
                      <div key={`imp-${idx}`} className="flex items-center justify-between py-1.5 px-2 text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          {row.success ? (
                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                              <AlertCircle size={10} strokeWidth={3} />
                            </div>
                          )}
                          <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {row.sku}
                          </span>
                        </div>
                        <span className={`font-semibold ${row.success ? 'text-emerald-600' : 'text-red-500'}`}>
                          {row.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Primary Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading alternate product relations...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 space-y-2">
            <AlertCircle size={28} className="mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              type="button"
              onClick={fetchAlternateRelations}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              Try Again
            </button>
          </div>
        ) : sortedRelations.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Boxes size={32} className="text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold">No alternate product relations found.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedProductForEdit(null);
                setCreateModalOpen(true);
              }}
              className="text-xs text-blue-600 hover:underline font-bold mt-1"
            >
              + Create First Alternate Relation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 w-10 text-center"></th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    onClick={() => handleSort('productName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Primary Product & SKU</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3 px-4">Alternate Count</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {paginatedRelations.map((parent) => {
                  const isExpanded = expandedRowIds.has(parent.productId);

                  return (
                    <React.Fragment key={`parent-${parent.productId}`}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors font-medium">
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRow(parent.productId)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                            />
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {parent.productName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              SKU: {parent.productSku} (ID: #{parent.productId})
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {parent.alternates.length} Alternates
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForEdit({
                                id: parent.productId,
                                name: parent.productName,
                                sku: parent.productSku,
                              });
                              setCreateModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors"
                          >
                            <Edit3 size={13} />
                            <span>Edit Alternates</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-Table for Alternates */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30 dark:bg-slate-950/20">
                          <td colSpan={4} className="py-3 px-6">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
                              <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span>Assigned Alternate Products</span>
                                <span>Priority & Controls</span>
                              </div>
                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {parent.alternates.map((child, idx) => (
                                  <div
                                    key={`child-${child.alternateId}`}
                                    className="flex items-center justify-between px-4 py-2 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                        {child.priority}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                          {child.alternateProductName}
                                        </p>
                                        <p className="font-mono text-[10px] text-slate-400">
                                          SKU: {child.alternateProductSku} (ID: #{child.alternateProductId})
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Move Priority Up / Down */}
                                      <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={() => handleMovePriority(parent, idx, 'up')}
                                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                          title="Move Priority Up"
                                        >
                                          <ArrowUp size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === parent.alternates.length - 1}
                                          onClick={() => handleMovePriority(parent, idx, 'down')}
                                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                          title="Move Priority Down"
                                        >
                                          <ArrowDown size={13} />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAlternate(child.alternateId, child.alternateProductName)}
                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                        title="Delete Alternate Relation"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && sortedRelations.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <span>Showing</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>
              <span>to</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(currentPage * itemsPerPage, sortedRelations.length)}
              </span>
              <span>of</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {sortedRelations.length}
              </span>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 px-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 font-bold text-slate-800 dark:text-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Alternate Modal */}
      <AlternateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchAlternateRelations}
        preselectedProduct={selectedProductForEdit}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Confirm Delete"
        subtitle="This action will remove the alternate product mapping."
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteAlternate}
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
            >
              Delete Relation
            </button>
          </>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-400 py-2">
          Are you sure you want to delete the alternate mapping for{' '}
          <strong className="text-slate-800 dark:text-slate-200">{itemToDelete?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}
