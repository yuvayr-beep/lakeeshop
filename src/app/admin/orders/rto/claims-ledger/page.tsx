import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import CourierClaimsLedgerClient from './components/CourierClaimsLedgerClient';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Courier Damage Claims Ledger | Lakee Shop Admin',
  description: 'Accounts Courier Damage Claims recovery ledger and dispute ticket tracking',
};

export default function CourierClaimsLedgerPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Courier Damage Claims Ledger"
      pageSubtitle="Accounts ledger for tracking transit damage claims, filing dispute tickets, and freight credit notes"
      pageIcon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
    >
      <CourierClaimsLedgerClient />
    </AdminLayout>
  );
}
