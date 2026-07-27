'use client';
import React, { useState, useEffect } from 'react';
import { X, Truck, Globe, Mail, Shield, Building, MapPin, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { CourierPartner } from '@/types/courier';

interface CourierViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  courierId?: number | null;
  courierData?: CourierPartner | null;
}

export default function CourierViewModal({
  isOpen,
  onClose,
  courierId,
  courierData: initialData,
}: CourierViewModalProps) {
  const [courier, setCourier] = useState<CourierPartner | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setCourier(initialData);
    } else if (courierId && isOpen) {
      const fetchDetails = async () => {
        setLoading(true);
        try {
          const res = await axiosInstance.get(`/courier/${courierId}`);
          if (res.data?.data) {
            setCourier(res.data.data);
          } else {
            setCourier(res.data);
          }
        } catch (err) {
          console.error('Failed to fetch courier details:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    }
  }, [courierId, initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
              {courier?.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={courier.logoUrl}
                  alt={courier.courierName}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <Truck size={24} className="text-[var(--primary)]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                  {courier?.courierName || 'Courier Partner Details'}
                </h2>
                {courier?.courierCode && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[var(--primary-light-bg)] text-[var(--primary)]">
                    {courier.courierCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vendor No: {courier?.vendorNo || 'N/A'} • {courier?.businessName || 'Business Record'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Details Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-semibold">
              Loading courier details...
            </div>
          ) : courier ? (
            <>
              {/* Section 1: Business Overview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Building size={14} className="text-[var(--primary)]" />
                  Business Identification
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Courier Code</p>
                    <p className="text-xs font-bold font-mono text-slate-800 dark:text-white mt-0.5">{courier.courierCode || '-'}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Courier Name</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{courier.courierName || '-'}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Vendor No</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white mt-0.5">{courier.vendorNo || '-'}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Business Name</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white mt-0.5">{courier.businessName || '-'}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Courier Since</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white mt-0.5">{courier.courierSinceDate || '-'}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Courier PAN</p>
                    <p className="text-xs font-bold font-mono text-slate-800 dark:text-white mt-0.5">{courier.courierPan || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Tracking */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Globe size={14} className="text-[var(--primary)]" />
                  Routing & Communication
                </h3>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Tracking URL Template</p>
                    <p className="text-xs font-mono text-[var(--primary)] break-all mt-0.5">
                      {courier.trackingUrlTemplate || '-'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Origin City Code</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{courier.originCityCode || '-'}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Origin Branch Code</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{courier.originBranchCode || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Primary Email</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-white truncate mt-0.5">{courier.emailId || '-'}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">CC Email List</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-white truncate mt-0.5">{courier.ccEmailIds || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Commercials & Operational Flags */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Shield size={14} className="text-[var(--primary)]" />
                  Liability & Operational Controls
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Liability Type</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{courier.liabilityType || '-'}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Limit Amount</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">₹{courier.liabilityLimitAmt ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">FSC %</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{courier.fscPercentage ?? 0}%</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">AWB Charge</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">₹{courier.abwChargeAmount ?? 0}</p>
                  </div>
                </div>

                {/* Flags grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                    {courier.mandatoryAwbForInvoice ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-400" />}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Mandatory AWB</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                    {courier.displayProductValue ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-400" />}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Display Value</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                    {courier.abwChargeWaiveOff ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-400" />}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">AWB Charge Waived</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                    {courier.hasPreAllottedAwb ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-400" />}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Pre-Allotted Pool</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                    {courier.isEnablePreOrder ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-400" />}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Enable PreOrder</span>
                  </div>
                </div>
              </div>

              {/* Audit Metadata */}
              {courier.createdByName && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex flex-wrap gap-4">
                  <span>Created By: <strong>{courier.createdByName}</strong></span>
                  <span>Updated By: <strong>{courier.updatedByName}</strong></span>
                  <span>Created At: {new Date(courier.createdAt || '').toLocaleString()}</span>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-95"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}
