'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/app/admin/components/AdminLayout';
import POWizard from '../../components/POWizard';

export default function POEditPage() {
  const params = useParams();
  const id = params?.id;
  const poId = id ? Number(id) : undefined;

  return (
    <AdminLayout fullWidth={true}>
      <POWizard poId={poId} />
    </AdminLayout>
  );
}
