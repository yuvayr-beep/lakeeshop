import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProductRelationsClient from './components/ProductRelationsClient';

export default function ProductRelationsPage() {
  return (
    <AdminLayout>
      <ProductRelationsClient />
    </AdminLayout>
  );
}
