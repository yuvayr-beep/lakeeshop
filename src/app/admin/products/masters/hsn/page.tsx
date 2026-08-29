import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import HsnManagementClient from './components/HsnManagementClient';
import { FileText } from 'lucide-react';

export default function HsnPage() {
  return (
    <AdminLayout
      pageTitle="HSN Master"
      pageSubtitle="Manage HSN codes, tax slabs, and GST rates for products."
      pageIcon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <HsnManagementClient />
    </AdminLayout>
  );
}
