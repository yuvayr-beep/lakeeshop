# Courier RTO Cycle & Damage Recovery Frontend Integration Guide

This guide is designed for the Frontend Engineering team (Next.js 14 App Router) to build the **Courier Return (RTO) Inward** and **Accounts Courier Damage Claims** workflows.

---

## 1. Workflow Architecture & Screen Mapping

```
                                  WAREHOUSE OPERATOR
                                          │
                                 [Scans Return Parcel]
                        (AWB / Pack Ref No / Execution ID)
                                          │
                                ┌─────────┴─────────┐
                                ▼                   ▼
                       [Condition: INTACT]  [Condition: DAMAGED]
                                │                   │
                    ┌───────────┘                   └───────────┐
                    ▼                                           ▼
      • Status: RETURNED (13)                     • Status: RETURNED (13)
      • Stock: AVAILABLE (Restocked)              • Stock: DAMAGED (Quarantined)
      • Pre-orders auto-allocated                 • Pre-orders NOT allocated
                                                  • Auto-creates Courier Claim entry!
                                                                │
                                                                ▼
                                                       ACCOUNTS / FINANCE
                                                                │
                                                    [Courier Claims Ledger]
                                                                │
                                                ┌───────────────┴───────────────┐
                                                ▼                               ▼
                                      [File Dispute Ticket]            [Settle with Courier]
                                   Attach Courier Ticket ID            Record Credit Note /
                                   & Evidence Photo URLs               Freight Bill Deduction
```

### Frontend Screens to Build:
1. **Screen 1 — Courier Return Intake (`/admin/courier/returns/rto`)**:
   - Unified barcode scan input for incoming RTO packages.
   - Quality inspection toggle: **Intact (OK)** vs **Damaged / Defective**.
   - Bulk Excel/CSV upload button for batch intake.
2. **Screen 2 — Accounts Courier Damage Claims (`/admin/accounts/courier-claims`)**:
   - Centralized claims queue for finance to recover damages from courier partners.
   - Action modals to "File Dispute Ticket" and "Record Settlement / Credit Note".

---

## 2. TypeScript Enums & Types for Frontend

Copy and paste these TypeScript definitions into your frontend types library (e.g., `types/courier-return.ts`):

```typescript
// ==========================================
// 1. INWARD INSPECTION & SCAN ENUMS
// ==========================================

export type BarcodeIdentifierType = 'AWB' | 'COURIER_AWB' | 'PACK_REF_NO' | 'EXECUTION_ID';

export type ReturnedStockCondition = 'AVAILABLE' | 'DAMAGED' | 'DEFECTIVE';
/**
 * AVAILABLE: Package and contents intact. Unit restocked to sellable inventory.
 * DAMAGED:   Crushed, broken, torn, wet during courier transit. Quarantined in damage pool.
 * DEFECTIVE: Malfunctioning or dead-on-arrival. Quarantined in defective pool.
 */

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
// 2. COURIER DAMAGE CLAIM ENUMS
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

export interface CourierClaimSettleRequest {
  outcome: ClaimSettlementOutcome;
  creditNoteNo?: string;
  settledAmount?: number;
  settledDate?: string;
  accountsRemarks?: string;
}
```

---

## 3. API Endpoints Catalog

### Screen 1: Courier Return Intake (`lcourier :5005`)

#### 0. Proof Media Upload (Unboxing Video & Photos)
When the operator marks a returned item as `DAMAGED` or `DEFECTIVE`, the frontend allows uploading an unboxing video or damage photo proof:
- **Method & Path**: `POST /media/upload` (via `lmedia :5017` or Gateway `/media/upload`)
- **Headers**:
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: multipart/form-data
  ```
- **Form Data**:
  - `file`: The media file (`.mp4`, `.mov`, `.jpg`, `.jpeg`, `.png`, `.webp`)
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "fileKey": "uploads/2026/10/rto_BD7482910292.mp4",
      "url": "https://v2.lakeetech.com/media/uploads/2026/10/rto_BD7482910292.mp4/view"
    }
  }
  ```
> **Frontend Tip**: Take the returned `url` (or `fileKey`) and set it into `evidenceFileUrl` in the return intake request below!

---

#### 1. Single Scan / Manual Return Inward
- **Method & Path**: `POST /courier/invoice/status/update`
- **Headers**:
  ```http
  Authorization: Bearer <TOKEN>
  X-USER-ID: <USER_ID>
  Content-Type: application/json
  ```
