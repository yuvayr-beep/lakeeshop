'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, Search, RefreshCw, AlertCircle, Loader2, 
  Package, User, MapPin, FileText, CheckCircle2, ShieldCheck, 
  Send, Sparkles, Clock, Building2, Tag, Layers
} from 'lucide-react';
import { 
  manualCourierAssignService, 
  OrderLookupDetails 
} from '@/services/manualCourierAssign.service';
import { toast } from 'sonner';

export default function ManualCourierAssignmentClient() {
  const [identifierInput, setIdentifierInput] = useState<string>('');
  const [loadingLookup, setLoadingLookup] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<OrderLookupDetails | null>(null);

  // Serviceable Couriers for Pincode (GET /courier/serviceable-pincodes?pincode={zip}&offset=0)
  const [serviceableCouriers, setServiceableCouriers] = useState<any[]>([]);
  const [loadingServiceable, setLoadingServiceable] = useState<boolean>(false);
  const [selectedServiceableIndex, setSelectedServiceableIndex] = useState<string>('');

  // Ship Modes list fetched dynamically from GET /courier/services/courier/{courierId}
  const [availableShipModes, setAvailableShipModes] = useState<any[]>([]);
  const [loadingShipModes, setLoadingShipModes] = useState<boolean>(false);

  // Form Fields for Manual Courier Assignment
  const [selectedCourierCode, setSelectedCourierCode] = useState<string>('');
  const [selectedShipMode, setSelectedShipMode] = useState<string>('SURFACE');
  const [awbNoInput, setAwbNoInput] = useState<string>('');
  const [submittingAssign, setSubmittingAssign] = useState<boolean>(false);

  // Animation & Progress states for Option A loader modal
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [truckState, setTruckState] = useState<'idle' | 'driving' | 'scanned' | 'dispatched'>('idle');
  const [statusMessageText, setStatusMessageText] = useState<string>('');

  // ---------------------------------------------------------------------------
  // FETCH SHIP MODES VIA GET /courier/services/courier/{courierId}
  // ---------------------------------------------------------------------------
  const fetchShipModesForCourierId = useCallback(async (courierId: number) => {
    if (!courierId) return;
    setLoadingShipModes(true);
    try {
      const services = await manualCourierAssignService.getCourierServicesByPartnerId(courierId);
      setAvailableShipModes(services || []);
      if (services && services.length > 0) {
        const firstMode = services[0].shipMode || services[0].serviceType || services[0].serviceCode;
        if (firstMode) setSelectedShipMode(firstMode);
      }
    } catch (err) {
      // Quiet fail fallback
    } finally {
      setLoadingShipModes(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SEARCH ORDER LOOKUP DETAILS & FETCH PINCODE SERVICEABLE COURIERS
  // ---------------------------------------------------------------------------
  const handleSearchLookup = useCallback(async (searchQuery?: string) => {
    const query = (searchQuery !== undefined ? searchQuery : identifierInput).trim();
    if (!query) {
      toast.error('Please enter a valid reference identifier.');
      return;
    }

    setLoadingLookup(true);
    setLookupError('');
    setOrderDetails(null);
    setServiceableCouriers([]);
    setAvailableShipModes([]);
    setSelectedServiceableIndex('');
    setSelectedCourierCode('');
    setSelectedShipMode('SURFACE');

    try {
      const data = await manualCourierAssignService.getOrderLookupDetails(query);
      if (data && data.execution_id) {
        setOrderDetails(data);
        if (data.courier_name || data.courier_code) {
          setSelectedCourierCode(data.courier_name || data.courier_code || '');
        }
        if (data.ship_mode) {
          setSelectedShipMode(data.ship_mode);
        }
        if (data.courier_awb_no) {
          setAwbNoInput(data.courier_awb_no);
        }

        toast.success('Order details retrieved successfully!');

        // Fetch Eligible Serviceable Couriers by Pincode if zip code exists
        const targetZip = data.zip || data.shipment_address_zip || '600028';
        if (targetZip) {
          setLoadingServiceable(true);
          try {
            const list = await manualCourierAssignService.getServiceableCouriersByPincode(targetZip);
            // Filter eligible couriers where status !== false
            const eligible = list.filter((item: any) => item.status !== false);
            setServiceableCouriers(eligible);

            if (eligible.length > 0) {
              const first = eligible[0];
              const initialCode = first.serviceCode || first.courierCode || '';
              setSelectedCourierCode(initialCode);
              const initialMode = first.shipMode || first.serviceType || 'SURFACE';
              setSelectedShipMode(initialMode);
            }
          } catch (svcErr) {
            // Quiet fail fallback
          } finally {
            setLoadingServiceable(false);
          }
        }
      } else {
        setLookupError(`No order details found for identifier "${query}".`);
        toast.error(`No order found for "${query}".`);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to retrieve order details.';
      setLookupError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoadingLookup(false);
    }
  }, [identifierInput]);

  // ---------------------------------------------------------------------------
  // EXPRESS TRUCK ANIMATION HELPER (OPTION A)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // SUBMIT SINGLE MANUAL COURIER ASSIGNMENT (POST /order/execution/courier-assignment/single)
  // ---------------------------------------------------------------------------
  const handleManualCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderDetails?.execution_id) {
      toast.error('No valid execution ID available. Please search an order first.');
      return;
    }
    if (!selectedCourierCode) {
      toast.error('Please select a Courier Code.');
      return;
    }
    if (!selectedShipMode) {
      toast.error('Please select a Ship Mode.');
      return;
    }

    setSubmittingAssign(true);
    setProgressPercent(25);
    setStatusMessageText('Validating Package Consistency & Courier Service ID...');
    launchTruckStep();

    const payload = [
      {
        executionId: Number(orderDetails.execution_id),
        courierCode: selectedCourierCode,
        shipMode: selectedShipMode,
        awbNo: awbNoInput.trim() || undefined,
      },
    ];

    try {
      setTimeout(() => {
        setProgressPercent(65);
        setStatusMessageText('Posting Direct Manual Courier Override...');
        launchTruckStep();
      }, 500);

      const response = await manualCourierAssignService.submitSingleCourierAssignment(payload);

      // Check inner item success status inside response.data array
      const dataArray = Array.isArray(response?.data)
        ? response.data
        : response?.data
        ? [response.data]
        : [];

      const failedItems = dataArray.filter(
        (item: any) => item && (item.success === false || item.success === 'false')
      );

      if (response?.success === false || failedItems.length > 0) {
        const errorReasons = failedItems
          .map((item: any) => item.reason || item.message)
          .filter(Boolean);

        const errorMsg =
          errorReasons.length > 0
            ? errorReasons.join('; ')
            : response?.message || 'Failed to manually assign courier.';

        setSubmittingAssign(false);
        setProgressPercent(0);
        toast.error(errorMsg);
        return;
      }

      setProgressPercent(100);
      setStatusMessageText('Manual Courier Override Assigned Successfully! 🎉');
      launchTruckStep();

      const msg =
        response?.message && response.message !== 'Success'
          ? response.message
          : 'Manual courier assigned successfully!';

      setTimeout(() => {
        toast.success(msg);
        setSubmittingAssign(false);
        setProgressPercent(0);
        // Refresh lookup details to show updated assignment
        handleSearchLookup();
      }, 1000);

    } catch (err: any) {
      console.error('Manual Courier Assignment Submission Error:', err);
      setSubmittingAssign(false);
      setProgressPercent(0);
      const errMsg =
        err.response?.data?.data?.[0]?.reason ||
        err.response?.data?.message ||
        err.message ||
        'Failed to manually assign courier.';
      toast.error(errMsg);
    }
  };

  // Format Helpers
  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* =================================================================== */}
      {/* IDENTIFIER SEARCH CARD */}
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
              handleSearchLookup();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="LK007505854_0001"
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 pl-10 pr-4 py-2.5 text-xs font-semibold focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none dark:text-white transition-all shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={loadingLookup}
              className="h-10 px-6 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-amber-500/20 shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingLookup ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>Search Order</span>
            </button>
          </form>
        </div>

        {/* =================================================================== */}
        {/* SEARCH RESULT CONTENT */}
        {/* =================================================================== */}
        {loadingLookup ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-16 text-center text-slate-400 space-y-3">
            <RefreshCw size={36} className="animate-spin text-amber-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Retrieving order details & pincode serviceability...
            </p>
          </div>
        ) : lookupError ? (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-3xl p-8 text-center text-red-600 dark:text-red-400 space-y-2">
            <AlertCircle size={36} className="mx-auto text-red-500" />
            <p className="text-xs font-bold">{lookupError}</p>
          </div>
        ) : orderDetails ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* GRID OF DETAILS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* 1. ORDER DETAILS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <FileText className="text-amber-500" size={18} />
                  <span>Order Details</span>
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">PO Number:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{orderDetails.po_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Execution Ref:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{orderDetails.execution_ref_no || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Order Ref:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{orderDetails.order_ref_no || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Client Order No:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{orderDetails.client_order_no || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Client Name:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{orderDetails.client_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Pack Ref No:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{orderDetails.pack_ref_no || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5 items-center">
                    <span className="text-slate-400">Pack Status:</span>
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-900">
                      {orderDetails.pack_status || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Order Date:</span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{orderDetails.order_date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Processed At:</span>
                    <span className="font-mono text-[10px] text-slate-500">{formatDateDisplay(orderDetails.order_processed_date)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Created At:</span>
                    <span className="font-mono text-[10px] text-slate-500">{formatDateDisplay(orderDetails.execution_created_at)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">Flags:</span>
                    <div className="flex gap-1.5 font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Alt: {orderDetails.is_alternate || 'N'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Pre: {orderDetails.is_preorder || 'N'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Split: {orderDetails.is_split || 'N'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. CUSTOMER DETAILS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <User className="text-blue-500" size={18} />
                  <span>Customer Details</span>
                </div>
                <div className="space-y-3 text-xs font-medium">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Person to Deliver</span>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {orderDetails.person_to_deliver || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Mobile Number</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {orderDetails.mobile || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Email Address</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 break-all text-[11px]">
                      {orderDetails.email || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. SHIPPING ADDRESS DETAILS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <MapPin className="text-emerald-500" size={18} />
                  <span>Shipping Address Details</span>
                </div>
                <div className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <p className="font-semibold leading-relaxed">
                    {[
                      orderDetails.shipment_address_line1,
                      orderDetails.shipment_address_line2,
                      orderDetails.shipment_address_line3,
                      orderDetails.shipment_address_line4
                    ].filter(Boolean).join(', ') || 'No address lines'}
                  </p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ZIP Code:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{orderDetails.zip || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">City:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{orderDetails.city || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">State:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{orderDetails.state || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. PRODUCT DETAILS & SYSTEM IDENTIFIERS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Package className="text-indigo-500" size={18} />
                  <span>Product Details</span>
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Product Name</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                      {orderDetails.product_name || 'N/A'}
                    </p>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Brand:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{orderDetails.product_brand || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Product Code:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{orderDetails.product_code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Client Code:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{orderDetails.client_product_code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/40 pb-1.5">
                    <span className="text-slate-400">Order Qty / Pack Qty:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {orderDetails.order_qty ?? 0} / {orderDetails.pack_qty ?? 0}
                    </span>
                  </div>

                  {/* System Identifiers Sub-Block */}
                  <div className="pt-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1 font-mono text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans font-semibold">Execution ID:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{orderDetails.execution_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans font-semibold">Child Order ID:</span>
                      <span className="text-slate-700 dark:text-slate-300">{orderDetails.child_order_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans font-semibold">Parent Order ID:</span>
                      <span className="text-slate-700 dark:text-slate-300">{orderDetails.parent_order_id}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* =================================================================== */}
            {/* MANUAL COURIER ASSIGNMENT FORM */}
            {/* =================================================================== */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Assign Courier Partner Manually
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Target Execution ID: <strong className="text-amber-600 dark:text-amber-400 font-mono">{orderDetails.execution_id}</strong> ({orderDetails.execution_ref_no})
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleManualCourierSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Courier Code Input / Select (Populated from GET /courier/serviceable-pincodes) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Courier Code / Partner <span className="text-red-500">*</span>
                      </label>
                      {loadingServiceable && (
                        <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" /> Checking Pincode...
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedCourierCode}
                      onChange={(e) => {
                        const chosenCode = e.target.value;
                        setSelectedCourierCode(chosenCode);
                        
                        // Sync matching shipMode from the same API item
                        const matched = serviceableCouriers.find(
                          (sc) => (sc.serviceCode || sc.courierCode) === chosenCode
                        );
                        if (matched) {
                          const mode = matched.shipMode || matched.serviceType;
                          if (mode) setSelectedShipMode(mode);
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Select Service Code --</option>
                      {serviceableCouriers.map((sc: any, idx: number) => {
                        const codeVal = sc.serviceCode || sc.courierCode || `SERVICE_${sc.id || idx}`;
                        return (
                          <option key={sc.id || idx} value={codeVal}>
                            {codeVal}
                          </option>
                        );
                      })}
                      {serviceableCouriers.length === 0 && !loadingServiceable && (
                        <>
                          <option value="DLRY_SURFACE">DLRY_SURFACE</option>
                          <option value="DLRY_DP">DLRY_DP</option>
                          <option value="BLUEDART_EXPRESS">BLUEDART_EXPRESS</option>
                          <option value="EXPRESSBEES_SURFACE">EXPRESSBEES_SURFACE</option>
                          <option value="ECOM_EXPRESS">ECOM_EXPRESS</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Ship Mode Input / Select (Populated dynamically from GET /courier/serviceable-pincodes shipMode) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Ship Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedShipMode}
                      onChange={(e) => setSelectedShipMode(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    >
                      {Array.from(
                        new Set(
                          serviceableCouriers
                            .map((sc: any) => sc.shipMode || sc.serviceType)
                            .filter(Boolean)
                        )
                      ).map((mode: any) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                      {serviceableCouriers.length === 0 && (
                        <>
                          <option value="SURFACE">SURFACE</option>
                          <option value="DP">DP</option>
                          <option value="AIR">AIR</option>
                          <option value="EXPRESS">EXPRESS</option>
                          <option value="STANDARD">STANDARD</option>
                          <option value="SAME_DAY">SAME_DAY</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* AWB Number (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      AWB Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={awbNoInput}
                      onChange={(e) => setAwbNoInput(e.target.value)}
                      placeholder="Enter AWB Tracking Number if available..."
                      className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={submittingAssign}
                    className="h-11 px-8 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-amber-500/20 shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    {submittingAssign ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Truck size={18} />
                    )}
                    <span>Assign Courier Manually</span>
                  </button>
                </div>
              </form>

              {/* OPTION A LOADER ANIMATION MODAL WHEN SUBMITTING */}
              {submittingAssign && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Truck className="h-4 w-4 animate-bounce text-amber-500" />
                      Manual Courier Override Processing
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
                        <span className="text-amber-400">🏬</span> Execution #{orderDetails.execution_id}
                      </div>
                      <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                        <span className="text-emerald-400">⚡</span> Manual Courier Partner
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

            </div>

          </div>
        ) : null}

      </div>
  );
}
