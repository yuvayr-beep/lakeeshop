import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import DamagedProductsClient from './components/DamagedProductsClient';
import { AlertTriangle } from 'lucide-react';

export default function DamagedProductsPage() {
  return (
    <AdminLayout
      pageTitle="Damaged & Defective Stock"
      pageSubtitle="Record, track, and classify stock damaged in warehouses or retail outlets, and assign specific repair/write-off reason codes."
      pageIcon={<AlertTriangle size={22} className="text-red-500 animate-pulse" />}
      fullWidth={true}
    >
      <DamagedProductsClient />
    </AdminLayout>
  );
}
