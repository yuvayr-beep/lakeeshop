lorder menu
Here is the operational menu tree for the lorder order management microservice, mapped as a chronological lifecycle of events.

system sent event endpoint (SSE)
Method: GET
Path: /order/sse/header-aggregates / /order/sse/dashboard-metrics
Headers: Accept: text/event-stream
Response Stream: Pushes real-time order dashboard header aggregates and daily metrics.

Menus:

1. Order Ingestion (Wizard Format)
This menu is designed as a step-by-step wizard system to handle batch induction, validation, correction, and final submission of orders.

1.1 Batch Order Offline (Excel Upload)
Flow & Wizards:
- Step 1: Upload & Initial Counts
  - User selects the Client and uploads the Order Excel file. The system parses and copies records to Staging.
  - The UI displays total records, initial parsed pass/fail counts, and any critical parsing failure reasons.
- Step 2: Validation & Corrections Wizard
  - Shows multiple tabs of validation failure categories (e.g. duplicate check, product serviceability, pincode availability, address validation).
  - Displays dynamic pass, fail, and total counts.
  - Users can correct staging row values inline.
  - Features a "Refresh / Revalidate" option to re-trigger validation on modified staging rows and update counts on the fly.
- Step 3: Final Confirmation & Submission
  - Shows the final total pass and fail validation counts.
  - Action Controls:
    * Abort: Cancels the entire batch (batch status updated to CANCELLED).
    * Back: Re-opens the Validation Wizard to make further corrections.
    * Finish: Submits the batch (invokes submit-batch to generate active Parent/Child/Execution records).

Endpoints:
- POST /order/batch/upload (Upload excel file for order batch parsing and staging)
- DELETE /order/batch/{batchId} (Delete order batch, staging data, errors, and files - Abort action for unsubmitted batches)
- DELETE /order/batch/admin/soft-delete/{batchId} (Super Admin soft-delete batch and live orders if all executions are in ACCEPTED or CANCELLED status)
- GET /order/batch/list (List order batches by date, client, batch type, and sourceId for Excel vs API filtering)
- GET /order/batch/{batchId}/download/original (Download original uploaded excel file)
- POST /order/batch/download (Download unified excel containing multiple batches)
- POST /order/batch/export/order-details (Initiate background export job for Old ERP layout)
- GET /order/batch/export/job/{jobId} (Check status of background export job)
- GET /order/batch/download/file/{fileName} (Download finalized export spreadsheet file)
- GET /order/batch/parser-error/{batchId} (Stream parser errors for a batch - NDJSON)


1.2 Batch Order Online (API Ingestion)
Flow & Wizards:
- Combine Batch option:
  - Users have an option to combine all pending online (API) orders of a particular client into a single fresh batch.
  - When combined, only passed/validated orders are moved to the new combined batch.
  - Old API ingestion batches whose passed orders have been moved are updated to status "MOVED".
  - A fresh combined batch is created, and batch numbers are updated in staging for those rows.
- Same wizard flow as offline applies next:
  - The combined batch goes through the Validation & Corrections Wizard, where the user runs validation (`POST /order/staging/validate/{batchId}`).
  - The UI shows the list of orders with filter options (PASS/FAIL) to review counts and errors.
  - An edit option is available for corrections. Corrected rows are revalidated inline (`POST /order/staging/revalidate/{stagingId}`).
  - Finally, the user goes to the Final Confirmation step and submits the combined batch (Finish invokes `/order/submission/submit-batch` to convert passed orders, Abort cancels).

Endpoints:
- POST /order/create (Ingest API orders - Bulk)
- GET /order/api-order-file (Download pending API orders report as excel/ndjson)
- POST /order/batch/combine-online (Combine all pending passed API orders of a client into a fresh batch, marking old batches as MOVED)
- POST /order/submission/submit-batch (Convert combined batch staging rows into active Parent/Child/Execution records)


