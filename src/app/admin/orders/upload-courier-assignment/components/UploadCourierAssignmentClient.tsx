'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileSpreadsheet, Download, CheckCircle2, 
  AlertCircle, Trash2, RefreshCw, Loader2, Truck, Sparkles, Send, ShieldCheck,
  PackageCheck, AlertTriangle, Layers, XCircle, ArrowRight
} from 'lucide-react';
import { 
  courierAssignmentService, 
  CourierUploadResponseData, 
  CourierUploadBatchMeta, 
  CourierUploadDetailItem 
} from '@/services/courierAssignment.service';
import { toast } from 'sonner';

export default function UploadCourierAssignmentClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submittingFinal, setSubmittingFinal] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<CourierUploadResponseData | null>(null);

  // Animation states for Option A loader modal
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [truckState, setTruckState] = useState<'idle' | 'driving' | 'scanned' | 'dispatched'>('idle');
  const [statusMessageText, setStatusMessageText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template Download Handler
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading Courier Assignment Excel Template...');
    try {
      await courierAssignmentService.downloadCourierAssignTemplate();
      toast.success('Template downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('API template download error, generating fallback...', err);
      toast.error('Failed to download template from server. Generating local sample template...', { id: toastId });
      generateLocalTemplate();
    }
  };

  // Local fallback template generator
  const generateLocalTemplate = async () => {
    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        const XLSX = (window as any).XLSX;
        const sampleData = [
          {
            executionId: 49,
            packRefNo: '2608000187',
            courierCode: 'DLRY_SURFACE',
            shipmodeName: 'SURFACE',
            awbNo: '1234',
          },
          {
            executionId: 41,
            packRefNo: '2608000180',
            courierCode: 'DLRY_SURFACE',
            shipmodeName: 'SURFACE',
            awbNo: '5678',
          },
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        worksheet['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Courier_Assignment');
        XLSX.writeFile(workbook, 'courier_assign_template.xlsx');
      };
      document.body.appendChild(script);
    } catch (e) {
      console.error('Local template fallback error:', e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadResult(null);
    }
  };

  // Express Truck Animation Helper
  const launchTruckStep = () => {
    setTruckState('driving');
    setTimeout(() => {
      setTruckState('scanned');
      setTimeout(() => {
        setTruckState('dispatched');
        setTimeout(() => {
          setTruckState('idle');
        }, 500);
      }, 600);
    }, 400);
  };

  // Step 1: Upload Excel File for Initial Validation
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select or drop an Excel file to upload.');
      return;
    }

    setUploading(true);
    setProgressPercent(20);
    setStatusMessageText(`Uploading ${selectedFile.name} to server for validation...`);
    launchTruckStep();

    try {
      setTimeout(() => {
        setProgressPercent(60);
        setStatusMessageText('Processing & Validating Courier Assignment Records...');
        launchTruckStep();
      }, 600);

      const response = await courierAssignmentService.uploadCourierAssignExcel(selectedFile);
      const resData: CourierUploadResponseData = response?.data || response;
      const batchId = resData?.batch?.id;

      let finalResult = resData;
      if (batchId) {
        try {
          const detailRes = await courierAssignmentService.getUploadBatchDetails(batchId);
          if (detailRes?.data) {
            finalResult = detailRes.data;
          }
        } catch (detailErr) {
          console.warn('Batch details fetch error, using upload response:', detailErr);
        }
      }

      setProgressPercent(100);
      setStatusMessageText('Excel File Validated Successfully! Review counts below.');
      launchTruckStep();

      const batch = finalResult?.batch;
      const passedCount = batch?.passedCount ?? 0;
      const totalRecords = batch?.totalRecords ?? 0;

      setTimeout(() => {
        setUploadResult(finalResult);
        setUploading(false);
        setProgressPercent(0);

        toast.info(
          `Validation Complete: ${totalRecords} records parsed (${passedCount} passed). Review details and click "Complete Assignment".`
        );
      }, 1000);

    } catch (err: any) {
      console.error('Excel Courier Assign Upload Error:', err);
      setUploading(false);
      setProgressPercent(0);
      const errMsg = err.response?.data?.message || err.message || 'Failed to upload and validate Excel file.';
      toast.error(errMsg);
    }
  };

  // Step 2: Complete Final Courier Assignment Submit
  const handleFinalSubmit = async () => {
    const batchId = uploadResult?.batch?.id;
    if (!batchId) {
      toast.error('No valid batch ID available to complete.');
      return;
    }

    setSubmittingFinal(true);
    setProgressPercent(25);
    setStatusMessageText(`Completing final courier assignment for Batch #${batchId}...`);
    launchTruckStep();

    try {
      setTimeout(() => {
        setProgressPercent(70);
        setStatusMessageText('Executing Final Batch Courier Override...');
        launchTruckStep();
      }, 500);

      const response = await courierAssignmentService.submitUploadBatchFinal(batchId);
      const resData: CourierUploadResponseData = response?.data || response;

      setProgressPercent(100);
      setStatusMessageText('Courier Assignments Completed Successfully! 🎉');
      launchTruckStep();

      const passed = resData?.batch?.passedCount ?? uploadResult?.batch?.passedCount ?? 0;

      setTimeout(() => {
        setUploadResult(resData);
        setSubmittingFinal(false);
        setProgressPercent(0);

        toast.success(`Successfully completed courier assignment for ${passed} order executions!`);
      }, 1000);

    } catch (err: any) {
      console.error('Final Submit Error:', err);
      setSubmittingFinal(false);
      setProgressPercent(0);
      const errMsg = err.response?.data?.message || err.message || 'Failed to complete courier assignment.';
      toast.error(errMsg);
    }
  };

  // Abort / Reset Batch Handler
  const handleAbortBatch = () => {
    setSelectedFile(null);
    setUploadResult(null);
    toast.info('Upload session reset. You can select another file.');
  };

  const batchMeta: CourierUploadBatchMeta | undefined = uploadResult?.batch;
  const detailsList: CourierUploadDetailItem[] = uploadResult?.details || [];
  const isFinalSubmitted = batchMeta?.status === 'COMPLETED' || batchMeta?.status === 'PROCESSED' || batchMeta?.status === 'SUCCESS';

  return (
    <div className="space-y-6 pb-16">
      {/* STAGE 1: UPLOAD FORM CARD (Shown if no batch result yet) */}
        {!uploadResult && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-5">
            <form onSubmit={handleUploadSubmit} className="space-y-5">
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 cursor-pointer transition-all text-center space-y-3 ${
                  selectedFile
                    ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-amber-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  {uploading ? (
                    <Loader2 size={28} className="animate-spin text-amber-500" />
                  ) : (
                    <FileSpreadsheet size={28} />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    {selectedFile ? selectedFile.name : 'Click to select or drag and drop Excel template file'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Accepts <span className="font-semibold text-slate-600 dark:text-slate-300">courier_assign_template.xlsx</span> or any valid Excel (.xlsx, .xls) / CSV file
                  </p>
                </div>

                {selectedFile && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 text-white rounded-full text-xs font-mono font-bold shadow-2xs">
                    <CheckCircle2 size={14} />
                    <span>{selectedFile.name}</span>
                    <span className="opacity-80">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="h-11 px-5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-2xl transition-all border border-amber-200 dark:border-amber-900/60 flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download size={16} className="text-amber-600 dark:text-amber-400" />
                    <span>Download Template Excel</span>
                  </button>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadResult(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-500 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Remove File</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="h-11 px-8 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-amber-500/20 shadow-2xs flex items-center gap-2 cursor-pointer ml-auto"
                >
                  {uploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  <span>Upload & Validate File</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* OPTION A LOADER ANIMATION MODAL WHEN SUBMITTING / UPLOADING */}
        {(uploading || submittingFinal) && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Truck className="h-4 w-4 animate-bounce text-amber-500" />
                {uploading ? 'Validating Uploaded File...' : 'Completing Final Courier Assignment...'}
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

            {/* Highway Canvas */}
            <div className="relative w-full h-28 bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between">
              <div className="absolute top-1/2 left-0 right-0 border-b-2 border-dashed border-amber-400/60 z-0 animate-pulse"></div>

              <div className="relative z-10 flex items-center justify-between px-2 text-[10px] font-bold text-slate-300">
                <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                  <span className="text-amber-400">📄</span> {selectedFile?.name || 'Batch Processing'}
                </div>
                <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                  <span className="text-emerald-400">⚡</span> {uploading ? 'POST /upload' : 'POST /submit'}
                </div>
              </div>

              <div className="relative w-full h-10 flex items-center justify-between px-4">
                <div
                  className={`absolute transition-all duration-700 ease-out z-20 ${
                    truckState === 'driving'
                      ? 'translate-x-[110px] scale-110'
                      : truckState === 'scanned'
                      ? 'translate-x-[230px] scale-125'
                      : truckState === 'dispatched'
                      ? 'translate-x-[320px] scale-110'
                      : 'left-4 top-1 scale-100'
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

                <div className="relative right-0 flex items-center gap-1">
                  {(truckState === 'scanned' || truckState === 'dispatched') && (
                    <div className="absolute -top-6 -left-5 z-30 animate-bounce text-base">
                      📦 ✅ <Sparkles className="inline h-4 w-4 text-emerald-400" />
                    </div>
                  )}
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shadow-lg">
                    🏭
                  </div>
                </div>
              </div>

              <div className="relative z-10 text-[11px] font-semibold text-center text-amber-200 truncate">
                {statusMessageText}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: VALIDATION RESULTS & FINAL CONFIRMATION ACTION BAR */}
        {batchMeta && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* STATUS BANNER */}
            <div className={`p-6 rounded-3xl border shadow-2xs space-y-4 ${
              isFinalSubmitted
                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30'
                : 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-lg ${
                    isFinalSubmitted ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-500 shadow-amber-500/20'
                  }`}>
                    {isFinalSubmitted ? <PackageCheck size={24} /> : <ShieldCheck size={24} />}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isFinalSubmitted ? 'Courier Assignment Processed Successfully!' : 'File Validated - Pending Final Assignment'}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
                      Batch No: <strong className="text-amber-600 dark:text-amber-400">{batchMeta.batchNo}</strong> | Status: {' '}
                      <span className={`font-extrabold uppercase px-2 py-0.5 rounded text-[10px] ${
                        isFinalSubmitted
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                          : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                      }`}>
                        {batchMeta.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* STAGE 2 ACTION BUTTONS (COMPLETE vs ABORT) */}
                {!isFinalSubmitted && (
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleAbortBatch}
                      disabled={submittingFinal}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs rounded-2xl transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={16} />
                      <span>Abort / Upload New</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingFinal || (batchMeta.passedCount === 0)}
                      onClick={handleFinalSubmit}
                      className="h-11 px-7 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-emerald-600/20 shadow-2xs flex items-center gap-2 cursor-pointer"
                    >
                      {submittingFinal ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      <span>Complete Courier Assignment ({batchMeta.passedCount})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* STAT CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Total Records</span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {batchMeta.totalRecords}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Passed Count</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {batchMeta.passedCount}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Failed Count</span>
                  <span className={`text-xl font-extrabold font-mono ${batchMeta.failedCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {batchMeta.failedCount}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Batch ID</span>
                  <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                    #{batchMeta.id}
                  </span>
                </div>
              </div>
            </div>

            {/* RECORD DETAILS PREVIEW TABLE */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Validated Record Details ({detailsList.length} Items)
                  </h3>
                </div>

                {isFinalSubmitted && (
                  <button
                    type="button"
                    onClick={handleAbortBatch}
                    className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-2xl hover:bg-amber-100 border border-amber-200 dark:border-amber-900/60 transition-all"
                  >
                    Upload Another Batch
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-extrabold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Execution ID</th>
                      <th className="py-3 px-4">Pack Ref No</th>
                      <th className="py-3 px-4">Courier Code</th>
                      <th className="py-3 px-4">Ship Mode</th>
                      <th className="py-3 px-4">AWB Number</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {detailsList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.executionId}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.packRefNo}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.courierCode}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {item.shipmodeName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">
                          {item.awbNo || 'N/A'}
                        </td>
                        <td className="py-2.5 px-4">
                          {item.status === 'PASSED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-900">
                              <CheckCircle2 size={12} /> {item.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-extrabold border border-red-200 dark:border-red-900">
                              <AlertTriangle size={12} /> {item.status} {item.errorMessage ? `(${item.errorMessage})` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
  );
}
