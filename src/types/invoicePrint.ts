export interface InvoiceListItem {
  executionId: number;
  invoiceId: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  clientOrderNo: string;
  orderDate: string;
  orderRefNo?: string;
  packRefNo?: string;
  productId: number;
  productCode: string;
  productName: string;
  alternateProductName?: string;
  quantity: number;
  preorderDate?: string;
  awbDate?: string;
  weight?: number;
  totalWeight?: number;
  length?: number;
  breadth?: number;
  height?: number;
  rate?: number;
  totalRate?: number | null;
  courierId?: number;
  courierCode?: string;
  courierName?: string;
  shipMode?: string;
  awbNumber?: string;
  routingCode?: string;
  consigneeName?: string;
  consigneeAddressLine1?: string;
  consigneeAddressLine2?: string;
  consigneeAddressLine3?: string;
  consigneeAddressLine4?: string;
  consigneeCity?: string;
  consigneeState?: string;
  consigneePincode?: string;
  consigneeMobile?: string;
  consigneePhone?: string;
  consigneeEmail?: string;
  otherDetails?: string;
  invoiceStatus?: string;
  isInvoiceListPrinted?: boolean;
}

export interface InvoiceListFilterParams {
  searchQuery?: string;
  clientId?: string;
  courierCode?: string;
  shipMode?: string;
  printedStatus?: string;
}

export interface PendingInvoiceGroupItem {
  groupId: number;
  groupName: string;
  pendingCount: number;
}

export interface InvoiceBatchItem {
  batchId: number;
  batchNo: string;
  recordCount: number;
  groupId: number;
  groupName: string;
  clientId: number;
  clientName: string;
  createdAt: string;
  hasPackingSlip?: boolean;
}

export interface InvoiceBatchFilterParams {
  startDate?: string;
  endDate?: string;
  groupId?: number | string;
  clientId?: number | string;
}

export interface ReprintBatchPayload {
  batchNos: string[];
}

export interface ValidateIdentifiersPayload {
  identifiers: string[];
}

export interface ValidReprintItem {
  identifier: string;
  matchedBy: string;
  invoiceId?: number;
  invoiceNumber?: string;
  packRefNo?: string;
  executionRefNo?: string;
  orderRefNo?: string;
  clientOrderNo?: string;
  awbNumber?: string;
  batchNo?: string;
  clientId?: number;
  clientName?: string;
  [key: string]: any;
}

export interface InvalidReprintItem {
  identifier: string;
  reason: string;
}

export interface ValidateIdentifiersResponseData {
  totalSubmitted: number;
  validCount: number;
  invalidCount: number;
  validItems: ValidReprintItem[];
  invalidItems: InvalidReprintItem[];
}

export interface ReprintRequestPayload {
  packRefNos?: string[];
  awbNumbers?: string[];
  executionRefNos?: string[];
  orderRefNos?: string[];
  invoiceNumbers?: string[];
  batchNos?: string[];
}

export type InvoicePrintLayoutFormat = '1x1' | '1x4' | 'multi';
export type InvoiceDocType = 'challan' | 'invoice';
