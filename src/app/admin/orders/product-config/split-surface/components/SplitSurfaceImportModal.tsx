'use client';
import React, { useState, useEffect } from 'react';
import { X, Upload, Download, FileText, Check, AlertCircle, RefreshCw, Info, FileSpreadsheet } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface SplitSurfaceImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SplitSurfaceImportModal({
  open,
  onClose,
  onSuccess,
}: SplitSurfaceImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<boolean>(false);
  const [results, setResults] = useState<any[] | null>(null);

  // Template generation settings
  const [prepopulateType, setPrepopulateType] = useState<'with-data' | 'without-data'>('with-data');
  const [skuInputText, setSkuInputText] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setResults(null);
      setPrepopulateType('with-data');
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
      console.warn('Failed to fetch edit fields:', err);
    }
  };

  if (!open) return null;

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'xlsx' || extension === 'xls') {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'xlsx' || extension === 'xls') {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Download Edit Template strictly passing the 3 Split & Surface fields
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    const toastId = toast.loading('Generating Split & Surface edit template...');
    try {
      let skusArr: string[] = [''];
      let finalPrepopulate = prepopulateType === 'with-data';

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

      // Target fields: SKU code and the 3 split/surface fields (excluding product name and model name)
      let targetFields = ['defaultSku', 'isSplit', 'splitQuantity', 'surfaceQuantity'];
      if (availableFields.length > 0) {
        const matched = availableFields.filter((f) => {
          const lower = f.toLowerCase();
          const isNameOrModel = lower.includes('name') || lower.includes('model');
          return !isNameOrModel && (lower.includes('sku') || lower.includes('split') || lower.includes('surface'));
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
      link.setAttribute('download', `split_surface_edit_template_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Edit template downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download template', { id: toastId });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Upload completed Excel file to update products
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResults(null);
    const toastId = toast.loading('Uploading Split & Surface template data...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axiosInstance.post('/prod/products/edit-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/x-ndjson',
        },
        timeout: 600000, // 10 minutes for large batches
      });

      const data = response.data;
      let parsedLines: any[] = [];
      if (typeof data === 'string') {
        parsedLines = data
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => JSON.parse(l));
      } else {
        parsedLines = Array.isArray(data) ? data : [data];
      }

      setResults(parsedLines);
      const successCount = parsedLines.filter((x) => x.success).length;
      const failCount = parsedLines.filter((x) => !x.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully updated ${successCount} products!`, { id: toastId });
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Updated ${successCount} products, ${failCount} failed.`, { id: toastId });
      } else {
        toast.error(`Failed to process all ${failCount} rows.`, { id: toastId });
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload spreadsheet', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Bulk Split & Surface Upload</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download the Edit template and upload updated Split Shipment, Split Quantity, and Surface Quantity values
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading || downloadingTemplate}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {/* Step 1: Generate Download Template */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Generate Edit Template
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Default Fields: Is Split, Split Qty, Surface Qty
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Prepopulate Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Prepopulate Data Options
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="prepopulateType"
                      value="with-data"
                      checked={prepopulateType === 'with-data' && !skuInputText.trim()}
                      disabled={!!skuInputText.trim()}
                      onChange={() => setPrepopulateType('with-data')}
                      className="text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 w-3.5 h-3.5"
                    />
                    <span>With Existing Product Data</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="prepopulateType"
                      value="without-data"
                      checked={prepopulateType === 'without-data' || !!skuInputText.trim()}
                      onChange={() => setPrepopulateType('without-data')}
                      className="text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 w-3.5 h-3.5"
                    />
                    <span>Blank Template</span>
                  </label>
                </div>
              </div>

              {/* Specific SKUs textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Specific SKUs (Optional)
                </label>
                <textarea
                  rows={2}
                  value={skuInputText}
                  onChange={(e) => setSkuInputText(e.target.value)}
                  placeholder="e.g. SKU-1001, SKU-1002 (comma or newline separated)"
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {downloadingTemplate ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating Edit Template...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Generate & Download Excel Template
                </>
              )}
            </button>
          </div>

          {/* Step 2: Upload Updated Template */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Upload Completed Excel File
              </h3>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                  : selectedFile
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20'
              }`}
            >
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                id="split-surface-file-upload"
              />
              <label htmlFor="split-surface-file-upload" className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  {selectedFile ? <FileSpreadsheet size={24} className="text-emerald-600" /> : <Upload size={24} />}
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Drag & drop your filled Excel template here, or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports .xlsx and .xls formats</p>
                  </div>
                )}
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Uploading & Processing...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Upload & Update Split & Surface Data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Summary Section */}
          {results && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Import Processing Results</span>
                <div className="flex gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {results.filter((r) => r.success).length} Success
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                    {results.filter((r) => !r.success).length} Failed
                  </span>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto scrollbar-thin text-xs space-y-1 font-mono">
                {results.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg flex items-center justify-between border ${
                      res.success
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <span>Row {idx + 1}: {res.sku || 'N/A'}</span>
                    <span>{res.message || res.error || (res.success ? 'Success' : 'Failed')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
