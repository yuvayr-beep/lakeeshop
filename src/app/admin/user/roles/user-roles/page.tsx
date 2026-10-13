import React from 'react';
import UserRoleMappingClient from './components/UserRoleMappingClient';

export const metadata = {
  title: 'User Role Mappings | Admin Portal',
  description: 'Manage user role assignments and security policies',
};

export default function UserRoleMappingPage() {
  return <UserRoleMappingClient />;
}
