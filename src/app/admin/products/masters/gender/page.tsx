import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import GenderManagementClient from './components/GenderManagementClient';
import { Users } from 'lucide-react';

export default function GenderPage() {
  return (
    <AdminLayout
      pageTitle="Gender Master"
      pageSubtitle="Manage product gender categories and target audience definitions."
      pageIcon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <GenderManagementClient />
    </AdminLayout>
  );
}
