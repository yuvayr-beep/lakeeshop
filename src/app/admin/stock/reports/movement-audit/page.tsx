import React from 'react';
import MovementAuditClient from './components/MovementAuditClient';

export const metadata = {
  title: 'Stock Movement Report (Audit) | Admin',
};

export default function StockMovementAuditPage() {
  return <MovementAuditClient />;
}