1.3 Batch Order Ad-hoc
Flow & Invoicing:
- Single-Screen Induction:
  - In a single screen, the user selects the Client, enters ad-hoc order details (e.g. program, dates), and enters Bill-To / Ship-To address details.
  - Below the details, the user adds products line-by-line.
- Product Addition Options:
  - Catalog Product: Selects a standard pre-configured catalog product.
  - Ad-hoc Product: If selecting an ad-hoc product, the user enters the supplier and supplier invoice details.
- Ad-hoc Supplier Invoice Saving:
  - Ad-hoc product supplier details are saved in the ad-hoc invoice table in `lstock` database.
  - System automatically resolves and populates the appropriate HSN code and Tax rate.
- Submission & Output:
  - Upon submission, the system generates a commercial invoice containing the Bill-To, Ship-To, and product details.

Endpoints:
- POST /order/adhoc-orders (Create an adhoc parent/child order structure)
- POST /order/adhoc-orders/assign (Map adhoc stock assignment and pack reference)
- POST /stock/adhoc-procurement/invoices (Create supplier invoice and log procurement details in `lstock`)
- POST /courier/invoice/print/multi/{groupId} (Print / download PDF commercial customer invoice in multi format in `lcourier` - Only multi invoice layout is applicable for ad-hoc)


2. Order Validation & Correction
This menu handles auditing staging records, displaying validation errors, and resolving errors through row-level updates or master registry updates.

Error Correction Strategies (Possibilities):
- **Row-Level Inline Updates**: For errors specific to an order row:
  - *Mobile Errors*: User copies the value from `alternateMobile` into `mobile`.
  - *Short Addresses*: User expands or corrects `addressLine1`, `addressLine2`, `landmark` after maps verification.
  - *Typos*: Corrects incorrect client product codes, quantities, pricing, names, etc.
  - *Method*: Execute `PUT /order/staging/{stagingId}` followed by `POST /order/staging/revalidate/{stagingId}`.
- **Master Registry Additions**: For errors where the order details are correct, but the system is missing the configuration in its master tables:
  - *City Not Found for Pincode*: Rather than altering a correct address on the order, the user adds the new pincode-city-state mapping globally.
  - *Method*: Invoke `POST /order/pincode` to insert the mapping into the pincode master. Then, trigger `POST /order/staging/revalidate/{stagingId}` (or bulk validation) so the row validates against the updated master without changing order details.
  - *Product Not Shared*: If the order product is correct but has not yet been shared with the client/business unit.
  - *Method*: Invoke `POST /prod/client-product-share` (in the `lprod` microservice) to configure the sharing details (or bulk upload using `POST /prod/client-product-share/upload`). Approve the share using `POST /prod/client-product-share/approve`. Then, trigger `POST /order/staging/revalidate/{stagingId}` to revalidate and clear the error.

Endpoints:
- POST /order/staging/validate/{batchId} (Trigger asynchronous validation engine for a batch)
- POST /order/staging/revalidate/{stagingId} (Manually trigger single-row validation - **Synchronous**: returns the updated `OrderStaging` record directly in response, no polling needed)
- PUT /order/staging/{stagingId} (Update incorrect data elements in a staging order row)
- GET /order/staging/summary/{batchId} (Get validation status aggregates/summary counts for a batch)
- GET /order/staging/batch/{batchId} (Stream active staging rows for a batch - NDJSON)
- GET /order/staging/error/{stagingId} (Stream validation errors for a staging row - NDJSON)
- GET /order/staging/error-orders (Stream staging rows matching a validation error code - NDJSON)

