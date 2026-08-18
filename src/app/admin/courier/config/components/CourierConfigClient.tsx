'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Truck, Settings, Layers, MapPin, Clock, Globe, Building2, ChevronRight, Shield
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectCourier } from '@/redux/slices/courierSlice';
import { CourierPartner } from '@/types/courier';
import CourierServicesTab from './CourierServicesTab';
import CourierPincodesTab from './CourierPincodesTab';

export default function CourierConfigClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const reduxCourier = useAppSelector((state) => state.courier.selectedCourier);
  const [courier, setCourier] = useState<CourierPartner | null>(reduxCourier);
  const [loadingCourier, setLoadingCourier] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'PINCODES' | 'SLA'>('SERVICES');

  // Load courier details on mount or URL param change
  useEffect(() => {
    const courierIdParam = searchParams.get('courierId');

    if (courierIdParam) {
      const targetId = Number(courierIdParam);
      if (reduxCourier && reduxCourier.id === targetId) {
        setCourier(reduxCourier);
        return;
      }

      const fetchById = async () => {
        setLoadingCourier(true);
        try {
          const res = await axiosInstance.get(`/courier/${courierIdParam}`);
          const data = res.data?.data || res.data;
          if (data && data.id) {
            setCourier(data);
            dispatch(selectCourier(data));
          }
        } catch (err) {
          console.error('Failed to fetch courier by ID:', err);
        } finally {
          setLoadingCourier(false);
        }
      };
      fetchById();
      return;
    }

    if (reduxCourier) {
      setCourier(reduxCourier);
      return;
    }

    // Check localStorage fallback
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedCourier');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) {
            setCourier(parsed);
            dispatch(selectCourier(parsed));
          }
        } catch (e) {
          console.error('Error parsing localStorage courier:', e);
        }
      }
    }
  }, [searchParams, reduxCourier, dispatch]);

  return (
    <div className="space-y-6 pb-12">
      {/* Courier Partner Banner / Card Context */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        {loadingCourier ? (
          <div className="py-6 text-center text-xs text-slate-400 font-semibold">
            Loading courier context details...
          </div>
        ) : courier ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-4">
              <button
                onClick={() => router.push('/admin/courier/partners')}
                className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                title="Back to Courier Partners"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 flex items-center justify-center flex-shrink-0 shadow-sm">
                {courier.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={courier.logoUrl}
                    alt={courier.courierName}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <Truck size={28} className="text-[var(--primary)]" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    {courier.courierName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[var(--primary-light-bg)] text-[var(--primary)]">
                    {courier.courierCode}
                  </span>
                  {courier.vendorNo && (
                    <span className="text-xs font-semibold text-slate-400">
                      Vendor: {courier.vendorNo}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {courier.businessName && <span>{courier.businessName}</span>}
                  {courier.originCityCode && (
                    <span>Origin Hub: <strong>{courier.originCityCode}</strong> ({courier.originBranchCode || 'Main'})</span>
                  )}
                  {courier.websiteAddress && (
                    <a
                      href={courier.websiteAddress}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                    >
                      <Globe size={13} />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
              <button
                onClick={() => router.push('/admin/courier/partners')}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Switch Courier
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">No Courier Selected</p>
            <p className="text-xs text-slate-400 mt-1">Please select a courier partner from the list page to configure setup.</p>
            <button
              onClick={() => router.push('/admin/courier/partners')}
              className="mt-3 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Select Courier Partner
            </button>
          </div>
        )}
      </div>

      {/* Multi-Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {/* Tab 1 */}
        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'SERVICES'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers size={16} />
          Courier Services & Modes Setup
        </button>

        {/* Tab 2: Pincode Serviceability */}
        <button
          onClick={() => setActiveTab('PINCODES')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'PINCODES'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <MapPin size={16} />
          Pincode Serviceability
        </button>

        {/* Tab 3: SLA */}
        <button
          onClick={() => setActiveTab('SLA')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'SLA'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock size={16} />
          SLA & Transit Controls
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'SERVICES' && <CourierServicesTab courier={courier} />}

      {activeTab === 'PINCODES' && <CourierPincodesTab courier={courier} />}

      {activeTab === 'SLA' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Clock size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">SLA & Transit Controls</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Configure expected delivery turnaround time, cutoff windows, and escalation rules for {courier?.courierName || 'selected courier'}.
          </p>
        </div>
      )}
    </div>
  );
}
