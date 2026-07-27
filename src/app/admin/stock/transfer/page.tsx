import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import TransferStockClient from './components/TransferStockClient';

export default function TransferStockPage() {
  return (
    <AdminLayout>
      <TransferStockClient />
    </AdminLayout>
  );
}
