import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierExclusionsClient from './components/CourierExclusionsClient';
import { ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Client & Product Courier Exclusions | Admin',
  description: 'Manage courier partner blocklists for clients, programs, and products.',
};

export default function CourierExclusionsPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Client & Product Courier Exclusions"
      pageSubtitle="Manage courier partner blocklists for clients, programs, and products."
      pageIcon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
    >
      <CourierExclusionsClient />
    </AdminLayout>
  );
}
