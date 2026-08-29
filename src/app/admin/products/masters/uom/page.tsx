import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import UomManagementClient from './components/UomManagementClient';
import { Scale } from 'lucide-react';

export default function UomPage() {
  return (
    <AdminLayout
      pageTitle="Unit of Measure (UOM) Master"
      pageSubtitle="Manage units of measurement, codes, display symbols, and conversion units."
      pageIcon={<Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <UomManagementClient />
    </AdminLayout>
  );
}
