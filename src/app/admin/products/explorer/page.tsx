import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import FileExplorerClient from './components/FileExplorerClient';
import { HardDrive } from 'lucide-react';

export const metadata = {
  title: 'Media Explorer | Lakee Admin',
  description: 'Dual-pane Local & Server Media Explorer with drag-and-drop upload',
};

export default function MediaExplorerPage() {
  return (
    <AdminLayout
      pageTitle="Media & File Explorer"
      pageSubtitle="Dual-pane file commander: browse local PC files, manage server storage, and drag-and-drop upload product media."
      pageIcon={<HardDrive className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
      fullWidth={true}
      screenFit={true}
    >
      <FileExplorerClient />
    </AdminLayout>
  );
}
