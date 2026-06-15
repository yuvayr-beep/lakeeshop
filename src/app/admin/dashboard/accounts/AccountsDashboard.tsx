'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FileText, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

const revenueData = [
  { month: 'Jan', revenue: 4200000, expenses: 2800000 },
  { month: 'Feb', revenue: 3800000, expenses: 2600000 },
  { month: 'Mar', revenue: 5100000, expenses: 3100000 },
  { month: 'Apr', revenue: 4700000, expenses: 2900000 },
  { month: 'May', revenue: 5600000, expenses: 3400000 },
  { month: 'Jun', revenue: 6200000, expenses: 3800000 },
];

const invoiceStatusData = [
  { name: 'Paid', value: 342, color: '#10b981' },
  { name: 'Pending', value: 87, color: '#f59e0b' },
  { name: 'Overdue', value: 23, color: '#ef4444' },
  { name: 'Draft', value: 45, color: '#94a3b8' },
];

const cashFlowData = [
  { week: 'W1', inflow: 1200000, outflow: 800000 },
  { week: 'W2', inflow: 1500000, outflow: 950000 },
  { week: 'W3', inflow: 1100000, outflow: 700000 },
  { week: 'W4', inflow: 1800000, outflow: 1100000 },
];

const expenseData = [
  { name: 'Logistics', value: 35, color: '#3b82f6' },
  { name: 'Operations', value: 28, color: '#8b5cf6' },
  { name: 'Marketing', value: 18, color: '#06b6d4' },
  { name: 'Admin', value: 12, color: '#f59e0b' },
  { name: 'Other', value: 7, color: '#94a3b8' },
];

const payments = [
  { id: 'PAY-001', client: 'Reliance Retail', amount: 482000, status: 'Cleared', date: '22 May 2026' },
  { id: 'PAY-002', client: 'Amazon India', amount: 318000, status: 'Pending', date: '21 May 2026' },
  { id: 'PAY-003', client: 'Flipkart', amount: 256000, status: 'Cleared', date: '20 May 2026' },
  { id: 'PAY-004', client: 'Meesho', amount: 124000, status: 'Failed', date: '19 May 2026' },
  { id: 'PAY-005', client: 'Tata Cliq', amount: 198000, status: 'Cleared', date: '18 May 2026' },
];

const gstData = [
  { label: 'GST Collected', value: '₹8,42,300', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { label: 'GST Payable', value: '₹6,18,500', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { label: 'Tax Liability', value: '₹2,23,800', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
];

const financeKpis = [
  { label: 'Total Revenue', value: '₹56.2L', change: '+12.4%', up: true, icon: TrendingUp, color: 'blue' },
  { label: 'Pending Invoices', value: '87', change: '+5 new', up: false, icon: FileText, color: 'amber' },
  { label: 'Credit Notes', value: '₹3.8L', change: '-2.1%', up: true, icon: CreditCard, color: 'violet' },
  { label: 'Overdue Payments', value: '23', change: 'Requires action', up: false, icon: AlertCircle, color: 'red' },
];

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'bg-red-100 dark:bg-red-900/40 text-red-600' },
};

const payStatusConfig: Record<string, string> = {
  Cleared: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Failed: 'bg-red-50 text-red-700 border border-red-200',
};

export default function AccountsDashboard() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-700 text-slate-800 dark:text-white">Accounts Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Finance and reconciliation overview · 23 May 2026</p>
      </motion.div>

      {/* Finance KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {financeKpis.map((kpi, i) => {
          const c = colorMap[kpi.color];
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
              className={`${c.bg} rounded-2xl p-5 border border-white/60 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.icon}`}>
                <kpi.icon size={18} />
              </div>
              <p className="text-xl font-700 text-slate-800 dark:text-white tabular-nums">{kpi.value}</p>
              <p className="text-xs font-600 text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</p>
              <p className={`text-[11px] font-600 mt-1 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>{kpi.change}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Revenue Overview</h3>
          <p className="text-xs text-slate-400 mb-4">Revenue vs Expenses — 2026</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: number) => [`₹${(v / 100000).toFixed(1)}L`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Cash Flow Trend</h3>
          <p className="text-xs text-slate-400 mb-4">Weekly inflow vs outflow</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashFlowData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: number) => [`₹${(v / 100000).toFixed(1)}L`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inflow" name="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Invoice Status + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Invoice Status</h3>
          <p className="text-xs text-slate-400 mb-4">Current invoice breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {invoiceStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {invoiceStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500 dark:text-slate-400 truncate">{item.name}</span>
                <span className="font-600 text-slate-700 dark:text-slate-300 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Expense Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">By category (%)</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={expenseData} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {expenseData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500 dark:text-slate-400 flex-1">{item.name}</span>
                <span className="font-600 text-slate-700 dark:text-slate-300">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* GST Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">GST & Tax Summary</h3>
          <p className="text-xs text-slate-400 mb-4">Current period</p>
          <div className="space-y-3">
            {gstData.map((item) => (
              <div key={item.label} className={`${item.bg} rounded-xl p-4`}>
                <p className="text-xs font-600 text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className={`text-xl font-700 mt-1 tabular-nums ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
        <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Payments & Reconciliation</h3>
        <p className="text-xs text-slate-400 mb-4">Recent payment activity</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-2 text-slate-400 font-600">Payment ID</th>
                <th className="text-left py-2 text-slate-400 font-600">Client</th>
                <th className="text-right py-2 text-slate-400 font-600">Amount</th>
                <th className="text-left py-2 text-slate-400 font-600 pl-4">Status</th>
                <th className="text-right py-2 text-slate-400 font-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 font-600 text-blue-600 dark:text-blue-400">{p.id}</td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{p.client}</td>
                  <td className="py-2.5 text-right font-700 text-slate-700 dark:text-slate-300 tabular-nums">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 pl-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-600 ${payStatusConfig[p.status] || ''}`}>{p.status}</span>
                  </td>
                  <td className="py-2.5 text-right text-slate-400">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
