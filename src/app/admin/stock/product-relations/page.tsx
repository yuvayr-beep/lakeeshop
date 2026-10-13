import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProductRelationsClient from './components/ProductRelationsClient';
import { Boxes } from 'lucide-react';

export default function ProductRelationsPage() {
  return (
    <AdminLayout
      pageTitle="Product Relations"
      pageSubtitle="Map parent-variant dependencies, manage sibling items, and track sibling products."
      pageIcon={<Boxes size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <ProductRelationsClient />
    </AdminLayout>
  );
}
