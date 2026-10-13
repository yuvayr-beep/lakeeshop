import React from 'react';
import UserPermissionOverridesClient from './components/UserPermissionOverridesClient';

export const metadata = {
  title: 'Permission Overrides & Cache | Admin Portal',
  description: 'Inspect effective user actions and refresh Redis permission cache',
};

export default function UserPermissionOverridesPage() {
  return <UserPermissionOverridesClient />;
}