### Batch Validation Lifecycle & Frontend Polling
When the user triggers bulk batch validation, the engine runs asynchronously in the background. The frontend must monitor its progress using a short-polling loop:
1. **Trigger Validation**: Invoke `POST /order/staging/validate/{batchId}`. This resets the database batch status to `RECEIVED` and immediately returns `"Validation started"`.
2. **Polling Loop**: The frontend should poll `GET /order/staging/summary/{batchId}` at a **2-second interval**.
3. **Parse Status Fields**:
   * Inspect the `status` and `batchStatus` fields returned in the summary payload:
     * `status: "PROCESSING"` (`batchStatus: 1`): Validation is currently running in the background. Continue polling.
     * `status: "VALIDATED"` (`batchStatus: 2`): Validation has finished successfully. Stop the polling loop, hide the loader, and update the UI with the final Pass/Fail/Warning row counts.
     * `status: "SUBMITTED"` (`batchStatus: 3`): Staging rows have been converted into active parent/child orders.
     * `status: "FAILED"` (`batchStatus: 4`): The batch processing failed.
     * `status: "MOVED"` (`batchStatus: 5`): Online batch has been combined/moved.


3. Order Submission
Endpoints:
- POST /order/submission/submit-batch (Convert validated batch staging rows into active Parent/Child/Execution records)


4. Order Management (Parent & Child CRUD)
Endpoints:
- Parent Order:
  POST /order/parent-orders (Create a new Parent Order manually)
  GET /order/parent-orders/{id} (Get Parent Order by ID)
  GET /order/parent-orders (Stream all Parent Orders - NDJSON)
  PUT /order/parent-orders/{id} (Update Parent Order details)
  DELETE /order/parent-orders/{id} (Soft-delete Parent Order)
- Child Order:
  POST /order/child-orders (Create a new Child Order manually)
  GET /order/child-orders/{id} (Get Child Order by ID)
  GET /order/child-orders (Stream all Child Orders - NDJSON)
  GET /order/child-orders/parent/{parentOrderId} (Stream child orders for a parent - NDJSON)
  PUT /order/child-orders/{id} (Update Child Order details)
  DELETE /order/child-orders/{id} (Soft-delete Child Order)
  POST /order/internal/child-orders/product-quantities (Internal service call: Get aggregated product ordered quantities for Auto-PO in lstock)
- PO Upload:
  POST /order/parent-orders/upload-po (Upload PO numbers via excel mapping)
  GET /order/parent-orders/upload-po/preview/{uploadId} (Preview failed rows for PO upload)
  POST /order/parent-orders/upload-po/confirm/{uploadId} (Confirm and apply PO numbers)
  DELETE /order/parent-orders/upload-po/abort/{uploadId} (Discard temporary PO upload data)
- Dynamic Order Edits:
  GET /order/parent-orders/edit-fields (Retrieve list of editable order fields)
  POST /order/parent-orders/edit-template (Download edit template excel populated with current order data)
  POST /order/parent-orders/edit-upload (Upload edited template to execute dynamic bulk updates)


5. Order Execution Query & Details
Endpoints:
GET /order/executions (Query/filter executions with parent/child metadata - NDJSON)
GET /order/executions/excel (Download query/filtered execution results in Excel sheet)
GET /order/executions/{id} (Retrieve details of a specific execution ID)
GET /order/executions/ref/{executionRefNo} (Retrieve details of an execution by execution reference code)
GET /order/executions/{id}/timeline (Retrieve chronological audit trail of events for an execution ID)
GET /order/executions/child/{childOrderId}/timeline (Retrieve chronological audit trail across executions for a child order ID)


6. Stock Assignment & Preorder Allocation
Endpoints:
- Stock Allocation Orchestration:
  POST /order/stock-assignment/batch (Trigger stock assignment calculations for eligible batches)
  GET /order/stock-assignment/eligible-business-units (Stream business units eligible for stock assignment - NDJSON)
  GET /order/stock-assignment/batch/{batchNo} (Retrieve progress and logs of a stock assignment batch)
  POST /order/stock-assignment/single/{executionId} (Trigger manual stock assignment for a single execution)
  POST /order/stock-assignment/alternate (Map alternate product stock assignment)
  POST /order/stock-assignment/preorder (Convert executions to preorder bulk)
- Stock Releases:
  POST /order/stock-assignment/release/standard (Bulk standard stock release)
  POST /order/stock-assignment/release/external-supplier (Bulk external supplier stock release)
  POST /order/stock-assignment/release/ecommerce-direct (Bulk ecommerce direct stock release)
  POST /order/stock-assignment/release/preorder (Bulk preorder reservation release)
