import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierPartnersClient from './components/CourierPartnersClient';
import { Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Courier Partner Management | Admin',
  description: 'Configure carrier accounts, origin hubs, tracking templates, and commercial liability limits.',
};

export default function CourierPartnersPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Partner Management"
      pageSubtitle="Configure carrier accounts, origin hubs, tracking templates, and commercial liability limits."
      pageIcon={<Truck className="h-5 w-5 text-amber-500" />}
    >
      <CourierPartnersClient />
    </AdminLayout>
  );
}

