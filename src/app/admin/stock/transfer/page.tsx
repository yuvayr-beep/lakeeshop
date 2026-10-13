import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import TransferStockClient from './components/TransferStockClient';
import { Boxes } from 'lucide-react';

export default function TransferStockPage() {
  return (
    <AdminLayout
      pageTitle="Transfer Stock"
      pageSubtitle="Move inventory units between storage zones, racks, shelves, and bins. Supports unit-level scan validations or bulk quantity transfers."
      pageIcon={<Boxes size={22} className="text-blue-600 dark:text-blue-400" />}
      fullWidth={true}
    >
      <TransferStockClient />
    </AdminLayout>
  );
}
