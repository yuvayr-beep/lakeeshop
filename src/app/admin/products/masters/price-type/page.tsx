import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PriceTypeManagementClient from './components/PriceTypeManagementClient';
import { DollarSign } from 'lucide-react';

export default function PriceTypePage() {
  return (
    <AdminLayout
      pageTitle="Price Type Master"
      pageSubtitle="Manage product pricing structures, tier classifications, and price type definitions."
      pageIcon={<DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <PriceTypeManagementClient />
    </AdminLayout>
  );
}
