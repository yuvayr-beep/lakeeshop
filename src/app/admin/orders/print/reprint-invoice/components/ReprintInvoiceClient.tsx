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
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
  Grid,
  Calendar,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  InvoiceBatchItem,
  InvoiceBatchFilterParams,
} from '@/types/invoicePrint';
import { ClientItem, InvoiceGroup } from '@/types/invoiceGroup';
import { invoicePrintService } from '@/services/invoicePrint.service';
import { invoiceGroupService } from '@/services/invoiceGroup.service';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function ReprintInvoiceClient() {
  // Main Data State
  const [batches, setBatches] = useState<InvoiceBatchItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [groups, setGroups] = useState<InvoiceGroup[]>([]);

  // Loading & Error State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printingAction, setPrintingAction] = useState<string | null>(null);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Multiselect State
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch Lookups (Clients & Invoice Groups)
  const fetchLookups = useCallback(async () => {
    try {
      const [clientData, groupData] = await Promise.all([
        invoiceGroupService.getClients(),
        invoiceGroupService.getInvoiceGroups(),
      ]);
      setClients(clientData || []);
      setGroups(groupData || []);
    } catch (err) {
      console.error('Failed to load lookup dropdowns:', err);
    }
  }, []);

  // Fetch Created Invoice Batches
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filterParams: InvoiceBatchFilterParams = {};
      if (startDate) filterParams.startDate = startDate;
      if (endDate) filterParams.endDate = endDate;
      if (selectedGroupId && selectedGroupId !== 'ALL') filterParams.groupId = selectedGroupId;
      if (selectedClientId && selectedClientId !== 'ALL') filterParams.clientId = selectedClientId;

      const data = await invoicePrintService.getInvoiceBatchList(filterParams);
      setBatches(data || []);

      // Clear selections that no longer exist
      const validIds = new Set((data || []).map((b) => b.batchId));
      setSelectedBatchIds((prev) => prev.filter((id) => validIds.has(id)));
    } catch (err: any) {
      console.error('Failed to fetch invoice batches:', err);
      setError('Failed to load invoice batches list. Please check backend connection.');
      toast.error('Failed to load invoice batches');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedGroupId, selectedClientId]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Search Filter
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const q = searchQuery.toLowerCase();
    return batches.filter(
      (b) =>
        b.batchNo?.toLowerCase().includes(q) ||
        b.groupName?.toLowerCase().includes(q) ||
        b.clientName?.toLowerCase().includes(q) ||
        String(b.batchId).includes(q)
    );
  }, [batches, searchQuery]);

  // Total record count across filtered batches
  const totalRecordCount = useMemo(() => {
    return filteredBatches.reduce((acc, b) => acc + (b.recordCount || 0), 0);
  }, [filteredBatches]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / itemsPerPage));
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBatches.slice(start, start + itemsPerPage);
  }, [filteredBatches, currentPage, itemsPerPage]);

  // Multiselect Handlers
  const handleToggleSelectBatch = (batchId: number) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const isAllSelected = useMemo(() => {
    if (filteredBatches.length === 0) return false;
    return filteredBatches.every((b) => selectedBatchIds.includes(b.batchId));
  }, [filteredBatches, selectedBatchIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(filteredBatches.map((b) => b.batchId));
    }
  };

  // Clear Filter Controls
  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedClientId('ALL');
    setSelectedGroupId('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Selected Batch Objects & Numbers helper
  const selectedBatches = useMemo(() => {
    return batches.filter((b) => selectedBatchIds.includes(b.batchId));
  }, [batches, selectedBatchIds]);

  // Handle Reprint Actions (1x1 Thermal or 1x4 Sheet)
  const handleReprintFormat = async (
    targetBatches: InvoiceBatchItem[],
    format: '1x1' | '1x4',
    formatLabel: string
  ) => {
    if (targetBatches.length === 0) {
      toast.warning('Please select at least one batch to reprint');
      return;
    }

    const batchNos = targetBatches.map((b) => b.batchNo);
    const toastId = toast.loading(`Generating ${formatLabel} for ${batchNos.length} batch(es)...`);
    setPrintingAction(`reprint-${format}-${batchNos.join(',')}`);

    try {
      await invoicePrintService.reprintInvoiceFormat(batchNos, format);
      toast.success(`${formatLabel} generated successfully!`, { id: toastId });
    } catch (err: any) {
      console.error(`Reprint ${format} error:`, err);
      const msg = err?.response?.data?.message || err?.message || `Failed to reprint ${formatLabel}`;
      toast.error(msg, { id: toastId });
    } finally {
      setPrintingAction(null);
    }
  };

  // Handle Print Packing Slip Action (PS)
  const handlePrintPackingSlip = async (targetBatches: InvoiceBatchItem[]) => {
    if (targetBatches.length === 0) {
      toast.warning('Please select at least one batch to print packing slips');
      return;
    }

    const batchIds = targetBatches.map((b) => b.batchId);
    const toastId = toast.loading(`Generating Packing Slips (PS) for ${batchIds.length} batch(es)...`);
    setPrintingAction(`ps-${batchIds.join(',')}`);

    try {
      await invoicePrintService.printPackingSlipBatch(batchIds);
      toast.success('Packing Slips (PS) generated successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Print Packing Slip error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to print packing slips';
      toast.error(msg, { id: toastId });
    } finally {
      setPrintingAction(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Batches</p>
            <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {batches.length}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoices/Orders</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {totalRecordCount}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Selected Batches</p>
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {selectedBatchIds.length}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CheckSquare className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter Status</p>
            <div className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {startDate || endDate || selectedClientId !== 'ALL' || selectedGroupId !== 'ALL'
                  ? 'Filtered'
                  : 'All Batches'}
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
        
        {/* Filters & Action Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          
          {/* Row 1: Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName} ({c.clientCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Group Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Invoice Group
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">All Invoice Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.groupName}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div className="sm:col-span-2 md:col-span-4 lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Search Query
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search batch no, group..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Multiselect Actions & Clear Controls */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
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

              <button
                onClick={handleClearFilters}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>

              <button
                onClick={fetchBatches}
                disabled={loading}
                className="p-1.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
                title="Refresh Batches"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Top 3 Reprint Action Buttons for Multiselect */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Button 1: 1x1 Thermal Label */}
              <button
                onClick={() => handleReprintFormat(selectedBatches, '1x1', '1x1 Thermal Label')}
                disabled={selectedBatchIds.length === 0 || Boolean(printingAction)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {printingAction?.startsWith('reprint-1x1-') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4" />
                )}
                <span>1x1 Thermal Label ({selectedBatchIds.length})</span>
              </button>

              {/* Button 2: 1x4 Sheet Format */}
              <button
                onClick={() => handleReprintFormat(selectedBatches, '1x4', '1x4 Sheet Format')}
                disabled={selectedBatchIds.length === 0 || Boolean(printingAction)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {printingAction?.startsWith('reprint-1x4-') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Grid className="h-4 w-4" />
                )}
                <span>1x4 Sheet Format ({selectedBatchIds.length})</span>
              </button>

              {/* Button 3: PS (Packing Slip) */}
              <button
                onClick={() => handlePrintPackingSlip(selectedBatches)}
                disabled={selectedBatchIds.length === 0 || Boolean(printingAction)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {printingAction?.startsWith('ps-') ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>PS (Packing Slip) ({selectedBatchIds.length})</span>
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
                <th className="py-3.5 px-4">Batch Number</th>
                <th className="py-3.5 px-4">Invoice Group</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4 w-28 text-center">Records</th>
                <th className="py-3.5 px-4 w-36 text-center">Created At</th>
                <th className="py-3.5 px-4 text-right">Reprint Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-xs font-medium">Fetching created invoice batches...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-red-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <p className="text-sm font-semibold">{error}</p>
                      <button
                        onClick={fetchBatches}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-medium">No created invoice batches found</p>
                      <p className="text-xs text-slate-400">
                        {startDate || endDate || selectedClientId !== 'ALL' || selectedGroupId !== 'ALL' || searchQuery
                          ? 'Try adjusting or resetting your filter criteria.'
                          : 'First-time printed batches will appear here for reprinting.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBatches.map((batch, idx) => {
                  const isSelected = selectedBatchIds.includes(batch.batchId);
                  const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={batch.batchId}
                      className={`group hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-50/60 dark:bg-slate-800/70' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectBatch(batch.batchId)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Serial Number */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          {serialNumber}
                        </span>
                      </td>

                      {/* Batch Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                          {batch.batchNo}
                        </span>
                      </td>

                      {/* Invoice Group */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {batch.groupName}
                        </div>
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {batch.clientName}
                        </div>
                      </td>

                      {/* Record Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 rounded-full border border-indigo-200 dark:border-indigo-800">
                          {batch.recordCount} Orders
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : 'N/A'}
                      </td>

                      {/* Per-Row Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* 1x1 Label */}
                          <button
                            onClick={() => handleReprintFormat([batch], '1x1', '1x1 Thermal Label')}
                            disabled={Boolean(printingAction)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-40"
                            title="Reprint 1x1 Thermal Label"
                          >
                            <Tag className="h-3.5 w-3.5" />
                            <span>1x1 Label</span>
                          </button>

                          {/* 1x4 Sheet */}
                          <button
                            onClick={() => handleReprintFormat([batch], '1x4', '1x4 Sheet Format')}
                            disabled={Boolean(printingAction)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-40"
                            title="Reprint 1x4 Sheet Format"
                          >
                            <Grid className="h-3.5 w-3.5" />
                            <span>1x4 Sheet</span>
                          </button>

                          {/* PS (Packing Slip) */}
                          <button
                            onClick={() => handlePrintPackingSlip([batch])}
                            disabled={Boolean(printingAction)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-40"
                            title="Print PS (Packing Slip)"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>PS</span>
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
            Showing {filteredBatches.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredBatches.length)} of {filteredBatches.length}{' '}
            Invoice Batches
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
