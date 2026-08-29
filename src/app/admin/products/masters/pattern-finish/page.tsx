import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import PatternFinishManagementClient from './components/PatternFinishManagementClient';
import { Sparkles } from 'lucide-react';

export default function PatternFinishPage() {
  return (
    <AdminLayout
      pageTitle="Pattern & Finish Master"
      pageSubtitle="Manage surface patterns, textures, and finishing techniques."
      pageIcon={<Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      screenFit={true}
    >
      <PatternFinishManagementClient />
    </AdminLayout>
  );
}
