export interface PreAwbSummaryItem {
  courierId: number;
  courierCode: string;
  courierName: string;
  hasPreAllottedAwb: boolean;
  totalCount: number;
  availableCount: number;
  allottedCount: number;
  startAwbNumber?: string | null;
  endAwbNumber?: string | null;
}

export interface PreAwbReportItem {
  id: number;
  courierId: number;
  courierCode: string;
  courierName: string;
  awbNumber: string;
  awbStatus: 'AVAILABLE' | 'ALLOTTED' | string;
  remarks?: string | null;
  assignedAt?: string | null;
  createdAt?: string | null;
}

export interface PreAwbReportFilterParams {
  courierId: number;
  awbNumber?: string;
  awbStatus?: string;
}

export interface PreAwbManualAllotPayload {
  courierId: number;
  awbNumber: string;
  remarks?: string;
}
