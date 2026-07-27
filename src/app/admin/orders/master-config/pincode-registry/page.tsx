import React from 'react';
import PincodeRegistryClient from './components/PincodeRegistryClient';

export const metadata = {
  title: 'Pincode Registry Master | Admin Orders',
  description: 'Manage master pincode serviceability registry across India.',
};

export default function PincodeRegistryPage() {
  return <PincodeRegistryClient />;
}
