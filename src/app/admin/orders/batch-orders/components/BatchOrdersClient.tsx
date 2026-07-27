'use client';

import React, { useState } from 'react';
import { Step1UploadFile } from './Step1UploadFile';
import { Step2ReviewCount } from './Step2ReviewCount';
import { Step3ValidationWizard } from './Step3ValidationWizard';
import { Step4SubmitConfirmation } from './Step4SubmitConfirmation';
import { BatchUploadResponse } from '@/types/batchOrder';

export const BatchOrdersClient: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [uploadData, setUploadData] = useState<BatchUploadResponse | null>(null);

  const handleBatchCreated = (batchId: number, data?: BatchUploadResponse) => {
    setActiveBatchId(batchId);
    if (data) setUploadData(data);
    setCurrentStep(2);
  };

  const handleResumeBatch = (batchId: number) => {
    setActiveBatchId(batchId);
    setUploadData(null);
    setCurrentStep(3);
  };

  const handleResetToStep1 = () => {
    setCurrentStep(1);
    setActiveBatchId(null);
    setUploadData(null);
  };

  const steps = [
    { number: 1, label: 'Upload File' },
    { number: 2, label: 'Review Count' },
    { number: 3, label: 'Validate' },
    { number: 4, label: 'Submit' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      {/* Top Banner Header with gradient matching reference screenshots */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 p-4 text-white shadow-md">
        <h1 className="text-xl font-bold tracking-wide">Batch Order Entry</h1>
      </div>

      {/* Step Wizard Nav Pill Indicators */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {steps.map((s) => {
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
              className={`flex items-center gap-2 rounded-full px-5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                isActive
                  ? 'bg-red-500 text-white shadow-md ring-2 ring-red-300 dark:ring-red-900'
                  : isCompleted
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
              }`}
            >
              <span>{s.number}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Step */}
      {currentStep === 1 && (
        <Step1UploadFile
          onBatchCreated={handleBatchCreated}
          onResumeBatch={handleResumeBatch}
        />
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
  );
};
