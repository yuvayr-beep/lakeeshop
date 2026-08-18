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

  // Combine Online Orders by Client
  combineOnlineOrders: async (clientId: number) => {
    const url = `/order/batch/combine-online?clientId=${clientId}`;
    const response = await axiosInstance.post(url, {});
    return response.data;
  },

  // 3. Get Batch List (NDJSON / JSON array)
  getBatchList: async (params?: {
    startDate?: string;
    endDate?: string;
    clientId?: number | string;
    batchStatus?: number | string;
    batchType?: number | string;
    sourceId?: number | string;
  }): Promise<BatchOrderItem[]> => {
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

    if (params?.batchStatus !== undefined && String(params.batchStatus) !== 'ALL' && String(params.batchStatus) !== 'DEFAULT') {
      queryParams.batchStatus = params.batchStatus;
    }

    if (params?.batchType) {
      queryParams.batchType = params.batchType;
    }

    if (params?.sourceId) {
      queryParams.sourceId = params.sourceId;
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

  // 7b. Fetch Split Orders for Batch (NDJSON / JSON)
  getSplitOrders: async (batchId: number): Promise<StagingErrorOrder[]> => {
    const response = await axiosInstance.get(`/order/staging/split-orders`, {
      params: { batchId },
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
      const records: StagingErrorOrder[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            records.push(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse NDJSON line in split-orders:', line);
        }
      }
      return records;
    }

    return [];
  },

  // 6. Revalidate Batch (Triggers async re-validation engine)
  revalidateBatch: async (batchId: number) => {
    const response = await axiosInstance.post(`/order/staging/validate/${batchId}`, {});
    return response.data;
  },

  // 7. Get Batch Validation Summary
  getValidationSummary: async (batchId: number): Promise<BatchSummaryData> => {
    const response = await axiosInstance.get(`/order/staging/summary/${batchId}`);
    return response.data;
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

  // 12. Download Batch Orders File by Count Type (ALL, PASS, WARN, FAIL)
  downloadBatchOrders: async (batchId: number, type: 'ALL' | 'PASS' | 'WARN' | 'FAIL', batchNo?: string) => {
    return batchOrderService.downloadMultipleBatches([batchId], type, `${batchNo || `batch_${batchId}`}_${type.toLowerCase()}.xlsx`);
  },

  // 13. Download Multiple Selected Batches (Unified Excel)
  downloadMultipleBatches: async (batchIds: (number | string)[], type: string = 'ALL', defaultFileName?: string) => {
    try {
      const payload = {
        batchIds,
        type,
      };

      const response = await axiosInstance.post(
        '/order/batch/download',
        payload,
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
          },
        }
      );

      if (response.data instanceof Blob && response.data.type?.includes('json')) {
        const text = await response.data.text();
        try {
          const errObj = JSON.parse(text);
          if (errObj.message || errObj.error) {
            throw new Error(errObj.message || errObj.error);
          }
        } catch (pErr: any) {
          if (pErr.message && !pErr.message.includes('JSON')) throw pErr;
        }
      }

      let fileName = defaultFileName || `orders_download_${Date.now()}.xlsx`;
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
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const errObj = JSON.parse(text);
          throw new Error(errObj.message || errObj.error || 'Failed to download batch report Excel file.');
        } catch {
          // Fall through
        }
      }
      throw err;
    }
  },

  // 14. Initiate Async Export Job (Old ERP Layout / Large Datasets)
  initiateExportJob: async (batchIds: number[], type: string = 'ALL') => {
    const response = await axiosInstance.post(
      '/order/batch/export/order-details',
      {
        batchIds,
        type,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data; // { jobId: string, status: string, message?: string }
  },

  // 15. Poll Async Export Job Status
  getExportJobStatus: async (jobId: string) => {
    const response = await axiosInstance.get(`/order/batch/export/job/${jobId}`);
    return response.data; // { jobId, status, totalRecords, processedRecords, progressPercentage, fileName }
  },

  // 16. Download Finalized Async Export File
  downloadExportFile: async (fileName: string) => {
    const response = await axiosInstance.get(`/order/batch/download/file/${fileName}`, {
      responseType: 'blob',
    });

    const contentType = response.headers?.['content-type'] ? String(response.headers['content-type']) : 'application/octet-stream';
    const blob = new Blob([response.data], { type: contentType });
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
