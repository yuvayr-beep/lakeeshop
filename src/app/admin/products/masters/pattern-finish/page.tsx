import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PatternFinishManagementClient from './components/PatternFinishManagementClient';

export default function PatternFinishPage() {
  return (
    <AdminLayout>
      <PatternFinishManagementClient />
    </AdminLayout>
  );
}
