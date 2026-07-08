import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import HsnManagementClient from './components/HsnManagementClient';

export default function HsnPage() {
  return (
    <AdminLayout>
      <HsnManagementClient />
    </AdminLayout>
  );
}
