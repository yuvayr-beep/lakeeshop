import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { CourierAssignBatchClient } from './components/CourierAssignBatchClient';
import { Zap } from 'lucide-react';

export const metadata = {
  title: 'Courier Assign Batch | Admin Portal',
  description: 'Batch process orders and submit AWB generation jobs for eligible couriers',
};

export default function CourierAssignBatchPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Assign Batch"
      pageSubtitle="Fetch couriers with pending AWBs and execute batch generation or pre-allotted AWB jobs"
      pageIcon={<Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <CourierAssignBatchClient />
    </AdminLayout>
  );
}
