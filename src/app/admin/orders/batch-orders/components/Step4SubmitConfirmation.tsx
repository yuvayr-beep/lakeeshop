'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Loader2, ArrowLeft, Send } from 'lucide-react';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchSummaryData } from '@/types/batchOrder';
import { DeleteBatchModal } from './DeleteBatchModal';

interface Step4SubmitConfirmationProps {
  batchId: number;
  onBack: () => void;
  onAbort: () => void;
  onFinishSuccess: () => void;
}

interface BatchSubmissionResult {
  batchTotal: number;
  totalEligible: number;
  totalCreated: number;
  totalFailed: number;
}

export const Step4SubmitConfirmation: React.FC<Step4SubmitConfirmationProps> = ({
  batchId,
  onBack,
  onAbort,
  onFinishSuccess,
}) => {
  const [summary, setSummary] = useState<BatchSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAbortModal, setShowAbortModal] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<BatchSubmissionResult | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const data = await batchOrderService.getBatchSummary(batchId);
        setSummary(data);
      } catch (err) {
        console.warn('Failed to fetch summary in Step 4:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [batchId]);

  const handleFinishSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      console.log('🚀 [POST /order/submission/submit-batch]:', { batchId });
      const res = await batchOrderService.submitBatch(batchId);
      console.log('✅ [SUBMIT BATCH RESPONSE]:', res);

      const resultData = res?.data || res;

      if (resultData && typeof resultData === 'object' && ('totalCreated' in resultData || 'batchTotal' in resultData)) {
        setSubmitResult({
          batchTotal: Number(resultData.batchTotal ?? 0),
          totalEligible: Number(resultData.totalEligible ?? 0),
          totalCreated: Number(resultData.totalCreated ?? 0),
          totalFailed: Number(resultData.totalFailed ?? 0),
        });
      } else {
        alert(`Batch #${batchId} submitted successfully!`);
        onFinishSuccess();
      }
    } catch (err: any) {
      console.error('Submit batch failed:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Batch submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const passRows = summary?.passRows ?? summary?.totalRows ?? 0;
  const failRows = summary?.failRows ?? 0;
  const totalRows = summary?.totalRows ?? 0;

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <Send className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          Final Order Submission Confirmation
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Batch #{batchId} ready for processing
        </p>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {submitResult ? (
        /* SUCCESS SUBMISSION RESULT CARD WITH COUNTS */
        <div className="mt-6 space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400 shadow-sm">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Submission Completed Successfully!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Active orders generated for Batch #{batchId}
            </p>
          </div>

          {/* Submission Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Batch Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{submitResult.batchTotal}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Total Eligible</p>
              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{submitResult.totalEligible}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total Created</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{submitResult.totalCreated}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 shadow-sm dark:border-red-900/50 dark:bg-red-950/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">Total Failed</p>
              <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{submitResult.totalFailed}</p>
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={onFinishSuccess}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Done & Return to Upload List
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-slate-500">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <span className="mt-2 block text-xs">Fetching final batch summary...</span>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-xs font-semibold text-slate-500">Total Orders</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{totalRows}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-950/50 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Validated Pass</p>
              <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{passRows}</p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-950/50 dark:bg-red-950/20">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">Remaining Failures</p>
              <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{failRows}</p>
            </div>
          </div>

          {failRows > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Note: Submitting this batch will convert the <strong>{passRows}</strong> passed order rows into active orders. 
                Failing records will not be submitted.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action controls (hide if submission completed) */}
      {!submitResult && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-800">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Validation
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAbortModal(true)}
              className="rounded-xl bg-slate-200 px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Abort
            </button>
            <button
              type="button"
              onClick={handleFinishSubmit}
              disabled={submitting || loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Batch...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Finish & Submit
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <DeleteBatchModal
        isOpen={showAbortModal}
        onClose={() => setShowAbortModal(false)}
        onSuccess={onFinishSuccess}
        batchId={batchId}
        title={`Abort Batch #${`202600${batchId}`}?`}
        actionLabel="Abort Batch"
      />
    </div>
  );
};
