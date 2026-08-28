import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProductMeasurementsManagementClient from './components/ProductMeasurementsManagementClient';

export default function ProductMeasurementsPage() {
  return (
    <AdminLayout fullWidth={true}>
      <ProductMeasurementsManagementClient />
    </AdminLayout>
  );
}
