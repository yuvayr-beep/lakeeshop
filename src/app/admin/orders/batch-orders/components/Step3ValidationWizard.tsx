'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Edit3, Loader2, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Save, ShieldAlert } from 'lucide-react';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchSummaryData, StagingErrorOrder } from '@/types/batchOrder';
import { EditStagingModal } from './EditStagingModal';

interface Step3ValidationWizardProps {
  batchId: number;
  onNext: () => void;
  onAbort: () => void;
  onSaveExit: () => void;
}

interface ErrorCategoryGroup {
  id: string;
  name: string;
  counterName: string;
  errorIds: number[];
  errorCodes: string[];
}

const ERROR_CATEGORIES: ErrorCategoryGroup[] = [
  {
    id: 'duplicate',
    name: 'Duplicate Orders',
    counterName: 'duplicateCount',
    errorIds: [30, 31],
    errorCodes: ['DUPLICATE_ORDER', 'DUPLICATE_ROW'],
  },
  {
    id: 'product',
    name: 'Product Validation',
    counterName: 'invalidProductCount',
    errorIds: [2, 20, 21, 22, 23],
    errorCodes: ['MISSING_PRODUCT', 'PRODUCT_NOT_FOUND', 'PRODUCT_NOT_SHARED', 'INVALID_ADHOC_PRODUCT', 'PRODUCT_BLOCKED'],
  },
  {
    id: 'pincode',
    name: 'Pincode Validation',
    counterName: 'invalidPincodeCount',
    errorIds: [7, 11, 50],
    errorCodes: ['MISSING_PINCODE', 'INVALID_PINCODE', 'UNSERVICEABLE_PINCODE'],
  },
  {
    id: 'mobile',
    name: 'Mobile Validation',
    counterName: 'invalidMobileCount',
    errorIds: [5, 10],
    errorCodes: ['MISSING_MOBILE', 'INVALID_MOBILE'],
  },
  {
    id: 'address',
    name: 'Address Validation',
    counterName: 'invalidAddressCount',
    errorIds: [4, 6],
    errorCodes: ['MISSING_CUSTOMER_NAME', 'MISSING_ADDRESS'],
  },
  {
    id: 'customer',
    name: 'Customer Validation',
    counterName: 'invalidCustomerCount',
    errorIds: [40],
    errorCodes: ['BLACKLISTED_CUSTOMER'],
  },
  {
    id: 'program',
    name: 'Program Validation',
    counterName: 'invalidProgramCount',
    errorIds: [24],
    errorCodes: ['PROGRAM_NOT_FOUND'],
  },
  {
    id: 'courier',
    name: 'Courier Validation',
    counterName: 'invalidCourierCount',
    errorIds: [70],
    errorCodes: ['COURIER_NOT_AVAILABLE'],
  },
  {
    id: 'price',
    name: 'Price Validation',
    counterName: 'invalidPriceCount',
    errorIds: [13, 60, 61, 62],
    errorCodes: ['INVALID_PRICE', 'PRICE_MISSING', 'PRICE_MISMATCH', 'INVALID_PRICE_TYPE'],
  },
  {
    id: 'order',
    name: 'Order Validation',
    counterName: 'invalidOrderCount',
    errorIds: [1, 3, 12, 14, 80, 81, 90, 100, 101],
    errorCodes: [
      'MISSING_CLIENT_ORDER_NO',
      'MISSING_QUANTITY',
      'INVALID_QUANTITY',
      'INVALID_DATE',
      'COLUMN_MAPPING_MISSING',
      'UNKNOWN_COLUMN',
      'SYSTEM_ERROR',
      'ORIGINAL_ORDER_NOT_FOUND',
      'ORDER_NOT_ELIGIBLE_FOR_RESHIP',
    ],
  },
];

