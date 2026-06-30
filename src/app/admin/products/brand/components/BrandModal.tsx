'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Brand {
  brandId: number;
  brandName: string;
  description: string;
  logoUrl?: string | null;
  email?: string | null;
  ccEmail?: string | null;
  status: boolean;
}

interface BrandModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  brand?: Brand | null; // If passed, modal is in Edit mode
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BrandModal({ open, onClose, onSuccess, brand }: BrandModalProps) {
  const isEdit = !!brand;

  // Form Fields
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Set initial form states
  useEffect(() => {
    if (open) {
      if (brand) {
        setBrandName(brand.brandName);
        setDescription(brand.description || '');
        setLogoUrl(brand.logoUrl || '');
        setEmail(brand.email || '');
        setCcEmail(brand.ccEmail || '');
      } else {
        setBrandName('');
        setDescription('');
        setLogoUrl('');
        setEmail('');
        setCcEmail('');
      }
    }
  }, [open, brand]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error('Brand Name is required');
      return;
    }

    if (email.trim() && !emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (ccEmail.trim()) {
      const ccList = ccEmail.split(',').map((e) => e.trim()).filter(Boolean);
      const invalid = ccList.some((e) => !emailRegex.test(e));
      if (invalid) {
        toast.error('One or more CC emails are invalid');
        return;
      }
    }

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating brand...' : 'Creating brand...');

    const payload = {
      brandName: brandName.trim(),
      description: description.trim() || null,
      logoUrl: logoUrl.trim() || null,
      email: email.trim() || null,
      ccEmail: ccEmail.trim() || null,
    };

    try {
      if (isEdit && brand) {
        await axiosInstance.put(`/prod/brands/${brand.brandId}`, payload);
        toast.success('Brand updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/prod/brands', payload);
        toast.success('Brand created successfully!', { id: toastId });
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
                {isEdit ? 'Edit Brand' : 'Create Brand'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? `Modifying Brand ID: ${brand?.brandId}` : 'Add a new product brand to the store'}
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
          {/* Brand Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Samsung, Apple"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* Email ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. samsung@gmail.com"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* CC Email ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              CC Email ID <span className="text-slate-400 font-normal">(Comma separated list)</span>
            </label>
            <input
              type="text"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              placeholder="e.g. test@gmail.com, test2@gmail.com"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Logo URL
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="e.g. https://domain.com/logo.png"
              className="w-full h-10 px-3.5 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
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
              placeholder="Write a brief description..."
              rows={3}
              className="w-full px-3.5 py-2 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium resize-none"
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
            {isEdit ? 'Update Brand' : 'Save Brand'}
          </button>
        </div>

      </div>
    </div>
  );
}
