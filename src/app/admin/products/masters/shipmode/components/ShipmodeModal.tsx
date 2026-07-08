'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface ShipmodeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShipmodeModal({ open, onClose, onSuccess }: ShipmodeModalProps) {
  const [modeCode, setModeCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setModeCode('');
      setDisplayName('');
      setDescription('');
    }
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modeCode.trim()) {
      toast.error('Mode Code is required');
      return;
    }
    if (!displayName.trim()) {
      toast.error('Display Name is required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Creating shipment mode...');

    const payload = {
      modeCode: modeCode.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '_'),
      displayName: displayName.trim(),
      description: description.trim() || null,
    };

    try {
      await axiosInstance.post('/prod/shipment-modes', payload);
      toast.success('Shipment mode created successfully!', { id: toastId });
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
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

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
                Create Shipment Mode
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Register a new product shipment mode master record
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
                const autoCode = name.toUpperCase().replace(/[^A-Z0-9_-]+/g, '_');
                setModeCode(autoCode);
              }}
              placeholder="e.g. Surface, Air Cargo"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-955/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* Mode Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mode Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modeCode}
              onChange={(e) => setModeCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]+/g, '_'))}
              placeholder="e.g. SYSTEM"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-955/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shipment weight limits and characteristics..."
              rows={3}
              className="w-full px-3.5 py-2 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-955/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium resize-none"
            />
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
            Save Shipment Mode
          </button>
        </div>

      </div>
    </div>
  );
}
