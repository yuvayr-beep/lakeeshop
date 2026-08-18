import React from 'react';
import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { ShareToCourierClient } from './components/ShareToCourierClient';
import { Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Share to Courier | Admin Portal',
  description: 'Share to Courier consolidation metrics, Excel download, and NDJSON preview',
};

export default function ShareToCourierPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Share to Courier"
      pageSubtitle="Consolidated courier dispatch metrics, Excel downloads, and NDJSON execution item previews."
      pageIcon={<Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <ShareToCourierClient />
    </AdminLayout>
  );
}
