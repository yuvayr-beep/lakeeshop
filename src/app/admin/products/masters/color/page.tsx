import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ColorManagementClient from './components/ColorManagementClient';
import { Palette } from 'lucide-react';

export default function ColorPage() {
  return (
    <AdminLayout
      pageTitle="Color Master"
      pageSubtitle="Manage product colors, define hex values, and update display names."
      pageIcon={<Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <ColorManagementClient />
    </AdminLayout>
  );
}
