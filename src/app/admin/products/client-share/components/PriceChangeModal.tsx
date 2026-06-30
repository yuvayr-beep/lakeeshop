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
  editItem?: any | null;
}

export default function PriceChangeModal({
  open,
  onClose,
  onSuccess,
  clientId,
  sharesList,
  productCache,
  skuCache,
  editItem = null
}: PriceChangeModalProps) {
  const [clientShareId, setClientShareId] = useState<number | ''>('');
  const [productSku, setProductSku] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [transferPrice, setTransferPrice] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If a share is selected in Create mode, find its current prices for display
  const selectedShare = sharesList.find(s => s.clientShareId === Number(clientShareId));

  useEffect(() => {
    if (editItem) {
      setClientShareId(editItem.clientShareId);
      setProductSku(editItem.productSku);
      setSellingPrice(editItem.newSellingPrice);
      setTransferPrice(editItem.newTransferPrice);
      setReason(editItem.changeReason || '');
    } else {
      setClientShareId('');
      setProductSku('');
      setSellingPrice('');
      setTransferPrice('');
      setReason('');
    }
  }, [editItem, open]);

  if (!open) return null;

  const handleShareChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setClientShareId(val ? Number(val) : '');
    const found = sharesList.find(s => s.clientShareId === Number(val));
    if (found) {
      setProductSku(found.clientSkuCode || '');
      setSellingPrice(found.sellingPrice || '');
      setTransferPrice(found.transferPrice || '');
    } else {
      setProductSku('');
      setSellingPrice('');
      setTransferPrice('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientShareId || !productSku || sellingPrice === '' || transferPrice === '' || !reason.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(editItem ? 'Updating price change...' : 'Creating price change...');

    const payload = [
      {
        clientShareId: Number(clientShareId),
        clientId: clientId,
        productSku: productSku,
        skuCode: productSku,
        sellingPrice: Number(sellingPrice),
        transferPrice: Number(transferPrice),
        reason: reason.trim()
      }
    ];

    try {
      const response = await axiosInstance.post('/prod/client-product-share/price-change', payload);
      if (response.data?.success) {
        toast.success(response.data.message || 'Prices changed successfully', { id: toastId });
        onSuccess();
        onClose();
      } else {
        toast.error(response.data?.message || 'Price change failed', { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit price change';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Sparkles size={18} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {editItem ? 'Edit Price Change Log' : 'Create Price Change Log'}
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
          {/* Select Product Share (Create Mode Only) */}
          {!editItem ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Product / SKU <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={clientShareId}
                onChange={handleShareChange}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white dark:bg-slate-950 border border-slate-200 hover:border-slate-350 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium"
              >
                <option value="">-- Choose Product Share --</option>
                {sharesList.map((s) => {
                  const pName = productCache[s.productId] || `Product ID ${s.productId}`;
                  const sName = s.clientSkuCode || `SKU ID ${s.skuId}`;
                  return (
                    <option key={`share-option-${s.clientShareId}`} value={s.clientShareId}>
                      {pName} ({sName})
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">
                Product & SKU
              </label>
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium">
                {editItem.productName || 'Unknown Product'} ({editItem.productSku})
              </div>
            </div>
          )}

          {/* Reference Old Prices (Visual Guide) */}
          {selectedShare && (
            <div className="grid grid-cols-2 gap-3 bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-450 block">Current Selling Price</span>
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">₹{selectedShare.sellingPrice?.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-450 block">Current Transfer Price</span>
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">₹{selectedShare.transferPrice?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {editItem && (
            <div className="grid grid-cols-2 gap-3 bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-450 block">Old Selling Price</span>
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">₹{editItem.oldSellingPrice?.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-450 block">Old Transfer Price</span>
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">₹{editItem.oldTransferPrice?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Price Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder="e.g. 1350.00"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white dark:bg-slate-950 border border-slate-200 hover:border-slate-350 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-100 placeholder:text-slate-400 transition-all font-mono font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Transfer Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={transferPrice}
                onChange={(e) => setTransferPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder="e.g. 1350.00"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white dark:bg-slate-950 border border-slate-200 hover:border-slate-350 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-100 placeholder:text-slate-400 transition-all font-mono font-medium"
              />
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Change Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Price updated due to tax structure change, vendor negotiation, etc."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 focus:bg-white dark:bg-slate-950 border border-slate-200 hover:border-slate-350 focus:border-blue-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-100 placeholder:text-slate-400 transition-all font-medium resize-none"
            />
          </div>

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
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
            >
              {editItem ? 'Save Changes' : 'Change Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
