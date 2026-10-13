import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import StockAdditionsClient from './components/StockAdditionsClient';
import { PlusCircle } from 'lucide-react';

export const metadata = {
  title: 'Stock Additions Report | Admin',
};

export default function StockAdditionsPage() {
  return (
    <AdminLayout
      pageTitle="Stock Additions Report"
      pageSubtitle="Live inventory addition logs, purchase entries, opening stock migration, and valuation tracking."
      pageIcon={<PlusCircle size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <StockAdditionsClient />
    </AdminLayout>
  );
}
