'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Edit3, Loader2, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Save, ShieldAlert, Download } from 'lucide-react';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchSummaryData, StagingErrorOrder } from '@/types/batchOrder';
import { EditStagingModal } from './EditStagingModal';
import { DeleteBatchModal } from './DeleteBatchModal';

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

const formatSafeText = (val: any, fallback = ''): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    if (val.reason) return String(val.reason);
    if (val.message) return String(val.message);
    if (val.errorMessage) return String(val.errorMessage);
    if (val.remarks) return String(val.remarks);
    if (val.error) return String(val.error);
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export const Step3ValidationHeader: React.FC<{
  batchId: number;
  summary: BatchSummaryData | null;
  isPolling: boolean;
  revalidating: boolean;
  onRevalidate: () => void;
}> = ({ batchId, summary, isPolling, revalidating, onRevalidate }) => {
  const totalCount = summary?.totalRows ?? 0;
  const passCount = summary?.passRows ?? 0;
  const warnCount = summary?.warningRows ?? (summary as any)?.warningCount ?? 0;
  const failCount = summary?.failRows ?? 0;
  const statusStr = summary?.status || (isPolling ? 'PROCESSING' : 'VALIDATED');

  return null;
  /*
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="text-amber-600 dark:text-amber-400">
          Total Warn Count: <span className="text-sm font-bold">{warnCount}</span>
        </div>
        <div className="text-red-600 dark:text-red-400">
          Total Fail Count: <span className="text-sm font-bold">{failCount}</span>
        </div>

        <button
          onClick={onRevalidate}
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
  );
  */
};

