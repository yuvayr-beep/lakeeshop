'use client';
import React, { useState } from 'react';
import ClientListScreen from './ClientListScreen';
import ClientProductSharingScreen from './ClientProductSharingScreen';

interface Client {
  id: number;
  clientCode: string;
  clientName: string;
  legalName: string;
  logoUrl?: string;
  status: number;
  remarks: string;
}

export default function ClientShareClient() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  if (selectedClient) {
    return (
      <ClientProductSharingScreen
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        clientsList={clients}
      />
    );
  }

  return (
    <ClientListScreen
      onSelectClient={setSelectedClient}
      clients={clients}
      setClients={setClients}
      loading={loading}
      setLoading={setLoading}
    />
  );
}