- Preorder / Backorder Allocations:
  POST /order/internal/execution/preorder/auto-allocate (Internal service call: Auto-allocate incoming stock to preorders - Invoked by lstock)
  POST /order/execution/preorder/allocate/executions (Manual allocation of stock to selected preorder executions)
  GET /order/executions/product/{productId}/preorders (Stream preorders queue for a specific product ID - NDJSON)
- Adhoc Stock Assignment:
  POST /order/adhoc-orders/assign (Map adhoc stock assignment and pack reference)


7. Courier Selection & Assignment
Endpoints:
- Courier Selection & Auto-Assignment:
  POST /order/execution/courier-assignment/single (Direct manual courier/mode assignment bypassing rate selection)
  POST /order/execution/courier-assignment/available-couriers (Retrieve available serviceable couriers and rates for executions)
  GET /order/execution/courier-assignment/template (Download courier assignment template Excel sheet)
  POST /order/execution/courier-assignment/upload (Upload courier assignment Excel for validation/staging)
  GET /order/execution/courier-assignment/upload-batch/{batchId} (Get upload details and re-validate serviceability)
  POST /order/execution/courier-assignment/upload-batch/{batchId}/submit (Confirm and commit uploaded courier assignment)
  GET /order/execution/courier-assignment/batch (Retrieve batches pending courier assignment)
  POST /order/execution/courier-assignment/batch (Trigger auto-courier selection and assignment)
- Courier Assign Batches:
  GET /order/courier-assign-batch (Retrieve list of courier assign batches)
  GET /order/courier-assign-batch/{batchNo}/details (Retrieve detail logs of a courier assign batch)


8. AWB Assignment
Endpoints:
- Single & Batch AWB Generation:
  POST /order/execution/awb-assignment/single/{executionId} (Trigger AWB assignment for single execution)
  POST /order/execution/awb-assignment/batch (Trigger batch AWB assignment)
- Pre-Allotted AWB Pools:
  POST /courier/pre-awb/manual-allot (Manually allot an AWB from the pool to a specific execution - processed in lcourier)
- Post-Pickup AWB Resolution & Updates:
  POST /order/internal/execution/resolve-ids (Internal service call: Resolve list of AWB or pack ref string values into execution IDs - Invoked by lcourier)
  POST /order/internal/execution/update-pickup-awbs (Internal service call: Batch update pickup AWBs and details - Invoked by lcourier)


9. Courier Release & Escalations
Endpoints:
POST /order/execution/release-courier (Release assigned courier and roll back status to ACCEPTED)
POST /order/execution/release-courier/escalated (Escalated release for invoice printed orders - role restricted)


10. Order Cancellations
Endpoints:
POST /order/staging/cancel/{stagingId} (Soft-delete staging order row)
POST /order/staging/cancel-revoke/{stagingId} (Revoke cancellation of staging order row)
POST /order/execution/cancel/{executionId} (Cancel execution and cascade release of courier and stock)
POST /order/execution/cancel-revoke/{executionId} (Revoke cancellation of execution and restore to ACCEPTED)


11. Execution State Transitions & Logistics
Endpoints:
POST /order/internal/execution/log-timeline-batch (Internal service call: Bulk logging of custom operational remarks and timeline events - Invoked by lcourier)
POST /order/internal/execution/transition-to-printed (Internal service call: Transition executions to INVOICE_PRINTED status - Invoked by lcourier)
POST /order/internal/execution/lost/{executionRefNo} (Internal service call: Mark an active courier/in-transit execution as lost - Invoked by lcourier)
POST /order/internal/execution/lost/bulk (Internal service call: Bulk mark execution references or AWBs as lost - Invoked by lcourier)
POST /order/internal/execution/transition (Internal service call: Transition execution status in bulk - e.g., outscan, confirmed pickup, RTO, or delivery - Invoked by lcourier)


