'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  FileText,
  Layers,
  RefreshCw,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Tag,
  Grid,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PendingInvoiceGroupItem,
  InvoicePrintLayoutFormat,
  InvoiceDocType,
} from '@/types/invoicePrint';
import { invoicePrintService } from '@/services/invoicePrint.service';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function PrintInvoiceClient() {
  // Main Data State
  const [pendingGroups, setPendingGroups] = useState<PendingInvoiceGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printingFormat, setPrintingFormat] = useState<string | null>(null);

  // Multiselect state
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [docType, setDocType] = useState<InvoiceDocType>('challan');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch Pending Invoice Counts
  const fetchPendingCounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await invoicePrintService.getPendingCounts();
      // Filter requirement: Display ONLY items having pendingCount > 0
      const filtered = (data || []).filter((item) => (item.pendingCount || 0) > 0);
      setPendingGroups(filtered);

      // Clear selection of items no longer pending
      const validIds = new Set(filtered.map((g) => g.groupId));
      setSelectedGroupIds((prev) => prev.filter((id) => validIds.has(id)));
    } catch (err: any) {
      console.error('Failed to fetch pending invoice counts:', err);
      setError('Failed to load pending invoice counts. Please check backend connection.');
      toast.error('Failed to load pending invoice counts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCounts();
  }, [fetchPendingCounts]);

  // Search Filtering
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return pendingGroups;
    const q = searchQuery.toLowerCase();
    return pendingGroups.filter(
      (g) =>
        g.groupName?.toLowerCase().includes(q) ||
        String(g.groupId).includes(q) ||
        String(g.pendingCount).includes(q)
    );
  }, [pendingGroups, searchQuery]);

  // Total Pending Invoices across filtered items
  const totalPendingInvoices = useMemo(() => {
    return filteredGroups.reduce((acc, item) => acc + (item.pendingCount || 0), 0);
  }, [filteredGroups]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / itemsPerPage));
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage, itemsPerPage]);

  // Multiselect toggle handlers
  const handleToggleSelectGroup = (groupId: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const isAllSelected = useMemo(() => {
    if (filteredGroups.length === 0) return false;
    return filteredGroups.every((g) => selectedGroupIds.includes(g.groupId));
  }, [filteredGroups, selectedGroupIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(filteredGroups.map((g) => g.groupId));
    }
  };

  // Handle Print Action (Single Group or Multiselect)
  const handlePrint = async (
    groupIdsToPrint: number[],
    format: InvoicePrintLayoutFormat,
    labelDescription: string
  ) => {
    if (groupIdsToPrint.length === 0) {
      toast.warning('Please select at least one Invoice Group to print');
      return;
    }

    const toastId = toast.loading(`Generating ${labelDescription} for Group #${groupIdsToPrint.join(', ')}...`);
    setPrintingFormat(`${format}-${groupIdsToPrint.join(',')}`);

    try {
      await invoicePrintService.printInvoices(groupIdsToPrint, format, docType);
      toast.success(`${labelDescription} generated successfully!`, { id: toastId });
      // Re-fetch pending counts since printed items transition out of pending
      fetchPendingCounts();
    } catch (err: any) {
      console.error('Print invoice error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to print invoices';
      toast.error(msg, { id: toastId });
    } finally {
      setPrintingFormat(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Groups</p>
            <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {pendingGroups.length}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Pending Invoices</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {totalPendingInvoices}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Selected Groups</p>
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {selectedGroupIds.length}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CheckSquare className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Doc Format Type</p>
            <div className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {docType}
              </span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Printer className="h-6 w-6" />
          </div>
        </div>
      </div>
      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Multiselect Action Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Search & Doc Type */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by group name or group ID..."
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Doc Type Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Doc Type:
                </span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as InvoiceDocType)}
                  className="px-3 py-2 text-xs font-bold uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="challan">Challan</option>
                  <option value="invoice">Invoice</option>
                </select>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchPendingCounts}
                disabled={loading}
                className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
                title="Refresh Pending Counts"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Top 3 Print Buttons for Multiselect */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
              >
                {isAllSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
              </button>

              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {selectedGroupIds.length} group(s) selected for bulk print
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Button 1: 1x1 Thermal Label */}
              <button
                onClick={() => handlePrint(selectedGroupIds, '1x1', '1x1 Thermal Label')}
                disabled={selectedGroupIds.length === 0 || Boolean(printingFormat)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {printingFormat?.startsWith('1x1-') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4" />
                )}
                <span>1x1 Thermal Label ({selectedGroupIds.length})</span>
              </button>

              {/* Button 2: 1x4 Sheet Format */}
              <button
                onClick={() => handlePrint(selectedGroupIds, '1x4', '1x4 Sheet Format')}
                disabled={selectedGroupIds.length === 0 || Boolean(printingFormat)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {printingFormat?.startsWith('1x4-') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Grid className="h-4 w-4" />
                )}
                <span>1x4 Sheet Format ({selectedGroupIds.length})</span>
              </button>

              {/* Button 3: Multi-Item Packing Slip */}
              <button
                onClick={() => handlePrint(selectedGroupIds, 'multi', 'Multi-Item Packing Slip')}
                disabled={selectedGroupIds.length === 0 || Boolean(printingFormat)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {printingFormat?.startsWith('multi-') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>Multi-Item Slip ({selectedGroupIds.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 w-20 text-center">S.No</th>
                <th className="py-3.5 px-4">Group Name</th>
                <th className="py-3.5 px-4 w-40 text-center">Pending Count</th>
                <th className="py-3.5 px-4 text-right">Print Actions (Per Group)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-xs font-medium">Fetching pending invoice groups...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-red-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <p className="text-sm font-semibold">{error}</p>
                      <button
                        onClick={fetchPendingCounts}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No Pending Invoices Found!
                      </p>
                      <p className="text-xs text-slate-400">
                        {searchQuery
                          ? 'No pending groups match your search query.'
                          : 'All created invoices have been printed.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group, idx) => {
                  const isSelected = selectedGroupIds.includes(group.groupId);
                  const isPrintingThis = printingFormat?.includes(`-${group.groupId}`);
                  const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={group.groupId}
                      className={`group hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-50/60 dark:bg-slate-800/70' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectGroup(group.groupId)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Serial Number */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          {serialNumber}
                        </span>
                      </td>

                      {/* Group Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {group.groupName}
                        </div>
                      </td>

                      {/* Pending Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 rounded-full">
                          {group.pendingCount} Pending
                        </span>
                      </td>

                      {/* Row 3 Print Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* 1x1 Thermal Label */}
                          <button
                            onClick={() => handlePrint([group.groupId], '1x1', '1x1 Thermal Label')}
                            disabled={Boolean(printingFormat)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-40"
                            title="Print 1x1 Thermal Label (4x6 format)"
                          >
                            <Tag className="h-3.5 w-3.5" />
                            <span>1x1 Label</span>
                          </button>

                          {/* 1x4 Sheet Format */}
                          <button
                            onClick={() => handlePrint([group.groupId], '1x4', '1x4 Sheet Format')}
                            disabled={Boolean(printingFormat)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-40"
                            title="Print 1x4 Sheet Format (4 invoices per sheet)"
                          >
                            <Grid className="h-3.5 w-3.5" />
                            <span>1x4 Sheet</span>
                          </button>

                          {/* Multi-Item Packing Slip */}
                          <button
                            onClick={() => handlePrint([group.groupId], 'multi', 'Multi-Item Packing Slip')}
                            disabled={Boolean(printingFormat)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-40"
                            title="Print Multi-Item Consolidated Packing Slip"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Multi Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {PER_PAGE_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span>entries per page</span>
          </div>

          <div>
            Showing {filteredGroups.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredGroups.length)} of {filteredGroups.length}{' '}
            Pending Invoice Groups
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
