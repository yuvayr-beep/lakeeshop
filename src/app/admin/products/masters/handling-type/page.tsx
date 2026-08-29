import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import HandlingTypeManagementClient from './components/HandlingTypeManagementClient';
import { PackageCheck } from 'lucide-react';

export default function HandlingTypePage() {
  return (
    <AdminLayout
      pageTitle="Handling Type Master"
      pageSubtitle="Manage special product handling requirements, storage conditions, and guidelines."
      pageIcon={<PackageCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <HandlingTypeManagementClient />
    </AdminLayout>
  );
}
