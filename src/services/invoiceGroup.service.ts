import axiosInstance from '@/lib/axios';
import {
  InvoiceGroup,
  CreateInvoiceGroupPayload,
  EditInvoiceGroupPayload,
  ClientItem,
  ClientProgram,
  CourierServiceItem,
} from '@/types/invoiceGroup';

// Helper function to safely parse NDJSON or standard JSON response
export const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const items: any[] = [];
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          items.push(JSON.parse(trimmed));
        } catch (e) {
          console.error('Error parsing NDJSON line:', trimmed, e);
        }
      }
    });
    return items;
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === 'object') return [raw.data];
  }
  return [];
};

export const invoiceGroupService = {
  // GET List of Invoice Groups
  // GET /courier/invoice-group
  getInvoiceGroups: async (): Promise<InvoiceGroup[]> => {
    const response = await axiosInstance.get('/courier/invoice-group', {
      headers: {
        Accept: 'application/x-ndjson, application/json',
      },
    });
    return parseNdjson(response.data);
  },

  // GET Single Invoice Group
  // GET /courier/invoice-group/{id}
  getInvoiceGroupById: async (id: number): Promise<InvoiceGroup> => {
    const response = await axiosInstance.get(`/courier/invoice-group/${id}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  // POST Create Invoice Group
  // POST /courier/invoice-group
  createInvoiceGroup: async (payload: CreateInvoiceGroupPayload): Promise<InvoiceGroup> => {
    const response = await axiosInstance.post('/courier/invoice-group', payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  // PUT Edit Invoice Group
  // PUT /courier/invoice-group/{id}
  updateInvoiceGroup: async (id: number, payload: EditInvoiceGroupPayload): Promise<InvoiceGroup> => {
    const response = await axiosInstance.put(`/courier/invoice-group/${id}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  // DELETE Invoice Group
  // DELETE /courier/invoice-group/{id}
  deleteInvoiceGroup: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/courier/invoice-group/${id}`, {
      headers: {
        Accept: 'application/json',
      },
    });
  },

  // GET Clients list for dropdown selection
  // GET /client
  getClients: async (): Promise<ClientItem[]> => {
    const response = await axiosInstance.get('/client', {
      headers: {
        Accept: 'application/x-ndjson, application/json',
      },
    });
    return parseNdjson(response.data);
  },

  // GET Client Programs for a specific business unit ID
  // GET /client/program/{businessUnitId}
  getClientPrograms: async (businessUnitId: number): Promise<ClientProgram[]> => {
    const response = await axiosInstance.get(`/client/program/${businessUnitId}`, {
      headers: {
        Accept: 'application/x-ndjson, application/json',
      },
    });
    return parseNdjson(response.data);
  },

  // GET Courier Services list
  // GET /courier/services
  getCourierServices: async (): Promise<CourierServiceItem[]> => {
    const response = await axiosInstance.get('/courier/services', {
      headers: {
        Accept: 'application/x-ndjson, application/json',
      },
    });
    return parseNdjson(response.data);
  },
};
