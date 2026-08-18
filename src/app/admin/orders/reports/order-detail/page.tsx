import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { OrderDetailReportClient } from './components/OrderDetailReportClient';
import { FileSpreadsheet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Order Detail Report | Admin Portal',
  description: 'Batch Order Detail Report, Channel Filters, Synchronous Excel Download & Asynchronous ERP Export Jobs',
};

export default function OrderDetailReportPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Order Detail Report"
      pageSubtitle="Batch listing, channel filtering, unified Excel downloads, and async ERP exports"
      pageIcon={<FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <OrderDetailReportClient />
    </AdminLayout>
  );
}
