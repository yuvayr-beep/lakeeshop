'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';

interface KpiCardData {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'amber';
  alert?: boolean;
}

const kpiData: KpiCardData[] = [
  {
    id: 'kpi-balance',
    label: 'Active Balance',
    value: '₹4,82,350',
    subValue: 'Available for redemption',
    change: 8.4,
    changeLabel: 'vs last week',
    icon: Wallet,
    color: 'blue',
  },
  {
    id: 'kpi-redemptions',
    label: 'Total Redemptions',
    value: '1,847',
    subValue: 'This month',
    change: 12.1,
    changeLabel: 'vs last month',
    icon: ArrowLeftRight,
    color: 'purple',
  },
  {
    id: 'kpi-success',
    label: 'Success Rate',
    value: '94.6%',
    subValue: '1,747 completed',
    change: -1.3,
    changeLabel: 'vs last month',
    icon: CheckCircle2,
    color: 'green',
  },
  {
    id: 'kpi-pending',
    label: 'Pending Transactions',
    value: '38',
    subValue: 'Awaiting processing',
    change: 18.7,
    changeLabel: 'requires attention',
    icon: Clock,
    color: 'amber',
    alert: true,
  },
];

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    border: 'border-blue-100',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-100',
  },
  purple: {
    bg: 'bg-violet-50',
    icon: 'bg-violet-100 text-violet-600',
    border: 'border-violet-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    border: 'border-amber-100',
  },
};

export default function KpiGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpiData.map((kpi, i) => {
        const colors = colorMap[kpi.color];
        const isPositive = kpi.change > 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`relative bg-card rounded-2xl p-5 border shadow-card hover:shadow-card-hover transition-shadow duration-200 ${
              kpi.alert ? 'border-amber-200' : 'border-border'
            }`}
          >
            {kpi.alert && (
              <div className="absolute top-3 right-3">
                <AlertTriangle size={14} className="text-amber-500" />
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                <kpi.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1">
                  {kpi.label}
                </p>
                <p className="text-2xl font-700 text-foreground tabular-nums leading-none">
                  {kpi.value}
                </p>
                {kpi.subValue && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{kpi.subValue}</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1 text-xs font-600 ${
                  isPositive
                    ? kpi.alert
                      ? 'text-amber-600' :'text-emerald-600' :'text-red-500'
                }`}
              >
                <TrendIcon size={12} />
                {Math.abs(kpi.change)}%
              </span>
              <span className="text-xs text-muted-foreground">{kpi.changeLabel}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}