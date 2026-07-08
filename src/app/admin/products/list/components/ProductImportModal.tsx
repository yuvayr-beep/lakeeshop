'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Download, FileText, Check, AlertCircle, RefreshCw, CheckSquare, Square, Info } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface ProductImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode: 'create' | 'edit' | 'status' | 'offline';
}

type Mode = 'create' | 'edit' | 'status' | 'offline';

const MODE_CONFIG = {
  create: {
    title: 'Create Upload',
    subtitle: 'Bulk Product Creation',
    templateUrl: '/prod/products/addition-template?clientId=0',
    uploadUrl: '/prod/products/addition-upload',
    description: 'Use this template to create new products in bulk. SKU code will be automatically generated or mapped.'
  },
  edit: {
    title: 'Edit Upload',
    subtitle: 'Bulk Product Edit & Update',
    templateUrl: '/prod/products/edit-template',
    uploadUrl: '/prod/products/edit-upload',
    description: 'Generate a custom template by selecting fields you wish to edit, then upload the updated sheet.'
  },
  status: {
    title: 'Status Upload',
    subtitle: 'Bulk Product Status Update',
    templateUrl: '/prod/products/status/template',
    uploadUrl: '/prod/products/edit-upload', // Wait, the prompt says the Status Upload uses '/prod/products/edit-upload' or '/prod/products/status/upload'?
    // Let's re-read cURL request:
    // Update API: POST 'https://v2.lakeetech.com/prod/products/edit-upload'
    description: 'Bulk update product status (Active, Blocked, Temp Blocked) using the status template.'
  },
  offline: {
    title: 'Offline Upload',
    subtitle: 'Bulk Offline Status Update',
    templateUrl: '/prod/products/offline-status/template',
    uploadUrl: '/prod/products/offline-status/upload',
    description: 'Bulk update offline status codes (Online, Offline, Temp Offline) using the offline status template.'
  }
};

