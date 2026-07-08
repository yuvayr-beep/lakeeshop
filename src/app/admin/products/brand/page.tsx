import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import BrandManagementClient from './components/BrandManagementClient';

export default function BrandPage() {
  return (
    <AdminLayout>
      <BrandManagementClient />
    </AdminLayout>
  );
}
