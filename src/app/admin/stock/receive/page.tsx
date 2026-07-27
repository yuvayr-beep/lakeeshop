import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ReceiveStockClient from './components/ReceiveStockClient';

export default function ReceiveStockPage() {
  return (
    <AdminLayout>
      <ReceiveStockClient />
    </AdminLayout>
  );
}
