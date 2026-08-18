import axiosInstance from '@/lib/axios';

export interface ParentAdhocOrderQueryParams {
  orderDateFrom?: string;
  orderDateTo?: string;
  clientId?: number | string;
}

export interface ParentAdhocOrderResponse {
  id: number;
  orderRefNo: string;
  clientOrderNo?: string;
  orderDate?: string;
  customerFirstName?: string;
  customerLastName?: string;
  mobile?: string;
  city?: string;
  state?: string;
  pincode?: string;
  totalChildCount?: number;
  statusSummary?: Record<string, number>;
  childOrders?: ChildAdhocOrderItem[];
}

export interface ChildAdhocOrderItem {
  id: number; // childOrderId / executionId
  parentOrderId?: number;
  currentExecutionId?: number;
  productId?: number;
  productCode?: string;
  productName?: string;
  clientProductCode?: string;
  clientProductName?: string;
  oneTimeProductName?: string;
  quantity?: number;
  clientUnitPrice?: number;
  unitPrice?: number;
  totalAmount?: number;
  taxableAmount?: number;
  taxAmount?: number;
  taxPercentage?: number;
  hsnCode?: string;
  orderLineStatus?: number;
  executionStatus?: number;
  statusName?: string;
  isAdhoc?: boolean;
  adhocRefNo?: string;
  adhocItemId?: number;
  packRefNo?: string;
  courierCode?: string;
  shipMode?: string;
  awbNo?: string;
}

export interface AssignStockItemPayload {
  childOrderId: number;
  adhocRefNo: string;
  adhocItemId?: number;
}

export interface AssignCourierSinglePayload {
  executionId: number;
  courierCode: string;
  shipMode: string;
  awbNo?: string | null;
}

export interface SupplierOption {
  id: number;
  name?: string;
  registeredCompanyName?: string;
  tradeName?: string;
  supplierName?: string;
}

export interface SupplierInvoiceProductPayload {
  supplierProductName: string;
  supplierQty: number;
  supplierCost: number;
  supplierTax?: number;
  supplierHsn?: string;
}

export interface SupplierInvoiceRequestPayload {
  adhocRefNo: string;
  supplierId: number;
  supplierName?: string;
  isAdhocSupplier?: boolean;
  invoiceNo: string;
  invoiceDate: string;
  remarks?: string;
  products: SupplierInvoiceProductPayload[];
}

