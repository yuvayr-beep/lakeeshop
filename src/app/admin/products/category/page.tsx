import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CategoryManagementClient from './components/CategoryManagementClient';

export default function CategoryPage() {
  return (
    <AdminLayout>
      <CategoryManagementClient />
    </AdminLayout>
  );
}
