import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import AdjustStockClient from './components/AdjustStockClient';
import { Sliders } from 'lucide-react';

export default function AdjustStockPage() {
  return (
    <AdminLayout
      pageTitle="Adjust Stock"
      pageSubtitle="Adjust the status of specific inventory units (using barcode scan) or available quantities of a product on a FIFO basis."
      pageIcon={<Sliders size={22} className="text-blue-600 dark:text-blue-400" />}
      fullWidth={true}
    >
      <AdjustStockClient />
    </AdminLayout>
  );
}
