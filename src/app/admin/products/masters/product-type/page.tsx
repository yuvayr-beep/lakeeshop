import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProductTypeManagementClient from './components/ProductTypeManagementClient';

export default function ProductTypePage() {
  return (
    <AdminLayout>
      <ProductTypeManagementClient />
    </AdminLayout>
  );
}
