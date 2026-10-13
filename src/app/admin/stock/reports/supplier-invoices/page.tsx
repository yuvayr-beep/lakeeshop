import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import SupplierInvoiceReportClient from './components/SupplierInvoiceReportClient';
import { FileText } from 'lucide-react';

export const metadata = {
  title: 'Supplier Invoice Report | Admin',
};

export default function SupplierInvoiceReportPage() {
  return (
    <AdminLayout
      pageTitle="Supplier Invoice Report"
      pageSubtitle="Inward supplier invoices, GRN references, purchase item details, tax amounts, and payment status tracking."
      pageIcon={<FileText size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <SupplierInvoiceReportClient />
    </AdminLayout>
  );
}
