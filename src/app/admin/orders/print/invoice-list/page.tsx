import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { InvoiceListClient } from './components/InvoiceListClient';
import { Printer } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Invoice List | Admin Portal',
  description: 'Manage and download pending invoice list summary spreadsheet for batch printing.',
};

export default function InvoiceListPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Invoice List"
      pageSubtitle="Generate and download pending invoice list summary report before physical batch printing"
      pageIcon={<Printer className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <InvoiceListClient />
    </AdminLayout>
  );
}
