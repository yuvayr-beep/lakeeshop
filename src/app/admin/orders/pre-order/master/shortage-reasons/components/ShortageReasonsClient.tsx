'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Loader2, ChevronLeft, ChevronRight, FolderOpen, AlertCircle, 
  RefreshCw, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { PreorderShortageReason } from '@/types/preorderMaster';
import { preorderMasterService } from '@/services/preorderMaster.service';

export default function ShortageReasonsClient() {
  const [reasonsList, setReasonsList] = useState<PreorderShortageReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch list from service (NDJSON stream)
  const fetchReasons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await preorderMasterService.getShortageReasons();
      setReasonsList(data);
    } catch (err: any) {
      console.error('Error loading preorder shortage reasons:', err);
      setError('Failed to load pre-order shortage reason master records.');
      toast.error('Failed to load shortage reasons list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  // Statistics
  const stats = useMemo(() => {
    const total = reasonsList.length;
    const active = reasonsList.filter((r) => r.status).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [reasonsList]);

  // Search & Filtered records
  const filteredReasons = useMemo(() => {
    return reasonsList.filter((item) => {
      // Status Filter
      if (statusFilter === 'ACTIVE' && !item.status) return false;
      if (statusFilter === 'INACTIVE' && item.status) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const codeMatch = item.reasonCode?.toLowerCase().includes(q) ?? false;
      const nameMatch = item.reasonName?.toLowerCase().includes(q) ?? false;
      const descMatch = item.description?.toLowerCase().includes(q) ?? false;
      const idMatch = item.id?.toString().includes(q) ?? false;

      return codeMatch || nameMatch || descMatch || idMatch;
    });
  }, [reasonsList, searchQuery, statusFilter]);

  // Paginated records
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReasons.slice(start, start + itemsPerPage);
  }, [filteredReasons, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredReasons.length / itemsPerPage));

  // Pagination page numbers list
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

  const startIdx = filteredReasons.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredReasons.length);
  const totalCount = filteredReasons.length;

  // Export CSV Helper
  const handleExportCsv = () => {
    if (filteredReasons.length === 0) {
      toast.error('No records available to export');
      return;
    }
    const headers = ['ID', 'Reason Code', 'Reason Name', 'Description', 'Status', 'Created At'];
    const csvRows = filteredReasons.map((r) => [
      r.id,
      `"${(r.reasonCode || '').replace(/"/g, '""')}"`,
      `"${(r.reasonName || '').replace(/"/g, '""')}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.status ? 'Active' : 'Inactive',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-',
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `preorder_shortage_reasons_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Shortage reasons exported successfully');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden font-sans">
      {/* Toolbar: Search, Filters & Actions */}
      <div className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2.5 w-full md:flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by reason code, name, description or ID…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
              setCurrentPage(1);
            }}
            className="h-10 px-3 text-xs bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchReasons}
            className="flex items-center justify-center w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm shrink-0"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Fetching shortage reason records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchReasons}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <FolderOpen size={44} className="text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium">No shortage reasons found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
                <tr className="border-b border-slate-200 dark:border-slate-800/80">
                  <th className="w-16 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">#</th>
                  <th className="w-20 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">ID</th>
                  <th className="w-56 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Reason Code</th>
                  <th className="w-72 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Reason Name</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">Description</th>
                  <th className="w-36 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Created At</th>
                  <th className="w-32 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center select-none">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {paginated.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center tabular-nums">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-center tabular-nums">
                      {item.id}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate">
                      <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60">
                        {item.reasonCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.reasonName}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-normal text-slate-600 dark:text-slate-400 leading-relaxed truncate" title={item.description}>
                      {item.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 text-center tabular-nums">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                        item.status 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {item.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && filteredReasons.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans flex-shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 select-none">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{startIdx}</span> to{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{endIdx}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCount}</span> entries
            </div>

            <div className="flex items-center gap-4">
              {/* Rows Per Page */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold select-none">Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers.map((pn, idx) =>
                  typeof pn === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={`page-${pn}`}
                      onClick={() => setCurrentPage(pn)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        pn === currentPage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {pn}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
