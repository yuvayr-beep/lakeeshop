lstock menu
Here is the operational menu tree for the lstock stock management microservice, mapped as a chronological lifecycle of events.

system sent event endpoint (SSE)
Method: GET
Path: /stock/availability/{productId}/stream
Headers: Accept: text/event-stream
Response Stream: Pushes the total available stock quantity in real-time.

Menus:

1. Product Relations
Endpoints:
POST /stock/products/relations (Create relationship mapping)
DELETE /stock/products/relations/{childId} (Break relationship by Child SKU ID)
GET /stock/products/relations/parent-list (Stream parent relationships list - NDJSON)
GET /stock/products/relations/hierarchy/{productId} (Retrieve hierarchical tree for specific SKU)

2. Purchase Orders
Endpoints:
POST /stock/purchase-orders (Create draft PO)
PUT /stock/purchase-orders/{id} (Update PO metadata)
PATCH /stock/purchase-orders/{id}/status (Submit / Approve / Cancel status transitions)
PATCH /stock/purchase-orders/{id}/email-status (Track email status)
POST /stock/purchase-orders/{id}/send-email (Send email order to vendor)
GET /stock/purchase-orders/{id}/pdf (Generate and download PO PDF)
POST /stock/purchase-order-item (Add item to PO)
PATCH /stock/purchase-order-item/{id}/status (Modify individual PO Item status)

- Auto-PO Config & Trigger
GET /stock/auto-po/config (Get all configurations as NDJSON)
GET /stock/auto-po/audit-logs (Stream Auto-PO audit logs as NDJSON)
POST /stock/auto-po/config (Create or Update a configuration)
DELETE /stock/auto-po/config/{id} (Delete a specific configuration)
POST /stock/auto-po/trigger (Manually trigger auto-PO generation)
GET /stock/auto-po/product-override/template (Download product override template Excel sheet)
POST /stock/auto-po/product-override/upload (Upload product overrides Excel sheet)


3. Receive Stock
Endpoints:
- Receive
GET stock/purchase-orders/items/lookup (Used to populate PO selectors when the user enters products.)
GET /stock/grn/validate-invoice / /duplicate-invoice (Invoice duplicates validators when user enters grn number)
GET /stock/grn/duplicate-invoice (Returns more details if the invoice number already exists (e.g. returns matching GRN number).)
GET /stock/grn/validate-price (Checks current invoice unit price against the last GRN verified purchase price for this supplier and product, flagging discrepancies.)
GET /stock/summary/{productId}/breakdown (total qty and list of parent, child and its qty)
GET /order/executions/product/{productId}/preorders (all preorders for the particular product.)
GET /prod/products/{productId} (to get hsn and tax)
POST /stock/grn (Create GRN / Log incoming invoice & quantities / also triggers immediate PO and PO item status updates / cost price update)

