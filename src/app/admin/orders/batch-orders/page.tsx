import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { BatchOrdersClient } from './components/BatchOrdersClient';
import { Layers } from 'lucide-react';

export default function BatchOrdersPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Batch Orders Entry"
      pageSubtitle="Batch order excel ingestion, validation engine, inline error correction, and order submission"
      pageIcon={<Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <BatchOrdersClient />
    </AdminLayout>
  );
}
