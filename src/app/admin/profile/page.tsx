import React from 'react';
import AdminLayout from '../components/AdminLayout';
import ProfileScreen from './ProfileScreen';

export default function ProfilePage() {
  return (
    <AdminLayout>
      <ProfileScreen />
    </AdminLayout>
  );
}
