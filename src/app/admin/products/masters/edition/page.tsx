import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import EditionManagementClient from './components/EditionManagementClient';

export default function EditionPage() {
  return (
    <AdminLayout>
      <EditionManagementClient />
    </AdminLayout>
  );
}
