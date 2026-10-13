import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ReceiveStockClient from './components/ReceiveStockClient';
import { Layers } from 'lucide-react';

export default function ReceiveStockPage() {
  return (
    <AdminLayout
      pageTitle="Receive Stock"
      pageSubtitle="Receive product stock from suppliers, link optional PO allocations, verify taxes/pricing and generate Goods Receipt Notes."
      pageIcon={<Layers size={22} className="text-blue-600 dark:text-blue-400" />}
      fullWidth={true}
    >
      <ReceiveStockClient />
    </AdminLayout>
  );
}
