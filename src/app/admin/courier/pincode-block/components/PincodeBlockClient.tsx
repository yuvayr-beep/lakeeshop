'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Truck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ListFilter
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner } from '@/types/courier';

interface OperationResult {
  type: 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  details?: {
    action: string;
    courierName: string;
    shipMode: string;
    pincodeCount: number;
    samplePincodes: string;
    remarks: string;
  };
}

export default function PincodeBlockClient() {
  const router = useRouter();

  // Master Data States
  const [couriers, setCouriers] = useState<CourierPartner[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState<boolean>(true);

  // Form States
  const [isBlockAction, setIsBlockAction] = useState<boolean>(true);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [shipMode, setShipMode] = useState<string>('SURFACE');
  const [pincodesText, setPincodesText] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Result Message State
  const [lastResult, setLastResult] = useState<OperationResult | null>(null);

  // Helper parser for NDJSON or JSON response format
  const parseNdjson = useCallback((raw: any): any[] => {
    if (typeof raw === 'string') {
      const parsed: any[] = [];
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            parsed.push(JSON.parse(trimmed));
          } catch (e) {
            console.error('Error parsing NDJSON line:', trimmed, e);
          }
        }
      });
      return parsed;
    }
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.data)) return raw.data;
      if (raw.data && typeof raw.data === 'object') return [raw.data];
    }
    return [];
  }, []);

  // Fetch Couriers on Mount
  const fetchMasterData = useCallback(async () => {
    setLoadingMasterData(true);
    try {
      const courierRes = await axiosInstance.get('/courier', {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson' },
      });

      const parsedCouriers = parseNdjson(courierRes.data).sort((a, b) =>
        (a.courierName || '').localeCompare(b.courierName || '', undefined, { sensitivity: 'base' })
      );
      setCouriers(parsedCouriers);
    } catch (err) {
      console.error('Error fetching couriers:', err);
      toast.error('Failed to load courier partners');
    } finally {
      setLoadingMasterData(false);
    }
  }, [parseNdjson]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Extract unique 6-digit PIN numbers from textarea
  const getPincodesArray = (): string[] => {
    return Array.from(
      new Set(
        pincodesText
          .split(/[\s,;\n]+/)
          .map((p) => p.trim().replace(/\D/g, ''))
          .filter((p) => p.length === 6)
      )
    );
  };

  const currentPins = getPincodesArray();

  const handleReset = () => {
    setPincodesText('');
    setRemarks('');
    setSelectedCourierId('');
    setShipMode('SURFACE');
    setIsBlockAction(true);
    setLastResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pins = getPincodesArray();
    if (pins.length === 0) {
      toast.error('Please enter at least one valid 6-digit pincode.');
      return;
    }

    setSubmitting(true);
    setLastResult(null);

    const actionLabel = isBlockAction ? 'Blocking' : 'Unblocking';
    const toastId = toast.loading(`${actionLabel} ${pins.length} pincodes...`);

    const selectedCourierObj = couriers.find((c) => String(c.id) === selectedCourierId);

    const courierNameText = selectedCourierObj
      ? `${selectedCourierObj.courierName} (${selectedCourierObj.courierCode})`
      : selectedCourierId
      ? `Courier ID #${selectedCourierId}`
      : 'All Courier Partners';

    const defaultRemark = isBlockAction ? 'Bulk serviceability block' : 'Bulk serviceability unblock';
    const finalRemark = remarks.trim() || defaultRemark;

    const payload = {
      courierId: selectedCourierId ? Number(selectedCourierId) : 0,
      shipMode: shipMode,
      pincodes: pins,
      remarks: finalRemark,
      block: isBlockAction,
    };

    try {
      await axiosInstance.post('/courier/serviceable-pincodes/block-unblock', payload);

      const successMsg = `Successfully ${isBlockAction ? 'blocked' : 'unblocked'} ${pins.length} pincode(s)!`;
      toast.success(successMsg, { id: toastId });

      setLastResult({
        type: 'success',
        title: `Pincodes ${isBlockAction ? 'Blocked' : 'Unblocked'} Successfully`,
        message: successMsg,
        timestamp: new Date().toLocaleString(),
        details: {
          action: isBlockAction ? 'BLOCK' : 'UNBLOCK',
          courierName: courierNameText,
          shipMode: shipMode,
          pincodeCount: pins.length,
          samplePincodes: pins.slice(0, 10).join(', ') + (pins.length > 10 ? ` ... (+${pins.length - 10} more)` : ''),
          remarks: finalRemark,
        },
      });

      // Clear pincodes textarea after success
      setPincodesText('');
    } catch (err: any) {
      console.error('Block/Unblock API error:', err);
      const errMsg = err.response?.data?.message || `Failed to ${isBlockAction ? 'block' : 'unblock'} pincodes.`;
      toast.error(errMsg, { id: toastId });

      setLastResult({
        type: 'error',
        title: `Failed to ${isBlockAction ? 'Block' : 'Unblock'} Pincodes`,
        message: errMsg,
        timestamp: new Date().toLocaleString(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Main Form Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Card Title Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                isBlockAction
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
              }`}
            >
              {isBlockAction ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                Bulk Serviceability {isBlockAction ? 'Block' : 'Unblock'} Form
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors shadow-sm"
          >
            <RotateCcw size={14} />
            Reset Form
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Action Control Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Action Control Mode <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <button
                type="button"
                onClick={() => setIsBlockAction(true)}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isBlockAction
                    ? 'bg-red-600 text-white shadow-md ring-2 ring-red-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <ShieldAlert size={16} />
                Block Pincodes
              </button>

              <button
                type="button"
                onClick={() => setIsBlockAction(false)}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  !isBlockAction
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <ShieldCheck size={16} />
                Unblock Pincodes
              </button>
            </div>
          </div>

          {/* Selection Dropdowns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Courier Selection Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Truck size={14} className="text-slate-400" />
                Courier Partner
              </label>
              <div className="relative">
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  disabled={loadingMasterData}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60"
                >
                  <option value="">-- All Courier Partners --</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courierName} ({c.courierCode})
                    </option>
                  ))}
                </select>
                {loadingMasterData && (
                  <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-slate-400" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Select specific courier partner or leave all</p>
            </div>

            {/* Shipping Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ListFilter size={14} className="text-slate-400" />
                Shipping Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={shipMode}
                onChange={(e) => setShipMode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="SURFACE">SURFACE</option>
                <option value="DP">DP</option>
                <option value="BOTH">BOTH</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Target logistics transport mode</p>
            </div>
          </div>

          {/* Pincodes Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pincode List <span className="text-red-500">*</span>
              </label>
              {currentPins.length > 0 && (
                <span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary-light-bg)] px-2.5 py-0.5 rounded-full">
                  {currentPins.length} valid 6-digit pin(s) detected
                </span>
              )}
            </div>
            <textarea
              rows={5}
              value={pincodesText}
              onChange={(e) => setPincodesText(e.target.value)}
              placeholder="Enter pincodes separated by comma, space, or new lines... (e.g. 110001, 110002, 400001, 600028)"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Supports space, comma, semicolon, or newline delimited 6-digit Indian PIN codes
            </p>
          </div>

          {/* Operational Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Operational Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Temporary flooding block, Festive backlog restriction..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Action Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Restrict or restore courier serviceability for specific pincodes and courier partners
            </p>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || currentPins.length === 0}
                className={`flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50 ${
                  isBlockAction ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isBlockAction ? (
                  <ShieldAlert size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {isBlockAction
                  ? `Block ${currentPins.length > 0 ? currentPins.length : ''} Pincodes`
                  : `Unblock ${currentPins.length > 0 ? currentPins.length : ''} Pincodes`}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Persistent Status Message Card (rendered when operation is performed) */}
      {lastResult && (
        <div
          className={`rounded-3xl p-6 border shadow-lg transition-all ${
            lastResult.type === 'success'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/60'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                lastResult.type === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
              }`}
            >
              {lastResult.type === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3
                  className={`text-sm font-bold ${
                    lastResult.type === 'success'
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-red-900 dark:text-red-200'
                  }`}
                >
                  {lastResult.title}
                </h3>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {lastResult.timestamp}
                </span>
              </div>

              <p
                className={`text-xs font-medium ${
                  lastResult.type === 'success'
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : 'text-red-800 dark:text-red-300'
                }`}
              >
                {lastResult.message}
              </p>

              {lastResult.details && (
                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 space-y-2 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Action</span>
                      <span
                        className={`font-bold ${
                          lastResult.details.action === 'BLOCK' ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {lastResult.details.action}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Courier</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lastResult.details.courierName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Ship Mode</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lastResult.details.shipMode}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Sample Pincodes ({lastResult.details.pincodeCount} total)
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                      {lastResult.details.samplePincodes}
                    </span>
                  </div>

                  {lastResult.details.remarks && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Remarks</span>
                      <span className="text-slate-700 dark:text-slate-300 italic text-[11px]">
                        "{lastResult.details.remarks}"
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
