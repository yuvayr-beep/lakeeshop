# Lakee ERP - Complete Application API Endpoints Documentation (Including Courier & All Modules)

> **Base Server URL**: `https://v2.lakeetech.com` (or configured `NEXT_PUBLIC_API_BASE_URL`)  
> **Authentication Header**: `Authorization: Bearer <access_token>`  
> **Default Data Formats**: `application/json`, `application/x-ndjson` (streaming responses), `multipart/form-data` (file uploads)

This document provides a comprehensive, production-grade map of **all API endpoints used across every module, screen, and menu item** in the Lakee ERP application (including the full Courier logistics suite), listed in exact navigation order as defined in `src/constants/menuData.ts`.

---

## Navigation Summary & Status

| Module Code | Module Name | Total Screens | Active API Integration Status |
| :--- | :--- | :---: | :--- |
| **DASH** | Dashboard | 2 | **Integrated** (Operations API & Real-time SSE Stream) |
| **PRODUCT** | Products | 17 | **Integrated** (Catalog CRUD, Category, Brand, Share & 12 Masters) |
| **CLIENT** | Clients | 1 | **Integrated** (Profile, Business Units, Address, Bank, Docs, Configs) |
| **VENDOR** | Supplier | 1 | **Integrated** (Profile, Addresses, Contacts, Banks, Documents) |
| **STOCK** | Stock | 18 | **Integrated** (Relations, POs, Receive, Transfer, Adjust, 10 Reports) |
| **ORDER** | Orders | 22 | **Integrated** (Batch Ingestion, Staging, Ad-hoc, Stock Assign, Courier/AWB, Print, Reports, Configs) |
| **PREORDER** | Pre-Order Management | 6 | **Integrated** (Convert, Shortage, Active Queue, Audit, Release, Reasons) |
| **COURIER** | Courier | 12 | **Integrated** (Partners, Configs, Blocks, Exclusions, Actuals, Proposed Avg, Pre-AWB, Invoices) |
| **FINANCE** | Finance & Billing | 0 | *Pending Service Module* |
| **USER** | User & Security | 7 | **Integrated** (Users, Roles, User-Role Mapping, Permission Matrix, Screens Catalog, Cache) |
| **MEDIA** | Media Storage | 0 | *Pending Service Module* |
| **AUTH** | Authentication | 4 | **Integrated** (SignIn, Token Refresh, Forgot Password Initiate & Verify) |

---

## 1. Authentication & System Account APIs (`AUTH`)

