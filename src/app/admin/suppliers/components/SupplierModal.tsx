'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { Supplier } from '@/redux/slices/supplierSlice';

interface SupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null; // If editing
}

interface Category {
  id: number;
  name: string;
}

const parseNdjson = (raw: string): any[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
};

export default function SupplierModal({ open, onClose, onSuccess, supplier }: SupplierModalProps) {
  const [supplierCode, setSupplierCode] = useState('');
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [gstType, setGstType] = useState('CGST_SGST');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [website, setWebsite] = useState('');
  const [leadDays, setLeadDays] = useState<number>(0);
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState<number>(0);
  const [usesOwnProductCode, setUsesOwnProductCode] = useState(false);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [preferredSupplier, setPreferredSupplier] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    if (open) {
      // Fetch categories
      const fetchCategories = async () => {
        setLoadingCats(true);
        try {
          const res = await axiosInstance.get<string>('/vendor/supplier-categories', {
            headers: { Accept: 'application/x-ndjson' },
            responseType: 'text',
            transformResponse: [(data) => data],
          });
          const parsed = parseNdjson(res.data) as Category[];
          setCategories(parsed);
        } catch (err) {
          console.error('Failed to fetch supplier categories:', err);
        } finally {
          setLoadingCats(false);
        }
      };
      fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (supplier) {
        setSupplierCode(supplier.supplierCode || '');
        setName(supplier.name || '');
        setLegalName(supplier.legalName || '');
        setCategoryId(supplier.categoryId || '');
        setGstType(supplier.gstType || 'CGST_SGST');
        setGstin(supplier.gstin || '');
        setPan(supplier.pan || '');
        setWebsite(supplier.website || '');
        setLeadDays(supplier.leadDays || 0);
        setDefaultDiscountPercent(supplier.defaultDiscountPercent || 0);
        setUsesOwnProductCode(supplier.usesOwnProductCode || false);
        setPaymentTermsDays(supplier.paymentTermsDays || 0);
        setCreditLimit(supplier.creditLimit || 0);
        setPreferredSupplier(supplier.preferredSupplier || false);
        setRemarks(supplier.remarks || '');
      } else {
        setSupplierCode('');
        setName('');
        setLegalName('');
        setCategoryId('');
        setGstType('CGST_SGST');
        setGstin('');
        setPan('');
        setWebsite('');
        setLeadDays(0);
        setDefaultDiscountPercent(0);
        setUsesOwnProductCode(false);
        setPaymentTermsDays(0);
        setCreditLimit(0);
        setPreferredSupplier(false);
        setRemarks('');
      }
    }
  }, [open, supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierCode.trim()) {
      toast.error('Supplier Code is required');
      return;
    }
    if (!name.trim()) {
      toast.error('Supplier Name is required');
      return;
    }
    if (!legalName.trim()) {
      toast.error('Legal Name is required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(supplier ? 'Updating supplier...' : 'Creating supplier...');

    const payload = {
      supplierCode: supplierCode.trim(),
      name: name.trim(),
      legalName: legalName.trim(),
      categoryId: categoryId || null,
      gstType,
      gstin: gstin.trim() || null,
      pan: pan.trim() || null,
      website: website.trim() || null,
      leadDays,
      defaultDiscountPercent,
      usesOwnProductCode,
      paymentTermsDays,
      creditLimit,
      preferredSupplier,
      remarks: remarks.trim() || null,
      status: supplier ? supplier.status : 1
    };

    try {
      if (supplier) {
        // Edit
        await axiosInstance.put(`/vendor/suppliers/${supplier.id}`, payload);
        toast.success('Supplier updated successfully!', { id: toastId });
      } else {
        // Create
        await axiosInstance.post('/vendor/suppliers', payload);
        toast.success('Supplier created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save supplier.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
            {supplier ? 'Edit Supplier Profile' : 'Create New Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                Supplier Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!!supplier}
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                placeholder="e.g. TESTSUP001"
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. TESTYUVA"
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. TESTYUVA PVT LTD"
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                Supplier Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value) || '')}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                GST Type
              </label>
              <select
                value={gstType}
                onChange={(e) => setGstType(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              >
                <option value="CGST_SGST">LOCAL (CGST_SGST)</option>
                <option value="IGST">IGST (Inter-State)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                GSTIN
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 33ABCDE1234F1Z5"
                maxLength={15}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                PAN No
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="e.g. ADHG1234F"
                maxLength={10}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                Website URL
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. https://www.usha.com"
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                Lead Days
              </label>
              <input
                type="number"
                min={0}
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                Default Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={defaultDiscountPercent}
                onChange={(e) => setDefaultDiscountPercent(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                Payment Terms (Days)
              </label>
              <input
                type="number"
                min={0}
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-355">
                Credit Limit
              </label>
              <input
                type="number"
                min={0}
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="usesOwnProductCode"
                checked={usesOwnProductCode}
                onChange={(e) => setUsesOwnProductCode(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="usesOwnProductCode" className="text-xs font-semibold text-slate-700 dark:text-slate-355 cursor-pointer select-none">
                Supplier has own product code
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="preferredSupplier"
                checked={preferredSupplier}
                onChange={(e) => setPreferredSupplier(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="preferredSupplier" className="text-xs font-semibold text-slate-700 dark:text-slate-355 cursor-pointer select-none">
                Preferred Supplier
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Key parts supplier"
              rows={3}
              className="w-full p-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {supplier ? 'Save Changes' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
