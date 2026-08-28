import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PackQuantityManagementClient from './components/PackQuantityManagementClient';

export default function PackQuantityPage() {
  return (
    <AdminLayout fullWidth={true}>
      <PackQuantityManagementClient />
    </AdminLayout>
  );
}
