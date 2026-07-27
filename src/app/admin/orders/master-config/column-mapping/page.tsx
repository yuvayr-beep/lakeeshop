import React from 'react';
import ColumnMappingClient from './components/ColumnMappingClient';

export const metadata = {
  title: 'Client Column Mapping Setup | Admin Orders',
  description: 'Manage Excel file column mappings for client order ingestion.',
};

export default function ColumnMappingPage() {
  return <ColumnMappingClient />;
}
