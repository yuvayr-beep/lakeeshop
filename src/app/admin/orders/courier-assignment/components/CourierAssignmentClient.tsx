'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Truck, RefreshCw, CheckCircle2, AlertCircle, Loader2, Download,
  Boxes, Package, ShieldCheck, CheckSquare
} from 'lucide-react';
import { 
  courierAssignmentService, 
  CourierAssignmentBatchItem 
} from '@/services/courierAssignment.service';
import { toast } from 'sonner';

export default function CourierAssignmentClient() {
  const [batches, setBatches] = useState<CourierAssignmentBatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Selected Batch IDs
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);

  // Action & Modal States
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [downloadingExcel, setDownloadingExcel] = useState<boolean>(false);

  // Option A: Express Courier Truck Highway Animation States
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [truckState, setTruckState] = useState<'idle' | 'driving' | 'scanned' | 'dispatched'>('idle');
  const [statusMessageText, setStatusMessageText] = useState<string>('Ready for Courier Assignment...');

  // Reset Truck Animation State
  const resetTruckAnimation = useCallback(() => {
    setProgressPercent(0);
    setTruckState('idle');
    setStatusMessageText('Ready for Courier Assignment...');
  }, []);

  // ---------------------------------------------------------------------------
  // 1. FETCH COURIER ASSIGNMENT BATCHES (GET /order/execution/courier-assignment/batch)
  // ---------------------------------------------------------------------------
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await courierAssignmentService.getCourierAssignmentBatches();
      setBatches(data || []);
      setSelectedBatchIds([]);
    } catch (err: any) {
      console.error('Error fetching courier assignment batches:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to load courier assignment batches.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // ---------------------------------------------------------------------------
  // 2. CHECKBOX SELECTION LOGIC
  // ---------------------------------------------------------------------------
  const isAllSelected = useMemo(() => {
    if (batches.length === 0) return false;
    return selectedBatchIds.length === batches.length;
  }, [batches, selectedBatchIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batches.map((b) => b.orderBatchId));
    }
  };

  const handleToggleRow = (batchId: number) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  // ---------------------------------------------------------------------------
  // 3. EXCEL DOWNLOAD VIA API (GET /order/dashboard/details/excel?metricType=pendingCourierAssign)
  // ---------------------------------------------------------------------------
  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    const toastId = toast.loading('Generating Excel file download...');

    try {
      await courierAssignmentService.downloadPendingCourierAssignExcel();
      toast.success('Excel report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Excel Download Error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to download Excel report.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setDownloadingExcel(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. EXPRESS COURIER TRUCK ANIMATION HELPER (OPTION A)
  // ---------------------------------------------------------------------------
  const launchTruckStep = () => {
    setTruckState('driving');
    setTimeout(() => {
      setTruckState('scanned');
      setTimeout(() => {
        setTruckState('dispatched');
        setTimeout(() => {
          setTruckState('idle');
        }, 500);
      }, 500);
    }, 600);
  };

  // ---------------------------------------------------------------------------
  // 5. SUBMIT SELECTED BATCHES
  // ---------------------------------------------------------------------------
  const handleExecuteCourierAssignment = async () => {
    if (selectedBatchIds.length === 0) return;

    setSubmitting(true);
    setProgressPercent(20);
    setStatusMessageText('Starting Courier Serviceability & Matrix Evaluation...');
    launchTruckStep();

    try {
      const selectedBatchesData = batches.filter((b) => selectedBatchIds.includes(b.orderBatchId));
      const payload = selectedBatchesData.map((b) => ({
        id: b.orderBatchId,
        orderBatchNumber: b.orderBatchNumber,
      }));

      setProgressPercent(45);
      setStatusMessageText('Assigning Courier Partners & Generating Shipping Labels...');
      launchTruckStep();

      const response = await courierAssignmentService.assignCourierBatch(payload);

      if (Array.isArray(response?.data)) {
        const errorReasons = response.data
          .filter((item) => item.status === 'FAILED' || item.reason)
          .map((item) => `${item.orderBatchNumber || 'Batch'}: ${item.reason}`);

        if (errorReasons.length > 0) {
          setSubmitting(false);
          setProgressPercent(0);
          toast.error(errorReasons.join('; '));
          return;
        }
      }

      setProgressPercent(100);
      setStatusMessageText('Invoices Created & Courier Partners Assigned! Dispatch Ready 🎉');
      launchTruckStep();

      const msg = response?.message || `Courier assigned successfully for ${selectedBatchIds.length} batch(es).`;

      setTimeout(() => {
        toast.success(msg);
        setShowConfirmModal(false);
        setSubmitting(false);
        resetTruckAnimation();
        fetchBatches();
      }, 1000);

    } catch (err: any) {
      console.error('Courier Assignment Submission Error:', err);
      setSubmitting(false);
      setProgressPercent(0);
      const errMsg =
        err.response?.data?.data?.[0]?.reason ||
        err.response?.data?.message ||
        err.message ||
        'Failed to assign courier for selected batches.';
      toast.error(errMsg);
    }
  };

  // Stats summary calculations
  const stats = useMemo(() => {
    let totalOrders = 0;
    let pendingCourier = 0;

    batches.forEach((b) => {
      totalOrders += b.totalOrderCount || 0;
      pendingCourier += b.pendingCourierAssigned || 0;
    });

    const selectedBatches = batches.filter((b) => selectedBatchIds.includes(b.orderBatchId));
    let selectedPendingCount = 0;
    selectedBatches.forEach((b) => {
      selectedPendingCount += b.pendingCourierAssigned || 0;
    });

    return {
      totalBatches: batches.length,
      selectedCount: selectedBatchIds.length,
      totalOrders,
      pendingCourier,
      selectedPendingCount,
    };
  }, [batches, selectedBatchIds]);

  return (
    <div className="space-y-6">
      {/* SUMMARY STATISTICS CARDS & ACTION BUTTONS ROW */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-2.5 min-w-[160px]">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Boxes size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Pending Batches</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              {stats.totalBatches}
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-2.5 min-w-[160px]">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <CheckSquare size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Selected Batches</p>
            <h4 className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
              {stats.selectedCount} <span className="text-[11px] font-normal text-slate-400">({stats.selectedPendingCount})</span>
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-2.5 min-w-[160px]">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Package size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Orders in Batches</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              {stats.totalOrders}
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-2.5 min-w-[160px]">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Pending Courier Assign</p>
            <h4 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
              {stats.pendingCourier} orders
            </h4>
          </div>
        </div>

        {/* Combined Refresh + Action Button Segment next to 4th card */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap ml-auto">
            <button
              onClick={fetchBatches}
              disabled={loading}
              className="flex items-center justify-center p-2.5 border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 rounded-xl hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-all shadow-xs shrink-0"
              title="Refresh Batches"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-amber-500' : ''} />
            </button>

            <div className="inline-flex items-center rounded-2xl border border-slate-300 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-800 shrink-0">
              {/* Download Excel Segment */}
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={downloadingExcel || loading || batches.length === 0}
                title="Download Excel Report"
                className="h-9 px-4 flex items-center justify-center gap-2 text-xs font-bold rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloadingExcel ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <Download className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                <span>Download Excel</span>
              </button>

              {/* Divider Line */}
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

              {/* Assign Courier Segment */}
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedBatchIds.length === 0 || submitting || loading}
                title={
                  selectedBatchIds.length === 0
                    ? 'Select at least 1 batch checkbox in table to assign courier'
                    : `Assign courier for ${selectedBatchIds.length} selected batch(es)`
                }
                className={`h-9 px-5 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all ${
                  selectedBatchIds.length > 0 && !submitting
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 cursor-pointer'
                    : 'bg-amber-400/40 text-slate-400 dark:bg-slate-700/60 dark:text-slate-500 opacity-70 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-white animate-bounce" />
                    <span className="animate-pulse">Assigning Courier...</span>
                  </div>
                ) : (
                  <>
                    <Truck className={`h-4 w-4 shrink-0 ${selectedBatchIds.length > 0 ? 'animate-pulse' : ''}`} />
                    <span>
                      {selectedBatchIds.length > 0
                        ? `Assign Courier (${selectedBatchIds.length})`
                        : 'Assign Courier'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* BATCH DATA TABLE SECTION */}
        {/* =================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden">
          
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3">
              <RefreshCw className="animate-spin text-amber-500 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Fetching courier assignment batches...
              </p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 space-y-3 px-4">
              <AlertCircle size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={fetchBatches}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-100"
              >
                Retry Request
              </button>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <Truck size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No pending courier assignment batches found.
              </p>
              <p className="text-[11px] text-slate-400">
                All execution batches have been assigned couriers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
                      />
                    </th>
                    <th className="py-3.5 px-4 w-16 text-center">S.No</th>
                    <th className="py-3.5 px-4">Client Name</th>
                    <th className="py-3.5 px-4">Order Date</th>
                    <th className="py-3.5 px-4">Order Batch No</th>
                    <th className="py-3.5 px-4 text-center">Total Order Count</th>
                    <th className="py-3.5 px-4 text-center">Pending Courier Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {batches.map((batch, index) => {
                    const isSelected = selectedBatchIds.includes(batch.orderBatchId);
                    return (
                      <tr
                        key={batch.orderBatchId}
                        onClick={() => handleToggleRow(batch.orderBatchId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-50/60 dark:bg-amber-950/30'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        } text-slate-800 dark:text-slate-200`}
                      >
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(batch.orderBatchId)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
                          />
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                          {index + 1}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {batch.clientName}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {batch.orderDate}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-200/80 dark:border-slate-700">
                            {batch.orderBatchNo}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {batch.totalOrderCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                            {batch.pendingCourierAssigned}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* FOOTER BAR */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 font-medium">
            <div>
              Showing <span className="font-bold text-slate-800 dark:text-slate-100">{batches.length}</span> batch(es)
            </div>
            <div>
              Selected: <span className="font-bold text-amber-600 dark:text-amber-400">{selectedBatchIds.length}</span> batch(es)
            </div>
          </div>

        </div>

        {/* =================================================================== */}
        {/* CONFIRMATION & EXPRESS COURIER TRUCK ANIMATION MODAL (OPTION A) */}
        {/* =================================================================== */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
              
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Truck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Confirm Courier Assignment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Evaluate serviceability, weights, and assign courier partners
                  </p>
                </div>
              </div>

              {!submitting ? (
                <>
                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <p>
                      You are about to assign couriers for{' '}
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {selectedBatchIds.length} batch(es)
                      </span>{' '}
                      ({stats.selectedPendingCount} pending order executions).
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-thin">
                      {batches
                        .filter((b) => selectedBatchIds.includes(b.orderBatchId))
                        .map((b) => (
                          <div key={b.orderBatchId} className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{b.orderBatchNo}</span>
                            <span className="text-slate-500">ID: {b.orderBatchId} ({b.pendingCourierAssigned} orders)</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(false)}
                      disabled={submitting}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSubmit}
                      disabled={submitting}
                      className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white rounded-xl shadow-2xs transition-all flex items-center gap-2"
                    >
                      <Truck size={16} />
                      <span>Confirm Assignment</span>
                    </button>
                  </div>
                </>
              ) : (
                /* OPTION A: EXPRESS COURIER TRUCK HIGHWAY ANIMATION LOADER CANVAS */
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Truck className="h-4 w-4 animate-bounce text-amber-500" />
                      Express Delivery Dispatch Engine
                    </span>
                    <span className="font-mono text-xs font-extrabold text-amber-500">
                      {progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 p-0.5 border border-slate-300 dark:border-slate-700 shadow-inner overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(progressPercent, 10)}%` }}
                    ></div>
                  </div>

                  {/* Asphalt Highway Canvas */}
                  <div className="relative w-full h-32 bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between">
                    
                    {/* Highway Center Line */}
                    <div className="absolute top-1/2 left-0 right-0 border-b-2 border-dashed border-amber-400/60 z-0 animate-pulse"></div>

                    {/* Departure & Logistics Scan Gate Badges */}
                    <div className="relative z-10 flex items-center justify-between px-2 text-[10px] font-bold text-slate-300">
                      <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                        <span className="text-amber-400">🏬</span> Client Hub
                      </div>
                      <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                        <span className="text-emerald-400">⚡</span> Pincode Scan Gate
                      </div>
                    </div>

                    {/* Highway Track Motion Canvas */}
                    <div className="relative w-full h-12 flex items-center justify-between px-4">
                      
                      {/* Express Delivery Van / Truck */}
                      <div
                        className={`absolute transition-all duration-700 ease-out z-20 ${
                          truckState === 'driving'
                            ? 'translate-x-[110px] scale-110'
                            : truckState === 'scanned'
                            ? 'translate-x-[230px] scale-125'
                            : truckState === 'dispatched'
                            ? 'translate-x-[320px] scale-110'
                            : 'left-4 top-2 scale-100'
                        }`}
                      >
                        <div className="relative flex items-center">
                          <div className="text-2xl filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.6)]">
                            🚚
                          </div>
                          {(truckState === 'driving' || truckState === 'scanned') && (
                            <div className="absolute -left-6 flex items-center gap-1 text-[10px]">
                              💨<span className="text-amber-400 animate-ping">⚡</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Logistics Hub Gate & Loaded Parcels */}
                      <div className="relative right-0 flex items-center gap-1">
                        {(truckState === 'scanned' || truckState === 'dispatched') && (
                          <div className="absolute -top-7 -left-5 z-30 animate-bounce text-base">
                            📦 ✅ <Sparkles className="inline h-4 w-4 text-emerald-400" />
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shadow-lg">
                          🏭
                        </div>
                      </div>

                    </div>

                    {/* Status Message Text */}
                    <div className="relative z-10 text-[11px] font-semibold text-center text-amber-200 truncate">
                      {statusMessageText}
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
  );
}
