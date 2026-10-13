import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import StockLedgerClient from './components/StockLedgerClient';
import { BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Stock Ledger Report | Admin',
};

export default function StockLedgerPage() {
  return (
    <AdminLayout
      pageTitle="Stock Ledger Report"
      pageSubtitle="Chronological inventory transaction log, In/Out quantities, GRN/Order references, and running balances."
      pageIcon={<BookOpen size={22} className="text-blue-600 dark:text-blue-400" />}
      screenFit={true}
      fullWidth={true}
    >
      <StockLedgerClient />
    </AdminLayout>
  );
}
