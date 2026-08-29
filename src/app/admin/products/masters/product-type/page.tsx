import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProductTypeManagementClient from './components/ProductTypeManagementClient';
import { Package } from 'lucide-react';

export default function ProductTypePage() {
  return (
    <AdminLayout
      pageTitle="Product Type Master"
      pageSubtitle="Manage product types, classification hierarchies, and item categories."
      pageIcon={<Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <ProductTypeManagementClient />
    </AdminLayout>
  );
}
