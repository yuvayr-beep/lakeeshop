import { Metadata } from 'next';
import StatusCheckBatchClient from './components/StatusCheckBatchClient';

export const metadata: Metadata = {
  title: 'Status Check Batch | LakeeShop Admin',
  description: 'Batch status check report for multiple reference identifiers with NDJSON stream parsing and Excel export.',
};

export default function StatusCheckBatchPage() {
  return <StatusCheckBatchClient />;
}
