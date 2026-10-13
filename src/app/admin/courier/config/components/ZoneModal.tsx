'use client';
import React, { useState, useEffect } from 'react';
import { X, Layers, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierZone, CourierZoneFormData } from '@/types/courierZone';
import { CourierPartner } from '@/types/courier';

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courier: CourierPartner | null;
  zoneToEdit?: CourierZone | null;
}

const INITIAL_FORM: CourierZoneFormData = {
  shipMode: 'SURFACE',
  zoneCode: '',
  zoneName: '',
};

export default function ZoneModal({
  isOpen,
  onClose,
  onSuccess,
  courier,
  zoneToEdit,
}: ZoneModalProps) {
  const [formData, setFormData] = useState<CourierZoneFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (zoneToEdit) {
      setFormData({
        shipMode: zoneToEdit.shipMode || 'SURFACE',
        zoneCode: zoneToEdit.zoneCode || '',
        zoneName: zoneToEdit.zoneName || '',
      });
    } else {
      setFormData(INITIAL_FORM);
    }
  }, [zoneToEdit, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CourierZoneFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.shipMode) {
      toast.error('Please select a Ship Mode');
      return false;
    }
    if (!formData.zoneCode.trim()) {
      toast.error('Zone Code is required (e.g. ZONE_A, METRO)');
      return false;
    }
    if (!formData.zoneName.trim()) {
      toast.error('Zone Name is required (e.g. Within City / Local)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const targetCourierId = courier?.id || 1;

    setSubmitting(true);
    const toastId = toast.loading(zoneToEdit ? 'Updating Courier Zone...' : 'Creating Courier Zone...');

    const payload = {
      courierId: targetCourierId,
      shipMode: formData.shipMode.trim(),
      zoneCode: formData.zoneCode.trim(),
      zoneName: formData.zoneName.trim(),
    };

    try {
      if (zoneToEdit) {
        await axiosInstance.put(`/courier/zones/${zoneToEdit.id}`, payload);
        toast.success(`Zone ${payload.zoneCode} updated successfully!`, { id: toastId });
      } else {
        await axiosInstance.post('/courier/zones', payload);
        toast.success(`Zone ${payload.zoneCode} created successfully!`, { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save courier zone:', err);
      const errMsg = err.response?.data?.message || 'Failed to save courier zone details.';
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
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light-bg)] text-[var(--primary)] flex items-center justify-center font-bold">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {zoneToEdit ? `Edit Zone: ${zoneToEdit.zoneCode}` : 'Add Courier Zone'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {courier?.courierName ? `Courier: ${courier.courierName} (${courier.courierCode})` : 'Define shipping zone parameters'}
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

          {/* Zone Code Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Zone Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.zoneCode}
              onChange={(e) => handleInputChange('zoneCode', e.target.value.toUpperCase())}
              placeholder="e.g. ZONE_A, METRO, ROI"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">Unique code for zone identification</p>
          </div>

          {/* Zone Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Zone Name / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.zoneName}
              onChange={(e) => handleInputChange('zoneName', e.target.value)}
              placeholder="e.g. Within City / Local"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
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
              {zoneToEdit ? 'Save Changes' : 'Add Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
