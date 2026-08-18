'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Download, RefreshCw, Search, Loader2, 
  ChevronLeft, ChevronRight, ShieldAlert, Phone, Mail, 
  FileText, CheckCircle2, AlertTriangle, Filter, Calendar, User
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import BlacklistModal, { BlacklistCustomer } from './BlacklistModal';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

// Helper to parse NDJSON or JSON array
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

export default function CustomerBlacklistClient() {
  // Main Data State
  const [blacklist, setBlacklist] = useState<BlacklistCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<BlacklistCustomer | null>(null);
  const [exporting, setExporting] = useState(false);

  // Pagination (Client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch Blacklist Data from API
  const fetchBlacklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/order/customer-blacklist', {
        headers: { Accept: 'application/json, application/x-ndjson' },
      });
      const parsed = parseNdjson(response.data);
      setBlacklist(parsed);
    } catch (err: any) {
      console.error('Fetch blacklist error:', err);
      setError('Failed to load customer blacklist data');
      toast.error('Failed to load customer blacklist data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  // Search Filtering Logic
  const filteredBlacklist = useMemo(() => {
    if (!searchQuery.trim()) return blacklist;
    const q = searchQuery.toLowerCase();
    return blacklist.filter((item) => {
      const m = item.mobile ? item.mobile.toLowerCase() : '';
      const altM = item.alternateMobile ? item.alternateMobile.toLowerCase() : '';
      const e = item.email ? item.email.toLowerCase() : '';
      const r = item.reason ? item.reason.toLowerCase() : '';
      const creator = item.createdByName ? item.createdByName.toLowerCase() : '';
      return m.includes(q) || altM.includes(q) || e.includes(q) || r.includes(q) || creator.includes(q);
    });
  }, [blacklist, searchQuery]);

  // Paginated Subset
  const totalPages = Math.max(1, Math.ceil(filteredBlacklist.length / itemsPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBlacklist.slice(start, start + itemsPerPage);
  }, [filteredBlacklist, currentPage, itemsPerPage]);

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

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (customer: BlacklistCustomer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  // Download Excel Function
  const handleExportExcel = async () => {
    setExporting(true);
    const toastId = toast.loading('Exporting customer blacklist to Excel...');
    try {
      const headers = ['ID', 'Mobile Number', 'Alternate Mobile', 'Email Address', 'Reason', 'Status', 'Created By', 'Created At'];
      const rows = filteredBlacklist.map((item) => [
        item.id,
        item.mobile || '',
        item.alternateMobile || '',
        item.email || '',
        item.reason || '',
        item.isActive !== false ? 'Active' : 'Inactive',
        item.createdByName || item.createdBy || '',
        item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `customer_blacklist_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Blacklist data exported successfully!', { id: toastId });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export blacklist data.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full">
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
            placeholder="Search by Mobile, Email, Reason..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-slate-500 self-end sm:self-auto ml-auto">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              {PER_PAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchBlacklist}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Blacklist"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-red-600' : ''} />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || blacklist.length === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Download size={14} className="text-red-600 dark:text-red-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Customer to Blacklist</span>
          </button>
        </div>
      </div>

        {/* Blacklist Table Container */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4 pl-6 w-16">S.No</th>
                  <th className="p-4">Mobile Number</th>
                  <th className="p-4">Alternate Mobile</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Blacklist Reason</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Created By</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-red-600" />
                        <span>Loading customer blacklist data...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldAlert size={32} className="text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold text-slate-600 dark:text-slate-400">No Blacklist Entries Found</span>
                        <span className="text-xs text-slate-400">Click &quot;Add Customer to Blacklist&quot; to create a new entry.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((item, idx) => {
                    const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 pl-6 font-mono font-medium text-slate-500 dark:text-slate-400">
                          {serialNumber}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{item.mobile}</span>
                          </div>
                        </td>

                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                          {item.alternateMobile ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone size={12} className="text-slate-400" />
                              {item.alternateMobile}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                          {item.email ? (
                            <div className="flex items-center gap-1.5">
                              <Mail size={13} className="text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-xs">{item.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs">
                          {item.reason ? (
                            <span className="truncate block" title={item.reason}>{item.reason}</span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No reason specified</span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isActive !== false
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isActive !== false ? 'bg-red-500' : 'bg-slate-400'}`} />
                            {item.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="p-4 text-slate-600 dark:text-slate-400 text-[11px]">
                          <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <User size={12} className="text-slate-400" />
                            <span>{item.createdByName || `User #${item.createdBy || 1}`}</span>
                          </div>
                          {item.createdAt && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </td>

                        <td className="p-4 pr-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:hover:bg-red-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition-all"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredBlacklist.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 gap-3">
              <div>
                Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredBlacklist.length)}</span> of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredBlacklist.length}</span> entries
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
                        ? 'bg-red-600 text-white shadow-xs'
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

      {/* CREATE & EDIT BLACKLIST MODAL */}
      <BlacklistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchBlacklist}
        customer={editingCustomer}
      />
    </div>
  );
}
