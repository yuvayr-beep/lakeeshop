'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { ShoppingBag, DollarSign, FileText, TrendingUp, Package, Truck, AlertTriangle, Clock, Zap, Shield } from 'lucide-react';

const profitLossData = [
  { month: 'Jan', profit: 1400000, loss: 800000 },
  { month: 'Feb', profit: 1200000, loss: 600000 },
  { month: 'Mar', profit: 2000000, loss: 900000 },
  { month: 'Apr', profit: 1800000, loss: 750000 },
  { month: 'May', profit: 2200000, loss: 850000 },
  { month: 'Jun', profit: 2400000, loss: 1000000 },
];

const clientContributionData = [
  { name: 'Reliance', value: 32, color: '#3b82f6' },
  { name: 'Amazon', value: 24, color: '#8b5cf6' },
  { name: 'Flipkart', value: 19, color: '#06b6d4' },
  { name: 'Tata', value: 14, color: '#10b981' },
  { name: 'Others', value: 11, color: '#94a3b8' },
];

const topProductsData = [
  { product: 'Electronics', revenue: 4200000 },
  { product: 'Apparel', revenue: 3100000 },
  { product: 'FMCG', revenue: 2800000 },
  { product: 'Furniture', revenue: 1900000 },
  { product: 'Sports', revenue: 1400000 },
];

const cashFlowData = [
  { month: 'Jan', inflow: 5200000, outflow: 3800000 },
  { month: 'Feb', inflow: 4800000, outflow: 3200000 },
  { month: 'Mar', inflow: 6100000, outflow: 4100000 },
  { month: 'Apr', inflow: 5700000, outflow: 3900000 },
  { month: 'May', inflow: 6800000, outflow: 4500000 },
];

const auditLogs = [
  { id: 'AUD-001', event: 'Reconciliation Failed', module: 'Finance', severity: 'High', date: '23 May 2026' },
  { id: 'AUD-002', event: 'Unauthorized Access Attempt', module: 'Auth', severity: 'Critical', date: '22 May 2026' },
  { id: 'AUD-003', event: 'Invoice Mismatch', module: 'Accounts', severity: 'Medium', date: '22 May 2026' },
  { id: 'AUD-004', event: 'Stock Discrepancy', module: 'Warehouse', severity: 'High', date: '21 May 2026' },
  { id: 'AUD-005', event: 'Payment Gateway Timeout', module: 'Payments', severity: 'Medium', date: '21 May 2026' },
];

const ownerKpis = [
  { label: 'Total Orders Today', value: '1,247', icon: ShoppingBag, color: 'blue', change: '+8.2%' },
  { label: 'Total Revenue Today', value: '₹18.4L', icon: DollarSign, color: 'emerald', change: '+12.1%' },
  { label: 'Pending Invoices', value: '87', icon: FileText, color: 'amber', change: '+5 new' },
  { label: 'Profit Margin', value: '34.2%', icon: TrendingUp, color: 'violet', change: '+2.3%' },
  { label: 'Pending Stock Assign', value: '24', icon: Package, color: 'amber', change: 'Action needed' },
  { label: 'Critical Stock Assign', value: '7', icon: AlertTriangle, color: 'red', change: 'Urgent' },
  { label: 'Escalated Stock', value: '3', icon: Zap, color: 'rose', change: 'Escalated' },
  { label: 'Pending Courier', value: '18', icon: Truck, color: 'blue', change: 'In queue' },
  { label: 'Pending Outscan', value: '12', icon: Clock, color: 'indigo', change: 'Pending' },
  { label: 'Pending Delivery', value: '31', icon: Truck, color: 'emerald', change: 'Out for delivery' },
];

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'bg-red-100 dark:bg-red-900/40 text-red-600' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' },
};

const severityConfig: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700 border border-red-200',
  High: 'bg-amber-50 text-amber-700 border border-amber-200',
  Medium: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const efficiencyMetrics = [
  { label: 'Order Fulfillment Rate', value: 94, color: '#10b981' },
  { label: 'On-Time Delivery', value: 87, color: '#3b82f6' },
  { label: 'Return Rate', value: 6, color: '#ef4444' },
  { label: 'Warehouse Utilization', value: 78, color: '#8b5cf6' },
];

export default function OwnerDashboard() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-700 text-slate-800 dark:text-white">Owner Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Executive business overview · 23 May 2026</p>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ownerKpis.map((kpi, i) => {
          const c = colorMap[kpi.color];
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className={`${c.bg} rounded-2xl p-4 border border-white/60 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.icon}`}>
                <kpi.icon size={16} />
              </div>
              <p className="text-xl font-700 text-slate-800 dark:text-white tabular-nums">{kpi.value}</p>
              <p className="text-[11px] font-600 text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{kpi.label}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{kpi.change}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Profit vs Loss + Client Contribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Profit vs Loss Trend</h3>
          <p className="text-xs text-slate-400 mb-4">Monthly P&L — 2026</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={profitLossData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: number) => [`₹${(v / 100000).toFixed(1)}L`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#profitGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="loss" name="Loss" stroke="#ef4444" fill="url(#lossGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Client Contribution</h3>
          <p className="text-xs text-slate-400 mb-4">Revenue share by client</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={clientContributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {clientContributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {clientContributionData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500 dark:text-slate-400 flex-1">{item.name}</span>
                <span className="font-600 text-slate-700 dark:text-slate-300">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Top Performing Products</h3>
          <p className="text-xs text-slate-400 mb-4">Revenue by category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProductsData} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <YAxis type="category" dataKey="product" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: number) => [`₹${(v / 100000).toFixed(1)}L`]} />
              <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Cash Flow Summary</h3>
          <p className="text-xs text-slate-400 mb-4">Monthly inflow vs outflow</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: number) => [`₹${(v / 100000).toFixed(1)}L`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational Efficiency */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
        <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Operational Efficiency</h3>
        <p className="text-xs text-slate-400 mb-5">Key performance indicators</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {efficiencyMetrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={metric.color} strokeWidth="8"
                    strokeDasharray={`${(metric.value / 100) * 201} 201`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-700 text-slate-800 dark:text-white">{metric.value}%</span>
                </div>
              </div>
              <p className="text-xs font-600 text-slate-500 dark:text-slate-400 text-center leading-tight">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit & Risk Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-slate-400" />
          <h3 className="text-sm font-700 text-slate-800 dark:text-white">Audit & Risk Logs</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">Recent system events and alerts</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-2 text-slate-400 font-600">Log ID</th>
                <th className="text-left py-2 text-slate-400 font-600">Event</th>
                <th className="text-left py-2 text-slate-400 font-600">Module</th>
                <th className="text-left py-2 text-slate-400 font-600">Severity</th>
                <th className="text-right py-2 text-slate-400 font-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 font-600 text-slate-600 dark:text-slate-300">{log.id}</td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{log.event}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{log.module}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-600 ${severityConfig[log.severity] || ''}`}>{log.severity}</span>
                  </td>
                  <td className="py-2.5 text-right text-slate-400">{log.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
