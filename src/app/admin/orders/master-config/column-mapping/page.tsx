import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import ColumnMappingClient from './components/ColumnMappingClient';
import { FileSpreadsheet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Client Column Mapping Setup | Admin Orders',
  description: 'Map client-specific Excel order columns to standard system order ingestion fields.',
};

export default function ColumnMappingPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Client Column Mapping Setup"
      pageSubtitle="Map client-specific Excel order columns to standard system order ingestion fields"
      pageIcon={<FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <ColumnMappingClient />
    </AdminLayout>
  );
}

