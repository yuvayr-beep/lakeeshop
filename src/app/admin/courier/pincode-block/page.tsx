import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PincodeBlockClient from './components/PincodeBlockClient';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Bulk Pincode Block Control | Admin',
  description: 'Bulk pincode block and unblock control form for courier partners and clients.',
};

export default function PincodeBlockPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Bulk Pincode Block Control"
      pageSubtitle="Courier > Bulk Pincode Block Control"
      pageIcon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
    >
      <PincodeBlockClient />
    </AdminLayout>
  );
}