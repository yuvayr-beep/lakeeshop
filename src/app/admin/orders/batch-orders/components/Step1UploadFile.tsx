'use client';

import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, Trash2, ArrowRight, FileSpreadsheet, Search, Loader2 } from 'lucide-react';
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

  // Combine Online State
  const [combineClientId, setCombineClientId] = useState<string>('33');
  const [combining, setCombining] = useState<boolean>(false);

  // Batch List State
  const [batchList, setBatchList] = useState<BatchOrderItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sample client dropdown list (Can be populated dynamically or static default fallback)
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
      console.warn('Could not fetch batch list, fallback to empty:', err);
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
      setErrorMessage('Please select an Order Excel file.');
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
        throw new Error(res?.message || 'Upload succeeded but batchId was not returned.');
      }

      // Immediately trigger validation engine for this batch
      await batchOrderService.validateBatch(batchId);

      // Pass result to parent to transition to Step 2 / Step 3
      onBatchCreated(batchId, batchData);
    } catch (err: any) {
      console.error('Batch Upload Error:', err);
      const msg = err.response?.data?.message || err.message || 'Error uploading file.';
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleCombineOnline = async () => {
    setCombining(true);
    setErrorMessage(null);

    try {
      const res = await batchOrderService.combineOnlineOrders(Number(combineClientId));
      const batchId = res?.data?.batchId || res?.batchId;

      if (batchId) {
        await batchOrderService.validateBatch(batchId);
        onBatchCreated(batchId, res?.data || res);
      } else {
        fetchBatches();
      }
    } catch (err: any) {
      console.error('Combine Online Error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to combine online orders.');
    } finally {
      setCombining(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (!window.confirm(`Are you sure you want to abort/delete batch #${batchId}?`)) return;

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

      {/* Top Grid: Upload File Box & Combine Online Box */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload Order File Box (Spans 2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Upload Order File
          </h2>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Your Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    const found = clientOptions.find((c) => c.id === e.target.value);
                    if (found) setBusinessUnitId(found.buId);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Order File Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={orderFileDate}
                  onChange={(e) => setOrderFileDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Upload Your Order File <span className="text-red-500">*</span> (.xlsx, .csv)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300"
                />
              </div>
              {selectedFile && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Selected file: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading & Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Combine Online Orders Box (Spans 1 column) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Combine Online Orders
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Your Client <span className="text-red-500">*</span>
              </label>
              <select
                value={combineClientId}
                onChange={(e) => setCombineClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={handleCombineOnline}
                disabled={combining}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {combining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Combining...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Combine
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Batch History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700">
              Copy
            </button>
            <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700">
              CSV
            </button>
            <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700">
              Excel
            </button>
            <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700">
              PDF
            </button>
            <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700">
              Print
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Search:</span>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Search batches..."
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold uppercase">CLIENT NAME</th>
                <th className="px-4 py-3 font-semibold uppercase">ORDER DATE</th>
                <th className="px-4 py-3 font-semibold uppercase">BATCH NO</th>
                <th className="px-4 py-3 font-semibold uppercase">TOTAL ORDER COUNT</th>
                <th className="px-4 py-3 font-semibold uppercase">TOTAL PASS COUNT</th>
                <th className="px-4 py-3 font-semibold uppercase">TOTAL FAIL COUNT</th>
                <th className="px-4 py-3 text-center font-semibold uppercase">ACTION</th>
                <th className="px-4 py-3 text-center font-semibold uppercase">DELETE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingBatches ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    <span className="mt-2 block">Loading batches...</span>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No batch orders found. Upload an order file to start.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr
                    key={b.batchId || b.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
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
                        title="Resume Wizard"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow hover:bg-amber-600 transition-colors"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteBatch(b.batchId)}
                        title="Delete / Abort Batch"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
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
