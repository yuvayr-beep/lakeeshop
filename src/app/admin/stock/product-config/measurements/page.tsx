import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProductMeasurementsManagementClient from './components/ProductMeasurementsManagementClient';
import { Ruler } from 'lucide-react';

export default function ProductMeasurementsPage() {
  return (
    <AdminLayout
      pageTitle="Product Measurements & Weight"
      pageSubtitle="Manage product dimensions, weight, and volumetric shipping metrics across all products."
      pageIcon={<Ruler size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <ProductMeasurementsManagementClient />
    </AdminLayout>
  );
}
