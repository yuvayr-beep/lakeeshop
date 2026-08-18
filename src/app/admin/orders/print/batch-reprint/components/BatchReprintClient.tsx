'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Tag,
  Grid,
  Layers,
  XCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ValidReprintItem,
  InvalidReprintItem,
  ValidateIdentifiersResponseData,
  ReprintRequestPayload,
  InvoicePrintLayoutFormat,
  InvoiceDocType,
} from '@/types/invoicePrint';
import { invoicePrintService } from '@/services/invoicePrint.service';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function BatchReprintClient() {
  // Input State
  const [rawInputText, setRawInputText] = useState('');
  const [docType, setDocType] = useState<InvoiceDocType>('challan');

  // Loading States
  const [isValidating, setIsValidating] = useState(false);
  const [printingAction, setPrintingAction] = useState<string | null>(null);

  // Validation Result State
  const [validationResult, setValidationResult] =
    useState<ValidateIdentifiersResponseData | null>(null);

  // Selected Valid Items for Reprint
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<string[]>([]);

  // Pagination State for Valid Items
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Helper to parse comma-separated or newline-separated identifiers
  const parsedIdentifiers = useMemo(() => {
    if (!rawInputText.trim()) return [];
    return rawInputText
      .split(/[\n,\r]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [rawInputText]);

  // Handle Validate / Search Button Click
  const handleValidateIdentifiers = async () => {
    if (parsedIdentifiers.length === 0) {
      toast.warning('Please enter at least one order identifier or reference number');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setSelectedIdentifiers([]);

    try {
      const data = await invoicePrintService.validateReprintIdentifiers(parsedIdentifiers);
      setValidationResult(data);

      // Auto-select all valid items by default
      if (data?.validItems && data.validItems.length > 0) {
        setSelectedIdentifiers(data.validItems.map((item) => item.identifier));
        toast.success(
          `Validated ${data.validCount} valid item(s), ${data.invalidCount} invalid item(s).`
        );
      } else {
        toast.error('No valid items found matching the submitted identifiers.');
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to validate identifiers';
      toast.error(msg);
    } finally {
      setIsValidating(false);
    }
  };

  // Clear Input & Results
  const handleClearAll = () => {
    setRawInputText('');
    setValidationResult(null);
    setSelectedIdentifiers([]);
    setCurrentPage(1);
  };

  // Multiselect Handlers
  const validItems = validationResult?.validItems || [];
  const invalidItems = validationResult?.invalidItems || [];

  const handleToggleSelectItem = (identifier: string) => {
    setSelectedIdentifiers((prev) =>
      prev.includes(identifier)
        ? prev.filter((id) => id !== identifier)
        : [...prev, identifier]
    );
  };

  const isAllSelected = useMemo(() => {
    if (validItems.length === 0) return false;
    return validItems.every((item) => selectedIdentifiers.includes(item.identifier));
  }, [validItems, selectedIdentifiers]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIdentifiers([]);
    } else {
      setSelectedIdentifiers(validItems.map((item) => item.identifier));
    }
  };

  // Selected Item Objects
  const selectedValidItems = useMemo(() => {
    return validItems.filter((item) => selectedIdentifiers.includes(item.identifier));
  }, [validItems, selectedIdentifiers]);

  // Construct ReprintRequestPayload from selected valid items
  const buildReprintPayload = (items: ValidReprintItem[]): ReprintRequestPayload => {
    const packRefNos = Array.from(
      new Set(items.map((i) => i.packRefNo).filter(Boolean) as string[])
    );
    const awbNumbers = Array.from(
      new Set(items.map((i) => i.awbNumber).filter(Boolean) as string[])
    );
    const executionRefNos = Array.from(
      new Set(items.map((i) => i.executionRefNo).filter(Boolean) as string[])
    );
    const orderRefNos = Array.from(
      new Set(items.map((i) => i.orderRefNo).filter(Boolean) as string[])
    );
    const invoiceNumbers = Array.from(
      new Set(items.map((i) => i.invoiceNumber).filter(Boolean) as string[])
    );
    const batchNos = Array.from(
      new Set(items.map((i) => i.batchNo).filter(Boolean) as string[])
    );

    return {
      packRefNos: packRefNos.length ? packRefNos : undefined,
      awbNumbers: awbNumbers.length ? awbNumbers : undefined,
      executionRefNos: executionRefNos.length ? executionRefNos : undefined,
      orderRefNos: orderRefNos.length ? orderRefNos : undefined,
      invoiceNumbers: invoiceNumbers.length ? invoiceNumbers : undefined,
      batchNos: batchNos.length ? batchNos : undefined,
    };
  };

  // Execute Reprint (1x1, 1x4, Multi, or PS)
  const handleExecuteReprint = async (
    targetItems: ValidReprintItem[],
    format: InvoicePrintLayoutFormat | 'ps',
    formatLabel: string
  ) => {
    if (targetItems.length === 0) {
      toast.warning('Please select at least one valid item to reprint');
      return;
    }

    const payload = buildReprintPayload(targetItems);
    const toastId = toast.loading(`Generating ${formatLabel} for ${targetItems.length} item(s)...`);
    setPrintingAction(`reprint-${format}`);

    try {
      await invoicePrintService.reprintValidIdentifiers(payload, format, docType);
      toast.success(`${formatLabel} generated successfully!`, { id: toastId });
    } catch (err: any) {
      console.error(`Batch Reprint ${format} error:`, err);
      const msg = err?.response?.data?.message || err?.message || `Failed to reprint ${formatLabel}`;
      toast.error(msg, { id: toastId });
    } finally {
      setPrintingAction(null);
    }
  };

  // Pagination for Valid Items
  const totalPages = Math.max(1, Math.ceil(validItems.length / itemsPerPage));
  const paginatedValidItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return validItems.slice(start, start + itemsPerPage);
  }, [validItems, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Step 1: Input Textarea & Identifier Validation Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Batch Order Identifier Entry</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter order identifiers (Pack Ref No, AWB No, Execution Ref No, Order Ref No, Client Order No, Invoice No, or Batch No).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Doc Type:
            </span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as InvoiceDocType)}
              className="px-3 py-1.5 text-xs font-bold uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="challan">Challan</option>
              <option value="invoice">Invoice</option>
            </select>
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <textarea
            rows={5}
            value={rawInputText}
            onChange={(e) => setRawInputText(e.target.value)}
            placeholder="Paste or enter identifiers separated by commas or line-by-line (e.g.&#10;2608000181, DLRY1234567890&#10;EX-2026-001&#10;INV-2026-001)"
            className="w-full p-3.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Detected Tokens:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {parsedIdentifiers.length}
              </strong>
            </span>
            <span className="text-[11px] italic">
              Supports comma-separated or line-by-line values
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleClearAll}
            disabled={!rawInputText && !validationResult}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Clear Input & Results</span>
          </button>

          <button
            onClick={handleValidateIdentifiers}
            disabled={parsedIdentifiers.length === 0 || isValidating}
            className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Search & Validate Identifiers ({parsedIdentifiers.length})</span>
          </button>
        </div>
      </div>

      {/* Validation Results Section */}
      {validationResult && (
        <div className="space-y-6">
          
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Submitted</p>
                <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {validationResult.totalSubmitted}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Layers className="h-6 w-6" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Valid Items</p>
                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {validationResult.validCount}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Invalid Items</p>
                <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  {validationResult.invalidCount}
                </h3>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                <XCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Selected for Reprint</p>
                <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                  {selectedIdentifiers.length}
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <CheckSquare className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Valid Items Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
            
            {/* Top Action Bar for Multiselect */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
                >
                  {isAllSelected ? (
                    <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                  <span>{isAllSelected ? 'Deselect All' : 'Select All Valid'}</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  ({selectedIdentifiers.length} of {validItems.length} selected)
                </span>
              </div>

              {/* 4 Reprint Action Buttons for Multiselect */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1x1 Thermal Label */}
                <button
                  onClick={() =>
                    handleExecuteReprint(selectedValidItems, '1x1', '1x1 Thermal Label')
                  }
                  disabled={selectedIdentifiers.length === 0 || Boolean(printingAction)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {printingAction === 'reprint-1x1' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4" />
                  )}
                  <span>1x1 Label ({selectedIdentifiers.length})</span>
                </button>

                {/* 1x4 Sheet Format */}
                <button
                  onClick={() =>
                    handleExecuteReprint(selectedValidItems, '1x4', '1x4 Sheet Format')
                  }
                  disabled={selectedIdentifiers.length === 0 || Boolean(printingAction)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {printingAction === 'reprint-1x4' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Grid className="h-4 w-4" />
                  )}
                  <span>1x4 Sheet ({selectedIdentifiers.length})</span>
                </button>

                {/* Multi-Item Packing Slip */}
                <button
                  onClick={() =>
                    handleExecuteReprint(selectedValidItems, 'multi', 'Multi-Item Packing Slip')
                  }
                  disabled={selectedIdentifiers.length === 0 || Boolean(printingAction)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {printingAction === 'reprint-multi' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                  <span>Multi Slip ({selectedIdentifiers.length})</span>
                </button>

                {/* PS (Packing Slip) */}
                <button
                  onClick={() =>
                    handleExecuteReprint(selectedValidItems, 'ps', 'PS (Packing Slip)')
                  }
                  disabled={selectedIdentifiers.length === 0 || Boolean(printingAction)}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {printingAction === 'reprint-ps' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span>PS ({selectedIdentifiers.length})</span>
                </button>
              </div>
            </div>

            {/* Valid Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 w-16 text-center">S.No</th>
                    <th className="py-3.5 px-4">Identifier</th>
                    <th className="py-3.5 px-4">Matched By</th>
                    <th className="py-3.5 px-4">Invoice / Pack Ref</th>
                    <th className="py-3.5 px-4">AWB / Exec Ref</th>
                    <th className="py-3.5 px-4">Batch No</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4 text-right">Row Reprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {paginatedValidItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                          <p className="text-xs font-medium">No valid items found matching identifiers.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedValidItems.map((item, idx) => {
                      const isSelected = selectedIdentifiers.includes(item.identifier);
                      const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                      return (
                        <tr
                          key={`${item.identifier}-${idx}`}
                          className={`group hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected ? 'bg-blue-50/60 dark:bg-slate-800/70' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectItem(item.identifier)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Serial Number */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                              {serialNumber}
                            </span>
                          </td>

                          {/* Identifier */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {item.identifier}
                            </span>
                          </td>

                          {/* Matched By */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {item.matchedBy || 'MATCHED'}
                            </span>
                          </td>

                          {/* Invoice / Pack Ref */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {item.invoiceNumber || item.packRefNo || '-'}
                            </div>
                            {item.packRefNo && item.invoiceNumber && (
                              <div className="text-[11px] text-slate-400">
                                Pack: {item.packRefNo}
                              </div>
                            )}
                          </td>

                          {/* AWB / Exec Ref */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                              {item.awbNumber || item.executionRefNo || '-'}
                            </div>
                          </td>

                          {/* Batch No */}
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                              {item.batchNo || '-'}
                            </span>
                          </td>

                          {/* Client */}
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {item.clientName || '-'}
                          </td>

                          {/* Per-Row Reprint Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleExecuteReprint([item], '1x1', '1x1 Thermal Label')}
                                disabled={Boolean(printingAction)}
                                className="px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                                title="1x1 Thermal Label"
                              >
                                1x1
                              </button>
                              <button
                                onClick={() => handleExecuteReprint([item], '1x4', '1x4 Sheet Format')}
                                disabled={Boolean(printingAction)}
                                className="px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 rounded border border-indigo-200 dark:border-indigo-800 transition-colors"
                                title="1x4 Sheet Format"
                              >
                                1x4
                              </button>
                              <button
                                onClick={() => handleExecuteReprint([item], 'multi', 'Multi-Item Packing Slip')}
                                disabled={Boolean(printingAction)}
                                className="px-2 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 rounded border border-purple-200 dark:border-purple-800 transition-colors"
                                title="Multi-Item Packing Slip"
                              >
                                Multi
                              </button>
                              <button
                                onClick={() => handleExecuteReprint([item], 'ps', 'PS (Packing Slip)')}
                                disabled={Boolean(printingAction)}
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 rounded border border-emerald-200 dark:border-emerald-800 transition-colors"
                                title="PS (Packing Slip)"
                              >
                                PS
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <span>Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {PER_PAGE_OPTIONS.map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
                <span>entries per page</span>
              </div>

              <div>
                Showing {validItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, validItems.length)} of {validItems.length}{' '}
                Valid Items
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 font-bold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Invalid Items Section (if any invalid items returned) */}
          {invalidItems.length > 0 && (
            <div className="p-4 sm:p-6 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span>Invalid or Unmatched Identifiers ({invalidItems.length})</span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                The following submitted identifiers could not be matched or are inactive:
              </p>

              <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-rose-100/50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 text-xs font-bold uppercase border-b border-rose-200 dark:border-rose-900">
                      <th className="py-2.5 px-4 w-16 text-center">S.No</th>
                      <th className="py-2.5 px-4">Submitted Identifier</th>
                      <th className="py-2.5 px-4">Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 dark:divide-rose-900/40 text-xs">
                    {invalidItems.map((inv, idx) => (
                      <tr key={`${inv.identifier}-${idx}`}>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-600">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {inv.identifier}
                        </td>
                        <td className="py-2.5 px-4 text-rose-700 dark:text-rose-300 font-medium">
                          {inv.reason || 'Identifier not found or inactive'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
