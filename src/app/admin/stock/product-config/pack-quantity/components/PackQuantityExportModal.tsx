'use client';
import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface PackQuantityExportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PackQuantityExportModal({
  open,
  onClose,
}: PackQuantityExportModalProps) {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [skuInputText, setSkuInputText] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSkuInputText('');
      fetchEditFields();
    }
  }, [open]);

  const fetchEditFields = async () => {
    try {
      const response = await axiosInstance.get('/prod/products/edit-fields');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setAvailableFields(response.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch available edit fields:', err);
    }
  };

  if (!open) return null;

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading('Generating Product Pack Quantity export file...');
    try {
      let skusArr: string[] = [''];
      let finalPrepopulate = true;

      if (skuInputText.trim()) {
        skusArr = skuInputText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);

        if (skusArr.length > 0) {
          finalPrepopulate = false;
        } else {
          skusArr = [''];
        }
      }

      // Target fields: SKU code and Pack Quantity (excluding product name and model name)
      let targetFields = ['defaultSku', 'packQuantity'];
      if (availableFields.length > 0) {
        const matched = availableFields.filter((f) => {
          const lower = f.toLowerCase();
          const isNameOrModel = lower.includes('name') || lower.includes('model');
          return !isNameOrModel && (lower.includes('sku') || lower.includes('pack'));
        });
        if (matched.length > 0) {
          targetFields = matched;
        }
      }

      const payload = {
        fields: targetFields,
        prepopulateAll: finalPrepopulate,
        skus: skusArr,
        clientId: 0,
      };

      const response = await axiosInstance.post('/prod/products/edit-template', payload, {
        responseType: 'blob',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Type': 'application/json',
        },
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pack_quantity_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Product Pack Quantity export file downloaded successfully!', { id: toastId });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate export file', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Download Products</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Export Pack Quantity Configuration Data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Optional Filter by SKUs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Filter by SKUs (Optional)</span>
              <span className="text-[11px] font-normal text-slate-400">Leave blank to export all products</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter SKU codes separated by commas or new lines (e.g. SKU-1001, SKU-1002)..."
              value={skuInputText}
              onChange={(e) => setSkuInputText(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating Export...
              </>
            ) : (
              <>
                <Download size={15} />
                Download Excel File
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
