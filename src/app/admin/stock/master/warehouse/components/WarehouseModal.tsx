'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Warehouse {
  id: number;
  name: string;
  type: string;
  address: string;
  status: boolean;
}

interface WarehouseModalProps {
  open: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  onSuccess: () => void;
}

export default function WarehouseModal({
  open,
  onClose,
  warehouse,
  onSuccess,
}: WarehouseModalProps) {
  const isEdit = !!warehouse;

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('warehouse');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Dynamic types list state
  const [warehouseTypes, setWarehouseTypes] = useState<{ code: string; name: string }[]>([
    { code: 'warehouse', name: 'WAREHOUSE' },
    { code: 'store', name: 'STORE' },
    { code: 'client-site', name: 'CLIENT_SITE' }
  ]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Sync form states with editing item
  useEffect(() => {
    if (open) {
      if (warehouse) {
        setName(warehouse.name);
        setType(warehouse.type || 'warehouse');
        setAddress(warehouse.address || '');
      } else {
        setName('');
        setType('warehouse');
        setAddress('');
      }

      // Fetch warehouse types dynamically
      setLoadingTypes(true);
      axiosInstance.get('/stock/warehouse/types')
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setWarehouseTypes(res.data);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch warehouse types:', err);
        })
        .finally(() => setLoadingTypes(false));
    }
  }, [open, warehouse]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }
    if (!type) {
      toast.error('Warehouse type is required');
      return;
    }
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating warehouse details...' : 'Creating new warehouse...');

    const payload = {
      name: name.trim(),
      type: type,
      address: address.trim(),
    };

    try {
      if (isEdit && warehouse) {
        await axiosInstance.put(`/stock/warehouse/${warehouse.id}`, payload);
        toast.success('Warehouse updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/stock/warehouse', payload);
        toast.success('Warehouse created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Failed to save warehouse details.';
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'string') {
          errMsg = data;
        } else if (typeof data === 'object') {
          errMsg = data.message || data.error || data.details || JSON.stringify(data);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {isEdit ? 'Edit Warehouse' : 'Create Warehouse'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? `Modifying Warehouse ID: #${warehouse?.id}` : 'Add a new location, store, or fulfillment center to stock.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
              Warehouse Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Raheja Complex or ATM Square"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
              Warehouse Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={loadingTypes || saving}
              className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-205 font-medium cursor-pointer disabled:opacity-60"
            >
              {loadingTypes && warehouseTypes.length === 0 ? (
                <option value="">Loading types...</option>
              ) : (
                warehouseTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
              Full Address <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Enter full physical address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium resize-none leading-relaxed"
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
            className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isEdit ? 'Update details' : 'Save warehouse'}
          </button>
        </div>

      </div>
    </div>
  );
}
