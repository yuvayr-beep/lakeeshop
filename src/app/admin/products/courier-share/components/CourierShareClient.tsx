'use client';
import React, { useState } from 'react';
import CourierListScreen from './CourierListScreen';
import CourierProductSharingScreen from './CourierProductSharingScreen';

interface Client {
  id: number;
  clientCode: string;
  clientName: string;
  legalName: string;
  logoUrl?: string;
  status: number;
  remarks: string;
}

export default function CourierShareClient() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {selectedClient ? (
        <CourierProductSharingScreen
          client={selectedClient}
          onBack={() => setSelectedClient(null)}
          clientsList={clients}
        />
      ) : (
        <CourierListScreen
          onSelectClient={setSelectedClient}
          clients={clients}
          setClients={setClients}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </div>
  );
}
