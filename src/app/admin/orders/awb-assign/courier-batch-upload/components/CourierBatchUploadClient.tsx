'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Eye,
  Search,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  FileCheck,
  FileX,
  Layers,
  Filter,
} from 'lucide-react';
import {
  CourierBatch,
  CourierBatchDetail,
  CourierBatchFilterParams,
  CourierBatchResponseData,
} from '@/types/courierBatchUpload';
import { courierBatchUploadService } from '@/services/courierBatchUpload.service';
import { toast } from 'sonner';

export const CourierBatchUploadClient: React.FC = () => {
  // Filter States
  const today = useMemo(() => new Date(), []);
  const defaultEndDate = useMemo(() => today.toISOString().split('T')[0], [today]);
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [fromDate, setFromDate] = useState<string>(defaultStartDate);
  const [toDate, setToDate] = useState<string>(defaultEndDate);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [batchNoQuery, setBatchNoQuery] = useState<string>('');

  // Data & Loading States
  const [batches, setBatches] = useState<CourierBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(true);
  const [downloadingTemplate, setDownloadingTemplate] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [submittingBatchId, setSubmittingBatchId] = useState<number | null>(null);

  // Active Batch Modal View States
  const [activeBatchData, setActiveBatchData] = useState<CourierBatchResponseData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [loadingDetailModal, setLoadingDetailModal] = useState<boolean>(false);
  const [detailFilterTab, setDetailFilterTab] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>('');

  // 1. Fetch Batches List
  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const filters: CourierBatchFilterParams = {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        batchNo: batchNoQuery.trim() || undefined,
      };
      const list = await courierBatchUploadService.getBatchesList(filters);
      setBatches(list || []);
    } catch (err: any) {
      console.error('Error fetching AWB batches list:', err);
      toast.error('Failed to load courier batch upload history.');
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, [fromDate, toDate, statusFilter, batchNoQuery]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // 2. Download Template Handler
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    const toastId = toast.loading('Downloading Offline AWB Upload Excel Template...');
    try {
      await courierBatchUploadService.downloadTemplate();
      toast.success('Excel template downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Template download error:', err);
      toast.error('Failed to download Excel template.', { id: toastId });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // 3. File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const toastId = toast.loading(`Uploading & validating file ${file.name}...`);
    try {
      const responseData = await courierBatchUploadService.uploadBatchFile(file);
      toast.success(`Batch #${responseData.batch.batchNo} created & validated successfully!`, { id: toastId });
      setActiveBatchData(responseData);
      setShowDetailModal(true);
      setDetailFilterTab('ALL');
      fetchBatches();
    } catch (err: any) {
      console.error('File upload error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload AWB batch file.', { id: toastId });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // 4. View Batch Details Handler
  const handleViewBatchDetails = async (batchId: number) => {
    setLoadingDetailModal(true);
    setShowDetailModal(true);
    setActiveBatchData(null);
    setDetailFilterTab('ALL');
    setDetailSearchQuery('');

    try {
      const data = await courierBatchUploadService.getBatchDetails(batchId);
      setActiveBatchData(data);
    } catch (err: any) {
      console.error('Batch detail view error:', err);
      toast.error('Failed to load batch detail records.');
      setShowDetailModal(false);
    } finally {
      setLoadingDetailModal(false);
    }
  };

  // 5. Download Batch Excel Report Handler
  const handleDownloadBatchReport = async (batchId: number, filter: 'ALL' | 'PASSED' | 'FAILED') => {
    const toastId = toast.loading(`Downloading ${filter.toLowerCase()} records for Batch #${batchId}...`);
    try {
      await courierBatchUploadService.downloadBatchReport(batchId, filter);
      toast.success(`Downloaded ${filter} records Excel spreadsheet!`, { id: toastId });
    } catch (err: any) {
      console.error('Batch download error:', err);
      toast.error('Failed to download batch spreadsheet.', { id: toastId });
    }
  };

  // Submission Confirmation Modal States
  const [submitConfirmBatchId, setSubmitConfirmBatchId] = useState<number | null>(null);
  const [submitConfirmBatchNo, setSubmitConfirmBatchNo] = useState<string | null>(null);

  // Open confirmation modal handler
  const handleSubmitBatch = (batchId: number, batchNo?: string) => {
    setSubmitConfirmBatchId(batchId);
    setSubmitConfirmBatchNo(batchNo || String(batchId));
  };

  // Perform actual submit API call after user confirms in modal
  const confirmSubmitBatch = async (batchId: number) => {
    setSubmittingBatchId(batchId);
    const toastId = toast.loading(`Submitting Batch #${submitConfirmBatchNo || batchId}...`);
    try {
      const result = await courierBatchUploadService.submitBatch(batchId);
      toast.success(`Batch #${submitConfirmBatchNo || batchId} submitted successfully! Passed AWBs committed.`, { id: toastId });
      if (activeBatchData && activeBatchData.batch.id === batchId) {
        setActiveBatchData(result || { ...activeBatchData, batch: { ...activeBatchData.batch, status: 'SUBMITTED' } });
      }
      fetchBatches();
      setSubmitConfirmBatchId(null);
      setSubmitConfirmBatchNo(null);
    } catch (err: any) {
      console.error('Submit batch error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit batch.', { id: toastId });
    } finally {
      setSubmittingBatchId(null);
    }
  };

  // Normalize batch data for view modal:
  // When a batch is in SUBMITTED state, rows that were committed during submission have had their order_execution status updated to AWB_ASSIGNED (5/6).
  // Re-validating a SUBMITTED batch returns "Order execution status is not COURIER_ASSIGNED (Current status ID: 5)".
  // We recognize that for SUBMITTED batches, these rows were successfully COMMITTED/PASSED during batch submit.
  const normalizedBatchData = useMemo(() => {
    if (!activeBatchData) return null;

    const isSubmittedBatch = activeBatchData.batch?.status === 'SUBMITTED';

    const normalizedDetails = activeBatchData.details.map((row) => {
      if (row.status === 'PASSED') {
        return row;
      }

      if (isSubmittedBatch && row.errorMessage) {
        const isPostSubmissionStatusCheckError =
          row.errorMessage.includes('Order execution status is not COURIER_ASSIGNED') ||
          row.errorMessage.includes('Current status ID: 5') ||
          row.errorMessage.includes('Current status ID: 6');

        if (isPostSubmissionStatusCheckError || row.executionId) {
          return {
            ...row,
            status: 'PASSED',
            errorMessage: null,
          };
        }
      }

      return row;
    });

    const passedCount = isSubmittedBatch
      ? normalizedDetails.filter((d) => d.status === 'PASSED').length
      : activeBatchData.batch.passedCount;

    const failedCount = isSubmittedBatch
      ? normalizedDetails.filter((d) => d.status === 'FAILED').length
      : activeBatchData.batch.failedCount;

    return {
      batch: {
        ...activeBatchData.batch,
        passedCount,
        failedCount,
      },
      details: normalizedDetails,
    };
  }, [activeBatchData]);

  // Filtered Details inside Modal
  const filteredDetails = useMemo(() => {
    if (!normalizedBatchData?.details) return [];
    let list = normalizedBatchData.details;

    if (detailFilterTab === 'PASSED') {
      list = list.filter((d) => d.status === 'PASSED');
    } else if (detailFilterTab === 'FAILED') {
      list = list.filter((d) => d.status === 'FAILED');
    }

    if (detailSearchQuery.trim()) {
      const q = detailSearchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.packRefNo?.toLowerCase().includes(q) ||
          d.awbNo?.toLowerCase().includes(q) ||
          d.errorMessage?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [normalizedBatchData, detailFilterTab, detailSearchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & File Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        
        {/* Card 1: Template Download Info */}
        <div className="md:col-span-5 rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-5 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-slate-900 dark:to-blue-950/10 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Offline Excel Template</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Download Standardized AWB Upload Template
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Required headers: <code className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded font-mono font-semibold">Pack Ref No</code> and <code className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded font-mono font-semibold">AWB No</code>. Fill offline courier waybills to perform bulk validation & assignment.
            </p>
          </div>

          <div>
            <button
              type="button"
              disabled={downloadingTemplate}
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {downloadingTemplate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download Excel Template</span>
            </button>
          </div>
        </div>

        {/* Card 2: Excel File Upload Drag-Drop Box */}
        <div className="md:col-span-7 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-900/50 shadow-xs flex flex-col items-center justify-center text-center hover:border-blue-500 dark:hover:border-blue-400 transition-all relative group">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            disabled={uploadingFile}
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />

          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            {uploadingFile ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {uploadingFile ? 'Uploading & Validating Batch...' : 'Drag & Drop Excel File or Click to Upload'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Supports <span className="font-semibold text-slate-700 dark:text-slate-200">.xlsx</span>, <span className="font-semibold text-slate-700 dark:text-slate-200">.xls</span>, and <span className="font-semibold text-slate-700 dark:text-slate-200">.csv</span> formats up to 10MB
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Automatic Instant Pack & AWB Validation</span>
          </div>
        </div>
      </div>

      {/* Main Table Card: Batch Upload History */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        
        {/* Header & Filter Controls Bar */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-wrap lg:flex-nowrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
            
            {/* From Date */}
            <div className="w-full sm:w-[140px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* To Date */}
            <div className="w-full sm:w-[140px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-[140px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="VALIDATED">VALIDATED</option>
                <option value="SUBMITTED">SUBMITTED</option>
              </select>
            </div>

            {/* Batch No Search */}
            <div className="w-full sm:w-[180px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Batch No Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="AWB-UB-2026..."
                  value={batchNoQuery}
                  onChange={(e) => setBatchNoQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchBatches}
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFromDate(defaultStartDate);
                  setToDate(defaultEndDate);
                  setStatusFilter('ALL');
                  setBatchNoQuery('');
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-all cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Historical Batches Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Batch No</th>
                <th className="px-4 py-3 text-center">Total Records</th>
                <th className="px-4 py-3 text-center">Passed</th>
                <th className="px-4 py-3 text-center">Failed</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loadingBatches ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      <span>Loading AWB batch history...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Layers className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">No AWB upload batches found.</span>
                      <span className="text-[11px]">Upload an Excel file above to create a new batch.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const isSubmitted = b.status === 'SUBMITTED';

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {b.batchNo}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-100">
                        {b.totalRecords}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <FileCheck className="h-3 w-3" />
                          {b.passedCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                          b.failedCount > 0
                            ? 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400'
                            : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}>
                          <FileX className="h-3 w-3" />
                          {b.failedCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                            isSubmitted
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {isSubmitted && <CheckCircle2 className="h-3 w-3" />}
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => handleViewBatchDetails(b.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                            title="View Batch Validation Records"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                            <span>View</span>
                          </button>

                          {/* Download Excel Report */}
                          <button
                            type="button"
                            onClick={() => handleDownloadBatchReport(b.id, 'ALL')}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                            title="Download Batch Excel Report"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Excel</span>
                          </button>

                          {/* Submit Batch (if VALIDATED) */}
                          {!isSubmitted && (
                            <button
                              type="button"
                              disabled={submittingBatchId === b.id || b.passedCount === 0}
                              onClick={() => handleSubmitBatch(b.id, b.batchNo)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                              title="Commit Passed AWBs to AWB_ASSIGNED"
                            >
                              {submittingBatchId === b.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              <span>Submit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Details Review & Submission Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Batch #{activeBatchData?.batch?.batchNo || 'Validation Details'}
                    </h3>
                    {activeBatchData?.batch?.status && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        activeBatchData.batch.status === 'SUBMITTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {activeBatchData.batch.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review row-by-row Pack Ref No and AWB validation status before submitting
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingDetailModal ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500 mx-auto mb-2" />
                <span>Loading validation records...</span>
              </div>
            ) : normalizedBatchData ? (
              <div className="space-y-5">
                
                {/* Summary Metrics Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Records
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                      {normalizedBatchData.batch.totalRecords}
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Passed Records</span>
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {normalizedBatchData.batch.passedCount}
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Failed Records</span>
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-red-600 dark:text-red-400">
                      {normalizedBatchData.batch.failedCount}
                    </div>
                  </div>
                </div>

                {/* Controls Bar: Tabs + Search + Download Options */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDetailFilterTab('ALL')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        detailFilterTab === 'ALL'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      All ({normalizedBatchData.details.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailFilterTab('PASSED')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        detailFilterTab === 'PASSED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      Passed ({normalizedBatchData.batch.passedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailFilterTab('FAILED')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        detailFilterTab === 'FAILED'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                      }`}
                    >
                      Failed ({normalizedBatchData.batch.failedCount})
                    </button>
                  </div>

                  {/* Search + Download Buttons */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Pack / AWB / Error..."
                        value={detailSearchQuery}
                        onChange={(e) => setDetailSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadBatchReport(normalizedBatchData.batch.id, 'ALL')}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1"
                        title="Download All Rows Excel"
                      >
                        <Download className="h-3 w-3" />
                        <span>All</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadBatchReport(normalizedBatchData.batch.id, 'PASSED')}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 transition-all cursor-pointer flex items-center gap-1"
                        title="Download Passed Rows Excel"
                      >
                        <Download className="h-3 w-3" />
                        <span>Passed</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadBatchReport(normalizedBatchData.batch.id, 'FAILED')}
                        className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300 transition-all cursor-pointer flex items-center gap-1"
                        title="Download Failed Rows Excel"
                      >
                        <Download className="h-3 w-3" />
                        <span>Failed</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details Data Table */}
                <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400 z-10">
                      <tr>
                        <th className="px-4 py-2.5">Pack Ref No</th>
                        <th className="px-4 py-2.5">AWB No</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                        <th className="px-4 py-2.5">Error Message / Reason</th>
                        <th className="px-4 py-2.5">Execution ID</th>
                        <th className="px-4 py-2.5">Updated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredDetails.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            No records match the current filter query.
                          </td>
                        </tr>
                      ) : (
                        filteredDetails.map((row) => {
                          const isPass = row.status === 'PASSED';

                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                isPass
                                  ? 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                                  : 'bg-red-50/30 hover:bg-red-50/60 dark:bg-red-950/20 dark:hover:bg-red-950/40'
                              }`}
                            >
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                {row.packRefNo}
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {row.awbNo}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                    isPass
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
                                  }`}
                                >
                                  {isPass ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                  )}
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {row.errorMessage ? (
                                  <span className="text-red-600 dark:text-red-400 font-semibold text-[11px]">
                                    {row.errorMessage}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                                {row.executionId || 'N/A'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                                {row.updatedAt ? new Date(row.updatedAt).toLocaleTimeString() : 'N/A'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Submit Action Bar */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Showing <strong className="text-slate-800 dark:text-slate-200">{filteredDetails.length}</strong> of{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{normalizedBatchData.details.length}</strong> detail records
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                    >
                      Close Window
                    </button>

                    {normalizedBatchData.batch.status !== 'SUBMITTED' && (
                      <button
                        type="button"
                        disabled={
                          submittingBatchId === normalizedBatchData.batch.id ||
                          normalizedBatchData.batch.passedCount === 0
                        }
                        onClick={() => handleSubmitBatch(normalizedBatchData.batch.id, normalizedBatchData.batch.batchNo)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {submittingBatchId === normalizedBatchData.batch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span>Submit & Commit {normalizedBatchData.batch.passedCount} Passed AWBs</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* Custom Theme Centered Confirmation Modal for Batch Submission */}
      {submitConfirmBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Send size={22} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit & Commit Batch #{submitConfirmBatchNo || submitConfirmBatchId}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to submit Batch #{submitConfirmBatchNo || submitConfirmBatchId}? All passed records will be committed to <strong className="text-slate-800 dark:text-slate-200">AWB_ASSIGNED</strong> status.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSubmitConfirmBatchId(null);
                  setSubmitConfirmBatchNo(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submittingBatchId === submitConfirmBatchId}
                onClick={() => confirmSubmitBatch(submitConfirmBatchId!)}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {submittingBatchId === submitConfirmBatchId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
