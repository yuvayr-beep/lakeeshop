export interface EligibleCourier {
  courierServiceId: number;
  courierCode: string;
  courierServiceName: string;
  pendingAwbCount: number;
  hasPreAllottedAwb: boolean;
  availablePreAllottedCount: number;
  logoUrl?: string;
}

export interface AwbBatchJobSubmitPayload {
  courierServiceId: number;
  shipMode: string;
}

export interface AwbBatchJobResponseData {
  jobId: string;
  courierServiceId: number;
  courierServiceName: string;
  shipMode: string;
  status: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  progressPercentage: number;
  startedAt: string;
  completedAt: string | null;
}

export interface EligibleCouriersApiResponse {
  status?: string;
  code?: string;
  message?: string;
  success?: boolean;
  data: EligibleCourier[];
  timestamp?: string;
}

export interface AwbBatchJobApiResponse {
  status?: string;
  message?: string;
  data: AwbBatchJobResponseData;
}