- **Payload (Damaged RTO Sample with Proof Video / Photo)**:
  ```json
  {
    "type": "AWB",
    "statusId": 13,
    "items": [
      {
        "identifier": "BD7482910292",
        "statusDate": "2026-10-09T10:30:00",
        "stockStatus": "DAMAGED",
        "remarks": "Crushed outer box; glass bottle broken in transit",
        "evidenceFileUrl": "https://v2.lakeetech.com/media/uploads/2026/10/rto_BD7482910292.mp4/view"
      }
    ]
  }
  ```
- **Payload (Intact OK Sample)**:
  ```json
  {
    "type": "AWB",
    "statusId": 13,
    "items": [
      {
        "identifier": "BD7482910292",
        "statusDate": "2026-10-09T10:30:00",
        "stockStatus": "AVAILABLE",
        "remarks": "Package sealed and intact"
      }
    ]
  }
  ```
- **Backend Behavior**:
  - Sets execution status to `13 (RETURNED)`.
  - If `stockStatus = "AVAILABLE"`, unit is restocked to available inventory.
  - If `stockStatus = "DAMAGED"`, unit is quarantined in damage pool (`lstock.inventory_damaged`) **with the proof media URL attached**, and a `CourierDamageClaim` record is **automatically initialized with the proof URL** for Accounts!

---

#### 2. Bulk Return Intake via Excel / CSV Upload
- **Method & Path**: `POST /courier/invoice/status/upload`
- **Content-Type**: `multipart/form-data`
- **Query / Form Parameters**:
  - `file`: The Excel (`.xlsx`) or CSV (`.csv`) file.
  - `type`: `AWB` (or `PACK_REF_NO`).
  - `statusId`: `13`
  - `defaultStatusDate` (optional): `2026-10-09T10:30:00`
- **Supported Spreadsheet Columns**:
  | Column A | Column B | Column C (Optional) | Column D (Optional) | Column E (Optional) |
  | :--- | :--- | :--- | :--- | :--- |
  | **IDENTIFIER** | **STATUS DATE** | **STOCK STATUS** | **REMARKS** | **EVIDENCE MEDIA URL** |
  | `BD7482910292` | `2026-10-09 10:30:00` | `DAMAGED` | Crushed outer carton | `https://v2.lakeetech.com/media/...` |
  | `BD8491029481` | `2026-10-09 10:32:00` | `AVAILABLE` | Seal intact | |

---

### Screen 2: Accounts Courier Damage Claims (`lcourier :5005`)

#### 1. List / Filter Claims Queue
- **Method & Path**: `GET /courier/claims`
- **Query Parameters**:
  - `courierId` *(optional)*: Filter by courier partner ID (e.g. `1` for Bluedart).
  - `claimStatus` *(optional)*: Filter by status (`PENDING_CLAIM`, `CLAIM_FILED`, `APPROVED_CREDITED`, `REJECTED`).
  - `awbNumber` *(optional)*: Direct search by AWB.
- **Sample Request**:
  ```http
  GET /courier/claims?claimStatus=PENDING_CLAIM HTTP/1.1
  Authorization: Bearer <TOKEN>
  ```
- **Sample Response**:
  ```json
  [
    {
      "id": 1,
      "executionId": 84920,
      "awbNumber": "BD7482910292",
      "courierId": 1,
      "courierCode": "BLUEDART",
      "packRefNo": "PCK-2026-00491",
      "orderRefNo": "ORD-2026-9812",
      "source": "COURIER_RETURN_RTO",
      "damagedDate": "2026-10-08T17:30:00",
      "damageReason": "Crushed outer box; glass bottle broken in transit",
      "evidenceFileUrl": null,
      "claimAmount": 1850.00,
      "claimReferenceNo": null,
      "claimStatus": "PENDING_CLAIM",
      "creditNoteNo": null,
      "settledAmount": null,
      "settledDate": null,
      "accountsRemarks": null,
      "createdAt": "2026-10-08T17:30:02",
      "updatedAt": "2026-10-08T17:30:02"
    }
  ]
  ```

---

#### 2. Get Single Claim Detail
- **Method & Path**: `GET /courier/claims/{id}`
- **Sample Request**:
  ```http
  GET /courier/claims/1 HTTP/1.1
  Authorization: Bearer <TOKEN>
  ```

