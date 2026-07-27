import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import POManagementClient from './components/POManagementClient';

export default function POListPage() {
  return (
    <AdminLayout fullWidth={true}>
      <POManagementClient />
    </AdminLayout>
  );
}
