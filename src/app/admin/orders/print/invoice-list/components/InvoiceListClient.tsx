'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Building2,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileText,
  User,
  Scale,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceListItem } from '@/types/invoicePrint';
import { invoicePrintService } from '@/services/invoicePrint.service';

export const InvoiceListClient: React.FC = () => {
  // Data & Loading States
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [selectedCourier, setSelectedCourier] = useState<string>('ALL');
  const [selectedShipMode, setSelectedShipMode] = useState<string>('ALL');
  const [printedStatusFilter, setPrintedStatusFilter] = useState<string>('ALL'); // 'ALL' | 'PENDING' | 'PRINTED'

  // Fetch Invoice List Preview
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoicePrintService.getInvoiceListPreview();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching invoice list preview:', err);
      toast.error('Failed to load invoice list preview.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Derived Filter Options for Dropdowns
  const clientOptions = useMemo(() => {
    const clients = new Set<string>();
    invoices.forEach((item) => {
      if (item.clientName) clients.add(item.clientName);
    });
    return Array.from(clients).sort();
  }, [invoices]);

  const courierOptions = useMemo(() => {
    const couriers = new Set<string>();
    invoices.forEach((item) => {
      if (item.courierName) couriers.add(item.courierName);
    });
    return Array.from(couriers).sort();
  }, [invoices]);

  // Filtered List calculation
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      // 1. Client Filter
      if (selectedClient !== 'ALL' && item.clientName !== selectedClient) {
        return false;
      }

      // 2. Courier Filter
      if (selectedCourier !== 'ALL' && item.courierName !== selectedCourier) {
        return false;
      }

      // 3. Ship Mode Filter
      if (selectedShipMode !== 'ALL' && (item.shipMode || '').toUpperCase() !== selectedShipMode) {
        return false;
      }

      // 4. Printed Status Filter
      if (printedStatusFilter === 'PENDING' && item.isInvoiceListPrinted) {
        return false;
      }
      if (printedStatusFilter === 'PRINTED' && !item.isInvoiceListPrinted) {
        return false;
      }

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoiceNo = (item.invoiceNumber || '').toLowerCase().includes(q);
        const matchClientOrderNo = (item.clientOrderNo || '').toLowerCase().includes(q);
        const matchOrderRefNo = (item.orderRefNo || '').toLowerCase().includes(q);
        const matchConsignee = (item.consigneeName || '').toLowerCase().includes(q);
        const matchProduct = (item.productName || '').toLowerCase().includes(q);
        const matchCode = (item.productCode || '').toLowerCase().includes(q);
        const matchAwb = (item.awbNumber || '').toLowerCase().includes(q);
        const matchClient = (item.clientName || '').toLowerCase().includes(q);

        if (
          !matchInvoiceNo &&
          !matchClientOrderNo &&
          !matchOrderRefNo &&
          !matchConsignee &&
          !matchProduct &&
          !matchCode &&
          !matchAwb &&
          !matchClient
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    invoices,
    selectedClient,
    selectedCourier,
    selectedShipMode,
    printedStatusFilter,
    searchQuery,
  ]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = filteredInvoices.length;
    const pendingCount = filteredInvoices.filter((i) => !i.isInvoiceListPrinted).length;
    const printedCount = filteredInvoices.filter((i) => i.isInvoiceListPrinted).length;
    const totalQty = filteredInvoices.reduce((acc, i) => acc + (i.quantity || 0), 0);
    const totalWeightGrams = filteredInvoices.reduce((acc, i) => acc + (i.totalWeight || i.weight || 0), 0);
    const totalWeightKg = (totalWeightGrams / 1000).toFixed(2);

    return {
      totalCount,
      pendingCount,
      printedCount,
      totalQty,
      totalWeightKg,
    };
  }, [filteredInvoices]);

  // Checkbox Handlers
  const isAllSelected = useMemo(() => {
    if (filteredInvoices.length === 0) return false;
    return filteredInvoices.every((i) => selectedInvoiceIds.includes(i.invoiceId));
  }, [filteredInvoices, selectedInvoiceIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(filteredInvoices.map((i) => i.invoiceId));
      setSelectedInvoiceIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newSelected = new Set([
        ...selectedInvoiceIds,
        ...filteredInvoices.map((i) => i.invoiceId).filter(Boolean),
      ]);
      setSelectedInvoiceIds(Array.from(newSelected));
    }
  };

  const toggleSelectInvoice = (id: number) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Download Pending Invoice List Excel Spreadsheet
  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      await invoicePrintService.downloadInvoiceListExcel();
      toast.success('Pending invoice list Excel spreadsheet downloaded successfully!');
      // Re-fetch list to reflect updated print status
      await fetchInvoices();
    } catch (err: any) {
      console.error('Error downloading invoice list excel:', err);
      toast.error(err.message || 'Failed to download pending invoice list Excel.');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header Card */}
      {/* <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl dark:border dark:border-slate-800">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner shrink-0">
            <Printer className="h-7 w-7 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-200 border border-blue-400/30">
                PRINT MANAGEMENT
              </span>
              <span className="text-xs text-blue-200/80">• Batch Invoice Printing</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">Invoice List</h1>
            <p className="text-xs text-blue-200/90 mt-0.5">
              Generate and download pending invoice list report before physical batch printing
            </p>
          </div>
        </div>
      </div> */}

      {/* Summary KPI Cards Grid */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Invoices</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.totalCount}
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Print
            </p>
            <h3 className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">
              {metrics.pendingCount}
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              List Printed
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">
              {metrics.printedCount}
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Quantity</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.totalQty} <span className="text-xs font-normal text-slate-400">units</span>
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Weight</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.totalWeightKg} <span className="text-xs font-normal text-slate-400">kg</span>
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Scale className="h-5 w-5" />
          </div>
        </div>
      </div> */}

      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Filters & Action Controls Bar */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
          {/* Filter Fields Group (in one line) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end flex-1">
            {/* Search Box */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Search Invoices
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Invoice, Order, Product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="ALL">All Clients ({clientOptions.length})</option>
                {clientOptions.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>

            {/* Courier Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Courier
              </label>
              <select
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="ALL">All Couriers ({courierOptions.length})</option>
                {courierOptions.map((courier) => (
                  <option key={courier} value={courier}>
                    {courier}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Print Status
              </label>
              <select
                value={printedStatusFilter}
                onChange={(e) => setPrintedStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Print Only</option>
                <option value="PRINTED">Printed Only</option>
              </select>
            </div>
          </div>

          {/* Vertical Separator line with gap to show difference */}
          <div className="hidden xl:block h-8 w-px bg-slate-300 dark:bg-slate-700 mx-2 self-end mb-1" />

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2.5 shrink-0 pt-2 xl:pt-0 border-t border-slate-200 dark:border-slate-700 xl:border-t-0">
            <button
              type="button"
              onClick={fetchInvoices}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel || invoices.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isDownloadingExcel ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              <span>Download Invoice List Excel</span>
            </button>
          </div>
        </div>

        {/* Selection Bar & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200/70 dark:border-blue-900/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 hover:opacity-80 transition-opacity cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>
                {selectedInvoiceIds.length > 0
                  ? `${selectedInvoiceIds.length} Invoices Selected`
                  : 'Select All Visible'}
              </span>
            </button>

            {selectedInvoiceIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedInvoiceIds([])}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 underline hover:text-blue-800 cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>
              Showing <strong className="text-slate-900 dark:text-white">{filteredInvoices.length}</strong> of{' '}
              {invoices.length} total invoice records
            </span>
          </div>
        </div>

        {/* Table */}
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
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Client & Order Details</th>
                <th className="px-4 py-3">Product Name & Qty</th>
                <th className="px-4 py-3">Courier / AWB</th>
                <th className="px-4 py-3">Consignee</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Order Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="font-semibold text-xs">Loading invoice list...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        No pending invoices found
                      </span>
                      <span className="text-xs text-slate-400">
                        Try adjusting search or filter options above
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.includes(inv.invoiceId);
                  return (
                    <tr
                      key={inv.invoiceId || inv.executionId}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectInvoice(inv.invoiceId)}
                          className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                        />
                      </td>

                      {/* Invoice Number */}
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        <div>{inv.invoiceNumber}</div>
                        <div className="text-[10px] font-normal text-slate-400 font-sans mt-0.5">
                          ID: #{inv.invoiceId} • Exec #{inv.executionId}
                        </div>
                      </td>

                      {/* Client & Order No */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{inv.clientName}</div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          {inv.clientOrderNo}
                        </div>
                        {inv.orderRefNo && (
                          <div className="text-[10px] text-slate-400">Ref: {inv.orderRefNo}</div>
                        )}
                      </td>

                      {/* Product Name & Qty */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {inv.productName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            Qty: {inv.quantity}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{inv.productCode}</span>
                        </div>
                      </td>

                      {/* Courier & AWB */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {inv.courierName || inv.courierCode || 'Unassigned'}
                          </span>
                          {inv.shipMode && (
                            <span className="inline-flex rounded-xs bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {inv.shipMode}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                          {inv.awbNumber ? (
                            <span className="text-emerald-700 dark:text-emerald-400">{inv.awbNumber}</span>
                          ) : (
                            <span className="text-slate-400 italic font-normal">Pending AWB</span>
                          )}
                        </div>
                      </td>

                      {/* Consignee */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {inv.consigneeName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {inv.consigneeCity}, {inv.consigneeState} {inv.consigneePincode}
                        </div>
                        {inv.consigneeMobile && (
                          <div className="text-[10px] text-slate-400">📱 {inv.consigneeMobile}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {inv.invoiceStatus || 'CREATED'}
                          </span>

                          {inv.isInvoiceListPrinted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> PRINTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> PENDING PRINT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Order Date */}
                      <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {inv.orderDate || '-'}
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
  );
};
