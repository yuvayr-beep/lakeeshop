import React from 'react';
import { BatchOrdersClient } from './components/BatchOrdersClient';

export const metadata = {
  title: 'Batch Orders - LakeeShop Admin',
  description: 'Order File Upload, Validation & Submission Wizard',
};

export default function BatchOrdersPage() {
  return <BatchOrdersClient />;
}