12. Execution Hold Management
Endpoints:
POST /order/execution/hold/status-check (Verify hold/unhold eligibility for execution references)
POST /order/execution/hold (Apply operational hold to executions)
POST /order/execution/unhold (Release hold from executions)


13. After-Sales Customer Support (Registration)
Endpoints:
- Batch Reshipment:
  Merged under standard offline batch upload flow (type 2 - Reshipment Batch). Standard stock & courier assignment.
- Single Reshipment (Instant Allocation):
  POST /order/reship (Trigger single reship execution. Accepts courier details (courierId, shipMode) to instantly run stock assignment & set status to COURIER_ASSIGNED)
  GET /order/reship/eligibility/{childOrderId} (Validate if a child order is eligible for reship)
  POST /order/reship/assign-awb/{executionId} (Trigger AWB assignment for single reship execution. Generates AWB and flags invoice with isSingleReship: true in lcourier)
  POST /courier/invoice/print/single-reship/{executionId} (Print isolated invoice PDF for single reshipment - processed in lcourier)


14. Reverse Logistics & Returns Processing
Handles the full lifecycle of customer returns and reverse pickups (creation, updates, transitions, and cancellations).
Endpoints:
- Creation:
  - POST /order/execution/reverse-pickup (Trigger reverse pickup execution. Validates delivered source execution and creates new RP-... cycle inside child order)
- Lifecycle Updates & Transitions:
  - POST /order/execution/awb-assignment/single/{executionId} (Allocate courier/AWB to reverse pickup execution)
  - POST /order/internal/execution/transition (Internal service call: Transition reverse pickup status - e.g., REVERSE_PICKUP_CREATED (16) -> REVERSE_PICKUP_PICKED (17) -> REVERSE_PICKUP_IN_TRANSIT (18) -> REVERSE_PICKUP_DELIVERED (19). For warehouse receipt, transitions to REVERSE_PICKUP_RECEIVED (20) which accepts stockStatus parameters: AVAILABLE, DAMAGED, DEFECTIVE to automatically route inventory in lstock - Invoked by lcourier)
- Cancellation:
  - POST /order/execution/cancel/{executionId} (Cancel active reverse pickup execution and release associated logistics resources)


15. External Supplier Fulfillment Routing
Endpoints:
- POST /order/external-fulfillment/{executionId} (Flag execution for external supplier fulfillment)
- PUT /order/external-fulfillment/{executionId}/shipping (Update shipping/AWB details from external supplier)
- PUT /order/external-fulfillment/{executionId}/delivered (Mark external supplier execution as delivered)
- POST /order/external-fulfillment/upload-mark (Bulk mark external supplier executions via Excel)
- POST /order/external-fulfillment/upload-shipping (Bulk update shipping details via Excel)
- POST /order/external-fulfillment/send-to-supplier (Dispatch pending executions to external suppliers)


16. Master Setup & Configurations
Endpoints:
- Client Column Mapping Setup (Primary Submenu):
  POST /order/client-mapping/save (Save client column mapping configuration)
  GET /order/client-mapping/template/list (Stream client mapping templates with original uploaded file names - NDJSON)
  GET /order/client-mapping/template/{templateId} (Retrieve column-to-system-field mapping details for a template ID)
  GET /order/client-mapping/client/{clientId} (Retrieve column-to-system-field mapping details for a client ID)
  POST /order/client-mapping/template/upload (Upload client Excel template for column mapping)
  POST /order/client-mapping/template/save (Save template mapping configuration)
  PUT /order/client-mapping/template/{templateId} (Update mapping template details e.g., name, sheet name, header row, active status)
  GET /order/client-mapping/template/download/{templateId} (Download client mapping Excel template by template ID)
  GET /order/client-mapping/template/download/client/{clientId} (Download client mapping Excel template by client ID & optional businessUnitId)
