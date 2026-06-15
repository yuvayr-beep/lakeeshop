import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProductManagementClient from './components/ProductManagementClient';

export default function ProductsPage() {
  return (
    <AdminLayout>
      <ProductManagementClient />
    </AdminLayout>
  );
}
