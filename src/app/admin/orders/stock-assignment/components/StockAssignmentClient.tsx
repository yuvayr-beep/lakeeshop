'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Search,
  RotateCcw,
  Truck,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  PackageCheck,
  ChevronRight,
  X,
  AlertTriangle,
  Sparkles,
  Flame,
  Zap,
  Trophy,
  Star,
  Target,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { singleOrderService, ClientItem } from '@/services/singleOrder.service';
import { batchOrderService } from '@/services/batchOrder.service';
import {
  stockAssignmentService,
  EligibleBusinessUnitItem,
  StockAssignBatchResponse,
  StockAssignBatchDetailData,
  FailedStockAssignItem,
} from '@/services/stockAssignment.service';

export default function StockAssignmentClient() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter States
  const [fromDate, setFromDate] = useState<string>('2026-07-01');
  const [toDate, setToDate] = useState<string>(todayStr);
  const [selectedClientId, setSelectedClientId] = useState<string>('33');
  const [selectedBuId, setSelectedBuId] = useState<string>('6');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);

  const [tableData, setTableData] = useState<EligibleBusinessUnitItem[]>([]);
  const [loadingTable, setLoadingTable] = useState<boolean>(false);
  const [selectedBatchNumbers, setSelectedBatchNumbers] = useState<string[]>([]);
  
  // Modals & Action States
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [assigningStock, setAssigningStock] = useState<boolean>(false);
  const [downloadingExcel, setDownloadingExcel] = useState<boolean>(false);
  const [batchStatusDetail, setBatchStatusDetail] = useState<StockAssignBatchDetailData | null>(null);

  // Angry Birds Progress Loader States
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [birdShotCount, setBirdShotCount] = useState<number>(0);
  const [birdState, setBirdState] = useState<'idle' | 'flying' | 'hit'>('idle');
  const [statusMessageText, setStatusMessageText] = useState<string>('Initializing Stock Assignment...');

  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 1. Fetch Clients list on mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const clientList = await singleOrderService.getClients();
        setClients(clientList || []);

        if (clientList && clientList.length > 0 && !selectedClientId) {
          const firstClt = clientList[0];
          setSelectedClientId(String(firstClt.id));
          if (firstClt.businessUnits && firstClt.businessUnits.length > 0) {
            setSelectedBuId(String(firstClt.businessUnits[0].id));
          }
        }
      } catch (err) {
        console.warn('Failed to load clients list:', err);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Update available Business Units dropdown based on selected Client
  const availableBusinessUnits = useMemo(() => {
    if (!selectedClientId || selectedClientId === 'ALL') return [];
    const client = clients.find((c) => String(c.id) === String(selectedClientId));
    return client?.businessUnits || [];
  }, [clients, selectedClientId]);

  // Sync selected BU ID when Client changes
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClientId = e.target.value;
    setSelectedClientId(newClientId);

    if (newClientId === 'ALL') {
      setSelectedBuId('ALL');
    } else {
      const client = clients.find((c) => String(c.id) === String(newClientId));
      if (client?.businessUnits && client.businessUnits.length > 0) {
        setSelectedBuId(String(client.businessUnits[0].id));
      } else {
        setSelectedBuId('6');
      }
    }
  };

  // 2. Fetch Eligible Business Units for Stock Assignment
  const fetchStockAssignmentData = useCallback(async () => {
    setLoadingTable(true);
    setAlertMessage(null);
    try {
      const records = await stockAssignmentService.getEligibleBusinessUnits({
        fromDate,
        toDate,
        clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined,
        businessUnitId: selectedBuId !== 'ALL' ? selectedBuId : undefined,
      });

      setTableData(records || []);
      setSelectedBatchNumbers([]); // Reset selection on new search
    } catch (err: any) {
      console.error('Error fetching stock assignment data:', err);
      setTableData([]);
      setAlertMessage({
        type: 'error',
        text: 'Failed to load stock assignment data. Please verify filters and try again.',
      });
    } finally {
      setLoadingTable(false);
    }
  }, [fromDate, toDate, selectedClientId, selectedBuId]);

  useEffect(() => {
    fetchStockAssignmentData();
  }, [fetchStockAssignmentData]);

  // Filter table data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return tableData;
    const query = searchQuery.toLowerCase();
    return tableData.filter(
      (item) =>
        (item.clientName || '').toLowerCase().includes(query) ||
        (item.businessUnitName || '').toLowerCase().includes(query) ||
        (item.orderBatchNumber || '').toLowerCase().includes(query)
    );
  }, [tableData, searchQuery]);

  // Checkbox Selection Logic
  const isAllSelected = useMemo(() => {
    if (filteredData.length === 0) return false;
    return filteredData.every((item) =>
      selectedBatchNumbers.includes(item.orderBatchNumber)
    );
  }, [filteredData, selectedBatchNumbers]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBatchNumbers([]);
    } else {
      const allBatchNos = filteredData.map((item) => item.orderBatchNumber);
      setSelectedBatchNumbers(allBatchNos);
    }
  };

  const toggleSelectRow = (batchNo: string) => {
    setSelectedBatchNumbers((prev) =>
      prev.includes(batchNo)
        ? prev.filter((no) => no !== batchNo)
        : [...prev, batchNo]
    );
  };

  // Selected Items Details
  const selectedItemsData = useMemo(() => {
    return filteredData.filter((d) => selectedBatchNumbers.includes(d.orderBatchNumber));
  }, [filteredData, selectedBatchNumbers]);

  // Summary Metrics
  const totalOrdersSum = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + (curr.totalOrdersInBatch || 0), 0);
  }, [filteredData]);

  const pendingAssignmentSum = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => acc + (curr.eligibleForStockAssignmentCount || 0),
      0
    );
  }, [filteredData]);

  const selectedPendingAssignmentSum = useMemo(() => {
    return selectedItemsData.reduce(
      (acc, curr) => acc + (curr.eligibleForStockAssignmentCount || 0),
      0
    );
  }, [selectedItemsData]);

  // Reset Filters
  const handleResetFilters = () => {
    setFromDate('2026-07-01');
    setToDate(todayStr);
    setSelectedClientId('33');
    setSelectedBuId('6');
    setSearchQuery('');
  };

  // Format Date Helper
  const formatDateDisplay = (dateVal?: string | null) => {
    if (!dateVal) return fromDate || '-';
    try {
      if (dateVal.includes('T')) return dateVal.split('T')[0];
      return dateVal;
    } catch {
      return dateVal;
    }
  };

  // Download Table to Excel via API (POST /order/dashboard/details/excel?metricType=totalPendingStockAssign)
  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      await stockAssignmentService.downloadPendingStockAssignExcel();
    } catch (err: any) {
      console.error('Failed to download Excel file via API:', err);
      alert(err?.message || 'Failed to download batch report Excel file. Please try again.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Reset Angry Birds Mini-Game Loader State
  const resetLoaderGameState = useCallback(() => {
    setProgressPercent(0);
    setBirdShotCount(0);
    setBirdState('idle');
    setStatusMessageText('Ready to Assign Stocks...');
    setBatchStatusDetail(null);
  }, []);

  const handleOpenConfirmModal = () => {
    resetLoaderGameState();
    setShowConfirmModal(true);
  };

  const handleCloseConfirmModal = () => {
    if (!assigningStock) {
      setShowConfirmModal(false);
      resetLoaderGameState();
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    resetLoaderGameState();
  };

  // Launch Angry Bird Flight Step
  const launchBirdStep = () => {
    setBirdState('flying');
    setTimeout(() => {
      setBirdState('hit');
      setBirdShotCount((prev) => prev + 1);
      setTimeout(() => {
        setBirdState('idle');
      }, 500);
    }, 700);
  };

  // Execute Stock Assignment: Calls POST /batch ➔ Polls GET /batch/{batchNo} until status is COMPLETED or FAILED
  const executeStockAssignment = async () => {
    if (selectedBatchNumbers.length === 0) return;

    setAssigningStock(true);
    setAlertMessage(null);
    setProgressPercent(15);
    setBirdShotCount(0);
    setStatusMessageText('Posting Stock Assignment Request...');

    launchBirdStep();

    try {
      // Step 1: POST to start batch stock assignment
      const postRes = await stockAssignmentService.assignStockBatch(selectedBatchNumbers);
      const initialData = postRes?.data;
      const stockAssignBatchNo = initialData?.stockAssignBatchNo || initialData?.id;

      if (!stockAssignBatchNo) {
        throw new Error(postRes?.message || 'Failed to retrieve Stock Assign Batch No from server.');
      }

      setStatusMessageText(`Batch ${stockAssignBatchNo} started. Polling status...`);
      setProgressPercent(35);

      // Step 2: Poll GET /order/stock-assignment/batch/{stockAssignBatchNo} until status is COMPLETED
      let isCompleted = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 ticks = up to 60 seconds

      const pollStatus = async () => {
        attempts++;
        try {
          launchBirdStep();
          const statusRes = await stockAssignmentService.getStockAssignBatchStatus(stockAssignBatchNo);
          const detailData = statusRes?.data || (statusRes as any);
          const statusStr = (detailData?.status || '').toUpperCase();

          const total = detailData?.totalEligible ?? selectedPendingAssignmentSum ?? 1;
          const pending = detailData?.pendingCount ?? 0;
          const processing = detailData?.processingCount ?? 0;

          if (total > 0 && pending >= 0) {
            const calculatedPercent = Math.min(
              95,
              Math.max(35, Math.round(((total - pending - processing) / total) * 100))
            );
            setProgressPercent(calculatedPercent);
          } else {
            setProgressPercent((prev) => Math.min(90, prev + 15));
          }

          setStatusMessageText(`Status: ${statusStr} | Processing records... (${attempts})`);

          // Check for terminal statuses
          if (statusStr === 'COMPLETED' || statusStr === 'SUCCESS' || statusStr === 'FAILED' || (pending === 0 && processing === 0 && attempts > 1)) {
            isCompleted = true;
            setProgressPercent(100);
            setBatchStatusDetail(detailData);

            setTimeout(() => {
              setShowConfirmModal(false);
              setShowSuccessModal(true);
              setAssigningStock(false);

              setAlertMessage({
                type: 'success',
                text: `Batch ${stockAssignBatchNo} completed with status ${statusStr}.`,
              });
            }, 800);

            await fetchStockAssignmentData();
          }
        } catch (pollErr) {
          console.warn(`Poll attempt #${attempts} failed:`, pollErr);
        }
      };

      // Run immediate status check then poll every 1.8 seconds
      await pollStatus();
      if (!isCompleted) {
        const intervalId = setInterval(async () => {
          if (isCompleted || attempts >= maxAttempts) {
            clearInterval(intervalId);
            if (!isCompleted) {
              setAssigningStock(false);
              setAlertMessage({
                type: 'error',
                text: 'Stock assignment status polling timed out. Please check batch history.',
              });
            }
            return;
          }
          await pollStatus();
        }, 1800);
      }
    } catch (err: any) {
      console.error('Assign Stock execution error:', err);
      setAssigningStock(false);
      setProgressPercent(0);
      const msg = err.response?.data?.message || err.message || 'Stock assignment process failed.';
      setAlertMessage({
        type: 'error',
        text: `Error: ${msg}`,
      });
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-semibold shadow-xs ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alertMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Filter className="h-4 w-4 text-amber-500" />
            <span>Filters & Search Criteria</span>
          </div>

          {/* Combined Single Action Button Group */}
          <div className="inline-flex items-center rounded-2xl border border-slate-300 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-800">
            {/* Download Excel Segment */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel || loadingTable || filteredData.length === 0}
              title="Download Excel Report"
              className="h-9 px-4 flex items-center justify-center gap-2 text-xs font-bold rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {downloadingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
              ) : (
                <Download className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span>Download Excel</span>
            </button>

            {/* Divider Line */}
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

            {/* Assign Stock Segment */}
            <button
              type="button"
              onClick={handleOpenConfirmModal}
              disabled={selectedBatchNumbers.length === 0 || assigningStock || loadingTable}
              title={
                selectedBatchNumbers.length === 0
                  ? 'Select at least 1 batch checkbox in table to assign stock'
                  : `Assign stock for ${selectedBatchNumbers.length} selected batch(es)`
              }
              className={`h-9 px-5 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all ${
                selectedBatchNumbers.length > 0 && !assigningStock
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-amber-400/40 text-slate-400 dark:bg-slate-700/60 dark:text-slate-500 opacity-70 cursor-not-allowed'
              }`}
            >
              {assigningStock ? (
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-white animate-bounce" />
                  <span className="animate-pulse">Assigning Stock...</span>
                </div>
              ) : (
                <>
                  <Boxes className={`h-4 w-4 shrink-0 ${selectedBatchNumbers.length > 0 ? 'animate-pulse' : ''}`} />
                  <span>
                    {selectedBatchNumbers.length > 0
                      ? `Assign Stock (${selectedBatchNumbers.length})`
                      : 'Assign Stock'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Order Date From */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Order Date From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Order Date To */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Order Date To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Client Name Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client Name <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={handleClientChange}
              disabled={loadingClients}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">All Clients</option>
              {clients.map((clt) => (
                <option key={clt.id} value={clt.id}>
                  {clt.clientName || clt.clientCode}
                </option>
              ))}
            </select>
          </div>

          {/* Business Unit Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Business Unit
            </label>
            <select
              value={selectedBuId}
              onChange={(e) => setSelectedBuId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">All Business Units</option>
              {availableBusinessUnits.length > 0 ? (
                availableBusinessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.unitName || bu.unitCode || `BU #${bu.id}`}
                  </option>
                ))
              ) : (
                <option value="6">AXIS B2C UNIT (#6)</option>
              )}
            </select>
          </div>
        </div>

        {/* Filter Action Buttons & Search */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Client, BU or Batch No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={fetchStockAssignmentData}
              disabled={loadingTable}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loadingTable ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Stock Assignment Data Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-amber-500 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Batches Pending Stock Assignment ({filteredData.length})
            </h2>
            <button
              type="button"
              onClick={fetchStockAssignmentData}
              disabled={loadingTable}
              title="Reload Pending Stock Assignment List"
              className="ml-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${
                  loadingTable ? 'animate-spin' : ''
                }`}
              />
              <span>Reload</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>
              Total Orders: <strong className="text-slate-900 dark:text-white">{totalOrdersSum}</strong>
            </span>
            <span>
              Pending Assignment:{' '}
              <strong className="text-amber-600 dark:text-amber-400">
                {pendingAssignmentSum}
              </strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                <th className="px-4 py-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    disabled={filteredData.length === 0}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 uppercase">CLIENT NAME</th>
                <th className="px-4 py-3 uppercase">ORDER DATE</th>
                <th className="px-4 py-3 uppercase">BUSINESS UNIT</th>
                <th className="px-4 py-3 uppercase">BATCH NO</th>
                <th className="px-4 py-3 text-center uppercase">TOTAL ORDER COUNT</th>
                <th className="px-4 py-3 text-center uppercase">PENDING STOCK ASSIGNMENT</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/60 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {loadingTable ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-500" />
                    <span className="mt-2 block text-xs font-semibold">
                      Fetching stock assignment data...
                    </span>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Boxes className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      No batch records found pending stock assignment.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try adjusting the date range or client filters above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isSelected = selectedBatchNumbers.includes(item.orderBatchNumber);
                  return (
                    <tr
                      key={item.orderBatchNumber}
                      onClick={() => toggleSelectRow(item.orderBatchNumber)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.orderBatchNumber)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {item.clientName || 'Axis Pvt Ltd'}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 font-mono">
                        {formatDateDisplay(item.orderDate || item.batchDate || item.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                        {item.businessUnitName || 'AXIS B2C UNIT'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.orderBatchNumber}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.totalOrdersInBatch || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-0.5 font-mono text-xs font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                          {item.eligibleForStockAssignmentCount || 0}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredData.length}</strong> batch entry(ies)
            {selectedBatchNumbers.length > 0 && (
              <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">
                ({selectedBatchNumbers.length} batch(es) selected)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenConfirmModal}
            disabled={selectedBatchNumbers.length === 0 || assigningStock}
            className={`h-9 px-4 flex items-center justify-center gap-2 text-xs font-bold rounded-xl shadow-xs transition-all ${
              selectedBatchNumbers.length > 0 && !assigningStock
                ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>
              {selectedBatchNumbers.length > 0
                ? `Assign Stock (${selectedBatchNumbers.length})`
                : 'Select Row Checkbox to Assign'}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal WITH ANGRY BIRDS PROGRESS BAR LOADER */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 overflow-hidden relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 shadow-sm">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Stock Assignment Engine</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700 dark:bg-red-950 dark:text-red-300">
                      PROGRESS LOADER 🎯
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Batches to process: {selectedBatchNumbers.length} | Total Orders: {selectedPendingAssignmentSum}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseConfirmModal}
                disabled={assigningStock}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ANGRY BIRDS SLINGSHOT PROGRESS BAR ARENA */}
            <div className="rounded-2xl border border-red-200/80 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 p-4 shadow-inner relative space-y-3">
              
              {/* Progress Percentage Badge Header */}
              <div className="flex items-center justify-between text-xs font-black">
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <Target className="h-4 w-4 animate-spin" />
                  <span>
                    {assigningStock
                      ? `ASSIGNING STOCKS... ${progressPercent}%`
                      : 'READY TO ASSIGN STOCKS'}
                  </span>
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-mono">
                  HITS: {birdShotCount} 🔥
                </div>
              </div>

              {/* Status Message Log Line */}
              {assigningStock && (
                <div className="text-[11px] font-mono text-center font-bold text-slate-600 dark:text-slate-300 truncate bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded">
                  {statusMessageText}
                </div>
              )}

              {/* Dynamic Progress Bar Container */}
              <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-4 p-0.5 border border-slate-300 dark:border-slate-700 shadow-inner relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1"
                  style={{ width: `${Math.max(progressPercent, 5)}%` }}
                >
                  <span className="text-[9px] font-black text-white drop-shadow-xs">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Slingshot & Target Stage Canvas */}
              <div className="relative w-full h-24 flex items-end justify-between px-4 pt-2">
                
                {/* Slingshot Base & Bird */}
                <div className="relative bottom-0 left-2 flex flex-col items-center">
                  <div className="w-4 h-12 bg-amber-800 rounded-t-sm shadow-md border-r-2 border-amber-900 relative">
                    <div className="absolute -top-3 -left-2 w-8 h-3 border-t-4 border-amber-950 rounded-t-full"></div>
                  </div>

                  {/* Angry Bird Dynamic Launcher */}
                  <div
                    className={`absolute transition-all duration-700 ease-out z-20 ${
                      birdState === 'flying'
                        ? 'translate-x-[260px] -translate-y-12 rotate-[360deg] scale-125'
                        : birdState === 'hit'
                        ? 'translate-x-[270px] translate-y-2 rotate-45 scale-110'
                        : 'top-[-16px] left-[-6px]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-700 via-red-600 to-amber-500 border-2 border-red-900 shadow-lg flex items-center justify-center relative font-black text-[10px] text-white">
                      <div className="absolute top-1 flex flex-col items-center">
                        <div className="w-4 h-1 bg-black rotate-6 rounded-full mb-0.5"></div>
                        <div className="flex gap-1 text-[8px]">👀</div>
                      </div>
                      <div className="absolute bottom-1 w-2.5 h-2 bg-yellow-400 border-b border-amber-600 rounded-xs"></div>
                    </div>
                  </div>
                </div>

                {/* Stock Boxes Target Heap */}
                <div className="relative right-4 flex items-end gap-1">
                  {birdState === 'hit' && (
                    <div className="absolute -top-8 -left-6 z-30 animate-ping">
                      <Sparkles className="h-10 w-10 text-yellow-400 fill-yellow-400" />
                    </div>
                  )}

                  <div className={`flex flex-col items-center gap-1 transition-transform ${birdState === 'hit' ? 'animate-bounce' : ''}`}>
                    <div className="w-7 h-7 bg-amber-700 rounded border-2 border-amber-900 shadow-sm flex items-center justify-center text-[10px] font-black text-amber-100">
                      📦
                    </div>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-amber-800 rounded border-2 border-amber-950 shadow-sm flex items-center justify-center text-xs font-black text-amber-200">
                        📦
                      </div>
                      <div className="w-8 h-8 bg-amber-800 rounded border-2 border-amber-950 shadow-sm flex items-center justify-center text-xs font-black text-amber-200">
                        📦
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floor Terrain */}
              <div className="w-full h-3 bg-emerald-600 dark:bg-emerald-800 rounded-full shadow-inner"></div>
            </div>

            {/* Selected Batch Tags List */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Target Order Batches ({selectedBatchNumbers.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                {selectedBatchNumbers.map((no) => (
                  <span
                    key={no}
                    className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700 dark:bg-slate-800 dark:text-blue-300 border border-slate-200 dark:border-slate-700"
                  >
                    {no}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseConfirmModal}
                disabled={assigningStock}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeStockAssignment}
                disabled={assigningStock}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-6 py-2.5 text-xs font-black text-white shadow-md hover:from-red-700 hover:to-amber-600 active:scale-95 transition-all disabled:opacity-50"
              >
                {assigningStock ? (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-white animate-bounce" />
                    <span className="animate-pulse">Assigning ({progressPercent}%)...</span>
                  </div>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    <span>Assign Stocks</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL RESPONSE SUCCESS / SUMMARY MODAL WITH FAILED ITEMS DISPLAY */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-600 space-y-5 relative overflow-hidden">
            
            {/* Header Icon & Status */}
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl ring-4 ring-emerald-100 dark:ring-emerald-950">
                <Trophy className="h-9 w-9 animate-bounce" />
              </div>

              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {batchStatusDetail?.status === 'COMPLETED' || batchStatusDetail?.status === 'SUCCESS'
                    ? 'BATCH EXECUTION COMPLETED!'
                    : `BATCH STATUS: ${batchStatusDetail?.status || 'PROCESSED'}`}
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Stock assignment process finished with status details below.
                </p>
              </div>
            </div>

            {/* Batch Details Grid */}
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
              {batchStatusDetail?.stockAssignBatchNo && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-semibold">Stock Assign Batch No:</span>
                  <span className="font-mono font-extrabold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800">
                    {batchStatusDetail.stockAssignBatchNo}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[11px]">Total Eligible:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {batchStatusDetail?.totalEligible ?? selectedPendingAssignmentSum ?? 0}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[11px]">Execution Status:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                    {batchStatusDetail?.status || 'COMPLETED'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[11px]">Success Count:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {batchStatusDetail?.successCount ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseSuccessModal}
              className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-wider"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
