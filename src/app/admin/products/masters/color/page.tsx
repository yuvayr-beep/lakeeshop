import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ColorManagementClient from './components/ColorManagementClient';

export default function ColorPage() {
  return (
    <AdminLayout>
      <ColorManagementClient />
    </AdminLayout>
  );
}
