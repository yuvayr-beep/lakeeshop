import axiosInstance from '@/lib/axios';
import {
  AwbBatchJobItem,
  AwbBatchJobsFilterParams,
  AwbBatchJobsListApiResponse,
  AwbBatchJobDetailApiResponse,
  CourierPartnerSimple,
  CourierServiceSimple,
} from '@/types/awbBatchJobs';

export const awbBatchJobsService = {
  // 1. List AWB Batch Jobs
  // GET /order/execution/awb-assignment/job/list?fromDate=...&toDate=...&courierServiceId=...
  getAwbBatchJobs: async (
    filters: AwbBatchJobsFilterParams
  ): Promise<AwbBatchJobItem[]> => {
    const params: Record<string, any> = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.courierServiceId) params.courierServiceId = filters.courierServiceId;

    const response = await axiosInstance.get<AwbBatchJobsListApiResponse | AwbBatchJobItem[]>(
      '/order/execution/awb-assignment/job/list',
      { params }
    );

    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray((response.data as AwbBatchJobsListApiResponse).data)) {
      return (response.data as AwbBatchJobsListApiResponse).data;
    }
    return [];
  },

  // 2. Poll Status of Ongoing Job
  // GET /order/execution/awb-assignment/job/{jobId}/status
  getJobStatus: async (jobId: string): Promise<AwbBatchJobItem> => {
    const url = `/order/execution/awb-assignment/job/${encodeURIComponent(jobId)}/status`;
    const response = await axiosInstance.get<AwbBatchJobDetailApiResponse | AwbBatchJobItem>(url);

    if (response.data && (response.data as AwbBatchJobDetailApiResponse).data) {
      return (response.data as AwbBatchJobDetailApiResponse).data;
    }
    return response.data as AwbBatchJobItem;
  },

  // 3. Pause Ongoing API Request Job
  // POST /order/execution/awb-assignment/job/{jobId}/pause
  pauseJob: async (jobId: string): Promise<AwbBatchJobItem> => {
    const url = `/order/execution/awb-assignment/job/${encodeURIComponent(jobId)}/pause`;
    const response = await axiosInstance.post<AwbBatchJobDetailApiResponse | AwbBatchJobItem>(url);

    if (response.data && (response.data as AwbBatchJobDetailApiResponse).data) {
      return (response.data as AwbBatchJobDetailApiResponse).data;
    }
    return response.data as AwbBatchJobItem;
  },

  // 4. Start / Resume Paused API Request Job
  // POST /order/execution/awb-assignment/job/{jobId}/start
  startJob: async (jobId: string): Promise<AwbBatchJobItem> => {
    const url = `/order/execution/awb-assignment/job/${encodeURIComponent(jobId)}/start`;
    const response = await axiosInstance.post<AwbBatchJobDetailApiResponse | AwbBatchJobItem>(url);

    if (response.data && (response.data as AwbBatchJobDetailApiResponse).data) {
      return (response.data as AwbBatchJobDetailApiResponse).data;
    }
    return response.data as AwbBatchJobItem;
  },

  // 5. Abort / Cancel Ongoing or Paused Job
  // POST /order/execution/awb-assignment/job/{jobId}/abort
  abortJob: async (jobId: string): Promise<AwbBatchJobItem> => {
    const url = `/order/execution/awb-assignment/job/${encodeURIComponent(jobId)}/abort`;
    const response = await axiosInstance.post<AwbBatchJobDetailApiResponse | AwbBatchJobItem>(url);

    if (response.data && (response.data as AwbBatchJobDetailApiResponse).data) {
      return (response.data as AwbBatchJobDetailApiResponse).data;
    }
    return response.data as AwbBatchJobItem;
  },

  // 6. Download Failed AWB Requests Excel
  // GET /order/execution/awb-assignment/job/{jobId}/failed/download?format=excel
  downloadFailedReport: async (jobId: string, format: string = 'excel'): Promise<void> => {
    const url = `/order/execution/awb-assignment/job/${encodeURIComponent(jobId)}/failed/download`;
    const response = await axiosInstance.get(url, {
      params: { format },
      responseType: 'blob',
      headers: { Accept: '*/*' },
    });

    const filename = `${jobId}_failed_requests.xlsx`;
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

  // Helper: Fetch Courier Partners for First Filter Dropdown
  // GET /courier
  getCourierPartners: async (): Promise<CourierPartnerSimple[]> => {
    try {
      const response = await axiosInstance.get('/courier', {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson, application/json' },
      });
      const raw = response.data;
      if (typeof raw === 'string') {
        const parsed: CourierPartnerSimple[] = [];
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

  // Helper: Fetch Courier Services for Second Filter Dropdown
  // GET /courier/services/courier/{courierId}
  getCourierServicesByPartnerId: async (courierId: number): Promise<CourierServiceSimple[]> => {
    try {
      const response = await axiosInstance.get(`/courier/services/courier/${courierId}`, {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson, application/json' },
      });
      const raw = response.data;
      if (typeof raw === 'string') {
        const parsed: CourierServiceSimple[] = [];
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
};
