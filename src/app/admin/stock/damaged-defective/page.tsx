import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import DamagedProductsClient from './components/DamagedProductsClient';

export default function DamagedProductsPage() {
  return (
    <AdminLayout>
      <DamagedProductsClient />
    </AdminLayout>
  );
}
