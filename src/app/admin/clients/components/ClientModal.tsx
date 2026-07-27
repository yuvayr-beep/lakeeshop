'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Building2, Layers, Settings2, Clock, FileText, Image as ImageIcon } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { Client } from '@/redux/slices/clientSlice';

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null; // If editing
}

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-8 w-20 items-center rounded-full p-1 transition-colors duration-200 focus:outline-none select-none cursor-pointer shadow-inner ${
        value ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-600'
      }`}
    >
      <span className="w-full flex items-center justify-between px-2 text-[11px] font-black text-white tracking-wider">
        <span>{value ? 'YES' : ''}</span>
        <span>{!value ? 'NO' : ''}</span>
      </span>
      <span
        className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
          value ? 'translate-x-12' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function ClientModal({ open, onClose, onSuccess, client }: ClientModalProps) {
  // Client Profile States
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [remarks, setRemarks] = useState('');

  // Business Unit States
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitLegalName, setUnitLegalName] = useState('');
  const [dispatchWithinDays, setDispatchWithinDays] = useState<number | ''>(2);
  const [deliverWithinDays, setDeliverWithinDays] = useState<number | ''>(7);
  const [hasOwnProductCode, setHasOwnProductCode] = useState(true);
  const [hasMultiProductOrder, setHasMultiProductOrder] = useState(true);
  const [hasProgram, setHasProgram] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Sync / Auto-fill Business Unit Legal Name when Client Legal Name is typed
  const handleLegalNameChange = (val: string) => {
    setLegalName(val);
    if (!unitLegalName || unitLegalName === legalName) {
      setUnitLegalName(val);
    }
  };

  useEffect(() => {
    if (open) {
      if (client) {
        setClientCode(client.clientCode || '');
        setClientName(client.clientName || '');
        setLegalName(client.legalName || '');
        setLogoUrl(client.logoUrl || '');
        setRemarks(client.remarks || '');

        // Default business unit fields first
        setUnitCode('');
        setUnitName('');
        setUnitLegalName(client.legalName || '');
        setDispatchWithinDays(2);
        setDeliverWithinDays(7);
        setHasOwnProductCode(true);
        setHasMultiProductOrder(true);
        setHasProgram(true);

        // Fetch full client details to get business units
        const fetchDetails = async () => {
          setLoadingDetails(true);
          try {
            const res = await axiosInstance.get(`/client/${client.id}`);
            const data = res.data?.data;
            if (data?.businessUnits && data.businessUnits.length > 0) {
              const bu = data.businessUnits[0];
              setUnitCode(bu.unitCode || '');
              setUnitName(bu.unitName || '');
              setUnitLegalName(bu.legalName || '');
              setDispatchWithinDays(bu.dispatchWithinDays ?? 2);
              setDeliverWithinDays(bu.deliverWithinDays ?? 7);
              setHasOwnProductCode(bu.hasOwnProductCode ?? true);
              setHasMultiProductOrder(bu.hasMultiProductOrder ?? true);
              setHasProgram(bu.hasProgram ?? true);
            }
          } catch (err) {
            console.error('Failed to fetch business units', err);
          } finally {
            setLoadingDetails(false);
          }
        };
        fetchDetails();
      } else {
        // Reset to initial defaults for creation
        setClientCode('');
        setClientName('');
        setLegalName('');
        setLogoUrl('');
        setRemarks('');

        setUnitCode('');
        setUnitName('');
        setUnitLegalName('');
        setDispatchWithinDays(2);
        setDeliverWithinDays(7);
        setHasOwnProductCode(true);
        setHasMultiProductOrder(true);
        setHasProgram(true);
      }
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
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
    if (!unitCode.trim()) {
      toast.error('Unit Code is required');
      return;
    }
    if (!unitName.trim()) {
      toast.error('Unit Name is required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(client ? 'Updating client profile...' : 'Creating client profile...');

    const payload = {
      clientCode: clientCode.trim(),
      clientName: clientName.trim(),
      legalName: legalName.trim(),
      logoUrl: logoUrl.trim() || null,
      remarks: remarks.trim() || null,
      businessUnits: [
        {
          unitCode: unitCode.trim(),
          unitName: unitName.trim(),
          legalName: unitLegalName.trim() || legalName.trim(),
          dispatchWithinDays: dispatchWithinDays === '' ? 2 : Number(dispatchWithinDays),
          deliverWithinDays: deliverWithinDays === '' ? 7 : Number(deliverWithinDays),
          hasOwnProductCode: !!hasOwnProductCode,
          hasMultiProductOrder: !!hasMultiProductOrder,
          hasProgram: !!hasProgram,
        }
      ]
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-md">
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {client ? 'Edit Client Profile' : 'Create New Client'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {client ? `Updating profile details for ${client.clientName}` : 'Add a new client and configure default business unit settings'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col space-y-6">
          {loadingDetails ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="animate-spin text-blue-600 mb-3" size={28} />
              <span className="text-xs font-semibold">Loading client details...</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Section 1 & 2 Grid: Client Profile & Business Unit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Column 1: Client Profile Details Card */}
                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      1. Client Profile Info
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Client Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clientCode}
                        onChange={(e) => setClientCode(e.target.value)}
                        placeholder="e.g. HDFC001"
                        className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Client Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={legalName}
                      onChange={(e) => handleLegalNameChange(e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon size={12} className="text-slate-400" /> Logo Image URL
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://logo.png"
                      className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                    />
                  </div>
                </div>

                {/* Column 2: Default Business Unit Details Card */}
                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      2. Business Unit Info
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Unit Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={unitCode}
                        onChange={(e) => setUnitCode(e.target.value)}
                        placeholder="e.g. B2C"
                        className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                        Unit Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="e.g. HDFC Bank B2C Unit"
                        className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Unit Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unitLegalName}
                      onChange={(e) => setUnitLegalName(e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd Unit"
                      className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" /> Dispatch SLA (Days)
                      </label>
                      <input
                        type="number"
                        value={dispatchWithinDays}
                        onChange={(e) => setDispatchWithinDays(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="2"
                        min={0}
                        className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" /> Delivery SLA (Days)
                      </label>
                      <input
                        type="number"
                        value={deliverWithinDays}
                        onChange={(e) => setDeliverWithinDays(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="7"
                        min={0}
                        className="w-full h-10 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Feature Toggles Card (Full Width Box) */}
              <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 space-y-4 w-full">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <Settings2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    3. System & Order Configurations
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Toggle 1: Has Own Product Code */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        Has Own Product Code
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Client maps custom SKU codes
                      </p>
                    </div>
                    <YesNoToggle value={hasOwnProductCode} onChange={setHasOwnProductCode} />
                  </div>

                  {/* Toggle 2: Multiple Product Order */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        Multi Product Order
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Allow multi-item shipments
                      </p>
                    </div>
                    <YesNoToggle value={hasMultiProductOrder} onChange={setHasMultiProductOrder} />
                  </div>

                  {/* Toggle 3: Has Program */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        Has Program
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Enable loyalty reward schedule
                      </p>
                    </div>
                    <YesNoToggle value={hasProgram} onChange={setHasProgram} />
                  </div>
                </div>
              </div>

              {/* Standalone Remarks Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter client profile remarks or internal notes..."
                  rows={3}
                  className="w-full p-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all resize-none"
                />
              </div>

            </div>
          )}

          {/* Modal Footer Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || loadingDetails}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={saving || loadingDetails}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {client ? 'Save Profile Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
