'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface PriceType {
  priceTypeId: number;
  code: string;
  displayName: string;
  priority: number;
  isOverride: boolean;
  status: boolean;
}

interface PriceTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceType?: PriceType | null; // If provided, we are in Edit mode
}

export default function PriceTypeModal({ open, onClose, onSuccess, priceType }: PriceTypeModalProps) {
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [isOverride, setIsOverride] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const isEdit = !!priceType;

  useEffect(() => {
    if (open) {
      if (priceType) {
        setCode(priceType.code);
        setDisplayName(priceType.displayName);
        setPriority(priceType.priority);
        setIsOverride(priceType.isOverride);
      } else {
        setCode('');
        setDisplayName('');
        setPriority(1);
        setIsOverride(true);
      }
    }
  }, [open, priceType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Price Type Code is required');
      return;
    }
    if (!displayName.trim()) {
      toast.error('Display Name is required');
      return;
    }

    setSaving(true);
    const modeText = isEdit ? 'updating' : 'creating';
    const toastId = toast.loading(`${modeText.charAt(0).toUpperCase() + modeText.slice(1)} price type...`);

    const payload = {
      code: code.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '_'),
      displayName: displayName.trim(),
      priority: Number(priority),
      isOverride: Boolean(isOverride),
    };

    try {
      if (isEdit && priceType) {
        await axiosInstance.put(`/prod/price-types/${priceType.priceTypeId}`, payload, {
          headers: {
            'X-User': '0'
          }
        });
        toast.success('Price type updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/prod/price-types', payload, {
          headers: {
            'X-User': '0'
          }
        });
        toast.success('Price type created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'An error occurred. Please try again.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-955/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {isEdit ? 'Edit Price Type' : 'Create Price Type'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? 'Update details of the price type record' : 'Register a new product price type master record'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => {
                const name = e.target.value;
                setDisplayName(name);
                if (!isEdit) {
                  const autoCode = name.toUpperCase().replace(/[^A-Z0-9_-]+/g, '_');
                  setCode(autoCode);
                }
              }}
              placeholder="e.g. Regular Price, Special Price"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-955/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Price Type Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]+/g, '_'))}
              placeholder="e.g. PTY1"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-955/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-950/50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Priority <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              placeholder="e.g. 1"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-955/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* isOverride */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isOverride"
              checked={isOverride}
              onChange={(e) => setIsOverride(e.target.checked)}
              className="w-4.5 h-4.5 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 focus:ring-2 bg-slate-100 dark:bg-slate-800"
            />
            <label htmlFor="isOverride" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              Is Override Enabled
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-705 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-655 dark:text-slate-355 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isEdit ? 'Update Price Type' : 'Save Price Type'}
          </button>
        </div>

      </div>
    </div>
  );
}
