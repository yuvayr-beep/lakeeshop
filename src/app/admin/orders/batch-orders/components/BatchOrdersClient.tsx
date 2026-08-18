'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, CheckCircle2, ShieldAlert, Send, FileSpreadsheet, Layers, RotateCcw } from 'lucide-react';
import { Step1UploadForm, RecentOrderBatchesCard } from './Step1UploadFile';
import { Step2ReviewCount } from './Step2ReviewCount';
import { Step3ValidationWizard, Step3ValidationAccordionsCard } from './Step3ValidationWizard';
import { Step4SubmitConfirmation } from './Step4SubmitConfirmation';
import { DeleteBatchModal } from './DeleteBatchModal';
import { BatchUploadResponse, BatchSummaryData } from '@/types/batchOrder';
import { batchOrderService } from '@/services/batchOrder.service';

export const BatchOrdersClient: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [activeBatchNo, setActiveBatchNo] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<BatchUploadResponse | null>(null);
  const [summaryData, setSummaryData] = useState<BatchSummaryData | null>(null);
  const [showAbortModal, setShowAbortModal] = useState<boolean>(false);

  const fetchBatchSummary = useCallback(async (batchId: number) => {
    try {
      const data = await batchOrderService.getBatchSummary(batchId);
      setSummaryData(data);
    } catch (err) {
      console.warn('Failed to fetch batch summary:', err);
    }
  }, []);

  useEffect(() => {
    if (activeBatchId) {
      fetchBatchSummary(activeBatchId);
    } else {
      setSummaryData(null);
    }
  }, [activeBatchId, fetchBatchSummary]);

  useEffect(() => {
    const handleSummaryUpdated = (e: any) => {
      if (e.detail?.batchId === activeBatchId && e.detail?.data) {
        setSummaryData(e.detail.data);
      } else if (activeBatchId) {
        fetchBatchSummary(activeBatchId);
      }
    };
    window.addEventListener('batch-summary-updated', handleSummaryUpdated);
    window.addEventListener('batch-revalidated', handleSummaryUpdated);
    return () => {
      window.removeEventListener('batch-summary-updated', handleSummaryUpdated);
      window.removeEventListener('batch-revalidated', handleSummaryUpdated);
    };
  }, [activeBatchId, fetchBatchSummary]);

  const handleBatchCreated = (batchId: number, data?: BatchUploadResponse) => {
    setActiveBatchId(batchId);
    if (data) {
      setUploadData(data);
      setActiveBatchNo(data.batchNo || `202600${batchId}`);
    } else {
      setActiveBatchNo(`202600${batchId}`);
    }
    setCurrentStep(2);
  };

  const handleResumeBatch = (batchId: number, batchNo?: string) => {
    setActiveBatchId(batchId);
    setActiveBatchNo(batchNo || `202600${batchId}`);
    setUploadData(null);
    setCurrentStep(3);
  };

  const handleResetToStep1 = () => {
    setCurrentStep(1);
    setActiveBatchId(null);
    setActiveBatchNo(null);
    setUploadData(null);
    setSummaryData(null);
  };

  const steps = [
    { number: 1, label: 'Upload File', icon: Upload, desc: 'Excel Ingestion' },
    { number: 2, label: 'Review Counts', icon: FileSpreadsheet, desc: 'Parsed Stats' },
    { number: 3, label: 'Validation Wizard', icon: ShieldAlert, desc: 'Error Correction' },
    { number: 4, label: 'Final Submission', icon: Send, desc: 'Order Conversion' },
  ];

  return (
    <div className="space-y-6">
      {/* Main 2-Column Responsive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Vertical Steps Navigation Sidebar */}
        <div className="lg:col-span-3 xl:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            {/* Active Batch Number Label at TOP of Workflow Steps card */}
            {activeBatchId && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-900/60 dark:bg-blue-950/60 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-between">
                  <span>Active Batch:</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="font-mono text-xs font-extrabold text-blue-900 dark:text-blue-100 truncate">
                  {activeBatchNo || `202600${activeBatchId}`}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Workflow Steps
                </h2>
                <p className="text-[11px] text-slate-500">
                  Batch pipeline
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                {currentStep}/4
              </span>
            </div>

            {/* Vertical Step Navigation List */}
            <div className="relative space-y-2.5">
              {steps.map((s, index) => {
                const Icon = s.icon;
                const isActive = currentStep === s.number;
                const isCompleted = currentStep > s.number;
                const isLast = index === steps.length - 1;

                return (
                  <div key={s.number} className="relative">
                    {/* Connector line between steps */}
                    {!isLast && (
                      <div
                        className={`absolute left-[19px] top-10 h-5 w-0.5 -ml-px ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (s.number === 1) handleResetToStep1();
                        else if (s.number < currentStep && activeBatchId) {
                          setCurrentStep(s.number);
                        }
                      }}
                      disabled={s.number > currentStep && !activeBatchId}
                      className={`group flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-all relative ${
                        isActive
                          ? 'border border-blue-500 bg-blue-50/90 text-blue-700 shadow-xs dark:border-blue-600 dark:bg-blue-950/70 dark:text-blue-300 ring-2 ring-blue-500/20'
                          : isCompleted
                          ? 'border border-emerald-200 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 cursor-pointer'
                          : 'border border-slate-100 bg-slate-50/40 text-slate-400 dark:border-slate-800/40 dark:bg-slate-800/20 dark:text-slate-600 opacity-60'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                            Step {s.number}
                          </span>
                          {isCompleted && (
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Done
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold truncate">{s.label}</div>
                        <div className="text-[10px] opacity-75 truncate">{s.desc}</div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Action in Sidebar when active batch is set */}
            {activeBatchId && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleResetToStep1}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-750 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Start New Batch</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Step Main Content + Sub-cards */}
        <div className="lg:col-span-9 xl:col-span-10 space-y-6">
          {/* STEP 1: Upload Form + Recent Batches Card */}
          {currentStep === 1 && (
            <>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Step1UploadForm onBatchCreated={handleBatchCreated} />
              </div>

              <RecentOrderBatchesCard onResumeBatch={handleResumeBatch} />
            </>
          )}

          {/* STEP 2: Review Counts */}
          {currentStep === 2 && activeBatchId && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Step2ReviewCount
                batchId={activeBatchId}
                uploadData={uploadData}
                onNext={() => setCurrentStep(3)}
                onAbort={handleResetToStep1}
              />
            </div>
          )}

          {/* STEP 3: Validation Wizard Header + Validation Categories Accordion List */}
          {currentStep === 3 && activeBatchId && (
            <>
              <Step3ValidationWizard
                batchId={activeBatchId}
                onNext={() => setCurrentStep(4)}
                onAbort={handleResetToStep1}
                onSaveExit={handleResetToStep1}
              />

              <Step3ValidationAccordionsCard
                batchId={activeBatchId}
                onNext={() => setCurrentStep(4)}
                onAbort={handleResetToStep1}
                onSaveExit={handleResetToStep1}
              />
            </>
          )}

          {/* STEP 4: Final Submission */}
          {currentStep === 4 && activeBatchId && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Step4SubmitConfirmation
                batchId={activeBatchId}
                onBack={() => setCurrentStep(3)}
                onAbort={handleResetToStep1}
                onFinishSuccess={handleResetToStep1}
              />
            </div>
          )}
        </div>
      </div>

      {/* Centered Abort Batch Modal for Header Action */}
      {activeBatchId && (
        <DeleteBatchModal
          isOpen={showAbortModal}
          onClose={() => setShowAbortModal(false)}
          onSuccess={handleResetToStep1}
          batchId={activeBatchId}
          title={`Abort Batch #${activeBatchNo || `202600${activeBatchId}`}?`}
          actionLabel="Abort Batch"
        />
      )}
    </div>
  );
};
