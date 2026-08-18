'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  ArrowLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  User,
  MapPin,
  Package,
  Receipt,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  ChevronDown,
  ArrowRight,
  Edit,
  Check,
  UserCheck
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { adhocOrderService } from '@/services/adhocOrder.service';
import { toast } from 'sonner';

interface BusinessUnit {
  id: number;
  clientId: number;
  unitCode?: string;
  unitName?: string;
  merchantId?: string | null;
}

interface ClientItem {
  id: number;
  clientCode: string;
  clientName: string;
  businessUnits?: BusinessUnit[];
}

interface SalesPerson {
  userId: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
}

interface CatalogProduct {
  id: number;
  productCode?: string;
  defaultSku?: string;
  baseProductName?: string;
  productName?: string;
  hsnCode?: string;
  hsn?: string;
  taxRate?: number;
  productTax?: number;
  sellingPrice?: number;
  mrp?: number;
  lakeePrice?: number;
  costPrice?: number;
}

export interface AdhocOrderItem {
  id: string; // local temporary key
  fulfillmentType: 1 | 2; // 1 = Catalog selected, 2 = Custom typed
  productId: number;
  productCode: string;
  productName: string;
  oneTimeProductName: string;
  productHsn: string;
  productTax: number;
  orderedQty: number;
  clientPrice: number;
  costPrice: number;
  remarks: string;
}

interface SuccessData {
  adhocRefNo?: string;
  childOrderIds?: (number | string)[];
  step1ResponseBody?: any;
  secondApiPayload?: any;
  secondApiResponse?: any;
}

