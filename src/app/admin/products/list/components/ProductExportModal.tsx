'use client';
import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Check, RefreshCw, CheckSquare, Square, Info } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface ProductExportModalProps {
  open: boolean;
  onClose: () => void;
  onExportAll: () => void;
  exportingAll: boolean;
  exportProgress: number;
}

type ExportType = 'all' | 'custom';

export default function ProductExportModal({
  open,
  onClose,
  onExportAll,
  exportingAll,
  exportProgress
}: ProductExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('all');
  const [fields, setFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [skuInputText, setSkuInputText] = useState('');

  useEffect(() => {
    if (open) {
      setExportType('all');
      setSkuInputText('');
      fetchEditFields();
    }
  }, [open]);

  const fetchEditFields = async () => {
    setLoadingFields(true);
    try {
      const response = await axiosInstance.get('/prod/products/edit-fields');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setFields(response.data.data);
        setSelectedFields(response.data.data);
      } else {
        toast.error('Failed to parse downloadable fields from server');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch product fields');
    } finally {
      setLoadingFields(false);
    }
  };

  if (!open) return null;

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const selectAllFields = () => setSelectedFields(fields);
  const selectNoFields = () => setSelectedFields([]);

  const handleCustomDownload = async () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }
    setDownloading(true);
    const toastId = toast.loading('Generating custom export template...');
    try {
      let skusArr: string[] = [""];
      let finalPrepopulate = true;

      if (skuInputText.trim()) {
        skusArr = skuInputText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);

        if (skusArr.length > 0) {
          finalPrepopulate = false;
        } else {
          skusArr = [""];
        }
      }

      const payload = {
        fields: selectedFields,
        prepopulateAll: finalPrepopulate,
        skus: skusArr,
        clientId: 0
      };
      const response = await axiosInstance.post('/prod/products/edit-template', payload, {
        responseType: 'blob',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Type': 'application/json'
        }
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `custom_product_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Custom export file generated and downloaded!', { id: toastId });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate custom export file', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Download Products
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose between exporting all products or generating a custom template with selected fields.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 flex flex-col md:flex-row gap-6">
          {/* Left Panel: Options Switcher */}
          <div className="w-full md:w-1/3 flex flex-col space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Export Options
              </label>
              <div className="flex flex-col space-y-1.5">
                <button
                  type="button"
                  onClick={() => setExportType('all')}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all border flex items-center justify-between ${
                    exportType === 'all'
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-400'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-100'
                  }`}
                >
                  <span>Download All Products</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportType('custom')}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all border flex items-center justify-between ${
                    exportType === 'custom'
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-400'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-100'
                  }`}
                >
                  <span>Custom Download</span>
                </button>
              </div>
            </div>

            {/* Description Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-blue-650 dark:text-blue-400 font-bold">
                <Info size={14} />
                <span>Description</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {exportType === 'all'
                  ? 'Initiate a complete export of all product data in the system. This process is queued and processed in the background.'
                  : 'Select specific attributes you want to include in your spreadsheet. Useful for generating bulk product update files.'}
              </p>
            </div>
          </div>

          {/* Right Panel: Content Area */}
          <div className="flex-1 flex flex-col justify-between min-h-[220px]">
            {exportType === 'all' ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-slate-50/20 dark:bg-slate-950/5 text-center">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full mb-3">
                  <Download size={28} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Download All Products</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Exporting will prepare all catalog items for offline spreadsheet edits.
                </p>

                <div className="w-full max-w-xs mt-6">
                  {exportingAll ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <span>Preparing file...</span>
                        <span>{exportProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-305"
                          style={{ width: `${exportProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onExportAll}
                      className="w-full flex items-center justify-center gap-1.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      <Download size={14} />
                      Start Bulk Export
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Specific SKUs Filter Card */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-750 dark:text-slate-250 block">
                      Specific SKUs (Optional)
                    </span>
                    {skuInputText.trim() && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-semibold animate-pulse">
                        Without Data Mode Enforced
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-550 dark:text-slate-400">
                    If empty, template will prepopulate with all products' existing data. If SKUs are supplied, only those SKUs will be exported (Without Data Mode).
                  </p>
                  <textarea
                    rows={2}
                    value={skuInputText}
                    onChange={(e) => setSkuInputText(e.target.value)}
                    placeholder="e.g. APR-ACS-FSJ-0005, APR-ACS-FSJ-0002"
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 rounded-xl focus:ring-2 focus:ring-blue-500/25 focus:border-blue-550 outline-none resize-none font-mono"
                  />
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Select Fields to Export ({selectedFields.length} of {fields.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllFields}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={selectNoFields}
                        className="text-[10px] font-bold text-slate-500 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {loadingFields ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-xs gap-1.5">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Loading available fields...</span>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[220px] grid grid-cols-2 md:grid-cols-3 gap-2 pr-1 text-slate-750 dark:text-slate-300">
                      {fields.map((field) => {
                        const isSelected = selectedFields.includes(field);
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() => toggleField(field)}
                            className="flex items-center gap-1.5 text-left p-1 hover:bg-slate-50 dark:hover:bg-slate-850 rounded text-[11px] font-medium"
                          >
                            {isSelected ? (
                              <CheckSquare size={13} className="text-blue-600 flex-shrink-0" />
                            ) : (
                              <Square size={13} className="text-slate-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{field}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCustomDownload}
                    disabled={downloading || loadingFields || selectedFields.length === 0}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {downloading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    {downloading ? 'Generating...' : 'Download Template'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
