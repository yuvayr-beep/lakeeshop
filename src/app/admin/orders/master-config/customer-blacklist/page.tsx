import React from 'react';
import CustomerBlacklistClient from './components/CustomerBlacklistClient';

export const metadata = {
  title: 'Customer Blacklist Setup | Admin Orders',
  description: 'Manage blacklisted customer mobile numbers and email addresses.',
};

export default function CustomerBlacklistPage() {
  return <CustomerBlacklistClient />;
}
