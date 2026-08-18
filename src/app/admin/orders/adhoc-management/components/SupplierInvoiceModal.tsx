'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Receipt, Plus, Trash2, Loader2, CheckCircle2, Search } from 'lucide-react';
import {
  adhocOrderService,
  SupplierInvoiceProductPayload,
  ChildAdhocOrderItem,
  SupplierOption,
} from '@/services/adhocOrder.service';
import { toast } from 'sonner';

interface SupplierInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  adhocRefNo: string;
  childProducts?: ChildAdhocOrderItem[];
  onSuccess?: () => void;
}

export const SupplierInvoiceModal: React.FC<SupplierInvoiceModalProps> = ({
  isOpen,
  onClose,
  adhocRefNo,
  childProducts,
  onSuccess,
}) => {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('');
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [isSupplierFocused, setIsSupplierFocused] = useState<boolean>(false);

  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');

  const [products, setProducts] = useState<SupplierInvoiceProductPayload[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setInvoiceNo('');
      setSelectedSupplierId(null);
      setSelectedSupplierName('');
      setSupplierSearch('');

      setLoadingSuppliers(true);
      adhocOrderService
        .getSuppliers()
        .then((sups) => {
          setSuppliers(sups);
        })
        .finally(() => setLoadingSuppliers(false));

      if (childProducts && childProducts.length > 0) {
        setProducts(
          childProducts.map((child) => ({
            supplierProductName:
              child.clientProductName || child.productName || child.oneTimeProductName || 'Ad-hoc Item',
            supplierQty: child.quantity || 1,
            supplierCost: child.clientUnitPrice || child.unitPrice || 0,
            supplierTax: child.taxPercentage || 18,
            supplierHsn: child.hsnCode || '4202',
          }))
        );
      } else {
        setProducts([
          {
            supplierProductName: '',
            supplierQty: 1,
            supplierCost: 0,
            supplierTax: 18,
            supplierHsn: '',
          },
        ]);
      }
    }
  }, [isOpen, childProducts]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.registeredCompanyName && s.registeredCompanyName.toLowerCase().includes(q)) ||
        (s.tradeName && s.tradeName.toLowerCase().includes(q)) ||
        (s.supplierName && s.supplierName.toLowerCase().includes(q)) ||
        String(s.id).includes(q)
    );
  }, [suppliers, supplierSearch]);

  if (!isOpen) return null;

  const handleAddProductRow = () => {
    setProducts((prev) => [
      ...prev,
      {
        supplierProductName: '',
        supplierQty: 1,
        supplierCost: 0,
        supplierTax: 18,
        supplierHsn: '',
      },
    ]);
  };

  const handleRemoveProductRow = (index: number) => {
    if (products.length === 1) {
      toast.error('Invoice must contain at least 1 product line.');
      return;
    }
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof SupplierInvoiceProductPayload, value: any) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please search and select a valid supplier.');
      return;
    }

    if (!invoiceNo.trim()) {
      toast.error('Please enter a valid invoice number.');
      return;
    }

    setSubmitting(true);
    try {
      await adhocOrderService.addSupplierInvoice({
        adhocRefNo,
        supplierId: selectedSupplierId,
        supplierName: selectedSupplierName,
        isAdhocSupplier: true,
        invoiceNo,
        invoiceDate,
        remarks,
        products,
      });

      toast.success(`Supplier invoice ${invoiceNo} logged successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting supplier invoice:', err);
      const apiMsg = err?.response?.data?.message || err?.message || 'Failed to submit supplier procurement invoice.';
      toast.error(`Supplier Invoice Error: ${apiMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Procurement / Supplier Invoice
              </h3>
              <p className="text-xs text-slate-500">
                Order Ref: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{adhocRefNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Searchable Autocomplete Supplier Field (Matching POWizard style) */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Supplier *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={supplierSearch}
                  onFocus={() => setIsSupplierFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setIsSupplierFocused(false), 200);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupplierSearch(val);
                    setIsSupplierFocused(true);
                    if (!val) {
                      setSelectedSupplierId(null);
                      setSelectedSupplierName('');
                    }
                  }}
                  placeholder={loadingSuppliers ? 'Loading suppliers...' : 'Search supplier...'}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all pr-7"
                />
                {supplierSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplierId(null);
                      setSelectedSupplierName('');
                      setSupplierSearch('');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Floating Dropdown List */}
              {isSupplierFocused && filteredSuppliers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-52 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredSuppliers.map((sup, idx) => {
                    const sName =
                      sup.name ||
                      sup.registeredCompanyName ||
                      sup.tradeName ||
                      sup.supplierName ||
                      `Supplier #${sup.id}`;
                    return (
                      <button
                        key={`supplier-select-opt-${sup.id || idx}`}
                        type="button"
                        onMouseDown={() => {
                          setSelectedSupplierId(sup.id);
                          setSelectedSupplierName(sName);
                          setSupplierSearch(sName);
                          setIsSupplierFocused(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <div className="font-bold text-slate-900 dark:text-white truncate">{sName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Supplier ID: #{sup.id}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Invoice No *
              </label>
              <input
                type="text"
                placeholder="e.g. SUP-INV-2026-9812"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Remarks
            </label>
            <input
              type="text"
              placeholder="Vendor invoice notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Products Sub-Table */}
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Invoice Product Lines
              </span>
              <button
                type="button"
                onClick={handleAddProductRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {products.map((prod, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800"
                >
                  <div className="col-span-5">
                    {childProducts && childProducts.length > 0 ? (
                      <select
                        value={prod.supplierProductName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = childProducts.find(
                            (c) => (c.clientProductName || c.productName || c.oneTimeProductName) === val
                          );
                          handleProductChange(idx, 'supplierProductName', val);
                          if (matched) {
                            if (matched.quantity) handleProductChange(idx, 'supplierQty', matched.quantity);
                            if (matched.clientUnitPrice || matched.unitPrice) {
                              handleProductChange(idx, 'supplierCost', matched.clientUnitPrice || matched.unitPrice);
                            }
                            if (matched.hsnCode) handleProductChange(idx, 'supplierHsn', matched.hsnCode);
                          }
                        }}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">Select Child Product...</option>
                        {childProducts.map((c) => {
                          const name = c.clientProductName || c.productName || c.oneTimeProductName || 'Item';
                          return (
                            <option key={c.id} value={name}>
                              {name} (Qty: {c.quantity || 1})
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Product Description"
                        value={prod.supplierProductName}
                        onChange={(e) => handleProductChange(idx, 'supplierProductName', e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={prod.supplierQty}
                      onChange={(e) => handleProductChange(idx, 'supplierQty', Number(e.target.value))}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Cost"
                      value={prod.supplierCost}
                      onChange={(e) => handleProductChange(idx, 'supplierCost', Number(e.target.value))}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="HSN"
                      value={prod.supplierHsn || ''}
                      onChange={(e) => handleProductChange(idx, 'supplierHsn', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveProductRow(idx)}
                      className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Save Supplier Invoice</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
