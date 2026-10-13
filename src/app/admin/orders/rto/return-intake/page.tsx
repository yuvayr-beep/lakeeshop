import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierReturnIntakeClient from './components/CourierReturnIntakeClient';
import { RotateCcw } from 'lucide-react';

export const metadata = {
  title: 'Courier Return Intake | Lakee Shop Admin',
  description: 'Inward Courier Return (RTO) barcode scanning and quality inspection',
};

export default function CourierReturnIntakePage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Return Intake"
      pageSubtitle="Inward Courier Return (RTO) barcode scanning and quality inspection"
      pageIcon={<RotateCcw className="h-5 w-5 text-amber-500" />}
    >
      <CourierReturnIntakeClient />
    </AdminLayout>
  );
}
