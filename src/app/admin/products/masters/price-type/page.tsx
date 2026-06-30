import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PriceTypeManagementClient from './components/PriceTypeManagementClient';

export default function PriceTypePage() {
  return (
    <AdminLayout>
      <PriceTypeManagementClient />
    </AdminLayout>
  );
}
