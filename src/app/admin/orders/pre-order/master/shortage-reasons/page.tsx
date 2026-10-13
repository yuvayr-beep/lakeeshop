import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ShortageReasonsClient from './components/ShortageReasonsClient';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pre-Order Shortage Reasons Master | LAKEEE Admin',
  description: 'Master management for Pre-Order shortage root-cause reasons',
};

export default function ShortageReasonsMasterPage() {
  return (
    <AdminLayout
      pageTitle="Pre-Order Shortage Reasons Master"
      pageSubtitle="Master management for warehouse root-cause shortage reason codes (Type 2)."
      pageIcon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
      screenFit={true}
    >
      <ShortageReasonsClient />
    </AdminLayout>
  );
}
