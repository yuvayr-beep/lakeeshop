// ==========================================
// 1. INWARD INSPECTION & SCAN ENUMS & TYPES
// ==========================================

export type BarcodeIdentifierType = 'AWB' | 'COURIER_AWB' | 'PACK_REF_NO' | 'EXECUTION_ID';

export type ReturnedStockCondition = 'AVAILABLE' | 'DAMAGED' | 'DEFECTIVE';

export const ExecutionStatus = {
  OUTSCAN_DONE: 7,
  PICKUP_CONFIRMED: 8,
  IN_TRANSIT: 9,
  OUT_FOR_DELIVERY: 10,
  DELIVERED: 11,
  EXPECTING_RETURN: 12,
  RETURNED: 13, // Standard RTO Inward status code
  LOST: 14,
  CANCELLED: 15,
  REVERSE_PICKUP_RECEIVED: 20
} as const;

// ==========================================
// 2. COURIER DAMAGE CLAIM ENUMS & TYPES
// ==========================================

export type CourierClaimStatus =
  | 'PENDING_CLAIM'     // Auto-created upon damaged RTO scan; awaiting accounts action
  | 'CLAIM_FILED'       // Dispute ticket officially registered with courier partner
  | 'APPROVED_CREDITED' // Courier accepted dispute; credit note / deduction approved
  | 'REJECTED'          // Courier rejected transit claim
  | 'CLOSED';           // Case resolved and archived

export type ClaimSettlementOutcome = 'APPROVED_CREDITED' | 'REJECTED';

export type ClaimSource = 'COURIER_RETURN_RTO' | 'CUSTOMER_REVERSE_PICKUP';

// ==========================================
// 3. DATA INTERFACES
// ==========================================

export interface CourierReturnScanItem {
  identifier: string;            // AWB or Pack Ref No
  statusDate: string;            // ISO Date: "2026-10-08T17:30:00"
  stockStatus: ReturnedStockCondition;
  remarks?: string;
  evidenceFileUrl?: string;      // URL of unboxing video or damage photo proof
}

export interface ExecutionTransitionRequest {
  type: BarcodeIdentifierType;   // Defaults to "AWB"
  statusId: number;              // Always 13 for RTO
  items: CourierReturnScanItem[];
}

export interface CourierDamageClaim {
  id: number;
  executionId?: number;
  awbNumber: string;
  courierId?: number;
  courierCode?: string;
  packRefNo?: string;
  orderRefNo?: string;
  source: ClaimSource;
  damagedDate: string;
  damageReason: string;
  evidenceFileUrl?: string;
  claimAmount: number;
  claimReferenceNo?: string;     // Courier dispute ticket ID
  claimStatus: CourierClaimStatus;
  creditNoteNo?: string;
  settledAmount?: number;
  settledDate?: string;
  accountsRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourierDamageClaimRequest {
  awbNumber: string;
  claimReferenceNo?: string;
  claimAmount?: number;
  claimStatus?: CourierClaimStatus;
  evidenceFileUrl?: string;
  damageReason?: string;
  accountsRemarks?: string;
}

export interface CourierClaimSettleRequest {
  outcome: ClaimSettlementOutcome;
  creditNoteNo?: string;
  settledAmount?: number;
  settledDate?: string;
  accountsRemarks?: string;
}

export interface CourierClaimFilters {
  courierId?: number;
  claimStatus?: CourierClaimStatus | string;
  awbNumber?: string;
}
