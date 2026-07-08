'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { Client } from '@/redux/slices/clientSlice';

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null; // If editing
}

export default function ClientModal({ open, onClose, onSuccess, client }: ClientModalProps) {
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (client) {
        setClientCode(client.clientCode || '');
        setClientName(client.clientName || '');
        setLegalName(client.legalName || '');
        setLogoUrl(client.logoUrl || '');
        setRemarks(client.remarks || '');
      } else {
        setClientCode('');
        setClientName('');
        setLegalName('');
        setLogoUrl('');
        setRemarks('');
      }
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientCode.trim()) {
      toast.error('Client Code is required');
      return;
    }
    if (!clientName.trim()) {
      toast.error('Client Name is required');
      return;
    }
    if (!legalName.trim()) {
      toast.error('Legal Name is required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(client ? 'Updating client...' : 'Creating client...');

    const payload = {
      clientCode: clientCode.trim(),
      clientName: clientName.trim(),
      legalName: legalName.trim(),
      logoUrl: logoUrl.trim() || null,
      remarks: remarks.trim() || null,
    };

    try {
      if (client) {
        // Edit
        await axiosInstance.put(`/client/${client.id}`, payload);
        toast.success('Client updated successfully!', { id: toastId });
      } else {
        // Create
        await axiosInstance.post('/client', payload);
        toast.success('Client created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save client. Please try again.';
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
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
            {client ? 'Edit Client Profile' : 'Create New Client'}
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
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Client Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={clientCode}
              onChange={(e) => setClientCode(e.target.value)}
              placeholder="e.g. HDFC001"
              className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. HDFC Bank"
              className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. HDFC Bank Ltd"
              className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="e.g. https://logo.png"
              className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Top client"
              rows={3}
              className="w-full p-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all resize-none"
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
              {client ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
