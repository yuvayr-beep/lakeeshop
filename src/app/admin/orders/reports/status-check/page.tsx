import { Metadata } from 'next';
import StatusCheckReportClient from './components/StatusCheckReportClient';

export const metadata: Metadata = {
  title: 'Status Check Report | LakeeShop Admin',
  description: 'Track real-time order status, lifecycle timeline, and courier assignment details across reference identifiers.',
};

export default function StatusCheckReportPage() {
  return <StatusCheckReportClient />;
}
