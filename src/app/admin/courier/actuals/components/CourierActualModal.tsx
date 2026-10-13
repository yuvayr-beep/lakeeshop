'use client';
import React, { useState, useEffect } from 'react';
import { X, Truck, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierActual, CourierActualFormData } from '@/types/courierActual';
import { CourierPartner } from '@/types/courier';

interface CourierActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  couriers: CourierPartner[];
  actualToEdit?: CourierActual | null;
}

const INITIAL_FORM: CourierActualFormData = {
  courierCode: '',
  awbNumber: '',
  billedWeight: '',
  actualCost: '',
};

export default function CourierActualModal({
  isOpen,
  onClose,
  onSuccess,
  couriers,
  actualToEdit,
}: CourierActualModalProps) {
  const [formData, setFormData] = useState<CourierActualFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (actualToEdit) {
      setFormData({
        courierCode: actualToEdit.courierCode || (couriers[0]?.courierCode ?? ''),
        awbNumber: actualToEdit.awbNumber || '',
        billedWeight: actualToEdit.billedWeight ?? '',
        actualCost: actualToEdit.actualCost ?? '',
      });
    } else {
      setFormData({
        ...INITIAL_FORM,
        courierCode: couriers[0]?.courierCode || '',
      });
    }
  }, [actualToEdit, couriers, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CourierActualFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.courierCode) {
      toast.error('Please select a Courier Partner');
      return false;
    }
    if (!formData.awbNumber.trim()) {
      toast.error('AWB Number is required');
      return false;
    }
    if (formData.billedWeight === '' || Number(formData.billedWeight) < 0) {
      toast.error('Please enter a valid Billed Weight (kg)');
      return false;
    }
    if (formData.actualCost === '' || Number(formData.actualCost) < 0) {
      toast.error('Please enter a valid Actual Cost (₹)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const toastId = toast.loading(actualToEdit ? 'Updating Courier Actual...' : 'Creating Courier Actual...');

    const payload = {
      courierCode: formData.courierCode.trim(),
      awbNumber: formData.awbNumber.trim(),
      billedWeight: Number(formData.billedWeight),
      actualCost: Number(formData.actualCost),
    };

    try {
      if (actualToEdit) {
        await axiosInstance.put(`/courier/actuals/${actualToEdit.id}`, payload);
        toast.success(`Actual entry for AWB ${payload.awbNumber} updated successfully!`, { id: toastId });
      } else {
        await axiosInstance.post('/courier/actuals', payload);
        toast.success(`Actual entry for AWB ${payload.awbNumber} created successfully!`, { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save courier actual:', err);
      const errMsg = err.response?.data?.message || 'Failed to save courier actual details.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden my-8 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center font-bold">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {actualToEdit ? `Edit Actual entry #${actualToEdit.id}` : 'Add Courier Actual Record'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record actual weight and billed shipping cost
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
          {/* Courier Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Courier Partner <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.courierCode}
              onChange={(e) => handleInputChange('courierCode', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Courier Partner</option>
              {couriers.map((c) => (
                <option key={c.id || c.courierCode} value={c.courierCode}>
                  {c.courierName} ({c.courierCode})
                </option>
              ))}
            </select>
          </div>

          {/* AWB Number Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              AWB Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.awbNumber}
              onChange={(e) => handleInputChange('awbNumber', e.target.value.trim())}
              placeholder="e.g. 8778878778"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Billed Weight Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Billed Weight (Kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={formData.billedWeight}
              onChange={(e) => handleInputChange('billedWeight', e.target.value)}
              placeholder="e.g. 0.65"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Actual Cost Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Actual Cost (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.actualCost}
                onChange={(e) => handleInputChange('actualCost', e.target.value)}
                placeholder="e.g. 45.00"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:opacity-95 disabled:opacity-50"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {actualToEdit ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
