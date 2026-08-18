import React, { Suspense } from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierConfigClient from './components/CourierConfigClient';
import { Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Courier Configuration | Admin',
  description: 'Configure service ship modes, air/surface serviceability pincodes, and SLA performance settings for carrier partner.',
};

export default function CourierConfigPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Configuration"
      pageSubtitle="Configure service ship modes, air/surface serviceability pincodes, and SLA performance settings for carrier partner."
      pageIcon={<Settings className="h-5 w-5 text-amber-500" />}
    >
      <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400 font-semibold">Loading Courier Configuration...</div>}>
        <CourierConfigClient />
      </Suspense>
    </AdminLayout>
  );
}

