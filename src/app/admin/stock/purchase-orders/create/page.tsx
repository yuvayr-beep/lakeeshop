import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import POWizard from '../components/POWizard';

export default function POCreatePage() {
  return (
    <AdminLayout fullWidth={true}>
      <POWizard />
    </AdminLayout>
  );
}
