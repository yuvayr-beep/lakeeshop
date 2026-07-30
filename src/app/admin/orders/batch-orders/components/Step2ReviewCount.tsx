'use client';

import React, { useState } from 'react';
import { FileCheck, AlertOctagon, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';
import { BatchUploadResponse } from '@/types/batchOrder';
import { DeleteBatchModal } from './DeleteBatchModal';

interface Step2ReviewCountProps {
  batchId: number;
  uploadData: BatchUploadResponse | null;
  onNext: () => void;
  onAbort: () => void;
}

export const Step2ReviewCount: React.FC<Step2ReviewCountProps> = ({
  batchId,
  uploadData,
  onNext,
  onAbort,
}) => {
  const [showAbortModal, setShowAbortModal] = useState<boolean>(false);

  const totalRows = uploadData?.totalRows ?? 0;
  const passRows = uploadData?.savedRows ?? 0;
  const failRows = uploadData?.failedRows ?? 0;
  const failRowsList = uploadData?.failures || [];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <FileCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Parsed Order Record Summary
          </h2>
          <p className="text-xs text-slate-500">
            Batch #{batchId} parsing counts and initial validation check
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Total Order Records
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalRows}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Parsed Pass Count</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {passRows}
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Parsed Fail Count</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-red-600 dark:text-red-400">
            {failRows}
          </div>
        </div>
      </div>

      {/* Failed Row Numbers List */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
          Parsing Failure Row Numbers
        </label>
        <div className="min-h-[50px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {failRowsList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {failRowsList.map((f: any, idx: number) => (
                <span
                  key={idx}
                  className="rounded bg-red-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300"
                >
                  Row #{f.rowNumber || f}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 italic">No parsing row failures detected. All rows imported successfully.</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowAbortModal(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Trash2 className="h-4 w-4" />
          Abort Batch
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
        >
          <span>Proceed to Validation Wizard</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <DeleteBatchModal
        isOpen={showAbortModal}
        onClose={() => setShowAbortModal(false)}
        onSuccess={onAbort}
        batchId={batchId}
        title={`Abort Batch #${uploadData?.batchNo || `202600${batchId}`}?`}
        actionLabel="Abort Batch"
      />
    </div>
  );
};
