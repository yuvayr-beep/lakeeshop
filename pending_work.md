# Pending Work: Stock Management

This document tracks the pending implementation items and endpoints for the Stock Management module.

## 1. EMAIL Sent Status Display in PO List

## 3. Verify Stock
- Endpoints:
  - [ ] PUT `/stock/grn/{id}/verify` (Verify GRN / reconcile final product cost timeline / update PO item and header status)


## 5. Stocktaking (Physical Count Audit)
- Workspace Concept: Manage counting events, count sessions, count sheets, download templates, and upload physical counts.
- Endpoints:
  - [ ] POST `/stock/stocktaking-events` (Create stocktaking audit event)
  - [ ] PUT `/stock/stocktaking-events/{id}` (Update event metadata)
  - [ ] PATCH `/stock/stocktaking-events/{id}/status` (Approve/Complete event status)
  - [ ] POST `/stock/stocktaking-sessions` (Open count session)
  - [ ] PATCH `/stock/stocktaking-sessions/{id}/status` (Transition count session status)
  - [ ] GET `/stock/stocktaking-sessions/{id}/template` (Download counting template)
  - [ ] POST `/stock/stocktaking-sessions/{id}/upload-open-stock` (Upload physical counts)
  - [ ] POST `/stock/stocktaking-details` (Log/update physical count details)
  - [ ] DELETE `/stock/stocktaking-details/{id}` (Soft delete count details)

## 6. Reports
All reports support three format channels:
- Unpaginated NDJSON stream
- Paginated NDJSON stream (size and page query params)
- Excel file download (small range <= 10 days) or async job-triggered download (large range > 10 days)

### 6.1. Current Stock Status Report
- [ ] GET `/stock/reports/current-status` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/current-status/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/current-status/excel` (Excel download)
- **Columns:** Product ID, Code, Name, Brand, Available Qty, Average Courier Price, Original Cost, Original Value, Latest Cost, Latest Value

### 6.2. Historic Stock Status Report
- [ ] GET `/stock/reports/historic-status` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/historic-status/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/historic-status/excel` (Excel / Job)
- **Columns:** Product ID, Code, Name, Brand, Open Stock Qty, Closing Stock Qty, Original Cost, Original Value, Latest Cost, Latest Value

### 6.3. Ledger Report
- [ ] GET `/stock/reports/ledger` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/ledger/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/ledger/excel` (Excel / Job)
- **Modes:**
  - Consolidated: Grouping continuous `ORDER_EXECUTION` entries by reference ID
  - Non-consolidated: Chronological raw log entries
- **Columns:** Chronological records, In Qty, Out Qty, running balance column

### 6.4. Stock Movement Report (Audit)
- [ ] GET `/stock/reports/stock-movement` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/stock-movement/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/stock-movement/excel` (Excel / Job)
- **Columns:** Product details, Opening Stock (Qty, Cost, Value), Closing Stock (Qty, Cost, Value), Purchases, Sales, Tax breakdowns (Taxable, Tax Amount, Total Value)

### 6.5. Stagnant Stock Report
- [ ] Redirects to external Python Report Service

### 6.6. Slow Moving Stock Report
- [ ] Redirects to external Python Report Service

### 6.7. Addition Report (Stock Inflows Only)
- [ ] GET `/stock/reports/additions` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/additions/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/additions/excel` (Excel / Job)
- **Filters:** `startDate`, `endDate`, `productId`, `brand`, `locationId`, `additionType` (PURCHASE, RTO, DTO, OPEN_STOCK, OTHER)

### 6.8. Adjustment Report (Inventory Deductions Excluding Sales)
- [ ] GET `/stock/reports/adjustments` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/adjustments/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/adjustments/excel` (Excel / Job)
- **Filters:** `startDate`, `endDate`, `productId`, `brand`, `locationId`, `adjustmentType` (SCRAP, WRITE_OFF, DAMAGE, etc.)

### 6.9. Supplier Invoice Report (GRN Items Audit)
- [ ] GET `/stock/reports/supplier-invoices` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/supplier-invoices/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/supplier-invoices/excel` (Excel / Job)
- **Filters:** `startDate`, `endDate`, `productId`, `brand`, `invoiceNumber` (partial match supported)
- [ ] PUT `/stock/reports/supplier-invoices/{id}` (Edit grn item price, qty, invoice no, and invoice date)

### 6.10. Ad-hoc Report (Ad-hoc Procurement Verification)
- [ ] GET `/stock/reports/adhoc-procurements` (Unpaginated NDJSON)
- [ ] GET `/stock/reports/adhoc-procurements/page` (Paginated NDJSON)
- [ ] GET `/stock/reports/adhoc-procurements/excel` (Excel / Job)
- [ ] PUT `/stock/reports/adhoc-procurements/{id}` (Edit ad-hoc supplier product details)

### 6.11. Export Job Status & Download Tracking
- [ ] GET `/stock/reports/export-jobs/{jobId}` (Poll job execution status: PENDING, PROCESSING, SUCCESS, FAILED)
- [ ] GET `/stock/reports/download/{jobId}` (Download generated Excel sheet)
