import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierShareClient from './components/CourierShareClient';

export default function CourierSharePage() {
  return (
    <AdminLayout>
      <CourierShareClient />
    </AdminLayout>
  );
}
