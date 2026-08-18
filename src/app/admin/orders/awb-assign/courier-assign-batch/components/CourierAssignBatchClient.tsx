'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  RefreshCw,
  Search,
  X,
  Loader2,
  CheckCircle2,
  Zap,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EligibleCourier,
  AwbBatchJobResponseData,
} from '@/types/courierAssignBatch';
import { courierAssignBatchService } from '@/services/courierAssignBatch.service';

export const CourierAssignBatchClient: React.FC = () => {
  // Data States
  const [eligibleCouriers, setEligibleCouriers] = useState<EligibleCourier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Action Submission State
  const [submittingCourierId, setSubmittingCourierId] = useState<number | null>(null);

  // Job Submission Result Modal State
  const [jobResultModalData, setJobResultModalData] = useState<AwbBatchJobResponseData | null>(null);
  const [showJobModal, setShowJobModal] = useState<boolean>(false);

  // Fetch Eligible Couriers
  const fetchEligibleCouriers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courierAssignBatchService.getEligibleCouriers();
      setEligibleCouriers(data || []);
    } catch (err: any) {
      console.error('Error fetching eligible couriers:', err);
      toast.error('Failed to load eligible couriers for AWB assignment');
      setEligibleCouriers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibleCouriers();
  }, [fetchEligibleCouriers]);

  // Filtered List
  const filteredCouriers = useMemo(() => {
    if (!searchQuery.trim()) return eligibleCouriers;
    const q = searchQuery.toLowerCase().trim();
    return eligibleCouriers.filter(
      (c) =>
        c.courierCode.toLowerCase().includes(q) ||
        c.courierServiceName.toLowerCase().includes(q)
    );
  }, [eligibleCouriers, searchQuery]);

  // Stats Counters
  const totalPendingAwbs = useMemo(
    () => eligibleCouriers.reduce((sum, item) => sum + (item.pendingAwbCount || 0), 0),
    [eligibleCouriers]
  );

  // Helper to derive shipMode from courierCode (defaulting to SURFACE)
  const extractShipMode = (courierCode: string): string => {
    const upper = courierCode.toUpperCase();
    if (upper.includes('AIR') || upper.includes('EXPRESS')) return 'AIR';
    return 'SURFACE';
  };

  // Submit Job Handler
  const handleJobSubmit = async (courier: EligibleCourier) => {
    const shipMode = extractShipMode(courier.courierCode);
    setSubmittingCourierId(courier.courierServiceId);

    const actionText = courier.hasPreAllottedAwb ? 'Assigning Pre-AWBs' : 'Generating AWBs';
    const toastId = toast.loading(`${actionText} for ${courier.courierServiceName}...`);

    try {
      const jobData = await courierAssignBatchService.submitAwbBatchJob({
        courierServiceId: courier.courierServiceId,
        shipMode,
      });

      toast.success(`Job ${jobData.jobId || 'submitted'} successfully!`, { id: toastId });
      setJobResultModalData(jobData);
      setShowJobModal(true);

      // Refresh list to update pending counts
      fetchEligibleCouriers();
    } catch (err: any) {
      console.error('Submit AWB Job Error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit AWB batch job', {
        id: toastId,
      });
    } finally {
      setSubmittingCourierId(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Control Bar: Search, Simple Text Stats, and Refresh Button */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courier code or service name..."
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Simple Text Stats & Refresh Button */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <span>
              Eligible Couriers: <strong className="text-slate-900 dark:text-white font-bold">{eligibleCouriers.length}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>
              Total Pending AWBs: <strong className="text-amber-600 dark:text-amber-400 font-bold">{totalPendingAwbs}</strong>
            </span>
          </div>

          <button
            onClick={fetchEligibleCouriers}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title="Refresh Eligible Couriers"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[var(--primary)]' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* List Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-14 text-center">S.No</th>
                <th className="p-4 w-20 text-center">Courier Logo</th>
                <th className="p-4">Courier Code</th>
                <th className="p-4">Courier Name</th>
                <th className="p-4 text-center">Pending Assign</th>
                <th className="p-4 text-center">Available Pre-AWBs</th>
                <th className="p-4 text-center w-52">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
                      <span className="text-xs font-semibold">Loading Eligible Couriers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCouriers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck size={36} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Eligible Couriers Found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery
                          ? 'No couriers match your search query.'
                          : 'There are currently no orders pending AWB assignment.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCouriers.map((courier, index) => {
                  const isSubmitting = submittingCourierId === courier.courierServiceId;

                  return (
                    <tr
                      key={courier.courierServiceId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* S.No */}
                      <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>

                      {/* Courier Logo (Icon Model) */}
                      <td className="p-4 text-center">
                        <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center mx-auto overflow-hidden shadow-2xs">
                          {courier.logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={courier.logoUrl}
                              alt={courier.courierServiceName}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                // Hide broken image so fallback icon renders
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Truck size={18} className="text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Courier Code */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-block border border-slate-200 dark:border-slate-700">
                          {courier.courierCode}
                        </span>
                      </td>

                      {/* Courier Name */}
                      <td className="p-4 font-bold text-slate-800 dark:text-white">
                        {courier.courierServiceName}
                      </td>

                      {/* Pending Assign */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                          {courier.pendingAwbCount}
                        </span>
                      </td>

                      {/* Available Pre-AWBs */}
                      <td className="p-4 text-center">
                        {courier.hasPreAllottedAwb ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                            <ShieldCheck size={13} />
                            {courier.availablePreAllottedCount} available
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400">
                            None
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="p-4 text-center">
                        {courier.hasPreAllottedAwb ? (
                          <button
                            onClick={() => handleJobSubmit(courier)}
                            disabled={isSubmitting || courier.pendingAwbCount === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <PackageCheck size={14} />
                                Assign Pre-AWB
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJobSubmit(courier)}
                            disabled={isSubmitting || courier.pendingAwbCount === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed hover:opacity-95"
                            style={{ backgroundColor: 'var(--primary)' }}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Zap size={14} />
                                Generate AWB
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Submission Success Modal */}
      {showJobModal && jobResultModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowJobModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-4 shadow-sm">
                <CheckCircle2 size={32} />
              </div>

              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                AWB Job Submitted Successfully
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Background batch job has been scheduled for execution.
              </p>
            </div>

            <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 font-medium">Job ID</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {jobResultModalData.jobId}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 font-medium">Courier Service</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {jobResultModalData.courierServiceName}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 font-medium">Ship Mode</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">
                  {jobResultModalData.shipMode}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold">
                  {jobResultModalData.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Orders to Assign</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {jobResultModalData.totalCount}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowJobModal(false)}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                Close & View Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierAssignBatchClient;
