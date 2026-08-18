import axiosInstance from '@/lib/axios';

export interface BusinessUnitItem {
  id: number;
  clientId: number;
  unitCode?: string;
  unitName?: string;
  merchantId?: string | null;
  legalName?: string;
  dispatchWithinDays?: number;
  deliverWithinDays?: number;
  hasOwnProductCode?: boolean;
  hasMultiProductOrder?: boolean;
  hasProgram?: boolean;
  status?: number;
}

export interface ClientItem {
  id: number;
  clientCode: string;
  clientName: string;
  legalName?: string;
  logoUrl?: string;
  status?: number;
  remarks?: string;
  businessUnits?: BusinessUnitItem[];
}

export interface ClientProductShareItem {
  clientShareId: number;
  clientId: number;
  businessUnitId?: number;
  productId: number;
  skuId?: number;
  clientSkuCode: string;
  minQty?: number;
  sellingPrice?: number;
  lakeePrice?: number;
  basePrice?: number;
  shippingPrice?: number;
  taxPrice?: number;
  isListed?: boolean;
  shareStatus?: string;
  status?: boolean;
}

export interface ProductDetail {
  id: number;
  baseProductName: string;
  defaultSku?: string;
  brandName?: string;
  categoryPath?: string;
  sellingPrice?: number;
  mrp?: number;
  costPrice?: number;
}

export interface ProgramItem {
  id: number;
  businessUnitId: number;
  programCode: string;
  programName: string;
  programLabel: string;
  poweredByDescription?: string;
  allowRpi?: boolean;
  status?: number;
}

export interface SingleOrderPayloadItem {
  merchant_id: string;
  client_order_id: string;
  order_date: string;
  customer_details: {
    customer_name: string;
    customer_email: string;
    customer_mobile: number;
    alternate_number?: number;
    address_details: {
      ship_to_name: string;
      address_line1: string;
      address_line2?: string;
      address_line3?: string;
      address_line4?: string;
      landmark?: string;
      city: string;
      state: string;
      pincode: number;
    };
  };
  product_details: {
    client_product_code: string;
    product_name: string;
    quantity: number;
  };
  additional_info?: {
    program_name?: string;
    po_number?: string;
    invoice_price?: string;
    redemption_details?: {
      redemption_type?: string;
      points?: number;
      amount?: number;
    };
  };
}

export interface SingleOrderCreateResponse {
  status: string;
  code: string;
  message: string;
  data?: {
    batch_no?: string;
    total_orders?: string;
    pass_orders?: string;
    fail_orders?: string;
    fail_orders_details?: any[];
    pass_orders_details?: {
      client_order_id: string;
      lakee_order_id?: string;
      status?: string;
      remarks?: string;
    }[];
  };
}

// Helper to parse NDJSON or JSON array/object responses
function parseNdjsonOrJson<T>(rawData: any): T[] {
  if (!rawData) return [];

  if (Array.isArray(rawData)) {
    return rawData;
  }

  if (typeof rawData === 'object' && rawData.data && Array.isArray(rawData.data)) {
    return rawData.data;
  }

  if (typeof rawData === 'string') {
    const trimmed = rawData.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Fall through
      }
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.data && Array.isArray(parsed.data)) {
          return parsed.data;
        }
        if (parsed && typeof parsed === 'object') {
          return [parsed as T];
        }
      } catch {
        // Fall through
      }
    }

    const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
    const records: T[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line.trim());
        if (parsed && typeof parsed === 'object') {
          if (parsed.data && Array.isArray(parsed.data)) {
            return parsed.data;
          }
          records.push(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse NDJSON line:', line);
      }
    }
    return records;
  }

  return [];
}

export const singleOrderService = {
  // 1. GET Clients List
  getClients: async (): Promise<ClientItem[]> => {
    const response = await axiosInstance.get('/client', {
      headers: {
        accept: 'application/x-ndjson, application/json, */*',
      },
      transformResponse: [(data) => data],
    });
    return parseNdjsonOrJson<ClientItem>(response.data);
  },

  // 2. GET Shared Products for Client
  getClientProducts: async (clientId: number): Promise<ClientProductShareItem[]> => {
    const response = await axiosInstance.get(`/prod/client-product-share/client/${clientId}`, {
      headers: {
        accept: 'application/x-ndjson, application/json, */*',
      },
      transformResponse: [(data) => data],
    });
    return parseNdjsonOrJson<ClientProductShareItem>(response.data);
  },

  // 3. GET Detailed Product Info
  getProductDetail: async (productId: number): Promise<ProductDetail | null> => {
    try {
      const response = await axiosInstance.get(`/prod/products/${productId}`, {
        headers: {
          accept: 'application/json, */*',
        },
      });
      const data = response.data;
      if (data?.success && data?.data) {
        return data.data;
      }
      return data;
    } catch (err) {
      console.warn(`Failed to fetch product detail for id ${productId}:`, err);
      return null;
    }
  },

  // 4. GET Programs for Business Unit
  getPrograms: async (businessUnitId: number): Promise<ProgramItem[]> => {
    const response = await axiosInstance.get(`/client/program/${businessUnitId}`, {
      headers: {
        accept: 'application/x-ndjson, application/json, */*',
      },
      transformResponse: [(data) => data],
    });
    return parseNdjsonOrJson<ProgramItem>(response.data);
  },

  // 5. POST Create Single Order
  createSingleOrder: async (payload: SingleOrderPayloadItem[]): Promise<SingleOrderCreateResponse> => {
    const response = await axiosInstance.post('/order/create', payload, {
      headers: {
        'Content-Type': 'application/json',
        accept: '*/*',
      },
    });
    return response.data;
  },
};