- Verify
PUT /stock/grn/{id}/verify (Verify GRN; receivingLocationId is optional. If omitted, it automatically receives units into a "STAGING" location for the GRN's warehouse)

- Damaged
POST /stock/damaged (source as GRN)

4. Transfer
Endpoints:
POST /stock/transfer (Execute bulk transfer by passing productId, quantity, sourceLocationId, and destinationLocationId)

5. Adjust Stock
Endpoints:
POST /stock/adjustments (Directly adjust status of a single unit)
POST /stock/adjustments/events (Create multi-line Stock Adjustment Event)
POST /stock/adjustments/events/{id}/lines (Add/update adjustment lines)
PATCH /stock/adjustments/events/{id}/status (Approve and commit adjustment event)
POST /stock/damaged (source as WAREHOUSE)

6. Damaged & Defective
Endpoints:
POST /stock/damaged (Log damaged/defective unit entry)
POST /stock/damaged-action (Record action/resolution on quarantined item)
GET /stock/damaged/template (Download Excel template)
POST /stock/damaged/upload (Upload bulk damaged records from Excel)

7. Stocktaking (Physical Count Audit)
Workspace Concept: Manage counting events, count sessions, count sheets, download templates, and upload physical counts.
Endpoints:
POST /stock/stocktaking-events (Create stocktaking audit event)
PUT /stock/stocktaking-events/{id} (Update event metadata)
PATCH /stock/stocktaking-events/{id}/status (Approve/Complete event status)
POST /stock/stocktaking-sessions (Open count session)
PATCH /stock/stocktaking-sessions/{id}/status (Transition count session status)
GET /stock/stocktaking-sessions/{id}/template (Download counting template)
POST /stock/stocktaking-sessions/{id}/upload-open-stock (Upload physical counts)
POST /stock/stocktaking-details (Log/update physical count details)
DELETE /stock/stocktaking-details/{id} (Soft delete count details)

8. Reports

All reports support three format channels:
- Unpaginated NDJSON stream
- Paginated NDJSON stream (size and page query params)
- Excel file download (small range <= 10 days) or async job-triggered download (large range > 10 days)

1. Current Stock Status Report
   - GET /stock/reports/current-status (Unpaginated NDJSON)
   - GET /stock/reports/current-status/page (Paginated NDJSON)
   - GET /stock/reports/current-status/excel (Excel download)
   - Columns: Product ID, Code, Name, Brand, Available Qty, Average Courier Price, Original Cost, Original Value, Latest Cost, Latest Value

2. Historic Stock Status Report
   - GET /stock/reports/historic-status (Unpaginated NDJSON)
   - GET /stock/reports/historic-status/page (Paginated NDJSON)
   - GET /stock/reports/historic-status/excel (Excel / Job)
   - Columns: Product ID, Code, Name, Brand, Open Stock Qty, Closing Stock Qty, Original Cost, Original Value, Latest Cost, Latest Value

3. Ledger Report
   - GET /stock/reports/ledger (Unpaginated NDJSON)
   - GET /stock/reports/ledger/page (Paginated NDJSON)
   - GET /stock/reports/ledger/excel (Excel / Job)
   - Modes:
     * Consolidated: Grouping continuous ORDER_EXECUTION entries by reference ID
     * Non-consolidated: Chronological raw log entries
   - Columns: Chronological records, In Qty, Out Qty, running balance column

4. Stock Movement Report (Audit)
   - GET /stock/reports/stock-movement (Unpaginated NDJSON)
   - GET /stock/reports/stock-movement/page (Paginated NDJSON)
   - GET /stock/reports/stock-movement/excel (Excel / Job)
   - Columns: Product details, Opening Stock (Qty, Cost, Value), Closing Stock (Qty, Cost, Value), Purchases, Sales, Tax breakdowns (Taxable, Tax Amount, Total Value)

5. Stagnant Stock Report
   - Redirects to external Python Report Service

6. Slow Moving Stock Report
   - Redirects to external Python Report Service

7. Addition Report (Stock Inflows Only)
   - GET /stock/reports/additions (Unpaginated NDJSON)
   - GET /stock/reports/additions/page (Paginated NDJSON)
   - GET /stock/reports/additions/excel (Excel / Job)
   - Filters: startDate, endDate, productId, brand, locationId, additionType (PURCHASE, RTO, DTO, OPEN_STOCK, OTHER)

8. Adjustment Report (Inventory Deductions Excluding Sales)
   - GET /stock/reports/adjustments (Unpaginated NDJSON)
   - GET /stock/reports/adjustments/page (Paginated NDJSON)
   - GET /stock/reports/adjustments/excel (Excel / Job)
   - Filters: startDate, endDate, productId, brand, locationId, adjustmentType (SCRAP, WRITE_OFF, DAMAGE, etc.)

9. Supplier Invoice Report (GRN Items Audit)
   - GET /stock/reports/supplier-invoices (Unpaginated NDJSON)
   - GET /stock/reports/supplier-invoices/page (Paginated NDJSON)
   - GET /stock/reports/supplier-invoices/excel (Excel / Job)
   - PUT /stock/reports/supplier-invoices/{id} (Edit grn item price, qty, invoice no, and invoice date)

10. Ad-hoc Report (Ad-hoc Procurement Verification)
    - GET /stock/reports/adhoc-procurements (Unpaginated NDJSON)
    - GET /stock/reports/adhoc-procurements/page (Paginated NDJSON)
    - GET /stock/reports/adhoc-procurements/excel (Excel / Job)
    - PUT /stock/reports/adhoc-procurements/{id} (Edit ad-hoc supplier product details)

11. Export Job Status & Download Tracking
    - GET /stock/reports/export-jobs/{jobId} (Poll job execution status: PENDING, PROCESSING, SUCCESS, FAILED)
    - GET /stock/reports/download/{jobId} (Download generated Excel sheet)


Section III: MASTERS (Configuration registries)
1. Warehouse Setup
Controller: 

WarehouseController.java
Endpoints:
POST /stock/warehouse (Add new warehouse)
PUT /stock/warehouse/{id} (Update warehouse details)
DELETE /stock/warehouse/{id} (Deactivate warehouse status)
GET /stock/warehouse/active (Stream all active warehouses - NDJSON)
GET /stock/warehouse/{id} (Get warehouse by ID)
2. Inventory Storage Locations
Controller: 

InventoryLocationController.java
Endpoints:
POST /stock/location (Add new location)
PUT /stock/location/{id} (Update location mapping)
DELETE /stock/location/{id} (Deactivate location)
GET /stock/location/active (Stream all active locations - NDJSON)
GET /stock/location/{id} (Get location details)
GET /stock/location/warehouse/{warehouseId} (Stream locations matching warehouse - NDJSON)
3. Product Relations (Packaging Hierarchies)
Controller: 

ProductRelationController.java
Endpoints:
POST /stock/products/relations (Create relationship mapping)
DELETE /stock/products/relations/{childId} (Break relationship by Child SKU ID)
GET /stock/products/relations/parent-list (Stream parent relationships list - NDJSON)
GET /stock/products/relations/hierarchy/{productId} (Retrieve hierarchical tree for specific SKU)


Lstock Service
├── 🔗 Product Relations (Packaging Hierarchies)
│   ├── POST /stock/products/relations
│   │   └── Create parent-child mapping for variance tracking (e.g. Size/Color variants)
│   ├── DELETE /stock/products/relations/{childId}
│   │   └── Remove a child variant mapping from its parent
│   ├── GET /stock/products/relations/parent-list
│   │   └── Stream all parent products and associated variants (NDJSON format)
│   └── GET /stock/products/relations/hierarchy/{productId}
│       └── View hierarchical structure/hierarchy tree for a parent or child ID
│
├── 📋 Stocktaking & Cycle Counting (Auditing)
│   ├── Stocktaking Events
│   │   ├── POST /stock/stocktaking-events
│   │   │   └── Create a new inventory audit/cycle count event
│   │   ├── PUT /stock/stocktaking-events/{id}
│   │   │   └── Edit an event's parameters (whilst in DRAFT status)
│   │   ├── PATCH /stock/stocktaking-events/{id}/status
│   │   │   └── Transition event status (e.g. DRAFT -> ACTIVE -> CLOSED)
│   │   ├── GET /stock/stocktaking-events/{id}
│   │   │   └── Retrieve details of a specific audit event
│   │   └── GET /stock/stocktaking-events
│   │       └── Stream list of audit events matching type and status (NDJSON format)
│   │
│   ├── Count Sessions
│   │   ├── POST /stock/stocktaking-sessions
│   │   │   └── Start a count session under a specific audit event
│   │   ├── PATCH /stock/stocktaking-sessions/{id}/status
│   │   │   └── Submit, approve, or cancel a count session (updates system levels)
│   │   ├── GET /stock/stocktaking-sessions/{id}
│   │   │   └── Get detailed session statistics
│   │   └── GET /stock/stocktaking-sessions
│   │       └── Stream count sessions filtered by event or status (NDJSON format)
│   │
│   ├── Physical Counting Lines
│   │   ├── POST /stock/stocktaking-details
│   │   │   └── Add or update the physical unit count/mapping found in a specific location
│   │   ├── PUT /stock/stocktaking-details/{id}
│   │   │   └── Edit a specific physical count record
│   │   ├── DELETE /stock/stocktaking-details/{id}
│   │   │   └── Soft-delete/void a physical count line
│   │   └── GET /stock/stocktaking-details
│   │       └── Stream recorded counts by session, location, or product (NDJSON format)
│   │
│   └── Excel Audit Integration
│       ├── GET /stock/stocktaking-sessions/{id}/template
│       │   └── Generate and download a cycle counting Excel sheet with system products/locations
│       └── POST /stock/stocktaking-sessions/{id}/upload-open-stock
│           └── Upload a filled Excel count template and post system inventory adjustments
│
├── 🛠️ Inventory Adjustments & Cycles
│   ├── Single Unit Corrections
│   │   └── POST /stock/adjustments
│   │       └── Correct a specific inventory unit (e.g., mark as missing, damaged, or found)
│   └── Event-Based Adjustments
│       ├── POST /stock/adjustments/events
│       │   └── Create a batch inventory adjustment event (e.g. cycle correction, bulk write-off)
│       ├── POST /stock/adjustments/events/{id}/lines
│       │   └── Add or edit line details to a batch adjustment event (draft status only)
│       ├── PATCH /stock/adjustments/events/{id}/status
│       │   └── Submit/Approve/Cancel a batch adjustment to commit and post to inventory levels
│       ├── GET /stock/adjustments/events/{id}
│       │   └── View specific adjustment event details
│       ├── GET /stock/adjustments
│       │   └── Stream list of adjustment events (NDJSON format)
│       └── GET /stock/adjustments/events/{id}/lines
│           └── Stream lines inside an adjustment event (NDJSON format)
│
├── ⚙️ Automatic PO Replenishment (Auto-PO)
│   ├── Configuration Settings
│   │   ├── GET /stock/auto-po/config
│   │   │   └── Stream brand-specific overrides & settings (NDJSON format)
│   │   ├── POST /stock/auto-po/config
│   │   │   └── Save/Update brand configurations & runs (updates triggers)
│   │   └── DELETE /stock/auto-po/config/{id}
│   │       └── Remove a brand override (reverts items to default parameters)
│   └── Replenishment Execution
│       └── POST /stock/auto-po/trigger
│           └── Manually trigger the replenishment calculations to create/consolidate draft POs
│
├── 📝 Purchase Order (PO) Management
│   ├── PO Header Operations
│   │   ├── GET /stock/purchase-orders
│   │   │   └── Query & filter POs by dates, products, brand, supplier, status (NDJSON format)
│   │   ├── POST /stock/purchase-orders
│   │   │   └── Create a new manual draft PO header
│   │   ├── GET /stock/purchase-orders/{id}
│   │   │   └── Retrieve PO details including total SKUs, quantities, and received counts
│   │   ├── POST /stock/purchase-orders/{id}/send-email
│   │   │   └── Queue and email the PO PDF to the mapped supplier
│   │   ├── GET /stock/purchase-orders/{id}/pdf
│   │   │   └── Generate and download the standard PO layout PDF
│   │   └── GET /stock/purchase-orders/items/lookup
│   │       └── Open emailed PO items lookup stream for GRN entry dropdown selection (NDJSON format)
│   └── PO Line Item Operations
│       ├── GET /stock/purchase-order-item/po/{poId}
│       │   └── Retrieve all line items for a PO with calculated received and pending quantities
│       └── PUT /stock/purchase-order-item/{itemId}/status
│           └── Manually adjust line status or quantities
│
├── 📥 Goods Receipt Note (GRN) Operations
│   ├── Receive Shipments & Create GRN
│   │   ├── POST /stock/grn
│   │   │   └── Create GRN entry, calculate unit cost, create inventory units/ledger, and auto-allocate preorders
│   │   └── GET /stock/grn/duplicate-invoice
│   │       └── Check if an invoice number already exists for a supplier
│   ├── Verify Receipts
│   │   └── PUT /stock/grn/{id}/verify
│   │       └── Verify GRN invoice, reconcile final product cost timeline, and update PO item/header status
│   └── Verification Checks
│       ├── GET /stock/grn/validate-price
│       │   └── Check current invoice unit price against the last GRN verified purchase price
│       └── GET /prod/products/{productId}
│           └── External catalog lookup to retrieve product's HSN code and Tax Rate
│
├── 🚚 Warehouse & Storage Locations
│   ├── Internal Stock Transfers
│   │   └── POST /stock/transfer
│   │       └── Bulk transfer inventory units between locations/staging areas
│   ├── Physical Warehouses
│   │   ├── POST /stock/warehouse
│   │   ├── PUT /stock/warehouse/{id}
│   │   ├── DELETE /stock/warehouse/{id}
│   │   ├── GET /stock/warehouse/active
│   │   └── GET /stock/warehouse/{id}
│   └── Storage Locations (Aisles, Racks, Bins)
│       ├── POST /stock/location
│       ├── PUT /stock/location/{id}
│       ├── DELETE /stock/location/{id}
│       ├── GET /stock/location/active
│       ├── GET /stock/location/warehouse/{warehouseId}
│       └── GET /stock/location/{id}
│
├── ⚠️ Damaged & Defective Inventory
│   ├── Logging & Actions
│   │   ├── POST /stock/damaged
│   │   │   └── Log damaged unit from GRN, WAREHOUSE, COURIER_RETURN, or REVERSE_PICKUP
│   │   ├── POST /stock/damaged-action
│   │   │   └── Execute resolution actions (Scrap, Write-off, Repair, Restock as Refurbished)
│   │   └── GET /stock/damaged/action-types
│   │       └── View list of supported resolution action types
│   ├── Bulk Audits
│   │   ├── GET /stock/damaged/template
│   │   │   └── Download Excel template for bulk damaged logging
│   │   └── POST /stock/damaged/upload
│   │       └── Upload filled Excel template to bulk register damaged stock
│   └── Reporting & Logs
│       ├── GET /stock/damaged
│       │   └── Stream filtered list of quarantined damaged units (NDJSON format)
│       ├── GET /stock/damaged-audit
│       │   └── Stream audit trail logs for specific damaged items
│       └── GET /stock/damaged/download
│           └── Download filtered list of quarantined items as an Excel spreadsheet
│
└── 📊 Reports & Real-Time Dashboards
    ├── Stock summary
    │   ├── GET /stock/summary
    │   │   └── Stream individual and rolled-up hierarchical stock summaries (NDJSON format)
    │   ├── GET /stock/summary/{productId}
    │   │   └── View individual and rolled-up summaries for specific product
    │   └── GET /stock/summary/{productId}/breakdown
    │       └── View detailed parent/child variations stock breakdown
    ├── Real-Time Availability Streams
    │   ├── GET /stock/availability/{productId}
    │   │   └── Retrieve total available stock quantity (rolled up by hierarchy)
    │   └── GET /stock/availability/{productId}/stream
    │       └── Server-Sent Events (SSE) stream pushing total available stock quantity in real-time
    ├── Daily Closing Stock Snapshots
    │   ├── GET /stock/snapshots
    │   │   └── Stream daily closing stock snapshots (NDJSON format)
    │   ├── GET /stock/snapshots/excel
    │   │   └── Download Excel report comparing original cost vs. latest cost valuations
    │   └── POST /stock/snapshots/generate
    │       └── Manually trigger or backfill closing stock snapshot generation for any date
    ├── Standard Stock Reports (NDJSON Streams, Paginated Streams, Exporters)
    │   ├── GET /stock/reports/current-status
    │   │   └── Current Stock Status Report (original vs. latest value + courier cost)
    │   ├── GET /stock/reports/historic-status
    │   │   └── Historic Stock Status Report (opening vs. closing stock + costs)
    │   ├── GET /stock/reports/ledger
    │   │   └── Ledger Report (consolidated dispatches + chronological running balance)
    │   ├── GET /stock/reports/stock-movement
    │   │   └── Stock Movement Audit Report (purchase/sales qty + taxable/tax split values)
    │   ├── GET /stock/reports/additions
    │   │   └── Addition Report (purchase, RTO, DTO, open stock uploads inflows only)
    │   ├── GET /stock/reports/adjustments
    │   │   └── Adjustment Report (scrap, damage, theft, write-offs deductions only)
    │   ├── GET /stock/reports/supplier-invoices
    │   │   └── Supplier Invoice verification and editing (PUT edit endpoints enabled)
    │   ├── GET /stock/reports/adhoc-procurements
    │   │   └── Ad-hoc procurement verification and editing (PUT edit endpoints enabled)
    │   ├── GET /stock/reports/export-jobs/{jobId}
    │   │   └── Check status of background large file Excel exports
    │   └── GET /stock/reports/download/{jobId}
    │       └── Download finalized spreadsheet reports
    └── Preorders
        └── GET /order/executions/product/{productId}/preorders
            └── External order lookup to stream active preorder executions for a product hierarchy


Lstock Service
└── ⚙️ Master Data Management
    ├── 🏢 Warehouse Masters
    │   ├── POST /stock/warehouse
    │   │   └── Create a new physical or virtual warehouse
    │   ├── PUT /stock/warehouse/{id}
    │   │   └── Update warehouse name/details
    │   ├── DELETE /stock/warehouse/{id}
    │   │   └── Soft-deactivate a warehouse
    │   ├── GET /stock/warehouse/active
    │   │   └── Stream all active warehouses (NDJSON format)
    │   └── GET /stock/warehouse/{id}
    │       └── View details of a specific warehouse
    │
    ├── 📍 Inventory Location Masters (Aisles, Racks, Bins)
    │   ├── POST /stock/location
    │   │   └── Create a new inventory staging/storage location
    │   ├── PUT /stock/location/{id}
    │   │   └── Update location type, name, or metadata
    │   ├── DELETE /stock/location/{id}
    │   │   └── Deactivate a location
    │   ├── GET /stock/location/active
    │   │   └── Stream all active locations globally (NDJSON format)
    │   ├── GET /stock/location/warehouse/{warehouseId}
    │   │   └── Stream all storage locations inside a specific warehouse (NDJSON format)
    │   └── GET /stock/location/{id}
    │       └── View specific location parameters
    │
    └── 🔗 Product Hierarchy Masters (Parent-Variant Relations)
        ├── POST /stock/products/relations
        │   └── Create parent-child mapping for variance tracking (e.g. Size/Color variants)
        ├── DELETE /stock/products/relations/{childId}
        │   └── Remove a child variant mapping from its parent
        ├── GET /stock/products/relations/parent-list
        │   └── Stream all parent products and associated variants (NDJSON format)
        └── GET /stock/products/relations/hierarchy/{productId}
            └── View hierarchical structure/hierarchy tree for a parent or child ID
