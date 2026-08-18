import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { PreAwbMasterClient } from './components/PreAwbMasterClient';
import { Truck } from 'lucide-react';

export const metadata = {
  title: 'Pre-AWB Master | Admin Portal',
  description: 'Pre-Allotted Courier Waybill Management and Pool Allocation Engine',
};

export default function PreAwbMasterPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Pre-AWB Master"
      pageSubtitle="Pre-Allotted Courier Waybill Management, Bulk Upload, and Pool Allocation Engine"
      pageIcon={<Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <PreAwbMasterClient />
    </AdminLayout>
  );
}
