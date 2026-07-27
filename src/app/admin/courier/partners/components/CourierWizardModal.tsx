'use client';
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Truck, Building2, Settings2, ShieldCheck, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner, CourierFormData } from '@/types/courier';

interface CourierWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courierToEdit?: CourierPartner | null;
}

const INITIAL_FORM: CourierFormData = {
  courierCode: '',
  courierName: '',
  description: '',
  vendorNo: '',
  businessName: '',
  websiteAddress: '',
  courierSinceDate: '',
  courierPan: '',

  trackingUrlTemplate: '',
  originCityCode: '',
  originBranchCode: '',
  emailId: '',
  ccEmailIds: '',
  logoUrl: '',

  liabilityType: '',
  liabilityLimitAmt: 5000,
  fscPercentage: 12.5,
  abwChargeAmount: 1,
  dimWeightFactor: 5000,
  remarks: '',
  thresholdQuantity: 10,
  mandatoryAwbForInvoice: true,
  displayProductValue: true,
  abwChargeWaiveOff: false,
  hasPreAllottedAwb: false,
  isEnablePreOrder: false,
  attributes: '',
};

export default function CourierWizardModal({
  isOpen,
  onClose,
  onSuccess,
  courierToEdit,
}: CourierWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<CourierFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (courierToEdit) {
      setFormData({
        courierCode: courierToEdit.courierCode || '',
        courierName: courierToEdit.courierName || '',
        description: courierToEdit.description || '',
        vendorNo: courierToEdit.vendorNo || '',
        businessName: courierToEdit.businessName || '',
        websiteAddress: courierToEdit.websiteAddress || '',
        courierSinceDate: courierToEdit.courierSinceDate || '',
        courierPan: courierToEdit.courierPan || '',

        trackingUrlTemplate: courierToEdit.trackingUrlTemplate || '',
        originCityCode: courierToEdit.originCityCode || '',
        originBranchCode: courierToEdit.originBranchCode || '',
        emailId: courierToEdit.emailId || '',
        ccEmailIds: courierToEdit.ccEmailIds || '',
        logoUrl: courierToEdit.logoUrl || '',

        liabilityType: courierToEdit.liabilityType ? courierToEdit.liabilityType.toUpperCase() : '',
        liabilityLimitAmt: courierToEdit.liabilityLimitAmt ?? 5000,
        fscPercentage: courierToEdit.fscPercentage ?? 12.5,
        abwChargeAmount: courierToEdit.abwChargeAmount ?? 1,
        dimWeightFactor: courierToEdit.dimWeightFactor ?? 5000,
        remarks: courierToEdit.remarks || '',
        thresholdQuantity: courierToEdit.thresholdQuantity ?? 10,
        mandatoryAwbForInvoice: courierToEdit.mandatoryAwbForInvoice ?? true,
        displayProductValue: courierToEdit.displayProductValue ?? true,
        abwChargeWaiveOff: courierToEdit.abwChargeWaiveOff ?? false,
        hasPreAllottedAwb: courierToEdit.hasPreAllottedAwb ?? false,
        isEnablePreOrder: courierToEdit.isEnablePreOrder ?? false,
        attributes: courierToEdit.attributes || '',
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setCurrentStep(1);
  }, [courierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CourierFormData, value: any) => {
    if (field === 'courierCode') {
      value = String(value).toUpperCase();
    }
    if (field === 'courierPan') {
      value = String(value).toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.courierCode.trim()) {
        toast.error('Courier Code is required');
        return false;
      }
      if (!formData.courierName.trim()) {
        toast.error('Courier Name is required');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveCourier = async () => {
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(courierToEdit ? 'Updating Courier Partner...' : 'Creating Courier Partner...');

    const payload = {
      ...formData,
      liabilityLimitAmt: Number(formData.liabilityLimitAmt) || 0,
      fscPercentage: Number(formData.fscPercentage) || 0,
      abwChargeAmount: Number(formData.abwChargeAmount) || 0,
      dimWeightFactor: Number(formData.dimWeightFactor) || 0,
      thresholdQuantity: Number(formData.thresholdQuantity) || 0,
    };

    try {
      if (courierToEdit) {
        await axiosInstance.put(`/courier/${courierToEdit.id}`, payload);
        toast.success('Courier Partner updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/courier', payload);
        toast.success('Courier Partner created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save courier:', err);
      const errMsg = err.response?.data?.message || 'Failed to save courier partner details.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light-bg)] flex items-center justify-center text-[var(--primary)] font-bold">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {courierToEdit ? `Edit Courier: ${courierToEdit.courierName}` : 'Create New Courier Partner'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {courierToEdit ? 'Update logistics parameters and carrier configuration' : 'Step-by-step registration for courier partner account'}
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

        {/* Wizard Steps Header */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between relative">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => validateStep(1) && setCurrentStep(1)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                currentStep === 1
                  ? 'text-[var(--primary)]'
                  : currentStep > 1
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {currentStep > 1 ? <Check size={14} /> : '1'}
              </div>
              <span className="hidden sm:inline">Business Details</span>
            </button>

            <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-3" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => validateStep(1) && setCurrentStep(2)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                currentStep === 2
                  ? 'text-[var(--primary)]'
                  : currentStep > 2
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {currentStep > 2 ? <Check size={14} /> : '2'}
              </div>
              <span className="hidden sm:inline">Config & Communication</span>
            </button>

            <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-3" />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => validateStep(1) && setCurrentStep(3)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                currentStep === 3 ? 'text-[var(--primary)]' : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                3
              </div>
              <span className="hidden sm:inline">Liability & Toggles</span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {/* STEP 1: Business Details */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Building2 size={16} className="text-[var(--primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Step 1: Primary Business Identification
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Courier Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Courier Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.courierCode}
                    onChange={(e) => handleInputChange('courierCode', e.target.value)}
                    placeholder="e.g. DLRY or BLUEDART"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unique uppercase carrier identifier code</p>
                </div>

                {/* Courier Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Courier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.courierName}
                    onChange={(e) => handleInputChange('courierName', e.target.value)}
                    placeholder="e.g. Delhivery Express"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    required
                  />
                </div>

                {/* Vendor No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor No
                  </label>
                  <input
                    type="text"
                    value={formData.vendorNo}
                    onChange={(e) => handleInputChange('vendorNo', e.target.value)}
                    placeholder="e.g. 211002"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="e.g. BLUEDART EXPRESS LTD"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.websiteAddress}
                    onChange={(e) => handleInputChange('websiteAddress', e.target.value)}
                    placeholder="https://www.delhivery.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Courier Since Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Courier Since Date
                  </label>
                  <input
                    type="date"
                    value={formData.courierSinceDate}
                    onChange={(e) => handleInputChange('courierSinceDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Courier PAN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Courier PAN
                  </label>
                  <input
                    type="text"
                    value={formData.courierPan}
                    onChange={(e) => handleInputChange('courierPan', e.target.value)}
                    placeholder="ABCDE1234F"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Carrier operational scope and notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Config & Communication */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Settings2 size={16} className="text-[var(--primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Step 2: Tracking Configuration & Dispatch Contact
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tracking URL Template */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tracking URL Template
                  </label>
                  <input
                    type="text"
                    value={formData.trackingUrlTemplate}
                    onChange={(e) => handleInputChange('trackingUrlTemplate', e.target.value)}
                    placeholder="https://www.delhivery.com/track/package/{awb}"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Use <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">&#123;awb&#125;</code> as placeholder for dynamic AWB tracking number insertion</p>
                </div>

                {/* Origin City Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Origin City Code
                  </label>
                  <input
                    type="text"
                    value={formData.originCityCode}
                    onChange={(e) => handleInputChange('originCityCode', e.target.value)}
                    placeholder="e.g. MAA, DEL, BOM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold uppercase text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Origin Branch Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Origin Branch Code
                  </label>
                  <input
                    type="text"
                    value={formData.originBranchCode}
                    onChange={(e) => handleInputChange('originBranchCode', e.target.value)}
                    placeholder="e.g. EGM, HBR"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold uppercase text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Email ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Email ID
                  </label>
                  <input
                    type="email"
                    value={formData.emailId}
                    onChange={(e) => handleInputChange('emailId', e.target.value)}
                    placeholder="dispatch@courier.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* CC Email IDs */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CC Email IDs
                  </label>
                  <input
                    type="text"
                    value={formData.ccEmailIds}
                    onChange={(e) => handleInputChange('ccEmailIds', e.target.value)}
                    placeholder="orders@lakee.com, support@lakee.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Comma-separated email list</p>
                </div>

                {/* Logo URL */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Courier Logo URL
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      value={formData.logoUrl}
                      onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                      placeholder="https://logo.url/logo.png"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    {formData.logoUrl && (
                      <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.logoUrl}
                          alt="Logo Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Liability, Commercials & Operational Toggles */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck size={16} className="text-[var(--primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Step 3: Liability Setup & Operational Rules
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Liability Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Liability Type
                  </label>
                  <select
                    value={formData.liabilityType}
                    onChange={(e) => handleInputChange('liabilityType', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Select Liability Type (Optional)</option>
                    <option value="LIMITED LIABILITY">LIMITED LIABILITY</option>
                    <option value="DECLARED VALUE">DECLARED VALUE</option>
                    <option value="INSURED SHIPMENT">INSURED SHIPMENT</option>
                    <option value="NO LIABILITY">NO LIABILITY</option>
                  </select>
                </div>

                {/* Liability Limit Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Liability Limit Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.liabilityLimitAmt}
                    onChange={(e) => handleInputChange('liabilityLimitAmt', e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* FSC % */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FSC % (Fuel Surcharge)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fscPercentage}
                    onChange={(e) => handleInputChange('fscPercentage', e.target.value)}
                    placeholder="12.5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* AWB Charge Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    AWB Charge Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.abwChargeAmount}
                    onChange={(e) => handleInputChange('abwChargeAmount', e.target.value)}
                    placeholder="1.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* DIM Weight Factor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    DIM Weight Factor (cm³/kg)
                  </label>
                  <input
                    type="number"
                    value={formData.dimWeightFactor}
                    onChange={(e) => handleInputChange('dimWeightFactor', e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Threshold Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Threshold Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.thresholdQuantity}
                    onChange={(e) => handleInputChange('thresholdQuantity', e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                    placeholder="Carrier JSON or custom parameters..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                  Operational Toggles & Flags
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mandatory AWB */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Mandatory AWB for Invoice</p>
                      <p className="text-[10px] text-slate-500">Require AWB generation before printing customer invoices</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange('mandatoryAwbForInvoice', !formData.mandatoryAwbForInvoice)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        formData.mandatoryAwbForInvoice ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          formData.mandatoryAwbForInvoice ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Display Product Value */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Display Product Value</p>
                      <p className="text-[10px] text-slate-500">Render declared package value on shipping label</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange('displayProductValue', !formData.displayProductValue)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        formData.displayProductValue ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          formData.displayProductValue ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* AWB Charge Waive Off */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">AWB Charge Waive Off</p>
                      <p className="text-[10px] text-slate-500">Waive off standard carrier per-AWB fee</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange('abwChargeWaiveOff', !formData.abwChargeWaiveOff)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        formData.abwChargeWaiveOff ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          formData.abwChargeWaiveOff ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Has Pre Allotted AWB */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Has Pre-Allotted AWB Pool</p>
                      <p className="text-[10px] text-slate-500">Uses pre-uploaded manual AWB inventory banks</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange('hasPreAllottedAwb', !formData.hasPreAllottedAwb)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        formData.hasPreAllottedAwb ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          formData.hasPreAllottedAwb ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Enable PreOrder */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable PreOrder Routing</p>
                      <p className="text-[10px] text-slate-500">Allow courier allocation for pre-order fulfillment</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange('isEnablePreOrder', !formData.isEnablePreOrder)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        formData.isEnablePreOrder ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          formData.isEnablePreOrder ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-95"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Next Step
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveCourier}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {courierToEdit ? 'Save Changes' : 'Create Courier Partner'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