- Pincode Registry:
  GET /order/pincode/list (Stream pincode mappings - NDJSON)
  POST /order/pincode (Create or update pincode serviceability rules)
  DELETE /order/pincode/{id} (Deactivate pincode record)
  GET /order/pincode/download (Download pincode master database as Excel)
  GET /order/pincode/template (Download pincode bulk import Excel template)
  POST /order/pincode/upload (Upload pincodes bulk master file)
  GET /order/pincode/states (Get list of active states)
  GET /order/pincode/cities (Get list of cities for a state)
- Customer Blacklist:
  POST /order/customer-blacklist (Add customer details to blacklist registry)
  PUT /order/customer-blacklist/{id} (Update blacklist parameters)
  GET /order/customer-blacklist/{id} (Retrieve blacklist details)
  GET /order/customer-blacklist (Stream complete blacklist registry)
  DELETE /order/customer-blacklist/{id} (Remove record from blacklist)
- Master Registry Lookups (Standard status, types, and error lists):
  GET /order/master/order-source (Stream Order Source Master - NDJSON)
  GET /order/master/order-source/{code} (Get Order Source Master by code)
  GET /order/master/pricing-source (Stream Pricing Source Master - NDJSON)
  GET /order/master/pricing-source/{code} (Get Pricing Source Master by code)
  GET /order/master/reship-reason (Stream Reship Reason Master - NDJSON)
  GET /order/master/reship-reason/{code} (Get Reship Reason Master by code)
  GET /order/master/return-condition (Stream Return Condition Master - NDJSON)
  GET /order/master/return-condition/{code} (Get Return Condition Master by code)
  GET /order/master/return-type (Stream Return Type Master - NDJSON)
  GET /order/master/return-type/{code} (Get Return Type Master by code)
  GET /order/master/system-field (Stream System Field Master - NDJSON)
  GET /order/master/system-field/{code} (Get System Field Master by code)
  GET /order/master/timeline-action (Stream Timeline Action Master - NDJSON)
  GET /order/master/timeline-action/{code} (Get Timeline Action Master by code)
  GET /order/master/invoice-trigger (Stream Invoice Trigger Master - NDJSON)
  GET /order/master/invoice-trigger/{code} (Get Invoice Trigger Master by code)
  GET /order/master/validation-error (Stream Validation Error Master - NDJSON)
  GET /order/master/validation-error/{code} (Get Validation Error Master by code)
  GET /order/master/fulfillment-source (Stream Fulfillment Source Master - NDJSON)
  GET /order/master/fulfillment-source/{code} (Get Fulfillment Source Master by code)
  GET /order/master/validation-status (Stream Validation Status Master - NDJSON)
  GET /order/master/validation-status/{code} (Get Validation Status Master by code)
  GET /order/master/execution-type (Stream Execution Type Master - NDJSON)
  GET /order/master/execution-type/{code} (Get Execution Type Master by code)
  GET /order/master/execution-status (Stream Execution Status Master - NDJSON)
  GET /order/master/execution-status/{code} (Get Execution Status Master by code)


17. Financial & Stock Reconciliation
Endpoints:
POST /order/internal/reconcile/sync (Trigger manual verification and reconciliation sync)


18. Reports & Dashboard Analytics
Endpoints:
- Execution Reports & Status Queries:
  POST /order/executions/status-check (Batch query status of multiple executions by arbitrary search terms (mobile, AWB, order ref, PO) - returns self-contained NDJSON stream including matched info and event timelines)
  POST /order/executions/status-check/excel (Batch query status of multiple executions by arbitrary search terms (mobile, AWB, order ref, PO) - downloads a detailed spreadsheet report except event timelines)
- Dashboard Metrics & Analytics:
  GET /order/dashboard/client-counts (Retrieve dashboard order counts grouped by client)
  GET /order/dashboard/details (Retrieve paginated grid view of order dashboard details)


19. Zillion Loyalty & Rewards Integration
Endpoints:
- Authentication & Customer Details:
  POST /order/zillion/token (Generate Zillion API authentication token)
  POST /order/zillion/customerdetails/orderid/{order_id} (Retrieve Zillion customer account details)
