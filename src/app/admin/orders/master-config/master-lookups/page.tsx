import React from 'react';
import MasterLookupsClient from './components/MasterLookupsClient';

export const metadata = {
  title: 'Master Code Lookups | Admin Orders',
  description: 'View master code lookups for order sources, reasons, errors, and execution statuses.',
};

export default function MasterLookupsPage() {
  return <MasterLookupsClient />;
}