### 1.1 User Sign-In
- **Screen**: `/sign-in-password-screen`
- **Method & Endpoint**: `POST /auth/signin`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "phone": "8667757668",
    "password": "Password@123"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 28800,
    "tokenType": "Bearer"
  }
  ```

### 1.2 Access Token Refresh
- **Method & Endpoint**: `POST /auth/refresh`
- **Headers**: `Authorization: Bearer <refreshToken>`

### 1.3 Forgot Password - Initiate OTP
- **Screen**: `/forgot-password`
- **Method & Endpoint**: `POST /auth/forgot-password/initiate`
- **Request Body**: `{ "phone": "8667757668" }`

### 1.4 Forgot Password - Verify OTP & Reset
- **Screen**: `/forgot-password`
- **Method & Endpoint**: `POST /auth/forgot-password/verify`
- **Request Body**:
  ```json
  {
    "phone": "8667757668",
    "otp": "123456",
    "newPassword": "NewPassword@123",
    "rePassword": "NewPassword@123"
  }
  ```

---

## 2. Dashboard Module (`DASH`)

### 2.1 Operations Dashboard (`DASH_OPS`)
- **Route**: `/admin/dashboard/operations`
- **Actions**: `READ`
- **Endpoints**:
  1. **Fetch Operations Metrics**: `GET /order/execution/dashboard` (`Accept: application/json`)

### 2.2 SSE Dashboard Preview (`DASH_SSE`)
- **Route**: `/preview_sse_dashboard.html?token=erp-init-2025`
- **Actions**: `READ`
- **Endpoints**:
  1. **Real-time Event Stream**: `GET /order/execution/dashboard/stream` (`Accept: text/event-stream`)

---

## 3. Products Module (`PRODUCT`)

### 3.1 Products Catalog (`PROD`)
- **Route**: `/admin/products/list`
- **Actions**: `READ`, `WRITE`
- **Endpoints**:
  1. **List Products**: `GET /prod/products` (`Accept: application/x-ndjson`)
  2. **Fetch Product Detail**: `GET /prod/products/{id}`
  3. **Create Product**: `POST /prod/products`
  4. **Update Product**: `PUT /prod/products/{id}`
  5. **Delete Product**: `DELETE /prod/products/{id}`
  6. **Download Bulk Import Template**: `GET /prod/products/template` (`responseType: blob`)
  7. **Upload Products Excel**: `POST /prod/products/upload` (`Content-Type: multipart/form-data`)

### 3.2 Product Category (`PCAT`)
- **Route**: `/admin/products/category`
- **Endpoints**: `GET /prod/categories/client/{clientId}/export` | `POST /prod/categories` | `PUT /prod/categories/{id}` | `DELETE /prod/categories/{id}`

### 3.3 Brand Management (`BRAND`)
- **Route**: `/admin/products/brand`
- **Endpoints**: `GET /prod/brands` | `POST /prod/brands` | `PUT /prod/brands/{id}` | `DELETE /prod/brands/{id}` | `GET /prod/brands/template` | `POST /prod/brands/upload`

### 3.4 Client Share (`CSHAR`)
- **Route**: `/admin/products/client-share`
- **Endpoints**: `GET /prod/client-share` | `GET /prod/client-product-share?sku={sku}` | `POST /prod/client-share` | `DELETE /prod/client-share/{id}`

### 3.5 Supplier Share (`COSHAR`)
- **Route**: `/admin/products/courier-share`
- **Endpoints**: `GET /prod/courier-share` | `GET /prod/supplier-product-share?sku={sku}` | `POST /prod/courier-share` | `DELETE /prod/courier-share/{id}`

### 3.6 Masters Sub-Screens (`MASTERS`)
- **HSN CODE** (`/admin/products/masters/hsn`): `GET /prod/hsn` | `POST /prod/hsn` | `DELETE /prod/hsn/{id}` | `GET /prod/hsn/history/{hsnCode}` | `GET /prod/hsn/template` | `POST /prod/hsn/upload`
- **Color** (`/admin/products/masters/color`): `GET/POST/PUT/DELETE /prod/masters/color`
- **Edition** (`/admin/products/masters/edition`): `GET/POST/PUT/DELETE /prod/masters/edition`
- **Gender** (`/admin/products/masters/gender`): `GET/POST/DELETE /prod/genders/all`, `/prod/genders`
- **Product Type** (`/admin/products/masters/product-type`): `GET/POST/PUT/DELETE /prod/types`, `POST /prod/types/upload`
- **Material** (`/admin/products/masters/material`): `GET/POST/DELETE /prod/material/all`, `/prod/material`
- **Pattern Finish** (`/admin/products/masters/pattern-finish`): `GET/POST/DELETE /prod/pattern/all`, `/prod/pattern`
- **Shipmode** (`/admin/products/masters/shipmode`): `GET/POST/DELETE /prod/shipment-modes/all`, `/prod/shipment-modes`
- **Handling Type** (`/admin/products/masters/handling-type`): `GET/POST/DELETE /prod/handling-type/all`, `/prod/handling-type`
- **Price Type** (`/admin/products/masters/price-type`): `GET/POST/PUT/DELETE /prod/price-types`
- **Warranty Type** (`/admin/products/masters/warranty-type`): `GET/POST/DELETE /prod/warranty/all`, `/prod/warranty`
- **UOM** (`/admin/products/masters/uom`): `GET/POST/DELETE /prod/uom/all`, `/prod/uom`

---

## 4. Clients Module (`CLIENT`)

### 4.1 Client Profile & Setup (`CLIENT`)
- **Route**: `/admin/clients/profile`
- **Endpoints**:
  1. `GET /client` | `GET /client/{id}` | `POST /client` | `PUT /client/{id}` | `DELETE /client/{id}`
  2. `GET /client/business-unit/{clientId}` | `POST /client/business-unit` | `PUT /client/business-unit/{id}`
  3. `GET /client/address/{clientId}` | `POST /client/address` | `PUT /client/address/{id}` | `DELETE /client/address/{id}`
  4. `GET /client/program/{buId}` | `POST /client/program` | `PUT /client/program/{id}` | `DELETE /client/program/{id}`
  5. `GET /client/config/business-unit/{buId}/credentials` | `PUT /client/config/business-unit/{buId}/credentials`
  6. `GET /client/contact/{clientId}` | `POST /client/contact` | `PUT /client/contact/{id}` | `DELETE /client/contact/{id}`
  7. `GET /client/bank/{clientId}` | `POST /client/bank` | `PUT /client/bank/{id}` | `DELETE /client/bank/{id}`
  8. `GET /client/document/{clientId}` | `POST /client/document` | `DELETE /client/document/{id}`

---

## 5. Supplier / Vendor Module (`VENDOR`)

### 5.1 Supplier Profile & Setup (`VENDOR`)
- **Route**: `/admin/suppliers/profile`
- **Endpoints**:
  1. `GET /vendor/supplier` | `POST /vendor/supplier` | `PUT /vendor/supplier/{id}` | `DELETE /vendor/supplier/{id}`
  2. `GET /vendor/supplier-addresses/{supplierId}` | `POST /vendor/supplier-addresses` | `PUT /vendor/supplier-addresses/{id}` | `DELETE /vendor/supplier-addresses/{id}`
  3. `GET /vendor/supplier-contacts/{supplierId}` | `POST /vendor/supplier-contacts` | `PUT /vendor/supplier-contacts/{id}` | `DELETE /vendor/supplier-contacts/{id}`
  4. `GET /vendor/supplier-banks/{supplierId}` | `POST /vendor/supplier-banks` | `PUT /vendor/supplier-banks/{id}` | `DELETE /vendor/supplier-banks/{id}`
  5. `GET /vendor/supplier-documents/{supplierId}` | `POST /vendor/supplier-documents` | `DELETE /vendor/supplier-documents/{id}`

---

## 6. Stock & Inventory Module (`STOCK`)

### 6.1 Product Relations (`STK_PROD_REL`)
- **Route**: `/admin/stock/product-relations`
- **Endpoints**: `GET /stock/product-relations` | `GET /prod/combos/product/{productId}` | `POST /stock/product-relations`

### 6.2 Alternate Products (`STK_ALT_PROD`)
- **Route**: `/admin/stock/alternate-products`
- **Endpoints**: `GET /stock/alternate-products` | `GET /prod/alternate/product/{productId}` | `POST /stock/alternate-products`

### 6.3 Product Config - Pack Quantity & Measurements (`STK_PROD_CONFIG`)
- **Pack Quantity** (`/admin/stock/product-config/pack-quantity`): `GET /prod/products/edit-fields` | `POST /prod/products/edit-template` | `POST /prod/products/edit-upload`
- **Product Measurements** (`/admin/stock/product-config/measurements`): `GET /stock/product-config/measurements` | `PUT /stock/product-config/measurements/{id}`

### 6.4 Purchase Orders (`STK_PO`)
- **PO List** (`/admin/stock/purchase-orders/list`): `GET /stock/purchase-orders` | `POST /stock/purchase-orders` | `GET /stock/grn`
- **Auto-PO Config** (`/admin/stock/purchase-orders/auto-config`): `GET /stock/purchase-orders/auto-config` | `POST /stock/purchase-orders/auto-config`

### 6.5 Receive Stock (`STK_REC`)
- **Route**: `/admin/stock/receive`
- **Endpoints**: `GET /stock/receive` | `POST /stock/receive` | `GET /stock/grn`

### 6.6 Stock Transfer (`STK_TRANS`)
- **Route**: `/admin/stock/transfer`
- **Endpoints**: `GET /stock/location/active` | `GET /prod/products` | `GET /stock/grn` | `GET /stock/units` | `GET /stock/summary/{productId}/locations` | `POST /stock/transfer`

### 6.7 Stock Reports (`STK_REPORTS`)
1. **Current Stock Status**: `GET /stock/reports/current-status/page` | `GET /stock/reports/current-status/excel`
2. **Historic Stock Status**: `GET /stock/reports/historic-status/page` | `GET /stock/reports/historic-status/excel` | `GET /stock/reports/export-jobs/{jobId}` | `GET /stock/reports/download/{jobId}`
3. **Stock Ledger**: `GET /stock/reports/ledger/page` | `GET /stock/reports/ledger/excel` | `GET /stock/reports/export-jobs/{jobId}`
4. **Stock Movement Audit**: `GET /stock/reports/stock-movement/page` | `GET /stock/reports/stock-movement/excel`
5. **Stagnant Stock**: `GET /reports/report/stagnant`
6. **Slow Moving Stock**: `GET /reports/report/slow_moving`
7. **Supplier Invoice Report**: `GET /stock/reports/supplier-invoices/page` | `PUT /stock/reports/supplier-invoices/{id}` | `GET /stock/reports/supplier-invoices/excel`
8. **Ad-hoc Report**: `GET /stock/reports/adhoc-procurements/page` | `GET /stock/reports/adhoc-procurements/excel`

### 6.8 Stock Master (`STK_MASTER`)
- **Warehouse Setup** (`/admin/stock/master/warehouse`): `GET /stock/warehouse/active` | `POST /stock/warehouse` | `PUT /stock/warehouse/{id}` | `DELETE /stock/warehouse/{id}`
- **Inventory Storage Locations** (`/admin/stock/master/locations`): `GET /stock/location/active` | `POST /stock/location` | `PUT /stock/location/{id}` | `DELETE /stock/location/{id}`

---

## 7. Orders & Fulfillment Module (`ORDER`)

### 7.1 Batch Orders (`ORD_BATCH`)
- **Route**: `/admin/orders/batch-orders`
- **Endpoints**:
  1. `POST /order/batch/upload?clientId={clientId}&businessUnitId=6&batchType=1` (`multipart/form-data`)
  2. `GET /order/batch/list` (`Accept: application/x-ndjson`)
  3. `DELETE /order/batch/{batchId}`
  4. `POST /order/batch/combine-online?clientId={clientId}`
  5. `POST /order/staging/validate/{batchId}`
  6. `GET /order/staging/summary/{batchId}`
  7. `GET /order/staging/error-orders` (`Accept: application/x-ndjson`)
  8. `GET /order/staging/split-orders`
  9. `POST /order/staging/revalidate/{stagingId}`
  10. `PUT /order/staging/{stagingId}`
  11. `POST /order/submission/submit-batch` (`{ "batchId": 123 }`)
  12. `POST /order/batch/download` (`responseType: blob`)
  13. `POST /order/batch/export/order-details`
  14. `GET /order/batch/export/job/{jobId}`
  15. `GET /order/batch/download/file/{fileName}`
  16. `POST /order/create`

### 7.2 Ad-hoc Management (`ORD_ADHOC_MGMT`)
- **Route**: `/admin/orders/adhoc-management`
- **Endpoints**: `GET /order/adhoc-orders` | `GET /order/adhoc-orders/sales-persons` | `POST /order/adhoc-orders` | `POST /order/adhoc-orders/assign`

### 7.3 Stock Assignment (`ORD_STOCK_ASSIGN`)
- **Route**: `/admin/orders/stock-assignment`
- **Endpoints**: `GET /order/stock-assignment` | `GET /order/stock-assignment/batch/{batchNo}` | `POST /order/dashboard/details/excel?metricType=totalPendingStockAssign`

### 7.4 Courier Assignment (`ORD_COURIER_ASSIGN_GROUP`)
- **Assign Batch**: `GET /order/execution/courier-assignment/batch` | `POST /order/dashboard/details/excel?metricType=pendingCourierAssign`
- **Manual Assign**: `POST /order/execution/courier-assignment/single` | `GET /courier/services/courier/{courierId}` | `GET /courier/serviceable-pincodes?pincode={pincode}`
- **Upload Courier Assign**: `POST /order/execution/courier-assignment/upload` (`multipart/form-data`)

### 7.5 AWB Assign (`ORD_AWB_ASSIGN_GROUP`)
- **Share to Courier**: `GET/POST /order/awb-assign/share-to-courier`
- **Courier Assign Batch**: `GET /order/awb-assign/courier-assign-batch`
- **Courier Batch Upload**: `POST /order/awb-assign/courier-batch-upload`

### 7.6 Print Invoices & Labels (`ORD_PRINT_GROUP`)
- **Invoice List**: `GET /courier/invoice/list`
- **Print Invoice**: `POST /courier/invoice/print`
- **Reprint Invoice**: `POST /courier/invoice/reprint`
- **Batch Reprint**: `POST /courier/invoice/batch-reprint`

### 7.7 Order Reports (`ORD_REPORTS`)
- **Order Detail Report**: `GET /order/reports/order-detail`
- **Status Check Report**: `GET /order/reports/status-check`
- **Status Check Batch**: `GET /order/reports/status-check-batch`
- **AWB Batch Jobs**: `GET /order/reports/awb-batch-jobs`

### 7.8 Master Configuration (`ORD_MASTER_CONFIG`)
- **Client Column Mapping**: `GET /order/client-mapping/template/list` | `POST /order/client-mapping/template/upload` | `POST /order/client-mapping/template/save` | `GET /order/client-mapping/template/{id}` | `PUT /order/client-mapping/template/{id}`
- **Pincode Registry**: `GET /order/pincode/states` | `GET /order/pincode/list` | `POST /order/pincode` | `DELETE /order/pincode/{id}` | `GET /order/pincode/download` | `GET /order/pincode/template` | `POST /order/pincode/upload`
- **Customer Blacklist**: `GET/POST/PUT /order/customer-blacklist`
- **Master Lookups**: `GET /order/master/order-source` | `/pricing-source` | `/reship-reason` | `/return-condition` | `/return-type` | `/system-field` | `/timeline-action` | `/invoice-trigger` | `/validation-error` | `/fulfillment-source` | `/validation-status` | `/execution-type` | `/execution-status`
- **Invoice Group**: `GET/POST/PUT /order/master/invoice-group`

---

## 8. Pre-Order Management Module (`PREORDER`)

### 8.1 Convert to Pre-Order (`ORD_PRE_CONVERT`)
- **Route**: `/admin/orders/pre-order/convert`
- **Endpoints**: `GET /order/pre-order/convert` | `POST /order/pre-order/convert`

### 8.2 Record Warehouse Shortage (`ORD_PRE_SHORTAGE`)
- **Route**: `/admin/orders/pre-order/shortage`
- **Endpoints**: `GET /order/pre-order/shortage` | `POST /order/pre-order/shortage`

### 8.3 Active Pre-Order Queue (`ORD_PRE_ACTIVE`)
- **Route**: `/admin/orders/pre-order/active-queue`
- **Endpoints**: `GET /order/pre-order/active-queue`

### 8.4 Pre-Order Audit & History (`ORD_PRE_AUDIT`)
- **Route**: `/admin/orders/pre-order/audit-history`
- **Endpoints**: `GET /order/pre-order/audit-history`

### 8.5 Pre-Order Release (`ORD_PRE_RELEASE`)
- **Route**: `/admin/orders/pre-order/release`
- **Endpoints**: `GET /order/pre-order/release` | `POST /order/pre-order/release`

### 8.6 Pre-Order Master Shortage Reasons (`ORD_PRE_M_SHORTAGE_REASONS`)
- **Route**: `/admin/orders/pre-order/master/shortage-reasons`
- **Endpoints**: `GET/POST/PUT/DELETE /order/pre-order/master/shortage-reasons`

---

## 9. Courier & Logistics Module (`COURIER`)

### 9.1 Courier Partner Management & Configurations (`COUR_PARTNER`)
- **Route**: `/admin/courier/partners`
- **Endpoints**:
  1. **List Courier Partners**:
     - `GET /courier` (`Accept: application/x-ndjson`)
     - **Description**: Returns list of courier partners sorted by ID/name.
  2. **Create Partner**:
     - `POST /courier`
     - **Request Body**: `{ "courierCode": "DLRY", "courierName": "Delhivery", "trackingUrlTemplate": "https://...", "isActive": true }`
  3. **Update Partner**: `PUT /courier/{id}`
  4. **Delete Partner**: `DELETE /courier/{id}`
  5. **Get Courier Config (Services, Pincodes, Zones, Rates)**: `GET /courier/config/{courierId}`
  6. **Update Courier Config**: `PUT /courier/config/{courierId}`
  7. **Pincodes Excel Export**: `GET /courier/config/{courierId}/pincode/export`
  8. **Pincodes Bulk Upload**: `POST /courier/config/{courierId}/pincode/upload` (`multipart/form-data`)
  9. **Zones Excel Export**: `GET /courier/config/{courierId}/zone/export`
  10. **Zones Bulk Upload**: `POST /courier/config/{courierId}/zone/upload` (`multipart/form-data`)
  11. **Rates Excel Export**: `GET /courier/config/{courierId}/rate/export`
  12. **Rates Bulk Upload**: `POST /courier/config/{courierId}/rate/upload` (`multipart/form-data`)

### 9.2 Bulk Pincode Block Control (`COUR_PINCODE_BLOCK`)
- **Route**: `/admin/courier/pincode-block`
- **Endpoints**:
  1. **List Serviceable Pincodes**: `GET /courier/serviceable-pincodes` (`Accept: application/x-ndjson`)
  2. **Bulk Block / Unblock Pincodes**:
     - `POST /courier/serviceable-pincodes/block-unblock`
     - **Request Body**: `{ "pincodes": ["600001", "600002"], "courierIds": [1, 2], "isBlocked": true, "remark": "Heavy rainfall block" }`

### 9.3 Client & Product Exclusions (`COUR_EXCLUSIONS`)
- **Route**: `/admin/courier/exclusions`
- **Endpoints**:
  1. **List Courier Services**: `GET /courier/services` (`Accept: application/x-ndjson`)
  2. **List Client Exclusions**: `GET /courier/client-exclusions`
  3. **Create Client Exclusion**: `POST /courier/client-exclusions` (`{ "courierServiceId": 5, "clientId": 10 }`)
  4. **Delete Client Exclusion**: `DELETE /courier/client-exclusions/{id}`
  5. **List Product Exclusions**: `GET /courier/product-exclusions`
  6. **Create Product Exclusion**: `POST /courier/product-exclusions` (`{ "courierServiceId": 5, "categoryId": 3 }`)
  7. **Delete Product Exclusion**: `DELETE /courier/product-exclusions/{id}`

### 9.4 Courier Actuals (`COUR_ACTUALS`)
- **Route**: `/admin/courier/actuals`
- **Endpoints**:
  1. **List Courier Actuals**: `GET /courier/actuals` (`Accept: application/x-ndjson`)
  2. **Create Courier Actual Record**:
     ```bash
     curl -X 'POST' \
       'https://v2.lakeetech.com/courier/actuals' \
       -H 'accept: application/json' \
       -H 'Authorization: Bearer XXX' \
       -H 'Content-Type: application/json' \
       -d '{
       "courierCode": "DLRY",
       "awbNumber": "8778878778",
       "billedWeight": 0.65,
       "actualCost": 45
     }'
     ```
     **Response**:
     ```json
     {
       "success": true,
       "message": "Success",
       "data": {
         "id": 2,
         "courierCode": "DLRY",
         "courierName": "Delhivery",
         "awbNumber": "8778878778",
         "billedWeight": 0.65,
         "actualCost": 45,
         "createdAt": "2026-10-08T15:36:06.67081685",
         "createdBy": 39,
         "createdByName": "Yuvaraja M"
       },
       "timestamp": "2026-10-08T15:36:06.673940858"
     }
     ```
  3. **Download Excel Template**: `GET /courier/actuals/template` (`responseType: blob`)
  4. **Bulk Upload Excel File**: `POST /courier/actuals/upload` (`Content-Type: multipart/form-data`)

### 9.5 Proposed Average Prices (`COUR_PROPOSED_AVG`)
- **Route**: `/admin/courier/proposed-average-prices`
- **Endpoints**:
  1. **Fetch Proposed Average Prices**:
     ```bash
     curl -X 'GET' \
       'https://v2.lakeetech.com/courier/actuals/proposed-average-prices' \
       -H 'accept: application/json' \
       -H 'Authorization: Bearer XXX'
     ```
     **Description**: Returns proposed average courier cost per zone and weight bracket.

### 9.6 Pre Allotted AWB (`COUR_PRE_AWB_MASTER`)
- **Route**: `/admin/orders/master-config/pre-awb-master`
- **Endpoints**:
  1. **Download Excel Template**: `GET /courier/pre-awb/template` (`responseType: blob`)
  2. **Upload Pre-AWB File**: `POST /courier/pre-awb/upload?courierId={courierId}` (`multipart/form-data`)
  3. **Get Summary List**: `GET /courier/pre-awb/summary` (`Accept: application/x-ndjson`)
  4. **Get AWB Report (NDJSON Stream)**: `GET /courier/pre-awb/report?courierId={id}&format=ndjson`
  5. **Download AWB Report Excel**: `GET /courier/pre-awb/report?courierId={id}&format=excel` (`responseType: blob`)
  6. **Manual Allot AWB**: `POST /courier/pre-awb/manual-allot` (`{ "courierId": 1, "orderId": 1024, "awbNumber": "8778878778" }`)
  7. **Clear Unallocated AWB Pool**: `DELETE /courier/pre-awb/pool?courierId={courierId}`

### 9.7 Invoice & Label Registry (`COUR_INV_REG`)
- **Route**: `/admin/courier/invoice-registry`
- **Endpoints**: `GET /courier/invoice-registry`

### 9.8 Customer Invoice & Label Printing (`COUR_PRINT`)
- **Route**: `/admin/courier/label-printing`
- **Endpoints**: `POST /courier/label-printing`

### 9.9 Courier Outscan (`COUR_OUTSCAN`)
- **Route**: `/admin/courier/outscan`
- **Endpoints**: `GET /courier/outscan` | `POST /courier/outscan`

### 9.10 Courier Dispatches & Manifests (`COUR_DISPATCH`)
- **Route**: `/admin/courier/manifests`
- **Endpoints**: `GET /courier/manifests` | `POST /courier/manifests`

### 9.11 Logistics Returns Processing (`COUR_RETURNS`)
- **Route**: `/admin/courier/returns`
- **Endpoints**: `GET /courier/returns` | `POST /courier/returns`

### 9.12 Webhooks & Carrier Integrations (`COUR_WEBHOOKS`)
- **Route**: `/admin/courier/webhooks`
- **Endpoints**: `GET /courier/webhooks` | `POST /courier/webhooks`

---

## 10. User & Security Module (`USER`)

### 10.1 Users Management (`USER_CONFIG_USERS`)
- **Route**: `/admin/user/users`
- **Endpoints**: `GET /users` | `POST /users` | `PUT /users/{id}` | `DELETE /users/{id}`

### 10.2 Security Hub Overview (`USER_ROLES_HUB`)
- **Route**: `/admin/user/roles`
- **Endpoints**: Summary aggregation of `/users/roles`, `/users/screen`, `/users/permissions`.

### 10.3 Role Management (`USER_ROLES_LIST`)
- **Route**: `/admin/user/roles/list`
- **Endpoints**: `GET /users/roles` | `GET /users/roles/{name}` | `POST /users/roles` | `PUT /users/roles/{name}` | `DELETE /users/roles/{name}`

### 10.4 User-Role Mappings (`USER_ROLE_MAPPINGS`)
- **Route**: `/admin/user/roles/user-roles`
- **Endpoints**: `GET /users/user-roles/all-user-wise` | `GET /users/user-roles/user/{userId}` | `GET /users/user-roles/role/{roleId}` | `POST /users/user-roles` | `DELETE /users/user-roles/{userRoleId}`

### 10.5 Permission Matrix (`USER_PERM_MATRIX`)
- **Route**: `/admin/user/roles/matrix`
- **Endpoints**: `GET /users/permissions/navigation/role/{roleId}` | `POST /users/permissions/role/{roleId}`

### 10.6 Screens Catalog (`USER_SCREENS`)
- **Route**: `/admin/user/roles/screens`
- **Endpoints**: `GET /users/screen` | `POST /users/screen` | `PUT /users/screen/{code}` | `DELETE /users/screen/{code}`

### 10.7 Permission Overrides & Redis Cache (`USER_OVERRIDES_CACHE`)
- **Route**: `/admin/user/permissions/overrides`
- **Endpoints**: `GET /users/permissions/{userId}/{screenCode}` | `POST /users/permissions/cache/{userId}`

---

## 11. Finance & Billing Module (`FINANCE`)

- **Status**: *Pending backend service implementation*. UI shell ready at `/admin/finance`.

---

## 12. Media Storage Module (`MEDIA`)

- **Status**: *Pending backend service implementation*. UI shell ready at `/admin/media`.
