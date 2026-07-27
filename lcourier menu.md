lcourier menu
Here is the operational menu tree and API catalog for the lcourier courier and logistics microservice, mapped by business domain and execution workflows.

Menus:

1. Courier Partner Management (CRUD)
Manages primary courier partner accounts (e.g., Bluedart, Delhivery, Ecom Express, India Post).
Endpoints:
- GET /courier (List all configured courier partners)
- GET /courier/{id} (Retrieve courier details by ID)
- POST /courier (Register a new courier partner)
- PUT /courier/{id} (Update courier details)
- DELETE /courier/{id} (Deactivate/delete a courier partner)


2. Courier Services & Modes Setup
Configures specific service types (e.g. Surface, Air, COD, Prepaid) offered by each courier partner.
Endpoints:
- GET /courier/services (List all courier services)
- GET /courier/services/courier/{courierId} (List services supported by a specific courier)
- GET /courier/services/{id} (Retrieve courier service details)
- POST /courier/services (Create a new courier service configuration)
- PUT /courier/services/{id} (Update courier service details)
- DELETE /courier/services/{id} (Deactivate/delete a courier service)


3. Pincode Serviceability Configurations
Defines which geographic pincodes are serviceable by specific courier services, including zone classifications.
Endpoints:
- GET /courier/serviceable-pincodes/template/download?courierId={courierId} (Download pre-formatted Excel upload template for specific courier containing sample rows & helper sheets)
- POST /courier/serviceable-pincodes/upload?mode={mode} (Bulk upload courier serviceable pincodes spreadsheet file - UPSERT or OVERWRITE mode)
- POST /courier/serviceable-pincodes/json-upload?mode={mode} (Bulk upload courier serviceable pincodes via JSON array matching Excel columns - UPSERT or OVERWRITE mode)
- GET /courier/serviceable-pincodes (Query serviceable pincodes with filters: courierId, serviceId, shipMode, pincode, limit, offset)
- GET /courier/serviceable-pincodes/{id} (Retrieve serviceable pincode details)
- POST /courier/serviceable-pincodes (Create a new single pincode serviceability mapping)
- PUT /courier/serviceable-pincodes/{id} (Update pincode serviceability settings)
- DELETE /courier/serviceable-pincodes/{id} (Deactivate/remove pincode serviceability)
- POST /courier/pincodes/block-unblock (Bulk block or unblock pincodes for specific couriers)

Sample JSON Payloads:
- **Bulk Upload Pincodes via JSON (`POST /courier/pincodes/json-upload?mode=UPSERT`)** *(Matches Excel Columns)*:
```json
[
  {
    "courierCode": "BD",
    "shipMode": "SURFACE",
    "zoneCode": "ZONE_A",
    "pincode": "110001",
    "cityName": "New Delhi",
    "handlingCityCode": "DEL",
    "handlingBranchCode": "DEL-HUB",
    "stateName": "Delhi",
    "stateCode": "DL"
  },
  {
    "courierCode": "DELHIVERY",
    "shipMode": "AIR",
    "zoneCode": "METRO",
    "pincode": "400001",
    "cityName": "Mumbai",
    "handlingCityCode": "BOM",
    "handlingBranchCode": "BOM-CENTRAL",
    "stateName": "Maharashtra",
    "stateCode": "MH"
  }
]
```

- **Single Pincode Serviceability Creation (`POST /courier/serviceable-pincodes`)**:
```json
{
  "courierServiceId": 1,
  "pincode": "110001",
  "codAvailable": true,
  "prepaidAvailable": true,
  "expectedDeliveryDays": 3,
  "active": true
}
```
- **Bulk Pincode Block/Unblock (`POST /courier/pincodes/block-unblock`)**:
```json
{
  "courierId": 2,
  "shipMode": "SURFACE",
  "pincodes": [
    "110001",
    "110002",
    "400001"
  ],
  "remarks": "Temporary flooding block",
  "block": true
}
```


