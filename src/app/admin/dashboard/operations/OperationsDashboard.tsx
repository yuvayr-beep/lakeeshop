'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, Truck, AlertTriangle, Clock, Zap, Activity, Calendar, RefreshCw } from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import axiosInstance from '@/lib/axios';

function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const orderStatusData = [
  { name: 'Processing', value: 312, color: '#3b82f6' },
  { name: 'Shipped', value: 487, color: '#8b5cf6' },
  { name: 'Delivered', value: 1243, color: '#10b981' },
  { name: 'Returned', value: 89, color: '#f59e0b' },
  { name: 'Cancelled', value: 67, color: '#ef4444' },
];

const STATUS_CONFIG_MAP: Record<string, { label: string; color: string }> = {
  DELIVERED: { label: 'Delivered', color: '#10b981' },
  OUTSCAN_DONE: { label: 'Outscan Done', color: '#14b8a6' },
  AWB_ASSIGNED: { label: 'AWB Assigned', color: '#8b5cf6' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444' },
  RETURNED: { label: 'Returned', color: '#f97316' },
  COURIER_ASSIGNED: { label: 'Courier Assigned', color: '#3b82f6' },
  REVERSE_PICKUP_CREATED: { label: 'Reverse Pickup', color: '#a855f7' },
  PICKUP_CONFIRMED: { label: 'Pickup Confirmed', color: '#06b6d4' },
  EXPECTING_RETURN: { label: 'Expecting Return', color: '#f59e0b' },
  LOST: { label: 'Lost', color: '#dc2626' },
  STOCK_ASSIGNED: { label: 'Stock Assigned', color: '#0ea5e9' },
  RECEIVED: { label: 'Received', color: '#6366f1' },
};

const orderStatusConfig: Record<string, string> = {
  Shipped: 'bg-blue-50 text-blue-700 border border-blue-200',
  Processing: 'bg-amber-50 text-amber-700 border border-amber-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  Cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

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

export default function OperationsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getYesterdayDateStr);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  useEffect(() => {
    let isSubscribed = true;
    setLoadingMetrics(true);

    async function fetchDashboardMetrics() {
      try {
        console.log('[Dashboard Metrics API Request] GET /order/sse/dashboard-metrics?date=' + selectedDate, {
          date: selectedDate,
          endpoint: `/order/sse/dashboard-metrics?date=${selectedDate}`,
        });

        const response = await axiosInstance.get(`/order/sse/dashboard-metrics?date=${selectedDate}`, {
          headers: { Accept: 'text/event-stream' },
          responseType: 'text',
        });
        if (!isSubscribed) return;

        const raw = response.data;
        let parsed: any = null;

        if (typeof raw === 'string') {
          const lines = raw.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonStr = line.replace(/^data:/, '').trim();
              try {
                parsed = JSON.parse(jsonStr);
                break;
              } catch {}
            }
          }
          if (!parsed) {
            try {
              parsed = JSON.parse(raw.trim());
            } catch {}
          }
        } else if (raw && typeof raw === 'object') {
          parsed = raw;
        }

        if (parsed && isSubscribed) {
          console.log('[Dashboard Metrics API Response Data]:', parsed);
          setMetricsData(parsed);
        }
      } catch (err) {
        console.warn('Error fetching dashboard metrics SSE:', err);
      } finally {
        if (isSubscribed) setLoadingMetrics(false);
      }
    }

    fetchDashboardMetrics();

    return () => {
      isSubscribed = false;
    };
  }, [selectedDate]);

  // Transform clientOrderCounts for Orders Overview chart
  const clientOrderChartData = useMemo(() => {
    if (!metricsData || !metricsData.clientOrderCounts) return [];
    const countsMap = metricsData.clientOrderCounts as Record<string, number>;
    return Object.entries(countsMap)
      .map(([client, count]) => ({
        client,
        shortName: client.length > 14 ? `${client.substring(0, 14)}...` : client,
        orders: count,
      }))
      .filter((item) => item.orders > 0)
      .sort((a, b) => b.orders - a.orders);
  }, [metricsData]);

  // Transform statusCounts for Order Status Pie chart & list
  const orderStatusChartData = useMemo(() => {
    if (!metricsData || !metricsData.statusCounts) return [];
    const statusCountsMap = metricsData.statusCounts as Record<string, number>;
    return Object.entries(statusCountsMap)
      .map(([statusCode, count]) => {
        const config = STATUS_CONFIG_MAP[statusCode] || {
          label: statusCode.replace(/_/g, ' '),
          color: '#64748b',
        };
        return {
          name: config.label,
          value: count,
          color: config.color,
          code: statusCode,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [metricsData]);

  const DateFilterControl = (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
      <Calendar size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden lg:inline shrink-0">Metrics Date:</span>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
      />
    </div>
  );

  return (
    <AdminLayout
      pageTitle="Operations Dashboard"
      pageSubtitle={`Track orders, stock, and fulfillment performance · Date: ${selectedDate}`}
      pageIcon={<Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      headerAction={DateFilterControl}
    >
      <div className="space-y-6">

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
          {/* Orders Overview: Dynamic Client Orders Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-700 text-slate-800 dark:text-white">Orders Overview by Client</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Client order counts for <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedDate}</span>
                </p>
              </div>
              {loadingMetrics && (
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 animate-pulse font-medium">
                  <RefreshCw size={12} className="animate-spin" /> Fetching metrics...
                </span>
              )}
            </div>

            {clientOrderChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={clientOrderChartData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`${value} Orders`, 'Client Orders']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.client;
                      }
                      return label;
                    }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Bar dataKey="orders" name="Client Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <Package size={28} className="opacity-40 mb-2" />
                <span className="text-xs">No client orders recorded for {selectedDate}</span>
              </div>
            )}
          </div>

        {/* Order Status Pie & Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-700 text-slate-800 dark:text-white">Order Status</h3>
              <span className="text-[10px] font-bold text-slate-400">
                Total: {orderStatusChartData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Live status counts from API</p>

            {orderStatusChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={orderStatusChartData} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={2} dataKey="value">
                      {orderStatusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [val.toLocaleString(), 'Orders']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-1.5 mt-2 max-h-44 overflow-y-auto scrollbar-thin pr-1">
                  {orderStatusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                      </div>
                      <span className="font-600 text-slate-800 dark:text-slate-200 tabular-nums ml-2">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">
                No status metrics available
              </div>
            )}
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-600 ${orderStatusConfig?.[order.status] || 'bg-slate-100 text-slate-600'}`}>{order.status}</span>
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
  </AdminLayout>
  );
}
