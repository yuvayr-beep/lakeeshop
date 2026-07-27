'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, Search, Download, RefreshCw, Loader2, 
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
  Layers, Code2, Tag, ShieldAlert, Table, ListFilter
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface LookupCategory {
  id: string;
  name: string;
  endpoint: string;
  description: string;
}

const LOOKUP_CATEGORIES: LookupCategory[] = [
  { id: 'order-source', name: 'Order Source', endpoint: '/order/master/order-source', description: 'Order channel sources (Excel, API, B2B, Manual)' },
  { id: 'pricing-source', name: 'Pricing Source', endpoint: '/order/master/pricing-source', description: 'Price origin configurations (Excel, System, Hybrid)' },
  { id: 'reship-reason', name: 'Reship Reason', endpoint: '/order/master/reship-reason', description: 'Reasons for order reshipment & re-delivery' },
  { id: 'return-condition', name: 'Return Condition', endpoint: '/order/master/return-condition', description: 'Returned product physical evaluation states' },
  { id: 'return-type', name: 'Return Type', endpoint: '/order/master/return-type', description: 'Return shipment methods & channels' },
  { id: 'system-field', name: 'System Field', endpoint: '/order/master/system-field', description: 'Master list of system order ingestion fields' },
  { id: 'timeline-action', name: 'Timeline Action', endpoint: '/order/master/timeline-action', description: 'Order lifecycle tracking timeline events' },
  { id: 'invoice-trigger', name: 'Invoice Trigger', endpoint: '/order/master/invoice-trigger', description: 'Trigger points for invoice generation' },
  { id: 'validation-error', name: 'Validation Error', endpoint: '/order/master/validation-error', description: 'Order validation error codes and severities' },
  { id: 'fulfillment-source', name: 'Fulfillment Source', endpoint: '/order/master/fulfillment-source', description: 'Order fulfillment and warehouse sources' },
  { id: 'validation-status', name: 'Validation Status', endpoint: '/order/master/validation-status', description: 'Ingestion validation outcome statuses' },
  { id: 'execution-type', name: 'Execution Type', endpoint: '/order/master/execution-type', description: 'Order execution workflow types' },
  { id: 'execution-status', name: 'Execution Status', endpoint: '/order/master/execution-status', description: 'Execution lifecycle progress statuses' },
];

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

// Metadata keys to hide from UI table columns
const EXCLUDED_KEYS = new Set(['createdBy', 'updatedBy', 'createdAt', 'updatedAt']);

// NDJSON & JSON Parser helper
const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const items: any[] = [];
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          items.push(JSON.parse(trimmed));
        } catch (e) {
          console.error('Error parsing NDJSON line:', trimmed, e);
        }
      }
    });
    return items;
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === 'object') return [raw.data];
  }
  return [];
};

