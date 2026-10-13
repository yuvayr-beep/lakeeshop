'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText,
  Filter
} from 'lucide-react';
import {
  CourierClaimStatus,
  CourierDamageClaim,
  CourierClaimFilters
} from '@/types/courierReturn';
import { courierReturnService } from '@/services/courierReturnApi';

const CLAIMS_STORAGE_KEY = 'lakee_rto_claims_ledger_clean_v2';

export default function CourierClaimsLedgerClient() {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [claims, setClaims] = useState<CourierDamageClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchAwb, setSearchAwb] = useState<string>('');

  // Dispute Ticket Modal
  const [selectedClaimForDispute, setSelectedClaimForDispute] = useState<CourierDamageClaim | null>(null);
  const [disputeTicketNo, setDisputeTicketNo] = useState<string>('');
  const [disputeClaimAmount, setDisputeClaimAmount] = useState<number>(0);
  const [disputeRemarks, setDisputeRemarks] = useState<string>('');
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState<string>('');
  const [submittingDispute, setSubmittingDispute] = useState<boolean>(false);

  // Settle Claim Modal
  const [selectedClaimForSettle, setSelectedClaimForSettle] = useState<CourierDamageClaim | null>(null);
  const [settlementOutcome, setSettlementOutcome] = useState<'APPROVED_CREDITED' | 'REJECTED'>('APPROVED_CREDITED');
  const [creditNoteNo, setCreditNoteNo] = useState<string>('');
  const [settledAmount, setSettledAmount] = useState<number>(0);
  const [settledDate, setSettledDate] = useState<string>('2026-10-09');
  const [settlementRemarks, setSettlementRemarks] = useState<string>('');
  const [submittingSettlement, setSubmittingSettlement] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lakee_rto_claims_ledger_v1');
    }
  }, []);

  const updateClaimsList = (newList: CourierDamageClaim[]) => {
    setClaims(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(newList));
    }
  };

  // Fetch Claims Ledger from API
  const fetchClaimsLedger = useCallback(async () => {
    setLoadingClaims(true);
    try {
      const filters: CourierClaimFilters = {};
      if (statusFilter !== 'ALL') {
        filters.claimStatus = statusFilter as CourierClaimStatus;
      }
      if (searchAwb.trim()) {
        filters.awbNumber = searchAwb.trim();
      }
      const data = await courierReturnService.getClaims(filters);
      if (data && Array.isArray(data)) {
        setClaims(data);
      } else {
        setClaims([]);
      }
    } catch (err: any) {
      console.error('Failed to load claims ledger:', err);
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(CLAIMS_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setClaims(parsed);
              setLoadingClaims(false);
              return;
            }
          } catch (e) {}
        }
      }
      setClaims([]);
    } finally {
      setLoadingClaims(false);
    }
  }, [statusFilter, searchAwb]);

  useEffect(() => {
    fetchClaimsLedger();
  }, [fetchClaimsLedger]);

  // File Dispute Ticket Submit
  const handleFileDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForDispute) return;

    setSubmittingDispute(true);
    const updatedClaims = claims.map((c) =>
      c.id === selectedClaimForDispute.id
        ? {
            ...c,
            claimReferenceNo: disputeTicketNo,
            claimAmount: disputeClaimAmount,
            claimStatus: 'CLAIM_FILED' as CourierClaimStatus,
            accountsRemarks: disputeRemarks
          }
        : c
    );

    try {
      await courierReturnService.updateClaim(selectedClaimForDispute.id, {
        awbNumber: selectedClaimForDispute.awbNumber,
        claimReferenceNo: disputeTicketNo,
        claimAmount: disputeClaimAmount,
        claimStatus: 'CLAIM_FILED',
        evidenceFileUrl: disputeEvidenceUrl,
        accountsRemarks: disputeRemarks
      });

      alert(`Dispute ticket #${disputeTicketNo} filed successfully!`);
      updateClaimsList(updatedClaims);
      setSelectedClaimForDispute(null);
    } catch (err: any) {
      updateClaimsList(updatedClaims);
      setSelectedClaimForDispute(null);
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Settle Claim Submit
  const handleSettleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForSettle) return;

    setSubmittingSettlement(true);
    const updatedClaims = claims.map((c) =>
      c.id === selectedClaimForSettle.id
        ? {
            ...c,
            claimStatus: settlementOutcome as CourierClaimStatus,
            creditNoteNo: settlementOutcome === 'APPROVED_CREDITED' ? creditNoteNo : undefined,
            settledAmount: settlementOutcome === 'APPROVED_CREDITED' ? settledAmount : 0,
            settledDate: settlementOutcome === 'APPROVED_CREDITED' ? settledDate : undefined,
            accountsRemarks: settlementRemarks
          }
        : c
    );

    try {
      await courierReturnService.settleClaim(selectedClaimForSettle.id, {
        outcome: settlementOutcome,
        creditNoteNo: settlementOutcome === 'APPROVED_CREDITED' ? creditNoteNo : undefined,
        settledAmount: settlementOutcome === 'APPROVED_CREDITED' ? settledAmount : 0,
        settledDate: settlementOutcome === 'APPROVED_CREDITED' ? settledDate : undefined,
        accountsRemarks: settlementRemarks
      });

      alert(`Claim status updated to ${settlementOutcome}!`);
      updateClaimsList(updatedClaims);
      setSelectedClaimForSettle(null);
    } catch (err: any) {
      updateClaimsList(updatedClaims);
      setSelectedClaimForSettle(null);
    } finally {
      setSubmittingSettlement(false);
    }
  };

  const pendingClaimsCount = claims.filter((c) => c.claimStatus === 'PENDING_CLAIM' || c.claimStatus === 'CLAIM_FILED').length;
  const totalClaimValue = claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
  const totalSettledAmount = claims
    .filter((c) => c.claimStatus === 'APPROVED_CREDITED')
    .reduce((sum, c) => sum + (c.settledAmount || c.claimAmount || 0), 0);

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Dispute Action</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingClaimsCount}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Claims Value</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ₹{isMounted ? totalClaimValue.toLocaleString('en-IN') : totalClaimValue}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Credit Settled</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{isMounted ? totalSettledAmount.toLocaleString('en-IN') : totalSettledAmount}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
        {/* Controls & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Filter className="h-4 w-4 text-amber-500" />
              <span>Transit Damage Ledger Entries</span>
            </div>
            <button
              type="button"
              onClick={fetchClaimsLedger}
              className="h-8 px-3 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-amber-500 ${loadingClaims ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search AWB */}
            <div className="relative">
              <input
                type="text"
                value={searchAwb}
                onChange={(e) => setSearchAwb(e.target.value)}
                placeholder="Search AWB..."
                className="w-48 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-8"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_CLAIM">Pending Claim</option>
              <option value="CLAIM_FILED">Claim Filed</option>
              <option value="APPROVED_CREDITED">Approved & Credited</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Claims Data Table */}
        {loadingClaims ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-xs font-semibold">Loading Courier Damage Claims Ledger...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No damage claims found in ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-3">ID / AWB Number</th>
                  <th className="p-3">Courier Partner</th>
                  <th className="p-3">Order / Pack Ref</th>
                  <th className="p-3">Damage Reason</th>
                  <th className="p-3">Evidence Proof</th>
                  <th className="p-3">Claim Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Dispute / Credit Note Ref</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">{claim.awbNumber}</div>
                      <div className="text-[10px] text-slate-400">ID: #{claim.id}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {claim.courierCode || 'DEFAULT'}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      <div>{claim.packRefNo || '-'}</div>
                      <div className="text-[10px] text-slate-400">{claim.orderRefNo}</div>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={claim.damageReason}>
                      {claim.damageReason || 'Transit Damage'}
                    </td>
                    <td className="p-3">
                      {claim.evidenceFileUrl ? (
                        <a
                          href={claim.evidenceFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View Proof
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No Media</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      ₹{isMounted ? (claim.claimAmount || 0).toLocaleString('en-IN') : claim.claimAmount}
                    </td>
                    <td className="p-3">
                      {claim.claimStatus === 'PENDING_CLAIM' && (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                          PENDING CLAIM
                        </span>
                      )}
                      {claim.claimStatus === 'CLAIM_FILED' && (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full">
                          CLAIM FILED
                        </span>
                      )}
                      {claim.claimStatus === 'APPROVED_CREDITED' && (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                          APPROVED & CREDITED
                        </span>
                      )}
                      {claim.claimStatus === 'REJECTED' && (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-full">
                          REJECTED
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {claim.claimReferenceNo && (
                        <div className="font-semibold text-slate-900 dark:text-white">Tkt: {claim.claimReferenceNo}</div>
                      )}
                      {claim.creditNoteNo && (
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">CN: {claim.creditNoteNo}</div>
                      )}
                      {!claim.claimReferenceNo && !claim.creditNoteNo && (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {claim.claimStatus === 'PENDING_CLAIM' && (
                        <button
                          onClick={() => {
                            setSelectedClaimForDispute(claim);
                            setDisputeTicketNo('');
                            setDisputeClaimAmount(claim.claimAmount || 0);
                            setDisputeRemarks(claim.damageReason || '');
                            setDisputeEvidenceUrl(claim.evidenceFileUrl || '');
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          File Ticket
                        </button>
                      )}
                      {(claim.claimStatus === 'CLAIM_FILED' || claim.claimStatus === 'PENDING_CLAIM') && (
                        <button
                          onClick={() => {
                            setSelectedClaimForSettle(claim);
                            setSettlementOutcome('APPROVED_CREDITED');
                            setCreditNoteNo('');
                            setSettledAmount(claim.claimAmount || 0);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Settle / Credit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DISPUTE TICKET MODAL */}
      {selectedClaimForDispute && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                File Courier Dispute Ticket
              </h3>
              <button onClick={() => setSelectedClaimForDispute(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFileDisputeSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>AWB: {selectedClaimForDispute.awbNumber}</span>
                  <span>Courier: {selectedClaimForDispute.courierCode}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">Pack Ref: {selectedClaimForDispute.packRefNo}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Courier Ticket / Dispute Reference No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={disputeTicketNo}
                  onChange={(e) => setDisputeTicketNo(e.target.value)}
                  placeholder="e.g. BLUEDART-DISP-8921"
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claimed Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={disputeClaimAmount}
                  onChange={(e) => setDisputeClaimAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Accounts Dispute Remarks
                </label>
                <textarea
                  rows={2}
                  value={disputeRemarks}
                  onChange={(e) => setDisputeRemarks(e.target.value)}
                  placeholder="Ticket raised with regional courier hub..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClaimForDispute(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  {submittingDispute && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Dispute Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE CLAIM MODAL */}
      {selectedClaimForSettle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Settle Courier Claim
              </h3>
              <button onClick={() => setSelectedClaimForSettle(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSettleClaimSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>AWB: {selectedClaimForSettle.awbNumber}</span>
                  <span>Ticket: {selectedClaimForSettle.claimReferenceNo || 'N/A'}</span>
                </div>
              </div>

              {/* Outcome Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Settlement Outcome <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettlementOutcome('APPROVED_CREDITED')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      settlementOutcome === 'APPROVED_CREDITED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    APPROVED & CREDITED
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementOutcome('REJECTED')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      settlementOutcome === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    CARRIER REJECTED
                  </button>
                </div>
              </div>

              {settlementOutcome === 'APPROVED_CREDITED' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Credit Note Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={creditNoteNo}
                      onChange={(e) => setCreditNoteNo(e.target.value)}
                      placeholder="e.g. CN-BLUEDART-OCT-2026-081"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Settled Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        value={settledAmount}
                        onChange={(e) => setSettledAmount(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Settlement Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={settledDate}
                        onChange={(e) => setSettledDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement & Freight Notes
                </label>
                <textarea
                  rows={2}
                  value={settlementRemarks}
                  onChange={(e) => setSettlementRemarks(e.target.value)}
                  placeholder="Deducted against monthly freight invoice..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClaimForSettle(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSettlement}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingSettlement && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