export default function ProductImportModal({
  open,
  onClose,
  onSuccess,
  initialMode
}: ProductImportModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  // Custom edit template fields
  const [fields, setFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [prepopulateType, setPrepopulateType] = useState<'with-data' | 'without-data'>('with-data');
  const [skuInputText, setSkuInputText] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setSelectedFile(null);
    setResults(null);
    setPrepopulateType('with-data');
    setSkuInputText('');
  }, [initialMode, open]);

  // Fetch customizable fields when switching to 'edit' mode
  useEffect(() => {
    if (mode === 'edit' && open) {
      fetchEditFields();
    }
  }, [mode, open]);

  const fetchEditFields = async () => {
    setLoadingFields(true);
    try {
      const response = await axiosInstance.get('/prod/products/edit-fields');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setFields(response.data.data);
        // By default, select all fields
        setSelectedFields(response.data.data);
      } else {
        toast.error('Failed to parse editable fields from server');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch product edit fields');
    } finally {
      setLoadingFields(false);
    }
  };

  if (!open) return null;

  // Toggle field selection
  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const selectAllFields = () => setSelectedFields(fields);
  const selectNoFields = () => setSelectedFields([]);

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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

  // Download template
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    const toastId = toast.loading('Generating template...');
    try {
      if (mode === 'edit') {
        let skusArr: string[] = [""];
        let finalPrepopulate = prepopulateType === 'with-data';

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

        // Edit template requires POST payload containing selected fields
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
        link.setAttribute('download', `product_edit_template_${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Standard templates use GET
        const config = MODE_CONFIG[mode];
        const response = await axiosInstance.get(config.templateUrl, {
          responseType: 'blob',
          headers: {
            Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        });
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = mode === 'create'
          ? `product_creation_template_${Date.now()}.xlsx`
          : mode === 'status'
            ? `product_status_update_template_${Date.now()}.xlsx`
            : `product_offline_status_template_${Date.now()}.xlsx`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast.success('Template downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download template', { id: toastId });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Submit excel file upload
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResults(null);
    const toastId = toast.loading('Uploading template data...');
    try {
      const config = MODE_CONFIG[mode];
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axiosInstance.post(config.uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/x-ndjson'
        }
      });

      // Parse ndjson or JSON response
      const data = response.data;
      let parsedLines: any[] = [];
      if (typeof data === 'string') {
        parsedLines = data.split('\n')
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
        toast.success(`Successfully processed ${successCount} rows!`, { id: toastId });
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Processed ${successCount} successfully, ${failCount} failed.`, { id: toastId });
      } else {
        toast.error(`Failed to process all ${failCount} rows.`, { id: toastId });
      }

      // Trigger product list refresh
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload spreadsheet', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const activeConfig = MODE_CONFIG[mode];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Bulk Product Upload
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select your import type, download sample Excel file, and upload results.
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
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 flex flex-col lg:flex-row gap-6">
          {/* Left panel: Mode Selector & Details */}
          <div className="w-full lg:w-1/3 flex flex-col space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Import Type
              </label>
              <div className="flex flex-col space-y-1.5">
                {(['create', 'edit', 'status', 'offline'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setSelectedFile(null);
                      setResults(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all border flex items-center justify-between ${
                      mode === m
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-400'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-100'
                    }`}
                  >
                    <span>{MODE_CONFIG[m].title}</span>
                    <span className="text-[10px] opacity-70 font-semibold">{MODE_CONFIG[m].subtitle}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Config Description */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-blue-650 dark:text-blue-400 font-bold">
                <Info size={14} />
                <span>Description</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {activeConfig.description}
              </p>
            </div>

            {/* Template Downloader */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-3">
              <span className="font-bold text-slate-600 dark:text-slate-350 block">Template Generation</span>
              {mode !== 'edit' ? (
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Download size={14} />
                  Download Excel Template
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500">
                    Select product fields below to include in custom edit template:
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={downloadingTemplate || selectedFields.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Download size={14} />
                    Generate & Download
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Custom field selector (for EDIT mode) or drag & drop zone */}
          <div className="flex-1 flex flex-col space-y-4">
            {mode === 'edit' && fields.length > 0 && (
              <div className="space-y-4">
                {/* Prepopulate Settings & SKU Filter */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3">
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-250 block">
                    Prepopulate Settings
                  </span>
                  
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-350">
                      <input
                        type="radio"
                        name="prepopulateType"
                        value="with-data"
                        checked={prepopulateType === 'with-data' && !skuInputText.trim()}
                        disabled={!!skuInputText.trim()}
                        onChange={() => setPrepopulateType('with-data')}
                        className="text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 w-3.5 h-3.5"
                      />
                      <span>With Data</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-350">
                      <input
                        type="radio"
                        name="prepopulateType"
                        value="without-data"
                        checked={prepopulateType === 'without-data' || !!skuInputText.trim()}
                        onChange={() => setPrepopulateType('without-data')}
                        className="text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 w-3.5 h-3.5"
                      />
                      <span>Without Data {skuInputText.trim() ? '(Forced by SKU list)' : ''}</span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Specific SKUs (Optional, Comma or Newline Separated)
                    </label>
                    <textarea
                      rows={2}
                      value={skuInputText}
                      onChange={(e) => setSkuInputText(e.target.value)}
                      placeholder="e.g. APR-ACS-FSJ-0005, APR-ACS-FSJ-0002"
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 rounded-xl focus:ring-2 focus:ring-blue-500/25 focus:border-blue-550 outline-none resize-none font-mono"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Fields to Edit ({selectedFields.length} of {fields.length})
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
                  <div className="py-8 flex justify-center text-slate-400 text-xs gap-1.5 items-center">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Loading available fields...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto scrollbar-thin pr-1 text-slate-750 dark:text-slate-300">
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
            </div>
            )}

            {/* Drag & Drop File Zone */}
            <div
              className={`flex-1 min-h-[180px] border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
                  : 'border-slate-205 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/5'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <label className="cursor-pointer group flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedFile ? (
                      <span className="text-blue-600 dark:text-blue-400">{selectedFile.name}</span>
                    ) : (
                      <span>
                        Drag & Drop your Excel file here or <span className="text-blue-600 dark:text-blue-400 hover:underline">Browse</span>
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Accepts only .xlsx and .xls Excel files.
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {/* Upload actions */}
              {selectedFile && (
                <div className="flex items-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all"
                  >
                    Remove File
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    {uploading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    {uploading ? 'Processing...' : 'Submit Import'}
                  </button>
                </div>
              )}
            </div>

            {/* Results output list */}
            {results && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col max-h-[220px]">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-350">
                    Import Processing Summary
                  </span>
                  <span className="text-[10px] bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                    {results.length} Rows Processed
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-850 p-2 space-y-1">
                  {results.map((row, idx) => (
                    <div key={`res-row-${idx}`} className="flex items-center justify-between py-1.5 px-2 text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        {row.success ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-red-50 dark:bg-red-950/40 text-red-655 flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={10} strokeWidth={3} />
                          </div>
                        )}
                        <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {row.sku || 'Row ' + (idx + 1)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {row.productName || ''}
                        </span>
                      </div>
                      <span className={`font-semibold ${row.success ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.message || (row.success ? 'Success' : 'Failed')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