4. Client & Product Courier Blocklists (Exclusions)
Allows blocking specific courier partners from being assigned to certain clients or products (e.g., preventing high-value products from being shipped via standard postal service).
Endpoints:
- Client Exclusions:
  - GET /courier/exclusions/client/all (List all active client-courier block configurations)
  - GET /courier/exclusions/client/{clientId} (Retrieve blocked couriers for a specific client)
  - POST /courier/exclusions/client (Block a courier partner for a client)
  - DELETE /courier/exclusions/client/{id} (Remove a client-courier block)
- Product Exclusions:
  - GET /courier/exclusions/product/all (List all active product-courier block configurations)
  - GET /courier/exclusions/product/{productId} (Retrieve blocked couriers for a specific product)
  - POST /courier/exclusions/product (Block a courier partner for a product)
  - DELETE /courier/exclusions/product/{id} (Remove a product-courier block)


5. Courier Allocation Engine (Internal Selection)
Core rules-based routing engine that determines eligible carriers and rates for package dispatch.
Endpoints:
- POST /courier/internal/assign (Internal service call: Trigger manual courier assignment for single execution)
- POST /courier/internal/assign-batch (Internal service call: Trigger auto-courier rate selection and assignment for execution batches)
- GET /courier/serviceable-couriers (Retrieve list of all serviceable couriers and estimated rates for a specific pincode/weight)


6. AWB Allocation & Pre-Allotted Pools
Manages physical tracking codes (Air Waybills) pre-allocated from courier partners or generated dynamically via API.
Endpoints:
- AWB Assignment:
  - POST /courier/awb/assign (Trigger single AWB assignment/generation)
  - POST /courier/awb/internal/assign-batch (Internal service call: Trigger batch AWB assignment for executions)
  - POST /courier/awb/upload-pickup-awb (Direct upload and associate pickup AWB)
- Pre-Allotted AWB Pools (Manual AWB banks):
  - GET /courier/pre-awb/summary/{courierId} (Retrieve counts of available/used pre-allotted AWBs)
  - POST /courier/pre-awb/manual-allot (Manually allot an AWB from the pool to a specific execution)
  - POST /courier/pre-awb/upload (Bulk upload pre-allotted AWB lists via Excel)
  - DELETE /courier/pre-awb/clear/{courierId} (Purge unused pre-allotted AWBs from the pool for a courier)


7. Invoice & Label Registry (Invoice List)
Manages the registry, status check, and details spreadsheet download of invoices.
Endpoints:
- GET /courier/invoice/pending-counts (Get count of executions pending invoice print grouped by client/date)
- GET /courier/invoice/list/download (Download complete spreadsheet details list of invoices)
- POST /courier/invoice/internal/create-entries (Internal service call: Initialize invoice registry entries for executions)
- POST /courier/invoice/internal/create-external-batch (Internal service call: Create invoice entries for external supplier shipments)
- POST /courier/invoice/internal/deactivate-by-executions (Internal service call: Cancel/deactivate invoice entries due to courier release or cancellations)
- PUT /courier/invoice/internal/execution/{executionId}/courier-status (Internal service call: Update courier tracking status)
- PUT /courier/invoice/internal/update-shipping-external (Internal service call: Update external supplier shipping & tracking details)
- POST /courier/invoice/lost/{executionRefNo} (Mark execution courier shipment as lost)
- POST /courier/invoice/lost/bulk (Bulk mark execution courier shipments as lost)


8. Customer Invoice & Shipping Label Printing
Renders and prints commercial customer invoices and shipping labels in different layout formats (e.g., 1x1 thermal labels, 1x4 sticker sheets, or multi-A4 layouts).
Endpoints:
- PDF Layout Rendering:
  - POST /courier/invoice/print/1x1/{groupId} (Generate PDF in 1x1 layout - thermal label)
  - POST /courier/invoice/print/1x4/{groupId} (Generate PDF in 1x4 layout - standard sticker sheet)
  - POST /courier/invoice/print/multi/{groupId} (Generate PDF in multi layout - A4 commercial invoice)
  - POST /courier/invoice/print/single-reship/{executionId} (Generate PDF for single reshipment invoice)