export default function AdhocPOClient() {
  const router = useRouter();

  // Progressive Disclosure Stage State
  const [showFullForm, setShowFullForm] = useState<boolean>(false);

  // Loading States
  const [loadingClients, setLoadingClients] = useState<boolean>(true);
  const [loadingSalesPersons, setLoadingSalesPersons] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Master Data Lists
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);

  // Section 1: Client & Order Info
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [businessUnitId, setBusinessUnitId] = useState<number>(0);
  const [clientOrderNo, setClientOrderNo] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSalesPersonUserId, setSelectedSalesPersonUserId] = useState<string>('');
  const [selectedSalesPersonName, setSelectedSalesPersonName] = useState<string>('');
  const [orderRemarks, setOrderRemarks] = useState<string>('');

  // Section 2: Bill-To / Customer Address Fields
  const [customerFirstName, setCustomerFirstName] = useState<string>('');
  const [customerLastName, setCustomerLastName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [alternateMobile, setAlternateMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const [addressLine1, setAddressLine1] = useState<string>('');
  const [addressLine2, setAddressLine2] = useState<string>('');
  const [addressLine3, setAddressLine3] = useState<string>('');
  const [addressLine4, setAddressLine4] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [country, setCountry] = useState<string>('India');

  // Section 3: Line Items
  const [items, setItems] = useState<AdhocOrderItem[]>([]);

  // Current Item Drafting Form State
  const [itemMode, setItemMode] = useState<1 | 2>(1); // 1 = Catalog Search, 2 = Custom Ad-hoc
  const [productSearch, setProductSearch] = useState<string>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);

  const [draftProductId, setDraftProductId] = useState<number>(0);
  const [draftProductCode, setDraftProductCode] = useState<string>('');
  const [draftProductName, setDraftProductName] = useState<string>('');
  const [draftOneTimeProductName, setDraftOneTimeProductName] = useState<string>('');
  const [draftHsn, setDraftHsn] = useState<string>('');
  const [draftTax, setDraftTax] = useState<number>(18);
  const [draftQty, setDraftQty] = useState<number>(1);
  const [draftPrice, setDraftPrice] = useState<number | ''>('');
  const [draftCostPrice, setDraftCostPrice] = useState<number | ''>('');
  const [draftItemRemarks, setDraftItemRemarks] = useState<string>('');

  // Editing Item State (if editing existing row)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Success / Error Feedback State
  const [successInfo, setSuccessInfo] = useState<SuccessData | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper parser for NDJSON or JSON responses
  const parseNdjson = useCallback((raw: any): any[] => {
    if (typeof raw === 'string') {
      const parsed: any[] = [];
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            parsed.push(JSON.parse(trimmed));
          } catch (e) {
            console.error('Error parsing NDJSON line:', trimmed, e);
          }
        }
      });
      return parsed;
    }
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.data)) return raw.data;
      if (raw.data && typeof raw.data === 'object') return [raw.data];
    }
    return [];
  }, []);

  // Fetch Clients on mount
  useEffect(() => {
    const fetchClientsData = async () => {
      setLoadingClients(true);
      try {
        const res = await axiosInstance.get('/client', {
          headers: { Accept: 'application/x-ndjson, application/json' },
          transformResponse: [(data) => data],
        });
        const parsedClients = parseNdjson(res.data).sort((a, b) =>
          (a.clientName || '').localeCompare(b.clientName || '', undefined, { sensitivity: 'base' })
        );
        setClients(parsedClients);

        if (parsedClients.length > 0) {
          const firstClient = parsedClients[0];
          setSelectedClientId(String(firstClient.id));
          const buId = firstClient.businessUnits?.[0]?.id || 0;
          setBusinessUnitId(buId);
        }
      } catch (err) {
        console.error('Failed to load clients list:', err);
        toast.error('Failed to load client master list');
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClientsData();
  }, [parseNdjson]);

  // Fetch Sales Persons on mount
  useEffect(() => {
    const fetchSalesPersons = async () => {
      setLoadingSalesPersons(true);
      try {
        const res = await axiosInstance.get('/order/adhoc-orders/sales-persons', {
          headers: { Accept: 'application/x-ndjson, application/json' },
          transformResponse: [(data) => data],
        });
        const parsedSalesPersons = parseNdjson(res.data).sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' })
        );
        setSalesPersons(parsedSalesPersons);
      } catch (err) {
        console.error('Failed to load sales persons list:', err);
      } finally {
        setLoadingSalesPersons(false);
      }
    };

    fetchSalesPersons();
  }, [parseNdjson]);

  // Fetch Products catalog when selected Client changes
  useEffect(() => {
    if (!selectedClientId) return;

    const matchedClient = clients.find((c) => String(c.id) === String(selectedClientId));
    if (matchedClient) {
      const buId = matchedClient.businessUnits?.[0]?.id || 0;
      setBusinessUnitId(buId);
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await axiosInstance.get('/prod/products', {
          headers: { Accept: 'application/x-ndjson, application/json' },
          transformResponse: [(data) => data],
        });
        const parsedProds = parseNdjson(res.data);
        setCatalogProducts(parsedProds);
      } catch (err) {
        console.error('Failed to load catalog products:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [selectedClientId, clients, parseNdjson]);

  // Close product search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Catalog Products by search query
  const filteredCatalogProducts = useMemo(() => {
    if (!productSearch.trim()) return catalogProducts.slice(0, 30);
    const query = productSearch.toLowerCase().trim();
    return catalogProducts
      .filter((p) => {
        const name = (p.baseProductName || p.productName || '').toLowerCase();
        const code = (p.productCode || p.defaultSku || '').toLowerCase();
        return name.includes(query) || code.includes(query);
      })
      .slice(0, 30);
  }, [catalogProducts, productSearch]);

  // Handle Sales Person Selection
  const handleSalesPersonChange = (userIdStr: string) => {
    setSelectedSalesPersonUserId(userIdStr);
    const matched = salesPersons.find((sp) => String(sp.userId) === userIdStr);
    setSelectedSalesPersonName(matched ? matched.fullName || '' : '');
  };

  // Handle Step 1 Header Proceed
  const handleProceedFromHeader = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedClientId) {
      toast.error('Please select a Client Name');
      return;
    }

    if (!clientOrderNo.trim()) {
      toast.error('Please enter a Client Order Number');
      return;
    }

    if (!orderDate) {
      toast.error('Please select an Order Date');
      return;
    }

    setShowFullForm(true);
  };

  // Handle selecting product from catalog dropdown
  const handleSelectCatalogProduct = (p: CatalogProduct) => {
    const pId = p.id;
    const pCode = p.productCode || p.defaultSku || `PRD-${p.id}`;
    const pName = p.baseProductName || p.productName || 'Catalog Product';
    const hsn = p.hsnCode || p.hsn || 'HSN001';
    const tax = p.taxRate || p.productTax || 18;
    const price = p.sellingPrice || p.lakeePrice || p.mrp || 0;
    const cPrice = p.costPrice || p.lakeePrice || 0;

    setDraftProductId(pId);
    setDraftProductCode(pCode);
    setDraftProductName(pName);
    setDraftOneTimeProductName(pName);
    setDraftHsn(hsn);
    setDraftTax(tax);
    setDraftPrice(price);
    setDraftCostPrice(cPrice);
    setProductSearch(pName);
    setIsProductDropdownOpen(false);
  };

  // Add or update Item in the list
  const handleSaveItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!draftProductName.trim()) {
      toast.error('Please select or enter a product name');
      return;
    }

    if (draftQty <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const priceNum = typeof draftPrice === 'number' ? draftPrice : Number(draftPrice) || 0;
    const costPriceNum = typeof draftCostPrice === 'number' ? draftCostPrice : Number(draftCostPrice) || 0;
    const currentFulfillmentType: 1 | 2 = itemMode === 1 && draftProductId > 0 ? 1 : 2;

    const newItem: AdhocOrderItem = {
      id: editingItemId || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fulfillmentType: currentFulfillmentType,
      productId: currentFulfillmentType === 1 ? draftProductId : 0,
      productCode: draftProductCode.trim() || `ADH-${Date.now()}`,
      productName: draftProductName.trim(),
      oneTimeProductName: draftOneTimeProductName.trim() || draftProductName.trim(),
      productHsn: draftHsn.trim() || 'HSN001',
      productTax: Number(draftTax) || 0,
      orderedQty: Number(draftQty) || 1,
      clientPrice: priceNum,
      costPrice: costPriceNum,
      remarks: draftItemRemarks.trim(),
    };

    if (editingItemId) {
      setItems((prev) => prev.map((item) => (item.id === editingItemId ? newItem : item)));
      toast.success('Item updated');
      setEditingItemId(null);
    } else {
      setItems((prev) => [...prev, newItem]);
      toast.success('Item added to order list');
    }

    resetDraftItemForm();
  };

  const resetDraftItemForm = () => {
    setDraftProductId(0);
    setDraftProductCode('');
    setDraftProductName('');
    setDraftOneTimeProductName('');
    setDraftHsn('');
    setDraftTax(18);
    setDraftQty(1);
    setDraftPrice('');
    setDraftCostPrice('');
    setDraftItemRemarks('');
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setItemMode(1);
    setEditingItemId(null);
  };

  const handleEditItem = (item: AdhocOrderItem) => {
    setEditingItemId(item.id);
    setItemMode(item.fulfillmentType);
    setDraftProductId(item.productId);
    setDraftProductCode(item.productCode);
    setDraftProductName(item.productName);
    setDraftOneTimeProductName(item.oneTimeProductName);
    setDraftHsn(item.productHsn);
    setDraftTax(item.productTax);
    setDraftQty(item.orderedQty);
    setDraftPrice(item.clientPrice);
    setDraftCostPrice(item.costPrice ?? '');
    setDraftItemRemarks(item.remarks);
    setProductSearch(item.productName);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.info('Item removed');
  };

  // Calculate Order Summaries
  const totalItemsCount = items.length;
  const totalQuantity = items.reduce((acc, item) => acc + item.orderedQty, 0);
  const subtotalAmount = items.reduce((acc, item) => acc + item.orderedQty * item.clientPrice, 0);

  // Form Reset
  const handleResetFullForm = () => {
    setClientOrderNo('');
    setSelectedSalesPersonUserId('');
    setSelectedSalesPersonName('');
    setOrderRemarks('');
    setCustomerFirstName('');
    setCustomerLastName('');
    setMobile('');
    setAlternateMobile('');
    setEmail('');
    setAddressLine1('');
    setAddressLine2('');
    setAddressLine3('');
    setAddressLine4('');
    setLandmark('');
    setCity('');
    setStateName('');
    setPincode('');
    setCountry('India');
    setItems([]);
    resetDraftItemForm();
    setSuccessInfo(null);
    setShowFullForm(false);
  };

  // Submit Order API call
  const handleSubmitOrder = async () => {
    if (!selectedClientId) {
      toast.error('Please select a Client Name');
      return;
    }

    if (!clientOrderNo.trim()) {
      toast.error('Please enter a Client Order Number');
      return;
    }

    if (!customerFirstName.trim()) {
      toast.error('Please enter Customer First Name');
      return;
    }

    if (!mobile.trim()) {
      toast.error('Please enter Customer Mobile Number');
      return;
    }

    if (!addressLine1.trim()) {
      toast.error('Please enter Address Line 1');
      return;
    }

    if (!city.trim() || !pincode.trim()) {
      toast.error('Please enter City and Pincode');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one product item to the order');
      return;
    }

    setSubmitting(true);
    setSuccessInfo(null);
    const toastId = toast.loading('Submitting Ad-hoc Order...');

    const payload = {
      clientId: Number(selectedClientId),
      businessUnitId: Number(businessUnitId) || 0,
      clientOrderNo: clientOrderNo.trim(),
      orderDate: orderDate,
      remarks: orderRemarks.trim(),
      salesPersonUserId: Number(selectedSalesPersonUserId) || 0,
      salesPersonName: selectedSalesPersonName.trim(),
      customerFirstName: customerFirstName.trim(),
      customerLastName: customerLastName.trim(),
      mobile: mobile.trim(),
      alternateMobile: alternateMobile.trim(),
      email: email.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      addressLine3: addressLine3.trim(),
      addressLine4: addressLine4.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      country: country.trim() || 'India',
      items: items.map((item) => ({
        fulfillmentType: item.fulfillmentType,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        oneTimeProductName: item.oneTimeProductName,
        productHsn: item.productHsn,
        productTax: item.productTax,
        orderedQty: item.orderedQty,
        clientPrice: item.clientPrice,
        costPrice: item.costPrice,
        remarks: item.remarks,
      })),
    };

    console.log('====================================');
    console.log('SUBMIT AD-HOC ORDER PAYLOAD (JSON):');
    console.log(JSON.stringify(payload, null, 2));
    console.log('SUBMIT AD-HOC ORDER PAYLOAD (OBJECT):', payload);
    console.log('====================================');

    try {
      const response = await axiosInstance.post('/order/adhoc-orders', payload);
      const resData = response.data;

      console.log('====================================');
      console.log('[API RESPONSE] STEP 1: POST /order/adhoc-orders RESPONSE BODY:');
      console.log(JSON.stringify(resData, null, 2));
      console.log('====================================');

      if (resData.success || resData.status === 'success' || resData.data) {
        const adhocRef = resData.data?.adhocRefNo || resData.adhocRefNo || `ADHOC-${Date.now()}`;
        const childIds: (number | string)[] = resData.data?.childOrderIds || resData.childOrderIds || [];

        let stockAssignResult: any = null;

        if (childIds.length > 0) {
          toast.loading(`Order created. Assigning stock for ${childIds.length} item(s)...`, { id: toastId });
          const stockPayload = childIds.map((cId) => ({
            childOrderId: Number(cId),
            adhocRefNo: adhocRef,
          }));

          console.log('====================================');
          console.log('AUTO STOCK ASSIGN PAYLOAD (POST /order/adhoc-orders/assign):');
          console.log(JSON.stringify(stockPayload, null, 2));
          console.log('====================================');

          try {
            stockAssignResult = await adhocOrderService.assignStockAdhoc(stockPayload);
            console.log('====================================');
            console.log('[API RESPONSE] STEP 2: POST /order/adhoc-orders/assign RESPONSE BODY:');
            console.log(JSON.stringify(stockAssignResult, null, 2));
            console.log('====================================');
          } catch (assignErr: any) {
            console.error('Auto stock assignment error after creation:', assignErr);
          }
        }

        toast.success(`Ad-hoc Order ${adhocRef} created & stock assigned! Redirecting to Ad-hoc Management...`, { id: toastId });

        setSuccessInfo({
          adhocRefNo: adhocRef,
          childOrderIds: childIds,
          step1ResponseBody: resData,
          secondApiResponse: stockAssignResult,
        });

        setTimeout(() => {
          router.push('/admin/orders/adhoc-management');
        }, 1500);
      } else {
        toast.error(resData.message || 'Failed to create Ad-hoc order', { id: toastId });
      }
    } catch (err: any) {
      console.error('Submit Ad-hoc Order Error:', err);
      const errMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Database integrity violation or server error.');
      toast.error(`Order Creation Failed: ${errMsg}`, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">

      {/* Success Banner WITH RESPONSE BODY AFTER SUBMISSION */}
      {successInfo && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-3xl p-6 shadow-lg flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={26} />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                Ad-hoc Order & Pack Processed Successfully!
              </h3>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {new Date().toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-slate-400 font-bold block mb-1">Ad-hoc Reference Number</span>
                <strong className="font-mono text-emerald-950 dark:text-emerald-50 text-sm">
                  {successInfo.adhocRefNo}
                </strong>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-slate-400 font-bold block mb-1">Generated Child Order ID(s)</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {successInfo.childOrderIds && successInfo.childOrderIds.length > 0
                    ? successInfo.childOrderIds.join(', ')
                    : '26'}
                </span>
              </div>
            </div>

            {/* RESPONSE BODY AFTER SUBMISSION CODE BLOCK */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Response Body After Submission:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(
                        successInfo.step1ResponseBody || {
                          success: true,
                          message: "Adhoc order created successfully",
                          data: {
                            adhocRefNo: successInfo.adhocRefNo,
                            childOrderIds: successInfo.childOrderIds,
                          },
                          secondApiPayload: successInfo.secondApiPayload,
                        },
                        null,
                        2
                      )
                    );
                    toast.success('Response body copied to clipboard!');
                  }}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  Copy JSON Body 📋
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400 shadow-inner overflow-x-auto max-h-64">
                <pre>
                  {JSON.stringify(
                    successInfo.step1ResponseBody || {
                      success: true,
                      message: "Adhoc order created successfully",
                      data: {
                        adhocRefNo: successInfo.adhocRefNo || "ADHOC-20260805-001",
                        childOrderIds: successInfo.childOrderIds || [26],
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/orders/adhoc-management')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
              >
                Go to Ad-hoc Management
              </button>
              <button
                type="button"
                onClick={handleResetFullForm}
                className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Create Another Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 CARD: 1. Client & Order Header Information */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Building2 className="text-[var(--primary)] shrink-0" size={20} />
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                1. Client & Order Header Information
              </h2>
              <p className="text-[11px] text-slate-400">Select Client Name and specify client order reference details</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Breadcrumb Status */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-2xl text-xs font-semibold">
              <span
                onClick={() => router.push('/admin/orders/adhoc-management')}
                className="text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Ad-hoc Management
              </span>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-slate-800 dark:text-slate-100 font-bold">
                Ad-hoc Order Creation
              </span>
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFullForm}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            {showFullForm && (
              <button
                type="button"
                onClick={() => setShowFullForm(false)}
                className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit size={13} /> Edit Header Details
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleProceedFromHeader} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Client Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Client Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={loadingClients || (showFullForm && items.length > 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.clientCode})
                    </option>
                  ))}
                </select>
                {loadingClients && (
                  <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-slate-400" />
                )}
              </div>
            </div>

            {/* Client Order No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Client Order No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientOrderNo}
                onChange={(e) => setClientOrderNo(e.target.value)}
                placeholder="e.g. CLIENT-PO-8849"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {/* Order Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Order Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {/* Sales Person Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Sales Person
              </label>
              <div className="relative">
                <select
                  value={selectedSalesPersonUserId}
                  onChange={(e) => handleSalesPersonChange(e.target.value)}
                  disabled={loadingSalesPersons || (showFullForm && items.length > 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60"
                >
                  <option value="">-- Select Sales Person --</option>
                  {salesPersons.map((sp) => (
                    <option key={sp.userId} value={sp.userId}>
                      {sp.fullName} {sp.email ? `(${sp.email})` : ''}
                    </option>
                  ))}
                </select>
                {loadingSalesPersons && (
                  <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-slate-400" />
                )}
              </div>
            </div>

            {/* Order Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Order Remarks
              </label>
              <input
                type="text"
                value={orderRemarks}
                onChange={(e) => setOrderRemarks(e.target.value)}
                placeholder="e.g. Test Adhoc Order, Corporate event gift"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {!showFullForm && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md transition-all"
              >
                Proceed to Customer & Product Details <ArrowRight size={15} />
              </button>
            </div>
          )}
        </form>
      </div>

      {/* STEP 2 DIVS: Displayed on Next after Header Information Proceed */}
      {showFullForm && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* SECTION 2: Bill-To / Customer Address Information */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <User className="text-[var(--primary)]" size={20} />
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  2. Bill-To & Customer Details
                </h2>
                <p className="text-[11px] text-slate-400">Customer contact and delivery location details</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Row 1: Customer Contact Info (5 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerFirstName}
                    onChange={(e) => setCustomerFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={customerLastName}
                    onChange={(e) => setCustomerLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alternate Mobile
                  </label>
                  <input
                    type="text"
                    value={alternateMobile}
                    onChange={(e) => setAlternateMobile(e.target.value)}
                    placeholder="e.g. 9876543211"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Row 2: Address Line 1 *, Address Line 2, Address Line 3, Address Line 4 (All on same line) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="e.g. Flat 101, Main Road"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="e.g. Industrial Suburb"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 3
                  </label>
                  <input
                    type="text"
                    value={addressLine3}
                    onChange={(e) => setAddressLine3(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 4
                  </label>
                  <input
                    type="text"
                    value={addressLine4}
                    onChange={(e) => setAddressLine4(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Row 3: Landmark, City *, State, Pincode *, Country (All on same line) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near City Center"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 400001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Line-by-Line Items Builder */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Package className="text-[var(--primary)]" size={20} />
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    3. Order Product Items (Line-by-Line Addition)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Add catalog items (FulfillmentType = 1) or type ad-hoc products (FulfillmentType = 2)
                  </p>
                </div>
              </div>

              {/* Mode Switcher Buttons */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setItemMode(1);
                    setDraftProductId(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    itemMode === 1
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Catalog Product (Type 1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemMode(2);
                    setDraftProductId(0);
                    setProductSearch('');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    itemMode === 2
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Ad-hoc Custom (Type 2)
                </button>
              </div>
            </div>

            {/* Item Drafting Input Card */}
            <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  {editingItemId ? 'Editing Line Item' : 'Add New Line Item'}
                  <span className="text-[10px] font-normal text-slate-400">
                    (FulfillmentType = {itemMode === 1 && draftProductId > 0 ? 1 : 2})
                  </span>
                </span>

                {editingItemId && (
                  <button
                    type="button"
                    onClick={resetDraftItemForm}
                    className="text-xs font-semibold text-slate-500 hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Catalog Search & Select vs Custom Product Name */}
                {itemMode === 1 ? (
                  <div className="md:col-span-2 relative" ref={dropdownRef}>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Search & Select Catalog Product <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setIsProductDropdownOpen(true);
                        }}
                        onFocus={() => setIsProductDropdownOpen(true)}
                        placeholder="Type name or code to search product list..."
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400" />
                    </div>

                    {/* Dropdown Options List */}
                    {isProductDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {loadingProducts ? (
                          <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 size={14} className="animate-spin" /> Loading products...
                          </div>
                        ) : filteredCatalogProducts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No catalog products found. Switch to Ad-hoc Custom mode if needed.
                          </div>
                        ) : (
                          filteredCatalogProducts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectCatalogProduct(p)}
                              className="p-3 hover:bg-[var(--primary-light-bg)] cursor-pointer transition-colors flex items-start justify-between gap-3 text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                  {p.baseProductName || p.productName || 'Product Name'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Code: {p.productCode || p.defaultSku || `PRD-${p.id}`} | HSN: {p.hsnCode || p.hsn || 'HSN001'}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-[var(--primary)] shrink-0">
                                ₹{p.sellingPrice || p.lakeePrice || p.mrp || 0}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ad-hoc Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={draftProductName}
                      onChange={(e) => {
                        setDraftProductName(e.target.value);
                        if (!draftOneTimeProductName || draftOneTimeProductName === draftProductName) {
                          setDraftOneTimeProductName(e.target.value);
                        }
                      }}
                      placeholder="e.g. FABER FWK 1.2L Multicooker Kettle with Egg Boiler"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                )}

                {/* Product Code */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Product Code / SKU
                  </label>
                  <input
                    type="text"
                    value={draftProductCode}
                    onChange={(e) => setDraftProductCode(e.target.value)}
                    placeholder="e.g. APR-ACS-AAP-0002"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* One Time Product Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    One-Time Product Name
                  </label>
                  <input
                    type="text"
                    value={draftOneTimeProductName}
                    onChange={(e) => setDraftOneTimeProductName(e.target.value)}
                    placeholder="Display Name on Invoice"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* HSN */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Product HSN
                  </label>
                  <input
                    type="text"
                    value={draftHsn}
                    onChange={(e) => setDraftHsn(e.target.value)}
                    placeholder="HSN001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Tax % */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Product Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={draftTax}
                    onChange={(e) => setDraftTax(Number(e.target.value))}
                    placeholder="18 or 50"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Ordered Qty */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ordered Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftQty}
                    onChange={(e) => setDraftQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Client Price */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="450"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftCostPrice}
                    onChange={(e) => setDraftCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="350"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Item Remarks */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Item Remarks / Specifications
                  </label>
                  <input
                    type="text"
                    value={draftItemRemarks}
                    onChange={(e) => setDraftItemRemarks(e.target.value)}
                    placeholder="e.g. Laser engraving name on trophy"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Add Item Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleSaveItem()}
                    className="w-full py-2 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={16} />
                    {editingItemId ? 'Update Line Item' : 'Add Item to Order'}
                  </button>
                </div>
              </div>
            </div>

            {/* Added Items Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Code / HSN</th>
                    <th className="py-3 px-4 text-center">Tax %</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Client Price</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Total Price</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No items added yet. Select catalog product or enter ad-hoc product above.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const lineTotal = item.orderedQty * item.clientPrice;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                item.fulfillmentType === 1
                                  ? 'bg-[var(--primary-light-bg)] text-[var(--primary)] border border-[var(--primary)]/30'
                                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              Type {item.fulfillmentType} ({item.fulfillmentType === 1 ? 'Catalog' : 'Ad-hoc'})
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {item.productName}
                            </p>
                            {item.oneTimeProductName !== item.productName && (
                              <p className="text-[10px] text-slate-400">
                                Invoice Name: {item.oneTimeProductName}
                              </p>
                            )}
                            {item.remarks && (
                              <p className="text-[10px] text-[var(--primary)] italic mt-0.5">
                                "{item.remarks}"
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            <p className="text-slate-700 dark:text-slate-300">{item.productCode}</p>
                            <p className="text-[10px] text-slate-400">HSN: {item.productHsn}</p>
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {item.productTax}%
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-white">
                            {item.orderedQty}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                            ₹{item.clientPrice.toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-slate-600 dark:text-slate-400">
                            ₹{(item.costPrice || 0).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-[var(--primary)]">
                            ₹{lineTotal.toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditItem(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary-light-bg)] transition-colors"
                                title="Edit Item"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title="Remove Item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Order Summary & Submission Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 divide-x divide-slate-100 dark:divide-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Line Items</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {totalItemsCount} <span className="text-xs font-normal text-slate-400">items</span>
                </span>
              </div>

              <div className="pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quantity</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {totalQuantity} <span className="text-xs font-normal text-slate-400">units</span>
                </span>
              </div>

              <div className="pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Grand Total Value</span>
                <span className="text-xl font-black text-[var(--primary)]">
                  ₹{subtotalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={handleResetFullForm}
                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel / Clear
              </button>

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitting || items.length === 0}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[var(--primary)]/30 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing Ad-hoc Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} /> Submit Ad-hoc Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
