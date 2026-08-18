import axiosInstance from '@/lib/axios';

export interface CourierAssignmentBatchItem {
  clientName: string;
  orderDate: string;
  orderBatchNo: string;
  orderBatchId: number;
  totalOrderCount: number;
  pendingCourierAssigned: number;
}

export interface CourierAssignSubmitPayload {
  batchIds: number[];
}

export interface CourierUploadBatchMeta {
  id: number;
  batchNo: string;
  totalRecords: number;
  passedCount: number;
  failedCount: number;
  status: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierUploadDetailItem {
  id: number;
  uploadBatchId: number;
  packRefNo: string;
  courierCode: string;
  shipmodeName: string;
  awbNo?: string;
  status: string;
  errorMessage?: string | null;
  executionId: number;
  courierServiceId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierUploadResponseData {
  batch: CourierUploadBatchMeta;
  details: CourierUploadDetailItem[];
}

export const courierAssignmentService = {
  // 1. GET /order/execution/courier-assignment/batch
  getCourierAssignmentBatches: async (): Promise<CourierAssignmentBatchItem[]> => {
    const url = '/order/execution/courier-assignment/batch';
    const response = await axiosInstance.get(url, {
      headers: { Accept: 'application/json' },
    });

    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  },

  // 2. POST /order/execution/courier-assignment/batch
  submitCourierAssignmentBatch: async (payload: CourierAssignSubmitPayload): Promise<any> => {
    const url = '/order/execution/courier-assignment/batch';
    const response = await axiosInstance.post(url, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  },

  // 3. GET /order/dashboard/details/excel?metricType=pendingCourierAssign
  downloadPendingCourierAssignExcel: async (): Promise<void> => {
    const url = '/order/dashboard/details/excel?metricType=pendingCourierAssign';

    const response = await axiosInstance.get(url, {
      responseType: 'blob',
      headers: {
        accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `Pending_Courier_Assignment_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 4. GET /order/execution/courier-assignment/template (Download Excel Template)
  downloadCourierAssignTemplate: async (): Promise<void> => {
    const url = '/order/execution/courier-assignment/template';

    const response = await axiosInstance.get(url, {
      responseType: 'blob',
      headers: {
        accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `courier_assign_template.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 5. POST /order/execution/courier-assignment/upload (Upload Excel File)
  uploadCourierAssignExcel: async (file: File): Promise<any> => {
    const url = '/order/execution/courier-assignment/upload';
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(url, formData, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // 6. GET /order/execution/courier-assignment/upload-batch/{batchId} (Fetch batch validation status & details)
  getUploadBatchDetails: async (batchId: number): Promise<any> => {
    const url = `/order/execution/courier-assignment/upload-batch/${batchId}`;
    const response = await axiosInstance.get(url, {
      headers: { Accept: 'application/json' },
    });

    return response.data;
  },

  // 7. POST /order/execution/courier-assignment/upload-batch/{batchId}/submit (Complete Final Courier Assignment)
  submitUploadBatchFinal: async (batchId: number): Promise<any> => {
    const url = `/order/execution/courier-assignment/upload-batch/${batchId}/submit`;
    const response = await axiosInstance.post(url, '', {
      headers: { Accept: 'application/json' },
    });

    return response.data;
  },
};
