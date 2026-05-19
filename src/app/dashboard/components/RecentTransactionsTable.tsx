'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, ChevronUp, ChevronDown, Eye } from 'lucide-react';

type TxStatus = 'Completed' | 'Processing' | 'Pending' | 'Failed' | 'Reversed';

interface Transaction {
  id: string;
  txRef: string;
  partnerName: string;
  amount: number;
  redeemPoints: number;
  status: TxStatus;
  type: string;
  date: string;
  time: string;
}

const transactions: Transaction[] = [
  {
    id: 'tx-001',
    txRef: 'LKE-2605-8812',
    partnerName: 'Arjun Mehta',
    amount: 4250,
    redeemPoints: 4250,
    status: 'Completed',
    type: 'Gift Voucher',
    date: '18 May 2026',
    time: '10:22 AM',
  },
  {
    id: 'tx-002',
    txRef: 'LKE-2605-8811',
    partnerName: 'Priya Nair',
    amount: 1800,
    redeemPoints: 1800,
    status: 'Processing',
    type: 'Cashback',
    date: '18 May 2026',
    time: '09:58 AM',
  },
  {
    id: 'tx-003',
    txRef: 'LKE-2605-8809',
    partnerName: 'Suresh Kumar',
    amount: 6700,
    redeemPoints: 6700,
    status: 'Completed',
    type: 'Gift Voucher',
    date: '18 May 2026',
    time: '09:31 AM',
  },
  {
    id: 'tx-004',
    txRef: 'LKE-2605-8807',
    partnerName: 'Divya Sharma',
    amount: 900,
    redeemPoints: 900,
    status: 'Failed',
    type: 'Cashback',
    date: '17 May 2026',
    time: '06:14 PM',
  },
  {
    id: 'tx-005',
    txRef: 'LKE-2605-8803',
    partnerName: 'Kiran Reddy',
    amount: 3300,
    redeemPoints: 3300,
    status: 'Completed',
    type: 'Fuel Voucher',
    date: '17 May 2026',
    time: '04:47 PM',
  },
  {
    id: 'tx-006',
    txRef: 'LKE-2605-8798',
    partnerName: 'Meena Pillai',
    amount: 2100,
    redeemPoints: 2100,
    status: 'Pending',
    type: 'Gift Voucher',
    date: '17 May 2026',
    time: '02:33 PM',
  },
  {
    id: 'tx-007',
    txRef: 'LKE-2605-8791',
    partnerName: 'Ravi Shankar',
    amount: 5450,
    redeemPoints: 5450,
    status: 'Completed',
    type: 'Cashback',
    date: '17 May 2026',
    time: '11:08 AM',
  },
  {
    id: 'tx-008',
    txRef: 'LKE-2605-8784',
    partnerName: 'Anita Joshi',
    amount: 1250,
    redeemPoints: 1250,
    status: 'Reversed',
    type: 'Gift Voucher',
    date: '16 May 2026',
    time: '05:22 PM',
  },
  {
    id: 'tx-009',
    txRef: 'LKE-2605-8776',
    partnerName: 'Venkat Rao',
    amount: 8900,
    redeemPoints: 8900,
    status: 'Completed',
    type: 'Travel Voucher',
    date: '16 May 2026',
    time: '03:11 PM',
  },
  {
    id: 'tx-010',
    txRef: 'LKE-2605-8769',
    partnerName: 'Lakshmi Iyer',
    amount: 3750,
    redeemPoints: 3750,
    status: 'Completed',
    type: 'Fuel Voucher',
    date: '16 May 2026',
    time: '10:44 AM',
  },
  {
    id: 'tx-011',
    txRef: 'LKE-2605-8762',
    partnerName: 'Deepak Singh',
    amount: 2600,
    redeemPoints: 2600,
    status: 'Processing',
    type: 'Cashback',
    date: '15 May 2026',
    time: '04:09 PM',
  },
  {
    id: 'tx-012',
    txRef: 'LKE-2605-8754',
    partnerName: 'Sunita Patel',
    amount: 4100,
    redeemPoints: 4100,
    status: 'Completed',
    type: 'Gift Voucher',
    date: '15 May 2026',
    time: '01:55 PM',
  },
];

const statusConfig: Record<TxStatus, { label: string; classes: string }> = {
  Completed: {
    label: 'Completed',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  Processing: {
    label: 'Processing',
    classes: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  Pending: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  Failed: {
    label: 'Failed',
    classes: 'bg-red-50 text-red-700 border border-red-200',
  },
  Reversed: {
    label: 'Reversed',
    classes: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
};

type SortKey = 'date' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';

export default function RecentTransactionsTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TxStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.txRef.toLowerCase().includes(search.toLowerCase()) ||
      tx.partnerName.toLowerCase().includes(search.toLowerCase()) ||
      tx.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || tx.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'amount') {
      return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    if (sortKey === 'status') {
      return sortDir === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    // date (default)
    return sortDir === 'asc'
      ? a.id.localeCompare(b.id)
      : b.id.localeCompare(a.id);
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-primary" />
    );
  };

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border shadow-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.4 }}
    >
      {/* Table header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex-1">
          <h3 className="text-sm font-700 text-foreground">Recent Transactions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} transactions found
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-input outline-none focus:ring-2 focus:ring-ring/30 w-44 placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TxStatus | 'All');
                setPage(1);
              }}
              className="pl-7 pr-3 py-1.5 text-xs border border-border rounded-lg bg-input outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Processing">Processing</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Reversed">Reversed</option>
            </select>
          </div>

          {/* Export */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors duration-150 border border-border">
            <Download size={12} />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {[
                { key: 'txRef', label: 'Ref No.', sortable: false },
                { key: 'partnerName', label: 'Partner', sortable: false },
                { key: 'type', label: 'Type', sortable: false },
                { key: 'amount', label: 'Amount', sortable: true },
                { key: 'redeemPoints', label: 'Points', sortable: false },
                { key: 'status', label: 'Status', sortable: true },
                { key: 'date', label: 'Date & Time', sortable: true },
                { key: 'actions', label: '', sortable: false },
              ].map((col) => (
                <th
                  key={`th-${col.key}`}
                  className={`px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wide ${
                    col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key as SortKey) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key as SortKey} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-sm font-500 text-muted-foreground">No transactions found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Try adjusting your search or filter criteria
                  </p>
                </td>
              </tr>
            ) : (
              paginated.map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-100 group"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-600 text-primary tabular-nums">{tx.txRef}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-700 text-primary">
                          {tx.partnerName.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-xs font-500 text-foreground truncate max-w-[100px]">
                        {tx.partnerName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{tx.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-700 text-foreground tabular-nums">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-500 text-muted-foreground tabular-nums">
                      {tx.redeemPoints.toLocaleString('en-IN')} pts
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-600 ${
                        statusConfig[tx.status].classes
                      }`}
                    >
                      {statusConfig[tx.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-500 text-foreground tabular-nums">{tx.date}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{tx.time}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/8 flex items-center justify-center">
                      <Eye size={13} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-600 text-foreground tabular-nums">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)}
            </span>{' '}
            of{' '}
            <span className="font-600 text-foreground tabular-nums">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 text-xs font-500 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={`page-${i + 1}`}
                onClick={() => setPage(i + 1)}
                className={`w-7 h-7 text-xs font-600 rounded-lg transition-colors duration-150 ${
                  page === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 text-xs font-500 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}