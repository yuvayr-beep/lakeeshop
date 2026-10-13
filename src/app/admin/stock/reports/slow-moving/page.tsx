import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import SlowMovingStockClient from './components/SlowMovingStockClient';
import { Activity } from 'lucide-react';

export const metadata = {
  title: 'Slow Moving Stock Report | Admin',
};

export default function SlowMovingStockPage() {
  return (
    <AdminLayout
      pageTitle="Slow Moving Stock Report"
      pageSubtitle="Inventory velocity audit identifying low sales percentage relative to total stock held within custom date ranges."
      pageIcon={<Activity size={22} className="text-amber-600 dark:text-amber-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <SlowMovingStockClient />
    </AdminLayout>
  );
}
