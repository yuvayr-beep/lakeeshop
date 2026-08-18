import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import BatchReprintClient from './components/BatchReprintClient';
import { Printer } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Batch Reprint Invoice | Admin Orders',
  description: 'Reprint invoices/labels by submitting batch order identifiers (Pack Ref No, AWB No, Execution Ref No, Order Ref No, Client Order No, Invoice No, or Batch No).',
};

export default function BatchReprintPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Batch Reprint Invoice"
      pageSubtitle="Validate custom order identifiers (comma or newline separated) and execute batch reprints in 1x1, 1x4, Multi, or PS packing slip formats."
      pageIcon={<Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
    >
      <BatchReprintClient />
    </AdminLayout>
  );
}
