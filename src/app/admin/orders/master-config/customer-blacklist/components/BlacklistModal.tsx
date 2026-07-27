'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, ShieldAlert, Check } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

export interface BlacklistCustomer {
  id: number;
  mobile: string;
  alternateMobile?: string | null;
  email?: string | null;
  reason?: string | null;
  isActive: boolean;
  createdBy?: number;
  updatedBy?: number;
  createdByName?: string | null;
  updatedByName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface BlacklistModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: BlacklistCustomer | null; // If passed, modal is in Edit mode
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BlacklistModal({ open, onClose, onSuccess, customer }: BlacklistModalProps) {
  const isEdit = !!customer;

  // Form Fields
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Set initial form values when opening modal
  useEffect(() => {
    if (open) {
      if (customer) {
        setMobile(customer.mobile || '');
        setAlternateMobile(customer.alternateMobile || '');
        setEmail(customer.email || '');
        setReason(customer.reason || '');
        setIsActive(customer.isActive !== false);
      } else {
        setMobile('');
        setAlternateMobile('');
        setEmail('');
        setReason('');
        setIsActive(true);
      }
    }
  }, [open, customer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = mobile.trim();
    if (!cleanMobile) {
      toast.error('Mobile Number is required');
      return;
    }
    if (cleanMobile.length < 10) {
      toast.error('Please enter a valid 10-digit Mobile Number');
      return;
    }

    const cleanAltMobile = alternateMobile.trim();
    if (cleanAltMobile && cleanAltMobile.length < 10) {
      toast.error('Please enter a valid 10-digit Alternate Mobile Number');
      return;
    }

    const cleanEmail = email.trim();
    if (cleanEmail && !emailRegex.test(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating blacklist entry...' : 'Creating blacklist entry...');

    const payload = {
      mobile: cleanMobile,
      alternateMobile: cleanAltMobile || null,
      email: cleanEmail || null,
      reason: reason.trim() || null,
      isActive: isActive,
    };

    try {
      if (isEdit && customer) {
        await axiosInstance.put(`/order/customer-blacklist/${customer.id}`, payload);
        toast.success('Blacklist entry updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/order/customer-blacklist', payload);
        toast.success('Blacklist entry created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save Blacklist error:', err);
      const errMsg = err.response?.data?.message || err.message || 'An error occurred. Please try again.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-850 dark:text-white">
                {isEdit ? 'Edit Customer Blacklist Entry' : 'Add Customer to Blacklist'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update blacklisted customer details' : 'Block fraudulent or flagged customer profiles'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          
          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Mobile Number <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Primary contact</span>
            </label>
            <input
              type="text"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 8667757660"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              required
            />
          </div>

          {/* Alternate Mobile Number */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Alternate Mobile Number <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              maxLength={10}
              value={alternateMobile}
              onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 8667757660"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Email Address <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Blacklist Reason / Notes
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context or reason for blacklisting this customer..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
            />
          </div>

          {/* Status Toggle Button (Yes = true, No = false) */}
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 dark:text-white text-xs block">Blacklist Status</span>
                <span className="text-[11px] text-slate-500">
                  {isActive ? 'Customer is actively blacklisted' : 'Customer is whitelisted (inactive)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isActive && <Check size={13} />}
                  <span>Yes (Active)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    !isActive
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {!isActive && <Check size={13} />}
                  <span>No (Inactive)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 hover:scale-[1.01]"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{isEdit ? 'Update Blacklist' : 'Save Blacklist'}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
