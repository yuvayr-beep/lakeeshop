'use client';
import React, { useState } from 'react';
import { X, Upload, Download, FileText, Check, AlertCircle, RefreshCw, Info } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface AlternateImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const loadSheetJS = () => {
  return new Promise<any>((resolve, reject) => {
    if ((window as any).XLSX) {
      resolve((window as any).XLSX);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    if ('success' in raw && 'data' in raw) {
      return parseNdjson(raw.data);
    }
    return [raw];
  }
  const str = String(raw).trim();
  if (!str) return [];

  const lines = str.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: any[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed && Array.isArray(parsed.data)) {
        results.push(...parsed.data);
      } else {
        results.push(parsed);
      }
    } catch {
      // skip unparseable line
    }
  }

  return results;
};

export default function AlternateImportModal({ open, onClose, onSuccess }: AlternateImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!open) return null;

  // Handle template download using official API
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    const toastId = toast.loading('Downloading Excel template...');
    try {
      const response = await axiosInstance.post(
        '/prod/alternate/template',
        {
          prepopulateAll: true,
          fields: [],
        },
        {
          responseType: 'blob',
          headers: {
            Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Type': 'application/json',
          },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alternate_products_template_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Failed to download template:', err);
      toast.error('Failed to download template from server', { id: toastId });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Drag & Drop
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
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Upload Excel file directly to backend API
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResults(null);
    const toastId = toast.loading('Uploading and processing file...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axiosInstance.post('/prod/alternate/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/x-ndjson',
        },
      });

      const parsedNdjson = parseNdjson(response.data);

      const processResults = parsedNdjson.map((item: any, idx: number) => ({
        sku: item.key || `Row ${idx + 2}`,
        productName: item.key ? `Mapping` : `Row ${idx + 2}`,
        success: Boolean(item.success),
        message: item.message || (item.success ? 'Alternate mapping updated successfully' : 'Error processing row'),
      }));

      setResults(processResults);
      const successCount = processResults.filter((x) => x.success).length;
      const failCount = processResults.filter((x) => !x.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully processed ${successCount} alternate mappings!`, { id: toastId });
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Processed ${successCount} successfully, ${failCount} failed.`, { id: toastId });
      } else {
        toast.error(`Failed to process ${failCount} rows.`, { id: toastId });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload and process Excel file.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // Export errors
  const handleExportErrorsExcel = async () => {
    if (!results || results.length === 0) return;
    const errorRows = results.filter((r) => !r.success);
    const dataToExport = errorRows.length > 0 ? errorRows : results;

    const toastId = toast.loading('Exporting error report to Excel...');
    try {
      const headers = ['Mapping / Line', 'Row Info', 'Status', 'Error Details'];
      const rows = dataToExport.map((row) => [
        row.sku,
        row.productName,
        row.success ? 'Success' : 'Failed',
        row.message,
      ]);

      const XLSX = await loadSheetJS();
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 60 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alternate Import Errors');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alternate_import_errors_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${dataToExport.length} rows to Excel`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export error report', { id: toastId });
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
              Bulk Alternate Products Upload
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Download template spreadsheet, fill product IDs, and upload mappings in bulk.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
          {/* Download Template Box */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">Sample Template</span>
              <p className="text-[11px] text-blue-700 dark:text-blue-400">
                Download formatted Excel template with sample Primary and Alternate product IDs.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
            >
              <Download size={13} /> Download Template
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
              dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="group flex flex-col items-center justify-center space-y-3 pointer-events-none">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {selectedFile ? (
                    <span className="text-blue-600 dark:text-blue-400">{selectedFile.name}</span>
                  ) : (
                    <span>Drag & Drop your Excel file here or <span className="text-blue-600 hover:underline">Browse</span></span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Accepts .xlsx and .xls Excel files</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 text-xs font-bold rounded-xl"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  {uploading ? 'Processing...' : 'Start Import'}
                </button>
              </div>
            )}
          </div>

          {/* Import Processing Summary */}
          {results && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col max-h-[220px]">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-350">Import Processing Summary</span>
                  {results.filter((x) => !x.success).length > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> {results.filter((x) => !x.success).length} Errors
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-bold font-mono">
                    {results.length} Processed
                  </span>
                  <button
                    type="button"
                    onClick={handleExportErrorsExcel}
                    title="Download Errors Excel Report"
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Download size={13} />
                    <span className="text-[11px]">Errors Excel</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-850 p-2 space-y-1">
                {results.map((row, idx) => (
                  <div key={`imp-${idx}`} className="flex items-center justify-between py-1.5 px-2 text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      {row.success ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                          <AlertCircle size={10} strokeWidth={3} />
                        </div>
                      )}
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{row.sku}</span>
                    </div>
                    <span className={`font-semibold ${row.success ? 'text-emerald-600' : 'text-red-500'}`}>{row.message}</span>
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
