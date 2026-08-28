import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import SplitSurfaceManagementClient from './components/SplitSurfaceManagementClient';

export default function SplitSurfaceConfigPage() {
  return (
    <AdminLayout fullWidth={true}>
      <SplitSurfaceManagementClient />
    </AdminLayout>
  );
}
