import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CurrentStockStatusClient from './components/CurrentStockStatusClient';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Current Stock Status Report | Admin',
};

export default function CurrentStockStatusPage() {
  return (
    <AdminLayout
      pageTitle="Current Stock Status Report"
      pageSubtitle="Live inventory valuation, available quantities, courier costs, and valuation tracking."
      pageIcon={<BarChart3 size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <CurrentStockStatusClient />
    </AdminLayout>
  );
}
