'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/app/admin/components/AdminLayout';
import POWizard from '../../components/POWizard';
import { FileText } from 'lucide-react';

export default function POEditPage() {
  const params = useParams();
  const id = params?.id;
  const poId = id ? Number(id) : undefined;

  return (
    <AdminLayout
      pageTitle="Edit Purchase Order"
      pageSubtitle="Create or edit purchase orders with product drag and drop interface."
      pageIcon={<FileText size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <POWizard poId={poId} />
    </AdminLayout>
  );
}
