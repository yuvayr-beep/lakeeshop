export type AwbBatchJobStatus = 'IN_PROGRESS' | 'PAUSED' | 'ABORTED' | 'COMPLETED' | string;

export interface AwbBatchJobItem {
  jobId: string;
  courierServiceId: number;
  courierServiceName: string;
  shipMode: string;
  status: AwbBatchJobStatus;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  progressPercentage: number;
  startedAt: string;
  completedAt: string | null;
}

export interface AwbBatchJobsFilterParams {
  fromDate?: string;
  toDate?: string;
  courierServiceId?: number | string;
}

export interface AwbBatchJobsListApiResponse {
  status?: string;
  message?: string;
  data: AwbBatchJobItem[];
}

export interface AwbBatchJobDetailApiResponse {
  status?: string;
  message?: string;
  data: AwbBatchJobItem;
}

export interface CourierPartnerSimple {
  id: number;
  courierCode: string;
  courierName: string;
}

export interface CourierServiceSimple {
  id: number;
  courierId: number;
  serviceCode: string;
  serviceName: string;
  serviceType?: string;
}
