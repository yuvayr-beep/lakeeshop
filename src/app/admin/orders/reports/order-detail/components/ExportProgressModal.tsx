'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Download, FileSpreadsheet, Clock } from 'lucide-react';
import { batchOrderService } from '@/services/batchOrder.service';

interface ExportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  batchCount: number;
  filterType?: string;
}

interface JobStatusData {
  jobId: string;
  status: 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  totalRecords?: number;
  processedRecords?: number;
  progressPercentage?: number;
  fileName?: string | null;
  message?: string;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  isOpen,
  onClose,
  jobId,
  batchCount,
  filterType = 'ALL',
}) => {
  const [jobData, setJobData] = useState<JobStatusData | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId) {
      setJobData(null);
      setErrorMsg(null);
      return;
    }

    setJobData({
      jobId,
      status: 'SUBMITTED',
      totalRecords: 0,
      processedRecords: 0,
      progressPercentage: 0,
    });

    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const res = await batchOrderService.getExportJobStatus(jobId);
        if (!isMounted) return;

        // Handle wrapper object if present
        const data: JobStatusData = res?.data || res;
        setJobData(data);

        if (data.status === 'FAILED') {
          setErrorMsg(data.message || 'Export job failed during server generation.');
        }

        // Continue polling only if job is in progress
        if (data.status !== 'COMPLETED' && data.status !== 'FAILED') {
          timerId = setTimeout(fetchStatus, 2000);
        }
      } catch (err: any) {
        console.error('Error polling export job:', err);
        if (isMounted) {
          timerId = setTimeout(fetchStatus, 3000);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, jobId]);

  const handleDownload = async (fileName: string) => {
    try {
      setIsDownloading(true);
      setErrorMsg(null);
      await batchOrderService.downloadExportFile(fileName);
    } catch (err: any) {
      console.error('Failed downloading export file:', err);
      setErrorMsg('Failed to download export file. Please click the button below to retry.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !jobId) return null;

  const status = jobData?.status || 'SUBMITTED';
  const total = jobData?.totalRecords || 0;
  const processed = jobData?.processedRecords || 0;
  const fileName = jobData?.fileName;

  // Calculate progress percentage accurately
  const rawProgress = jobData?.progressPercentage;
  let computedProgress = 0;
  if (status === 'COMPLETED') {
    computedProgress = 100;
  } else if (typeof rawProgress === 'number' && rawProgress > 0) {
    computedProgress = rawProgress;
  } else if (total > 0 && processed > 0) {
    computedProgress = (processed / total) * 100;
  }
  const progress = Math.min(100, Math.max(0, computedProgress));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Exporting Large Dataset
              </h3>
              <p className="text-xs text-slate-500">
                Order Details Download ({batchCount} {batchCount === 1 ? 'batch' : 'batches'} • {filterType})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Box */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Job ID: <span className="font-mono text-slate-900 dark:text-white font-bold">{jobId}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : status === 'FAILED'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 animate-pulse'
              }`}
            >
              {status === 'COMPLETED' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {status === 'FAILED' && <AlertCircle className="h-3.5 w-3.5" />}
              {(status === 'SUBMITTED' || status === 'PROCESSING') && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {status}
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>
                {status === 'COMPLETED'
                  ? 'Generation Complete'
                  : status === 'FAILED'
                  ? 'Export Failed'
                  : 'Processing Records...'}
              </span>
              <span>{progress.toFixed(1)}%</span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  status === 'COMPLETED'
                    ? 'bg-emerald-500'
                    : status === 'FAILED'
                    ? 'bg-red-500'
                    : 'bg-blue-600 bg-linear-to-r from-blue-600 to-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {total > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Processed: {processed.toLocaleString()} records</span>
                <span>Total: {total.toLocaleString()} records</span>
              </div>
            )}
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="font-bold">Export Error</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Download details once completed */}
          {status === 'COMPLETED' && fileName && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>File Ready for Download</span>
              </div>
              <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
                {fileName}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            {status === 'COMPLETED' ? 'Close' : 'Dismiss'}
          </button>

          {status === 'COMPLETED' && fileName && (
            <button
              type="button"
              onClick={() => handleDownload(fileName)}
              disabled={isDownloading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download File</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