---

#### 3. Update Claim / Record Courier Dispute Ticket
When Accounts logs into the courier partner's portal (e.g., Bluedart CRM) and opens a formal transit damage ticket, use this endpoint to save the ticket ID and evidence photos:

- **Method & Path**: `PUT /courier/claims/{id}`
- **Payload**:
  ```json
  {
    "awbNumber": "BD7482910292",
    "claimReferenceNo": "BLUEDART-DISP-8921",
    "claimAmount": 1850.00,
    "claimStatus": "CLAIM_FILED",
    "evidenceFileUrl": "https://cdn.lakeetech.com/claims/proof/BD7482910292_box.jpg",
    "damageReason": "Crushed outer box; glass bottle broken in transit",
    "accountsRemarks": "Ticket raised with Bluedart regional hub; awaiting credit approval"
  }
  ```

---

#### 4. Settle / Close Claim (Credit Note / Freight Bill Deduction)
When the courier accepts or rejects the claim:

- **Method & Path**: `POST /courier/claims/{id}/settle`
- **Payload (Approved & Credited)**:
  ```json
  {
    "outcome": "APPROVED_CREDITED",
    "creditNoteNo": "CN-BLUEDART-OCT-2026-081",
    "settledAmount": 1850.00,
    "settledDate": "2026-10-08T17:45:00",
    "accountsRemarks": "Full amount deducted against Bluedart monthly freight invoice # INV-98124"
  }
  ```
- **Payload (Rejected by Courier)**:
  ```json
  {
    "outcome": "REJECTED",
    "accountsRemarks": "Carrier rejected claim stating outer packaging was insufficient. Loss absorbed."
  }
  ```

---

## 4. Complete Frontend API Client (TypeScript)

Here is a ready-to-use API service class for your frontend:

```typescript
import axios from 'axios';
import {
  ExecutionTransitionRequest,
  CourierDamageClaim,
  CourierDamageClaimRequest,
  CourierClaimSettleRequest
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://v2.lakeetech.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach bearer token interceptor
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const CourierReturnApi = {
  /**
   * Scan & Inward Courier Return (Intact or Damaged)
   */
  scanReturn: async (payload: ExecutionTransitionRequest) => {
    const response = await apiClient.post('/courier/invoice/status/update', payload);
    return response.data;
  },

  /**
   * Bulk Upload Spreadsheet for Return Intake
   */
  uploadReturnSheet: async (file: File, type: string = 'AWB') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('statusId', '13'); // 13 = RETURNED

    const response = await apiClient.post('/courier/invoice/status/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * List Courier Damage Recovery Claims (Accounts Ledger)
   */
  getClaims: async (filters?: { courierId?: number; claimStatus?: string; awbNumber?: string }) => {
    const response = await apiClient.get<CourierDamageClaim[]>('/courier/claims', {
      params: filters
    });
    return response.data;
  },

  /**
   * Get Single Claim Details
   */
  getClaimById: async (id: number) => {
    const response = await apiClient.get<{ status: string; data: CourierDamageClaim }>(`/courier/claims/${id}`);
    return response.data.data;
  },

  /**
   * Update Claim (Attach Ticket Number, Photos, Notes)
   */
  updateClaim: async (id: number, payload: Partial<CourierDamageClaimRequest>) => {
    const response = await apiClient.put(`/courier/claims/${id}`, payload);
    return response.data;
  },

  /**
   * Settle Claim (Record Credit Note or Rejection)
   */
  settleClaim: async (id: number, payload: CourierClaimSettleRequest) => {
    const response = await apiClient.post(`/courier/claims/${id}/settle`, payload);
    return response.data;
  }
};
```

---

## 5. UI Recommendations for Best Operator Experience

1. **Barcode Scanner Audio Cues**:
   - Play a distinct chime when scanned as `AVAILABLE` (Normal return).
   - Play a warning tone when marked as `DAMAGED` to confirm to the operator that it was quarantined.
2. **One-Click Camera / Photo Upload**:
   - In the Damaged modal, allow the operator or QC staff to snap a picture of the damaged parcel/label using the warehouse tablet's camera before submitting.
3. **Accounts Badging**:
   - In the Accounts sidebar menu, display a notification badge on **"Courier Claims"** showing the count of items in `PENDING_CLAIM` status so finance never misses filing dispute tickets within the courier's claim window (usually 48–72 hours).
