import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { CourierBatchUploadClient } from './components/CourierBatchUploadClient';
import { Upload } from 'lucide-react';

export const metadata = {
  title: 'Courier Batch Upload | Admin Portal',
  description: 'Courier AWB Bulk Upload & Batch Assignment Engine',
};

export default function CourierBatchUploadPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Batch Upload"
      pageSubtitle="Courier AWB Bulk Upload & Batch Assignment Engine for offline waybill manifests"
      pageIcon={<Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <CourierBatchUploadClient />
    </AdminLayout>
  );
}
