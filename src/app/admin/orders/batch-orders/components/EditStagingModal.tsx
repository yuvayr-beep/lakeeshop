'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { StagingErrorOrder } from '@/types/batchOrder';
import { batchOrderService } from '@/services/batchOrder.service';

interface EditStagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stagingOrder: StagingErrorOrder | null;
  onSuccess: (updatedOrder: StagingErrorOrder) => void;
}

export const EditStagingModal: React.FC<EditStagingModalProps> = ({
  isOpen,
  onClose,
  stagingOrder,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<StagingErrorOrder>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (stagingOrder) {
      setFormData({
        stagingId: stagingOrder.stagingId,
        clientOrderNo: stagingOrder.clientOrderNo || '',
        customerName: stagingOrder.customerName || '',
        mobile: stagingOrder.mobile || '',
        alternateMobile: stagingOrder.alternateMobile || '',
        clientProductCode: stagingOrder.clientProductCode || '',
        addressLine1: stagingOrder.addressLine1 || '',
        addressLine2: stagingOrder.addressLine2 || '',
        landmark: stagingOrder.landmark || '',
        city: stagingOrder.city || '',
        pincode: stagingOrder.pincode || '',
        state: stagingOrder.state || '',
        orderQuantity: stagingOrder.orderQuantity || 1,
        price: stagingOrder.price || 0,
        remarks: stagingOrder.remarks || '',
      });
      setErrorMsg(null);
    }
  }, [stagingOrder]);

  if (!isOpen || !stagingOrder) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Save inline updates to staging row
      await batchOrderService.updateStagingRow(stagingOrder.stagingId, formData);

      // 2. Revalidate staging row immediately (synchronous)
      const revalidateRes = await batchOrderService.revalidateStagingRow(stagingOrder.stagingId);

      onSuccess(revalidateRes?.data || { ...stagingOrder, ...formData });
      onClose();
    } catch (err: any) {
      console.error('Failed to update staging row:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update staging row.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Edit Staging Record #{stagingOrder.stagingId}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stagingOrder.remarks ? `Error Remark: ${stagingOrder.remarks}` : 'Correct row details inline'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Client Order No
              </label>
              <input
                type="text"
                name="clientOrderNo"
                value={formData.clientOrderNo || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alternate Mobile
              </label>
              <input
                type="text"
                name="alternateMobile"
                value={formData.alternateMobile || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Client Product Code
              </label>
              <input
                type="text"
                name="clientProductCode"
                value={formData.clientProductCode || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Order Quantity
              </label>
              <input
                type="number"
                name="orderQuantity"
                value={formData.orderQuantity || 1}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Price
              </label>
              <input
                type="number"
                name="price"
                value={formData.price || 0}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Address Line 1 & 2
            </label>
            <input
              type="text"
              name="addressLine1"
              value={formData.addressLine1 || ''}
              onChange={handleChange}
              placeholder="Address Line 1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white mb-2"
            />
            <input
              type="text"
              name="addressLine2"
              value={formData.addressLine2 || ''}
              onChange={handleChange}
              placeholder="Address Line 2"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save & Revalidate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
