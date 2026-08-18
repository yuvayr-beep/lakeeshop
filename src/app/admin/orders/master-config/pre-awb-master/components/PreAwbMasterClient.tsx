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
  Trash2,
  CheckSquare,
  Square,
  PlusCircle,
  Truck,
  Layers,
  Filter,
  ArrowRight,
} from 'lucide-react';
import {
  PreAwbSummaryItem,
  PreAwbReportItem,
  PreAwbReportFilterParams,
} from '@/types/preAwbMaster';
import { CourierPartner } from '@/types/courier';
import { preAwbMasterService } from '@/services/preAwbMaster.service';
import { toast } from 'sonner';

export const PreAwbMasterClient: React.FC = () => {
  // Summary Data & Loading
  const [summaries, setSummaries] = useState<PreAwbSummaryItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [summarySearchQuery, setSummarySearchQuery] = useState<string>('');

  // Courier Partners List for Dropdown (fetched from /courier API)
  const [courierPartners, setCourierPartners] = useState<CourierPartner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState<boolean>(false);

  // Upload Box States
  const [selectedCourierIdForUpload, setSelectedCourierIdForUpload] = useState<number | ''>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<boolean>(false);

  // Modal View States (Report details for selected courier)
  const [activeCourierSummary, setActiveCourierSummary] = useState<PreAwbSummaryItem | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportItems, setReportItems] = useState<PreAwbReportItem[]>([]);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [reportAwbSearch, setReportAwbSearch] = useState<string>('');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL');

  // Multiselect state inside report modal
  const [selectedAwbNumbers, setSelectedAwbNumbers] = useState<string[]>([]);
  const [manualAllotRemarks, setManualAllotRemarks] = useState<string>('');
  const [allottingAwb, setAllottingAwb] = useState<boolean>(false);

  // Confirmation Modals State
  const [clearConfirmCourier, setClearConfirmCourier] = useState<PreAwbSummaryItem | null>(null);
  const [clearingPool, setClearingPool] = useState<boolean>(false);

  // Fetch Courier Partners List (GET /courier)
  const fetchCourierPartners = useCallback(async () => {
    setLoadingPartners(true);
    try {
      const list = await preAwbMasterService.getCourierPartnersList();
      setCourierPartners(list || []);
    } catch (err: any) {
      console.error('Error fetching courier partners list:', err);
      setCourierPartners([]);
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  // 1. Fetch Summaries List
  const fetchSummaries = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const list = await preAwbMasterService.getSummaryList();
      setSummaries(list || []);
    } catch (err: any) {
      console.error('Error fetching Pre-AWB summary list:', err);
      toast.error('Failed to load Pre-AWB summary data.');
      setSummaries([]);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
    fetchCourierPartners();
  }, [fetchSummaries, fetchCourierPartners]);

  // 2. Download Template
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    const toastId = toast.loading('Downloading Pre-AWB Excel Template...');
    try {
      await preAwbMasterService.downloadTemplate();
      toast.success('Downloaded Pre-AWB Excel template!', { id: toastId });
    } catch (err: any) {
      console.error('Template download error:', err);
      toast.error('Failed to download Pre-AWB template.', { id: toastId });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // 3. Handle File Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourierIdForUpload) {
      toast.error('Please select a Courier Partner first.');
      return;
    }
    if (!uploadFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }

    const courierObj = summaries.find((s) => s.courierId === Number(selectedCourierIdForUpload));
    const courierName = courierObj ? courierObj.courierName : `Courier #${selectedCourierIdForUpload}`;

    setUploading(true);
    const toastId = toast.loading(`Uploading Pre-AWB file for ${courierName}...`);

    try {
      await preAwbMasterService.uploadPreAwbFile(Number(selectedCourierIdForUpload), uploadFile);
      toast.success(`Successfully uploaded Pre-AWB numbers for ${courierName}!`, { id: toastId });
      setUploadFile(null);
      fetchSummaries();
    } catch (err: any) {
      console.error('Upload Pre-AWB error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload Pre-AWB file.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // 4. Open View Report Modal
  const handleOpenReportModal = async (summary: PreAwbSummaryItem) => {
    setActiveCourierSummary(summary);
    setShowReportModal(true);
    setLoadingReport(true);
    setReportItems([]);
    setSelectedAwbNumbers([]);
    setReportAwbSearch('');
    setReportStatusFilter('ALL');

    try {
      const items = await preAwbMasterService.getReportList({
        courierId: summary.courierId,
      });
      setReportItems(items || []);
    } catch (err: any) {
      console.error('Error fetching Pre-AWB report:', err);
      toast.error(`Failed to load AWB records for ${summary.courierName}.`);
    } finally {
      setLoadingReport(false);
    }
  };

  // 5. Fetch Filtered Report Data inside Modal
  const fetchFilteredReport = useCallback(async () => {
    if (!activeCourierSummary) return;
    setLoadingReport(true);
    try {
      const items = await preAwbMasterService.getReportList({
        courierId: activeCourierSummary.courierId,
        awbNumber: reportAwbSearch,
        awbStatus: reportStatusFilter,
      });
      setReportItems(items || []);
      setSelectedAwbNumbers([]);
    } catch (err: any) {
      console.error('Error fetching filtered report:', err);
      toast.error('Failed to filter AWB records.');
    } finally {
      setLoadingReport(false);
    }
  }, [activeCourierSummary, reportAwbSearch, reportStatusFilter]);

  // 6. Download Report Excel
  const handleDownloadReportExcel = async (courierId: number, courierName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const toastId = toast.loading(`Downloading Pre-AWB Excel report for ${courierName}...`);
    try {
      await preAwbMasterService.downloadReportExcel(courierId);
      toast.success(`Downloaded Excel report for ${courierName}!`, { id: toastId });
    } catch (err: any) {
      console.error('Download report error:', err);
      toast.error('Failed to download Pre-AWB Excel report.', { id: toastId });
    }
  };

  // Manual Allotment Modal State
  const [manualAllotTarget, setManualAllotTarget] = useState<{ awbNumbers: string[]; remarks: string } | null>(null);

  // Open allotment modal for single AWB
  const handleManualAllotSingle = (awbNumber: string) => {
    setManualAllotTarget({
      awbNumbers: [awbNumber],
      remarks: 'Reserved for manual priority dispatch',
    });
  };

  // Open allotment modal for bulk selected AWBs
  const handleBulkManualAllot = () => {
    if (selectedAwbNumbers.length === 0) return;
    setManualAllotTarget({
      awbNumbers: selectedAwbNumbers,
      remarks: manualAllotRemarks.trim() || 'Reserved for manual priority dispatch',
    });
  };

  // Perform actual allotment API call after user confirms in modal
  const confirmManualAllotment = async () => {
    if (!activeCourierSummary || !manualAllotTarget) return;

    setAllottingAwb(true);
    const count = manualAllotTarget.awbNumbers.length;
    const toastId = toast.loading(
      count === 1
        ? `Allotting AWB ${manualAllotTarget.awbNumbers[0]}...`
        : `Allotting ${count} AWBs...`
    );

    let successCount = 0;
    let failCount = 0;

    for (const awbNumber of manualAllotTarget.awbNumbers) {
      try {
        await preAwbMasterService.manualAllot({
          courierId: activeCourierSummary.courierId,
          awbNumber,
          remarks: manualAllotTarget.remarks.trim() || 'Manual priority dispatch',
        });
        successCount++;
      } catch (e) {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.success(
        count === 1
          ? `AWB ${manualAllotTarget.awbNumbers[0]} successfully allotted!`
          : `Successfully allotted ${successCount} AWBs!`,
        { id: toastId }
      );
    } else {
      toast.warning(`Allotted ${successCount} AWBs (${failCount} failed).`, { id: toastId });
    }

    setAllottingAwb(false);
    setManualAllotTarget(null);
    setSelectedAwbNumbers([]);
    setManualAllotRemarks('');
    fetchFilteredReport();
    fetchSummaries();
  };

  // 8. Clear Pre-AWB Pool Handler
  const handleClearPoolConfirm = async () => {
    if (!clearConfirmCourier) return;

    setClearingPool(true);
    const toastId = toast.loading(`Clearing available AWB pool for ${clearConfirmCourier.courierName}...`);

    try {
      await preAwbMasterService.clearPreAwbPool(clearConfirmCourier.courierId);
      toast.success(`Pre-allotted available AWB pool cleared for ${clearConfirmCourier.courierName}!`, { id: toastId });
      setClearConfirmCourier(null);
      if (showReportModal && activeCourierSummary?.courierId === clearConfirmCourier.courierId) {
        fetchFilteredReport();
      }
      fetchSummaries();
    } catch (err: any) {
      console.error('Clear pool error:', err);
      toast.error(err.response?.data?.message || 'Failed to clear AWB pool.', { id: toastId });
    } finally {
      setClearingPool(false);
    }
  };

  // Multiselect Checkbox Logic inside Report Modal
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAwbNumbers(reportItems.map((item) => item.awbNumber));
    } else {
      setSelectedAwbNumbers([]);
    }
  };

  const handleToggleRowSelect = (awbNumber: string) => {
    setSelectedAwbNumbers((prev) =>
      prev.includes(awbNumber) ? prev.filter((a) => a !== awbNumber) : [...prev, awbNumber]
    );
  };

  // Client-side Summary Filtering
  const filteredSummaries = useMemo(() => {
    if (!summarySearchQuery.trim()) return summaries;
    const q = summarySearchQuery.toLowerCase().trim();
    return summaries.filter(
      (s) =>
        s.courierName?.toLowerCase().includes(q) ||
        s.courierCode?.toLowerCase().includes(q) ||
        s.startAwbNumber?.toLowerCase().includes(q) ||
        s.endAwbNumber?.toLowerCase().includes(q)
    );
  }, [summaries, summarySearchQuery]);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Section: Upload Box & Template Download Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Card: Download Template Info */}
        <div className="lg:col-span-4 rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-5 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-slate-900 dark:to-blue-950/10 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Pre-AWB Template</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Download Standardized Pre-AWB Excel Template
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Download template spreadsheet to upload bulk waybills for selected courier partners (Bluedart, Delhivery, ICL, etc.).
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

        {/* Right Card: Upload Form */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Upload Pre-Allotted AWB File
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select a courier partner and upload `.xlsx` spreadsheet containing pre-allocated waybills
              </p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
            
            {/* Courier Dropdown */}
            <div className="sm:col-span-5 space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Select Courier Partner <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCourierIdForUpload}
                onChange={(e) => setSelectedCourierIdForUpload(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Courier Partner --</option>
                {courierPartners.length > 0
                  ? courierPartners.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.courierName} ({c.courierCode})
                      </option>
                    ))
                  : summaries.map((s) => (
                      <option key={s.courierId} value={s.courierId}>
                        {s.courierName} ({s.courierCode})
                      </option>
                    ))}
              </select>
            </div>

            {/* File Input */}
            <div className="sm:col-span-4 space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Excel File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 transition-all"
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={uploading || !selectedCourierIdForUpload || !uploadFile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 transition-all cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>Upload File</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Section: Pre-AWB Summary List Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        
        {/* Controls & Filter Bar */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Courier Name or Code..."
                value={summarySearchQuery}
                onChange={(e) => setSummarySearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={fetchSummaries}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Couriers: <strong className="text-slate-800 dark:text-slate-200">{filteredSummaries.length}</strong>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Courier Partner</th>
                <th className="px-4 py-3 text-center">Total Count</th>
                <th className="px-4 py-3 text-center">Available Count</th>
                <th className="px-4 py-3 text-center">Allotted Count</th>
                <th className="px-4 py-3">Start AWB Number</th>
                <th className="px-4 py-3">End AWB Number</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loadingSummary ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      <span>Loading Pre-AWB courier summary list...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Truck className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">No Pre-AWB courier summary found.</span>
                      <span className="text-[11px]">Upload waybill Excel sheets to pre-allocate AWBs.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => (
                  <tr
                    key={s.courierId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {s.courierName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {s.courierCode}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-100">
                      {s.totalCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        {s.availableCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {s.allottedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {s.startAwbNumber || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {s.endAwbNumber || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Report Modal */}
                        <button
                          type="button"
                          onClick={() => handleOpenReportModal(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                          title="View Detailed Pre-AWBs"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-500" />
                          <span>View</span>
                        </button>

                        {/* Download Report Excel */}
                        <button
                          type="button"
                          onClick={(e) => handleDownloadReportExcel(s.courierId, s.courierName, e)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                          title="Download Pre-AWB Excel Report"
                        >
                          <Download className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Download</span>
                        </button>

                        {/* Clear / Delete Available Pool */}
                        <button
                          type="button"
                          disabled={s.availableCount === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClearConfirmCourier(s);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 disabled:opacity-40 transition-all cursor-pointer"
                          title="Purge unassigned available waybills for this courier"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          <span>Clear Pool</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Pre-AWB List Modal */}
      {showReportModal && activeCourierSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Pre-Allotted AWBs — {activeCourierSummary.courierName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {activeCourierSummary.courierCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inspect, manually allot, or download allocated waybill numbers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Bar & Bulk Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              
              {/* Left Filters */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                {/* AWB Search */}
                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search AWB..."
                    value={reportAwbSearch}
                    onChange={(e) => setReportAwbSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* AWB Status Dropdown */}
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ALLOTTED">ALLOTTED</option>
                </select>

                <button
                  type="button"
                  onClick={fetchFilteredReport}
                  className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Filter className="h-3 w-3" />
                  <span>Filter</span>
                </button>
              </div>

              {/* Right Bulk Actions */}
              <div className="flex items-center gap-2">
                {selectedAwbNumbers.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Optional bulk remarks..."
                      value={manualAllotRemarks}
                      onChange={(e) => setManualAllotRemarks(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none w-44"
                    />

                    <button
                      type="button"
                      disabled={allottingAwb}
                      onClick={handleBulkManualAllot}
                      className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1"
                    >
                      {allottingAwb ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Allot Selected ({selectedAwbNumbers.length})</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadReportExcel(activeCourierSummary.courierId, activeCourierSummary.courierName)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Excel Report</span>
                </button>

                <button
                  type="button"
                  disabled={activeCourierSummary.availableCount === 0}
                  onClick={() => setClearConfirmCourier(activeCourierSummary)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                  title="Purge unassigned available waybills for this courier"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  <span>Clear Pool</span>
                </button>
              </div>
            </div>

            {/* Modal Data Table */}
            <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={reportItems.length > 0 && selectedAwbNumbers.length === reportItems.length}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-2.5">AWB Number</th>
                    <th className="px-4 py-2.5">Courier Code</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5">Remarks</th>
                    <th className="px-4 py-2.5">Assigned At</th>
                    <th className="px-4 py-2.5">Created At</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {loadingReport ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                          <span>Loading AWB records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : reportItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No AWB records match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    reportItems.map((item) => {
                      const isSelected = selectedAwbNumbers.includes(item.awbNumber);
                      const isAvailable = item.awbStatus === 'AVAILABLE';

                      return (
                        <tr
                          key={item.id || item.awbNumber}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-blue-50/70 dark:bg-blue-950/40'
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRowSelect(item.awbNumber)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                            {item.awbNumber}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.courierCode || activeCourierSummary?.courierCode || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                isAvailable
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {item.awbStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                            {item.remarks || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                            {item.assignedAt ? new Date(item.assignedAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {isAvailable ? (
                              <button
                                type="button"
                                disabled={allottingAwb}
                                onClick={() => handleManualAllotSingle(item.awbNumber)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 transition-all cursor-pointer"
                              >
                                <span>Manual Allot</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Allotted</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing <strong className="text-slate-800 dark:text-slate-200">{reportItems.length}</strong> waybill records
              </div>

              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Clear Pool Custom Theme Confirmation Modal */}
      {clearConfirmCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Clear Available AWB Pool for {clearConfirmCourier.courierName}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to purge unassigned available waybills for <strong className="text-slate-800 dark:text-slate-200">{clearConfirmCourier.courierName} ({clearConfirmCourier.courierCode})</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setClearConfirmCourier(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={clearingPool}
                onClick={handleClearPoolConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {clearingPool ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Clear Pool</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Theme Centered Confirmation Modal for Manual Allotment */}
      {manualAllotTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {manualAllotTarget.awbNumbers.length === 1
                    ? `Manual Allotment of AWB ${manualAllotTarget.awbNumbers[0]}`
                    : `Bulk Allotment of ${manualAllotTarget.awbNumbers.length} AWBs`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Specify allotment remarks for courier partner <strong className="text-slate-800 dark:text-slate-200">{activeCourierSummary?.courierName}</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Allotment Remarks
              </label>
              <textarea
                rows={3}
                value={manualAllotTarget.remarks}
                onChange={(e) =>
                  setManualAllotTarget({
                    ...manualAllotTarget,
                    remarks: e.target.value,
                  })
                }
                placeholder="Enter remarks e.g. Reserved for manual priority dispatch..."
                className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setManualAllotTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={allottingAwb}
                onClick={confirmManualAllotment}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {allottingAwb ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Confirm Allotment</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
