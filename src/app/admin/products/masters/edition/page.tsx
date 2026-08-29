import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import EditionManagementClient from './components/EditionManagementClient';
import { Bookmark } from 'lucide-react';

export default function EditionPage() {
  return (
    <AdminLayout
      pageTitle="Edition Master"
      pageSubtitle="Manage product edition master records."
      pageIcon={<Bookmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <EditionManagementClient />
    </AdminLayout>
  );
}
