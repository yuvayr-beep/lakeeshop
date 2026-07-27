import axiosInstance from '@/lib/axios';
import {
  BatchOrderItem,
  BatchUploadResponse,
  BatchSummaryData,
  StagingErrorOrder,
  MasterValidationError,
} from '@/types/batchOrder';

export const batchOrderService = {
  // 1. Upload Batch Order File
  uploadBatch: async (clientId: number, businessUnitId: number = 6, batchType: number = 1, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      `/order/batch/upload?clientId=${clientId}&businessUnitId=${businessUnitId}&batchType=${batchType}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data; // { success, message, data: { batchId, totalRows, savedRows, failedRows, failures } }
  },

  // 2. Delete / Abort Batch
  deleteBatch: async (batchId: number) => {
    const response = await axiosInstance.delete(`/order/batch/${batchId}`);
    return response.data;
  },

  // 3. Get Batch List
  getBatchList: async (params?: { page?: number; size?: number; search?: string }) => {
    const response = await axiosInstance.get('/order/batch/list', { params });
    return response.data;
  },

  // 4. Combine Online API Orders into Batch
  combineOnlineOrders: async (clientId: number) => {
    const response = await axiosInstance.post(`/order/batch/combine-online?clientId=${clientId}`);
    return response.data;
  },

  // 5. Trigger Asynchronous Validation for Batch
  validateBatch: async (batchId: number) => {
    const response = await axiosInstance.post(`/order/staging/validate/${batchId}`, {});
    return response.data;
  },

  // 6. Get Staging Summary for Batch (Short polling endpoint)
  getBatchSummary: async (batchId: number): Promise<BatchSummaryData> => {
    const response = await axiosInstance.get(`/order/staging/summary/${batchId}`);
    return response.data?.data || response.data;
  },

  // 7. Stream / Fetch Staging Rows matching an Error ID (NDJSON / JSON)
  getErrorOrders: async (batchId: number, errorId: number): Promise<StagingErrorOrder[]> => {
    const response = await axiosInstance.get(`/order/staging/error-orders`, {
      params: { batchId, errorId },
      headers: {
        accept: 'application/x-ndjson, application/json, */*',
      },
      transformResponse: [(data) => data], // Keep raw string to parse NDJSON or JSON
    });

    const rawData = response.data;
    if (!rawData) return [];

    if (typeof rawData === 'object' && Array.isArray(rawData)) {
      return rawData;
    }

    if (typeof rawData === 'string') {
      const trimmed = rawData.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // Fall through to NDJSON line parsing
        }
      }

      const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);
      const records: StagingErrorOrder[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            records.push(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse NDJSON line:', line);
        }
      }
      return records;
    }

    return [];
  },

  // 8. Revalidate Single Staging Row (Synchronous)
  revalidateStagingRow: async (stagingId: number) => {
    const response = await axiosInstance.post(`/order/staging/revalidate/${stagingId}`, {});
    return response.data;
  },

  // 9. Update Incorrect Staging Row Data
  updateStagingRow: async (stagingId: number, data: Partial<StagingErrorOrder>) => {
    const response = await axiosInstance.put(`/order/staging/${stagingId}`, data);
    return response.data;
  },

  // 10. Submit Validated Batch
  submitBatch: async (batchId: number) => {
    const response = await axiosInstance.post('/order/submission/submit-batch', { batchId });
    return response.data;
  },

  // 11. Fetch Master Validation Errors (NDJSON / JSON)
  getMasterValidationErrors: async (): Promise<MasterValidationError[]> => {
    const response = await axiosInstance.get('/order/master/validation-error', {
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

    if (typeof rawData === 'string') {
      const trimmed = rawData.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // Fall through
        }
      }

      const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);
      const list: MasterValidationError[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            list.push(parsed);
          }
        } catch (e) {
          // ignore bad lines
        }
      }
      return list;
    }

    return [];
  },
};
