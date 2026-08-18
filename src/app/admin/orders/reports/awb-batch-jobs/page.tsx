import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { AwbBatchJobsClient } from './components/AwbBatchJobsClient';
import { Layers } from 'lucide-react';

export const metadata = {
  title: 'AWB Batch Jobs | Admin Portal',
  description: 'Monitor, pause, resume, abort, and download report logs for background AWB batch jobs',
};

export default function AwbBatchJobsPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="AWB Batch Jobs"
      pageSubtitle="List, monitor live progress, pause, resume, abort, and download failed reports for background AWB batch jobs"
      pageIcon={<Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <AwbBatchJobsClient />
    </AdminLayout>
  );
}
