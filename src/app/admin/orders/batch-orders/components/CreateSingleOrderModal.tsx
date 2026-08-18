'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, User, MapPin, Package, Tag, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2 } from 'lucide-react';
import {
  singleOrderService,
  ClientItem,
  ClientProductShareItem,
  ProgramItem,
  SingleOrderPayloadItem,
  SingleOrderCreateResponse,
} from '@/services/singleOrder.service';

interface CreateSingleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

export const CreateSingleOrderModal: React.FC<CreateSingleOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  // Loading & Reference States
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [loadingPrograms, setLoadingPrograms] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResponse, setSuccessResponse] = useState<SingleOrderCreateResponse | null>(null);

  // Master Lists
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [products, setProducts] = useState<ClientProductShareItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);

  // Form Fields
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [businessUnitId, setBusinessUnitId] = useState<string>('');
  const [merchantId, setMerchantId] = useState<string>('');
  const [clientOrderId, setClientOrderId] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Customer Details
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [alternateNumber, setAlternateNumber] = useState<string>('');

  // Shipping Address
  const [shipToName, setShipToName] = useState<string>('');
  const [addressLine1, setAddressLine1] = useState<string>('');
  const [addressLine2, setAddressLine2] = useState<string>('');
  const [addressLine3, setAddressLine3] = useState<string>('');
  const [addressLine4, setAddressLine4] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');

  // Product Details
  const [selectedSkuCode, setSelectedSkuCode] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Additional Info
  const [programName, setProgramName] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [invoicePrice, setInvoicePrice] = useState<string>('');
  const [redemptionType, setRedemptionType] = useState<string>('POINTS_PLUS_CASH');
  const [points, setPoints] = useState<string>('1000');
  const [redemptionAmount, setRedemptionAmount] = useState<string>('');

  // Helper to generate new Order ID
  const generateNewOrderId = () => {
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${todayStr}-${randNum}`;
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessResponse(null);
      setClientOrderId(generateNewOrderId());
      fetchClients();
    }
  }, [isOpen]);

  // Sync shipToName with customerName if shipToName is unedited
  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (!shipToName || shipToName === customerName) {
      setShipToName(val);
    }
  };

  // 1. Fetch Clients
  const fetchClients = async () => {
    setLoadingClients(true);
    setErrorMessage(null);
    try {
      const data = await singleOrderService.getClients();
      setClients(data);

      if (data && data.length > 0) {
        const firstClient = data[0];
        setSelectedClientId(String(firstClient.id));
        
        const firstBU = firstClient.businessUnits?.[0];
        if (firstBU) {
          setBusinessUnitId(String(firstBU.id));
          setMerchantId(firstBU.merchantId || '');
        } else {
          setBusinessUnitId('');
          setMerchantId('');
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch clients:', err);
      // Fallback clients list
      const fallbackClients: ClientItem[] = [
        { id: 33, clientCode: 'AXIS', clientName: 'Axis Pvt Ltd', businessUnits: [{ id: 6, clientId: 33, merchantId: null }] },
        { id: 34, clientCode: 'EARNEST', clientName: 'Earnest', businessUnits: [{ id: 6, clientId: 34, merchantId: null }] },
        { id: 35, clientCode: 'XOXODAY', clientName: 'Xoxoday', businessUnits: [{ id: 6, clientId: 35, merchantId: null }] },
      ];
      setClients(fallbackClients);
      setSelectedClientId('33');
      setBusinessUnitId('6');
      setMerchantId('');
    } finally {
      setLoadingClients(false);
    }
  };

  // When selectedClientId changes -> load products & business units and update Merchant ID directly from businessUnits[0].merchantId
  useEffect(() => {
    if (!selectedClientId) return;

    const matchedClient = clients.find((c) => String(c.id) === String(selectedClientId));
    if (matchedClient) {
      const bu = matchedClient.businessUnits && matchedClient.businessUnits.length > 0 ? matchedClient.businessUnits[0] : null;
      if (bu) {
        setBusinessUnitId(String(bu.id));
        setMerchantId(bu.merchantId || '');
      } else {
        setBusinessUnitId('');
        setMerchantId('');
      }
    } else {
      setMerchantId('');
    }

    loadClientProducts(Number(selectedClientId));
  }, [selectedClientId, clients]);

  // When businessUnitId changes -> load programs
  useEffect(() => {
    if (!businessUnitId) return;
    loadPrograms(Number(businessUnitId));
  }, [businessUnitId]);

  // 2. Fetch Products
  const loadClientProducts = async (cId: number) => {
    setLoadingProducts(true);
    try {
      const prods = await singleOrderService.getClientProducts(cId);
      setProducts(prods);

      if (prods && prods.length > 0) {
        const firstP = prods[0];
        setSelectedSkuCode(firstP.clientSkuCode);
        const price = firstP.sellingPrice || firstP.lakeePrice || 0;
        setInvoicePrice(String(price));
        setRedemptionAmount(String(price));

        // Fetch product detail for baseProductName if available
        if (firstP.productId) {
          fetchProductDetail(firstP.productId, firstP.clientSkuCode);
        } else {
          setProductName(`Product ${firstP.clientSkuCode}`);
        }
      } else {
        setSelectedSkuCode('');
        setProductName('');
      }
    } catch (err) {
      console.warn('Failed to load products:', err);
      // Fallback product defaults
      setProducts([
        { clientShareId: 19, clientId: cId, productId: 2, clientSkuCode: 'APR-ACS-AAP-0002', sellingPrice: 2157.0 },
        { clientShareId: 18, clientId: cId, productId: 1, clientSkuCode: 'APR-ACS-AAP-0001', sellingPrice: 2142.0 },
      ]);
      setSelectedSkuCode('APR-ACS-AAP-0002');
      setProductName('FABER FWK 1.2L Multicooker Kettle with Egg Boiler');
      setInvoicePrice('2157.00');
      setRedemptionAmount('2157');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchProductDetail = async (pId: number, skuCode: string) => {
    try {
      const detail = await singleOrderService.getProductDetail(pId);
      if (detail && detail.baseProductName) {
        setProductName(detail.baseProductName);
      } else {
        setProductName(`Product ${skuCode}`);
      }
    } catch {
      setProductName(`Product ${skuCode}`);
    }
  };

  // 3. Fetch Programs
  const loadPrograms = async (buId: number) => {
    setLoadingPrograms(true);
    try {
      const progList = await singleOrderService.getPrograms(buId);
      setPrograms(progList);
      if (progList && progList.length > 0) {
        setProgramName(progList[0].programName || progList[0].programCode);
      } else {
        setProgramName('Rewards Program');
      }
    } catch {
      setPrograms([]);
      setProgramName('Rewards Program');
    } finally {
      setLoadingPrograms(false);
    }
  };

  // Product dropdown change handler
  const handleProductSelect = (skuCode: string) => {
    setSelectedSkuCode(skuCode);
    const p = products.find((prod) => prod.clientSkuCode === skuCode);
    if (p) {
      const price = p.sellingPrice || p.lakeePrice || 0;
      setInvoicePrice(String(price));
      setRedemptionAmount(String(price));

      if (p.productId) {
        fetchProductDetail(p.productId, skuCode);
      } else {
        setProductName(`Product ${skuCode}`);
      }
    }
  };

  // Client dropdown change handler
  const handleClientSelect = (cIdStr: string) => {
    setSelectedClientId(cIdStr);
    const selected = clients.find((c) => String(c.id) === String(cIdStr));
    if (selected) {
      const bu = selected.businessUnits && selected.businessUnits.length > 0 ? selected.businessUnits[0] : null;
      if (bu) {
        setBusinessUnitId(String(bu.id));
        setMerchantId(bu.merchantId || '');
      } else {
        setBusinessUnitId('');
        setMerchantId('');
      }
    } else {
      setMerchantId('');
    }
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!merchantId.trim()) {
      setErrorMessage('Merchant ID is required. Please enter or select a client.');
      return;
    }

    if (!clientOrderId.trim()) {
      setErrorMessage('Client Order ID is required.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Customer Name is required.');
      return;
    }

    if (!customerEmail.trim() || !/\S+@\S+\.\S+/.test(customerEmail)) {
      setErrorMessage('Please enter a valid Customer Email address.');
      return;
    }

    const cleanMobile = customerMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      setErrorMessage('Customer Mobile must be a 10-digit phone number.');
      return;
    }

    if (alternateNumber.trim()) {
      const cleanAlt = alternateNumber.replace(/\D/g, '');
      if (cleanAlt.length !== 10) {
        setErrorMessage('Alternate Mobile must be a 10-digit phone number if provided.');
        return;
      }
    }

    if (!addressLine1.trim()) {
      setErrorMessage('Address Line 1 is required.');
      return;
    }

    if (!city.trim() || !state.trim()) {
      setErrorMessage('City and State are required.');
      return;
    }

    const cleanPincode = pincode.replace(/\D/g, '');
    if (!cleanPincode || cleanPincode.length !== 6) {
      setErrorMessage('Pincode must be a 6-digit number.');
      return;
    }

    if (!selectedSkuCode) {
      setErrorMessage('Please select a Product.');
      return;
    }

    if (quantity < 1) {
      setErrorMessage('Quantity must be at least 1.');
      return;
    }

    // Build Payload array matching exact spec
    const payloadItem: SingleOrderPayloadItem = {
      merchant_id: merchantId.trim(),
      client_order_id: clientOrderId.trim(),
      order_date: orderDate || new Date().toISOString().split('T')[0],
      customer_details: {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_mobile: Number(cleanMobile),
        alternate_number: alternateNumber.trim() ? Number(alternateNumber.replace(/\D/g, '')) : undefined,
        address_details: {
          ship_to_name: (shipToName || customerName).trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || '',
          address_line3: addressLine3.trim() || '',
          address_line4: addressLine4.trim() || '',
          landmark: landmark.trim() || '',
          city: city.trim(),
          state: state.trim(),
          pincode: Number(cleanPincode),
        },
      },
      product_details: {
        client_product_code: selectedSkuCode,
        product_name: productName.trim() || `Product ${selectedSkuCode}`,
        quantity: Number(quantity),
      },
      additional_info: {
        program_name: programName || 'Rewards Program',
        po_number: poNumber.trim() || undefined,
        invoice_price: invoicePrice ? String(invoicePrice) : undefined,
        redemption_details: {
          redemption_type: redemptionType || 'POINTS_PLUS_CASH',
          points: points ? Number(points) : 1000,
          amount: redemptionAmount ? Number(redemptionAmount) : Number(invoicePrice) || 0,
        },
      },
    };

    const fullPayload = [payloadItem];

    console.log('====================================');
    console.log('CREATE SINGLE ORDER - INITIATED');
    console.log('HTTP Method: POST');
    console.log('Endpoint URL: https://v2.lakeetech.com/order/create');
    console.log('--- SWAGGER PAYLOAD ALONE (RAW JSON) ---');
    console.log(JSON.stringify(fullPayload, null, 2));
    console.log('--- END SWAGGER PAYLOAD ALONE ---');
    console.log('cURL command for Swagger:');
    console.log(`curl -X 'POST' \\\n  'https://v2.lakeetech.com/order/create' \\\n  -H 'accept: */*' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\\n  -d '${JSON.stringify(fullPayload)}'`);
    console.log('====================================');

    setSubmitting(true);

    try {
      const res = await singleOrderService.createSingleOrder(fullPayload);
      
      console.log('====================================');
      console.log('CREATE SINGLE ORDER SUCCESS RESPONSE');
      console.log('--- SWAGGER RESPONSE ALONE (RAW JSON) ---');
      console.log(JSON.stringify(res, null, 2));
      console.log('--- END SWAGGER RESPONSE ALONE ---');
      console.log('====================================');

      setSuccessResponse(res);

      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (err: any) {
      console.error('====================================');
      console.error('CREATE SINGLE ORDER ERROR RESPONSE');
      console.error('Status Code:', err.response?.status);
      console.error('Error Response Data:', err.response?.data || err);
      console.error('====================================');
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to create order. Please verify API credentials and payload data.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Create Single Order</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  Direct Ingestion
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Instantly submit a single order directly into the order ingestion engine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Success Summary View */}
          {successResponse ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Order Received Successfully!</h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      {successResponse.message || 'Single order has been accepted for processing.'}
                    </p>
                  </div>
                </div>

                {successResponse.data && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="rounded-xl bg-white/80 p-3 shadow-2xs dark:bg-slate-900/80">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Batch No</div>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                        {successResponse.data.batch_no || 'N/A'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3 shadow-2xs dark:bg-slate-900/80">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Client Order ID</div>
                      <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                        {clientOrderId}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3 shadow-2xs dark:bg-slate-900/80">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Lakee Order ID</div>
                      <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {successResponse.data.pass_orders_details?.[0]?.lakee_order_id || 'Accepted'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3 shadow-2xs dark:bg-slate-900/80">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Status</div>
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        {successResponse.data.pass_orders_details?.[0]?.status || 'ACCEPTED'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessResponse(null);
                    setClientOrderId(generateNewOrderId());
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  Create Another Order
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Global Error Banner */}
              {errorMessage && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div className="font-semibold leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* SECTION 1: Client & Order Details */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>1. Client & Merchant Configuration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Client Select */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      disabled={loadingClients}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {loadingClients ? (
                        <option>Loading clients...</option>
                      ) : clients.length > 0 ? (
                        clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName} ({c.clientCode})
                          </option>
                        ))
                      ) : (
                        <option value="33">AXIS BANK (AXIS)</option>
                      )}
                    </select>
                  </div>

                  {/* Merchant ID */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Merchant ID <span className="text-red-500">*</span></span>
                      {!merchantId && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          (Null from BU)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={merchantId}
                      onChange={(e) => setMerchantId(e.target.value)}
                      placeholder="Enter Merchant ID (currently null)"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Client Order ID */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Client Order ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={clientOrderId}
                        onChange={(e) => setClientOrderId(e.target.value)}
                        placeholder="e.g. ORD-20260804-0001"
                        className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setClientOrderId(generateNewOrderId())}
                        title="Generate New ID"
                        className="absolute right-2 top-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Customer Details */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>2. Customer Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Customer Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. testcustomer@example.com"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10 digits"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Alternate Number */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Alternate Mobile
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={alternateNumber}
                      onChange={(e) => setAlternateNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Optional"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Order Date */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Order Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Ship To Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Ship To Name
                    </label>
                    <input
                      type="text"
                      value={shipToName}
                      onChange={(e) => setShipToName(e.target.value)}
                      placeholder="Same as customer name"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Shipping Address */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>3. Shipping Address</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Address Line 1 */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Address Line 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="Building, Flat No, Street Name"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Address Line 2 */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Area, Locality"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Address Line 3 */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Address Line 3
                    </label>
                    <input
                      type="text"
                      value={addressLine3}
                      onChange={(e) => setAddressLine3(e.target.value)}
                      placeholder="Optional"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Address Line 4 */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Address Line 4
                    </label>
                    <input
                      type="text"
                      value={addressLine4}
                      onChange={(e) => setAddressLine4(e.target.value)}
                      placeholder="Optional"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Landmark */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Landmark
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Near Signal / Mall"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Tamil Nadu"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 digits"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Product & Pricing */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>4. Product Details</span>
                  </div>
                  {loadingProducts && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading Products...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Shared Product Selection */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Client Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSkuCode}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {products.length > 0 ? (
                        products.map((p) => (
                          <option key={p.clientShareId || p.clientSkuCode} value={p.clientSkuCode}>
                            {p.clientSkuCode} - Price: ₹{p.sellingPrice || p.lakeePrice || 0}
                          </option>
                        ))
                      ) : (
                        <option value="APR-ACS-AAP-0002">APR-ACS-AAP-0002 (Default)</option>
                      )}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Product Name Display/Override */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. FABER FWK 1.2L Multicooker Kettle"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Additional Info & Program Details */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>5. Program & Additional Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Program Select */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Program Name
                    </label>
                    <select
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {programs.length > 0 ? (
                        programs.map((prog) => (
                          <option key={prog.id} value={prog.programName || prog.programCode}>
                            {prog.programName || prog.programCode}
                          </option>
                        ))
                      ) : (
                        <option value="Rewards Program">Rewards Program</option>
                      )}
                    </select>
                  </div>

                  {/* PO Number */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      PO Number
                    </label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="e.g. PO-1001"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Invoice Price */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Invoice Price (₹)
                    </label>
                    <input
                      type="text"
                      value={invoicePrice}
                      onChange={(e) => setInvoicePrice(e.target.value)}
                      placeholder="e.g. 2157.00"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Redemption Type */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Redemption Type
                    </label>
                    <select
                      value={redemptionType}
                      onChange={(e) => setRedemptionType(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="POINTS_PLUS_CASH">POINTS_PLUS_CASH</option>
                      <option value="POINTS">POINTS</option>
                      <option value="CASH">CASH</option>
                    </select>
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Redemption Points
                    </label>
                    <input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      placeholder="1000"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Redemption Amount */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Redemption Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={redemptionAmount}
                      onChange={(e) => setRedemptionAmount(e.target.value)}
                      placeholder="2157"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Order...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      <span>Submit Single Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
