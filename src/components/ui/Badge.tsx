import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  muted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  primary: 'bg-blue-600 text-white',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] font-semibold',
  md: 'px-2.5 py-1 text-xs font-semibold',
};

export default function Badge({ variant = 'muted', size = 'md', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
