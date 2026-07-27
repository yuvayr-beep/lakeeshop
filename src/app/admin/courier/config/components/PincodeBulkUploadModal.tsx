'use client';
import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner } from '@/types/courier';
import { BulkPincodeItem } from '@/types/courierPincode';

interface PincodeBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courier: CourierPartner | null;
}

export default function PincodeBulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
  courier,
}: PincodeBulkUploadModalProps) {
  const [uploadMode, setUploadMode] = useState<'UPSERT' | 'OVERWRITE'>('UPSERT');
  const [parsedData, setParsedData] = useState<BulkPincodeItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [activeInputType, setActiveInputType] = useState<'FILE' | 'JSON'>('FILE');
  const [rawJsonText, setRawJsonText] = useState<string>('');

  if (!isOpen) return null;

  // SheetJS Loader
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
    const toastId = toast.loading('Generating Pincode Template...');
    try {
      // Try direct API download first
      try {
        const params: Record<string, any> = {};
        if (courier?.id) {
          params.courierId = courier.id;
        }
        const response = await axiosInstance.get('/courier/serviceable-pincodes/template/download', {
          params,
          responseType: 'blob',
        });
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${courier?.courierCode || 'Courier'}_Serviceable_Pincodes_Template.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Template downloaded successfully!', { id: toastId });
        return;
      } catch (e) {
        console.warn('API download endpoint unavailable, generating template locally via SheetJS...', e);
      }

      // Fallback local template generation matching spec
      const XLSX = await loadSheetJS();

      const sampleData = [
        {
          courierCode: courier?.courierCode || 'DELHIVERY',
          serviceCode: 'DLRY_DP',
          shipMode: 'DP',
          zoneCode: 'ZONE_A',
          pincode: '110001',
          cityName: 'New Delhi',
          handlingCityCode: 'DEL',
          handlingBranchCode: 'DEL-HUB',
          stateName: 'Delhi',
          stateCode: 'DL',
        },
        {
          courierCode: courier?.courierCode || 'DELHIVERY',
          serviceCode: 'DLRY_SURFACE',
          shipMode: 'SURFACE',
          zoneCode: 'METRO',
          pincode: '400001',
          cityName: 'Mumbai',
          handlingCityCode: 'BOM',
          handlingBranchCode: 'BOM-CENTRAL',
          stateName: 'Maharashtra',
          stateCode: 'MH',
        },
        {
          courierCode: courier?.courierCode || 'DELHIVERY',
          serviceCode: 'DLRY_SURFACE',
          shipMode: 'SURFACE',
          zoneCode: 'ZONE_B',
          pincode: '600028',
          cityName: 'Chennai',
          handlingCityCode: 'MAA',
          handlingBranchCode: 'EGM',
          stateName: 'Tamil Nadu',
          stateCode: 'TN',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pincodes');
      XLSX.writeFile(wb, `Courier_Serviceable_Pincodes_Template.xlsx`);
      toast.success('Template generated and downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Failed to download template:', err);
      toast.error('Failed to download template file.', { id: toastId });
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

          const formatted: BulkPincodeItem[] = rawRows.map((r) => ({
            courierCode: String(r.courierCode || r['Courier Code'] || courier?.courierCode || '').trim(),
            serviceCode: String(r.serviceCode || r['Service Code'] || '').trim() || undefined,
            shipMode: String(r.shipMode || r['Ship Mode'] || 'SURFACE').trim(),
            zoneCode: String(r.zoneCode || r['Zone Code'] || 'METRO').trim(),
            pincode: String(r.pincode || r['Pincode'] || '').replace(/\D/g, ''),
            cityName: String(r.cityName || r['City Name'] || '').trim(),
            handlingCityCode: String(r.handlingCityCode || r['Handling City'] || '').trim(),
            handlingBranchCode: String(r.handlingBranchCode || r['Handling Branch'] || '').trim(),
            stateName: String(r.stateName || r['State Name'] || '').trim(),
            stateCode: String(r.stateCode || r['State Code'] || '').trim(),
          })).filter((item) => item.pincode.length === 6);

          if (formatted.length === 0) {
            toast.error('No valid 6-digit pincode rows found in file.');
          } else {
            setParsedData(formatted);
            toast.success(`Successfully parsed ${formatted.length} pincodes from ${file.name}`);
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

  // Handle JSON Input Parsing
  const handleParseJson = () => {
    if (!rawJsonText.trim()) return;
    try {
      const parsed = JSON.parse(rawJsonText);
      if (!Array.isArray(parsed)) {
        toast.error('Input must be a valid JSON array of pincode objects.');
        return;
      }
      const formatted: BulkPincodeItem[] = parsed.map((item) => ({
        courierCode: String(item.courierCode || courier?.courierCode || '').trim(),
        serviceCode: item.serviceCode ? String(item.serviceCode).trim() : undefined,
        shipMode: String(item.shipMode || 'SURFACE').trim(),
        zoneCode: String(item.zoneCode || 'METRO').trim(),
        pincode: String(item.pincode || '').replace(/\D/g, ''),
        cityName: String(item.cityName || '').trim(),
        handlingCityCode: String(item.handlingCityCode || '').trim(),
        handlingBranchCode: String(item.handlingBranchCode || '').trim(),
        stateName: String(item.stateName || '').trim(),
        stateCode: String(item.stateCode || '').trim(),
      })).filter((i) => i.pincode.length === 6);

      setParsedData(formatted);
      toast.success(`Parsed ${formatted.length} pincodes from JSON.`);
    } catch (err) {
      toast.error('Invalid JSON payload syntax.');
    }
  };

  // Submit Bulk Upload API Call
  const handleUploadSubmit = async () => {
    if (activeInputType === 'FILE' && selectedFile) {
      setUploading(true);
      const toastId = toast.loading(`Uploading Excel file in ${uploadMode} mode...`);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await axiosInstance.post(
          `/courier/serviceable-pincodes/upload?mode=${uploadMode}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        const msg = res.data?.message || `Uploaded pincodes successfully in ${uploadMode} mode!`;
        toast.success(msg, { id: toastId });
        onSuccess();
        onClose();
      } catch (err: any) {
        console.error('Excel file upload failed:', err);
        const errMsg = err.response?.data?.message || 'Failed to upload Excel pincodes file.';
        toast.error(errMsg, { id: toastId });
      } finally {
        setUploading(false);
      }
      return;
    }

    if (parsedData.length === 0) {
      toast.error('Please select an Excel file or enter a valid JSON array of pincodes.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading ${parsedData.length} pincodes via JSON in ${uploadMode} mode...`);

    try {
      const res = await axiosInstance.post(
        `/courier/serviceable-pincodes/json-upload?mode=${uploadMode}`,
        parsedData
      );
      const msg = res.data?.message || `Uploaded ${parsedData.length} pincodes via JSON in ${uploadMode} mode!`;
      toast.success(msg, { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('JSON upload failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to upload pincodes via JSON.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                Bulk Upload Serviceable Pincodes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload Excel spreadsheet or JSON dataset for carrier serviceability
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
              <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Pre-Formatted Excel Upload Template</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                Download formatted Excel file with sample columns for courier code, ship mode, zone, pincode, and state mapping.
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
              Upload Synchronization Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  uploadMode === 'UPSERT'
                    ? 'border-[var(--primary)] bg-[var(--primary-light-bg)] text-[var(--primary)]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="UPSERT"
                  checked={uploadMode === 'UPSERT'}
                  onChange={() => setUploadMode('UPSERT')}
                  className="mt-0.5 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <div>
                  <p className="text-xs font-bold">UPSERT Mode</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Update existing pincode rules and insert new entries seamlessly</p>
                </div>
              </label>

              <label
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  uploadMode === 'OVERWRITE'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="OVERWRITE"
                  checked={uploadMode === 'OVERWRITE'}
                  onChange={() => setUploadMode('OVERWRITE')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-xs font-bold">OVERWRITE Mode</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Replace all matching pincode serviceability records</p>
                </div>
              </label>
            </div>
          </div>

          {/* Input Method Toggle: File vs JSON */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveInputType('FILE')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeInputType === 'FILE'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Excel / CSV Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveInputType('JSON')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeInputType === 'JSON'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Bulk JSON Array Input
            </button>
          </div>

          {/* Input Panel */}
          {activeInputType === 'FILE' ? (
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
          ) : (
            <div className="space-y-2">
              <textarea
                rows={6}
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                placeholder='[{"courierCode":"DELHIVERY","shipMode":"SURFACE","pincode":"110001","cityName":"New Delhi","stateName":"Delhi"}]'
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-emerald-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                type="button"
                onClick={handleParseJson}
                className="px-3.5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Parse JSON Payload
              </button>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsing ? (
            <div className="py-6 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
              Parsing spreadsheet rows...
            </div>
          ) : parsedData.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Preview Ready ({parsedData.length} pincodes)</span>
                <span className="text-[11px] text-emerald-600 font-medium">Valid entries verified</span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 scrollbar-thin">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold sticky top-0">
                      <th className="p-2">#</th>
                      <th className="p-2">Courier</th>
                      <th className="p-2">Pincode</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">City</th>
                      <th className="p-2">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2 text-slate-400 font-sans">{i + 1}</td>
                        <td className="p-2 font-bold">{row.courierCode}</td>
                        <td className="p-2 font-bold text-[var(--primary)]">{row.pincode}</td>
                        <td className="p-2">{row.shipMode}</td>
                        <td className="p-2">{row.cityName || '-'}</td>
                        <td className="p-2">{row.stateName || '-'}</td>
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
            disabled={uploading || parsedData.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Uploading...' : `Upload ${parsedData.length} Pincodes`}
          </button>
        </div>
      </div>
    </div>
  );
}