- OTP & Verification:
  POST /order/zillion/otp (Trigger Zillion OTP for customer verification)
  GET /order/zillion/otp/resend/zillionorderid/{order_id} (Resend Zillion OTP for order)
- Checkout & Payments:
  POST /order/zillion/hold-coin (Reserve Zillion coins for checkout)
  POST /order/zillion/checkout (Execute Zillion coin checkout transaction)
  GET /order/zillion/pg-process/orderid/{order_id}/paymentid/{payment_id} (Process Zillion PG callback)
- Feedback & Status Updates:
  GET /order/zillion/feedback/questions/orderid/{order_id} (Retrieve Zillion feedback questionnaire)
  POST /order/zillion/feedback/submit/orderid/{order_id} (Submit Zillion feedback response)
  GET /order/zillion/send_status/zillionorderid/{order_id}/status_code/{status_code}/cancel_id/{cancel_id}/cou_id/{cou_id}/awb_no/{awb_no} (Send status updates to Zillion system - statusCode: 0=Init, 1=Confirmed, 8=Cancelled, 11=Delivered; cancelId: 15=Out of Stock, 16=Shipping Restrictions, 17=Quality Control, 18=Price Change, 19=Supplier Issues, 20=Other)
- Zillion Orders Queries & Exports:
  GET /order/zillion/orders (Stream all Zillion orders with status - NDJSON with optional startDate, endDate (YYYY-MM-DD), status filter, page, and size parameters)
  GET /order/zillion/orders/excel (Stream / download Zillion orders with status as Excel workbook with optional startDate, endDate (YYYY-MM-DD), and status filter parameters)


Lorder Service
├── 📥 Order Ingestion (Wizard flows)
│   ├── 📄 1.1 Batch Order Offline (Excel)
│   │   ├── POST /order/batch/upload (Upload excel file for parsing and staging)
│   │   ├── DELETE /order/batch/{batchId} (Abort / Delete unsubmitted batch staging rows & files)
│   │   ├── DELETE /order/batch/admin/soft-delete/{batchId} (Super Admin soft-delete batch & orders)
│   │   ├── GET /order/batch/list (List parsed batches by date, client, type, source)
│   │   ├── GET /order/batch/{batchId}/download/original (Download original excel file)
│   │   ├── POST /order/batch/download (Download unified multi-batch excel)
│   │   ├── POST /order/batch/export/order-details (Initiate background export job for Old ERP layout)
│   │   ├── GET /order/batch/export/job/{jobId} (Check status of background export job)
│   │   ├── GET /order/batch/download/file/{fileName} (Download finalized export spreadsheet file)
│   │   └── GET /order/batch/parser-error/{batchId} (Stream parsing errors - NDJSON)
│   │
│   ├── 🌐 1.2 Batch Order Online (API Ingestion)
│   │   ├── POST /order/create (Ingest API orders - Bulk)
│   │   ├── GET /order/api-order-file (Download pending API orders report)
│   │   ├── POST /order/batch/combine-online (Combine online orders of a client)
│   │   └── POST /order/submission/submit-batch (Submit combined online batch)
│   │
│   └── ⚡ 1.3 Batch Order Ad-hoc (Single-Screen Wizard)
│       ├── POST /order/adhoc-orders (Create adhoc order structure)
│       ├── POST /order/adhoc-orders/assign (Map adhoc stock assignment & pack ref)
│       ├── POST /stock/adhoc-procurement/invoices (Log adhoc supplier invoice in `lstock`)
│       └── POST /courier/invoice/print/multi/{groupId} (Print adhoc multi-invoice PDF)
│
├── ⚙️ Courier Selection & Assignment
│   ├── POST /order/execution/courier-assignment/single
│   ├── POST /order/execution/courier-assignment/available-couriers
│   ├── GET /order/execution/courier-assignment/template
│   ├── POST /order/execution/courier-assignment/upload
│   ├── GET /order/execution/courier-assignment/upload-batch/{batchId}
│   ├── POST /order/execution/courier-assignment/upload-batch/{batchId}/submit
│   ├── GET /order/execution/courier-assignment/batch
│   ├── POST /order/execution/courier-assignment/batch
│   ├── GET /order/courier-assign-batch
│   └── GET /order/courier-assign-batch/{batchNo}/details
│
├── 🏷️ AWB Assignment
│   ├── POST /order/execution/awb-assignment/single/{executionId}
│   ├── POST /order/execution/awb-assignment/batch
│   ├── POST /order/internal/execution/resolve-ids
│   └── POST /order/internal/execution/update-pickup-awbs
│
├── 🏢 Master Configuration & Setup Registries
│   ├── Client Column Mapping Setup (Primary Submenu)
│   │   ├── POST /order/client-mapping/save
│   │   ├── GET /order/client-mapping/template/list
│   │   ├── GET /order/client-mapping/template/{templateId}
│   │   ├── GET /order/client-mapping/client/{clientId}
│   │   ├── POST /order/client-mapping/template/upload
│   │   ├── POST /order/client-mapping/template/save
│   │   ├── PUT /order/client-mapping/template/{templateId}
│   │   ├── GET /order/client-mapping/template/download/{templateId}
│   │   └── GET /order/client-mapping/template/download/client/{clientId}
│   ├── Pincode Registry (Serviceability Setup)
│   │   ├── GET /order/pincode/list
│   │   ├── POST /order/pincode
│   │   ├── DELETE /order/pincode/{id}
│   │   ├── GET /order/pincode/download
│   │   ├── GET /order/pincode/template
   │   └── POST /order/pincode/upload
