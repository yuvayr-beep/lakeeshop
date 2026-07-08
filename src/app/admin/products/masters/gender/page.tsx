import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import GenderManagementClient from './components/GenderManagementClient';

export default function GenderPage() {
  return (
    <AdminLayout>
      <GenderManagementClient />
    </AdminLayout>
  );
}
