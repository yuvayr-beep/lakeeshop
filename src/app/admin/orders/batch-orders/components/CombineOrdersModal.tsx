'use client';

import React, { useState, useEffect } from 'react';
import { X, Merge, Building2, CheckCircle2, AlertCircle, Loader2, PackageX, Sparkles, Check } from 'lucide-react';
import { singleOrderService, ClientItem } from '@/services/singleOrder.service';
import { batchOrderService } from '@/services/batchOrder.service';
import { BatchOrderItem } from '@/types/batchOrder';

interface CombineOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CombineOrdersModal: React.FC<CombineOrdersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  const [checkingOrders, setCheckingOrders] = useState<boolean>(true);
  const [availableApiBatches, setAvailableApiBatches] = useState<BatchOrderItem[]>([]);
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResponse, setSuccessResponse] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessResponse(null);
      checkAvailableOrdersAndClients();
    }
  }, [isOpen]);

  // Check available API orders and fetch clients list
  const checkAvailableOrdersAndClients = async () => {
    setCheckingOrders(true);
    setLoadingClients(true);
    setErrorMessage(null);

    try {
      // 1. Fetch API order batches (sourceId: 2)
      const batchesRes = await batchOrderService.getBatchList({ sourceId: 2 });
      const apiList = Array.isArray(batchesRes) ? batchesRes : ((batchesRes as any)?.data || []);
      
      const filteredApi = Array.isArray(apiList)
        ? apiList.filter((b) => {
            const isApiSource = Number(b.sourceId) === 2 || String(b.sourceId) === 'API';
            if (!isApiSource) return false;

            const passCount = b.passCount ?? b.savedRows ?? b.passRows ?? 0;
            const failCount = b.failCount ?? b.failedRows ?? 0;
            const statusNum = Number(b.batchStatus !== undefined ? b.batchStatus : b.status);

            // Exclude already SUBMITTED (3), MOVED (5), or completely FAILED (4 with 0 pass)
            if (statusNum === 3 || statusNum === 5) return false;
            if (statusNum === 4 && passCount === 0) return false;
            if (failCount > 0 && passCount === 0) return false;

            // Only include batches that have passed orders ready to combine
            return passCount > 0 || (failCount === 0 && (b.totalOrderCount ?? b.totalRows ?? 0) > 0);
          })
        : [];
      
      setAvailableApiBatches(filteredApi);

      // 2. Fetch clients list
      const clientData = await singleOrderService.getClients();
      setClients(clientData);

      if (clientData && clientData.length > 0) {
        // Find first client that has API orders if possible
        const matchingClient = clientData.find((c) =>
          filteredApi.some((b) => String(b.clientId) === String(c.id) || b.clientCode === c.clientCode)
        );
        if (matchingClient) {
          setSelectedClientId(String(matchingClient.id));
        } else {
          setSelectedClientId(String(clientData[0].id));
        }
      }
    } catch (err: any) {
      console.error('Failed to check available orders:', err);
      // Fallback mock clients
      const fallbackClients: ClientItem[] = [
        { id: 33, clientCode: 'AXIS', clientName: 'Axis Pvt Ltd' },
        { id: 34, clientCode: 'EARNEST', clientName: 'Earnest' },
        { id: 35, clientCode: 'XOXODAY', clientName: 'Xoxoday' },
        { id: 36, clientCode: 'HDFC', clientName: 'HDFC Bank' },
        { id: 37, clientCode: 'ICICI', clientName: 'ICICI Bank' },
      ];
      setClients(fallbackClients);
      setSelectedClientId('33');
    } finally {
      setCheckingOrders(false);
      setLoadingClients(false);
    }
  };

  // Calculate API orders count for currently selected client
  const selectedClient = clients.find((c) => String(c.id) === String(selectedClientId));
  const selectedClientApiBatches = availableApiBatches.filter(
    (b) => String(b.clientId) === String(selectedClientId) || (selectedClient && b.clientCode === selectedClient.clientCode)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedClientId) {
      setErrorMessage('Please select a Client to combine orders.');
      return;
    }

    setSubmitting(true);

    const targetClientId = Number(selectedClientId);
    console.log('====================================');
    console.log('COMBINE API ORDERS SUBMIT INITIATED');
    console.log('Client ID:', targetClientId);
    console.log('Client Name:', selectedClient?.clientName || 'N/A');
    console.log('Client Code:', selectedClient?.clientCode || 'N/A');
    console.log('API Method: POST');
    console.log('Full Request URL:', `https://v2.lakeetech.com/order/batch/combine-online?clientId=${targetClientId}`);
    console.log('Request Payload (Body):', {});
    console.log('cURL for Swagger:');
    console.log(`curl -X 'POST' \\\n  'https://v2.lakeetech.com/order/batch/combine-online?clientId=${targetClientId}' \\\n  -H 'accept: */*' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\\n  -d ''`);
    console.log('====================================');

    try {
      const res = await batchOrderService.combineOnlineOrders(targetClientId);
      console.log('Combine API Orders Success Response:', res);
      setSuccessResponse(res);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('====================================');
      console.error('COMBINE API ORDERS ERROR DETAILS:');
      console.error('Status Code:', err.response?.status);
      console.error('Status Text:', err.response?.statusText);
      console.error('Error Response Data:', err.response?.data);
      console.error('====================================');

      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'No orders available to combine for this client or invalid request.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
              <Merge className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Combine API Orders</span>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  Batching
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Consolidate single API orders into a combined order batch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Loading State */}
          {checkingOrders ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Checking available API orders in the list...
              </p>
            </div>
          ) : availableApiBatches.length === 0 ? (
            /* NO ORDERS AVAILABLE DISPLAY */
            <div className="py-6 text-center space-y-4 animate-fadeIn">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 shadow-inner">
                <PackageX className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Orders to Combine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  There are currently no single API orders available for consolidation in the system.
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : successResponse ? (
            /* SUCCESS RESPONSE DISPLAY */
            <div className="space-y-5 animate-fadeIn">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">API Orders Combined Successfully!</h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      {successResponse.message || 'Orders consolidated into new batch.'}
                    </p>
                  </div>
                </div>

                {successResponse.data && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-xl bg-white/80 p-3 shadow-2xs dark:bg-slate-900/80">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Batch No</div>
                      <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                        {successResponse.data.batchNo || 'N/A'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3 shadow-2xs dark:bg-slate-900/80">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Total Records</div>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {successResponse.data.totalRecords ?? successResponse.data.successCount ?? 0}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuccessResponse(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  Combine Another Client
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ORDERS AVAILABLE -> COMBINE FORM */
            <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
              
              {/* Header Status Banner in middle of popup */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-900/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 flex items-start gap-3">
                <Sparkles className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                    API Orders Available to Combine
                  </h4>
                  <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5 leading-relaxed">
                    Found <span className="font-extrabold">{availableApiBatches.length}</span> passed API order batch(es) ready for consolidation. Select client below to combine.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div className="font-semibold leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Client Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Client <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    disabled={loadingClients}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {loadingClients ? (
                      <option>Loading clients...</option>
                    ) : clients.length > 0 ? (
                      clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clientName} ({c.clientCode})
                        </option>
                      ))
                    ) : (
                      <option value="33">AXIS BANK (AXIS)</option>
                    )}
                  </select>
                </div>

                {/* Selected Client Order Status Indicator */}
                {selectedClient && (
                  <div className={`mt-2 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                    selectedClientApiBatches.length > 0
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {selectedClientApiBatches.length > 0 ? (
                      <>
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{selectedClientApiBatches.length} API order batch(es) available for {selectedClient.clientName}.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>No API order batches listed for {selectedClient.clientName}.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loadingClients}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Combining Orders...</span>
                    </>
                  ) : (
                    <>
                      <Merge className="h-4 w-4" />
                      <span>Combine Orders</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