export const Step3ValidationAccordionsCard: React.FC<{
  batchId: number;
  onNext: () => void;
  onAbort: () => void;
  onSaveExit: () => void;
}> = ({ batchId, onNext, onAbort, onSaveExit }) => {
  const [summary, setSummary] = useState<BatchSummaryData | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('pincode');
  const [selectedErrorIdMap, setSelectedErrorIdMap] = useState<Record<string, number>>({});
  const [errorOrders, setErrorOrders] = useState<StagingErrorOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<StagingErrorOrder | null>(null);
  const [showAbortModal, setShowAbortModal] = useState<boolean>(false);
  const [downloadingErrorId, setDownloadingErrorId] = useState<number | null>(null);
  const [downloadingSplit, setDownloadingSplit] = useState<boolean>(false);
  const [splitOrders, setSplitOrders] = useState<StagingErrorOrder[]>([]);
  const [loadingSplitOrders, setLoadingSplitOrders] = useState<boolean>(false);
  const [isSplitExpanded, setIsSplitExpanded] = useState<boolean>(false);

  const handleDownloadSplitOrdersData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingSplit(true);
      const rows = splitOrders.length > 0 ? splitOrders : await batchOrderService.getSplitOrders(batchId);
      if (!rows || rows.length === 0) {
        alert('No split order records found to download.');
        return;
      }

      const excludedKeys = ['stagingId', 'rowNo', 'staging_id', 'row_no'];
      const keys = Array.from(new Set(rows.flatMap((item) => Object.keys(item)))).filter(
        (k) => !excludedKeys.includes(k)
      );

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          str = `"${str}"`;
        }
        return str;
      };

      const headerRow = keys.map(escapeCsv).join(',');
      const dataRows = rows.map((row: any) => keys.map((k) => escapeCsv(row[k])).join(','));
      const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Batch_${batchId}_Split_Orders.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download split orders data:', err);
      alert('Failed to download split orders data. Please try again.');
    } finally {
      setDownloadingSplit(false);
    }
  };

  const fetchSplitOrders = useCallback(async () => {
    if (!batchId) return;
    setLoadingSplitOrders(true);
    try {
      const data = await batchOrderService.getSplitOrders(batchId);
      setSplitOrders(data || []);
    } catch (err) {
      console.warn('Error fetching split orders:', err);
      setSplitOrders([]);
    } finally {
      setLoadingSplitOrders(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchSplitOrders();
  }, [fetchSplitOrders]);

  const handleSelectErrorTab = (
    e: React.MouseEvent,
    catId: string,
    errorId: number
  ) => {
    e.stopPropagation();
    if (expandedCategoryId !== catId) {
      setExpandedCategoryId(catId);
    }
    setSelectedErrorIdMap((prev) => ({
      ...prev,
      [catId]: errorId,
    }));
  };

  const handleDownloadAccordionErrorData = async (
    e: React.MouseEvent,
    catId: string,
    errorId: number,
    errorCode: string
  ) => {
    e.stopPropagation();
    if (expandedCategoryId !== catId) {
      setExpandedCategoryId(catId);
    }
    setSelectedErrorIdMap((prev) => ({
      ...prev,
      [catId]: errorId,
    }));

    try {
      setDownloadingErrorId(errorId);
      const rows = await batchOrderService.getErrorOrders(batchId, errorId);
      if (!rows || rows.length === 0) {
        alert(`No error records found for ${errorCode}.`);
        return;
      }

      // Extract all unique keys across returned objects, excluding stagingId and rowNo
      const excludedKeys = ['stagingId', 'rowNo', 'staging_id', 'row_no'];
      const keys = Array.from(new Set(rows.flatMap((item) => Object.keys(item)))).filter(
        (k) => !excludedKeys.includes(k)
      );

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          str = `"${str}"`;
        }
        return str;
      };

      const headerRow = keys.map(escapeCsv).join(',');
      const dataRows = rows.map((row: any) => keys.map((k) => escapeCsv(row[k])).join(','));
      const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Batch_${batchId}_Error_${errorCode}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to download error data for ${errorCode}:`, err);
      alert(`Failed to download error data for ${errorCode}. Please try again.`);
    } finally {
      setDownloadingErrorId(null);
    }
  };

  const fetchSummary = useCallback(async () => {
    try {
      const data = await batchOrderService.getBatchSummary(batchId);
      setSummary(data);
    } catch (err) {
      console.warn('Failed to fetch summary:', err);
    }
  }, [batchId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

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

  useEffect(() => {
    hasAutoExpandedRef.current = false;
  }, [batchId]);

  useEffect(() => {
    if (!hasAutoExpandedRef.current && summary?.errorSummary && summary.errorSummary.length > 0) {
      const firstFailingCat = ERROR_CATEGORIES.find((cat) => getCategoryErrorCount(cat) > 0);
      if (firstFailingCat) {
        setExpandedCategoryId(firstFailingCat.id);
        hasAutoExpandedRef.current = true;
      }
    }
  }, [summary, getCategoryErrorCount]);

  const activeErrorId = expandedCategoryId ? selectedErrorIdMap[expandedCategoryId] || null : null;

  useEffect(() => {
    if (!expandedCategoryId) return;
    const cat = ERROR_CATEGORIES.find((c) => c.id === expandedCategoryId);
    if (!cat) return;

    const catErrorItems = (summary?.errorSummary || []).filter((e) => cat.errorIds.includes(e.errorId));
    const currentVal = selectedErrorIdMap[expandedCategoryId];

    if (catErrorItems.length > 0) {
      const exists = catErrorItems.some((e) => e.errorId === currentVal);
      if (!exists) {
        setSelectedErrorIdMap((prev) => ({
          ...prev,
          [expandedCategoryId]: catErrorItems[0].errorId,
        }));
      }
    } else if (cat.errorIds.length > 0) {
      if (currentVal !== cat.errorIds[0]) {
        setSelectedErrorIdMap((prev) => ({
          ...prev,
          [expandedCategoryId]: cat.errorIds[0],
        }));
      }
    }
  }, [expandedCategoryId, summary, selectedErrorIdMap]);

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

  useEffect(() => {
    const handleSummaryUpdated = (e: any) => {
      if (e.detail?.batchId === batchId && e.detail?.data) {
        setSummary(e.detail.data);
      }
    };
    const handleRevalidated = (e: any) => {
      if (e.detail?.batchId === batchId) {
        fetchSummary();
        fetchErrorOrders();
        fetchSplitOrders();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('batch-summary-updated', handleSummaryUpdated);
      window.addEventListener('batch-revalidated', handleRevalidated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('batch-summary-updated', handleSummaryUpdated);
        window.removeEventListener('batch-revalidated', handleRevalidated);
      }
    };
  }, [batchId, fetchSummary, fetchErrorOrders, fetchSplitOrders]);

  const toggleAccordion = (catId: string) => {
    setExpandedCategoryId((prev) => (prev === catId ? null : catId));
  };

  const handleEditSuccess = async (updatedOrder: StagingErrorOrder) => {
    setErrorOrders((prev) =>
      prev.map((o) => (o.stagingId === updatedOrder.stagingId ? updatedOrder : o))
    );
    setSplitOrders((prev) =>
      prev.map((o) => (o.stagingId === updatedOrder.stagingId ? updatedOrder : o))
    );
    await fetchSummary();
    await fetchErrorOrders();
    await fetchSplitOrders();
  };

  const [revalidatingBatch, setRevalidatingBatch] = useState<boolean>(false);

  const handleRevalidateBatchAction = async () => {
    setRevalidatingBatch(true);
    try {
      await batchOrderService.revalidateBatch(batchId);
      await fetchSummary();
      await fetchErrorOrders();
      await fetchSplitOrders();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('batch-revalidated', { detail: { batchId } })
        );
      }
    } catch (err) {
      console.warn('Revalidate batch error:', err);
    } finally {
      setRevalidatingBatch(false);
    }
  };

  const handleAbortAction = async () => {
    if (window.confirm(`Are you sure you want to abort batch #${batchId}?`)) {
      try {
        await batchOrderService.deleteBatch(batchId);
      } catch (err) {
        console.warn('Delete batch error:', err);
      }
      onAbort();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      <div className="border-b border-slate-100 pb-3 dark:border-slate-800 space-y-1.5">
        {/* Top Header Row with Title + Batch Badge + Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Order Data Validation Engine
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span>Batch #{batchId}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>Status:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900 text-[11px]">
                VALIDATED
              </span>
            </div>

            {/* Revalidate Batch Button Next to Batch & Status */}
            <button
              type="button"
              disabled={revalidatingBatch}
              onClick={handleRevalidateBatchAction}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
              title="Re-run validation engine for this batch"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${revalidatingBatch ? 'animate-spin' : ''}`} />
              <span>Revalidate Batch</span>
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSaveExit}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
            >
              Save (&) Exit
            </button>
            <button
              type="button"
              onClick={handleAbortAction}
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 shadow-2xs hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400 transition-all cursor-pointer"
            >
              Abort
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>

        {/* Simple Text Format Metrics Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <div>
            <span>Total Count: </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {summary?.totalRows ?? (summary as any)?.totalOrders ?? (summary as any)?.totalCount ?? 0}
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <div>
            <span>Total Pass Count: </span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary?.passRows ?? (summary as any)?.savedRows ?? (summary as any)?.passCount ?? 0}
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <div>
            <span>Total Warn Count: </span>
            <span className="font-extrabold text-amber-600 dark:text-amber-400">
              {summary?.warningRows ?? (summary as any)?.warningCount ?? 0}
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <div>
            <span>Total Fail Count: </span>
            <span className="font-extrabold text-red-600 dark:text-red-400">
              {summary?.failRows ?? (summary as any)?.failedRows ?? 0}
            </span>
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
          const activeErrItem = categoryErrorItems.find((e) => e.errorId === currentSelectedErrorId);
          const isCurrentSelectedWarning = activeErrItem?.blocking === false;
          const isAllWarnings = categoryErrorItems.length > 0 && categoryErrorItems.every((e) => e.blocking === false);
          const isMissingProductSelected = cat.id === 'product' && activeErrItem?.errorCode === 'MISSING_PRODUCT';

          return (
            <div
              key={cat.id}
              className={`rounded-2xl border transition-all overflow-hidden ${isExpanded
                ? isAllWarnings
                  ? 'border-amber-500 bg-white shadow-md dark:border-amber-600 dark:bg-slate-900'
                  : 'border-blue-500 bg-white shadow-md dark:border-blue-600 dark:bg-slate-900'
                : 'border-slate-200 bg-white shadow-xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                }`}
            >
              {/* Accordion Header Bar */}
              <button
                type="button"
                onClick={() => toggleAccordion(cat.id)}
                className={`flex w-full items-center justify-between p-2 text-left transition-colors ${count > 0
                  ? isAllWarnings
                    ? 'bg-amber-50/50 hover:bg-amber-50/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
                    : 'bg-red-50/40 hover:bg-red-50/70 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                  : 'bg-slate-50/40 hover:bg-slate-50/80 dark:bg-slate-800/20 dark:hover:bg-slate-800/40'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold ${count > 0
                      ? isAllWarnings
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-emerald-600 text-white'
                      }`}
                  >
                    {count > 0 ? (isAllWarnings ? 'WARN' : 'FAIL') : 'PASS'}
                  </span>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {cat.name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${count > 0
                          ? isAllWarnings
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                      >
                        {count}{' '}
                        {isAllWarnings
                          ? count === 1
                            ? 'Warning'
                            : 'Warnings'
                          : count === 1
                            ? 'Error'
                            : 'Errors'}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* ERROR/WARNING Name Badges at the END of Accordion Header */}
                  {categoryErrorItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {categoryErrorItems.map((errItem) => {
                        const isSelected = errItem.errorId === currentSelectedErrorId;
                        const isDownloading = downloadingErrorId === errItem.errorId;
                        const isWarning = errItem.blocking === false;

                        return (
                          <span
                            key={errItem.errorId}
                            onClick={(e) =>
                              handleSelectErrorTab(e, cat.id, errItem.errorId)
                            }
                            title={`Click to view ${errItem.errorCode} ${isWarning ? 'warning' : 'error'
                              } list`}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-mono font-semibold border transition-all cursor-pointer group ${isWarning
                              ? isSelected
                                ? 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 shadow-xs font-bold ring-2 ring-amber-400/40'
                                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : isSelected
                                ? 'border-red-500 bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 shadow-xs ring-2 ring-red-400/40 font-bold'
                                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                          >
                            <span>{errItem.errorCode}</span>
                            <span
                              className={`rounded-md px-1 py-0.2 text-[10px] font-bold text-white ${isWarning ? 'bg-amber-600' : 'bg-red-600'
                                }`}
                            >
                              {errItem.count}
                            </span>
                            {isWarning && (
                              <span className="rounded bg-amber-200 px-1 py-0.2 text-[9px] font-extrabold uppercase text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                                Warning
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDownloadAccordionErrorData(e, cat.id, errItem.errorId, errItem.errorCode)
                              }
                              title={`Download ${errItem.errorCode} CSV data`}
                              disabled={isDownloading}
                              className="ml-0.5 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            >
                              {isDownloading ? (
                                <Loader2
                                  className={`h-3 w-3 animate-spin ${isWarning ? 'text-amber-600' : 'text-red-600'
                                    }`}
                                />
                              ) : (
                                <Download
                                  className={`h-3 w-3 opacity-70 hover:opacity-100 transition-opacity ${isWarning
                                    ? 'text-amber-800 dark:text-amber-300'
                                    : 'text-red-800 dark:text-red-300'
                                    }`}
                                />
                              )}
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                  )}
                </div>
              </button>

              {/* Accordion Expanded Content Body */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-6 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                  {categoryErrorItems.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>All rows passed validation for {cat.name}. Zero errors.</span>
                    </div>
                  ) : (
                    /* Error Staging Rows Table inside Expanded Accordion */
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            {isCurrentSelectedWarning ? 'Warning Records' : 'Failing Rows'} ({errorOrders.length})
                          </h4>
                          {activeErrItem && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-bold ${isCurrentSelectedWarning
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/50'
                                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300/50'
                                }`}
                            >
                              {activeErrItem.errorCode}
                            </span>
                          )}
                        </div>

                        {activeErrItem && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDownloadAccordionErrorData(
                                e,
                                cat.id,
                                activeErrItem.errorId,
                                activeErrItem.errorCode
                              )
                            }
                            disabled={downloadingErrorId === activeErrItem.errorId}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                            title={`Download ${activeErrItem.errorCode} CSV`}
                          >
                            {downloadingErrorId === activeErrItem.errorId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            ) : (
                              <Download className="h-3.5 w-3.5 text-slate-500" />
                            )}
                            <span>Download {activeErrItem.errorCode} CSV</span>
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
                              {cat.id === 'product' ? (
                                isMissingProductSelected ? (
                                  <>
                                    <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                    <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT NAME</th>
                                    <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                    <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                    <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                    <th className="px-3 py-2.5 text-center font-semibold uppercase">EDIT</th>
                                  </>
                                ) : (
                                  <>
                                    <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                    <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT NAME</th>
                                    <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                    <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                    <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                  </>
                                )
                              ) : cat.id === 'mobile' ? (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">EDIT</th>
                                </>
                              ) : cat.id === 'customer' ? (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                </>
                              ) : cat.id === 'courier' ? (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT NAME</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                </>
                              ) : cat.id === 'price' ? (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT NAME</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                </>
                              ) : cat.id === 'pincode' ? (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">EDIT</th>
                                </>
                              ) : cat.id === 'address' ? (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">EDIT</th>
                                </>
                              ) : cat.id === 'duplicate' ? (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">QUANTITY</th>
                                  <th className="px-3 py-2.5 font-semibold uppercase">REASON</th>
                                  <th className="px-3 py-2.5 text-center font-semibold uppercase">EDIT</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 bg-white dark:divide-slate-800 dark:bg-slate-900">
                            {loadingOrders ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-500">
                                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                                  <span className="mt-2 block text-xs">Loading order records...</span>
                                </td>
                              </tr>
                            ) : errorOrders.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-500">
                                  No records found for selected error code.
                                </td>
                              </tr>
                            ) : (
                              errorOrders.map((row) => {
                                const isRowWarning = row.blocking === false || isCurrentSelectedWarning;

                                return (
                                  <tr key={row.stagingId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                    {cat.id === 'product' ? (
                                      isMissingProductSelected ? (
                                        <>
                                          <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                            {row.clientOrderNo || '-'}
                                          </td>
                                          <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white max-w-[250px] truncate">
                                            {row.productName || row.clientProductName || (row as any).productTitle || '-'}
                                          </td>
                                          <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                            {row.clientProductCode || '-'}
                                          </td>
                                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                            {row.quantity ?? row.orderQuantity ?? 0}
                                          </td>
                                          <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                            {isRowWarning ? (
                                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                                <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                              </span>
                                            ) : (
                                              <span className="text-red-600 dark:text-red-400 font-medium">
                                                {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                              </span>
                                            )}
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
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                            {row.clientOrderNo || '-'}
                                          </td>
                                          <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white max-w-[250px] truncate">
                                            {row.productName || row.clientProductName || (row as any).productTitle || '-'}
                                          </td>
                                          <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                            {row.clientProductCode || '-'}
                                          </td>
                                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                            {row.quantity ?? row.orderQuantity ?? 0}
                                          </td>
                                          <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                            {isRowWarning ? (
                                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                                <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                              </span>
                                            ) : (
                                              <span className="text-red-600 dark:text-red-400 font-medium">
                                                {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                              </span>
                                            )}
                                          </td>
                                        </>
                                      )
                                    ) : cat.id === 'mobile' ? (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                          {row.customerName || [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ') || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
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
                                      </>
                                    ) : cat.id === 'customer' ? (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                          {row.customerName || [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ') || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
                                        </td>
                                      </>
                                    ) : cat.id === 'courier' ? (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white max-w-[250px] truncate">
                                          {row.productName || row.clientProductName || (row as any).productTitle || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
                                        </td>
                                      </>
                                    ) : cat.id === 'price' ? (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white max-w-[250px] truncate">
                                          {row.productName || row.clientProductName || (row as any).productTitle || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
                                        </td>
                                      </>
                                    ) : cat.id === 'pincode' ? (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                          {row.customerName || [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ') || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
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
                                      </>
                                    ) : cat.id === 'address' ? (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                          {row.customerName || [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ') || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
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
                                      </>
                                    ) : cat.id === 'duplicate' ? (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                          {row.customerName || [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ') || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                          {row.clientOrderNo || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                          {row.customerName || [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ') || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          {row.clientProductCode || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {row.quantity ?? row.orderQuantity ?? 0}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">
                                          {isRowWarning ? (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50">
                                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                              <span className="truncate">{formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Warning')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatSafeText(row.remarks || row.errorMessage || (row as any).reason, 'Validation failure')}
                                            </span>
                                          )}
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
                                      </>
                                    )}
                                  </tr>
                                );
                              })
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

        {/* Split Orders Accordion */}
        <div
          className={`rounded-2xl border transition-all overflow-hidden ${isSplitExpanded
            ? 'border-purple-500 bg-white shadow-md dark:border-purple-600 dark:bg-slate-900'
            : 'border-slate-200 bg-white shadow-xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
        >
          {/* Accordion Header Bar */}
          <button
            type="button"
            onClick={() => setIsSplitExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between p-3 text-left transition-colors bg-purple-50/40 hover:bg-purple-50/70 dark:bg-purple-950/20 dark:hover:bg-purple-950/30"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold bg-purple-600 text-white">
                SPLIT
              </span>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Split Orders
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    {loadingSplitOrders ? '...' : `${splitOrders.length} Split Orders`}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadSplitOrdersData}
                disabled={downloadingSplit}
                title="Download Split Orders Excel/CSV"
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-all disabled:opacity-50"
              >
                {downloadingSplit ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>Download Excel</span>
              </button>

              {isSplitExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-500 shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
              )}
            </div>
          </button>

          {/* Accordion Expanded Content Body */}
          {isSplitExpanded && (
            <div className="border-t border-slate-100 p-6 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
              {loadingSplitOrders ? (
                <div className="py-8 text-center text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-purple-600" />
                  <span className="mt-2 block text-xs">Loading split order records...</span>
                </div>
              ) : splitOrders.length === 0 ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>No split orders found for this batch.</span>
                </div>
              ) : (
                /* Split Orders Table */
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Split Order Records ({splitOrders.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleDownloadSplitOrdersData}
                      disabled={downloadingSplit}
                      title="Download Split Orders Excel/CSV"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 transition-all disabled:opacity-50"
                    >
                      {downloadingSplit ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>Download Excel</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
                          <th className="px-3 py-2.5 font-semibold uppercase">CLIENT ORDER NO</th>
                          <th className="px-3 py-2.5 font-semibold uppercase">CUSTOMER NAME</th>
                          <th className="px-3 py-2.5 font-semibold uppercase">PRODUCT CODE</th>
                          <th className="px-3 py-2.5 text-center font-semibold uppercase">TOTAL QTY</th>
                          <th className="px-3 py-2.5 text-center font-semibold uppercase">SPLIT QTY</th>
                          <th className="px-3 py-2.5 font-semibold uppercase">STATUS / REMARKS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 bg-white dark:divide-slate-800 dark:bg-slate-900">
                        {splitOrders.map((row) => (
                          <tr key={row.stagingId || row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                              {row.clientOrderNo || '-'}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                              {row.customerName || [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ') || '-'}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                              {row.clientProductCode || row.productCode || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                              {row.quantity ?? row.orderQuantity ?? 0}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {row.splitQty ?? 2} per pkg
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate">
                              {row.remarks || (row.isSplit ? `Split Order (${row.splitQty ?? 2} qty split)` : 'Split Order')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Controls - Temporarily disabled below; available in top header
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onSaveExit}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
        >
          Save (&) Exit
        </button>
        <button
          type="button"
          onClick={() => setShowAbortModal(true)}
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
      */}

      {/* Inline Edit Modal */}
      <EditStagingModal
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        stagingOrder={editingOrder}
        onSuccess={handleEditSuccess}
        categoryId={expandedCategoryId || undefined}
      />

      {/* Centered Abort Confirmation Modal */}
      <DeleteBatchModal
        isOpen={showAbortModal}
        onClose={() => setShowAbortModal(false)}
        onSuccess={onAbort}
        batchId={batchId}
        title={`Abort Batch #${summary?.batchNo || `202600${batchId}`}?`}
        actionLabel="Abort Batch"
      />
    </div>
  );
};

export const Step3ValidationWizard: React.FC<Step3ValidationWizardProps> = ({
  batchId,
  onNext,
  onAbort,
  onSaveExit,
}) => {
  const [summary, setSummary] = useState<BatchSummaryData | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [revalidating, setRevalidating] = useState<boolean>(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryError(null);
      const data = await batchOrderService.getBatchSummary(batchId);
      setSummary(data);

      if (typeof window !== 'undefined' && data) {
        window.dispatchEvent(new CustomEvent('batch-summary-updated', { detail: { batchId, data } }));
      }

      const isProcessing = data?.status === 'PROCESSING' || data?.batchStatus === 1;
      if (!isProcessing) {
        stopPolling();
      } else {
        setIsPolling(true);
      }
      return data;
    } catch (err: any) {
      console.warn('Failed to fetch batch summary:', err);
      stopPolling();
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;
      if (status === 401) {
        setSummaryError('Authentication session expired (401 Unauthorized). Please refresh or log in again.');
      } else if (status === 400) {
        setSummaryError(`Batch #${batchId} summary request failed (400 Bad Request). ${msg || 'Invalid or deleted batch.'}`);
      } else {
        setSummaryError(msg || 'Failed to load batch validation summary.');
      }
      return null;
    }
  }, [batchId, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setIsPolling(true);

    pollTimerRef.current = setInterval(async () => {
      const currentData = await fetchSummary();
      const isProcessing = currentData?.status === 'PROCESSING' || currentData?.batchStatus === 1;
      if (!isProcessing || currentData?.status === 'COMPLETED') {
        stopPolling();
      }
    }, 5000); // Poll every 5 seconds until COMPLETED or non-PROCESSING status
  }, [fetchSummary, stopPolling]);

  useEffect(() => {
    fetchSummary().then((data) => {
      const isProcessing = data?.status === 'PROCESSING' || data?.batchStatus === 1;
      if (isProcessing) {
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
    };
  }, [fetchSummary, startPolling, stopPolling]);

  const handleRevalidateBatch = async () => {
    setRevalidating(true);
    try {
      await batchOrderService.validateBatch(batchId);
      const updatedData = await fetchSummary();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('batch-revalidated', { detail: { batchId } }));
      }

      const isProcessing = updatedData?.status === 'PROCESSING' || updatedData?.batchStatus === 1;
      if (isProcessing) {
        startPolling();
      } else {
        stopPolling();
      }
    } catch (err) {
      console.error('Revalidate failed:', err);
      stopPolling();
    } finally {
      setRevalidating(false);
    }
  };

  if (summaryError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/40 text-center space-y-4">
        <div className="flex justify-center text-red-600 dark:text-red-400">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h3 className="text-base font-bold text-red-900 dark:text-red-200">
          Validation Summary Unavailable (Batch #{batchId})
        </h3>
        <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">
          {summaryError}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchSummary()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Request
          </button>
          <button
            onClick={onAbort}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            Back to Step 1
          </button>
        </div>
      </div>
    );
  }

  return (
    <Step3ValidationHeader
      batchId={batchId}
      summary={summary}
      isPolling={isPolling}
      revalidating={revalidating}
      onRevalidate={handleRevalidateBatch}
    />
  );
};
