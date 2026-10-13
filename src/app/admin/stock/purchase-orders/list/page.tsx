import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import POManagementClient from './components/POManagementClient';
import { FileText } from 'lucide-react';

export default function POListPage() {
  return (
    <AdminLayout
      pageTitle="Purchase Orders"
      pageSubtitle="Manage procurement orders, generate supplier PDFs, and track receive status."
      pageIcon={<FileText size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <POManagementClient />
    </AdminLayout>
  );
}
