'use client';
import React from 'react';
import { X, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  message = 'Are you sure you want to delete/deactivate this client product share?'
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-2 text-red-500">
            <Trash2 size={18} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
            {message}
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-350"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
