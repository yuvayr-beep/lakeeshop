import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import UomManagementClient from './components/UomManagementClient';

export default function UomPage() {
  return (
    <AdminLayout>
      <UomManagementClient />
    </AdminLayout>
  );
}
