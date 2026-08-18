import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import MasterLookupsClient from './components/MasterLookupsClient';
import { Code2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Master Code Lookups | Admin Orders',
  description: 'View master code lookups for order sources, reasons, errors, and execution statuses.',
};

export default function MasterLookupsPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Master Code Lookups"
      pageSubtitle="Centralized master dictionary for order sources, pricing rules, reshipment reasons, timeline tracking actions, validation errors, and execution statuses."
      pageIcon={<Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <MasterLookupsClient />
    </AdminLayout>
  );
}

