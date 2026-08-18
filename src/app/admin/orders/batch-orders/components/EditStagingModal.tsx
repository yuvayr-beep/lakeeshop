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
  categoryId?: string;
}

export const EditStagingModal: React.FC<EditStagingModalProps> = ({
  isOpen,
  onClose,
  stagingOrder,
  onSuccess,
  categoryId,
}) => {
  const [formData, setFormData] = useState<Partial<StagingErrorOrder>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (stagingOrder) {
      const rawCustomerName = (stagingOrder.customerName || '').trim();
      const nameParts = rawCustomerName ? rawCustomerName.split(/\s+/) : [];
      const initFirstName = stagingOrder.customerFirstName || nameParts[0] || '';
      const initLastName = stagingOrder.customerLastName || nameParts.slice(1).join(' ') || '';

      const apiQty = stagingOrder.quantity ?? stagingOrder.orderQuantity ?? (stagingOrder as any).qty ?? 0;

      setFormData({
        ...stagingOrder,
        stagingId: stagingOrder.stagingId,
        clientOrderNo: stagingOrder.clientOrderNo || '',
        customerName: rawCustomerName || [initFirstName, initLastName].filter(Boolean).join(' ') || '',
        customerFirstName: initFirstName,
        customerLastName: initLastName,
        mobile: stagingOrder.mobile || '',
        alternateMobile: stagingOrder.alternateMobile || '',
        email: stagingOrder.email || '',
        clientProductCode: stagingOrder.clientProductCode || '',
        clientProductName: stagingOrder.clientProductName || stagingOrder.productName || (stagingOrder as any).productTitle || '',
        quantity: apiQty,
        orderQuantity: apiQty,
        addressLine1: stagingOrder.addressLine1 || '',
        addressLine2: stagingOrder.addressLine2 || '',
        addressLine3: stagingOrder.addressLine3 || '',
        addressLine4: stagingOrder.addressLine4 || '',
        landmark: stagingOrder.landmark || '',
        city: stagingOrder.city || '',
        pincode: stagingOrder.pincode || '',
        state: stagingOrder.state || '',
        clientUnitPrice: stagingOrder.clientUnitPrice ?? stagingOrder.price ?? 0,
        totalPrice: stagingOrder.totalPrice ?? 0,
        remarks: stagingOrder.remarks || '',
      });
      setErrorMsg(null);
    }
  }, [stagingOrder]);

  if (!isOpen || !stagingOrder) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'quantity' || name === 'orderQuantity') {
      const numVal = value === '' ? 0 : parseInt(value, 10);
      setFormData((prev) => ({
        ...prev,
        quantity: isNaN(numVal) ? 0 : numVal,
        orderQuantity: isNaN(numVal) ? 0 : numVal,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    let firstName = formData.customerFirstName || stagingOrder.customerFirstName || '';
    let lastName = formData.customerLastName || stagingOrder.customerLastName || '';

    if (formData.customerName) {
      const parts = formData.customerName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const rawQtyVal = Number(formData.quantity ?? formData.orderQuantity ?? stagingOrder.quantity ?? stagingOrder.orderQuantity ?? 0);
    const finalQty = isNaN(rawQtyVal) ? 0 : rawQtyVal;

    // Build complete payload matching exact PUT /order/staging/{stagingId} schema
    const updatePayload = {
      clientOrderNo: formData.clientOrderNo || stagingOrder.clientOrderNo || '',
      clientOrderLineNo: formData.clientOrderLineNo || stagingOrder.clientOrderLineNo || '',
      clientProductCode: formData.clientProductCode || stagingOrder.clientProductCode || '',
      clientProductName: formData.clientProductName || stagingOrder.clientProductName || stagingOrder.productName || '',
      quantity: finalQty,
      customerFirstName: firstName,
      customerLastName: lastName,
      mobile: formData.mobile || stagingOrder.mobile || '',
      alternateMobile: formData.alternateMobile || stagingOrder.alternateMobile || '',
      email: formData.email || stagingOrder.email || '',
      addressLine1: formData.addressLine1 || stagingOrder.addressLine1 || '',
      addressLine2: formData.addressLine2 || stagingOrder.addressLine2 || '',
      addressLine3: formData.addressLine3 || stagingOrder.addressLine3 || '',
      addressLine4: formData.addressLine4 || stagingOrder.addressLine4 || '',
      landmark: formData.landmark || stagingOrder.landmark || '',
      city: formData.city || stagingOrder.city || '',
      state: formData.state || stagingOrder.state || '',
      pincode: formData.pincode || stagingOrder.pincode || '',
      clientUnitPrice: Number(formData.clientUnitPrice ?? stagingOrder.clientUnitPrice ?? formData.price ?? stagingOrder.price ?? 0),
      totalPrice: Number(formData.totalPrice ?? stagingOrder.totalPrice ?? 0),
      remarks: formData.remarks || stagingOrder.remarks || '',
    };

    console.log('🚀 ========================================================');
    console.log('🚀 [UPDATE STAGING ROW - API PAYLOAD & DETAILS]');
    console.log('📍 Endpoint: PUT /order/staging/' + stagingOrder.stagingId);
    console.log('📦 Staging ID:', stagingOrder.stagingId);
    console.log('🏷️ Category:', categoryId);
    console.log('📄 RAW JSON Payload String (Copyable for Swagger):');
    console.log(JSON.stringify(updatePayload, null, 2));
    console.log('📊 Parsed Payload Object:', updatePayload);
    console.log('🚀 ========================================================');

    try {
      // 1. Save inline updates to staging row with complete API schema
      const updateRes = await batchOrderService.updateStagingRow(stagingOrder.stagingId, updatePayload as any);
      console.log('✅ [UPDATE STAGING ROW SUCCESS]:', updateRes);

      // 2. Revalidate staging row immediately (try single-row revalidate, fallback gracefully if backend returns 409)
      let revalidateRes: any = null;
      try {
        console.log('🔄 [TRIGGERING REVALIDATION] POST /order/staging/revalidate/' + stagingOrder.stagingId);
        revalidateRes = await batchOrderService.revalidateStagingRow(stagingOrder.stagingId);
        console.log('✅ [REVALIDATE STAGING ROW SUCCESS]:', revalidateRes);
      } catch (revalidateErr: any) {
        console.warn('⚠️ Single-row revalidation endpoint returned warning/error (falling back to local update & summary refresh):', revalidateErr?.response?.data || revalidateErr.message);
      }

      onSuccess(revalidateRes?.data || { ...stagingOrder, ...updatePayload });
      onClose();
    } catch (err: any) {
      console.error('❌ ========================================================');
      console.error('❌ [STAGING ROW EDIT FAILED]');
      console.error('📍 Failed Staging ID:', stagingOrder.stagingId);
      console.error('⚠️ HTTP Status Code:', err.response?.status);
      console.error('⚠️ Server Error Message:', err.response?.data?.message || err.message);
      console.error('⚠️ Full Server Error Response Data:', err.response?.data);
      console.error('📄 Payload that caused error:');
      console.log(JSON.stringify(updatePayload, null, 2));
      console.error('❌ ========================================================');
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update staging row.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Edit Staging Record #{stagingOrder.stagingId}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stagingOrder.remarks ? `Error Remark: ${typeof stagingOrder.remarks === 'object' && stagingOrder.remarks !== null ? ((stagingOrder.remarks as any).reason || (stagingOrder.remarks as any).message || JSON.stringify(stagingOrder.remarks)) : stagingOrder.remarks}` : 'Correct row details inline'}
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
          {categoryId === 'mobile' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Order No
                  </label>
                  <input
                    type="text"
                    name="clientOrderNo"
                    value={formData.clientOrderNo || ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min={0}
                    value={formData.quantity ?? formData.orderQuantity ?? 0}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-blue-400 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:border-blue-600 focus:outline-none dark:border-blue-500 dark:bg-slate-900 dark:text-blue-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile || ''}
                    onChange={handleChange}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                    placeholder="Optional alternate mobile"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ) : categoryId === 'customer' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Order No
                  </label>
                  <input
                    type="text"
                    name="clientOrderNo"
                    value={formData.clientOrderNo || ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min={0}
                    value={formData.quantity ?? formData.orderQuantity ?? 0}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-blue-400 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:border-blue-600 focus:outline-none dark:border-blue-500 dark:bg-slate-900 dark:text-blue-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName || [formData.customerFirstName, formData.customerLastName].filter(Boolean).join(' ') || ''}
                  onChange={handleChange}
                  placeholder="Enter Full Customer Name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          ) : categoryId === 'pincode' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Order No
                  </label>
                  <input
                    type="text"
                    name="clientOrderNo"
                    value={formData.clientOrderNo || ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode || ''}
                    onChange={handleChange}
                    placeholder="6-digit Pincode"
                    className="w-full rounded-lg border border-blue-400 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:border-blue-600 focus:outline-none dark:border-blue-500 dark:bg-slate-900 dark:text-blue-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    name="quantity"
                    min={0}
                    value={formData.quantity ?? formData.orderQuantity ?? 0}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ) : categoryId === 'product' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Order No
                  </label>
                  <input
                    type="text"
                    name="clientOrderNo"
                    value={formData.clientOrderNo || ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min={0}
                    value={formData.quantity ?? formData.orderQuantity ?? 0}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-blue-400 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:border-blue-600 focus:outline-none dark:border-blue-500 dark:bg-slate-900 dark:text-blue-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Product Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientProductCode"
                  value={formData.clientProductCode || ''}
                  onChange={handleChange}
                  placeholder="Enter Product Code"
                  className="w-full rounded-lg border border-blue-400 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:border-blue-600 focus:outline-none dark:border-blue-500 dark:bg-slate-900 dark:text-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name Reference
                </label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                  {stagingOrder.clientProductName || stagingOrder.productName || (stagingOrder as any).productTitle || 'N/A'}
                </div>
              </div>
            </div>
          ) : categoryId === 'address' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Order No
                  </label>
                  <input
                    type="text"
                    name="clientOrderNo"
                    value={formData.clientOrderNo || ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min={0}
                    value={formData.quantity ?? formData.orderQuantity ?? 0}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName || [formData.customerFirstName, formData.customerLastName].filter(Boolean).join(' ') || ''}
                  onChange={handleChange}
                  placeholder="Enter Customer Name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1 || ''}
                  onChange={handleChange}
                  placeholder="Enter Address Line 1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2 || ''}
                  onChange={handleChange}
                  placeholder="Enter Address Line 2"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          ) : (
            /* DEFAULT / GENERAL EDIT FORM */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Order No
                  </label>
                  <input
                    type="text"
                    name="clientOrderNo"
                    value={formData.clientOrderNo || ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Order Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min={0}
                    value={formData.quantity ?? formData.orderQuantity ?? 0}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-blue-400 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:border-blue-600 focus:outline-none dark:border-blue-500 dark:bg-slate-900 dark:text-blue-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName || [formData.customerFirstName, formData.customerLastName].filter(Boolean).join(' ') || ''}
                    onChange={handleChange}
                    placeholder="Enter Customer Name"
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
                    placeholder="Enter Product Code"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

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
