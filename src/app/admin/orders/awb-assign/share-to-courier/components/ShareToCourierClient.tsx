'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Eye,
  Search,
  X,
  Loader2,
  Package,
  Layers,
  CheckCircle2,
  Filter,
  ArrowRight,
} from 'lucide-react';
import {
  shareToCourierService,
  ShareToCourierConsolidationItem,
  ShareToCourierNdjsonItem,
  ShareToCourierFilterParams,
} from '@/services/shareToCourier.service';
import { toast } from 'sonner';

export const ShareToCourierClient: React.FC = () => {
  // Date Filters (default: 30 days prior to today)
  const today = useMemo(() => new Date(), []);
  const defaultEndDate = useMemo(() => today.toISOString().split('T')[0], [today]);
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [shipMode, setShipMode] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>(defaultStartDate);
  const [toDate, setToDate] = useState<string>(defaultEndDate);
  const [isReshipStr, setIsReshipStr] = useState<string>('ALL'); // "ALL", "true", "false"

  // Search filter for consolidation list table
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');

  // Data & Loading States
  const [consolidationList, setConsolidationList] = useState<ShareToCourierConsolidationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingGlobal, setDownloadingGlobal] = useState<boolean>(false);
  const [downloadingRowId, setDownloadingRowId] = useState<number | null>(null);

  // Modal View States
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [activeCourier, setActiveCourier] = useState<ShareToCourierConsolidationItem | null>(null);
  const [ndjsonItems, setNdjsonItems] = useState<ShareToCourierNdjsonItem[]>([]);
  const [loadingNdjson, setLoadingNdjson] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  // Convert string filter state to ShareToCourierFilterParams
  const getFilterParams = useCallback((): ShareToCourierFilterParams => {
    let reshipVal: boolean | null = null;
    if (isReshipStr === 'true') reshipVal = true;
    if (isReshipStr === 'false') reshipVal = false;

    return {
      shipMode: shipMode !== 'ALL' ? shipMode : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      isReship: reshipVal,
    };
  }, [shipMode, fromDate, toDate, isReshipStr]);

  // Fetch Consolidation List
  const fetchConsolidationData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = getFilterParams();
      const data = await shareToCourierService.getConsolidationList(filters);
      setConsolidationList(data || []);
    } catch (err: any) {
      console.error('Error fetching share to courier consolidation:', err);
      toast.error('Failed to load courier consolidation report.');
      setConsolidationList([]);
    } finally {
      setLoading(false);
    }
  }, [getFilterParams]);

  useEffect(() => {
    fetchConsolidationData();
  }, [fetchConsolidationData]);

  // Global Excel Download Handler
  const handleGlobalDownloadExcel = async () => {
    setDownloadingGlobal(true);
    const toastId = toast.loading('Downloading complete Share to Courier Excel report...');

    try {
      const filters = getFilterParams();
      await shareToCourierService.downloadExcelReport(filters);
      toast.success('Excel report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Global Excel download error:', err);
      toast.error(err.response?.data?.message || 'Failed to download Excel report.', { id: toastId });
    } finally {
      setDownloadingGlobal(false);
    }
  };

  // Individual Excel Download Handler
  const handleRowDownloadExcel = async (item: ShareToCourierConsolidationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('%c[USER ACTION] Download Clicked', 'color: #3b82f6; font-weight: bold;', {
      courierServiceId: item.courierServiceId,
      courierCode: item.courierCode,
      courierServiceName: item.courierServiceName,
    });
    setDownloadingRowId(item.courierServiceId);
    const toastId = toast.loading(`Downloading Excel report for ${item.courierServiceName}...`);

    try {
      const filters = getFilterParams();
      await shareToCourierService.downloadExcelReport(filters, item.courierServiceId);
      toast.success(`Downloaded Excel report for ${item.courierServiceName}!`, { id: toastId });
    } catch (err: any) {
      console.error('Individual Excel download error:', err);
      toast.error(err.response?.data?.message || 'Failed to download courier Excel report.', { id: toastId });
    } finally {
      setDownloadingRowId(null);
    }
  };

  // Individual View Handler (NDJSON Stream)
  const handleRowViewNdjson = async (item: ShareToCourierConsolidationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('%c[USER ACTION] View Clicked', 'color: #8b5cf6; font-weight: bold;', {
      courierServiceId: item.courierServiceId,
      courierCode: item.courierCode,
      courierServiceName: item.courierServiceName,
    });
    setActiveCourier(item);
    setShowViewModal(true);
    setLoadingNdjson(true);
    setNdjsonItems([]);
    setModalSearchQuery('');

    try {
      const filters = getFilterParams();
      const items = await shareToCourierService.getIndividualNdjsonView(item.courierServiceId, filters);
      setNdjsonItems(items || []);
    } catch (err: any) {
      console.error('Individual NDJSON view error:', err);
      toast.error('Failed to load courier execution preview items.');
      setNdjsonItems([]);
    } finally {
      setLoadingNdjson(false);
    }
  };

  // Client-side Filtered Consolidation List
  const filteredConsolidationList = useMemo(() => {
    if (!tableSearchQuery.trim()) return consolidationList;
    const q = tableSearchQuery.toLowerCase().trim();
    return consolidationList.filter(
      (item) =>
        item.courierCode.toLowerCase().includes(q) ||
        item.courierServiceName.toLowerCase().includes(q) ||
        item.shipMode.toLowerCase().includes(q)
    );
  }, [consolidationList, tableSearchQuery]);

  // Client-side Filtered NDJSON Modal List
  const filteredNdjsonItems = useMemo(() => {
    if (!modalSearchQuery.trim()) return ndjsonItems;
    const q = modalSearchQuery.toLowerCase().trim();
    return ndjsonItems.filter(
      (item) =>
        (item.city && item.city.toLowerCase().includes(q)) ||
        (item.pincode && item.pincode.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.toLowerCase().includes(q)) ||
        (item.packRefNo && item.packRefNo.toLowerCase().includes(q)) ||
        (item.orderRefNo && item.orderRefNo.toLowerCase().includes(q)) ||
        (item.clientName && item.clientName.toLowerCase().includes(q))
    );
  }, [ndjsonItems, modalSearchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        
        {/* Single Row Filter Controls & Action Buttons */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-wrap xl:flex-nowrap items-end justify-between gap-3">
          
          {/* Inputs Row Container */}
          <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
            {/* 1. Ship Mode Dropdown */}
            <div className="w-full sm:w-[130px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Ship Mode
              </label>
              <select
                value={shipMode}
                onChange={(e) => setShipMode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">Select</option>
                <option value="DP">DP</option>
                <option value="SURFACE">SURFACE</option>
              </select>
            </div>

            {/* 2. From Date */}
            <div className="w-full sm:w-[135px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 3. To Date */}
            <div className="w-full sm:w-[135px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 4. Is Reship Dropdown */}
            <div className="w-full sm:w-[130px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Is Reship
              </label>
              <select
                value={isReshipStr}
                onChange={(e) => setIsReshipStr(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Search Filter for Table */}
            <div className="w-full sm:w-[180px] lg:w-[200px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Search Courier
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Code or Name..."
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons at the End of Same Line */}
          <div className="flex items-center gap-2.5 shrink-0 self-end">
            <button
              type="button"
              onClick={fetchConsolidationData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              disabled={downloadingGlobal}
              onClick={handleGlobalDownloadExcel}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-bold text-xs px-4 py-2 transition-all shadow-emerald-500/20 shadow-2xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {downloadingGlobal ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        {/* Consolidation Data Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Courier Code</th>
                  <th className="py-3.5 px-4">Courier Service Name</th>
                  <th className="py-3.5 px-4 text-center">Ship Mode</th>
                  <th className="py-3.5 px-4 text-right">Total Packs</th>
                  <th className="py-3.5 px-4 text-right">Total Orders</th>
                  <th className="py-3.5 px-4 text-right">Total Qty</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-xs">Loading courier consolidation report...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredConsolidationList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <span className="font-bold text-xs text-slate-600 dark:text-slate-400">No courier consolidation records found</span>
                        <p className="text-[11px] max-w-sm">
                          Try adjusting date range or ship mode filters above to view courier assignment metrics.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredConsolidationList.map((item, idx) => {
                    const isDownloadingThisRow = downloadingRowId === item.courierServiceId;
                    return (
                      <tr
                        key={item.courierServiceId || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-blue-600 dark:text-blue-400">
                          {item.courierCode}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {item.courierServiceName}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                            {item.shipMode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {item.totalPacks.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {item.totalOrders.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60">
                            {item.totalQty.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Individual Download Button */}
                            <button
                              type="button"
                              disabled={isDownloadingThisRow}
                              onClick={(e) => handleRowDownloadExcel(item, e)}
                              className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/80 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                              title="Download Excel report for this courier"
                            >
                              {isDownloadingThisRow ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              <span>Download</span>
                            </button>

                            {/* Individual View Button */}
                            <button
                              type="button"
                              onClick={(e) => handleRowViewNdjson(item, e)}
                              className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/80 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="View execution NDJSON stream details in popup modal"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
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
        </div>
      </div>

      {/* =================================================================== */}
      {/* INDIVIDUAL VIEW POPUP MODAL (NDJSON PREVIEW DATA) */}
      {/* =================================================================== */}
      {showViewModal && activeCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{activeCourier.courierServiceName}</span>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                      {activeCourier.courierCode}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Execution item details preview parsed from NDJSON stream
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Sub-Bar Search & Count */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {filteredNdjsonItems.length} record(s) loaded
                </span>
                {ndjsonItems.length !== filteredNdjsonItems.length && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    (filtered from {ndjsonItems.length})
                  </span>
                )}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter City, Pincode, Mobile..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Body Table */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {loadingNdjson ? (
                <div className="py-20 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-xs">Streaming NDJSON execution records...</span>
                  </div>
                </div>
              ) : filteredNdjsonItems.length === 0 ? (
                <div className="py-20 text-center text-slate-400 dark:text-slate-500">
                  <Package className="h-9 w-9 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <span className="font-bold text-xs text-slate-600 dark:text-slate-400">No execution records found</span>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          <th className="py-3 px-3 w-10 text-center">#</th>
                          <th className="py-3 px-3">City & Pincode</th>
                          <th className="py-3 px-3">Mobile Contact</th>
                          <th className="py-3 px-3 text-right">Weight (g)</th>
                          <th className="py-3 px-3 text-right">Rate (₹)</th>
                          <th className="py-3 px-3 text-center">Dimensions (L×B×H)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                        {filteredNdjsonItems.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-3 text-center font-semibold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                              <div>{row.city || 'N/A'}</div>
                              <div className="font-mono text-[11px] text-slate-400 font-bold">
                                {row.pincode || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                              <div>{row.mobile || 'N/A'}</div>
                              {row.alternateMobile && (
                                <div className="text-[11px] text-slate-400">Alt: {row.alternateMobile}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {row.weight !== undefined && row.weight !== null ? `${row.weight.toLocaleString()} g` : 'N/A'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {row.rate !== undefined && row.rate !== null ? `₹${row.rate.toLocaleString()}` : 'N/A'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {row.length ?? 0} × {row.breadth ?? 0} × {row.height ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
