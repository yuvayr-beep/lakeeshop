import React from 'react';
import CourierExclusionsClient from './components/CourierExclusionsClient';

export const metadata = {
  title: 'Client & Product Courier Exclusions | Admin',
  description: 'Manage courier partner blocklists for clients, programs, and products.',
};

export default function CourierExclusionsPage() {
  return <CourierExclusionsClient />;
}
