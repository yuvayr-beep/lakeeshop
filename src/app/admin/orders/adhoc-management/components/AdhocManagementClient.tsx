'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Printer,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Package,
  Truck,
  Receipt,
  FileText,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Edit,
  X,
  Loader2,
} from 'lucide-react';
import {
  adhocOrderService,
  ParentAdhocOrderResponse,
  ChildAdhocOrderItem,
  AssignStockItemPayload,
} from '@/services/adhocOrder.service';
import { ProcessOrderModal } from './ProcessOrderModal';
import { SupplierInvoiceModal } from './SupplierInvoiceModal';
import AdhocPOClient from '@/app/admin/orders/adhoc-po/components/AdhocPOClient';
import { toast } from 'sonner';

export const AdhocManagementClient: React.FC = () => {
  // Date Filters
  const today = useMemo(() => new Date(), []);
  const defaultEndDate = useMemo(() => today.toISOString().split('T')[0], [today]);
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [orderDateFrom, setOrderDateFrom] = useState<string>(defaultStartDate);
  const [orderDateTo, setOrderDateTo] = useState<string>(defaultEndDate);
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data & Accordion State
  const [orders, setOrders] = useState<ParentAdhocOrderResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
  const [childOrdersMap, setChildOrdersMap] = useState<
    Record<number, { loading: boolean; data: ChildAdhocOrderItem[] }>
  >({});

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [activeProcessOrder, setActiveProcessOrder] = useState<ParentAdhocOrderResponse | null>(null);
  const [showProcessModal, setShowProcessModal] = useState<boolean>(false);
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);
  const [assigningStockOrderId, setAssigningStockOrderId] = useState<number | null>(null);
  const [assigningCourierOrderId, setAssigningCourierOrderId] = useState<number | null>(null);
  const [supplierInvoiceOrder, setSupplierInvoiceOrder] = useState<ParentAdhocOrderResponse | null>(null);
  const [showSupplierInvoiceModal, setShowSupplierInvoiceModal] = useState<boolean>(false);

  const clientOptions = [
    { id: 'ALL', name: 'All Clients' },
    { id: '10', name: 'Amazon India' },
    { id: '33', name: 'AXIS BANK' },
    { id: '34', name: 'EARNEST' },
    { id: '35', name: 'XOXODAY' },
    { id: '36', name: 'HDFC BANK' },
    { id: '37', name: 'ICICI BANK' },
  ];

  // Fetch Parent Adhoc Orders List
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adhocOrderService.getParentAdhocOrders({
        orderDateFrom,
        orderDateTo,
        clientId: selectedClientId,
      });

      setOrders(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Error fetching parent adhoc orders:', err);
      toast.error('Failed to load ad-hoc orders list.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [orderDateFrom, orderDateTo, selectedClientId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch Child Orders for a Parent Order ID
  const fetchChildOrdersForParent = useCallback(async (parentId: number) => {
    setChildOrdersMap((prev) => ({
      ...prev,
      [parentId]: { loading: true, data: prev[parentId]?.data || [] },
    }));

    try {
      const items = await adhocOrderService.getChildOrdersByParentId(parentId);
      setChildOrdersMap((prev) => ({
        ...prev,
        [parentId]: { loading: false, data: items },
      }));
    } catch (err) {
      console.error(`Failed to fetch child orders for parent ${parentId}:`, err);
      setChildOrdersMap((prev) => ({
        ...prev,
        [parentId]: { loading: false, data: [] },
      }));
    }
  }, []);

  // Accordion Expand/Collapse Toggle
  const toggleExpandOrder = (id: number) => {
    const isExpanding = !expandedOrderIds.includes(id);
    setExpandedOrderIds((prev) =>
      isExpanding ? [...prev, id] : prev.filter((item) => item !== id)
    );

    if (isExpanding && (!childOrdersMap[id] || childOrdersMap[id].data.length === 0)) {
      fetchChildOrdersForParent(id);
    }
  };

  // Filtered Orders based on Search Query & Sorted by ID Descending
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          (o.orderRefNo && o.orderRefNo.toLowerCase().includes(q)) ||
          (o.customerFirstName && o.customerFirstName.toLowerCase().includes(q)) ||
          (o.customerLastName && o.customerLastName.toLowerCase().includes(q)) ||
          (o.city && o.city.toLowerCase().includes(q)) ||
          (o.mobile && o.mobile.toLowerCase().includes(q))
      );
    }
    // Sort accordion list by parent order ID in DESCENDING order
    return [...list].sort((a, b) => b.id - a.id);
  }, [orders, searchQuery]);

  // Handle Invoice Print from List Row
  const handlePrintInvoiceRow = async (order: ParentAdhocOrderResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintingOrderId(order.id);
    try {
      await adhocOrderService.printCustomerInvoice(order.orderRefNo);
      toast.success(`Printed invoice for ${order.orderRefNo}!`);
      fetchOrders();
    } catch (err: any) {
      console.error('Error printing customer invoice:', err);
      toast.error('Failed to print customer invoice PDF.');
    } finally {
      setPrintingOrderId(null);
    }
  };

  // Handle Manual Stock Assign from List Row (POST /order/adhoc-orders/assign)
  const handleAssignStockRow = async (order: ParentAdhocOrderResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningStockOrderId(order.id);
    const toastId = toast.loading(`Assigning stock for ${order.orderRefNo}...`);

    try {
      let childItems = childOrdersMap[order.id]?.data || order.childOrders || [];
      if (childItems.length === 0) {
        childItems = await adhocOrderService.getChildOrdersByParentId(order.id);
      }

      if (childItems.length === 0) {
        toast.error('No child order items found to assign stock.', { id: toastId });
        return;
      }

      const payload: AssignStockItemPayload[] = childItems.map((c) => ({
        childOrderId: c.id,
        adhocRefNo: order.orderRefNo,
        adhocItemId: c.adhocItemId,
      }));

      console.log('====================================');
      console.log('[MANUAL STOCK ASSIGN API CALL] POST /order/adhoc-orders/assign');
      console.log(JSON.stringify(payload, null, 2));
      console.log('====================================');

      await adhocOrderService.assignStockAdhoc(payload);
      toast.success(`Stock assignment completed for ${order.orderRefNo}!`, { id: toastId });

      fetchOrders();
      fetchChildOrdersForParent(order.id);
    } catch (err: any) {
      console.error('Error assigning stock for order row:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to assign stock for order.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setAssigningStockOrderId(null);
    }
  };

  // Row Action: Auto Courier Assign
  const handleAutoCourierRow = async (order: ParentAdhocOrderResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningCourierOrderId(order.id);
    const toastId = toast.loading(`Auto assigning courier for ${order.orderRefNo}...`);
    try {
      const res = await adhocOrderService.assignCourierBatch(order.orderRefNo);
      const msg = typeof res === 'string' ? res : res?.message || `Auto courier assigned for ${order.orderRefNo}!`;
      toast.success(msg, { id: toastId });
      fetchOrders();
      fetchChildOrdersForParent(order.id);
    } catch (err: any) {
      console.error('Error auto assigning courier:', err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Auto courier assignment failed.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setAssigningCourierOrderId(null);
    }
  };

  // Open Process Modal for specific order
  const handleOpenProcessModal = (order: ParentAdhocOrderResponse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveProcessOrder(order);
    setShowProcessModal(true);
  };

  // Open Supplier Invoice Modal for specific order
  const handleOpenSupplierInvoiceRow = (order: ParentAdhocOrderResponse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSupplierInvoiceOrder(order);
    if (!childOrdersMap[order.id] || childOrdersMap[order.id].data.length === 0) {
      fetchChildOrdersForParent(order.id);
    }
    setShowSupplierInvoiceModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        {/* Single Row Filter & Action Bar */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-wrap xl:flex-nowrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
            {/* Date From */}
            <div className="w-full sm:w-[135px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={orderDateFrom}
                onChange={(e) => setOrderDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Date To */}
            <div className="w-full sm:w-[135px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={orderDateTo}
                onChange={(e) => setOrderDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Client */}
            <div className="w-full sm:w-[140px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Orders */}
            <div className="w-full sm:w-[180px] lg:w-[220px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Search Orders
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ref No, Customer Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons at the End of Same Line */}
          <div className="flex items-center gap-2.5 shrink-0 self-end">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/admin/orders/adhoc-po"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Create Adhoc Order</span>
            </Link>
          </div>
        </div>

        {/* Parent Orders Accordion List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
                <span className="font-semibold text-xs">Loading ad-hoc order list...</span>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex flex-col items-center justify-center gap-2">
                <FileText className="h-8 w-8 text-slate-300" />
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  No ad-hoc orders found
                </span>
                <span className="text-xs text-slate-400">
                  Click "+ Create Adhoc Order" above to submit a new ad-hoc order
                </span>
              </div>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrderIds.includes(order.id);
              const summary = order.statusSummary || {};

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleExpandOrder(order.id)}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer gap-3 border-b border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400">
                            {order.orderRefNo}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({order.orderDate || 'N/A'})
                          </span>
                          {/* Status Summary Badges */}
                          {Object.entries(summary).map(([stKey, stVal]) => {
                            let colorClasses = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900/50';
                            const upperKey = stKey.toUpperCase();
                            if (upperKey.includes('RECEIV')) {
                              colorClasses = 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900/50';
                            } else if (upperKey.includes('STOCK')) {
                              colorClasses = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900/50';
                            } else if (upperKey.includes('COURIER')) {
                              colorClasses = 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-900/50';
                            } else if (upperKey.includes('AWB')) {
                              colorClasses = 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900/50';
                            } else if (upperKey.includes('INVOICE') || upperKey.includes('PRINT')) {
                              colorClasses = 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900/50';
                            } else if (upperKey.includes('CANCEL') || upperKey.includes('REJECT') || upperKey.includes('FAIL')) {
                              colorClasses = 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900/50';
                            } else if (upperKey.includes('DISPATCH') || upperKey.includes('SHIP')) {
                              colorClasses = 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900/50';
                            }

                            return (
                              <span
                                key={stKey}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-colors ${colorClasses}`}
                              >
                                {stKey}: {stVal}
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          <span className="font-bold">
                            Customer: {order.customerFirstName} {order.customerLastName}
                          </span>
                          <span>•</span>
                          <span>
                            City: {order.city || 'N/A'}, {order.state || ''}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-500">
                            Items: {order.totalChildCount || order.childOrders?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row Action Buttons */}
                    <div className="flex items-center gap-1.5 lg:justify-end">
                      {/* Action 1: Supplier Invoice Button */}
                      <button
                        type="button"
                        title="Add Supplier Invoice"
                        onClick={(e) => handleOpenSupplierInvoiceRow(order, e)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-300 bg-purple-50 text-purple-700 shadow-2xs hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300 transition-all"
                      >
                        <Receipt className="h-4 w-4" />
                      </button>

                      {/* Action 2: Assign Stock Button */}
                      <button
                        type="button"
                        title="Assign Stock"
                        onClick={(e) => handleAssignStockRow(order, e)}
                        disabled={assigningStockOrderId === order.id}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-800 shadow-2xs hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 transition-all disabled:opacity-50"
                      >
                        <Package className={`h-4 w-4 ${assigningStockOrderId === order.id ? 'animate-spin' : ''}`} />
                      </button>

                      {/* Action 3: Auto Courier Assign Button */}
                      <button
                        type="button"
                        title="Auto Courier Assign"
                        onClick={(e) => handleAutoCourierRow(order, e)}
                        disabled={assigningCourierOrderId === order.id}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-50 text-cyan-800 shadow-2xs hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 transition-all disabled:opacity-50"
                      >
                        <Truck className={`h-4 w-4 ${assigningCourierOrderId === order.id ? 'animate-spin' : ''}`} />
                      </button>

                      {/* Action 3: Print Customer Invoice Button */}
                      <button
                        type="button"
                        title="Print Customer Invoice"
                        onClick={(e) => handlePrintInvoiceRow(order, e)}
                        disabled={printingOrderId === order.id}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 shadow-2xs hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 transition-all disabled:opacity-50"
                      >
                        <Printer className={`h-4 w-4 ${printingOrderId === order.id ? 'animate-spin' : ''}`} />
                      </button>

                      {/* Action 4: Process / Edit Order Button */}
                      <button
                        type="button"
                        title="Process / Edit Order"
                        onClick={(e) => handleOpenProcessModal(order, e)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700 transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Expanded Child Orders Table */}
                  {isExpanded && (() => {
                    const childState = childOrdersMap[order.id];
                    const childItems = childState?.data || order.childOrders || [];
                    return (
                      <div className="p-4 bg-white dark:bg-slate-900 space-y-3 animate-in fade-in duration-150 border-t border-slate-100 dark:border-slate-800">
                        {childState?.loading ? (
                          <div className="flex items-center justify-center py-6 text-slate-500 gap-2 text-xs font-semibold">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span>Loading child order items...</span>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <tr>
                                  <th className="px-4 py-2.5">Child ID</th>
                                  <th className="px-4 py-2.5">Product Name</th>
                                  <th className="px-4 py-2.5">Product Code / HSN</th>
                                  <th className="px-3 py-2.5 text-center">Qty</th>
                                  <th className="px-4 py-2.5 text-right">Unit Price</th>
                                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {childItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                                      No child line items found for this parent order.
                                    </td>
                                  </tr>
                                ) : (
                                  childItems.map((child) => {
                                    const unitPrice = child.clientUnitPrice || child.unitPrice || 0;
                                    const totalAmt = child.totalAmount || unitPrice * (child.quantity || 1);
                                    return (
                                      <tr key={child.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        <td className="px-4 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                          #{child.id}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                          {child.clientProductName || child.productName || child.oneTimeProductName || 'Custom Item'}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                          <div>{child.clientProductCode || child.productCode || 'N/A'}</div>
                                          {child.hsnCode && (
                                            <div className="text-[10px] text-slate-400">HSN: {child.hsnCode}</div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-bold text-slate-900 dark:text-white">
                                          {child.quantity || 1}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                                          ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-extrabold text-blue-600 dark:text-blue-400">
                                          ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Process Order Modal */}
      <ProcessOrderModal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        parentOrder={activeProcessOrder}
        onRefresh={fetchOrders}
      />

      {/* Supplier Procurement Invoice Modal */}
      {showSupplierInvoiceModal && supplierInvoiceOrder && (
        <SupplierInvoiceModal
          isOpen={showSupplierInvoiceModal}
          onClose={() => {
            setShowSupplierInvoiceModal(false);
            setSupplierInvoiceOrder(null);
          }}
          adhocRefNo={supplierInvoiceOrder.orderRefNo}
          childProducts={childOrdersMap[supplierInvoiceOrder.id]?.data || supplierInvoiceOrder.childOrders}
          onSuccess={() => {
            fetchOrders();
            fetchChildOrdersForParent(supplierInvoiceOrder.id);
          }}
        />
      )}
    </div>
  );
};
