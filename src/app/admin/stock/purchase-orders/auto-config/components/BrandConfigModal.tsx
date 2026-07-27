'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Brand {
  brandId: number;
  brandName: string;
}

interface BrandConfig {
  id?: number;
  brandId: number | null;
  algorithmType: 'LEGACY' | 'STOCK_VELOCITY';
  historicalDays: number;
  recentDays: number;
  maxStockDays: number;
  safetyBufferDays: number;
  scheduledTime1: string;
  scheduledTime2: string;
  pipelineExpiryDays: number;
}

interface BrandConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config?: BrandConfig | null; // If passed, modal is in Edit mode
  brands: Brand[];
}

export default function BrandConfigModal({ open, onClose, onSuccess, config, brands }: BrandConfigModalProps) {
  const isEdit = !!config;

  // Form Fields
  const [brandId, setBrandId] = useState<number | null>(null);
  const [algorithmType, setAlgorithmType] = useState<'LEGACY' | 'STOCK_VELOCITY'>('LEGACY');
  const [historicalDays, setHistoricalDays] = useState(10);
  const [recentDays, setRecentDays] = useState(3);
  const [maxStockDays, setMaxStockDays] = useState(15);
  const [safetyBufferDays, setSafetyBufferDays] = useState(2);
  const [scheduledTime1, setScheduledTime1] = useState('10:00');
  const [scheduledTime2, setScheduledTime2] = useState('17:00');
  const [pipelineExpiryDays, setPipelineExpiryDays] = useState(30);
  const [saving, setSaving] = useState(false);

  // Set initial form states
  useEffect(() => {
    if (open) {
      if (config) {
        setBrandId(config.brandId);
        setAlgorithmType(config.algorithmType);
        setHistoricalDays(config.historicalDays);
        setRecentDays(config.recentDays);
        setMaxStockDays(config.maxStockDays);
        setSafetyBufferDays(config.safetyBufferDays);
        setScheduledTime1(config.scheduledTime1 || '10:00');
        setScheduledTime2(config.scheduledTime2 || '17:00');
        setPipelineExpiryDays(config.pipelineExpiryDays);
      } else {
        setBrandId(null);
        setAlgorithmType('LEGACY');
        setHistoricalDays(10);
        setRecentDays(3);
        setMaxStockDays(15);
        setSafetyBufferDays(2);
        setScheduledTime1('10:00');
        setScheduledTime2('17:00');
        setPipelineExpiryDays(30);
      }
    }
  }, [open, config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating configuration...' : 'Creating configuration...');

    const payload = {
      brandId: brandId,
      algorithmType,
      historicalDays: Number(historicalDays),
      recentDays: Number(recentDays),
      maxStockDays: Number(maxStockDays),
      safetyBufferDays: Number(safetyBufferDays),
      scheduledTime1,
      scheduledTime2,
      pipelineExpiryDays: Number(pipelineExpiryDays),
    };

    try {
      if (isEdit && config?.id) {
        await axiosInstance.put(`/stock/auto-po/config/${config.id}`, payload);
        toast.success('Configuration updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/stock/auto-po/config', payload);
        toast.success('Configuration created successfully!', { id: toastId });
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
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {isEdit ? 'Edit Brand Auto-PO Config' : 'Create Brand Auto-PO Config'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? `Modifying Config ID: ${config?.id}` : 'Add a new brand replenishment parameter override'}
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
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Brand */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
              Brand <span className="text-red-500">*</span>
            </label>
            <select
              value={brandId === null ? 'null' : brandId}
              onChange={(e) => {
                const val = e.target.value;
                setBrandId(val === 'null' ? null : Number(val));
              }}
              disabled={isEdit}
              className="w-full h-10 px-3 text-sm bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium disabled:opacity-75"
            >
              <option value="null">Global Default (Null)</option>
              {brands.map((b) => (
                <option key={`brand-opt-${b.brandId}`} value={b.brandId}>
                  {b.brandName}
                </option>
              ))}
            </select>
          </div>

          {/* Algorithm Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
              Algorithm Type <span className="text-red-500">*</span>
            </label>
            <select
              value={algorithmType}
              onChange={(e) => setAlgorithmType(e.target.value as 'LEGACY' | 'STOCK_VELOCITY')}
              className="w-full h-10 px-3 text-sm bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="LEGACY">LEGACY (Absolute Demand Formula)</option>
              <option value="STOCK_VELOCITY">STOCK_VELOCITY (Stock Velocity Formula)</option>
            </select>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Historical Days
              </label>
              <input
                type="number"
                value={historicalDays}
                onChange={(e) => setHistoricalDays(Number(e.target.value))}
                min={0}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Recent Days
              </label>
              <input
                type="number"
                value={recentDays}
                onChange={(e) => setRecentDays(Number(e.target.value))}
                min={0}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Max Stock Days
              </label>
              <input
                type="number"
                value={maxStockDays}
                onChange={(e) => setMaxStockDays(Number(e.target.value))}
                min={0}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Safety Buffer Days
              </label>
              <input
                type="number"
                value={safetyBufferDays}
                onChange={(e) => setSafetyBufferDays(Number(e.target.value))}
                min={0}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          {/* Schedule times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Schedule Time 1
              </label>
              <input
                type="time"
                value={scheduledTime1}
                onChange={(e) => setScheduledTime1(e.target.value)}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Schedule Time 2
              </label>
              <input
                type="time"
                value={scheduledTime2}
                onChange={(e) => setScheduledTime2(e.target.value)}
                required
                className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          {/* Pipeline Expiry */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
              Pipeline Expiry Days
            </label>
            <input
              type="number"
              value={pipelineExpiryDays}
              onChange={(e) => setPipelineExpiryDays(Number(e.target.value))}
              min={0}
              required
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-350 disabled:opacity-50"
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
            {isEdit ? 'Update Config' : 'Save Config'}
          </button>
        </div>

      </div>
    </div>
  );
}
