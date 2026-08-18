import { Metadata } from 'next';
import AdminLayout from '@/app/admin/components/AdminLayout';
import UploadCourierAssignmentClient from './components/UploadCourierAssignmentClient';
import { UploadCloud } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Upload Courier Assign | LakeeShop Admin',
  description: 'Bulk assign courier partners and ship modes by uploading an Excel template file.',
};

export default function UploadCourierAssignmentPage() {
  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Upload Courier Assign"
      pageSubtitle="Bulk assign courier partners and ship modes by uploading an Excel template file"
      pageIcon={<UploadCloud className="h-5 w-5 text-amber-500" />}
    >
      <UploadCourierAssignmentClient />
    </AdminLayout>
  );
}

