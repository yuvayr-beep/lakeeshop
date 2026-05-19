'use client';
import React from 'react';
import { motion } from 'framer-motion';
import KpiGrid from './KpiGrid';
import RedemptionChart from './RedemptionChart';
import TransactionStatusChart from './TransactionStatusChart';
import RecentTransactionsTable from './RecentTransactionsTable';

export default function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-700 text-foreground">Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monday, 18 May 2026 · LAKEEE Redemption Network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-500 text-muted-foreground hidden sm:block">Period:</span>
          <select className="text-xs font-600 bg-card border border-border rounded-lg px-3 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer">
            <option>Last 14 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </motion.div>
      {/* KPI Cards */}
      <KpiGrid />
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-5">
        <div className="lg:col-span-3 xl:col-span-3 2xl:col-span-3">
          <RedemptionChart />
        </div>
        <div className="lg:col-span-2 xl:col-span-2 2xl:col-span-2">
          <TransactionStatusChart />
        </div>
      </div>
      {/* Transactions table */}
      <RecentTransactionsTable />
    </div>
  );
}