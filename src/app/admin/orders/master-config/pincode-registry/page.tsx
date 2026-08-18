import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PincodeRegistryClient from './components/PincodeRegistryClient';
import { MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pincode Registry Master | Admin Orders',
  description: 'Manage master pincode serviceability registry across India.',
};

export default function PincodeRegistryPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Pincode Registry Master"
      pageSubtitle="Master repository for order serviceability pincodes across India. Search by Pincode, State, or City."
      pageIcon={<MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <PincodeRegistryClient />
    </AdminLayout>
  );
}

