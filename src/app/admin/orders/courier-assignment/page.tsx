import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierAssignmentClient from './components/CourierAssignmentClient';
import { Truck } from 'lucide-react';

export const metadata = {
  title: 'Courier Assignment | Admin',
  description: 'Select order batches to evaluate serviceability, weights, and assign courier partners automatically.',
};

export default function CourierAssignmentPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Assignment"
      pageSubtitle="Select order batches to evaluate serviceability, weights, and assign courier partners automatically"
      pageIcon={<Truck className="h-5 w-5 text-amber-500" />}
    >
      <CourierAssignmentClient />
    </AdminLayout>
  );
}

