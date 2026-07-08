import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ShipmodeManagementClient from './components/ShipmodeManagementClient';

export default function ShipmodePage() {
  return (
    <AdminLayout>
      <ShipmodeManagementClient />
    </AdminLayout>
  );
}
