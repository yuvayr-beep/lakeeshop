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

  // 3. Get Batch List (NDJSON / JSON array)
  getBatchList: async (params?: { startDate?: string; endDate?: string; clientId?: number | string }): Promise<BatchOrderItem[]> => {
    const today = new Date();
    const endDateStr = today.toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30); // Default to last 1 month
    const startDateStr = pastDate.toISOString().split('T')[0];

    const queryParams: Record<string, any> = {
      startDate: params?.startDate || startDateStr,
      endDate: params?.endDate || endDateStr,
    };

    if (params?.clientId && String(params.clientId) !== 'ALL') {
      queryParams.clientId = params.clientId;
    }

    const response = await axiosInstance.get('/order/batch/list', {
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
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && parsed.data && Array.isArray(parsed.data)) {
            return parsed.data;
          }
        } catch {
          // Fall through
        }
      }

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // Fall through
        }
      }

      const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);
      const records: BatchOrderItem[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            // If parsed line is wrapper JSON with data array
            if (parsed.data && Array.isArray(parsed.data)) {
              return parsed.data;
            }
            records.push(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse NDJSON line in batch list:', line);
        }
      }
      return records;
    }

    return [];
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

  // 6. Revalidate Batch (Triggers async re-validation engine)
  revalidateBatch: async (batchId: number) => {
    console.log('=== [API CALL] REVALIDATE BATCH ===');
    console.log(`POST /order/staging/validate/${batchId}`);
    console.log('===================================');
    const response = await axiosInstance.post(`/order/staging/validate/${batchId}`, {});
    console.log('=== [API RESPONSE] REVALIDATE BATCH ===', response.data);
    return response.data;
  },

  // 7. Get Batch Validation Summary
  getValidationSummary: async (batchId: number): Promise<BatchSummaryData> => {
    const response = await axiosInstance.get(`/order/staging/summary/${batchId}`);
    return response.data;
  },

  // 8. Revalidate Single Staging Row (Synchronous)
  revalidateStagingRow: async (stagingId: number) => {
    console.log('=== [API CALL] REVALIDATE STAGING ROW ===');
    console.log(`POST /order/staging/revalidate/${stagingId}`);
    console.log('=========================================');
    const response = await axiosInstance.post(`/order/staging/revalidate/${stagingId}`, {});
    console.log('=== [API RESPONSE] REVALIDATE STAGING ROW ===', response.data);
    return response.data;
  },

  // 9. Update Incorrect Staging Row Data
  updateStagingRow: async (stagingId: number, data: Partial<StagingErrorOrder>) => {
    console.log('=== [API CALL] UPDATE STAGING ROW ===');
    console.log(`PUT /order/staging/${stagingId}`);
    console.log('Payload Data:', JSON.stringify(data, null, 2));
    console.log('======================================');
    const response = await axiosInstance.put(`/order/staging/${stagingId}`, data);
    console.log('=== [API RESPONSE] UPDATE STAGING ROW ===', response.data);
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

  // 12. Download Batch Orders File by Count Type (ALL, PASS, WARN, FAIL)
  downloadBatchOrders: async (batchId: number, type: 'ALL' | 'PASS' | 'WARN' | 'FAIL', batchNo?: string) => {
    const response = await axiosInstance.post(
      '/order/batch/download',
      {
        batchIds: [batchId],
        type,
      },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
        },
      }
    );

    let fileName = `${batchNo || `batch_${batchId}`}_${type.toLowerCase()}.xlsx`;
    const contentDisposition = response.headers?.['content-disposition'] ? String(response.headers['content-disposition']) : '';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        fileName = filenameMatch[1];
      }
    }

    const contentType = response.headers?.['content-type'] ? String(response.headers['content-type']) : 'application/octet-stream';
    const blob = new Blob([response.data], {
      type: contentType,
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
