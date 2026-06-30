import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import HandlingTypeManagementClient from './components/HandlingTypeManagementClient';

export default function HandlingTypePage() {
  return (
    <AdminLayout>
      <HandlingTypeManagementClient />
    </AdminLayout>
  );
}