- Reprints:
  - POST /courier/invoice/reprint/1x1 (Reprint invoice PDF in 1x1 layout)
  - POST /courier/invoice/reprint/1x4 (Reprint invoice PDF in 1x4 layout)
  - POST /courier/invoice/reprint/multi (Reprint invoice PDF in multi layout)
- Test Print:
  - GET /courier/invoice/test-print/{layout} (Generate a dummy test print sheet)


9. Courier Outscan (Warehouse Dispatch Scan)
Allows barcode scanning of executions/AWBs to mark packages outscanned (status OUTSCAN_DONE) and trigger local inventory dispatches.
Endpoints:
- POST /courier/invoice/status/update (Directly update logistics status to OUTSCAN_DONE - e.g., via scanner integration - internally transitions execution in lorder)
- POST /courier/invoice/status/upload (Bulk upload status transitions via Excel sheet - e.g., outscan scan logs - internally transitions execution in lorder)


10. Courier Dispatches & Handover Manifests
Handles daily courier manifests / pickup handover sheets to dispatch packages out of the warehouse.
Endpoints:
- GET /courier/manifests/pending (Retrieve list of executions in printed status awaiting manifest generation)
- POST /courier/manifests/send (Generate manifest and transition executions status to outscan pending)
- GET /order/execution/share_to_courier (Generate dispatch manifest report for couriers - NDJSON or Excel)
  *(Note: This endpoint is hosted in the **lorder** microservice but functionally belongs to the courier dispatch workflow).*


11. Logistics Returns Processing
Handles warehouse receipt and processing of returned packages (RTO failed deliveries or customer reverse pickup returns) and reporting their quality state to revert stock.
Endpoints:
- POST /courier/invoice/status/update (Status transition scanner: Transition package status and route stock in lstock)
  - **RTO Return**: Set `statusId = 13` (`RETURNED`), `stockStatus = "AVAILABLE"` (or null)
  - **DTO Return (Reverse Pickup Receipt)**: Set `statusId = 20` (`REVERSE_PICKUP_RECEIVED`), `stockStatus = "AVAILABLE"` *(Note: Intermediate reverse pickup statuses 16, 17, 18, 19 are updated directly in lorder)*
  - **Damaged Return**: Set `statusId = 13` or `20`, and `stockStatus = "DAMAGED"`
  - **Defective Return**: Set `statusId = 13` or `20`, and `stockStatus = "DEFECTIVE"`
- POST /courier/invoice/status/upload (Bulk upload status transitions and quality parameters via Excel sheet - e.g., RTO/DTO scan logs containing `stockStatus` column)


12. Master Setup & Configurations
Endpoints for importing base logistics tables (zones, postal registers, carrier rates, weight adjustments) and querying outbox synchronization deltas.
Endpoints:
- POST /courier/pincodes/upload (Bulk upload master pincode records)
- GET /courier/pincodes/list (Query master pincode list)
- GET /courier/pincodes/download (Download complete master pincode database)
- GET /courier/pincodes/internal/sync-delta (Delta sync endpoint for pincodes)
- GET /courier/services/internal/sync-delta-outbox (Delta outbox query for internal service synchronization)
- GET /courier/serviceable-pincodes/internal/sync-delta-outbox (Delta outbox query for internal pincode sync)
- POST /courier/rates/upload (Bulk upload courier shipping rate cards)
- POST /courier/zones/upload (Bulk upload courier zone matrix configuration)
- POST /courier/actuals/upload (Upload actual weight spreadsheet from courier partners for audit reconciliation)
- GET /courier/proposed-average-prices (Retrieve average shipping cost calculations)
- POST /courier/pincodes/block-info (Query blocking status details for pincodes)
- POST /courier/pincodes/block-unblock (Bulk block or unblock pincodes for specific couriers)


