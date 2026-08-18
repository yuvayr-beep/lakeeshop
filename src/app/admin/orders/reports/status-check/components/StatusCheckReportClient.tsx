'use client';

import React, { useState, useCallback } from 'react';
import { 
  Search, Loader2, Package, User, MapPin, FileText, CheckCircle2, 
  Clock, Building2, Tag, Layers, Truck, AlertCircle, Calendar, 
  ShieldCheck, ArrowRight, Activity, ChevronRight, Hash, Box, RefreshCw, FileCode
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { 
  statusCheckReportService, 
  StatusCheckReportDetails, 
  OrderTimelineItem 
} from '@/services/statusCheckReport.service';
import { toast } from 'sonner';

export default function StatusCheckReportClient() {
  const [identifierInput, setIdentifierInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [details, setDetails] = useState<StatusCheckReportDetails | null>(null);

  // Search Handler
  const handleSearch = useCallback(async (queryParam?: string) => {
    const query = (queryParam !== undefined ? queryParam : identifierInput).trim();
    if (!query) {
      toast.error('Please enter a reference identifier (e.g. LK007506759_0001).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setDetails(null);

    try {
      const data = await statusCheckReportService.getStatusCheckDetails(query);
      if (!data) {
        setErrorMsg(`No order execution details found for identifier "${query}".`);
        toast.error('No matching records found.');
      } else {
        setDetails(data);
        toast.success(`Loaded details for "${query}"`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch status check report.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [identifierInput]);

  // Date Formatter
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

  // Helper to parse Java-style key-value string in timeline remarks for Courier Details
  const parseCourierLogString = (remarksStr?: string | null) => {
    if (!remarksStr) return null;
    if (!remarksStr.startsWith('{') && !remarksStr.includes('selectedService')) return null;

    try {
      // Extract key fields using regex pattern matching for robust parsing of Java toString format
      const statusMatch = remarksStr.match(/status=([^,\}]+)/);
      const pincodeMatch = remarksStr.match(/pincode=([^,\}]+)/);
      const shipModeMatch = remarksStr.match(/shipMode=([^,\}]+)/);
      const weightMatch = remarksStr.match(/chargeableWeightKg=([^,\}]+)/);
      const totalQtyMatch = remarksStr.match(/totalQuantity=([^,\}]+)/);
      const serviceIdMatch = remarksStr.match(/serviceId=([^,\}]+)/);
      const serviceCodeMatch = remarksStr.match(/serviceCode=([^,\}]+)/);
      const serviceNameMatch = remarksStr.match(/serviceName=([^,\}]+)/);
      const todayCountMatch = remarksStr.match(/todayAssignedCount=([^,\}]+)/);
      const maxCountMatch = remarksStr.match(/maxAssignPerDay=([^,\}]+)/);

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
        maxAssignPerDay: maxCountMatch ? maxCountMatch[1].trim() : 'N/A',
        raw: remarksStr,
      };
    } catch (e) {
      return { raw: remarksStr };
    }
  };

  // Find courier log item in timeline (status 20 or remarks with selectedService)
  const courierLogItem = details?.timeline?.find(
    (item) => item.status === 20 || (item.remarks && item.remarks.includes('selectedService'))
  );
  const parsedCourierLog = courierLogItem ? parseCourierLogString(courierLogItem.remarks) : null;

  return (
    <AdminLayout
      pageTitle="Status Check Report"
      pageSubtitle="Real-time order status tracking, lifecycle event timeline, and courier assignment details across reference identifiers."
      pageIcon={<Activity size={22} className="text-amber-500" />}
    >
      <div className="space-y-6 pb-16">

        {/* =================================================================== */}
        {/* IDENTIFIER SEARCH CARD */}
        {/* =================================================================== */}
        {/* =================================================================== */}
        {/* IDENTIFIER SEARCH & MATCHED SUMMARY COMBINED CARD */}
        {/* =================================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Searches Execution Ref, Pack Ref, AWB No, Order Ref, Client Order No, PO No
            </label>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="LK007506759_0001"
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 pl-10 pr-4 py-2.5 text-xs font-semibold focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none dark:text-white transition-all shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-10 px-6 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-amber-500/20 shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>Search Status</span>
            </button>
          </form>

          {/* COMBINED MATCHED SUMMARY SUB-ROW */}
          {details && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-amber-500/20">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Matched: {details.matchedValue || details.clientOrderNo || identifierInput}
                    </span>
                    {details.matchedField && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                        {details.matchedField}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Client: <strong className="text-slate-700 dark:text-slate-200">{details.clientName || 'N/A'}</strong> ({details.businessUnitName || 'B2C Unit'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-[11px] font-semibold text-slate-500">Execution Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-300 dark:border-emerald-800">
                  Status #{details.executionStatus ?? details.status ?? 'Active'}
                </span>
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

        {/* NO DATA STATE */}
        {!details && !loading && !errorMsg && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Search size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              No Order Selected
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Enter any identifier like Execution Ref, Pack Ref, AWB No, Order Ref, Client Order No, or PO No above to view complete order status and timeline.
            </p>
          </div>
        )}

        {/* =================================================================== */}
        {/* DETAILS DISPLAY SECTIONS */}
        {/* =================================================================== */}
        {details && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* =============================================================== */}
            {/* 1ST SECTION: ORDER DETAILS GRID (4 CARDS) */}
            {/* =============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <FileText className="text-amber-500" size={18} />
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  1. Order Details & System Identifiers
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                
                {/* CARD 1: SYSTEM IDENTIFIERS */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <FileText size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">System Identifiers</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Execution Ref No</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {details.executionRefNo || details.execution_ref_no || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Child Order Ref No</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {details.childOrderRefNo || details.child_order_ref_no || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Order Ref No</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {details.orderRefNo || details.order_ref_no || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Client Order No</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {details.clientOrderNo || details.client_order_no || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: CUSTOMER DETAILS */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <User size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Customer & Shipping</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Customer Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {details.customerFirstName || details.customerLastName 
                          ? `${details.customerFirstName || ''} ${details.customerLastName || ''}`.trim()
                          : details.person_to_deliver || 'N/A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Mobile</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {details.mobile || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Alt Mobile</span>
                        <span className="font-mono text-slate-500">
                          {details.alternateMobile || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">City & State</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {details.city || 'N/A'}, {details.state || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Pincode</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {details.pincode || details.zip || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: PRODUCT DETAILS */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <Package size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Product Info</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Product Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {details.productName || details.clientProductName || details.product_name || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Product SKU Code</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {details.productCode || details.clientProductCode || details.product_code || 'N/A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Order Quantity</span>
                        <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                          {details.quantity ?? details.executionQty ?? details.order_qty ?? 1}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">External Fulfillment</span>
                        <span className="font-semibold text-slate-500">
                          {details.isExternalFulfillment ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: COURIER SUMMARY */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <Truck size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Courier Summary</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Courier Partner</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {details.courierName || details.courier_name || 'Not Assigned'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">Ship Mode</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {details.shipMode || details.ship_mode || 'SURFACE'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium block">AWB Number</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {details.awbNumber || details.courier_awb_no || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Courier Assigned Date</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        {formatDate(details.courierAssignDate)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* =============================================================== */}
            {/* 2-COLUMN ROW: TIMELINE & COURIER DETAILS (MATCHING HEIGHT) */}
            {/* =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 2ND SECTION: ORDER TIMELINE */}
              <div className="space-y-4 flex flex-col">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Clock className="text-amber-500" size={18} />
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    2. Order Lifecycle Timeline ({details.timeline?.length || 0} Events)
                  </h2>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs h-[360px] overflow-y-auto pr-3">
                  {(!details.timeline || details.timeline.length === 0) ? (
                    <p className="text-xs text-slate-400 font-medium text-center py-12">
                      No timeline events logged for this order.
                    </p>
                  ) : (
                    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {details.timeline.map((event, idx) => (
                        <div key={event.id || idx} className="relative group">
                          
                          {/* Timeline Node Icon */}
                          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-md">
                            <CheckCircle2 size={12} />
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 space-y-1.5 hover:border-amber-500/40 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px]">
                                  Status #{event.status}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                  {event.remarks?.startsWith('{') ? 'Courier Service Assignment Executed' : (event.remarks || `Lifecycle Status ${event.status}`)}
                                </span>
                              </div>

                              <span className="text-[11px] font-mono text-slate-400">
                                {formatDate(event.createdAt)}
                              </span>
                            </div>

                            {!event.remarks?.startsWith('{') && event.remarks && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                {event.remarks}
                              </p>
                            )}

                            {event.createdBy && (
                              <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                                <span>Processed By User ID: <strong>#{event.createdBy}</strong></span>
                                <span>Event ID: <strong>#{event.id}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3RD SECTION: COURIER DETAILS */}
              <div className="space-y-4 flex flex-col">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Truck className="text-purple-500" size={18} />
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    3. Courier Assignment Details & Logistics Rules
                  </h2>
                </div>

                {parsedCourierLog ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs h-[360px] flex flex-col justify-between space-y-4">
                    
                    {/* COURIER METRICS GRID */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assignment Status</span>
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs">
                            <CheckCircle2 size={12} /> {parsedCourierLog.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Courier Service</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
                          {parsedCourierLog.serviceName} ({parsedCourierLog.serviceCode})
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ship Mode / Pincode</span>
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
                          {parsedCourierLog.shipMode} • {parsedCourierLog.pincode}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned Today</span>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {parsedCourierLog.todayAssignedCount} Packages
                        </p>
                      </div>
                    </div>

                    <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl p-4 text-xs space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                      <div className="flex justify-between items-center">
                        <span>Chargeable Weight:</span>
                        <strong className="font-mono text-purple-700 dark:text-purple-300">{parsedCourierLog.weight}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Total Package Quantity:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-100">{parsedCourierLog.totalQuantity}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Service ID:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-100">#{parsedCourierLog.serviceId}</strong>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 h-[360px] flex items-center justify-center text-xs text-slate-400 font-medium">
                    No automated courier assignment log payload found in order history yet.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  );
}
