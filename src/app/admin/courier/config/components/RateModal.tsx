'use client';
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierRate, CourierRateFormData } from '@/types/courierRate';
import { CourierZone } from '@/types/courierZone';
import { CourierPartner } from '@/types/courier';

interface RateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courier: CourierPartner | null;
  zones: CourierZone[];
  rateToEdit?: CourierRate | null;
}

const INITIAL_FORM: CourierRateFormData = {
  shipMode: 'SURFACE',
  zoneId: '',
  slabStart: '',
  slabEnd: '',
  rate: '',
};

export default function RateModal({
  isOpen,
  onClose,
  onSuccess,
  courier,
  zones,
  rateToEdit,
}: RateModalProps) {
  const [formData, setFormData] = useState<CourierRateFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (rateToEdit) {
      setFormData({
        shipMode: rateToEdit.shipMode || 'SURFACE',
        zoneId: rateToEdit.zoneId || (zones[0]?.id ?? ''),
        slabStart: rateToEdit.slabStart ?? 0,
        slabEnd: rateToEdit.slabEnd ?? 0,
        rate: rateToEdit.rate ?? 0,
      });
    } else {
      setFormData({
        ...INITIAL_FORM,
        zoneId: zones[0]?.id || '',
      });
    }
  }, [rateToEdit, zones, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CourierRateFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.shipMode) {
      toast.error('Please select a Ship Mode');
      return false;
    }
    if (!formData.zoneId) {
      toast.error('Please select a Courier Zone');
      return false;
    }
    if (formData.slabStart === '' || Number(formData.slabStart) < 0) {
      toast.error('Please enter a valid Slab Start weight');
      return false;
    }
    if (formData.slabEnd === '' || Number(formData.slabEnd) <= Number(formData.slabStart)) {
      toast.error('Slab End weight must be greater than Slab Start weight');
      return false;
    }
    if (formData.rate === '' || Number(formData.rate) < 0) {
      toast.error('Please enter a valid shipping Rate (₹)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const targetCourierId = courier?.id || 1;

    setSubmitting(true);
    const toastId = toast.loading(rateToEdit ? 'Updating Rate Card Slab...' : 'Creating Rate Card Slab...');

    const payload = {
      courierId: targetCourierId,
      shipMode: formData.shipMode.trim(),
      zoneId: Number(formData.zoneId),
      slabStart: Number(formData.slabStart),
      slabEnd: Number(formData.slabEnd),
      rate: Number(formData.rate),
    };

    try {
      if (rateToEdit) {
        await axiosInstance.put(`/courier/rates/${rateToEdit.id}`, payload);
        toast.success(`Rate slab (${payload.slabStart}-${payload.slabEnd} kg) updated successfully!`, { id: toastId });
      } else {
        await axiosInstance.post('/courier/rates', payload);
        toast.success(`Rate slab (${payload.slabStart}-${payload.slabEnd} kg) created successfully!`, { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save rate slab:', err);
      const errMsg = err.response?.data?.message || 'Failed to save courier rate slab.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-8 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {rateToEdit ? `Edit Rate Slab #${rateToEdit.id}` : 'Add Courier Rate Slab'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {courier?.courierName ? `Courier: ${courier.courierName} (${courier.courierCode})` : 'Configure shipping rate card slab'}
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
          {/* Ship Mode Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ship Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.shipMode}
              onChange={(e) => handleInputChange('shipMode', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            >
              <option value="SURFACE">SURFACE</option>
              <option value="DP">DP</option>
              <option value="BOTH">BOTH</option>
            </select>
          </div>

          {/* Zone Selector Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Courier Zone <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.zoneId}
              onChange={(e) => handleInputChange('zoneId', Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            >
              <option value="">Select Delivery Zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.zoneCode} - {z.zoneName} ({z.shipMode})
                </option>
              ))}
            </select>
            {zones.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">Warning: No zones found. Please add a Courier Zone first.</p>
            )}
          </div>

          {/* Weight Slab Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Slab Start Weight (Kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.slabStart}
                onChange={(e) => handleInputChange('slabStart', e.target.value)}
                placeholder="e.g. 0.0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Slab End Weight (Kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.slabEnd}
                onChange={(e) => handleInputChange('slabEnd', e.target.value)}
                placeholder="e.g. 0.5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>
          </div>

          {/* Rate Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Rate Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => handleInputChange('rate', e.target.value)}
                placeholder="e.g. 35.00"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Shipping charge for packages within this weight slab</p>
          </div>

          {/* Form Actions */}
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
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {rateToEdit ? 'Save Changes' : 'Add Rate Slab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
