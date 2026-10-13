import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import AdhocProcurementClient from './components/AdhocProcurementClient';
import { ShoppingBag } from 'lucide-react';

export const metadata = {
  title: 'Ad-hoc Procurement Verification Report | Admin',
};

export default function AdhocProcurementPage() {
  return (
    <AdminLayout
      pageTitle="Ad-hoc Report"
      pageSubtitle="Ad-hoc Procurement Verification, local supplier product entries, cost audits, and tax verification."
      pageIcon={<ShoppingBag size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <AdhocProcurementClient />
    </AdminLayout>
  );
}
