'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Play,
  Pause,
  Square,
  Download,
  Loader2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Layers,
  Copy,
  Check,
  Building2,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AwbBatchJobItem,
  AwbBatchJobsFilterParams,
  CourierPartnerSimple,
  CourierServiceSimple,
} from '@/types/awbBatchJobs';
import { awbBatchJobsService } from '@/services/awbBatchJobs.service';

export const AwbBatchJobsClient: React.FC = () => {
  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter States (defaulting fromDate and toDate to current date)
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Dropdown Options Data
  const [courierPartners, setCourierPartners] = useState<CourierPartnerSimple[]>([]);
  const [courierServices, setCourierServices] = useState<CourierServiceSimple[]>([]);
  const [loadingPartners, setLoadingPartners] = useState<boolean>(false);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  // Table Data & Loading States
  const [jobs, setJobs] = useState<AwbBatchJobItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingJobId, setActionLoadingJobId] = useState<string | null>(null);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  // Search filter inside table
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Fetch Courier Partners for first dropdown
  useEffect(() => {
    const loadPartners = async () => {
      setLoadingPartners(true);
      try {
        const list = await awbBatchJobsService.getCourierPartners();
        setCourierPartners(list || []);
      } catch (err) {
        console.error('Failed to load courier partners:', err);
      } finally {
        setLoadingPartners(false);
      }
    };
    loadPartners();
  }, []);

  // 2. Fetch Courier Services for second dropdown when Courier Partner changes
  useEffect(() => {
    if (!selectedPartnerId) {
      setCourierServices([]);
      setSelectedServiceId('');
      return;
    }

    const loadServices = async () => {
      setLoadingServices(true);
      try {
        const partnerIdNum = parseInt(selectedPartnerId, 10);
        const list = await awbBatchJobsService.getCourierServicesByPartnerId(partnerIdNum);
        setCourierServices(list || []);
      } catch (err) {
        console.error('Failed to load courier services:', err);
        setCourierServices([]);
      } finally {
        setLoadingServices(false);
      }
    };
    loadServices();
  }, [selectedPartnerId]);

  // 3. Fetch AWB Batch Jobs List
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: AwbBatchJobsFilterParams = {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        courierServiceId: selectedServiceId ? parseInt(selectedServiceId, 10) : undefined,
      };
      const list = await awbBatchJobsService.getAwbBatchJobs(filters);
      setJobs(list || []);
    } catch (err: any) {
      console.error('Error fetching AWB batch jobs:', err);
      toast.error('Failed to load AWB batch jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedServiceId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // 4. Auto Polling for IN_PROGRESS jobs every 3 seconds
  useEffect(() => {
    const inProgressJobs = jobs.filter((j) => j.status === 'IN_PROGRESS');
    if (inProgressJobs.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const updatedJobs = await Promise.all(
          inProgressJobs.map(async (job) => {
            try {
              return await awbBatchJobsService.getJobStatus(job.jobId);
            } catch {
              return job;
            }
          })
        );

        setJobs((prevJobs) =>
          prevJobs.map((j) => {
            const updated = updatedJobs.find((u) => u.jobId === j.jobId);
            return updated || j;
          })
        );
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  // Search Filter logic
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase().trim();
    return jobs.filter(
      (j) =>
        j.jobId.toLowerCase().includes(q) ||
        j.courierServiceName.toLowerCase().includes(q) ||
        j.shipMode.toLowerCase().includes(q) ||
        j.status.toLowerCase().includes(q)
    );
  }, [jobs, searchQuery]);

  // Summary Metrics
  const totalJobsCount = jobs.length;
  const inProgressCount = useMemo(() => jobs.filter((j) => j.status === 'IN_PROGRESS').length, [jobs]);
  const pausedCount = useMemo(() => jobs.filter((j) => j.status === 'PAUSED').length, [jobs]);
  const completedCount = useMemo(() => jobs.filter((j) => j.status === 'COMPLETED').length, [jobs]);
  const abortedCount = useMemo(() => jobs.filter((j) => j.status === 'ABORTED').length, [jobs]);
  const totalFailedCount = useMemo(() => jobs.reduce((sum, j) => sum + (j.failedCount || 0), 0), [jobs]);

  // Action Handlers with Strict State Validation Rules
  const handleStartJob = async (job: AwbBatchJobItem) => {
    if (job.status === 'IN_PROGRESS') {
      toast.error(`Job ${job.jobId} is already IN_PROGRESS. Cannot start again.`);
      return;
    }
    if (job.status === 'ABORTED') {
      toast.error(`Job ${job.jobId} is ABORTED. Cannot restart an aborted job.`);
      return;
    }
    if (job.status === 'COMPLETED') {
      toast.error(`Job ${job.jobId} is COMPLETED. Cannot modify a completed job.`);
      return;
    }

    setActionLoadingJobId(job.jobId);
    const toastId = toast.loading(`Resuming job ${job.jobId}...`);
    try {
      const updated = await awbBatchJobsService.startJob(job.jobId);
      toast.success(`Job ${job.jobId} resumed successfully`, { id: toastId });
      setJobs((prev) => prev.map((j) => (j.jobId === job.jobId ? { ...j, ...updated, status: 'IN_PROGRESS' } : j)));
    } catch (err: any) {
      console.error('Start Job Error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to resume job', { id: toastId });
    } finally {
      setActionLoadingJobId(null);
    }
  };

  const handlePauseJob = async (job: AwbBatchJobItem) => {
    if (job.status === 'PAUSED') {
      toast.error(`Job ${job.jobId} is already PAUSED. Cannot pause again.`);
      return;
    }
    if (job.status === 'ABORTED') {
      toast.error(`Job ${job.jobId} is ABORTED. Cannot pause an aborted job.`);
      return;
    }
    if (job.status === 'COMPLETED') {
      toast.error(`Job ${job.jobId} is COMPLETED. Cannot modify a completed job.`);
      return;
    }

    setActionLoadingJobId(job.jobId);
    const toastId = toast.loading(`Pausing job ${job.jobId}...`);
    try {
      const updated = await awbBatchJobsService.pauseJob(job.jobId);
      toast.success(`Job ${job.jobId} paused successfully`, { id: toastId });
      setJobs((prev) => prev.map((j) => (j.jobId === job.jobId ? { ...j, ...updated, status: 'PAUSED' } : j)));
    } catch (err: any) {
      console.error('Pause Job Error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to pause job', { id: toastId });
    } finally {
      setActionLoadingJobId(null);
    }
  };

  const handleAbortJob = async (job: AwbBatchJobItem) => {
    if (job.status === 'ABORTED') {
      toast.error(`Job ${job.jobId} is already ABORTED. Cannot abort again.`);
      return;
    }
    if (job.status === 'COMPLETED') {
      toast.error(`Job ${job.jobId} is COMPLETED. Cannot modify a completed job.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to abort job ${job.jobId}? This action cannot be undone.`)) {
      return;
    }

    setActionLoadingJobId(job.jobId);
    const toastId = toast.loading(`Aborting job ${job.jobId}...`);
    try {
      const updated = await awbBatchJobsService.abortJob(job.jobId);
      toast.success(`Job ${job.jobId} aborted`, { id: toastId });
      setJobs((prev) => prev.map((j) => (j.jobId === job.jobId ? { ...j, ...updated, status: 'ABORTED' } : j)));
    } catch (err: any) {
      console.error('Abort Job Error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to abort job', { id: toastId });
    } finally {
      setActionLoadingJobId(null);
    }
  };

  const handleDownloadFailedReport = async (jobId: string) => {
    setDownloadingJobId(jobId);
    const toastId = toast.loading(`Downloading failed requests spreadsheet for ${jobId}...`);
    try {
      await awbBatchJobsService.downloadFailedReport(jobId, 'excel');
      toast.success('Failed requests report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Download Failed Report Error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to download failed report', {
        id: toastId,
      });
    } finally {
      setDownloadingJobId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedJobId(text);
    toast.success('Copied Job ID');
    setTimeout(() => setCopiedJobId(null), 2000);
  };

  const handleResetFilters = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
    setSelectedPartnerId('');
    setSelectedServiceId('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Cascading Filter Controls Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-3 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-3 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {/* 1st Dropdown: Courier Partner */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Courier Partner
            </label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              disabled={loadingPartners}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">All Courier Partners</option>
              {courierPartners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.courierName} ({partner.courierCode})
                </option>
              ))}
            </select>
          </div>

          {/* 2nd Dropdown: Courier Service (Cascaded) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Courier Service
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              disabled={!selectedPartnerId || loadingServices}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            >
              <option value="">
                {!selectedPartnerId
                  ? 'Select Partner First'
                  : loadingServices
                  ? 'Loading Services...'
                  : 'All Courier Services'}
              </option>
              {courierServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.serviceName} ({service.serviceCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Action buttons & Search bar row */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job ID, Courier Service..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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

          {/* Simple Text Stats Strip */}
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium overflow-x-auto py-1">
            <span>Total Jobs: <strong className="text-slate-900 dark:text-white font-bold">{totalJobsCount}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>In Progress: <strong className="text-blue-600 dark:text-blue-400 font-bold">{inProgressCount}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Paused: <strong className="text-amber-600 dark:text-amber-400 font-bold">{pausedCount}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Completed: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{completedCount}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Failed: <strong className="text-red-600 dark:text-red-400 font-bold">{totalFailedCount}</strong></span>
          </div>

          {/* Actions & Refresh */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Reset
            </button>

            <button
              onClick={fetchJobs}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Refresh AWB Batch Jobs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[var(--primary)]' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Jobs List Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">S.No</th>
                <th className="p-4">Job ID</th>
                <th className="p-4">Courier Service</th>
                <th className="p-4">Ship Mode</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Total</th>
                <th className="p-4 text-center">Processed</th>
                <th className="p-4 text-center">Success</th>
                <th className="p-4 text-center">Failed</th>
                <th className="p-4 w-36">Progress</th>
                <th className="p-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
                      <span className="text-xs font-semibold">Loading AWB Batch Jobs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers size={36} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No AWB Batch Jobs Found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery
                          ? 'No jobs match your quick search query.'
                          : 'No background batch jobs submitted for the selected filter parameters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, index) => {
                  const isActionLoading = actionLoadingJobId === job.jobId;
                  const isDownloading = downloadingJobId === job.jobId;

                  // Render Status Badge
                  let statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {job.status}
                    </span>
                  );

                  if (job.status === 'IN_PROGRESS') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        IN PROGRESS
                      </span>
                    );
                  } else if (job.status === 'PAUSED') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                        <Clock size={12} />
                        PAUSED
                      </span>
                    );
                  } else if (job.status === 'COMPLETED') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                        <CheckCircle2 size={12} />
                        COMPLETED
                      </span>
                    );
                  } else if (job.status === 'ABORTED') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                        <Ban size={12} />
                        ABORTED
                      </span>
                    );
                  }

                  const progressVal = Math.min(100, Math.max(0, job.progressPercentage || 0));

                  return (
                    <tr key={job.jobId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* S.No */}
                      <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>

                      {/* Job ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {job.jobId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(job.jobId)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="Copy Job ID"
                          >
                            {copiedJobId === job.jobId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Courier Service */}
                      <td className="p-4 font-bold text-slate-800 dark:text-white">
                        {job.courierServiceName}
                      </td>

                      {/* Ship Mode */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
                          {job.shipMode}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">{statusBadge}</td>

                      {/* Total */}
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-200">
                        {job.totalCount}
                      </td>

                      {/* Processed */}
                      <td className="p-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {job.processedCount}
                      </td>

                      {/* Success */}
                      <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {job.successCount}
                      </td>

                      {/* Failed */}
                      <td className="p-4 text-center font-bold text-red-600 dark:text-red-400">
                        {job.failedCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/50">
                            {job.failedCount}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Progress Percentage */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <span>{progressVal.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                job.status === 'COMPLETED'
                                  ? 'bg-emerald-500'
                                  : job.status === 'ABORTED'
                                  ? 'bg-red-500'
                                  : job.status === 'PAUSED'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500 animate-pulse'
                              }`}
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Play / Resume (Active if PAUSED) */}
                          <button
                            onClick={() => handleStartJob(job)}
                            disabled={job.status !== 'PAUSED' || isActionLoading}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                            title={job.status === 'PAUSED' ? 'Resume Job' : 'Resume available when PAUSED'}
                          >
                            {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                          </button>

                          {/* Pause (Active if IN_PROGRESS) */}
                          <button
                            onClick={() => handlePauseJob(job)}
                            disabled={job.status !== 'IN_PROGRESS' || isActionLoading}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                            title={job.status === 'IN_PROGRESS' ? 'Pause Job' : 'Pause available when IN_PROGRESS'}
                          >
                            {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                          </button>

                          {/* Stop / Abort (Active if IN_PROGRESS or PAUSED) */}
                          <button
                            onClick={() => handleAbortJob(job)}
                            disabled={(job.status !== 'IN_PROGRESS' && job.status !== 'PAUSED') || isActionLoading}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                            title={
                              job.status === 'IN_PROGRESS' || job.status === 'PAUSED'
                                ? 'Abort Job'
                                : 'Abort available when active/paused'
                            }
                          >
                            {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                          </button>

                          {/* Download Failed Report */}
                          <button
                            onClick={() => handleDownloadFailedReport(job.jobId)}
                            disabled={isDownloading || job.failedCount === 0}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                            title={job.failedCount > 0 ? 'Download Failed Requests (.xlsx)' : 'No failed requests'}
                          >
                            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AwbBatchJobsClient;
