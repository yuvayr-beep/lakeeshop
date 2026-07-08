import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import WarrantyTypeManagementClient from './components/WarrantyTypeManagementClient';

export default function WarrantyTypePage() {
  return (
    <AdminLayout>
      <WarrantyTypeManagementClient />
    </AdminLayout>
  );
}
