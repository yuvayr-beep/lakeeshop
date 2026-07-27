import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import AutoConfigClient from './components/AutoConfigClient';

export default function AutoConfigPage() {
  return (
    <AdminLayout>
      <AutoConfigClient />
    </AdminLayout>
  );
}
