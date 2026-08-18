'use client';

import React, { useState, useCallback } from 'react';
import { 
  Search, Loader2, Package, User, MapPin, FileText, CheckCircle2, 
  Clock, Building2, Tag, Layers, Truck, AlertCircle, Calendar, 
  ShieldCheck, ArrowRight, Activity, ChevronRight, ChevronDown, Download, FileSpreadsheet,
  Trash2, Sparkles, Filter, CheckSquare, RefreshCw
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { statusCheckBatchService } from '@/services/statusCheckBatch.service';
import { StatusCheckReportDetails } from '@/services/statusCheckReport.service';
import { toast } from 'sonner';

export default function StatusCheckBatchClient() {
  const [textareaInput, setTextareaInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingExcel, setDownloadingExcel] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resultsList, setResultsList] = useState<StatusCheckReportDetails[]>([]);
  const [searchedCount, setSearchedCount] = useState<number>(0);
  const [expandedIndexMap, setExpandedIndexMap] = useState<Record<number, boolean>>({});

  // Parse input textarea string into unique cleaned array of strings
  const getParsedIdentifiers = (text: string): string[] => {
    if (!text.trim()) return [];
    const tokens = text.split(/[\r\n,;\s]+/).map((t) => t.trim()).filter((t) => t.length > 0);
    return Array.from(new Set(tokens));
  };

  // Search Handler
  const handleSearchBatch = useCallback(async (customText?: string) => {
    const rawText = customText !== undefined ? customText : textareaInput;
    const identifiers = getParsedIdentifiers(rawText);

    if (identifiers.length === 0) {
      toast.error('Please enter at least one reference identifier.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResultsList([]);
    setSearchedCount(identifiers.length);

    try {
      const data = await statusCheckBatchService.postBatchStatusCheck(identifiers);
      setResultsList(data || []);

      if (!data || data.length === 0) {
        setErrorMsg(`No matching order execution results found for the ${identifiers.length} searched identifier(s).`);
        toast.error('No matching records found.');
      } else {
        toast.success(`Successfully loaded ${data.length} order status record(s) from NDJSON stream!`);
        // Start all rows in collapsed stage by default
        setExpandedIndexMap({});
      }
    } catch (err: any) {
      console.error('Batch status check search error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to fetch batch status check report.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [textareaInput]);

  // Excel Download Handler
  const handleDownloadExcel = async () => {
    const identifiers = getParsedIdentifiers(textareaInput);
    if (identifiers.length === 0) {
      toast.error('Please enter identifiers to download the Excel report.');
      return;
    }

    setDownloadingExcel(true);
    const toastId = toast.loading(`Downloading Batch Excel report for ${identifiers.length} identifier(s)...`);

    try {
      await statusCheckBatchService.downloadBatchStatusCheckExcel(identifiers);
      toast.success('Batch Excel report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Batch Excel download error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to download Batch Excel report.', { id: toastId });
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Toggle Accordion Expand
  const toggleExpand = (idx: number) => {
    setExpandedIndexMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Expand All / Collapse All
  const handleExpandAll = () => {
    const allMap: Record<number, boolean> = {};
    resultsList.forEach((_, idx) => (allMap[idx] = true));
    setExpandedIndexMap(allMap);
  };

  const handleCollapseAll = () => {
    setExpandedIndexMap({});
  };

  // Helper date formatter
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to parse Java-style log string in timeline remarks
  const parseCourierLogString = (remarksStr?: string | null) => {
    if (!remarksStr) return null;
    if (!remarksStr.startsWith('{') && !remarksStr.includes('selectedService')) return null;

    try {
      const statusMatch = remarksStr.match(/status=([^,\}]+)/);
      const pincodeMatch = remarksStr.match(/pincode=([^,\}]+)/);
      const shipModeMatch = remarksStr.match(/shipMode=([^,\}]+)/);
      const weightMatch = remarksStr.match(/chargeableWeightKg=([^,\}]+)/);
      const totalQtyMatch = remarksStr.match(/totalQuantity=([^,\}]+)/);
      const serviceIdMatch = remarksStr.match(/serviceId=([^,\}]+)/);
      const serviceCodeMatch = remarksStr.match(/serviceCode=([^,\}]+)/);
      const serviceNameMatch = remarksStr.match(/serviceName=([^,\}]+)/);
      const todayCountMatch = remarksStr.match(/todayAssignedCount=([^,\}]+)/);

      return {
        status: statusMatch ? statusMatch[1].trim() : 'N/A',
        pincode: pincodeMatch ? pincodeMatch[1].trim() : 'N/A',
        shipMode: shipModeMatch ? shipModeMatch[1].trim() : 'N/A',
        weight: weightMatch ? `${weightMatch[1].trim()} kg` : 'N/A',
        totalQuantity: totalQtyMatch ? totalQtyMatch[1].trim() : 'N/A',
        serviceId: serviceIdMatch ? serviceIdMatch[1].trim() : 'N/A',
        serviceCode: serviceCodeMatch ? serviceCodeMatch[1].trim() : 'N/A',
        serviceName: serviceNameMatch ? serviceNameMatch[1].trim() : 'N/A',
        todayAssignedCount: todayCountMatch ? todayCountMatch[1].trim() : 'N/A',
        raw: remarksStr,
      };
    } catch (e) {
      return { raw: remarksStr };
    }
  };

  const parsedInputCount = getParsedIdentifiers(textareaInput).length;

  return (
    <AdminLayout
      pageTitle="Status Check Batch"
      pageSubtitle="Batch search multiple order reference identifiers simultaneously with NDJSON streaming and Excel export."
      pageIcon={<Layers size={22} className="text-amber-500" />}
    >
      <div className="space-y-6 pb-16">

        {/* MULTIPLE IDENTIFIERS TEXTAREA SEARCH & RESULTS SUMMARY COMBINED CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Searches Execution Ref, Pack Ref, AWB No, Order Ref, Client Order No, PO No (Multiple Identifiers)
            </label>
            {parsedInputCount > 0 && (
              <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                {parsedInputCount} identifier(s) detected
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchBatch();
            }}
            className="space-y-3"
          >
            <textarea
              rows={6}
              value={textareaInput}
              onChange={(e) => setTextareaInput(e.target.value)}
              placeholder={`LK007506759_0001\nLK007505861_0001\nLK007505856_0001\nLK007505857_0001\nZH08005337\nZH08005339\n2608000185\n2608000186`}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 p-4 text-xs font-mono font-semibold focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none dark:text-white transition-all shadow-2xs leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = `LK007506759_0001\nLK007505861_0001\nLK007505856_0001\nLK007505857_0001\nZH08005337\nZH08005339\n2608000185\n2608000186`;
                    setTextareaInput(sample);
                    handleSearchBatch(sample);
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Fill Sample Identifiers</span>
                </button>

                {textareaInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setTextareaInput('');
                      setResultsList([]);
                      setErrorMsg('');
                    }}
                    className="px-3 py-1.5 text-slate-400 hover:text-red-500 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={parsedInputCount === 0 || downloadingExcel}
                  onClick={handleDownloadExcel}
                  className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-emerald-500/20 shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  title={
                    parsedInputCount > 0
                      ? `Download Excel report for ${parsedInputCount} identifier(s)`
                      : 'Enter identifiers in textarea to enable Excel download'
                  }
                >
                  {downloadingExcel ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                  <span>Download Batch Excel</span>
                </button>

                <button
                  type="submit"
                  disabled={loading || parsedInputCount === 0}
                  className="w-full sm:w-auto h-11 px-6 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-amber-500/20 shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  <span>Search Batch Status ({parsedInputCount})</span>
                </button>
              </div>
            </div>
          </form>

          {/* INTEGRATED RESULTS METRICS & ACCORDION CONTROLS SUB-ROW */}
          {resultsList.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-amber-500/20">
                  <CheckSquare size={18} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                    Batch Results ({resultsList.length} Orders Returned)
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Searched <strong>{searchedCount}</strong> identifiers | Parsed <strong>{resultsList.length}</strong> NDJSON order items
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ERROR STATE */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* NO DATA INITIAL STATE */}
        {resultsList.length === 0 && !loading && !errorMsg && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Layers size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              No Batch Identifiers Searched
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Enter multiple Execution Ref, Pack Ref, AWB No, Order Ref, Client Order No, or PO No values in the textarea above to view list results.
            </p>
          </div>
        )}

        {/* =================================================================== */}
        {/* BATCH RESULTS TABLE CONTAINER */}
        {/* =================================================================== */}
        {resultsList.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* ORDER RESULTS TABLE WITH EXPANDABLE ROWS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">Matched Identifier</th>
                      <th className="py-3.5 px-4">Client Order No</th>
                      <th className="py-3.5 px-4">Order Ref No</th>
                      <th className="py-3.5 px-4">Execution Ref</th>
                      <th className="py-3.5 px-4">Client Name</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Product Name</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {resultsList.map((item, idx) => {
                      const isExpanded = !!expandedIndexMap[idx];
                      const courierLogItem = item.timeline?.find(
                        (t) => t.status === 20 || (t.remarks && t.remarks.includes('selectedService'))
                      );
                      const parsedCourierLog = courierLogItem ? parseCourierLogString(courierLogItem.remarks) : null;

                      return (
                        <React.Fragment key={item.executionId || idx}>
                          {/* MAIN ROW */}
                          <tr
                            onClick={() => toggleExpand(idx)}
                            className={`cursor-pointer transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-950/20 ${
                              isExpanded ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <div className="text-slate-400">
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>
                                <span className="font-mono font-bold text-slate-500 text-[11px]">
                                  #{idx + 1}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white font-mono block">
                                  {item.matchedValue || item.clientOrderNo || 'N/A'}
                                </span>
                                {item.matchedField && (
                                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[9px] font-extrabold uppercase tracking-wider">
                                    {item.matchedField}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {item.clientOrderNo || 'N/A'}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                              {item.orderRefNo || 'N/A'}
                            </td>

                            <td className="py-3.5 px-4 font-mono font-semibold text-amber-600 dark:text-amber-400">
                              {item.executionRefNo || 'N/A'}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.clientName || 'N/A'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {item.businessUnitName || 'B2C Unit'}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {item.customerFirstName || item.customerLastName
                                  ? `${item.customerFirstName || ''} ${item.customerLastName || ''}`.trim()
                                  : 'N/A'}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {item.city || 'N/A'} ({item.pincode || 'N/A'})
                              </div>
                            </td>

                            <td className="py-3.5 px-4 max-w-[220px]">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                {item.productName || item.clientProductName || 'N/A'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block">
                                Qty: {item.quantity ?? 1}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-300 dark:border-emerald-800">
                                Status #{item.executionStatus ?? item.status ?? 'Active'}
                              </span>
                            </td>
                          </tr>

                          {/* EXPANDABLE INLINE SUB-ROW */}
                          {isExpanded && (
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                              <td colSpan={9} className="p-6 border-b border-slate-200/60 dark:border-slate-800">
                                <div className="space-y-6 animate-in fade-in duration-200">
                                  
                                  {/* 1ST SECTION: ORDER DETAILS GRID (3 CARDS) */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    
                                    {/* CARD 1: SYSTEM & ORDER IDENTIFIERS */}
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5 shadow-2xs">
                                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 border-b border-slate-100 dark:border-slate-700 pb-2">
                                        <FileText size={15} />
                                        <h4 className="text-xs font-bold uppercase tracking-wider">Identifiers & Dates</h4>
                                      </div>

                                      <div className="space-y-1.5 text-xs">
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Execution Ref No</span>
                                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                            {item.executionRefNo || 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Child Order Ref No</span>
                                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                            {item.childOrderRefNo || 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Order Date</span>
                                          <span className="font-mono text-slate-700 dark:text-slate-300">
                                            {item.orderDate || 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* CARD 2: CUSTOMER & SHIPPING */}
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5 shadow-2xs">
                                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-700 pb-2">
                                        <User size={15} />
                                        <h4 className="text-xs font-bold uppercase tracking-wider">Customer Details</h4>
                                      </div>

                                      <div className="space-y-1.5 text-xs">
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Customer Name</span>
                                          <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {item.customerFirstName || item.customerLastName
                                              ? `${item.customerFirstName || ''} ${item.customerLastName || ''}`.trim()
                                              : 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Mobile</span>
                                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                            {item.mobile || 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">City / State / Pincode</span>
                                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {item.city || 'N/A'}, {item.state || 'N/A'} ({item.pincode || 'N/A'})
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* CARD 3: PRODUCT & COURIER SUMMARY */}
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5 shadow-2xs">
                                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 border-b border-slate-100 dark:border-slate-700 pb-2">
                                        <Package size={15} />
                                        <h4 className="text-xs font-bold uppercase tracking-wider">Product & Courier</h4>
                                      </div>

                                      <div className="space-y-1.5 text-xs">
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Product Name</span>
                                          <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                                            {item.productName || item.clientProductName || 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Courier Partner</span>
                                          <span className="font-bold text-purple-600 dark:text-purple-400">
                                            {item.courierName || 'Not Assigned'} ({item.shipMode || 'SURFACE'})
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">Courier Assign Date</span>
                                          <span className="font-mono text-slate-600 dark:text-slate-400">
                                            {formatDate(item.courierAssignDate)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                  </div>

                                  {/* 2-COLUMN ROW: TIMELINE & COURIER LOG DETAILS */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    
                                    {/* ORDER TIMELINE */}
                                    <div className="space-y-3 flex flex-col">
                                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <Clock className="text-amber-500" size={16} />
                                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                                          Order Lifecycle Timeline ({item.timeline?.length || 0} Events)
                                        </h4>
                                      </div>

                                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 h-[280px] overflow-y-auto pr-2 shadow-2xs">
                                        {(!item.timeline || item.timeline.length === 0) ? (
                                          <p className="text-xs text-slate-400 font-medium text-center py-8">
                                            No timeline events logged.
                                          </p>
                                        ) : (
                                          <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                            {item.timeline.map((event, tIdx) => (
                                              <div key={event.id || tIdx} className="relative">
                                                <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                                  <CheckCircle2 size={10} />
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                                  <div className="flex items-center justify-between gap-1">
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-[9px]">
                                                      Status #{event.status}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                      {formatDate(event.createdAt)}
                                                    </span>
                                                  </div>
                                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                    {event.remarks?.startsWith('{') ? 'Courier Service Assignment Executed' : (event.remarks || `Status ${event.status}`)}
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* COURIER LOG DETAILS */}
                                    <div className="space-y-3 flex flex-col">
                                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <Truck className="text-purple-500" size={16} />
                                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                                          Courier Assignment Details
                                        </h4>
                                      </div>

                                      {parsedCourierLog ? (
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 h-[280px] flex flex-col justify-between space-y-3 shadow-2xs">
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                                              <span className="text-[9px] font-extrabold text-slate-400 uppercase">Status</span>
                                              <div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                                                  <CheckCircle2 size={10} /> {parsedCourierLog.status}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                                              <span className="text-[9px] font-extrabold text-slate-400 uppercase">Service</span>
                                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 font-mono truncate">
                                                {parsedCourierLog.serviceName}
                                              </p>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                                              <span className="text-[9px] font-extrabold text-slate-400 uppercase">Ship Mode / Zip</span>
                                              <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 font-mono">
                                                {parsedCourierLog.shipMode} • {parsedCourierLog.pincode}
                                              </p>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                                              <span className="text-[9px] font-extrabold text-slate-400 uppercase">Assigned Today</span>
                                              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                                                {parsedCourierLog.todayAssignedCount} Packages
                                              </p>
                                            </div>
                                          </div>

                                          <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-xl p-3 text-[11px] space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                                            <div className="flex justify-between">
                                              <span>Weight:</span>
                                              <strong className="font-mono text-purple-700 dark:text-purple-300">{parsedCourierLog.weight}</strong>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <strong className="font-mono text-slate-800 dark:text-slate-100">{parsedCourierLog.totalQuantity}</strong>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 h-[280px] flex items-center justify-center text-xs text-slate-400 font-medium shadow-2xs">
                                          No automated courier assignment log payload found.
                                        </div>
                                      )}
                                    </div>

                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  );
}