export const adhocOrderService = {
  // Fetch Suppliers for dropdown
  getSuppliers: async (): Promise<SupplierOption[]> => {
    try {
      const response = await axiosInstance.get('/vendor/suppliers', {
        headers: {
          Accept: 'application/x-ndjson',
        },
      });

      if (Array.isArray(response.data)) return response.data;
      if (typeof response.data === 'string') {
        const lines = response.data.trim().split('\n').filter((l) => l.trim().length > 0);
        const items: SupplierOption[] = [];
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.trim());
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.data)) return parsed.data;
              items.push(parsed);
            }
          } catch {}
        }
        return items;
      }
      return [];
    } catch (err) {
      return [];
    }
  },
  // 1. Fetch Execution Enums
  getExecutionEnums: async () => {
    const response = await axiosInstance.get('/order/executions/enums');
    return response.data;
  },

  // 2. Fetch Parent Ad-Hoc Orders List
  getParentAdhocOrders: async (params?: ParentAdhocOrderQueryParams): Promise<ParentAdhocOrderResponse[]> => {
    const queryParams: Record<string, any> = { isAdhoc: true };
    if (params?.orderDateFrom) queryParams.orderDateFrom = params.orderDateFrom;
    if (params?.orderDateTo) queryParams.orderDateTo = params.orderDateTo;
    if (params?.clientId && String(params.clientId) !== 'ALL') {
      queryParams.clientId = params.clientId;
    }

    const response = await axiosInstance.get('/order/parent-orders', {
      params: queryParams,
      headers: {
        accept: 'application/x-ndjson, application/json, */*',
      },
      transformResponse: [(data) => data],
    });

    const rawData = response.data;
    if (!rawData) return [];

    if (typeof rawData === 'object' && Array.isArray(rawData)) {
      return rawData;
    }

    if (typeof rawData === 'object' && (rawData as any).data && Array.isArray((rawData as any).data)) {
      return (rawData as any).data;
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

      const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
      const records: ParentAdhocOrderResponse[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
            records.push(parsed);
          }
        } catch (e) {
          console.warn('Failed parsing NDJSON line:', line);
        }
      }
      return records;
    }

    return [];
  },

  // 3. Assign Stock for Child Order Lines
  assignStockAdhoc: async (payload: AssignStockItemPayload[]) => {
    const response = await axiosInstance.post('/order/adhoc-orders/assign', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  // 4. Add Supplier Procurement Invoice
  addSupplierInvoice: async (payload: SupplierInvoiceRequestPayload) => {
    const response = await axiosInstance.post('/stock/adhoc-procurement/invoices', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  // 5. Fetch Courier Partners List (/courier)
  getCourierPartners: async () => {
    try {
      const response = await axiosInstance.get('/courier', {
        headers: { Accept: 'application/x-ndjson' },
      });
      if (Array.isArray(response.data)) return response.data;
      if (typeof response.data === 'string') {
        const lines = response.data.trim().split('\n').filter((l) => l.trim().length > 0);
        const parsedArr: any[] = [];
        for (const line of lines) {
          try {
            parsedArr.push(JSON.parse(line.trim()));
          } catch {}
        }
        return parsedArr;
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  // 6. Fetch Available Serviceable Couriers
  getAvailableCouriers: async (childOrderIds: number[]) => {
    try {
      const response = await axiosInstance.post('/order/execution/courier-assignment/available-couriers', childOrderIds, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (err) {
      return [];
    }
  },

  // 7. Manual Courier Assignment
  assignCourierSingle: async (payload: AssignCourierSinglePayload[]) => {
    const response = await axiosInstance.post('/order/execution/courier-assignment/single', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const resData = response.data;
    if (resData) {
      const dataArray = Array.isArray(resData.data)
        ? resData.data
        : resData.data
        ? [resData.data]
        : [];
      const failedItem = dataArray.find((item: any) => item && (item.success === false || item.success === 'false'));
      if (failedItem) {
        throw new Error(failedItem.reason || failedItem.message || 'Courier assignment failed');
      }
    }
    return resData;
  },

  // 8. Auto-Courier Batch Assignment
  assignCourierBatch: async (adhocRefNo: string, executionIds?: number[]) => {
    const payload = executionIds && executionIds.length > 0 ? { executionIds } : { adhocRefNo };
    const response = await axiosInstance.post('/order/execution/courier-assignment/batch', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  // 8. Print Customer Multi-Invoice PDF
  printCustomerInvoice: async (adhocRefNo: string, packRefNo?: string) => {
    const payload = packRefNo
      ? { type: 'PACK_REF_NO', values: [packRefNo] }
      : { type: 'BATCH_NO', values: [adhocRefNo] };

    const response = await axiosInstance.post('/courier/invoice/reprint/multi?docType=invoice', payload, {
      responseType: 'blob',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice_${packRefNo || adhocRefNo}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // 9. Fetch Child Orders by Parent Order ID (NDJSON / JSON)
  getChildOrdersByParentId: async (parentOrderId: number): Promise<ChildAdhocOrderItem[]> => {
    const response = await axiosInstance.get(`/order/child-orders/parent/${parentOrderId}`, {
      headers: {
        accept: 'application/x-ndjson, application/json, */*',
      },
      transformResponse: [(data) => data],
    });

    const sortAscending = (items: ChildAdhocOrderItem[]): ChildAdhocOrderItem[] => {
      return [...items].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    };

    const rawData = response.data;
    if (!rawData) return [];

    if (typeof rawData === 'object' && Array.isArray(rawData)) {
      return sortAscending(rawData);
    }

    if (typeof rawData === 'object' && (rawData as any).data && Array.isArray((rawData as any).data)) {
      return sortAscending((rawData as any).data);
    }

    if (typeof rawData === 'string') {
      const trimmed = rawData.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          return sortAscending(JSON.parse(trimmed));
        } catch {
          // Fall through
        }
      }

      const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
      const records: ChildAdhocOrderItem[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            if (parsed.data && Array.isArray(parsed.data)) return sortAscending(parsed.data);
            records.push(parsed);
          }
        } catch (e) {
          console.warn('Failed parsing NDJSON line in child-orders:', line);
        }
      }
      return sortAscending(records);
    }

    return [];
  },
};
