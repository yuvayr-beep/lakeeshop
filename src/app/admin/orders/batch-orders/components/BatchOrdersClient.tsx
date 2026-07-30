'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle2, ShieldAlert, Send, FileSpreadsheet, Layers } from 'lucide-react';
import { Step1UploadForm, RecentOrderBatchesCard } from './Step1UploadFile';
import { Step2ReviewCount } from './Step2ReviewCount';
import { Step3ValidationWizard, Step3ValidationAccordionsCard } from './Step3ValidationWizard';
import { Step4SubmitConfirmation } from './Step4SubmitConfirmation';
import { BatchUploadResponse } from '@/types/batchOrder';

export const BatchOrdersClient: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [activeBatchNo, setActiveBatchNo] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<BatchUploadResponse | null>(null);

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
  };

  const steps = [
    { number: 1, label: 'Upload File', icon: Upload, desc: 'Excel Ingestion' },
    { number: 2, label: 'Review Counts', icon: FileSpreadsheet, desc: 'Parsed Stats' },
    { number: 3, label: 'Validation Wizard', icon: ShieldAlert, desc: 'Error Correction' },
    { number: 4, label: 'Final Submission', icon: Send, desc: 'Order Conversion' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Batch Orders Entry
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Batch order excel ingestion, validation engine, inline error correction, and order submission
          </p>
        </div>

        {activeBatchId && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300">
            <span>Active Batch Number:</span>
            <span className="font-mono font-bold">{activeBatchNo || `202600${activeBatchId}`}</span>
          </div>
        )}
      </div>

      {/* CARD 1: SINGLE UNIFIED WIZARD CARD (Stepper Navigation + Step Header/Form) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Stepper Header Navigation */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.number;
              const isCompleted = currentStep > s.number;

              return (
                <button
                  key={s.number}
                  onClick={() => {
                    if (s.number === 1) handleResetToStep1();
                    else if (s.number < currentStep && activeBatchId) {
                      setCurrentStep(s.number);
                    }
                  }}
                  disabled={s.number > currentStep && !activeBatchId}
                  className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all ${
                    isActive
                      ? 'border border-blue-500 bg-blue-50/80 text-blue-700 shadow-sm dark:border-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                      : isCompleted
                      ? 'border border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border border-slate-100 bg-slate-50/50 text-slate-400 dark:border-slate-800/50 dark:bg-slate-800/30 dark:text-slate-600'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        Step {s.number}
                      </span>
                    </div>
                    <div className="text-xs font-bold truncate">{s.label}</div>
                    <div className="text-[10px] opacity-75 truncate">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Body Content inside CARD 1 */}
        <div className="p-6">
          {currentStep === 1 && (
            <Step1UploadForm onBatchCreated={handleBatchCreated} />
          )}

          {currentStep === 2 && activeBatchId && (
            <Step2ReviewCount
              batchId={activeBatchId}
              uploadData={uploadData}
              onNext={() => setCurrentStep(3)}
              onAbort={handleResetToStep1}
            />
          )}

          {currentStep === 3 && activeBatchId && (
            <Step3ValidationWizard
              batchId={activeBatchId}
              onNext={() => setCurrentStep(4)}
              onAbort={handleResetToStep1}
              onSaveExit={handleResetToStep1}
            />
          )}

          {currentStep === 4 && activeBatchId && (
            <Step4SubmitConfirmation
              batchId={activeBatchId}
              onBack={() => setCurrentStep(3)}
              onAbort={handleResetToStep1}
              onFinishSuccess={handleResetToStep1}
            />
          )}
        </div>
      </div>

      {/* CARD 2 (STEP 1): RECENT ORDER BATCHES TABLE */}
      {currentStep === 1 && (
        <RecentOrderBatchesCard onResumeBatch={handleResumeBatch} />
      )}

      {/* CARD 2 (STEP 3): ORDER DATA VALIDATION ACCORDIONS LIST */}
      {currentStep === 3 && activeBatchId && (
        <Step3ValidationAccordionsCard
          batchId={activeBatchId}
          onNext={() => setCurrentStep(4)}
          onAbort={handleResetToStep1}
          onSaveExit={handleResetToStep1}
        />
      )}
    </div>
  );
};
