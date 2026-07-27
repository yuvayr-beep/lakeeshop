import React, { Suspense } from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierConfigClient from './components/CourierConfigClient';

export default function CourierConfigPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400 font-semibold">Loading Courier Configuration...</div>}>
        <CourierConfigClient />
      </Suspense>
    </AdminLayout>
  );
}
