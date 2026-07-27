import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { BatchOrdersClient } from './components/BatchOrdersClient';

export default function BatchOrdersPage() {
  return (
    <AdminLayout fullWidth={true}>
      <BatchOrdersClient />
    </AdminLayout>
  );
}
