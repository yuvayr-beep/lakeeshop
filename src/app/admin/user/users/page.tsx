import React from 'react';
import UsersManagementClient from './components/UsersManagementClient';

export const metadata = {
  title: 'Users Management | LAKEEE Admin',
  description: 'Manage user accounts, view user configurations and inspect permissions.',
};

export default function UsersConfigPage() {
  return <UsersManagementClient />;
}
