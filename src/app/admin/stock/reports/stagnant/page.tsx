import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import StagnantStockClient from './components/StagnantStockClient';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Stagnant Stock Report | Admin',
};

export default function StagnantStockPage() {
  return (
    <AdminLayout
      pageTitle="Stagnant Stock Report"
      pageSubtitle="Analysis of slow-moving and stagnant inventory items, days stagnant, available quantities, and stock valuation."
      pageIcon={<AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <StagnantStockClient />
    </AdminLayout>
  );
}
