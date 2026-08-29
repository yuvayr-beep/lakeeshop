import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CategoryManagementClient from './components/CategoryManagementClient';
import { FolderTree } from 'lucide-react';

export default function CategoryPage() {
  return (
    <AdminLayout
      pageTitle="Product Categories"
      pageSubtitle="Manage your store hierarchical product categories, levels, and path mappings."
      pageIcon={<FolderTree className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <CategoryManagementClient />
    </AdminLayout>
  );
}
