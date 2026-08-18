import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import AdhocPOClient from './components/AdhocPOClient';
import { ShoppingCart } from 'lucide-react';

export const metadata = {
  title: 'Ad-hoc PO | Admin',
  description: 'Ad-hoc Purchase Orders and Order Management Screen',
};

export default function AdhocPOPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Batch Order Ad-hoc PO Induction"
      pageSubtitle="Create, validate, and process manual ad-hoc purchase orders and item details for batch induction"
      pageIcon={<ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <AdhocPOClient />
    </AdminLayout>
  );
}
