'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchOrderItem } from '@/types/batchOrder';

interface DeleteBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchToDelete: BatchOrderItem | null;
}

export const DeleteBatchModal: React.FC<DeleteBatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  batchToDelete,
}) => {
  const [deleting, setDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !batchToDelete) return null;

  const targetBatchId = batchToDelete.batchId || batchToDelete.id;
  const displayBatchNo = batchToDelete.batchNo || (targetBatchId ? `202600${targetBatchId}` : 'N/A');
  const clientName = batchToDelete.clientName || batchToDelete.clientCode || 'Client';

  const handleConfirmDelete = async () => {
    if (!targetBatchId) {
      setErrorMsg('Invalid batch identifier.');
      return;
    }

    setDeleting(true);
    setErrorMsg(null);
    const toastId = toast.loading(`Deleting batch #${displayBatchNo}...`);

    try {
      const res = await batchOrderService.deleteBatch(targetBatchId);
      const successMsg = res?.message || 'Batch deleted successfully';
      toast.success(successMsg, { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Delete batch failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete batch.';
      toast.error(msg, { id: toastId });
      setErrorMsg(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Delete Batch #{displayBatchNo}?
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Are you sure you want to delete order batch{' '}
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            #{displayBatchNo}
          </span>{' '}
          for <strong className="text-slate-800 dark:text-slate-200">{clientName}</strong>? This action will permanently remove all staging records and parsed orders associated with this batch.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50 transition-all"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting...' : 'Delete Batch'}
          </button>
        </div>
      </div>
    </div>
  );
};
