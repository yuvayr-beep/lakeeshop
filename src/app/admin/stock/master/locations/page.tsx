import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import LocationManagementClient from './components/LocationManagementClient';

export default function InventoryStorageLocationsPage() {
  return (
    <AdminLayout>
      <LocationManagementClient />
    </AdminLayout>
  );
}
