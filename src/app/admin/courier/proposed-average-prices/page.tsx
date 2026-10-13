import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ProposedAveragePricesClient from './components/ProposedAveragePricesClient';
import { DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Proposed Average Courier Prices | Admin',
  description: 'View calculated proposed average courier prices per product.',
};

export default function ProposedAveragePricesPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Proposed Average Courier Prices"
      pageSubtitle="View calculated proposed average courier prices per product."
      pageIcon={<DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <ProposedAveragePricesClient />
    </AdminLayout>
  );
}
