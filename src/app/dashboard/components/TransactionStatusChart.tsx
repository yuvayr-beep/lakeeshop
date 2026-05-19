'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const statusData = [
  { status: 'Completed', count: 1747, fill: '#10b981' },
  { status: 'Processing', count: 38, fill: '#3b82f6' },
  { status: 'Pending', count: 38, fill: '#f59e0b' },
  { status: 'Failed', count: 62, fill: '#ef4444' },
  { status: 'Reversed', count: 22, fill: '#8b5cf6' },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { status: string; fill: string } }[];
}

function StatusTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-3 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.fill }} />
        <span className="font-600 text-foreground">{item.payload.status}</span>
      </div>
      <p className="text-muted-foreground">
        Count: <span className="font-600 text-foreground tabular-nums">{item.value}</span>
      </p>
    </div>
  );
}

export default function TransactionStatusChart() {
  const total = statusData.reduce((s, d) => s + d.count, 0);

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border p-5 shadow-card h-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, duration: 0.4 }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-700 text-foreground">Transaction Status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {total.toLocaleString()} total this month
        </p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={statusData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }} barSize={28}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="status"
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<StatusTooltip />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {statusData.map((item) => (
          <div key={`legend-${item.status}`} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.fill }} />
            <span className="text-muted-foreground truncate">{item.status}</span>
            <span className="ml-auto font-600 text-foreground tabular-nums">{item.count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}