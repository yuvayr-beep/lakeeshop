import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import MovementAuditClient from './components/MovementAuditClient';
import { TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Stock Movement Report (Audit) | Admin',
};

export default function StockMovementAuditPage() {
  return (
    <AdminLayout
      pageTitle="Stock Movement Report (Audit)"
      pageSubtitle="Complete inventory movement audit: Opening & Closing stock, purchases, sales, GST tax breakdowns, and costs."
      pageIcon={<TrendingUp size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <MovementAuditClient />
    </AdminLayout>
  );
}
