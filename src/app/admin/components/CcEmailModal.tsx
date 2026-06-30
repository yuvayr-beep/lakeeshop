'use client';
import React from 'react';
import { X, Mail, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CcEmailModalProps {
  ccList: string;
  onClose: () => void;
}

export default function CcEmailModal({ ccList, onClose }: CcEmailModalProps) {
  const [copied, setCopied] = React.useState(false);
  const emails = ccList.split(',').map((e) => e.trim()).filter(Boolean);

  const handleCopy = () => {
    navigator.clipboard.writeText(ccList);
    setCopied(true);
    toast.success('Emails copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Mail className="text-blue-500" size={18} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              CC Email List
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-bold tracking-wide">
              {emails.length} CC recipient{emails.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy All'}
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-150 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20">
            {emails.map((email, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="truncate">{email}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
