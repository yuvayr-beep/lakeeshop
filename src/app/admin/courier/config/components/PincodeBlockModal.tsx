'use client';
import React, { useState } from 'react';
import { X, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner } from '@/types/courier';

interface PincodeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courier: CourierPartner | null;
}

export default function PincodeBlockModal({
  isOpen,
  onClose,
  onSuccess,
  courier,
}: PincodeBlockModalProps) {
  const [isBlockAction, setIsBlockAction] = useState<boolean>(true);
  const [shipMode, setShipMode] = useState<string>('SURFACE');
  const [pincodesText, setPincodesText] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pins = getPincodesArray();
    if (pins.length === 0) {
      toast.error('Please enter at least one valid 6-digit pincode.');
      return;
    }

    setSubmitting(true);
    const actionLabel = isBlockAction ? 'Blocking' : 'Unblocking';
    const toastId = toast.loading(`${actionLabel} ${pins.length} pincodes...`);

    const payload = {
      courierId: courier?.id || 0,
      shipMode: shipMode,
      pincodes: pins,
      remarks: remarks.trim() || (isBlockAction ? 'Bulk serviceability block' : 'Bulk serviceability unblock'),
      block: isBlockAction,
    };

    try {
      await axiosInstance.post('/courier/serviceable-pincodes/block-unblock', payload);
      toast.success(`Successfully ${isBlockAction ? 'blocked' : 'unblocked'} ${pins.length} pincodes!`, { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Block/Unblock failed:', err);
      const errMsg = err.response?.data?.message || `Failed to ${isBlockAction ? 'block' : 'unblock'} pincodes.`;
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const currentPins = getPincodesArray();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-8 flex flex-col">
        {/* Header */}
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
                Bulk Pincode {isBlockAction ? 'Block' : 'Unblock'} Control
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {courier?.courierName ? `Courier: ${courier.courierName} (${courier.courierCode})` : 'Temporary weather or operational pincode restrictions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Action Choice: Block vs Unblock */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Action Control Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsBlockAction(true)}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isBlockAction
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldAlert size={15} />
                Block Pincodes
              </button>

              <button
                type="button"
                onClick={() => setIsBlockAction(false)}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  !isBlockAction
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldCheck size={15} />
                Unblock Pincodes
              </button>
            </div>
          </div>

          {/* Ship Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Shipping Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={shipMode}
              onChange={(e) => setShipMode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="DP">DP</option>
              <option value="SURFACE">SURFACE</option>
              <option value="BOTH">BOTH</option>
            </select>
          </div>

          {/* Pincodes Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pincode List <span className="text-red-500">*</span>
              </label>
              {currentPins.length > 0 && (
                <span className="text-[11px] font-bold text-[var(--primary)]">
                  {currentPins.length} valid pin(s) detected
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={pincodesText}
              onChange={(e) => setPincodesText(e.target.value)}
              placeholder="Enter pincodes separated by comma, space, or new lines... (e.g. 110001, 110002, 400001, 600028)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Comma, space, or newline delimited 6-digit Indian PIN numbers</p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || currentPins.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50 ${
                isBlockAction ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {isBlockAction ? `Block ${currentPins.length} Pincodes` : `Unblock ${currentPins.length} Pincodes`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
