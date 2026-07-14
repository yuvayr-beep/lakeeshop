import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import WarehouseManagementClient from './components/WarehouseManagementClient';

export default function WarehouseSetupPage() {
  return (
    <AdminLayout>
      <WarehouseManagementClient />
    </AdminLayout>
  );
}
