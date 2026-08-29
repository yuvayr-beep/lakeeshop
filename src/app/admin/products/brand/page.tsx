import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import BrandManagementClient from './components/BrandManagementClient';
import { Tag } from 'lucide-react';

export default function BrandPage() {
  return (
    <AdminLayout
      pageTitle="Brand Management"
      pageSubtitle="Manage brands, upload logos, export and import via Excel."
      pageIcon={<Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <BrandManagementClient />
    </AdminLayout>
  );
}
