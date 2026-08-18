import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CustomerBlacklistClient from './components/CustomerBlacklistClient';
import { ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Blacklist Setup | Admin Orders',
  description: 'Manage blacklisted customer mobile numbers and email addresses.',
};

export default function CustomerBlacklistPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Customer Blacklist Setup"
      pageSubtitle="Configure and manage blacklisted mobile numbers and customer email accounts to block unauthorized or fraudulent order placements."
      pageIcon={<ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />}
    >
      <CustomerBlacklistClient />
    </AdminLayout>
  );
}

