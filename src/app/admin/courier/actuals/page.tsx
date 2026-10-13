import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierActualsClient from './components/CourierActualsClient';
import { Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Courier Actual Costs | Admin',
  description: 'Manage and audit actual courier billed weights and shipping costs.',
};

export default function CourierActualsPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Actual Costs"
      pageSubtitle="Manage and audit actual courier billed weights and shipping costs."
      pageIcon={<Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <CourierActualsClient />
    </AdminLayout>
  );
}
