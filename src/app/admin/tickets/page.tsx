import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { Ticket } from 'lucide-react';

export default function TicketsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-700 text-slate-800 dark:text-white">Support Tickets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage and track support requests</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-12 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <Ticket size={28} className="text-blue-600" />
          </div>
          <h3 className="text-base font-700 text-slate-800 dark:text-white mb-1">Tickets Module</h3>
          <p className="text-sm text-slate-400 max-w-xs">The tickets module is coming soon. You will be able to create and manage support tickets here.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
