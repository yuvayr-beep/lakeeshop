import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import MaterialManagementClient from './components/MaterialManagementClient';

export default function MaterialPage() {
  return (
    <AdminLayout>
      <MaterialManagementClient />
    </AdminLayout>
  );
}
