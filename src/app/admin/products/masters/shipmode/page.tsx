import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ShipmodeManagementClient from './components/ShipmodeManagementClient';
import { Truck } from 'lucide-react';

export default function ShipmodePage() {
  return (
    <AdminLayout
      pageTitle="Shipmode Master"
      pageSubtitle="Manage product shipping methods, transport modes, and delivery rules."
      pageIcon={<Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <ShipmodeManagementClient />
    </AdminLayout>
  );
}
