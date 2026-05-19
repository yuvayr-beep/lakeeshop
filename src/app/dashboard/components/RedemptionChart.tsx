'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const redemptionData = [
  { date: '05 May', volume: 89200, count: 112 },
  { date: '06 May', volume: 74300, count: 93 },
  { date: '07 May', volume: 96700, count: 128 },
  { date: '08 May', volume: 88100, count: 107 },
  { date: '09 May', volume: 61400, count: 74 },
  { date: '10 May', volume: 70200, count: 88 },
  { date: '11 May', volume: 105600, count: 141 },
  { date: '12 May', volume: 118900, count: 156 },
  { date: '13 May', volume: 97300, count: 124 },
  { date: '14 May', volume: 83700, count: 105 },
  { date: '15 May', volume: 121400, count: 162 },
  { date: '16 May', volume: 109800, count: 148 },
  { date: '17 May', volume: 134200, count: 178 },
  { date: '18 May', volume: 98600, count: 131 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-3 text-xs">
      <p className="font-600 text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Volume</span>
          <span className="font-600 text-foreground tabular-nums">
            ₹{(payload[0]?.value / 1000).toFixed(1)}K
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Count</span>
          <span className="font-600 text-foreground tabular-nums">{payload[1]?.value}</span>
        </div>
      </div>
    </div>
  );
}

export default function RedemptionChart() {
  return (
    <motion.div
      className="bg-card rounded-2xl border border-border p-5 shadow-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-700 text-foreground">Redemption Volume</h3>
          <p className="text-xs text-muted-foreground mt-0.5">14-day trend · INR</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
            Volume
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-3 h-0.5 bg-accent rounded-full inline-block" />
            Count
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={redemptionData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            yAxisId="volume"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
            width={48}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="volume"
            type="monotone"
            dataKey="volume"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#volumeGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
          />
          <Area
            yAxisId="count"
            type="monotone"
            dataKey="count"
            stroke="var(--accent)"
            strokeWidth={1.5}
            fill="url(#countGrad)"
            dot={false}
            activeDot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}