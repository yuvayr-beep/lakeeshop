import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import StockAdjustmentsClient from './components/StockAdjustmentsClient';
import { SlidersHorizontal } from 'lucide-react';

export const metadata = {
  title: 'Stock Adjustment Report | Admin',
};

export default function StockAdjustmentsPage() {
  return (
    <AdminLayout
      pageTitle="Stock Adjustment Report"
      pageSubtitle="Inventory deductions and manual adjustment logs (Scrap, Write-off, Damage, Defective stock)."
      pageIcon={<SlidersHorizontal size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <StockAdjustmentsClient />
    </AdminLayout>
  );
}