export const Step3ValidationWizard: React.FC<Step3ValidationWizardProps> = ({
  batchId,
  onNext,
  onAbort,
  onSaveExit,
}) => {
  // Batch Summary State
  const [summary, setSummary] = useState<BatchSummaryData | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [revalidating, setRevalidating] = useState<boolean>(false);

  // Expanded Accordion ID State (allows toggling accordions)
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('pincode');

  // Selected Sub-Error ID State per Category
  const [selectedErrorIdMap, setSelectedErrorIdMap] = useState<Record<string, number>>({});

  // Staging Error Orders List State
  const [errorOrders, setErrorOrders] = useState<StagingErrorOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  // Modal State
  const [editingOrder, setEditingOrder] = useState<StagingErrorOrder | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch summary function
  const fetchSummary = useCallback(async () => {
    try {
      const data = await batchOrderService.getBatchSummary(batchId);
      setSummary(data);

      const isProcessing = data?.status === 'PROCESSING' || data?.batchStatus === 1;
      if (!isProcessing) {
        setIsPolling(false);
      }
      return data;
    } catch (err) {
      console.warn('Failed to fetch batch summary:', err);
      setIsPolling(false);
      return null;
    }
  }, [batchId]);

  // Polling loop
  useEffect(() => {
    fetchSummary();

    pollTimerRef.current = setInterval(async () => {
      const currentData = await fetchSummary();
      const isProcessing = currentData?.status === 'PROCESSING' || currentData?.batchStatus === 1;
      if (!isProcessing) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setIsPolling(false);
      }
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchSummary]);

  // Calculate error count for a category
  const getCategoryErrorCount = useCallback(
    (cat: ErrorCategoryGroup): number => {
      if (!summary?.errorSummary) return 0;
      return summary.errorSummary
        .filter((e) => cat.errorIds.includes(e.errorId))
        .reduce((sum, e) => sum + e.count, 0);
    },
    [summary]
  );

  const hasAutoExpandedRef = useRef<boolean>(false);

  // Reset auto expand flag when batchId changes
  useEffect(() => {
    hasAutoExpandedRef.current = false;
  }, [batchId]);

  // Auto expand first failing category ONCE when initial summary loads
  useEffect(() => {
    if (!hasAutoExpandedRef.current && summary?.errorSummary && summary.errorSummary.length > 0) {
      const firstFailingCat = ERROR_CATEGORIES.find((cat) => getCategoryErrorCount(cat) > 0);
      if (firstFailingCat) {
        setExpandedCategoryId(firstFailingCat.id);
        hasAutoExpandedRef.current = true;
      }
    }
  }, [summary, getCategoryErrorCount]);

  // Active Category & Selected Error ID
  const activeCategory = ERROR_CATEGORIES.find((c) => c.id === expandedCategoryId);
  const activeErrorId = expandedCategoryId ? selectedErrorIdMap[expandedCategoryId] || null : null;

  // Auto-select first error code chip when category opens
  useEffect(() => {
    if (!expandedCategoryId) return;
    const cat = ERROR_CATEGORIES.find((c) => c.id === expandedCategoryId);
    if (!cat) return;

    const catErrorItems = (summary?.errorSummary || []).filter((e) => cat.errorIds.includes(e.errorId));
    if (catErrorItems.length > 0) {
      const currentVal = selectedErrorIdMap[expandedCategoryId];
      const exists = catErrorItems.some((e) => e.errorId === currentVal);
      if (!exists) {
        setSelectedErrorIdMap((prev) => ({
          ...prev,
          [expandedCategoryId]: catErrorItems[0].errorId,
        }));
      }
    } else if (cat.errorIds.length > 0) {
      setSelectedErrorIdMap((prev) => ({
        ...prev,
        [expandedCategoryId]: cat.errorIds[0],
      }));
    }
  }, [expandedCategoryId, summary, selectedErrorIdMap]);

  // Fetch error orders when activeErrorId changes
  const fetchErrorOrders = useCallback(async () => {
    if (!activeErrorId || !expandedCategoryId) {
      setErrorOrders([]);
      return;
    }
    setLoadingOrders(true);
    try {
      const rows = await batchOrderService.getErrorOrders(batchId, activeErrorId);
      setErrorOrders(rows);
    } catch (err) {
      console.warn('Error fetching error orders:', err);
      setErrorOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [batchId, activeErrorId, expandedCategoryId]);

  useEffect(() => {
    fetchErrorOrders();
  }, [fetchErrorOrders]);

  // Toggle Accordion expansion
  const toggleAccordion = (catId: string) => {
    setExpandedCategoryId((prev) => (prev === catId ? null : catId));
  };

  // Trigger Revalidate Batch
  const handleRevalidateBatch = async () => {
    setRevalidating(true);
    try {
      await batchOrderService.validateBatch(batchId);
      setIsPolling(true);
      await fetchSummary();
    } catch (err) {
      console.error('Revalidate failed:', err);
    } finally {
      setRevalidating(false);
    }
  };

  const handleAbort = async () => {
    if (window.confirm(`Are you sure you want to abort batch #${batchId}?`)) {
      try {
        await batchOrderService.deleteBatch(batchId);
      } catch (err) {
        console.warn('Delete batch error:', err);
      }
      onAbort();
    }
  };

  const handleEditSuccess = (updatedOrder: StagingErrorOrder) => {
    setErrorOrders((prev) =>
      prev.map((o) => (o.stagingId === updatedOrder.stagingId ? updatedOrder : o))
    );
    fetchSummary();
  };

  const totalCount = summary?.totalRows ?? 0;
  const passCount = summary?.passRows ?? 0;
  const failCount = summary?.failRows ?? 0;
  const statusStr = summary?.status || (isPolling ? 'PROCESSING' : 'VALIDATED');

  return (
    <div className="w-full space-y-6">
      {/* Top Banner Header Summary */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Order Data Validation Engine
            </h2>
            <p className="text-xs text-slate-500">
              Batch #{batchId} • Status:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {statusStr}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <div className="text-blue-600 dark:text-blue-400">
              Total Count: <span className="text-sm font-bold">{totalCount}</span>
            </div>
            <div className="text-emerald-600 dark:text-emerald-400">
              Total Pass Count: <span className="text-sm font-bold">{passCount}</span>
            </div>
            <div className="text-red-600 dark:text-red-400">
              Total Fail Count: <span className="text-sm font-bold">{failCount}</span>
            </div>

            <button
              onClick={handleRevalidateBatch}
              disabled={revalidating || isPolling}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {revalidating || isPolling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Revalidate Batch
            </button>
          </div>
        </div>
      </div>

      {/* Accordion Categories List */}
      <div className="space-y-3">
        {ERROR_CATEGORIES.map((cat) => {
          const count = getCategoryErrorCount(cat);
          const isExpanded = expandedCategoryId === cat.id;
          const categoryErrorItems = (summary?.errorSummary || []).filter((e) =>
            cat.errorIds.includes(e.errorId)
          );
          const currentSelectedErrorId = selectedErrorIdMap[cat.id];

          return (
            <div
              key={cat.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'border-blue-500 bg-white shadow-md dark:border-blue-600 dark:bg-slate-900'
                  : 'border-slate-200 bg-white shadow-xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              {/* Accordion Header Bar */}
              <button
                type="button"
                onClick={() => toggleAccordion(cat.id)}
                className={`flex w-full items-center justify-between p-4 text-left transition-colors ${
                  count > 0
                    ? 'bg-red-50/40 hover:bg-red-50/70 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                    : 'bg-slate-50/40 hover:bg-slate-50/80 dark:bg-slate-800/20 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Category Type Badge */}
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold ${
                      count > 0
                        ? 'bg-red-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {count > 0 ? 'FAIL' : 'PASS'}
                  </span>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {cat.name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          count > 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {count} {count === 1 ? 'Error' : 'Errors'}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Accordion Expanded Content Body */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-6 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                  {/* Sub Error Code Chips */}
                  <div className="flex flex-wrap gap-2 pb-2">
                    {categoryErrorItems.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>All rows passed validation for {cat.name}. Zero errors.</span>
                      </div>
                    ) : (
                      categoryErrorItems.map((errItem) => {
                        const isSelected = errItem.errorId === currentSelectedErrorId;
                        return (
                          <button
                            key={errItem.errorId}
                            onClick={() =>
                              setSelectedErrorIdMap((prev) => ({
                                ...prev,
                                [cat.id]: errItem.errorId,
                              }))
                            }
                            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'border-red-500 bg-red-50 text-red-700 shadow-xs dark:bg-red-950 dark:text-red-300'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <span>{errItem.errorCode}</span>
                            <span className="rounded-md bg-red-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                              {errItem.count}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Error Staging Rows Table inside Expanded Accordion */}
                  {categoryErrorItems.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Failing Rows ({errorOrders.length})
                        </h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
                              <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                              <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                              <th className="px-3 py-2.5 font-semibold uppercase">ADDRESS LINE 1 & 2</th>
                              <th className="px-3 py-2.5 font-semibold uppercase">CITY - PINCODE</th>
                              <th className="px-3 py-2.5 font-semibold uppercase">MOBILE NUMBER</th>
                              <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                              <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                              <th className="px-3 py-2.5 text-center font-semibold uppercase">EDIT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 bg-white dark:divide-slate-800 dark:bg-slate-900">
                            {loadingOrders ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-500">
                                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                                  <span className="mt-2 block text-xs">Loading failing order records...</span>
                                </td>
                              </tr>
                            ) : errorOrders.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-500">
                                  No failing records found for selected error code.
                                </td>
                              </tr>
                            ) : (
                              errorOrders.map((row) => (
                                <tr key={row.stagingId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                    {row.clientOrderNo || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                    {row.customerName || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                                    {[row.addressLine1, row.addressLine2].filter(Boolean).join(', ') || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono">
                                    {[row.city, row.pincode].filter(Boolean).join(' - ') || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono">
                                    {row.mobile || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                    {row.clientProductCode || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-red-600 dark:text-red-400 font-medium max-w-[150px] truncate">
                                    {row.remarks || 'Validation failure'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <button
                                      onClick={() => setEditingOrder(row)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      Edit
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onSaveExit}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
        >
          Save (&) Exit
        </button>
        <button
          type="button"
          onClick={handleAbort}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
        >
          Abort
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
        >
          Next
        </button>
      </div>

      {/* Inline Edit Modal */}
      <EditStagingModal
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        stagingOrder={editingOrder}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};