│   ├── Customer Blacklist Setup
│   │   ├── POST /order/customer-blacklist
│   │   ├── PUT /order/customer-blacklist/{id}
│   │   ├── GET /order/customer-blacklist/{id}
│   │   ├── GET /order/customer-blacklist
│   │   └── DELETE /order/customer-blacklist/{id}
│   └── Master Code Lookups (NDJSON list / Single Lookup)
│       ├── GET /order/master/order-source
│       ├── GET /order/master/pricing-source
│       ├── GET /order/master/reship-reason
│       ├── GET /order/master/return-condition
│       ├── GET /order/master/return-type
│       ├── GET /order/master/system-field
│       ├── GET /order/master/timeline-action
│       ├── GET /order/master/invoice-trigger
│       ├── GET /order/master/validation-error
│       ├── GET /order/master/fulfillment-source
│       ├── GET /order/master/validation-status
│       ├── GET /order/master/execution-type
│       └── GET /order/master/execution-status
│
├── 📊 Reports & Dashboard Analytics
│   ├── Execution Reports & Status Queries
│   │   ├── POST /order/executions/status-check
│   │   └── POST /order/executions/status-check/excel
│   └── Dashboard Metrics & Analytics
│       ├── GET /order/dashboard/client-counts
│       └── GET /order/dashboard/details
│
└── 🎁 Zillion Loyalty & Rewards Integration
    ├── Authentication, Customer & OTP
    │   ├── POST /order/zillion/token
    │   ├── POST /order/zillion/customerdetails/orderid/{order_id}
    │   ├── POST /order/zillion/otp
    │   └── GET /order/zillion/otp/resend/zillionorderid/{order_id}
    ├── Checkout, Payments & Feedback
    │   ├── POST /order/zillion/hold-coin
    │   ├── POST /order/zillion/checkout
    │   ├── GET /order/zillion/pg-process/orderid/{order_id}/paymentid/{payment_id}
    │   ├── GET /order/zillion/feedback/questions/orderid/{order_id}
    │   ├── POST /order/zillion/feedback/submit/orderid/{order_id}
    │   └── GET /order/zillion/send_status/zillionorderid/{order_id}/status_code/...
    └── Zillion Orders Queries & Exports
        ├── GET /order/zillion/orders (Stream all Zillion orders with status - NDJSON with optional page & size)
        └── GET /order/zillion/orders/excel (Stream / download Zillion orders as Excel sheet)
