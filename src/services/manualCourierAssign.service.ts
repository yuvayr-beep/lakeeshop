import axiosInstance from '@/lib/axios';

export interface OrderLookupDetails {
  execution_id: number;
  child_order_id: number;
  parent_order_id: number;
  po_number?: string | null;
  execution_ref_no?: string | null;
  order_processed_date?: string | null;
  execution_created_at?: string | null;
  order_ref_no?: string | null;
  order_date?: string | null;
  pack_ref_no?: string | null;
  pack_status?: string | null;
  client_order_no?: string | null;
  is_alternate?: string | null;
  client_name?: string | null;
  is_preorder?: string | null;
  is_split?: string | null;

  person_to_deliver?: string | null;
  mobile?: string | null;
  email?: string | null;

  shipment_address_line1?: string | null;
  shipment_address_line2?: string | null;
  shipment_address_line3?: string | null;
  shipment_address_line4?: string | null;
  zip?: string | null;
  city?: string | null;
  state?: string | null;

  product_name?: string | null;
  order_qty?: number | null;
  pack_qty?: number | null;
  product_brand?: string | null;
  product_code?: string | null;
  client_product_code?: string | null;

  courier_name?: string | null;
  ship_mode?: string | null;
  courier_awb_no?: string | null;
  [key: string]: any;
}

export interface SingleCourierAssignItem {
  executionId: number;
  courierCode: string;
  shipMode: string;
  awbNo?: string;
}

export const manualCourierAssignService = {
  // 1. GET /order/execution/lookup-details?identifier=...
  getOrderLookupDetails: async (identifier: string): Promise<OrderLookupDetails | null> => {
    const url = `/order/execution/lookup-details?identifier=${encodeURIComponent(identifier)}`;
    const response = await axiosInstance.get(url, {
      headers: { Accept: '*/*' },
    });

    if (response.data?.data) {
      return response.data.data;
    }
    if (response.data && typeof response.data === 'object' && response.data.execution_id) {
      return response.data;
    }
    return null;
  },

  // 2. POST /order/execution/courier-assignment/single
  submitSingleCourierAssignment: async (payload: SingleCourierAssignItem[]): Promise<any> => {
    const url = '/order/execution/courier-assignment/single';

    const response = await axiosInstance.post(url, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  },

  // 3. GET /courier (List courier partners)
  getCourierPartners: async (): Promise<any[]> => {
    try {
      const response = await axiosInstance.get('/courier', {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson, application/json' },
      });
      const raw = response.data;
      if (typeof raw === 'string') {
        const parsed: any[] = [];
        raw.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              parsed.push(JSON.parse(trimmed));
            } catch (e) {}
          }
        });
        return parsed;
      }
      if (Array.isArray(raw)) return raw;
      if (raw?.data && Array.isArray(raw.data)) return raw.data;
      return [];
    } catch (err) {
      return [];
    }
  },

  // 4. GET /courier/services/courier/{courierId} (List services/shipModes)
  getCourierServicesByPartnerId: async (courierId: number): Promise<any[]> => {
    try {
      const response = await axiosInstance.get(`/courier/services/courier/${courierId}`, {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson, application/json' },
      });
      const raw = response.data;
      if (typeof raw === 'string') {
        const parsed: any[] = [];
        raw.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              parsed.push(JSON.parse(trimmed));
            } catch (e) {}
          }
        });
        return parsed;
      }
      if (Array.isArray(raw)) return raw;
      if (raw?.data && Array.isArray(raw.data)) return raw.data;
      return [];
    } catch (err) {
      return [];
    }
  },

  // 5. GET /courier/serviceable-pincodes?pincode={pincode}&offset=0 (NDJSON)
  getServiceableCouriersByPincode: async (pincode: string): Promise<any[]> => {
    const url = `/courier/serviceable-pincodes?pincode=${encodeURIComponent(pincode)}&offset=0`;
    try {
      const response = await axiosInstance.get(url, {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson, text/plain, */*' },
      });

      const raw = response.data;
      const parsed: any[] = [];
      if (typeof raw === 'string') {
        raw.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              parsed.push(JSON.parse(trimmed));
            } catch (e) {}
          }
        });
      } else if (Array.isArray(raw)) {
        return raw;
      }

      return parsed;
    } catch (err) {
      return [];
    }
  },
};
