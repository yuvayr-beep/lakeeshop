import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ManualCourierAssignmentClient from './components/ManualCourierAssignmentClient';
import { Truck } from 'lucide-react';

export const metadata = {
  title: 'Manual Courier Assign | Admin',
  description: 'Search order executions by reference identifiers to directly override and assign eligible couriers for destination pincodes.',
};

export default function ManualCourierAssignmentPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Manual Courier Assign"
      pageSubtitle="Search order executions by reference identifiers to directly override and assign eligible couriers for destination pincodes."
      pageIcon={<Truck className="h-5 w-5 text-amber-500" />}
    >
      <ManualCourierAssignmentClient />
    </AdminLayout>
  );
}

