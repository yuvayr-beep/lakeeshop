import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import AutoConfigClient from './components/AutoConfigClient';
import { Settings } from 'lucide-react';

export default function AutoConfigPage() {
  return (
    <AdminLayout
      pageTitle="Auto-PO Configuration"
      pageSubtitle="Manage automatic Purchase Order configurations, algorithm formulas, overrides, and schedule parameters."
      pageIcon={<Settings size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <AutoConfigClient />
    </AdminLayout>
  );
}
