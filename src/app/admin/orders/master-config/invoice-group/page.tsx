import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import InvoiceGroupClient from './components/InvoiceGroupClient';
import { Layers } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Invoice Group Master | Admin Orders',
  description: 'Manage Invoice Group sequence numbers, client-program mappings, and courier services.',
};

export default function InvoiceGroupPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Invoice Group Configuration"
      pageSubtitle="Configure group rules, drag & drop sequence ordering, client-program mappings, and courier service assignments."
      pageIcon={<Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <InvoiceGroupClient />
    </AdminLayout>
  );
}
