import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierPartnersClient from './components/CourierPartnersClient';

export default function CourierPartnersPage() {
  return (
    <AdminLayout>
      <CourierPartnersClient />
    </AdminLayout>
  );
}
