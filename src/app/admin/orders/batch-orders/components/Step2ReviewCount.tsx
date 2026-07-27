'use client';

import React from 'react';
import { BatchUploadResponse } from '@/types/batchOrder';
import { batchOrderService } from '@/services/batchOrder.service';

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
  const totalRows = uploadData?.totalRows ?? 0;
  const passRows = uploadData?.savedRows ?? 0;
  const failRows = uploadData?.failedRows ?? 0;
  const failRowsList = uploadData?.failures || [];

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Summary Box matching screenshot 2 layout */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-6 text-center text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
          ORDER RECORD SUMMARY
        </h2>

        <div className="divide-y divide-slate-100 border-t border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          <div className="flex items-center justify-between py-3">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Total Order Record Count
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {totalRows}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Read Pass Record Count
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {passRows}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              Read Fail Record Count
            </span>
            <span className="text-xs font-bold text-red-600 dark:text-red-400">
              {failRows}
            </span>
          </div>

          <div className="flex flex-col gap-1 py-3">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              Read Fail Record Row Number
            </span>
            <div className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {failRowsList.length > 0
                ? failRowsList.map((f: any) => f.rowNumber || f).join(', ')
                : 'None'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleAbort}
            className="rounded-xl bg-blue-600 px-8 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
          >
            Abort
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-blue-600 px-8 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
