'use client';
import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Check } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { ServiceablePincode, ServiceablePincodeFormData } from '@/types/courierPincode';
import { CourierPartner } from '@/types/courier';
import { CourierService } from '@/types/courierService';

interface PincodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courier: CourierPartner | null;
  services: CourierService[];
  pincodeToEdit?: ServiceablePincode | null;
}

const INITIAL_FORM: ServiceablePincodeFormData = {
  courierServiceId: '',
  pincode: '',
  codAvailable: false,
  prepaidAvailable: true,
  expectedDeliveryDays: 3,
  active: true,
};

export default function PincodeModal({
  isOpen,
  onClose,
  onSuccess,
  courier,
  services,
  pincodeToEdit,
}: PincodeModalProps) {
  const [formData, setFormData] = useState<ServiceablePincodeFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (pincodeToEdit) {
      setFormData({
        courierServiceId: pincodeToEdit.courierServiceId || (services[0]?.id ?? ''),
        pincode: pincodeToEdit.pincode || '',
        codAvailable: pincodeToEdit.codAvailable ?? false,
        prepaidAvailable: pincodeToEdit.prepaidAvailable ?? true,
        expectedDeliveryDays: pincodeToEdit.expectedDeliveryDays ?? 3,
        active: pincodeToEdit.active ?? true,
      });
    } else {
      setFormData({
        ...INITIAL_FORM,
        courierServiceId: services[0]?.id || '',
      });
    }
  }, [pincodeToEdit, services, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof ServiceablePincodeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.courierServiceId) {
      toast.error('Please select a Courier Service');
      return false;
    }
    const cleanPin = formData.pincode.trim();
    if (!cleanPin) {
      toast.error('Pincode is required');
      return false;
    }
    if (!/^\d{6}$/.test(cleanPin)) {
      toast.error('Please enter a valid 6-digit numeric Pincode (e.g. 600028)');
      return false;
    }
    if (formData.expectedDeliveryDays === '' || Number(formData.expectedDeliveryDays) < 0) {
      toast.error('Please specify valid Expected Delivery Days');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const toastId = toast.loading(pincodeToEdit ? 'Updating Pincode Mapping...' : 'Adding Pincode Mapping...');

    const payload = {
      courierServiceId: Number(formData.courierServiceId),
      pincode: formData.pincode.trim(),
      codAvailable: Boolean(formData.codAvailable),
      prepaidAvailable: Boolean(formData.prepaidAvailable),
      expectedDeliveryDays: Number(formData.expectedDeliveryDays) || 3,
      active: Boolean(formData.active),
    };

    try {
      if (pincodeToEdit) {
        await axiosInstance.put(`/courier/serviceable-pincodes/${pincodeToEdit.id}`, payload);
        toast.success(`Pincode ${payload.pincode} updated successfully!`, { id: toastId });
      } else {
        await axiosInstance.post('/courier/serviceable-pincodes', payload);
        toast.success(`Pincode ${payload.pincode} created successfully!`, { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save pincode:', err);
      const errMsg = err.response?.data?.message || 'Failed to save pincode serviceability.';
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
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light-bg)] text-[var(--primary)] flex items-center justify-center font-bold">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {pincodeToEdit ? `Edit Pincode: ${pincodeToEdit.pincode}` : 'Add Serviceable Pincode'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {courier?.courierName ? `Courier: ${courier.courierName} (${courier.courierCode})` : 'Configure geographic delivery parameters'}
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
          {/* Courier Service Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Courier Service <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.courierServiceId}
              onChange={(e) => handleInputChange('courierServiceId', Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            >
              <option value="">Select Service Mode</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serviceName} ({s.serviceCode} - {s.serviceType})
                </option>
              ))}
            </select>
            {services.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">Warning: No courier services configured. Please setup a service mode first.</p>
            )}
          </div>

          {/* Pincode Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pincode (6-Digit Indian PIN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={6}
              value={formData.pincode}
              onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 600028"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">Enter valid 6-digit postal code</p>
          </div>

          {/* Expected Delivery Days */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Expected Delivery Days <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={formData.expectedDeliveryDays}
              onChange={(e) => handleInputChange('expectedDeliveryDays', e.target.value)}
              placeholder="3"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          {/* Operational Toggles */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Payment & Availability Flags
            </h4>

            {/* COD Available */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">COD Available</p>
                <p className="text-[10px] text-slate-500">Allow Cash-on-Delivery payment mode for this pincode</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('codAvailable', !formData.codAvailable)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  formData.codAvailable ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    formData.codAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Prepaid Available */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Prepaid Available</p>
                <p className="text-[10px] text-slate-500">Allow Prepaid online payment shipments</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('prepaidAvailable', !formData.prepaidAvailable)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  formData.prepaidAvailable ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    formData.prepaidAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Active Status</p>
                <p className="text-[10px] text-slate-500">Enable active serviceability routing for this pincode</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('active', !formData.active)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  formData.active ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    formData.active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Form Action Buttons */}
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
              {pincodeToEdit ? 'Save Changes' : 'Add Pincode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