// Formatter for table column titles
const formatHeaderLabel = (key: string): string => {
  if (key === 'status') return 'Status';
  if (key === 'code') return 'Code';
  if (key === 'id') return 'ID';
  if (key === 'isRequired') return 'Requirement';
  if (key === 'statusName') return 'Status Name';
  if (key === 'fieldCode') return 'Field Code';
  if (key === 'fieldName') return 'Field Name';
  if (key === 'targetColumn') return 'Target Column';
  if (key === 'dataType') return 'Data Type';
  if (key === 'dateFormat') return 'Date Format';
  if (key === 'errorCode') return 'Error Code';
  if (key === 'triggerPoint') return 'Trigger Point';
  if (key === 'displayName') return 'Display Name';
  if (key === 'isTerminal') return 'Is Terminal';

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

export default function MasterLookupsClient() {
  // Selected Lookup Category
  const [selectedCategory, setSelectedCategory] = useState<LookupCategory>(LOOKUP_CATEGORIES[0]);

  // Data States
  const [lookupData, setLookupData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch Lookup Data
  const fetchLookupData = useCallback(async (category: LookupCategory) => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(category.endpoint, {
        headers: { Accept: 'application/x-ndjson, application/json' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setLookupData(parsed);
    } catch (err: any) {
      console.error(`Fetch ${category.name} error:`, err);
      setError(`Failed to load ${category.name} master data`);
      toast.error(`Failed to load ${category.name}`);
      setLookupData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on category change
  useEffect(() => {
    fetchLookupData(selectedCategory);
    setCurrentPage(1);
    setSearchQuery('');
  }, [selectedCategory, fetchLookupData]);

  // Extract visible column keys dynamically
  const visibleColumns = useMemo(() => {
    if (!lookupData || lookupData.length === 0) return [];
    const keysSet = new Set<string>();
    
    // Priority Key Order
    const priorityKeys = [
      'id', 'code', 'statusName', 'source', 'condition', 'type', 
      'fieldCode', 'fieldName', 'targetColumn', 'dataType', 'isRequired', 
      'errorCode', 'displayName', 'triggerPoint', 'severity', 'description', 
      'sequence', 'isTerminal', 'status'
    ];

    lookupData.forEach((item) => {
      Object.keys(item).forEach((k) => {
        if (!EXCLUDED_KEYS.has(k)) {
          keysSet.add(k);
        }
      });
    });

    const allKeys = Array.from(keysSet);
    allKeys.sort((a, b) => {
      const idxA = priorityKeys.indexOf(a);
      const idxB = priorityKeys.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return allKeys;
  }, [lookupData]);

  // Filtered Lookup Data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return lookupData;
    const q = searchQuery.toLowerCase();
    return lookupData.filter((item) => {
      return Object.entries(item).some(([k, v]) => {
        if (EXCLUDED_KEYS.has(k) || v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(q);
      });
    });
  }, [lookupData, searchQuery]);

  // Paginated Data
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Page Numbers pagination calculation
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
  }, [currentPage, totalPages]);

  // Download Excel / CSV Function
  const handleExportExcel = () => {
    if (filteredData.length === 0 || visibleColumns.length === 0) return;
    setExporting(true);
    const toastId = toast.loading(`Exporting ${selectedCategory.name} to Excel...`);
    try {
      const headers = visibleColumns.map(formatHeaderLabel);
      const rows = filteredData.map((item) =>
        visibleColumns.map((colKey) => {
          const val = item[colKey];
          if (colKey === 'status') return val !== false ? 'Active' : 'Inactive';
          if (val === null || val === undefined) return '';
          return String(val);
        })
      );

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${selectedCategory.id}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`${selectedCategory.name} exported successfully!`, { id: toastId });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export lookup data.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // Render Table Cell Value
  const renderCellValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-400 text-[11px] italic">-</span>;
    }

    // Status formatting (status true = active, false = inactive)
    if (key === 'status') {
      const isActive = value !== false;
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      );
    }

    // Requirement formatting
    if (key === 'isRequired') {
      const req = Boolean(value);
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
          req
            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {req ? '* Required' : 'Optional'}
        </span>
      );
    }

    // Is Terminal formatting
    if (key === 'isTerminal') {
      const terminal = Boolean(value);
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
          terminal
            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {terminal ? 'Yes' : 'No'}
        </span>
      );
    }

    // Severity formatting
    if (key === 'severity') {
      const sev = Number(value);
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
          sev === 1
            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
        }`}>
          {sev === 1 ? 'High (1)' : 'Medium (2)'}
        </span>
      );
    }

    // Code & IDs formatting
    if (key === 'code' || key === 'id' || key === 'stateCode') {
      return (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px]">
          {String(value)}
        </span>
      );
    }

    // Field Code formatting
    if (key === 'fieldCode' || key === 'errorCode') {
      return (
        <span className="font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md text-[11px] border border-blue-100 dark:border-blue-900/40">
          {String(value)}
        </span>
      );
    }

    return <span className="text-slate-800 dark:text-slate-200 font-medium">{String(value)}</span>;
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 w-full">

        {/* Top Banner matching admin/products/brand */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Database size={14} />
              <span>Orders / Master Configuration</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-850 dark:text-white tracking-tight flex items-center gap-2.5">
              <Code2 className="text-blue-600 dark:text-blue-400" size={26} />
              Master Code Lookups
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
              Centralized master dictionary for order sources, pricing rules, reshipment reasons, timeline tracking actions, validation errors, and execution statuses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchLookupData(selectedCategory)}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              title="Refresh Current Lookup"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || filteredData.length === 0}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all duration-150 flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
            >
              <Download size={15} />
              <span>Export {selectedCategory.name} Excel</span>
            </button>
          </div>
        </div>

        {/* Compact Master Category Selector Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
              <ListFilter size={15} className="text-blue-600 dark:text-blue-400" />
              <span>Select Category:</span>
            </div>

            {/* Category Dropdown Select */}
            <select
              value={selectedCategory.id}
              onChange={(e) => {
                const found = LOOKUP_CATEGORIES.find((c) => c.id === e.target.value);
                if (found) setSelectedCategory(found);
              }}
              className="w-full md:w-64 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {LOOKUP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick horizontal scrollable pill tabs for fast 1-click switching */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full max-w-full md:max-w-2xl py-0.5 no-scrollbar">
            {LOOKUP_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Search within ${selectedCategory.name}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 text-slate-500 self-end sm:self-auto">
            <span className="text-[11px]">
              Showing <strong className="text-slate-800 dark:text-white">{filteredData.length}</strong> records
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Master Lookup Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4 pl-6 w-16">S.No</th>
                  {visibleColumns.map((colKey) => (
                    <th key={colKey} className="p-4">
                      {formatHeaderLabel(colKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-blue-600" />
                        <span>Loading {selectedCategory.name} records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Table size={32} className="text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold text-slate-600 dark:text-slate-400">
                          No {selectedCategory.name} Records Found
                        </span>
                        <span className="text-xs text-slate-400">No data matches your current search criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, idx) => {
                    const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 pl-6 font-mono font-medium text-slate-500 dark:text-slate-400">
                          {serialNumber}
                        </td>
                        {visibleColumns.map((colKey) => (
                          <td key={colKey} className="p-4">
                            {renderCellValue(colKey, item[colKey])}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredData.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 gap-3">
              <div>
                Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredData.length}</span> items
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>

                {pageNumbers.map((num, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={num === '...'}
                    onClick={() => typeof num === 'number' && setCurrentPage(num)}
                    className={`min-w-[32px] h-8 rounded-xl font-semibold text-xs transition-colors ${
                      num === currentPage
                        ? 'bg-blue-600 text-white shadow-xs'
                        : num === '...'
                        ? 'text-slate-400 cursor-default'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
