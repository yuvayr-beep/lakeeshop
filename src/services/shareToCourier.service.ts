import axiosInstance from '@/lib/axios';

export interface ShareToCourierConsolidationItem {
  courierServiceId: number;
  courierCode: string;
  courierServiceName: string;
  shipMode: string;
  totalPacks: number;
  totalOrders: number;
  totalQty: number;
}

export interface ShareToCourierNdjsonItem {
  packRefNo?: string | null;
  productName?: string | null;
  executionQty?: number | null;
  consigneeName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  addressLine4?: string | null;
  city?: string | null;
  pincode?: string | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  weight?: number | null;
  totalWeight?: number | null;
  rate?: number | null;
  totalRate?: number | null;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  courierName?: string | null;
  shipMode?: string | null;
  awbNumber?: string | null;
  orderRefNo?: string | null;
  clientName?: string | null;
}

export interface ShareToCourierFilterParams {
  shipMode?: string;
  fromDate?: string;
  toDate?: string;
  isReship?: boolean | null;
}

export const shareToCourierService = {
  // 1. GET /order/execution/share_to_courier/consolidation
  getConsolidationList: async (
    filters: ShareToCourierFilterParams
  ): Promise<ShareToCourierConsolidationItem[]> => {
    const params: Record<string, any> = {};

    if (filters.shipMode && filters.shipMode !== 'ALL') {
      params.shipMode = filters.shipMode;
    }
    if (filters.fromDate) {
      params.fromDate = filters.fromDate;
    }
    if (filters.toDate) {
      params.toDate = filters.toDate;
    }
    if (filters.isReship !== undefined && filters.isReship !== null) {
      params.isReship = filters.isReship;
    }

    const response = await axiosInstance.get('/order/execution/share_to_courier/consolidation', {
      params,
      headers: {
        Accept: '*/*',
      },
    });

    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  },

  // 2. GET /order/execution/share_to_courier?format=Excel (Global or Individual Download)
  downloadExcelReport: async (
    filters: ShareToCourierFilterParams,
    courierId?: number
  ): Promise<void> => {
    const params: Record<string, any> = {
      format: 'Excel',
    };

    if (courierId) {
      params.courierId = courierId;
    }
    if (filters.shipMode && filters.shipMode !== 'ALL') {
      params.shipMode = filters.shipMode;
    }
    if (filters.fromDate) {
      params.fromDate = filters.fromDate;
    }
    if (filters.toDate) {
      params.toDate = filters.toDate;
    }
    if (filters.isReship !== undefined && filters.isReship !== null) {
      params.isReship = filters.isReship;
    }

    const response = await axiosInstance.get('/order/execution/share_to_courier', {
      params,
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    });

    const filename = courierId
      ? `Share_To_Courier_${courierId}_${Date.now()}.xlsx`
      : `Share_To_Courier_Report_${Date.now()}.xlsx`;

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 3. GET /order/execution/share_to_courier?format=NDJSON&courierId={courierId} (Individual View)
  getIndividualNdjsonView: async (
    courierId: number,
    filters: ShareToCourierFilterParams
  ): Promise<ShareToCourierNdjsonItem[]> => {
    const params: Record<string, any> = {
      format: 'NDJSON',
      courierId,
    };

    if (filters.shipMode && filters.shipMode !== 'ALL') {
      params.shipMode = filters.shipMode;
    }
    if (filters.fromDate) {
      params.fromDate = filters.fromDate;
    }
    if (filters.toDate) {
      params.toDate = filters.toDate;
    }
    if (filters.isReship !== undefined && filters.isReship !== null) {
      params.isReship = filters.isReship;
    }

    const response = await axiosInstance.get('/order/execution/share_to_courier', {
      params,
      responseType: 'text',
      headers: {
        Accept: '*/*',
      },
    });

    const items: ShareToCourierNdjsonItem[] = [];

    if (typeof response.data === 'string') {
      const lines = response.data.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            items.push(parsed);
          }
        } catch (e) {
          console.warn('NDJSON parsing warning line:', line, e);
        }
      }
    } else if (Array.isArray(response.data)) {
      items.push(...response.data);
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      items.push(...response.data.data);
    }

    return items;
  },
};
