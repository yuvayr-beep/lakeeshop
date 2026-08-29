import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ClientShareClient from './components/ClientShareClient';
import { Briefcase } from 'lucide-react';

export default function ClientSharePage() {
  return (
    <AdminLayout
      pageTitle="Client Product Sharing"
      pageSubtitle="Select a client to view and manage shared products, pricing structures, and history."
      pageIcon={<Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <ClientShareClient />
    </AdminLayout>
  );
}
