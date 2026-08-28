import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import AlternateProductsClient from './components/AlternateProductsClient';
import { Shuffle } from 'lucide-react';

export const metadata = {
  title: 'Alternate Products | Admin Dashboard',
  description: 'Manage alternate product recommendations and substitute mappings.',
};

export default function AlternateProductsPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Alternate Products"
      pageSubtitle="Configure and manage alternate substitute recommendations for stock items"
      pageIcon={<Shuffle className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <AlternateProductsClient />
    </AdminLayout>
  );
}
