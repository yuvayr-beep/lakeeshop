import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierShareClient from './components/CourierShareClient';
import { Briefcase } from 'lucide-react';

export default function CourierSharePage() {
  return (
    <AdminLayout
      pageTitle="Supplier Product Sharing"
      pageSubtitle="Select a supplier to view and manage shared products, pricing structures, and history."
      pageIcon={<Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <CourierShareClient />
    </AdminLayout>
  );
}
