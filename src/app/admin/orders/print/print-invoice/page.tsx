import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PrintInvoiceClient from './components/PrintInvoiceClient';
import { Printer } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Print Invoice | Admin Orders',
  description: 'Batch first-print invoices and shipping labels by invoice groups.',
};

export default function PrintInvoicePage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Print Invoice"
      pageSubtitle="Batch print first-time invoices and shipping labels across thermal stickers (1x1), 4-up sheet labels (1x4), or multi-item packing slips."
      pageIcon={<Printer className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <PrintInvoiceClient />
    </AdminLayout>
  );
}
