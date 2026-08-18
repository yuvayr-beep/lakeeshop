import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ReprintInvoiceClient from './components/ReprintInvoiceClient';
import { Printer } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Reprint Invoice | Admin Orders',
  description: 'Reprint created invoice batches in 1x1 thermal labels, 1x4 sheet format, or packing slips (PS).',
};

export default function ReprintInvoicePage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Reprint Invoice"
      pageSubtitle="View created invoice batches and execute post-first print formats (1x1 thermal labels, 1x4 sheet invoices, or multi-insert PS packing slips)."
      pageIcon={<Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
    >
      <ReprintInvoiceClient />
    </AdminLayout>
  );
}
