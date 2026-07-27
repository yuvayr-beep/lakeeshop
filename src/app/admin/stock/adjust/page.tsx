import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import AdjustStockClient from './components/AdjustStockClient';

export default function AdjustStockPage() {
  return (
    <AdminLayout>
      <AdjustStockClient />
    </AdminLayout>
  );
}
