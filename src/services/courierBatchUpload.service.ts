import axiosInstance from '@/lib/axios';
import {
  CourierBatch,
  CourierBatchFilterParams,
  CourierBatchApiResponse,
  CourierBatchResponseData,
} from '@/types/courierBatchUpload';

export const courierBatchUploadService = {
  // 1. Download Excel Template
  // GET /order/execution/awb-assignment/offline-upload/template
  downloadTemplate: async (): Promise<void> => {
    const response = await axiosInstance.get(
      '/order/execution/awb-assignment/offline-upload/template',
      {
        responseType: 'blob',
        headers: {
          Accept: '*/*',
        },
      }
    );

    const filename = `offline_awb_upload_template_${Date.now()}.xlsx`;
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

  // 2. Upload & Validate Excel File
  // POST /order/execution/awb-assignment/offline-upload
  uploadBatchFile: async (file: File): Promise<CourierBatchResponseData> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<CourierBatchApiResponse>(
      '/order/execution/awb-assignment/offline-upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      }
    );

    if (response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to upload AWB batch file');
  },

  // 3. List Historical & Ongoing Batches
  // GET /order/execution/awb-assignment/offline-upload/batches
  getBatchesList: async (filters: CourierBatchFilterParams): Promise<CourierBatch[]> => {
    const params: Record<string, any> = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.status && filters.status !== 'ALL') params.status = filters.status;
    if (filters.batchNo) params.batchNo = filters.batchNo;

    const response = await axiosInstance.get(
      '/order/execution/awb-assignment/offline-upload/batches',
      { params }
    );

    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  },

  // 4. Get Batch Details & Row Validation Results
  // GET /order/execution/awb-assignment/offline-upload/batch/{batchId}
  getBatchDetails: async (batchId: number): Promise<CourierBatchResponseData> => {
    const response = await axiosInstance.get(
      `/order/execution/awb-assignment/offline-upload/batch/${batchId}`
    );

    if (response.data?.data) {
      return response.data.data;
    } else if (response.data?.batch && response.data?.details) {
      return response.data as any;
    }
    throw new Error('Failed to load AWB batch details');
  },

  // 5. Download Batch Spreadsheet Report (ALL / PASSED / FAILED)
  // GET /order/execution/awb-assignment/offline-upload/batch/{batchId}/download?filter=ALL|PASSED|FAILED
  downloadBatchReport: async (
    batchId: number,
    filter: 'ALL' | 'PASSED' | 'FAILED' = 'ALL'
  ): Promise<void> => {
    const params = { filter };

    const response = await axiosInstance.get(
      `/order/execution/awb-assignment/offline-upload/batch/${batchId}/download`,
      {
        params,
        responseType: 'blob',
        headers: {
          Accept: '*/*',
        },
      }
    );

    const filename = `awb_upload_batch_${batchId}_${filter.toLowerCase()}_${Date.now()}.xlsx`;
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

  // 6. Submit / Commit Batch to AWB_ASSIGNED
  // POST /order/execution/awb-assignment/offline-upload/batch/{batchId}/submit
  submitBatch: async (batchId: number): Promise<CourierBatchResponseData> => {
    const response = await axiosInstance.post(
      `/order/execution/awb-assignment/offline-upload/batch/${batchId}/submit`
    );

    if (response.data?.data) {
      return response.data.data;
    }
    return response.data as any;
  },
};
