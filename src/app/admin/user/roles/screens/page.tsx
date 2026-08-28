import React from 'react';
import ScreensManagementClient from './components/ScreensManagementClient';

export const metadata = {
  title: 'Screens Management | Admin Portal',
  description: 'Manage application modules and screen mappings',
};

export default function ScreensPage() {
  return <ScreensManagementClient />;
}
