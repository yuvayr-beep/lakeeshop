import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { AdhocManagementClient } from './components/AdhocManagementClient';
import { ShoppingCart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ad-hoc Order Management | Admin Portal',
  description: 'Ad-hoc Order List, Accordion Order Management, Stock Assignment, Courier Assignment & Invoice Printing',
};

export default function AdhocManagementPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Ad-hoc Order Management"
      pageSubtitle="Ad-hoc order list, stock assignment, courier dispatch & customer invoice printing"
      pageIcon={<ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <AdhocManagementClient />
    </AdminLayout>
  );
}
