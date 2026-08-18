export interface BatchOrderItem {
  id?: number;
  batchId: number;
  batchNo?: string;
  clientId?: number;
  clientCode?: string;
  clientName?: string;
  businessUnitId?: number;
  businessUnitName?: string;
  orderFileName?: string;
  uploadedAt?: string;
  totalOrderCount?: number;
  passCount?: number;
  warningCount?: number;
  failCount?: number;
  sourceId?: number;
  originalFileUrl?: string;
  batchType?: number;

  totalRecords?: number;
  passedCount?: number;
  failedCount?: number;
  warnCount?: number;

  // Fallback / legacy field definitions
  orderDate?: string;
  totalRows?: number;
  savedRows?: number;
  failedRows?: number;
  passRows?: number;
  warningRows?: number;
  status?: string;
  batchStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BatchUploadResponse {
  batchId: number;
  batchNo?: string;
  totalRows: number;
  savedRows: number;
  failedRows: number;
  failures: any[];
}

export interface BatchErrorSummaryItem {
  errorId: number;
  errorCode: string;
  errorMessage: string;
  blocking: boolean;
  count: number;
}

export interface BatchSummaryData {
  batchId: number;
  batchNo?: string;
  totalRows: number;
  passRows: number;
  warningRows: number;
  failRows: number;
  processedRows: number;
  status: string; // e.g. "PROCESSING", "VALIDATED", "SUBMITTED", "FAILED", "MOVED"
  batchStatus: number; // 1: PROCESSING, 2: VALIDATED, 3: SUBMITTED, 4: FAILED, 5: MOVED
  errorSummary?: BatchErrorSummaryItem[];
}

export interface StagingErrorOrder {
  stagingId: number;
  clientOrderNo?: string | null;
  clientOrderLineNo?: string | null;
  clientProductCode?: string | null;
  clientProductName?: string | null;
  productName?: string | null;
  quantity?: number | null;
  orderQuantity?: number | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerName?: string | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  addressLine4?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  clientUnitPrice?: number | null;
  totalPrice?: number | null;
  price?: number | null;
  orderDate?: string | null;
  id?: number;
  productCode?: string | null;
  remarks?: string | null;
  blocking?: boolean;
  errorId?: number;
  errorCode?: string;
  errorMessage?: string;
  isSplit?: boolean;
  splitQty?: number;
}

export interface MasterValidationError {
  id: number;
  errorCode: string;
  description: string;
  severity: number;
  status?: boolean;
}

export interface MasterClientOption {
  id: number;
  name: string;
  code?: string;
  clientId?: number;
  businessUnitId?: number;
}
