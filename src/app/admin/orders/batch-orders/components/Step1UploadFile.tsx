'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Trash2, ArrowRight, Search, FileUp, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchOrderItem } from '@/types/batchOrder';

interface Step1UploadFileProps {
  onBatchCreated: (batchId: number, uploadResult?: any) => void;
  onResumeBatch: (batchId: number) => void;
}

export const Step1UploadFile: React.FC<Step1UploadFileProps> = ({
  onBatchCreated,
  onResumeBatch,
}) => {
  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('33');
  const [businessUnitId, setBusinessUnitId] = useState<string>('6');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [orderFileDate, setOrderFileDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Batch List State
  const [batchList, setBatchList] = useState<BatchOrderItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const clientOptions = [
    { id: '33', name: 'AXIS BANK', buId: '6' },
    { id: '34', name: 'EARNEST', buId: '6' },
    { id: '35', name: 'XOXODAY', buId: '6' },
    { id: '36', name: 'HDFC BANK', buId: '6' },
    { id: '37', name: 'ICICI BANK', buId: '6' },
  ];

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await batchOrderService.getBatchList();
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        setBatchList(list);
      } else {
        setBatchList([]);
      }
    } catch (err) {
      console.warn('Could not fetch batch list:', err);
      setBatchList([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select an Order Excel file to upload.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const res = await batchOrderService.uploadBatch(
        Number(selectedClientId),
        Number(businessUnitId),
        1,
        selectedFile
      );

      const batchData = res?.data || res;
      const batchId = batchData?.batchId;

      if (!batchId) {
        throw new Error(res?.message || 'Upload succeeded but batch ID was not returned.');
      }

      await batchOrderService.validateBatch(batchId);
      onBatchCreated(batchId, batchData);
    } catch (err: any) {
      console.error('Batch Upload Error:', err);
      const msg = err.response?.data?.message || err.message || 'Error uploading order file.';
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (!window.confirm(`Are you sure you want to delete batch #${batchId}?`)) return;

    try {
      await batchOrderService.deleteBatch(batchId);
      fetchBatches();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete batch.');
    }
  };

  const filteredBatches = batchList.filter(
    (b) =>
      b.batchNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(b.batchId).includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Upload Order File Form Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Batch Order Excel Upload
            </h2>
            <p className="text-xs text-slate-500">
              Select client details and upload batch order spreadsheet (.xlsx, .csv)
            </p>
          </div>
        </div>

        <form onSubmit={handleUploadSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Client Name <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const found = clientOptions.find((c) => c.id === e.target.value);
                  if (found) setBusinessUnitId(found.buId);
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Order File Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={orderFileDate}
                onChange={(e) => setOrderFileDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Order File (.xlsx, .csv) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700"
              />
              {selectedFile && (
                <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold dark:text-emerald-400">
                  Ready: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading & Parsing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Batch File
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Batch History Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Order Batches
            </h3>
            <p className="text-xs text-slate-500">
              List of order batches and parsing status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBatches}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch or client..."
                className="w-56 rounded-xl border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold uppercase">CLIENT NAME</th>
                <th className="px-4 py-3 font-semibold uppercase">ORDER DATE</th>
                <th className="px-4 py-3 font-semibold uppercase">BATCH NO</th>
                <th className="px-4 py-3 font-semibold uppercase">TOTAL COUNT</th>
                <th className="px-4 py-3 font-semibold uppercase">PASS COUNT</th>
                <th className="px-4 py-3 font-semibold uppercase">FAIL COUNT</th>
                <th className="px-4 py-3 text-center font-semibold uppercase">ACTION</th>
                <th className="px-4 py-3 text-center font-semibold uppercase">DELETE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingBatches ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    <span className="mt-2 block text-xs">Loading order batches...</span>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No order batches found. Upload an order file above to create a new batch.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr
                    key={b.batchId || b.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {b.clientName || 'XOXODAY'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {b.orderDate || new Date().toISOString().split('T')[0]}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {b.batchNo || `202600${b.batchId}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                      {b.totalRows ?? 0}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold dark:text-emerald-400">
                      {b.savedRows ?? b.passRows ?? 0}
                    </td>
                    <td className="px-4 py-3 text-red-600 font-semibold dark:text-red-400">
                      {b.failedRows ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onResumeBatch(b.batchId)}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                      >
                        <span>Resume</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteBatch(b.batchId)}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
