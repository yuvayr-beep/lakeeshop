import React from 'react';
import RoleManagementClient from './components/RoleManagementClient';

export const metadata = {
  title: 'Role Management | Admin Portal',
  description: 'Manage active system roles, status, and permissions',
};

export default function RoleListPage() {
  return <RoleManagementClient />;
}
