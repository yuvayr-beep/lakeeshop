'use client';
import React, { useState, useEffect } from 'react';
import { X, Layers, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierService, CourierServiceFormData } from '@/types/courierService';
import { CourierPartner } from '@/types/courier';

interface CourierServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courier: CourierPartner | null;
  serviceToEdit?: CourierService | null;
}

const INITIAL_FORM: CourierServiceFormData = {
  courierId: 0,
  serviceCode: '',
  serviceName: '',
  serviceType: 'SURFACE',
  description: '',
  attributes: '',
};

export default function CourierServiceModal({
  isOpen,
  onClose,
  onSuccess,
  courier,
  serviceToEdit,
}: CourierServiceModalProps) {
  const [formData, setFormData] = useState<CourierServiceFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (serviceToEdit) {
      setFormData({
        courierId: serviceToEdit.courierId || courier?.id || 0,
        serviceCode: serviceToEdit.serviceCode || '',
        serviceName: serviceToEdit.serviceName || '',
        serviceType: serviceToEdit.serviceType || 'SURFACE',
        description: serviceToEdit.description || '',
        attributes: serviceToEdit.attributes || '',
      });
    } else {
      setFormData({
        ...INITIAL_FORM,
        courierId: courier?.id || 0,
      });
    }
  }, [serviceToEdit, courier, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CourierServiceFormData, value: any) => {
    if (field === 'serviceCode') {
      value = String(value).toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serviceCode.trim()) {
      toast.error('Service Code is required');
      return;
    }

    if (!formData.serviceName.trim()) {
      toast.error('Service Name is required');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(serviceToEdit ? 'Updating Courier Service...' : 'Creating Courier Service...');

    const payload = {
      ...formData,
      courierId: courier?.id || formData.courierId,
    };

    try {
      if (serviceToEdit) {
        await axiosInstance.put(`/courier/services/${serviceToEdit.id}`, payload);
        toast.success('Courier Service updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/courier/services', payload);
        toast.success('Courier Service created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save service:', err);
      const errMsg = err.response?.data?.message || 'Failed to save courier service.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light-bg)] text-[var(--primary)] flex items-center justify-center font-bold">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {serviceToEdit ? `Edit Service: ${serviceToEdit.serviceName}` : 'Create Courier Service'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {courier?.courierName ? `Carrier: ${courier.courierName} (${courier.courierCode})` : 'Configure shipping mode and operational service attributes'}
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
          {/* Courier Name (Read-only) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Courier Partner
            </label>
            <input
              type="text"
              readOnly
              value={`${courier?.courierName || 'Courier Partner'} (${courier?.courierCode || 'ID: ' + formData.courierId})`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-not-allowed"
            />
          </div>

          {/* Service Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Service Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.serviceCode}
              onChange={(e) => handleInputChange('serviceCode', e.target.value)}
              placeholder="e.g. DLRY_SURFACE or BLUEDART_AIR"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.serviceName}
              onChange={(e) => handleInputChange('serviceName', e.target.value)}
              placeholder="e.g. Delhivery Surface Express"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          {/* Service Type Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.serviceType}
              onChange={(e) => handleInputChange('serviceType', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            >
              <option value="SURFACE">SURFACE</option>
              <option value="DP">DP (Direct Air/Prepaid)</option>
              <option value="BOTH">BOTH (Surface & Air)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Operational description or dispatch instructions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
          </div>

          {/* Attributes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Attributes
            </label>
            <input
              type="text"
              value={formData.attributes}
              onChange={(e) => handleInputChange('attributes', e.target.value)}
              placeholder="Custom attributes or configuration string"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Buttons */}
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
              {serviceToEdit ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
