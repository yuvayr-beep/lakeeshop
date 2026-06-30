'use client';
import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface PriceChangeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: number;
  sharesList: any[];
  productCache: Record<number, string>;
  skuCache: Record<number, string>;
  editItem?: any;
}

export default function PriceChangeModal({
  open,
  onClose,
  onSuccess,
  clientId,
  sharesList,
  productCache,
  skuCache,
  editItem
}: PriceChangeModalProps) {
  const [clientShareId, setClientShareId] = useState('');
  const [productSku, setProductSku] = useState('');
  const [supplierPrice, setSupplierPrice] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate when editing
  useEffect(() => {
    if (editItem) {
      setClientShareId(String(editItem.clientShareId || editItem.supplierShareId || ''));
      setProductSku(editItem.productSku || '');
      setSupplierPrice(String(editItem.newSellingPrice || editItem.newSupplierPrice || ''));
      setReason(editItem.changeReason || '');
    } else {
      setClientShareId('');
      setProductSku('');
      setSupplierPrice('');
      setReason('');
    }
  }, [editItem, open]);

  // When selected mapping changes, pre-populate productSku and optionally current pricing
  const handleMappingChange = (shareIdStr: string) => {
    setClientShareId(shareIdStr);
    const selectedShare = sharesList.find((s) => String(s.clientShareId) === shareIdStr);
    if (selectedShare) {
      setProductSku(selectedShare.supplierSkuCode || selectedShare.clientSkuCode || '');
      setSupplierPrice(String(selectedShare.sellingPrice || selectedShare.supplierPrice || ''));
    } else {
      setProductSku('');
      setSupplierPrice('');
    }
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientShareId || !productSku || !supplierPrice || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = [
        {
          supplierShareId: Number(clientShareId),
          supplierId: clientId,
          productSku: productSku,
          skuCode: productSku,
          supplierPrice: Number(supplierPrice),
          reason: reason.trim()
        }
      ];

      await axiosInstance.post('/prod/supplier-product-share/price-change', payload);
      toast.success(editItem ? 'Price change updated successfully' : 'Price change request submitted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit price change');
    } finally {
      setSubmitting(false);
    }
  };

  // Find info about current selected share for preview
  const activeShare = sharesList.find((s) => String(s.clientShareId) === clientShareId);
  const activeProductName = activeShare ? (productCache[activeShare.productId] || `Product #${activeShare.productId}`) : '';
  const activeSkuCode = activeShare ? (skuCache[activeShare.skuId] || activeShare.clientSkuCode || `SKU #${activeShare.skuId}`) : '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-205 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-2 text-blue-650 dark:text-blue-400">
            <Sparkles size={18} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {editItem ? 'Edit Price Change' : 'Log Price Change'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Select Product Share / Mapping (only editable when creating) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Product Share <span className="text-red-500">*</span>
            </label>
            <select
              disabled={!!editItem}
              value={clientShareId}
              onChange={(e) => handleMappingChange(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Choose Mapped Product --</option>
              {sharesList.map((item) => {
                const prodName = productCache[item.productId] || `Product #${item.productId}`;
                const sCode = skuCache[item.skuId] || item.clientSkuCode || `SKU #${item.skuId}`;
                return (
                  <option key={`share-opt-${item.clientShareId}`} value={item.clientShareId}>
                    {prodName} ({sCode})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Readonly details when a share is selected */}
          {clientShareId && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-450">Product Name:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 max-w-[250px] truncate text-right">
                  {editItem ? editItem.productName : activeProductName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Product SKU:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {editItem ? editItem.productSku : activeSkuCode}
                </span>
              </div>
              {!editItem && activeShare && (
                <div className="flex justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-1.5 mt-1">
                  <span className="text-slate-450">Current Pricing:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                    Supplier Price: ₹{(activeShare.sellingPrice || activeShare.supplierPrice || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Supplier Price Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Supplier Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              placeholder="0.00"
              value={supplierPrice}
              onChange={(e) => setSupplierPrice(e.target.value)}
              className="w-full h-10 px-3.5 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-905 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-100 placeholder:text-slate-400 transition-all font-mono font-bold"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Change Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide justification for this pricing change..."
              className="w-full px-3 py-2 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-850 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-350"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
            >
              {submitting ? 'Saving...' : 'Save Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
