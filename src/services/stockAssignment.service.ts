import axiosInstance from '@/lib/axios';

export interface EligibleBusinessUnitItem {
  businessUnitId: number;
  clientName: string;
  businessUnitName: string;
  orderBatchNumber: string;
  orderDate?: string | null;
  batchDate?: string | null;
  createdAt?: string | null;
  totalOrdersInBatch: number;
  eligibleForStockAssignmentCount: number;
}

export interface StockAssignmentQueryParams {
  fromDate?: string;
  toDate?: string;
  clientId?: number | string;
  businessUnitId?: number | string;
}

export interface FailedStockAssignItem {
  executionId: number;
  status: string;
  errorReason: string;
  updatedAt?: string;
}

export interface StockAssignBatchDetailData {
  stockAssignBatchNo: string;
  id?: string;
  startTime?: string;
  endTime?: string | null;
  totalEligible?: number;
  pendingCount?: number;
  processingCount?: number;
  successCount?: number;
  failureCount?: number;
  status: string; // e.g. "RUNNING" | "COMPLETED" | "FAILED"
  failedItems?: FailedStockAssignItem[];
}

export interface StockAssignBatchResponse {
  success: boolean;
  message: string;
  data: StockAssignBatchDetailData;
  timestamp?: string;
}

export const stockAssignmentService = {
  // 1. Fetch Eligible Business Units for Stock Assignment
  getEligibleBusinessUnits: async (
    params?: StockAssignmentQueryParams
  ): Promise<EligibleBusinessUnitItem[]> => {
    const queryParams: Record<string, any> = {};

    if (params?.fromDate) queryParams.fromDate = params.fromDate;
    if (params?.toDate) queryParams.toDate = params.toDate;
    if (params?.clientId && String(params.clientId) !== 'ALL') {
      queryParams.clientId = params.clientId;
    }
    if (params?.businessUnitId && String(params.businessUnitId) !== 'ALL') {
      queryParams.businessUnitId = params.businessUnitId;
    }

    const response = await axiosInstance.get('/order/stock-assignment/eligible-business-units', {
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

      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && parsed.data && Array.isArray(parsed.data)) {
            return parsed.data;
          }
          if (parsed && typeof parsed === 'object') {
            return [parsed as EligibleBusinessUnitItem];
          }
        } catch {
          // Fall through
        }
      }

      const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
      const records: EligibleBusinessUnitItem[] = [];

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
          console.warn('Failed to parse NDJSON line in stock assignment:', line);
        }
      }
      return records;
    }

    return [];
  },

  // 2. Trigger Stock Assignment for Selected Order Batch Numbers
  assignStockBatch: async (orderBatchNumbers: string[]): Promise<StockAssignBatchResponse> => {
    const payload = { orderBatchNumbers };
    const response = await axiosInstance.post('/order/stock-assignment/batch', payload, {
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    });

    return response.data;
  },

  // 3. Poll / GET Stock Assignment Batch Status Details
  getStockAssignBatchStatus: async (stockAssignBatchNo: string): Promise<StockAssignBatchResponse> => {
    const url = `/order/stock-assignment/batch/${stockAssignBatchNo}`;
    const response = await axiosInstance.get(url, {
      headers: {
        accept: 'application/json',
      },
    });

    return response.data;
  },

  // 4. POST /order/dashboard/details/excel?metricType=totalPendingStockAssign
  downloadPendingStockAssignExcel: async (): Promise<void> => {
    const url = '/order/dashboard/details/excel?metricType=totalPendingStockAssign';

    const response = await axiosInstance.post(
      url,
      '',
      {
        responseType: 'blob',
        headers: {
          accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }
    );

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute(
      'download',
      `Pending_Stock_Assignment_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
