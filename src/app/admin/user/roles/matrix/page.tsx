import React, { Suspense } from 'react';
import RolePermissionMatrixClient from './components/RolePermissionMatrixClient';
import { RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Permission Matrix | Admin Portal',
  description: 'Role permission grid management for system screens',
};

export default function RolePermissionMatrixPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <RolePermissionMatrixClient />
    </Suspense>
  );
}
