'use client';
import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierRate } from '@/types/courierRate';

interface RateDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rateToDelete: CourierRate | null;
}

export default function RateDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  rateToDelete,
}: RateDeleteModalProps) {
  const [deleting, setDeleting] = useState<boolean>(false);

  if (!isOpen || !rateToDelete) return null;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    const toastId = toast.loading(`Deleting rate slab #${rateToDelete.id}...`);

    try {
      await axiosInstance.delete(`/courier/rates/${rateToDelete.id}`);
      toast.success(`Courier rate card slab #${rateToDelete.id} deleted successfully!`, { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Delete rate slab failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to delete courier rate card slab.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
          Delete Rate Slab ({rateToDelete.slabStart} - {rateToDelete.slabEnd} Kg)?
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Are you sure you want to delete rate card slab for <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-slate-700 dark:text-slate-300">{rateToDelete.zoneCode || 'Zone'}</code> ({rateToDelete.slabStart}-{rateToDelete.slabEnd} Kg @ ₹{rateToDelete.rate})?
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:shadow-lg"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {deleting ? 'Deleting...' : 'Delete Rate Slab'}
          </button>
        </div>
      </div>
    </div>
  );
}
