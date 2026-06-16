'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, Truck, AlertTriangle, Clock, Zap } from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const ordersOverviewData = [
  { day: 'Mon', received: 142, shipped: 118, pending: 24 },
  { day: 'Tue', received: 189, shipped: 165, pending: 24 },
  { day: 'Wed', received: 156, shipped: 140, pending: 16 },
  { day: 'Thu', received: 203, shipped: 178, pending: 25 },
  { day: 'Fri', received: 231, shipped: 198, pending: 33 },
  { day: 'Sat', received: 178, shipped: 162, pending: 16 },
  { day: 'Sun', received: 94, shipped: 88, pending: 6 },
];

const orderStatusData = [
  { name: 'Processing', value: 312, color: '#3b82f6' },
  { name: 'Shipped', value: 487, color: '#8b5cf6' },
  { name: 'Delivered', value: 1243, color: '#10b981' },
  { name: 'Returned', value: 89, color: '#f59e0b' },
  { name: 'Cancelled', value: 67, color: '#ef4444' },
];

const topClientsData = [
  { client: 'Reliance', orders: 342 },
  { client: 'Tata', orders: 287 },
  { client: 'Flipkart', orders: 256 },
  { client: 'Amazon', orders: 198 },
  { client: 'Meesho', orders: 167 },
];

const stockAlerts = [
  { sku: 'SKU-8821', warehouse: 'Chennai WH', stock: 12, damaged: 3, status: 'critical' },
  { sku: 'SKU-4432', warehouse: 'Mumbai WH', stock: 45, damaged: 0, status: 'warning' },
  { sku: 'SKU-9901', warehouse: 'Delhi WH', stock: 8, damaged: 2, status: 'critical' },
  { sku: 'SKU-3312', warehouse: 'Bangalore WH', stock: 67, damaged: 5, status: 'normal' },
  { sku: 'SKU-7721', warehouse: 'Hyderabad WH', stock: 23, damaged: 1, status: 'warning' },
];

const recentOrders = [
  { id: 'ORD-2605-001', client: 'Reliance Retail', status: 'Shipped', courier: 'BlueDart', date: '23 May 2026' },
  { id: 'ORD-2605-002', client: 'Amazon India', status: 'Processing', courier: 'Delhivery', date: '23 May 2026' },
  { id: 'ORD-2605-003', client: 'Flipkart', status: 'Delivered', courier: 'Ekart', date: '22 May 2026' },
  { id: 'ORD-2605-004', client: 'Meesho', status: 'Pending', courier: 'DTDC', date: '22 May 2026' },
  { id: 'ORD-2605-005', client: 'Tata Cliq', status: 'Cancelled', courier: '—', date: '21 May 2026' },
];

const kpiCards = [
  { label: 'Pending Stock Assign', value: 24, icon: Package, color: 'amber', severity: 'warning' },
  { label: 'Critical Stock Assign', value: 7, icon: AlertTriangle, color: 'red', severity: 'critical' },
  { label: 'Escalated Stock Assign', value: 3, icon: Zap, color: 'rose', severity: 'critical' },
  { label: 'Pending Courier Assign', value: 18, icon: Truck, color: 'blue', severity: 'normal' },
  { label: 'Pending Outscan', value: 12, icon: Clock, color: 'violet', severity: 'warning' },
  { label: 'Outscan Stock Available', value: 9, icon: Package, color: 'indigo', severity: 'normal' },
  { label: 'Pending Delivery', value: 31, icon: Truck, color: 'emerald', severity: 'normal' },
];

const colorMap: Record<string, { bg: string; icon: string; badge: string }> = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'bg-red-100 dark:bg-red-900/40 text-red-600', badge: 'bg-red-100 text-red-700' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600', badge: 'bg-rose-100 text-rose-700' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
};

const orderStatusConfig: Record<string, string> = {
  Shipped: 'bg-blue-50 text-blue-700 border border-blue-200',
  Processing: 'bg-amber-50 text-amber-700 border border-amber-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  Cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

export default function OperationsDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-700 text-slate-800 dark:text-white">Operations Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track orders, stock, and fulfillment performance · 23 May 2026</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpiCards.map((kpi, i) => {
          const c = colorMap[kpi.color];
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className={`${c.bg} rounded-2xl p-4 border border-white/60 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.icon}`}>
                <kpi.icon size={16} />
              </div>
              <p className="text-2xl font-700 text-slate-800 dark:text-white tabular-nums">{kpi.value}</p>
              <p className="text-[11px] font-600 text-slate-500 dark:text-slate-400 mt-1 leading-tight">{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Orders Overview */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Orders Overview</h3>
          <p className="text-xs text-slate-400 mb-4">Received vs Shipped vs Pending — Last 7 days</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ordersOverviewData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="received" name="Received" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shipped" name="Shipped" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Order Status</h3>
          <p className="text-xs text-slate-400 mb-4">Breakdown by status</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {orderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {orderStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="font-600 text-slate-700 dark:text-slate-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Clients */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Top Clients by Orders</h3>
          <p className="text-xs text-slate-400 mb-4">This month</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topClientsData} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="client" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
          <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Stock Alerts</h3>
          <p className="text-xs text-slate-400 mb-4">Low & damaged stock by warehouse</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-600">SKU</th>
                  <th className="text-left py-2 text-slate-400 font-600">Warehouse</th>
                  <th className="text-right py-2 text-slate-400 font-600">Stock</th>
                  <th className="text-right py-2 text-slate-400 font-600">Damaged</th>
                </tr>
              </thead>
              <tbody>
                {stockAlerts.map((row) => (
                  <tr key={row.sku} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 font-600 text-slate-700 dark:text-slate-300">{row.sku}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{row.warehouse}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-700 ${row.status === 'critical' ? 'text-red-600' : row.status === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>{row.stock}</span>
                    </td>
                    <td className="py-2.5 text-right font-600 text-slate-500 dark:text-slate-400">{row.damaged}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
        <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-1">Recent Orders</h3>
        <p className="text-xs text-slate-400 mb-4">Latest order activity</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-2 text-slate-400 font-600">Order ID</th>
                <th className="text-left py-2 text-slate-400 font-600">Client</th>
                <th className="text-left py-2 text-slate-400 font-600">Status</th>
                <th className="text-left py-2 text-slate-400 font-600">Courier</th>
                <th className="text-right py-2 text-slate-400 font-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 font-600 text-blue-600 dark:text-blue-400">{order.id}</td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{order.client}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-600 ${orderStatusConfig[order.status] || ''}`}>{order.status}</span>
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{order.courier}</td>
                  <td className="py-2.5 text-right text-slate-400">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
