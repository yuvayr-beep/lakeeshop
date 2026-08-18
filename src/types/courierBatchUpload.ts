export interface CourierBatch {
  id: number;
  batchNo: string;
  totalRecords: number;
  passedCount: number;
  failedCount: number;
  status: 'VALIDATED' | 'SUBMITTED' | string;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CourierBatchDetail {
  id: number;
  uploadBatchId: number;
  packRefNo: string;
  awbNo: string;
  status: 'PASSED' | 'FAILED' | string;
  errorMessage?: string | null;
  executionId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CourierBatchResponseData {
  batch: CourierBatch;
  details: CourierBatchDetail[];
}

export interface CourierBatchApiResponse {
  status: string;
  code: string;
  message: string;
  data: CourierBatchResponseData;
  errors?: any;
}

export interface CourierBatchFilterParams {
  fromDate?: string;
  toDate?: string;
  status?: string;
  batchNo?: string;
}
