import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import HistoricStockStatusClient from './components/HistoricStockStatusClient';
import { History as HistoryIcon } from 'lucide-react';

export const metadata = {
  title: 'Historic Stock Status Report | Admin',
};

export default function HistoricStockStatusPage() {
  return (
    <AdminLayout
      pageTitle="Historic Stock Status Report"
      pageSubtitle="Historical inventory valuation, open & closing quantities, cost tracking over custom date ranges."
      pageIcon={<HistoryIcon size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <HistoricStockStatusClient />
    </AdminLayout>
  );
}
