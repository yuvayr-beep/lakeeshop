import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ClientShareClient from './components/ClientShareClient';

export default function ClientSharePage() {
  return (
    <AdminLayout>
      <ClientShareClient />
    </AdminLayout>
  );
}
