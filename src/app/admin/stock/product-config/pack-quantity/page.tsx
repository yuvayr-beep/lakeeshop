import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PackQuantityManagementClient from './components/PackQuantityManagementClient';
import { Package } from 'lucide-react';

export default function PackQuantityPage() {
  return (
    <AdminLayout
      pageTitle="Product Pack Quantity"
      pageSubtitle="Manage pack quantities and product packaging configurations across all products."
      pageIcon={<Package size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <PackQuantityManagementClient />
    </AdminLayout>
  );
}
