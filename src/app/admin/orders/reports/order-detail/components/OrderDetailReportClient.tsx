'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  FileText,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Check,
  Users,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  MoveRight,
  X,
} from 'lucide-react';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchOrderItem } from '@/types/batchOrder';
import { ExportProgressModal } from './ExportProgressModal';
import { toast } from 'sonner';

export const OrderDetailReportClient: React.FC = () => {
  // Date Filters (default: last 30 days)
  const today = useMemo(() => new Date(), []);
  const defaultEndDate = useMemo(() => today.toISOString().split('T')[0], [today]);
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [activeChannelTab, setActiveChannelTab] = useState<string>('ALL'); // 'ALL' | '1' | '2' | '3' | '4'
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [clientDropdownOpen, setClientDropdownOpen] = useState<boolean>(false);
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('ALL');
  const [batchTypeFilter, setBatchTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data & Selection State
  const [batches, setBatches] = useState<BatchOrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);
  const [filterRowType, setFilterRowType] = useState<'ALL' | 'PASS' | 'FAIL' | 'WARN'>('ALL');

  // Sync / Async Download States
  const [isDownloadingSync, setIsDownloadingSync] = useState<boolean>(false);
  const [asyncExportJobId, setAsyncExportJobId] = useState<string | null>(null);
  const [showAsyncModal, setShowAsyncModal] = useState<boolean>(false);

  // Client Options for Dropdown
  const clientOptions = useMemo(
    () => [
      { id: 'ALL', name: 'All Clients' },
      { id: '10', name: 'Amazon India' },
      { id: '33', name: 'AXIS BANK' },
      { id: '34', name: 'EARNEST' },
      { id: '35', name: 'XOXODAY' },
      { id: '36', name: 'HDFC BANK' },
      { id: '37', name: 'ICICI BANK' },
    ],
    []
  );

  // Close client dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node)
      ) {
        setClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Batch List
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const sourceId = activeChannelTab === 'ALL' ? undefined : Number(activeChannelTab);
      const clientId = selectedClientId === 'ALL' ? undefined : Number(selectedClientId);
      const batchStatus = batchStatusFilter === 'ALL' ? undefined : Number(batchStatusFilter);
      const batchType = batchTypeFilter === 'ALL' ? undefined : Number(batchTypeFilter);

      const res = await batchOrderService.getBatchList({
        startDate,
        endDate,
        sourceId,
        clientId,
        batchStatus,
        batchType,
      });

      setBatches(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Error fetching batch list for report:', err);
      toast.error('Failed to load batch list report.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, activeChannelTab, selectedClientId, batchStatusFilter, batchTypeFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Filtered Batches based on client-side search query
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const q = searchQuery.toLowerCase().trim();
    return batches.filter(
      (b) =>
        (b.batchNo && b.batchNo.toLowerCase().includes(q)) ||
        (b.clientName && b.clientName.toLowerCase().includes(q)) ||
        (b.businessUnitName && b.businessUnitName.toLowerCase().includes(q)) ||
        String(b.id || b.batchId || '').includes(q)
    );
  }, [batches, searchQuery]);

  // Checkbox Handlers
  const isAllSelected = useMemo(() => {
    if (filteredBatches.length === 0) return false;
    return filteredBatches.every((b) => selectedBatchIds.includes(b.id || b.batchId || 0));
  }, [filteredBatches, selectedBatchIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(filteredBatches.map((b) => b.id || b.batchId || 0));
      setSelectedBatchIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newSelected = new Set([
        ...selectedBatchIds,
        ...filteredBatches.map((b) => b.id || b.batchId || 0).filter(Boolean),
      ]);
      setSelectedBatchIds(Array.from(newSelected));
    }
  };

  const toggleSelectBatch = (id: number) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Synchronous Excel Download Trigger
  const handleSynchronousDownload = async () => {
    if (selectedBatchIds.length === 0) {
      toast.error('Please select at least one order batch from the table.');
      return;
    }

    setIsDownloadingSync(true);
    try {
      await batchOrderService.downloadMultipleBatches(selectedBatchIds, filterRowType);
      toast.success(`Successfully downloaded ${selectedBatchIds.length} selected batch report(s).`);
    } catch (err: any) {
      console.error('Synchronous download error:', err);
      toast.error('Failed to download batch report Excel file.');
    } finally {
      setIsDownloadingSync(false);
    }
  };

  // Asynchronous Export Job Trigger
  const handleAsyncExport = async () => {
    if (selectedBatchIds.length === 0) {
      toast.error('Please select at least one order batch to export.');
      return;
    }

    try {
      const res = await batchOrderService.initiateExportJob(selectedBatchIds, filterRowType);
      const data = res?.data || res;
      const jobId = data?.jobId;

      if (!jobId) {
        throw new Error(res?.message || 'Failed to initiate export job.');
      }

      setAsyncExportJobId(jobId);
      setShowAsyncModal(true);
    } catch (err: any) {
      console.error('Async export initiation error:', err);
      toast.error(err.message || 'Failed to initiate large dataset export job.');
    }
  };

  // Helper Enums Mapping
  const getChannelBadge = (sourceId?: number) => {
    switch (sourceId) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
            EXCEL
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
            API
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
            B2B
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
            MANUAL / ADHOC
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            UNKNOWN ({sourceId ?? 'N/A'})
          </span>
        );
    }
  };

  const getStatusBadge = (status?: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="h-3 w-3" /> RECEIVED
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <CheckCircle2 className="h-3 w-3" /> VALIDATED
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> SUBMITTED
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 dark:bg-red-950/80 dark:text-red-300">
            <AlertCircle className="h-3 w-3" /> FAILED
          </span>
        );
      case 5:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
            <MoveRight className="h-3 w-3" /> MOVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {status ?? 'N/A'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        {/* Channel Filter Tabs with Refresh Button at the End */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'All Channels' },
              { id: '1', label: 'Excel Uploads' },
              { id: '2', label: 'API Ingestion' },
            ].map((tab) => {
              const isActive = activeChannelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveChannelTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={fetchBatches}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Single Select Search & Select Client Filter */}
          <div className="relative" ref={clientDropdownRef}>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Client Filter
            </label>
            <button
              type="button"
              onClick={() => setClientDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white hover:bg-slate-50 transition-colors"
            >
              <span className="truncate">
                {clientOptions.find((c) => c.id === selectedClientId)?.name || 'All Clients'}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Search and Select Dropdown Menu Panel */}
            {clientDropdownOpen && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                {/* Search Input Field */}
                <div className="relative p-1">
                  <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Options List */}
                <div className="max-h-52 overflow-y-auto space-y-0.5 scrollbar-thin">
                  {clientOptions
                    .filter((c) => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()))
                    .map((c) => {
                      const isSelected = selectedClientId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearchQuery('');
                            setClientDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />}
                        </button>
                      );
                    })}
                  {clientOptions.filter((c) => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())).length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                      No matching clients found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Batch Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={batchStatusFilter}
              onChange={(e) => setBatchStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="1">1 - RECEIVED</option>
              <option value="2">2 - VALIDATED</option>
              <option value="3">3 - SUBMITTED</option>
              <option value="4">4 - FAILED</option>
              <option value="5">5 - MOVED</option>
            </select>
          </div>

          {/* Batch Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Batch Type
            </label>
            <select
              value={batchTypeFilter}
              onChange={(e) => setBatchTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="ALL">All Types</option>
              <option value="1">1 - NORMAL</option>
              <option value="2">2 - RESHIP</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Batch No, Client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Multi-Select Action Header Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200/70 dark:border-blue-900/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 hover:opacity-80 transition-opacity"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>
                {selectedBatchIds.length > 0
                  ? `${selectedBatchIds.length} Batches Selected`
                  : 'Select All Visible'}
              </span>
            </button>

            {selectedBatchIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBatchIds([])}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Download Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500">Row Type:</span>
              <select
                value={filterRowType}
                onChange={(e) => setFilterRowType(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL">ALL (All lines)</option>
                <option value="PASS">PASS (Valid orders)</option>
                <option value="FAIL">FAIL (Failed orders)</option>
                <option value="WARN">WARN (Warning orders)</option>
              </select>
            </div>

            {/* Sync Download Button */}
            <button
              type="button"
              onClick={handleSynchronousDownload}
              disabled={selectedBatchIds.length === 0 || isDownloadingSync}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloadingSync ? 'Downloading...' : 'Download Selected'}</span>
            </button>

            {/* Async ERP Export Button */}
            <button
              type="button"
              onClick={handleAsyncExport}
              disabled={selectedBatchIds.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Order Details Download</span>
            </button>
          </div>
        </div>

        {/* Batch Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                  />
                </th>
                <th className="px-4 py-3">Batch No</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Business Unit</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="font-semibold text-xs">Loading order batch report data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        No order batches found
                      </span>
                      <span className="text-xs text-slate-400">
                        Try adjusting date range or channel filters above
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch, idx) => {
                  const bId = batch.id || batch.batchId || idx;
                  const isSelected = selectedBatchIds.includes(bId);
                  return (
                    <tr
                      key={bId}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectBatch(bId)}
                          className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {batch.batchNo || `BATCH-#${bId}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {batch.clientName || `Client #${batch.clientId ?? '-'}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {batch.businessUnitName || `BU #${batch.businessUnitId ?? '-'}`}
                      </td>
                      <td className="px-4 py-3">{getChannelBadge(batch.sourceId)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                          {batch.batchType === 2 ? 'RESHIP' : 'NORMAL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(batch.batchStatus)}</td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const bId = batch.id || batch.batchId;
                            if (bId) {
                              batchOrderService.downloadBatchOrders(bId, filterRowType, batch.batchNo);
                            }
                          }}
                          title="Download Excel for this batch"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Async Export Progress Modal */}
      <ExportProgressModal
        isOpen={showAsyncModal}
        onClose={() => setShowAsyncModal(false)}
        jobId={asyncExportJobId}
        batchCount={selectedBatchIds.length}
        filterType={filterRowType}
      />
    </div>
  );
};
