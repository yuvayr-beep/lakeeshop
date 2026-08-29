import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import MaterialManagementClient from './components/MaterialManagementClient';
import { Layers } from 'lucide-react';

export default function MaterialPage() {
  return (
    <AdminLayout
      pageTitle="Material Master"
      pageSubtitle="Manage product material compositions, fabric types, and definitions."
      pageIcon={<Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <MaterialManagementClient />
    </AdminLayout>
  );
}
