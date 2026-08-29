import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import WarrantyTypeManagementClient from './components/WarrantyTypeManagementClient';
import { ShieldCheck } from 'lucide-react';

export default function WarrantyTypePage() {
  return (
    <AdminLayout
      pageTitle="Warranty Type Master"
      pageSubtitle="Manage product warranty terms, coverage types, and guarantee policies."
      pageIcon={<ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <WarrantyTypeManagementClient />
    </AdminLayout>
  );
}
