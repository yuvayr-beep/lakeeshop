'use client';
import React, { useState, useEffect } from 'react';
import { X, Truck, Loader2, Package, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { adhocOrderService, AssignCourierSinglePayload, ChildAdhocOrderItem } from '@/services/adhocOrder.service';

interface ManualCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ChildAdhocOrderItem[];
  adhocRefNo: string;
  onSuccess: () => void;
}

export default function ManualCourierModal({
  isOpen,
  onClose,
  selectedItems,
  adhocRefNo,
  onSuccess,
}: ManualCourierModalProps) {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState<boolean>(false);

  const [selectedCourierCode, setSelectedCourierCode] = useState<string>('BLUEDART');
  const [shipMode, setShipMode] = useState<'SURFACE' | 'EXPRESS'>('SURFACE');
  const [awbNo, setAwbNo] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingCouriers(true);
      setAwbNo('');
      adhocOrderService
        .getCourierPartners()
        .then((data: any[]) => {
          setCouriers(data);
          if (data && data.length > 0) {
            const firstCode = data[0].courierCode || data[0].code || 'BLUEDART';
            setSelectedCourierCode(firstCode);
          }
        })
        .catch((err: any) => {
          console.error('Failed to load courier partners:', err);
        })
        .finally(() => setLoadingCouriers(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Group items by packRefNo for package consistency check feedback
  const packGroups: { [key: string]: ChildAdhocOrderItem[] } = {};
  selectedItems.forEach((item) => {
    const pRef = item.packRefNo || 'NO_PACK_REF';
    if (!packGroups[pRef]) packGroups[pRef] = [];
    packGroups[pRef].push(item);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error('No items selected for courier assignment');
      return;
    }
    if (!selectedCourierCode) {
      toast.error('Please select a courier partner');
      return;
    }

    setSubmitting(true);
    try {
      const payload: AssignCourierSinglePayload[] = selectedItems.map((item) => ({
        executionId: item.id,
        courierCode: selectedCourierCode,
        shipMode: shipMode,
        awbNo: awbNo.trim() ? awbNo.trim() : null,
      }));

      await adhocOrderService.assignCourierSingle(payload);
      toast.success(`Successfully assigned courier ${selectedCourierCode} to ${payload.length} item(s)!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Manual courier assignment failed:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Courier assignment failed. Check package consistency.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-100 dark:bg-cyan-950/80 p-2.5 text-cyan-700 dark:text-cyan-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Assign Courier Partner (Manual)
              </h3>
              <p className="text-xs text-slate-500">
                Order Ref: <span className="font-mono font-bold text-blue-600">{adhocRefNo}</span> ({selectedItems.length} items)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected Courier Partner */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Select Courier Partner *
            </label>
            <select
              value={selectedCourierCode}
              onChange={(e) => setSelectedCourierCode(e.target.value)}
              disabled={loadingCouriers}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
            >
              {loadingCouriers ? (
                <option value="">Loading courier partners...</option>
              ) : couriers.length > 0 ? (
                couriers.map((c, idx) => {
                  const code = c.courierCode || c.code || `COURIER_${c.id || idx}`;
                  const name = c.courierName || c.name || code;
                  return (
                    <option key={`cour-${c.id || code}-${idx}`} value={code}>
                      {name} ({code})
                    </option>
                  );
                })
              ) : (
                <>
                  <option value="BLUEDART">BlueDart Express (BLUEDART)</option>
                  <option value="DELHIVERY">Delhivery Direct (DELHIVERY)</option>
                  <option value="XPRESSBEES">Xpressbees Logistics (XPRESSBEES)</option>
                  <option value="ECOM_EXPRESS">Ecom Express (ECOM_EXPRESS)</option>
                  <option value="DTDC">DTDC Courier (DTDC)</option>
                  <option value="SHADOWFAX">Shadowfax Technologies (SHADOWFAX)</option>
                </>
              )}
            </select>
          </div>

          {/* Ship Mode & AWB Tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Ship Mode *
              </label>
              <select
                value={shipMode}
                onChange={(e) => setShipMode(e.target.value as 'SURFACE' | 'EXPRESS')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="SURFACE">SURFACE</option>
                <option value="EXPRESS">EXPRESS / AIR</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                AWB / Tracking No (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter AWB if available..."
                value={awbNo}
                onChange={(e) => setAwbNo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Package Consistency Rule Information Card */}
          <div className="rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/50 dark:bg-cyan-950/30 p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-cyan-800 dark:text-cyan-300">
              <Package className="h-4 w-4" />
              Package Consistency Rule:
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              All items sharing the same package reference ID (<span className="font-mono font-semibold text-slate-800 dark:text-slate-200">Pack Ref No</span>) will automatically be assigned to <span className="font-bold text-cyan-700 dark:text-cyan-300">{selectedCourierCode}</span> ({shipMode}).
            </p>
          </div>

          {/* Items Summary Table */}
          <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 scrollbar-thin">
            {selectedItems.map((item, index) => (
              <div key={item.id || index} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  #{item.id} - {item.clientProductName || item.productName || 'Item'}
                </span>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                  Pack: {item.packRefNo || '-'}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 text-xs font-bold shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Assign Courier
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
