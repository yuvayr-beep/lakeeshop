'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Truck,
  Receipt,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  FileText,
  User,
  MapPin,
} from 'lucide-react';
import {
  adhocOrderService,
  ParentAdhocOrderResponse,
  ChildAdhocOrderItem,
} from '@/services/adhocOrder.service';
import { SupplierInvoiceModal } from './SupplierInvoiceModal';
import ManualCourierModal from './ManualCourierModal';
import { toast } from 'sonner';

interface ProcessOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentOrder: ParentAdhocOrderResponse | null;
  onRefresh?: () => void;
}

export const ProcessOrderModal: React.FC<ProcessOrderModalProps> = ({
  isOpen,
  onClose,
  parentOrder,
  onRefresh,
}) => {
  const [selectedChildIds, setSelectedChildIds] = useState<number[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [showManualCourierModal, setShowManualCourierModal] = useState<boolean>(false);

  // Courier Assignment Form State
  const [showCourierSection, setShowCourierSection] = useState<boolean>(false);
  const [selectedCourierCode, setSelectedCourierCode] = useState<string>('BLUEDART');
  const [selectedShipMode, setSelectedShipMode] = useState<string>('SURFACE');
  const [awbNo, setAwbNo] = useState<string>('');

  // Action Loading States
  const [assigningStock, setAssigningStock] = useState<boolean>(false);
  const [assigningCourier, setAssigningCourier] = useState<boolean>(false);
  const [printingInvoice, setPrintingInvoice] = useState<boolean>(false);

  const [fetchedChildOrders, setFetchedChildOrders] = useState<ChildAdhocOrderItem[]>([]);
  const [loadingChildOrders, setLoadingChildOrders] = useState<boolean>(false);

  useEffect(() => {
    setSelectedChildIds([]);
    setShowCourierSection(false);

    if (isOpen && parentOrder?.id) {
      if (!parentOrder.childOrders || parentOrder.childOrders.length === 0) {
        setLoadingChildOrders(true);
        adhocOrderService
          .getChildOrdersByParentId(parentOrder.id)
          .then((items) => {
            setFetchedChildOrders(items);
          })
          .catch((err) => {
            console.error('Failed to fetch child orders for process modal:', err);
            setFetchedChildOrders([]);
          })
          .finally(() => {
            setLoadingChildOrders(false);
          });
      } else {
        setFetchedChildOrders(parentOrder.childOrders);
      }
    } else {
      setFetchedChildOrders([]);
    }
  }, [isOpen, parentOrder]);

  const childItems = useMemo(() => {
    if (!isOpen || !parentOrder) return [];
    const list = fetchedChildOrders.length > 0 ? fetchedChildOrders : (parentOrder.childOrders || []);
    return [...list].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }, [isOpen, parentOrder, fetchedChildOrders]);

  const isAllChildSelected = useMemo(() => {
    if (childItems.length === 0) return false;
    return childItems.every((item) => selectedChildIds.includes(item.id));
  }, [childItems, selectedChildIds]);

  if (!isOpen || !parentOrder) return null;

  const toggleSelectAllChildren = () => {
    if (isAllChildSelected) {
      setSelectedChildIds([]);
    } else {
      setSelectedChildIds(childItems.map((item) => item.id));
    }
  };

  const toggleChildSelection = (id: number) => {
    setSelectedChildIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Status Badge Helper
  const getStatusBadge = (statusId?: number, statusName?: string) => {
    const rawStatus = statusName || (statusId ? String(statusId) : 'ACCEPTED');
    const displayStatus = rawStatus && rawStatus !== 'undefined' ? rawStatus : 'ACCEPTED';

    switch (statusId) {
      case 1:
      case 2:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            ACCEPTED
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            STOCK_ASSIGNED
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300">
            COURIER_ASSIGNED
          </span>
        );
      case 5:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:bg-teal-950/80 dark:text-teal-300">
            AWB_ASSIGNED
          </span>
        );
      case 6:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            INVOICE_PRINTED
          </span>
        );
      case 15:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 dark:bg-red-950/80 dark:text-red-300">
            CANCELLED
          </span>
        );
      default: {
        const upper = displayStatus.toUpperCase();
        let color = 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300';
        if (upper.includes('RECEIV')) {
          color = 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300';
        } else if (upper.includes('STOCK')) {
          color = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300';
        } else if (upper.includes('COURIER')) {
          color = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300';
        } else if (upper.includes('AWB')) {
          color = 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300';
        } else if (upper.includes('INVOICE') || upper.includes('PRINT')) {
          color = 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300';
        } else if (upper.includes('DISPATCH') || upper.includes('SHIP')) {
          color = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300';
        } else if (upper.includes('CANCEL') || upper.includes('REJECT') || upper.includes('FAIL')) {
          color = 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300';
        }

        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}>
            {displayStatus}
          </span>
        );
      }
    }
  };

  // Action 1: Stock Assignment
  const handleAssignStock = async () => {
    if (selectedChildIds.length === 0) {
      toast.error('Please select at least 1 line item to assign stock.');
      return;
    }

    setAssigningStock(true);
    try {
      const payload = selectedChildIds.map((id) => {
        const matchedItem = childItems.find((item) => item.id === id);
        return {
          childOrderId: id,
          adhocRefNo: parentOrder.orderRefNo,
          ...(matchedItem?.adhocItemId ? { adhocItemId: matchedItem.adhocItemId } : {}),
        };
      });

      await adhocOrderService.assignStockAdhoc(payload);
      toast.success(`Successfully assigned stock for ${selectedChildIds.length} item(s)!`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error assigning stock:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to assign stock.';
      toast.error(msg);
    } finally {
      setAssigningStock(false);
    }
  };

  // Action 3: Courier Assignment (Manual / Batch)
  const handleAssignCourierManual = async () => {
    if (selectedChildIds.length === 0) {
      toast.error('Please select at least 1 child order item to assign courier.');
      return;
    }

    setAssigningCourier(true);
    try {
      const payload = selectedChildIds.map((id) => ({
        executionId: id,
        courierCode: selectedCourierCode,
        shipMode: selectedShipMode,
        awbNo: awbNo.trim() || null,
      }));

      await adhocOrderService.assignCourierSingle(payload);
      toast.success(`Assigned courier ${selectedCourierCode} (${selectedShipMode})!`);
      setShowCourierSection(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error assigning courier:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to assign courier.');
    } finally {
      setAssigningCourier(false);
    }
  };

  const handleAssignCourierAuto = async () => {
    if (!parentOrder) return;
    setAssigningCourier(true);
    try {
      const res = await adhocOrderService.assignCourierBatch(
        parentOrder.orderRefNo,
        selectedChildIds.length > 0 ? selectedChildIds : undefined
      );
      const msg =
        typeof res === 'string'
          ? res
          : res?.message || `Auto-courier assignment processed for ${parentOrder.orderRefNo}!`;
      toast.success(msg);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error auto assigning courier:', err);
      const errMsg =
        err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Auto courier assignment failed.';
      toast.error(errMsg);
    } finally {
      setAssigningCourier(false);
    }
  };

  // Action 4: Invoice Print
  const handlePrintInvoice = async () => {
    setPrintingInvoice(true);
    try {
      await adhocOrderService.printCustomerInvoice(parentOrder.orderRefNo);
      toast.success(`Customer Invoice printed for ${parentOrder.orderRefNo}!`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error printing invoice:', err);
      toast.error('Failed to print customer invoice.');
    } finally {
      setPrintingInvoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Process Ad-Hoc Order:
              </span>
              <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                {parentOrder.orderRefNo}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Stock assignment, procurement invoices, courier dispatch & invoice printing
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Customer & Order Information Summary Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
          {/* Card 1: Customer */}
          <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
            <User className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Customer:</span>
              <p className="font-bold text-slate-900 dark:text-white">
                {parentOrder.customerFirstName} {parentOrder.customerLastName}
              </p>
              <p className="text-slate-500 text-[11px]">{parentOrder.mobile || 'No Mobile'}</p>
            </div>
          </div>

          {/* Card 2: Destination */}
          <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
            <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Destination:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {parentOrder.city}, {parentOrder.state} ({parentOrder.pincode})
              </p>
            </div>
          </div>

          {/* Card 3: Order Date */}
          <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
            <Clock className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Order Date:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {parentOrder.orderDate || 'N/A'}
              </p>
            </div>
          </div>

          {/* Card 4: Current Status */}
          <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
            <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Current Status:</span>
              <div className="mt-1">
                {getStatusBadge(
                  childItems[0]?.orderLineStatus || childItems[0]?.executionStatus,
                  childItems[0]?.statusName
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Child Order Line Items Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span>Order Line Items ({childItems.length})</span>
            </h4>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-all"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>+ Supplier Invoice</span>
              </button>

              <button
                type="button"
                onClick={handleAssignStock}
                disabled={selectedChildIds.length === 0 || assigningStock}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {assigningStock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                <span>Stock Assign ({selectedChildIds.length})</span>
              </button>

              {/* Manual Courier Button */}
              <button
                type="button"
                onClick={() => setShowManualCourierModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-cyan-700 transition-all"
                title="Select courier partner manually for specific selected child orders"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Manual Courier ({selectedChildIds.length > 0 ? selectedChildIds.length : 'All'})</span>
              </button>

              <button
                type="button"
                onClick={handlePrintInvoice}
                disabled={printingInvoice}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                {printingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                <span>Print Customer Invoice</span>
              </button>
            </div>
          </div>

          {/* Table Grid */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllChildSelected}
                      onChange={toggleSelectAllChildren}
                      className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                    />
                  </th>
                  <th className="px-4 py-3">Child ID</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-3 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-center">Pack Ref No</th>
                  <th className="px-4 py-3 text-center">Courier / AWB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {childItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                      No child order items available for this ad-hoc order reference.
                    </td>
                  </tr>
                ) : (
                  childItems.map((item) => {
                    const isChecked = selectedChildIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                          isChecked ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleChildSelection(item.id)}
                            className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                          #{item.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.clientProductName || item.productName || item.oneTimeProductName || 'Custom Adhoc Item'}
                          {(item.clientProductCode || item.productCode) && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              SKU: {item.clientProductCode || item.productCode}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-900 dark:text-white">
                          {item.quantity || 1}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                          ₹ {(item.clientUnitPrice ?? item.unitPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-[11px] font-bold text-purple-700 dark:purple-300">
                          {item.packRefNo || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-[11px]">
                          {item.courierCode ? (
                            <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                              {item.courierCode} {item.awbNo ? `(${item.awbNo})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>

      {/* Supplier Invoice Procurement Modal */}
      <SupplierInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        adhocRefNo={parentOrder.orderRefNo}
        onSuccess={onRefresh}
      />

      {/* Manual Courier Assignment Modal */}
      <ManualCourierModal
        isOpen={showManualCourierModal}
        onClose={() => setShowManualCourierModal(false)}
        selectedItems={
          selectedChildIds.length > 0
            ? childItems.filter((item) => selectedChildIds.includes(item.id))
            : childItems
        }
        adhocRefNo={parentOrder.orderRefNo}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