13. Webhooks & Carrier Integrations
Receives real-time tracking events and AWB booking callbacks from third-party logistics integrations.
Endpoints:
- POST /api/v1/webhook/bluedart (Callback webhook for Bluedart tracking status updates)
- POST /internal/reconcile/sync (Trigger manual verification and reconciliation sync)


Lcourier Service
├── 🚚 Courier Partner Directory
│   ├── GET /courier (List courier partners)
│   ├── POST /courier (Register courier)
│   └── DELETE /courier/{id} (Deactivate courier)
│
├── ⚙️ Courier Services & Modes
│   ├── GET /courier/services (List services)
│   └── POST /courier/services (Add service)
│
├── 📍 Pincode Serviceability Setup
│   ├── POST /courier/pincodes/upload (Bulk upload serviceable pincodes spreadsheet)
│   ├── GET /courier/serviceable-pincodes (List serviceable areas)
│   └── POST /courier/serviceable-pincodes (Add single serviceable pincode)
│
├── 🚫 Blocking & Exclusions (Blocklists)
│   ├── Client Exclusions:
│   │   ├── GET /courier/exclusions/client/all
│   │   └── POST /courier/exclusions/client
│   └── Product Exclusions:
│       ├── GET /courier/exclusions/product/all
│       └── POST /courier/exclusions/product
│
├── 🏷️ AWB Pools & Allotment
│   ├── POST /courier/awb/internal/assign-batch (Assign AWB in bulk)
│   └── Pre-Allotted AWB Banks:
│       ├── GET /courier/pre-awb/summary/{courierId}
│       └── POST /courier/pre-awb/upload (Upload AWB list)
│
├── 📋 Invoice & Label Registry (Invoice List)
│   ├── GET /courier/invoice/pending-counts (Pending invoice counts)
│   ├── GET /courier/invoice/list/download (Download complete invoice sheet)
│   ├── POST /courier/invoice/internal/create-entries (Create invoice registry)
│   └── PUT /courier/invoice/internal/execution/{executionId}/courier-status (Log tracking status)
│
├── 🖨️ Customer Invoice & Label Printing
│   ├── POST /courier/invoice/print/1x1/{groupId} (Print 1x1 Thermal Label)
│   ├── POST /courier/invoice/print/1x4/{groupId} (Print 1x4 Sticker Sheet)
│   ├── POST /courier/invoice/print/multi/{groupId} (Print A4 Multi-Invoice)
│   └── POST /courier/invoice/reprint/multi (Reprint invoice PDF)
│
├── 📤 Courier Outscan (Warehouse Scan)
│   ├── POST /courier/invoice/status/update (Barcode scan status update)
│   └── POST /courier/invoice/status/upload (Excel outscan upload)
│
├── ↩️ Logistics Returns Processing (RTO/DTO)
│   ├── POST /courier/invoice/status/update (RTO/DTO scan update & quality routing)
│   └── POST /courier/invoice/status/upload (Bulk RTO/DTO quality updates)
│
├── 📦 Courier Handover & Manifests
│   ├── GET /courier/manifests/pending (Pending manifests)
│   ├── POST /courier/manifests/send (Commit manifest & outscan)
│   └── GET /order/execution/share_to_courier (Handover manifest report - **hosted in lorder**)
│
├── 📥 Master Setup & Configurations
│   ├── POST /courier/pincodes/upload
│   ├── POST /courier/rates/upload
│   ├── POST /courier/zones/upload
│   ├── POST /courier/actuals/upload (Courier actual weight sheet upload)
│   ├── GET /courier/services/internal/sync-delta-outbox (Sync service outbox delta)
│   └── GET /courier/serviceable-pincodes/internal/sync-delta-outbox (Sync pincode outbox delta)
│
└── 🔔 Webhooks & Carrier Integrations
    ├── POST /api/v1/webhook/bluedart (Callback webhook for Bluedart tracking status updates)
    └── POST /internal/reconcile/sync (Trigger manual verification and reconciliation sync)
