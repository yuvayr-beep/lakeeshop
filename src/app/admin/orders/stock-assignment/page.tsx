import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import StockAssignmentClient from './components/StockAssignmentClient';
import { Boxes } from 'lucide-react';

export const metadata = {
  title: 'Stock Assignment | Lakee Shop Admin',
  description: 'Manage and assign inventory stock for validated order batches.',
};

export default function StockAssignmentPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Stock Assignment"
      pageSubtitle="Manage and assign inventory stock for validated order batches"
      pageIcon={<Boxes className="h-5 w-5 text-amber-500" />}
    >
      <StockAssignmentClient />
    </AdminLayout>
  );
}

