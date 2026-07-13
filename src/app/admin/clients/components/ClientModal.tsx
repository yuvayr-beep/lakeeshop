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
    const toastId = toast.loading(client ? 'Updating client...' : 'Creating client...');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col">
          {loadingDetails ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin text-blue-600 mb-3" size={24} />
              <span>Loading details...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Client Profile */}
              <div className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                      Client Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientCode}
                      onChange={(e) => setClientCode(e.target.value)}
                      placeholder="e.g. ICICI001"
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
                      placeholder="e.g. ICICI Bank"
                      className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => handleLegalNameChange(e.target.value)}
                    placeholder="e.g. ICICI Bank Ltd"
                    className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-200 transition-all"
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
                    placeholder="Remarks..."
                    rows={3}
                    className="w-full p-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Right Column: Business Unit */}
              <div className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                      Unit Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      placeholder="e.g. B2C"
                      className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
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
                      placeholder="e.g. ICICI Bank Unit name"
                      className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    Legal name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unitLegalName}
                    onChange={(e) => setUnitLegalName(e.target.value)}
                    placeholder="e.g. ICICI Bank Pvt Ltd"
                    className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                      Dispatch Days
                    </label>
                    <input
                      type="number"
                      value={dispatchWithinDays}
                      onChange={(e) => setDispatchWithinDays(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="2"
                      min={0}
                      className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                      Delivery Days
                    </label>
                    <input
                      type="number"
                      value={deliverWithinDays}
                      onChange={(e) => setDeliverWithinDays(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="7"
                      min={0}
                      className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                      Client has Own Product code
                    </label>
                    <select
                      value={hasOwnProductCode ? 'true' : 'false'}
                      onChange={(e) => setHasOwnProductCode(e.target.value === 'true')}
                      className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                      Multiple Product Order
                    </label>
                    <select
                      value={hasMultiProductOrder ? 'true' : 'false'}
                      onChange={(e) => setHasMultiProductOrder(e.target.value === 'true')}
                      className="w-full h-10 px-3 text-sm bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-300 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-200 transition-all"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || loadingDetails}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingDetails}
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
