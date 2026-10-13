'use client';
import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner } from '@/types/courier';

interface ZoneBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courier: CourierPartner | null;
}

interface ZoneUploadRow {
  shipMode: string;
  zoneCode: string;
  zoneName: string;
}

export default function ZoneBulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
  courier,
}: ZoneBulkUploadModalProps) {
  const [uploadMode, setUploadMode] = useState<'UPSERT' | 'OVERWRITE'>('UPSERT');
  const [parsedData, setParsedData] = useState<ZoneUploadRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  // SheetJS Loader helper
  const loadSheetJS = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        resolve((window as any).XLSX);
      };
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  // Download Excel Template Handler
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading Zones Excel Template...');
    const courierId = courier?.id || 1;

    try {
      // Primary API endpoint: /courier/zones/template/download?courierId=1
      try {
        const response = await axiosInstance.get('/courier/zones/template/download', {
          params: { courierId },
          responseType: 'blob',
        });
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${courier?.courierCode || 'Courier'}_Zones_Template.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Zones template downloaded successfully!', { id: toastId });
        return;
      } catch (e1) {
        console.warn('First download endpoint failed, trying /courier/zones/template...', e1);
        try {
          const response = await axiosInstance.get('/courier/zones/template', {
            params: { courierId },
            responseType: 'blob',
          });
          const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${courier?.courierCode || 'Courier'}_Zones_Template.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('Zones template downloaded successfully!', { id: toastId });
          return;
        } catch (e2) {
          console.warn('API download endpoints unavailable, generating template locally via SheetJS...', e2);
        }
      }

      // Fallback local template generation
      const XLSX = await loadSheetJS();

      const sampleData = [
        {
          shipMode: 'SURFACE',
          zoneCode: 'ZONE_A',
          zoneName: 'Within City / Local',
        },
        {
          shipMode: 'SURFACE',
          zoneCode: 'ZONE_B',
          zoneName: 'Within State / Regional',
        },
        {
          shipMode: 'DP',
          zoneCode: 'METRO',
          zoneName: 'Metro to Metro Priority Air',
        },
        {
          shipMode: 'SURFACE',
          zoneCode: 'ROI',
          zoneName: 'Rest of India (Fallback)',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Zones');
      XLSX.writeFile(wb, `${courier?.courierCode || 'Courier'}_Zones_Template.xlsx`);
      toast.success('Template generated and downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Failed to download zones template:', err);
      toast.error('Failed to download zones template file.', { id: toastId });
    }
  };

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setParsing(true);
    setParsedData([]);

    try {
      const XLSX = await loadSheetJS();
      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

          const formatted: ZoneUploadRow[] = rawRows.map((r) => ({
            shipMode: String(r.shipMode || r['Ship Mode'] || r['ship_mode'] || 'SURFACE').trim(),
            zoneCode: String(r.zoneCode || r['Zone Code'] || r['zone_code'] || '').trim(),
            zoneName: String(r.zoneName || r['Zone Name'] || r['zone_name'] || '').trim(),
          })).filter((item) => item.zoneCode.length > 0);

          if (formatted.length === 0) {
            toast.error('No valid zone rows found in Excel file.');
          } else {
            setParsedData(formatted);
            toast.success(`Parsed ${formatted.length} zone records from ${file.name}`);
          }
        } catch (err) {
          console.error('Sheet parsing error:', err);
          toast.error('Failed to parse Excel file format.');
        } finally {
          setParsing(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      toast.error('Failed to read file.');
      setParsing(false);
    }
  };

  // Submit Bulk Upload API Call: POST /courier/zones/upload?mode=OVERWRITE|UPSERT
  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading zones Excel file in ${uploadMode} mode...`);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await axiosInstance.post(
        `/courier/zones/upload?mode=${uploadMode}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const msg = res.data?.message || `Zones uploaded successfully in ${uploadMode} mode`;
      toast.success(msg, { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Zones Excel upload failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to upload Courier Zones file.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                Bulk Upload Courier Zones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload Excel spreadsheet for zone mapping ({courier?.courierName || 'Selected Courier'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Action Row: Download Template */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Download Excel Template</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                Download formatted Excel file with sample columns for ship mode, zone code, and zone name.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors whitespace-nowrap"
            >
              <Download size={15} />
              Download Template
            </button>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Upload Mode <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  uploadMode === 'UPSERT'
                    ? 'border-[var(--primary)] bg-[var(--primary-light-bg)] text-[var(--primary)]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="uploadMode"
                  value="UPSERT"
                  checked={uploadMode === 'UPSERT'}
                  onChange={() => setUploadMode('UPSERT')}
                  className="mt-0.5 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <div>
                  <p className="text-xs font-bold">UPSERT Mode</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Insert new zones and update existing zone records</p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  uploadMode === 'OVERWRITE'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="uploadMode"
                  value="OVERWRITE"
                  checked={uploadMode === 'OVERWRITE'}
                  onChange={() => setUploadMode('OVERWRITE')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-xs font-bold">OVERWRITE Mode</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Replace all existing courier zone configurations</p>
                </div>
              </label>
            </div>
          </div>

          {/* File Upload Box */}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 transition-colors">
            <Upload size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Drag & Drop Excel File here, or click to browse
            </p>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">Supports .xlsx, .xls, and .csv files</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow transition-colors">
              <FileSpreadsheet size={15} />
              Browse Excel File
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileName && (
              <p className="text-xs font-bold text-[var(--primary)] mt-3">Selected File: {fileName}</p>
            )}
          </div>

          {/* Parsed Preview Table */}
          {parsing ? (
            <div className="py-6 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
              Parsing spreadsheet rows...
            </div>
          ) : parsedData.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Preview Ready ({parsedData.length} zones)</span>
                <span className="text-[11px] text-emerald-600 font-medium">Valid zone records verified</span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 scrollbar-thin">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold sticky top-0">
                      <th className="p-2">#</th>
                      <th className="p-2">Ship Mode</th>
                      <th className="p-2">Zone Code</th>
                      <th className="p-2">Zone Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2 text-slate-400 font-sans">{i + 1}</td>
                        <td className="p-2 font-bold">{row.shipMode}</td>
                        <td className="p-2 font-bold text-[var(--primary)]">{row.zoneCode}</td>
                        <td className="p-2 font-sans">{row.zoneName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-[10px] text-slate-400 text-right">...and {parsedData.length - 10} more rows</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={uploading || !selectedFile}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Uploading...' : `Upload Zones (${parsedData.length > 0 ? parsedData.length : 'File'})`}
          </button>
        </div>
      </div>
    </div>
  );
}
