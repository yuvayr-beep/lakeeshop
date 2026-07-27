'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, X, Plus, Trash2, Edit3, Check, Calendar, MapPin, 
  Warehouse, FileText, ChevronRight, Sparkles, Loader2, AlertTriangle, 
  Info, ShoppingBag, ArrowRight, RefreshCw, Layers, DollarSign, Tag, Clock
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import SupplierModal from '@/app/admin/suppliers/components/SupplierModal';

// Parsing NDJSON format returned by the backend proxy
const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  if (typeof raw !== 'string') {
    try {
      return [JSON.parse(JSON.stringify(raw))];
    } catch {
      return [];
    }
  }
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
};

const getTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ReceiveStockClient() {
  // --- Step 1: Initial Supplier & Invoice Input ---
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierFocused, setIsSupplierFocused] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);
  const [existingGrnNumber, setExistingGrnNumber] = useState<string | null>(null);
  const [showFullForm, setShowFullForm] = useState(false);

  // --- Step 2: Main Invoice Header Details ---
  const [invoiceDate, setInvoiceDate] = useState(getTodayString());
  const [invoiceDateError, setInvoiceDateError] = useState<string | null>(null);
  const [supplierGstin, setSupplierGstin] = useState('');
  const [gstType, setGstType] = useState(''); // CGST_SGST or IGST
  const [receivingLocationId, setReceivingLocationId] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [grnRemarks, setGrnRemarks] = useState('');

  // --- Step 2: Product Addition State ---
  const [selectionMode, setSelectionMode] = useState<'direct' | 'po'>('direct');
  
  // A. Direct Product List States
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  const [allProductsMap, setAllProductsMap] = useState<Record<number, any>>({});
  const [directProductSearch, setDirectProductSearch] = useState('');
  const [isDirectProductFocused, setIsDirectProductFocused] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

  // B. PO List States
  const [supplierPOs, setSupplierPOs] = useState<any[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<number | ''>('');
  const [poProducts, setPoProducts] = useState<any[]>([]);
  const [poProductSearch, setPoProductSearch] = useState('');
  const [isPoProductFocused, setIsPoProductFocused] = useState(false);
  const [selectedPoProduct, setSelectedPoProduct] = useState<any | null>(null);

  // Common Product Form Details
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemMrp, setItemMrp] = useState<number | ''>('');
  const [itemCode, setItemCode] = useState('');
  const [invoiceQty, setInvoiceQty] = useState<number | ''>('');
  const [qtyReceived, setQtyReceived] = useState<number | ''>('');
  const [itemDiscountAmount, setItemDiscountAmount] = useState<number | ''>(0);
  const [itemDiscountType, setItemDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [itemHsn, setItemHsn] = useState('');
  const [itemTaxRate, setItemTaxRate] = useState<number>(0);
  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [selectedPoItemId, setSelectedPoItemId] = useState<number | null>(null);
  const [selectedProductName, setSelectedProductName] = useState('');

  // Price validation / History states
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [lastMRP, setLastMRP] = useState<number | null>(null);
  const [priceDifferencePercent, setPriceDifferencePercent] = useState<number>(0);
  const [validatingPrice, setValidatingPrice] = useState(false);

  // PO Lookups for Option A (optional PO link)
  const [poLookupOptions, setPoLookupOptions] = useState<any[]>([]);
  const [selectedPoLookupId, setSelectedPoLookupId] = useState<number | ''>('');

  // Dynamic Info Panels (Preorders & Stock Breakdown)
  const [preorders, setPreorders] = useState<any[]>([]);
  const [loadingPreorders, setLoadingPreorders] = useState(false);
  const [stockBreakdown, setStockBreakdown] = useState<any[]>([]);
  const [loadingStockBreakdown, setLoadingStockBreakdown] = useState(false);

  // --- Step 3: Added Items Table State ---
  const [addedItems, setAddedItems] = useState<any[]>([]);
  
  // Inline edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editInvoiceQty, setEditInvoiceQty] = useState<number | ''>('');
  const [editReceivedQty, setEditReceivedQty] = useState<number | ''>('');
  const [editMrp, setEditMrp] = useState<number | ''>('');
  const [editTaxRate, setEditTaxRate] = useState<number | ''>('');
  const [editDiscountAmount, setEditDiscountAmount] = useState<number | ''>(0);
  const [editDiscountType, setEditDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

  // Overall Invoice Discount State
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState<number | ''>(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

  // Submission State
  const [submittingGrn, setSubmittingGrn] = useState(false);

  // Load active suppliers and warehouses on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingSuppliers(true);
        // Load Suppliers
        const supRes = await axiosInstance.get('/vendor/suppliers', {
          headers: { Accept: 'application/x-ndjson' },
        });
        setSuppliers(parseNdjson(supRes.data));

        // Load Warehouses
        const whRes = await axiosInstance.get('/stock/warehouse/active', {
          headers: { Accept: 'application/x-ndjson' },
        });
        setWarehouses(parseNdjson(whRes.data));
      } catch (err) {
        console.error('Error loading initialization data:', err);
        toast.error('Failed to load supplier lists.');
      } finally {
        setLoadingSuppliers(false);
      }
    }
    loadInitialData();
  }, []);

  const handleSupplierCreated = async (newSup?: any) => {
    try {
      setLoadingSuppliers(true);
      const supRes = await axiosInstance.get('/vendor/suppliers', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const updatedList = parseNdjson(supRes.data);
      setSuppliers(updatedList);

      if (newSup) {
        const matched = updatedList.find(
          (s) =>
            (newSup.supplierCode && s.supplierCode === newSup.supplierCode) ||
            (newSup.name && s.name?.toLowerCase() === newSup.name.toLowerCase())
        );
        if (matched) {
          setSupplierId(matched.id);
          setSupplierSearch(matched.name || '');
          setIsSupplierFocused(false);
          toast.success(`Selected supplier: ${matched.name}`);
        }
      }
    } catch (err) {
      console.error('Failed to reload suppliers after creation:', err);
      toast.error('Failed to refresh supplier list.');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const query = supplierSearch.toLowerCase();
    return suppliers.filter(
      (sup) =>
        sup.name?.toLowerCase().includes(query) ||
        sup.supplierCode?.toLowerCase().includes(query) ||
        String(sup.id).includes(query)
    );
  }, [suppliers, supplierSearch]);

  const selectedSupplierName = useMemo(() => {
    if (!supplierId || suppliers.length === 0) return '';
    const match = suppliers.find((s) => s.id === Number(supplierId));
    return match ? match.name : '';
  }, [supplierId, suppliers]);

  // Handle invoice date validation
  const validateInvoiceDate = (dateStr: string) => {
    if (!dateStr) {
      setInvoiceDateError('Invoice date is required.');
      return false;
    }
    const selected = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);

    if (selected > today) {
      setInvoiceDateError('Future date is not allowed.');
      return false;
    }
    if (selected < threeMonthsAgo) {
      setInvoiceDateError('Invoice date cannot be older than 3 months.');
      return false;
    }
    setInvoiceDateError(null);
    return true;
  };

  const handleInvoiceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInvoiceDate(val);
    validateInvoiceDate(val);
  };

  // --- Actions & API Fetching ---
  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('Please select a Supplier.');
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error('Invoice Number is required.');
      return;
    }

    setCheckingDuplicate(true);
    setDuplicateCheckError(null);
    setExistingGrnNumber(null);

    try {
      const { data } = await axiosInstance.get(`/stock/grn/duplicate-invoice`, {
        params: {
          supplierId: Number(supplierId),
          invoiceNumber: invoiceNumber.trim()
        }
      });

      const isDuplicate = data?.data?.duplicate;
      const grnNum = data?.data?.existingGrnNumber;

      if (isDuplicate) {
        setExistingGrnNumber(grnNum || 'N/A');
        setDuplicateCheckError(`Invoice number already created under GRN: ${grnNum || 'N/A'}`);
        toast.error(`Invoice already exists. GRN: ${grnNum || 'N/A'}`);
      } else {
        toast.success('Invoice check passed. Fetching supplier details...');
        // Duplicate check succeeded. Load remaining supplier config
        await fetchSupplierConfig(Number(supplierId));
        setShowFullForm(true);
      }
    } catch (err: any) {
      console.error('Duplicate check failed:', err);
      toast.error('Failed to check for duplicate invoices. Please try again.');
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const fetchSupplierConfig = async (supId: number) => {
    try {
      // 1. Fetch addresses to find GSTIN & GST Type
      const addrRes = await axiosInstance.get(`/vendor/supplier-addresses/${supId}`, {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsedAddrs = parseNdjson(addrRes.data);
      const defaultAddr = parsedAddrs.find((a) => a.isDefault) || parsedAddrs[0];

      if (defaultAddr) {
        setSupplierGstin(defaultAddr.gstin || '');
        setGstType(defaultAddr.gstType || 'CGST_SGST');
        setReceivingLocationId(defaultAddr.id || null);
      } else {
        setSupplierGstin('');
        setGstType('CGST_SGST');
        setReceivingLocationId(null);
      }

      // 2. Fetch Supplier Shared products approved
      const shareRes = await axiosInstance.get(
        `/prod/supplier-product-share/paginated?supplierId=${supId}&shareStatus=APPROVED&page=0&size=500`,
        { headers: { Accept: 'application/x-ndjson' } }
      );
      setSupplierProducts(parseNdjson(shareRes.data));

      // 3. Fetch all products details for direct search lookup
      const prodRes = await axiosInstance.get('/prod/products', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsedProds = parseNdjson(prodRes.data);
      const mapping: Record<number, any> = {};
      parsedProds.forEach((p: any) => {
        mapping[p.id] = p;
      });
      setAllProductsMap(mapping);

      // 4. Fetch supplier active POs (OPEN=1 & PARTIALLY_RECEIVED=2)
      try {
        const [openPoRes, partialPoRes] = await Promise.all([
          axiosInstance.get(`/stock/purchase-orders?supplierId=${supId}&status=1`, {
            headers: { Accept: 'application/x-ndjson' }
          }),
          axiosInstance.get(`/stock/purchase-orders?supplierId=${supId}&status=2`, {
            headers: { Accept: 'application/x-ndjson' }
          })
        ]);
        const openPOs = parseNdjson(openPoRes.data);
        const partialPOs = parseNdjson(partialPoRes.data);
        setSupplierPOs([...openPOs, ...partialPOs]);
      } catch (poErr) {
        console.warn('Failed to load supplier POs (backend listing error):', poErr);
        setSupplierPOs([]);
      }

    } catch (err) {
      console.error('Failed to load supplier addresses/products:', err);
      toast.warning('Failed to load address or catalog config.');
    }
  };

  // Direct Product Filter (Option A)
  const filteredDirectProducts = useMemo(() => {
    const addedProductIds = new Set(addedItems.map((item) => item.productId));
    return supplierProducts.filter((item) => {
      const prodId = item.productId || item.productid;
      if (addedProductIds.has(prodId)) return false;

      const details = allProductsMap[prodId] || {};
      const query = directProductSearch.toLowerCase();
      return (
        item.supplierSkuCode?.toLowerCase().includes(query) ||
        details.baseProductName?.toLowerCase().includes(query) ||
        String(prodId).includes(query)
      );
    });
  }, [supplierProducts, allProductsMap, directProductSearch, addedItems]);

  // PO Filter (Option B)
  const filteredPOs = useMemo(() => {
    if (!poProductSearch) return supplierPOs;
    const query = poProductSearch.toLowerCase();
    return supplierPOs.filter(
      (po) =>
        po.poNumber?.toLowerCase().includes(query) ||
        String(po.id).includes(query)
    );
  }, [supplierPOs, poProductSearch]);

  // Reset Product Selection fields
  const resetProductFields = (overrideMode?: 'direct' | 'po') => {
    const activeMode = overrideMode !== undefined ? overrideMode : selectionMode;
    setDirectProductSearch('');
    if (activeMode !== 'po') {
      setPoProductSearch('');
      setSelectedPoId('');
      setSelectedPoNumber('');
      setPoProducts([]);
    }
    setSelectedProductId('');
    setSelectedProductName('');
    setSelectedPoProduct(null);
    setItemPrice('');
    setItemMrp('');
    setItemCode('');
    setInvoiceQty('');
    setQtyReceived('');
    setItemDiscountAmount(0);
    setItemDiscountType('PERCENTAGE');
    setItemHsn('');
    setItemTaxRate(0);
    if (activeMode !== 'po') {
      setSelectedPoNumber('');
    }
    setSelectedPoItemId(null);
    setLastPrice(null);
    setLastMRP(null);
    setPriceDifferencePercent(0);
    setPoLookupOptions([]);
    setSelectedPoLookupId('');
    setPreorders([]);
    setStockBreakdown([]);
  };

  const handleResetAll = () => {
    setAddedItems([]);
    setInvoiceDiscountAmount(0);
    setInvoiceDiscountType('PERCENTAGE');
    setShowFullForm(false);
    setSupplierId('');
    setSupplierSearch('');
    setInvoiceNumber('');
    setInvoiceDate(getTodayString());
    setInvoiceDateError(null);
    setSupplierGstin('');
    setGstType('');
    setReceivingLocationId(null);
    setSelectedWarehouseId('');
    setGrnRemarks('');
    
    // Clear all product & PO selection fields
    setDirectProductSearch('');
    setPoProductSearch('');
    setSelectedPoId('');
    setSelectedPoNumber('');
    setPoProducts([]);
    setSelectedProductId('');
    setSelectedProductName('');
    setSelectedPoProduct(null);
    setItemPrice('');
    setItemMrp('');
    setItemCode('');
    setInvoiceQty('');
    setQtyReceived('');
    setItemDiscountAmount(0);
    setItemDiscountType('PERCENTAGE');
    setItemHsn('');
    setItemTaxRate(0);
    setSelectedPoItemId(null);
    setLastPrice(null);
    setLastMRP(null);
    setPriceDifferencePercent(0);
    setPoLookupOptions([]);
    setSelectedPoLookupId('');
    setPreorders([]);
    setStockBreakdown([]);
  };

  // Load details when a product is selected in Direct Option
  const handleSelectDirectProduct = async (item: any) => {
    const prodId = item.productId || item.productid;
    setSelectedProductId(prodId);
    const initialName = allProductsMap[prodId]?.baseProductName || item.supplierSkuCode || '';
    setSelectedProductName(initialName);
    setDirectProductSearch(initialName);
    setItemCode(item.supplierSkuCode);
    setItemPrice(item.supplierPrice || '');
    
    // Fetch product details for Tax & HSN
    try {
      const res = await axiosInstance.get(`/prod/products/${prodId}`, {
        headers: { Accept: 'application/json' }
      });
      let prod = null;
      if (res.data && typeof res.data === 'string') {
        const parsedList = parseNdjson(res.data);
        prod = parsedList[0]?.data || parsedList[0];
      } else {
        prod = res.data?.data || res.data;
      }
      if (prod) {
        setItemHsn(prod.hsnCode || '');
        setItemTaxRate(prod.taxPercentage || 0);
        setItemMrp(prod.mrp || '');
        setLastMRP(prod.mrp || null);
        setSelectedProductName(prod.baseProductName || initialName);
      }
    } catch (err) {
      console.warn('Failed to load specific product detail:', err);
    }

    // Validate Price
    await triggerPriceValidation(prodId, item.supplierPrice || 0);

    // Fetch PO Lookup options for this product
    try {
      const poLookupRes = await axiosInstance.get(`/stock/purchase-orders/items/lookup`, {
        params: {
          productId: prodId,
          supplierId: Number(supplierId)
        },
        headers: { Accept: 'application/x-ndjson' }
      });
      setPoLookupOptions(parseNdjson(poLookupRes.data));
    } catch (err) {
      console.warn('Failed to lookup POs for product:', err);
    }

    // Fetch Preorders & Stock Breakdown
    fetchPreordersAndStock(prodId);
  };

  // Load details when a PO is selected (Option B)
  const handleSelectPO = async (po: any) => {
    setSelectedPoId(po.id);
    setSelectedPoNumber(po.poNumber);
    setPoProductSearch(po.poNumber);
    
    // Auto-align warehouse if available
    if (po.warehouseId) {
      setSelectedWarehouseId(po.warehouseId);
    }

    // Load PO Products
    try {
      const itemsRes = await axiosInstance.get(`/stock/purchase-order-item/po/${po.id}`, {
        headers: { Accept: 'application/x-ndjson' }
      });
      setPoProducts(parseNdjson(itemsRes.data));
    } catch (err) {
      console.error('Failed to load PO products:', err);
      toast.error('Failed to load items in selected PO.');
    }
  };

  // Load details when a PO Product is selected
  const handleSelectPOProduct = async (poItem: any) => {
    setSelectedPoProduct(poItem);
    const prodId = poItem.productId || poItem.productid;
    setSelectedProductId(prodId);
    const initialName = poItem.productName || poItem.itemName || '';
    setSelectedProductName(initialName);
    setItemCode(poItem.vendorSku);
    setItemPrice(poItem.unitPrice || '');
    setInvoiceQty(0);
    setQtyReceived(0);
    setItemHsn(poItem.hsnCode || '');
    setItemTaxRate(poItem.taxRate || 0);
    setSelectedPoItemId(poItem.id);

    // Fetch product details for MRP
    try {
      const res = await axiosInstance.get(`/prod/products/${prodId}`, {
        headers: { Accept: 'application/json' }
      });
      let prod = null;
      if (res.data && typeof res.data === 'string') {
        const parsedList = parseNdjson(res.data);
        prod = parsedList[0]?.data || parsedList[0];
      } else {
        prod = res.data?.data || res.data;
      }
      if (prod) {
        setItemMrp(prod.mrp || '');
        setLastMRP(prod.mrp || null);
        setSelectedProductName(prod.baseProductName || initialName);
      }
    } catch (err) {
      console.warn('Failed to load product detail:', err);
    }

    // Validate Price
    await triggerPriceValidation(prodId, poItem.unitPrice || 0);

    // Fetch Preorders & Stock Breakdown
    fetchPreordersAndStock(prodId);
  };

  // Trigger Price Validation API
  const triggerPriceValidation = async (prodId: number, currentPrice: number) => {
    setValidatingPrice(true);
    try {
      const { data } = await axiosInstance.get(`/stock/grn/validate-price`, {
        params: {
          supplierId: Number(supplierId),
          productId: prodId,
          currentPrice: currentPrice
        }
      });
      const info = data?.data;
      if (info) {
        setLastPrice(info.lastPrice);
        setPriceDifferencePercent(info.percentageDifference || 0);
      }
    } catch (err) {
      console.warn('Price validation failed:', err);
    } finally {
      setValidatingPrice(false);
    }
  };

  const handlePriceChange = async (val: string) => {
    const numeric = parseFloat(val);
    setItemPrice(val === '' ? '' : numeric);
    if (!isNaN(numeric) && selectedProductId) {
      await triggerPriceValidation(Number(selectedProductId), numeric);
    }
  };

  // Fetch Preorders & Stock Summary
  const fetchPreordersAndStock = async (prodId: number) => {
    setLoadingPreorders(true);
    setLoadingStockBreakdown(true);

    try {
      // 1. Preorders
      const preorderRes = await axiosInstance.get(`/order/executions/product/${prodId}/preorders`, {
        headers: { Accept: 'application/x-ndjson' }
      });
      setPreorders(parseNdjson(preorderRes.data));
    } catch (err) {
      console.warn('Failed to fetch preorders:', err);
    } finally {
      setLoadingPreorders(false);
    }

    try {
      // 2. Stock Summary Breakdown
      const { data } = await axiosInstance.get(`/stock/summary/${prodId}/breakdown`);
      const list = data?.data?.breakdown || [];
      setStockBreakdown(list);
    } catch (err) {
      console.warn('Failed to fetch stock breakdown:', err);
    } finally {
      setLoadingStockBreakdown(false);
    }
  };

  // Add Item to List Action
  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error('Please select a product.');
      return;
    }
    if (itemPrice === '' || isNaN(Number(itemPrice)) || Number(itemPrice) < 0) {
      toast.error('Valid Price is required.');
      return;
    }
    if (itemMrp === '' || isNaN(Number(itemMrp)) || Number(itemMrp) < 0) {
      toast.error('Valid MRP is required.');
      return;
    }
    if (invoiceQty === '' || isNaN(Number(invoiceQty)) || Number(invoiceQty) <= 0) {
      toast.error('Valid Invoice Qty is required.');
      return;
    }
    if (qtyReceived === '' || isNaN(Number(qtyReceived)) || Number(qtyReceived) < 0) {
      toast.error('Valid Qty Received is required.');
      return;
    }

    if (itemDiscountAmount !== '' && (isNaN(Number(itemDiscountAmount)) || Number(itemDiscountAmount) < 0)) {
      toast.error('Valid Discount Amount is required.');
      return;
    }

    const priceNum = Number(itemPrice);
    const mrpNum = Number(itemMrp);
    const invQtyNum = Number(invoiceQty);
    const recQtyNum = Number(qtyReceived);
    const discountAmtNum = Number(itemDiscountAmount) || 0;

    const grossBeforeDiscount = priceNum * invQtyNum;
    let discount = 0;
    if (itemDiscountType === 'PERCENTAGE') {
      discount = grossBeforeDiscount * (discountAmtNum / 100);
    } else {
      discount = discountAmtNum;
    }

    // Validation: discount amount cannot exceed gross / 100%
    if (itemDiscountType === 'FIXED' && discountAmtNum > grossBeforeDiscount) {
      toast.error('Discount Amount cannot exceed the item gross value.');
      return;
    }
    if (itemDiscountType === 'PERCENTAGE' && discountAmtNum > 100) {
      toast.error('Discount Percentage cannot exceed 100%.');
      return;
    }

    const taxableValue = parseFloat(Math.max(0, grossBeforeDiscount - discount).toFixed(2));
    const taxAmt = parseFloat((taxableValue * (itemTaxRate / 100)).toFixed(2));
    const total = parseFloat((taxableValue + taxAmt).toFixed(2));

    const prodDetails = allProductsMap[Number(selectedProductId)] || {};

    const selectedPoOption = selectionMode === 'direct'
      ? poLookupOptions.find((p) => p.purchaseOrderItemId === Number(selectedPoLookupId))
      : null;

    const newItem = {
      productId: Number(selectedProductId),
      productName: selectedProductName || prodDetails.baseProductName || 'N/A',
      itemCode: itemCode,
      price: priceNum,
      invoiceQty: invQtyNum,
      receivedQty: recQtyNum,
      acceptedQty: recQtyNum, // default matching received Qty
      rejectedQty: 0,
      mrp: mrpNum,
      taxRate: itemTaxRate,
      discountAmount: discountAmtNum,
      discountType: itemDiscountType,
      grossAmount: taxableValue,
      taxAmount: taxAmt,
      totalAmount: total,
      preOrderCount: preorders.reduce((sum, po) => sum + (po.orderedQty || 0), 0),
      purchaseOrderItemId: selectionMode === 'direct' 
        ? (selectedPoLookupId ? Number(selectedPoLookupId) : null)
        : selectedPoItemId,
      purchaseOrderId: selectionMode === 'direct'
        ? (selectedPoOption
            ? (selectedPoOption.purchaseOrderId || selectedPoOption.poId || selectedPoOption.id || null)
            : null)
        : (selectedPoId ? Number(selectedPoId) : null),
      poNumber: selectionMode === 'direct'
        ? (selectedPoOption?.poNumber || '')
        : selectedPoNumber,
      priceDifferencePercent: priceDifferencePercent,
      lastPrice: lastPrice
    };

    // Check duplicate product in items list
    const existingIndex = addedItems.findIndex((it) => it.productId === newItem.productId);
    if (existingIndex > -1) {
      // Overwrite/update item
      const updated = [...addedItems];
      updated[existingIndex] = newItem;
      setAddedItems(updated);
      toast.success('Updated existing item in the list.');
    } else {
      setAddedItems((prev) => [...prev, newItem]);
      toast.success('Product added to Supplier Item List.');
    }

    // Reset item selection fields
    resetProductFields();
  };

  // Delete Item from List
  const handleDeleteItem = (index: number) => {
    setAddedItems((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
    toast.info('Item removed from list.');
  };

  // Inline Edit Item Action
  const handleStartEdit = (index: number) => {
    const item = addedItems[index];
    setEditingIndex(index);
    setEditPrice(item.price);
    setEditInvoiceQty(item.invoiceQty);
    setEditReceivedQty(item.receivedQty);
    setEditMrp(item.mrp);
    setEditTaxRate(item.taxRate);
    setEditDiscountAmount(item.discountAmount || 0);
    setEditDiscountType(item.discountType || 'PERCENTAGE');
  };

  const handleSaveEdit = async (index: number) => {
    if (editPrice === '' || isNaN(Number(editPrice)) || Number(editPrice) < 0) {
      toast.error('Valid Price is required.');
      return;
    }
    if (editMrp === '' || isNaN(Number(editMrp)) || Number(editMrp) < 0) {
      toast.error('Valid MRP is required.');
      return;
    }
    if (editInvoiceQty === '' || isNaN(Number(editInvoiceQty)) || Number(editInvoiceQty) <= 0) {
      toast.error('Valid Invoice Qty is required.');
      return;
    }
    if (editReceivedQty === '' || isNaN(Number(editReceivedQty)) || Number(editReceivedQty) < 0) {
      toast.error('Valid Qty Received is required.');
      return;
    }
    if (editDiscountAmount !== '' && (isNaN(Number(editDiscountAmount)) || Number(editDiscountAmount) < 0)) {
      toast.error('Valid Discount Amount is required.');
      return;
    }

    const priceNum = Number(editPrice);
    const mrpNum = Number(editMrp);
    const invQtyNum = Number(editInvoiceQty);
    const recQtyNum = Number(editReceivedQty);
    const taxNum = Number(editTaxRate);
    const discountAmtNum = Number(editDiscountAmount) || 0;

    const grossBeforeDiscount = priceNum * invQtyNum;
    let discount = 0;
    if (editDiscountType === 'PERCENTAGE') {
      discount = grossBeforeDiscount * (discountAmtNum / 100);
    } else {
      discount = discountAmtNum;
    }

    // Validation: discount amount cannot exceed gross / 100%
    if (editDiscountType === 'FIXED' && discountAmtNum > grossBeforeDiscount) {
      toast.error('Discount Amount cannot exceed the item gross value.');
      return;
    }
    if (editDiscountType === 'PERCENTAGE' && discountAmtNum > 100) {
      toast.error('Discount Percentage cannot exceed 100%.');
      return;
    }

    const taxableValue = parseFloat(Math.max(0, grossBeforeDiscount - discount).toFixed(2));
    const taxAmt = parseFloat((taxableValue * (taxNum / 100)).toFixed(2));
    const total = parseFloat((taxableValue + taxAmt).toFixed(2));

    const updated = [...addedItems];
    const targetItem = updated[index];

    let diffPercent = 0;
    let lPrice = null;
    try {
      const { data } = await axiosInstance.get(`/stock/grn/validate-price`, {
        params: {
          supplierId: Number(supplierId),
          productId: targetItem.productId,
          currentPrice: priceNum
        }
      });
      const info = data?.data;
      if (info) {
        lPrice = info.lastPrice;
        diffPercent = info.percentageDifference || 0;
      }
    } catch (err) {
      console.warn('Inline edit price validation failed:', err);
    }

    updated[index] = {
      ...targetItem,
      price: priceNum,
      invoiceQty: invQtyNum,
      receivedQty: recQtyNum,
      acceptedQty: recQtyNum,
      mrp: mrpNum,
      taxRate: taxNum,
      discountAmount: discountAmtNum,
      discountType: editDiscountType,
      grossAmount: taxableValue,
      taxAmount: taxAmt,
      totalAmount: total,
      priceDifferencePercent: diffPercent,
      lastPrice: lPrice
    };

    setAddedItems(updated);
    setEditingIndex(null);
    toast.success('Row updated successfully.');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  // Calculate totals of Added Items list
  const totals = useMemo(() => {
    let gross = 0;
    let tax = 0;
    let totalBeforeInvoiceDiscount = 0;
    addedItems.forEach((item) => {
      gross += item.grossAmount;
      tax += item.taxAmount;
      totalBeforeInvoiceDiscount += item.totalAmount;
    });

    const discAmtNum = Number(invoiceDiscountAmount) || 0;
    let discount = 0;
    if (invoiceDiscountType === 'PERCENTAGE') {
      discount = totalBeforeInvoiceDiscount * (discAmtNum / 100);
    } else {
      discount = discAmtNum;
    }
    const finalTotal = Math.max(0, totalBeforeInvoiceDiscount - discount);

    return {
      gross: gross.toFixed(2),
      tax: tax.toFixed(2),
      total: finalTotal.toFixed(2)
    };
  }, [addedItems, invoiceDiscountAmount, invoiceDiscountType]);

  // Live preview calculation of Add Item Block
  const previewCalculation = useMemo(() => {
    if (!selectedProductId || itemPrice === '' || invoiceQty === '') {
      return null;
    }
    const priceNum = Number(itemPrice) || 0;
    const qtyNum = Number(invoiceQty) || 0;
    const discountAmtNum = Number(itemDiscountAmount) || 0;
    const taxRateNum = Number(itemTaxRate) || 0;

    const grossBeforeDiscount = priceNum * qtyNum;
    let discount = 0;
    if (itemDiscountType === 'PERCENTAGE') {
      discount = grossBeforeDiscount * (discountAmtNum / 100);
    } else {
      discount = discountAmtNum;
    }

    const taxableValue = parseFloat(Math.max(0, grossBeforeDiscount - discount).toFixed(2));
    const taxAmt = parseFloat((taxableValue * (taxRateNum / 100)).toFixed(2));
    const total = parseFloat((taxableValue + taxAmt).toFixed(2));

    return {
      gross: taxableValue.toFixed(2),
      taxAmt: taxAmt.toFixed(2),
      rawGross: grossBeforeDiscount.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2)
    };
  }, [selectedProductId, itemPrice, invoiceQty, itemDiscountAmount, itemDiscountType, itemTaxRate]);

  const totalPreorderQty = useMemo(() => {
    return preorders.reduce((sum, po) => sum + (po.orderedQty || 0), 0);
  }, [preorders]);

  const totalAvailableStock = useMemo(() => {
    return stockBreakdown.reduce((sum, item) => sum + (item.availableQty || 0), 0);
  }, [stockBreakdown]);

  // Submit whole GRN
  const handleSubmitGrn = async () => {
    if (addedItems.length === 0) {
      toast.error('Please add at least one product item to submit.');
      return;
    }
    if (!selectedWarehouseId) {
      toast.error('Please select a Warehouse.');
      return;
    }
    if (invoiceDateError) {
      toast.error(invoiceDateError);
      return;
    }

    if (invoiceDiscountAmount !== '' && (isNaN(Number(invoiceDiscountAmount)) || Number(invoiceDiscountAmount) < 0)) {
      toast.error('Valid Invoice Discount Amount is required.');
      return;
    }

    const totalBeforeInvoiceDiscount = addedItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const discAmtNum = Number(invoiceDiscountAmount) || 0;

    if (invoiceDiscountType === 'FIXED' && discAmtNum > totalBeforeInvoiceDiscount) {
      toast.error('Invoice Discount Amount cannot exceed the total items value.');
      return;
    }
    if (invoiceDiscountType === 'PERCENTAGE' && discAmtNum > 100) {
      toast.error('Invoice Discount Percentage cannot exceed 100%.');
      return;
    }

    setSubmittingGrn(true);
    const toastId = toast.loading('Submitting receive stock GRN...');

    const payload = {
      grnDate: getTodayString(),
      warehouseId: Number(selectedWarehouseId),
      supplierId: Number(supplierId),
      supplierName: selectedSupplierName,
      supplierGstin: supplierGstin,
      supplierInvoiceNumber: invoiceNumber.trim(),
      supplierInvoiceDate: invoiceDate,
      invoiceTotalAmount: parseFloat(totals.total),
      invoiceDiscountAmount: Number(invoiceDiscountAmount) || 0,
      invoiceDiscountType: invoiceDiscountType,
      remarks: grnRemarks.trim() || 'Receive Stock Submission',
      items: addedItems.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        invoiceQty: item.invoiceQty,
        receivedQty: item.receivedQty,
        unitPrice: item.price,
        mrp: item.mrp,
        taxRate: item.taxRate,
        discountAmount: item.discountAmount || 0,
        discountType: item.discountType || 'PERCENTAGE',
        taxableValue: parseFloat(item.grossAmount.toFixed(2)),
        gstValue: parseFloat(item.taxAmount.toFixed(2)),
        totalValue: parseFloat(item.totalAmount.toFixed(2))
      }))
    };

    console.log('=== GRN Submit Payload ===');
    console.log(JSON.stringify(payload, null, 2));

    try {
      const response = await axiosInstance.post('/stock/grn', payload);
      if (response.status === 200 || response.data?.success) {
        toast.success('Stock received successfully!', { id: toastId });
        
        handleResetAll();
      } else {
        throw new Error(response.data?.message || 'Server error occurred during submission.');
      }
    } catch (err: any) {
      console.error('GRN submit failed:', err);
      let errMsg = 'Failed to submit receive stock. Verify item values.';
      if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmittingGrn(false);
    }
  };

  return (
    <div className={`space-y-6 ${showFullForm ? 'flex-1 p-6' : 'max-w-7xl mx-auto px-1 py-4'}`}>
      {/* Header title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Layers size={22} className="text-indigo-650 dark:text-indigo-400" />
          Receive Stock
        </h1>
        <p className="text-xs text-slate-700 dark:text-slate-400 mt-1">
          Receive product stock from suppliers, link optional PO allocations, verify taxes/pricing and generate Goods Receipt Notes.
        </p>
      </div>

      {/* Part 1: Supplier & Invoice Initial Check */}
      {!showFullForm ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white">
              <span className="text-sm font-semibold tracking-wide flex items-center gap-2">
                <FileText size={16} />
                Verify Supplier & Invoice
              </span>
            </div>

            <form onSubmit={handleProceed} className="p-6 space-y-5">
              {/* Supplier Search Dropdown */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1.5">Supplier Name *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      value={supplierSearch}
                      onFocus={() => setIsSupplierFocused(true)}
                      onBlur={() => setTimeout(() => setIsSupplierFocused(false), 200)}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setIsSupplierFocused(true);
                        const match = suppliers.find((s) => s.id === Number(supplierId));
                        if (!match || match.name !== e.target.value) {
                          setSupplierId('');
                        }
                      }}
                      placeholder="Search supplier..."
                      className="w-full h-10 pl-3 pr-8 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-medium transition-all"
                    />
                    {supplierId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierId('');
                          setSupplierSearch('');
                        }}
                        className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}

                    {isSupplierFocused && filteredSuppliers.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                        {filteredSuppliers.map((sup, idx) => (
                          <button
                            key={`sup-sel-${sup.id || idx}`}
                            type="button"
                            onMouseDown={() => {
                              setSupplierId(sup.id);
                              setSupplierSearch(sup.name || '');
                              setIsSupplierFocused(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 transition-colors"
                          >
                            <div className="font-semibold truncate">{sup.name}</div>
                            {sup.supplierCode && (
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Code: {sup.supplierCode}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow"
                    title="Add New Supplier"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Invoice Number Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1.5">Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number..."
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-medium transition-all"
                />
              </div>

              {/* Error warning if duplicate */}
              {duplicateCheckError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex gap-2 text-red-600 dark:text-red-400 text-xs">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Invoice Already Created</span>
                    <p className="mt-1 opacity-90">{duplicateCheckError}</p>
                  </div>
                </div>
              )}

              {/* Action Proceed */}
              <button
                type="submit"
                disabled={checkingDuplicate || loadingSuppliers}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
              >
                {checkingDuplicate ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Checking Duplicate...
                  </>
                ) : (
                  <>
                    Proceed
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Block 1: Invoice Header details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden w-full">
              <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Invoice General Info</span>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="text-xs text-red-500 hover:text-red-600 font-bold"
                >
                  Change Supplier/Invoice (Reset Form)
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
                {/* Read Only values from Proceed */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide">Selected Supplier</label>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">{selectedSupplierName}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide">Invoice Number</label>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block font-mono">{invoiceNumber}</span>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide mb-1">Invoice Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={handleInvoiceDateChange}
                      className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-medium transition-all"
                    />
                  </div>
                  {invoiceDateError && (
                    <span className="text-[10px] text-red-500 font-semibold mt-1 block">{invoiceDateError}</span>
                  )}
                </div>

                {/* Warehouse */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide mb-1">Warehouse *</label>
                  <select
                    required
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((wh) => (
                      <option key={`wh-opt-${wh.id}`} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                {/* GSTIN */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value)}
                    placeholder="Enter GSTIN..."
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-medium transition-all font-mono"
                  />
                </div>

                {/* GST Type Display */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide mb-1.5">GST Type</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                    gstType === 'IGST' 
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' 
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                  }`}>
                    {gstType === 'IGST' ? 'IGST (IGST)' : 'CGST_SGST (Local)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Block 2: Product Select & Details Input */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Item Block</span>
                
                {/* Switch Option A/B tabs */}
                <div className="flex bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode('direct');
                      resetProductFields('direct');
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      selectionMode === 'direct' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-700 dark:text-slate-400 hover:text-slate-850'
                    }`}
                  >
                    Option A: Direct Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode('po');
                      resetProductFields('po');
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      selectionMode === 'po' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-700 dark:text-slate-400 hover:text-slate-850'
                    }`}
                  >
                    Option B: PO Products
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Search select controls based on Mode */}
                {selectionMode === 'direct' ? (
                  // Direct Product selection
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Product List *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={directProductSearch}
                        onFocus={() => setIsDirectProductFocused(true)}
                        onBlur={() => setTimeout(() => setIsDirectProductFocused(false), 200)}
                        onChange={(e) => {
                          setDirectProductSearch(e.target.value);
                          setIsDirectProductFocused(true);
                          if (selectedProductId) {
                            setSelectedProductId('');
                            resetProductFields();
                          }
                        }}
                        placeholder="Search approved supplier products..."
                        className="w-full h-10 pl-3 pr-8 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-semibold transition-all"
                      />
                      {selectedProductId && (
                        <button
                          type="button"
                          onClick={() => resetProductFields()}
                          className="absolute right-2.5 top-3 text-slate-455 hover:text-slate-700"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {isDirectProductFocused && filteredDirectProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                        {filteredDirectProducts.map((item, idx) => {
                          const prodId = item.productId || item.productid;
                          const details = allProductsMap[prodId] || {};
                          return (
                            <button
                              key={`direct-p-${item.id || idx}`}
                              type="button"
                              onMouseDown={() => handleSelectDirectProduct(item)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 border-b border-slate-100 dark:border-slate-750 last:border-b-0 transition-colors"
                            >
                              <div className="font-semibold truncate">{details.baseProductName || 'Unnamed Product'}</div>
                              <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                                <span>SKU: {item.supplierSkuCode}</span>
                                <span>• Price: ₹{item.supplierPrice}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  // PO Product selection (Step 1: Select PO, Step 2: Select Product from PO)
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* PO Select dropdown */}
                    <div className="relative">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Select Purchase Order *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={poProductSearch}
                          onFocus={() => setIsPoProductFocused(true)}
                          onBlur={() => setTimeout(() => setIsPoProductFocused(false), 200)}
                          onChange={(e) => {
                            setPoProductSearch(e.target.value);
                            setIsPoProductFocused(true);
                            if (selectedPoId) {
                              setSelectedPoId('');
                              setPoProducts([]);
                              resetProductFields('direct');
                            }
                          }}
                          placeholder="Search PO by number..."
                          className="w-full h-10 pl-3 pr-8 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-semibold transition-all"
                        />
                        {selectedPoId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPoId('');
                              setPoProducts([]);
                              resetProductFields('direct');
                            }}
                            className="absolute right-2.5 top-3 text-slate-455 hover:text-slate-700"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {isPoProductFocused && filteredPOs.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                          {filteredPOs.map((po, idx) => (
                            <button
                              key={`po-sel-${po.id || idx}`}
                              type="button"
                              onMouseDown={() => handleSelectPO(po)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-755 dark:text-slate-200 border-b border-slate-100 dark:border-slate-750 last:border-b-0 transition-colors"
                            >
                              <div className="font-semibold truncate text-blue-600 dark:text-blue-400 font-mono">{po.poNumber}</div>
                              <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>Date: {po.poDate}</span>
                                <span>• Items: {po.totalSkus}</span>
                                <span className={`px-1.5 py-0.2 rounded font-bold ${
                                  po.status === 'OPEN' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                }`}>{po.status}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Product Selection within PO */}
                    <div className="lg:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">PO Product List *</label>
                      <select
                        disabled={!selectedPoId}
                        value={selectedPoProduct ? JSON.stringify(selectedPoProduct) : ''}
                        onChange={(e) => {
                          const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                          if (parsed) {
                            handleSelectPOProduct(parsed);
                          } else {
                            resetProductFields();
                            if (selectedPoId) {
                              const matchPO = supplierPOs.find((p) => p.id === Number(selectedPoId));
                              if (matchPO) handleSelectPO(matchPO);
                            }
                          }
                        }}
                        className="w-full h-10 px-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-300 font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">{selectedPoId ? 'Select Product' : 'Select PO First'}</option>
                        {poProducts
                           .filter((p) => {
                             const prodId = p.productId || p.productid;
                             return !addedItems.some((item) => (item.productId || item.productid) === prodId);
                           })
                           .map((p) => {
                             const prodId = p.productId || p.productid;
                             return (
                               <option key={`po-prod-${p.id}`} value={JSON.stringify(p)}>
                                 {p.productName || p.itemName || `Product ID: ${prodId}`} ({p.vendorSku})
                               </option>
                             );
                           })}
                      </select>
                    </div>
                  </div>
                )}

                {/* Common Inputs grid */}
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Price */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Price *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        disabled={!selectedProductId}
                        value={itemPrice}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 pl-6 pr-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-bold transition-all disabled:opacity-60"
                      />
                    </div>
                    {/* Price History validate message */}
                    {selectedProductId && (
                      <div className="mt-1 space-y-0.5">
                        <span className="text-[10px] text-emerald-700 font-bold block">
                          Previous: {lastPrice ? `₹${lastPrice}` : 'No History'}
                        </span>
                        {priceDifferencePercent !== 0 && (
                          <span className={`text-[9px] font-bold block ${
                            priceDifferencePercent > 0 ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            Difference: {priceDifferencePercent > 0 ? `+${priceDifferencePercent.toFixed(2)}` : priceDifferencePercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MRP */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">MRP *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        disabled={!selectedProductId}
                        value={itemMrp}
                        onChange={(e) => setItemMrp(e.target.value ? parseFloat(e.target.value) : '')}
                        placeholder="0.00"
                        className="w-full h-9 pl-6 pr-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-bold transition-all disabled:opacity-60"
                      />
                    </div>
                    {selectedProductId && lastMRP !== null && (
                      <span className="text-[10px] text-slate-600 font-bold mt-1 block">
                        Previous: ₹{lastMRP}
                      </span>
                    )}
                  </div>

                  {/* HSN (readonly) */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">HSN</label>
                    <input
                      type="text"
                      readOnly
                      value={itemHsn}
                      className="w-full h-9 px-3 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-700 dark:text-slate-400 font-semibold select-none"
                    />
                  </div>

                  {/* Tax% (readonly) */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">TAX %</label>
                    <input
                      type="text"
                      readOnly
                      value={itemTaxRate ? `${itemTaxRate}%` : '0%'}
                      className="w-full h-9 px-3 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-700 dark:text-slate-400 font-semibold select-none"
                    />
                  </div>

                  {/* Item Code (readonly) */}
                  <div className="col-span-12 lg:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Item Code</label>
                    <input
                      type="text"
                      readOnly
                      value={itemCode}
                      className="w-full h-9 px-3 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-700 dark:text-slate-400 font-semibold select-none font-mono"
                    />
                  </div>

                  {/* Invoice Qty */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Invoice Qty *</label>
                    <input
                      type="number"
                      disabled={!selectedProductId}
                      value={invoiceQty}
                      onChange={(e) => setInvoiceQty(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="0"
                      className="w-full h-9 px-3 text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-bold transition-all disabled:opacity-60"
                    />
                  </div>

                  {/* Qty Received */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Qty Received *</label>
                    <input
                      type="number"
                      disabled={!selectedProductId}
                      value={qtyReceived}
                      onChange={(e) => setQtyReceived(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="0"
                      className="w-full h-9 px-3 text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-bold transition-all disabled:opacity-60"
                    />
                  </div>

                  {/* Discount Type */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Discount Type</label>
                    <select
                      disabled={!selectedProductId}
                      value={itemDiscountType}
                      onChange={(e) => setItemDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                      className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-700 dark:text-slate-350 font-semibold cursor-pointer"
                    >
                      <option value="PERCENTAGE">PERCENTAGE</option>
                      <option value="FIXED">FIXED</option>
                    </select>
                  </div>

                  {/* Discount Amount */}
                  <div className="col-span-6 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Discount Amount</label>
                    <input
                      type="number"
                      disabled={!selectedProductId}
                      value={itemDiscountAmount}
                      onChange={(e) => setItemDiscountAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0.00"
                      className="w-full h-9 px-3 text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-205 font-bold transition-all disabled:opacity-60"
                    />
                  </div>

                  {/* PO Lookup / pre-filled PO Number (Option A) */}
                  <div className="col-span-12 lg:col-span-4">
                    {selectionMode === 'direct' ? (
                      <>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Link PO (Optional)</label>
                        <select
                          disabled={!selectedProductId || poLookupOptions.length === 0}
                          value={selectedPoLookupId}
                          onChange={(e) => setSelectedPoLookupId(e.target.value ? Number(e.target.value) : '')}
                          className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-700 dark:text-slate-350 font-semibold disabled:opacity-60 cursor-pointer"
                        >
                          <option value="">Select PO Item</option>
                          {poLookupOptions.map((po) => (
                            <option key={`po-lookup-${po.purchaseOrderItemId}`} value={po.purchaseOrderItemId}>
                              {po.poNumber} (Bal: {po.orderedQty - po.receivedQty})
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">PO Number</label>
                        <input
                          type="text"
                          readOnly
                          value={selectedPoNumber}
                          className="w-full h-9 px-3 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-700 dark:text-slate-400 font-semibold select-none font-mono"
                        />
                      </>
                    )}
                  </div>

                  {/* Calculation Preview */}
                  {previewCalculation && (
                    <div className="col-span-12 bg-indigo-55/40 dark:bg-slate-850/40 border border-indigo-100/60 dark:border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs transition-all">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide">Gross Amount:</span>
                        <span className="text-slate-805 dark:text-slate-200 font-bold font-mono">₹{previewCalculation.rawGross}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wide">Item Disc:</span>
                        <span className="text-amber-600 dark:text-amber-500 font-bold font-mono">-₹{previewCalculation.discount}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide">Taxable Value:</span>
                        <span className="text-slate-805 dark:text-slate-200 font-bold font-mono">₹{previewCalculation.gross}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide">GST Value:</span>
                        <span className="text-slate-505 dark:text-slate-400 font-bold font-mono">₹{previewCalculation.taxAmt}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-indigo-650 dark:text-indigo-400 font-bold uppercase text-[9px] tracking-wide">Total Value:</span>
                        <span className="text-indigo-650 dark:text-indigo-400 font-extrabold font-mono">₹{previewCalculation.total}</span>
                      </div>
                    </div>
                  )}

                  {/* Add Item Action Button */}
                  <div className="col-span-12 flex justify-end mt-2">
                    <button
                      type="button"
                      disabled={!selectedProductId}
                      onClick={handleAddItem}
                      className="w-full lg:w-48 h-9 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <Plus size={14} />
                      Add Item
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Panels: Preorder Details & Stock Details (Parts 3 & 4) */}
            <div className="space-y-6">
            
            {/* Part 3: PreOrder Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-955 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Clock size={14} className="text-red-500 animate-pulse" />
                  PreOrder Details
                </span>
                <span className="bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Total Qty: {totalPreorderQty}
                </span>
              </div>

              {loadingPreorders ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin text-indigo-650" />
                  Loading Preorders...
                </div>
              ) : preorders.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No preorders for selected product.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 scrollbar-thin">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-slate-700 font-bold uppercase">
                        <th className="py-2 px-3">Source / Client</th>
                        <th className="py-2 px-3">Order Ref</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3">Awb / Courier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-350">
                      {preorders.map((po, idx) => (
                        <tr key={`pre-${po.id || idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <div className="font-semibold truncate max-w-[100px]">{po.clientName}</div>
                            <div className="text-[8px] text-slate-400 mt-0.5">{po.clientOrderNo}</div>
                          </td>
                          <td className="py-2 px-3 truncate max-w-[90px] font-mono">{po.orderRefNo}</td>
                          <td className="py-2 px-3 text-center font-bold">{po.orderedQty}</td>
                          <td className="py-2 px-3">
                            <div className="truncate max-w-[90px]">{po.awbNumber || 'No AWB'}</div>
                            <div className="text-[8px] text-slate-405 mt-0.5">{po.courierId || 'No Courier'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Part 4: StockInformation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-955 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Warehouse size={14} className="text-indigo-605" />
                  Stock Information
                </span>
                <span className="bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Total Avail: {totalAvailableStock}
                </span>
              </div>

              {loadingStockBreakdown ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin text-indigo-650" />
                  Loading Stock Details...
                </div>
              ) : stockBreakdown.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No stock summary available for selected product.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 scrollbar-thin">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-slate-700 font-bold uppercase">
                        <th className="py-2 px-3 text-center w-8">#</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3 text-center">Type</th>
                        <th className="py-2 px-3 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-350">
                      {stockBreakdown.map((item, idx) => (
                        <tr key={`stock-${item.productId || item.productid || idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center font-mono">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold truncate max-w-[140px]" title={item.productName}>
                              {item.productName}
                            </div>
                            <div className="text-[8px] text-slate-400 mt-0.5 font-mono">{item.productCode}</div>
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            <span className={`px-1.5 py-0.2 rounded text-[8px] ${
                              item.relationRole === 'PARENT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
                              {item.relationRole}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800 dark:text-slate-200">{item.availableQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    )}

      {/* Part 5: Supplier Item List (Always visible once main form is open) */}
      {showFullForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700">Supplier Item List</h6>
          </div>

          <div className="p-5 space-y-4">
            {addedItems.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <ShoppingBag size={38} className="text-slate-300 dark:text-slate-750 mb-2.5" />
                <p className="text-sm font-semibold">Supplier Item List is Empty</p>
                <p className="text-xs text-slate-700 mt-1">Use the Add Item block above to add items to this invoice.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse table-fixed min-w-[1300px]">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 text-slate-700 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wide select-none">
                      <th className="w-12 py-3 px-3 text-center">S.No</th>
                      <th className="w-48 py-3 px-3">Item Code</th>
                      <th className="w-28 py-3 px-3 text-right">Price</th>
                      <th className="w-24 py-3 px-3 text-center">Invoice Qty</th>
                      <th className="w-24 py-3 px-3 text-center">Qty Received</th>
                      <th className="w-28 py-3 px-3 text-right">MRP</th>
                      <th className="w-20 py-3 px-3 text-center">Tax %</th>
                      <th className="w-28 py-3 px-3 text-center">Disc Type</th>
                      <th className="w-28 py-3 px-3 text-right">Disc Amt</th>
                      <th className="w-28 py-3 px-3 text-right">Gross Amt</th>
                      <th className="w-28 py-3 px-3 text-right">Tax Amt</th>
                      <th className="w-28 py-3 px-3 text-right">Total Amt</th>
                      <th className="w-28 py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-205">
                    {addedItems.map((item, idx) => {
                      const isEditing = editingIndex === idx;
                      return (
                        <tr key={`added-${item.productId}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/20">
                          {/* S.No */}
                          <td className="py-3 px-3 text-center font-mono text-slate-700">{idx + 1}</td>
                          
                          {/* Item Code & PO NO */}
                          <td className="py-3 px-3 truncate">
                            <div className="font-mono text-slate-700 dark:text-slate-350">{item.itemCode}</div>
                            {item.poNumber && (
                              <div className="text-[9px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">PO: {item.poNumber}</div>
                            )}
                          </td>
                          
                          {/* Price */}
                          <td className="py-3 px-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-full h-7 px-1 text-xs text-right border border-indigo-500 rounded bg-white dark:bg-slate-955 focus:outline-none font-bold"
                              />
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="font-bold">₹{item.price.toFixed(2)}</span>
                                {item.priceDifferencePercent !== undefined && item.priceDifferencePercent !== null && item.priceDifferencePercent !== 0 && (
                                  <span className={`text-[9px] font-bold mt-0.5 whitespace-nowrap block ${
                                    item.priceDifferencePercent > 0 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500'
                                  }`}>
                                    {item.priceDifferencePercent > 0 
                                      ? `Price Increased (+${item.priceDifferencePercent.toFixed(2)}%)` 
                                      : `Price Reduced (${item.priceDifferencePercent.toFixed(2)}%)`
                                    }
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* Invoice Qty */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editInvoiceQty}
                                onChange={(e) => setEditInvoiceQty(e.target.value ? parseInt(e.target.value) : '')}
                                className="w-full h-7 px-1 text-xs text-center border border-indigo-500 rounded bg-white dark:bg-slate-955 focus:outline-none font-bold"
                              />
                            ) : (
                              <span>{item.invoiceQty}</span>
                            )}
                          </td>
                          
                          {/* Qty Received */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editReceivedQty}
                                onChange={(e) => setEditReceivedQty(e.target.value ? parseInt(e.target.value) : '')}
                                className="w-full h-7 px-1 text-xs text-center border border-indigo-500 rounded bg-white dark:bg-slate-955 focus:outline-none font-bold"
                              />
                            ) : (
                              <span>{item.receivedQty}</span>
                            )}
                          </td>
                          
                          {/* MRP */}
                          <td className="py-3 px-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editMrp}
                                onChange={(e) => setEditMrp(e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-full h-7 px-1 text-xs text-right border border-indigo-500 rounded bg-white dark:bg-slate-955 focus:outline-none font-bold"
                              />
                            ) : (
                              <span className="font-bold">₹{item.mrp.toFixed(2)}</span>
                            )}
                          </td>
                          
                          {/* Tax % */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editTaxRate}
                                onChange={(e) => setEditTaxRate(e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-full h-7 px-1 text-xs text-center border border-indigo-500 rounded bg-white dark:bg-slate-955 focus:outline-none font-bold"
                              />
                            ) : (
                              <span>{item.taxRate}%</span>
                            )}
                          </td>

                          {/* Disc Type */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <select
                                value={editDiscountType}
                                onChange={(e) => setEditDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                                className="w-full h-7 px-1 text-xs border border-indigo-500 rounded bg-white dark:bg-slate-955 focus:outline-none font-bold cursor-pointer"
                              >
                                <option value="PERCENTAGE">PERCENTAGE</option>
                                <option value="FIXED">FIXED</option>
                              </select>
                            ) : (
                              <span>{item.discountType || 'PERCENTAGE'}</span>
                            )}
                          </td>

                          {/* Disc Amt */}
                          <td className="py-3 px-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editDiscountAmount}
                                onChange={(e) => setEditDiscountAmount(e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-full h-7 px-1 text-xs text-right border border-indigo-500 rounded bg-white dark:bg-slate-955 focus:outline-none font-bold"
                              />
                            ) : (
                              <span className="font-bold text-amber-600 dark:text-amber-500">
                                {item.discountAmount > 0 
                                  ? (item.discountType === 'PERCENTAGE' ? `${item.discountAmount}%` : `₹${item.discountAmount.toFixed(2)}`)
                                  : '—'}
                              </span>
                            )}
                          </td>
                          
                          {/* Gross Amount */}
                          <td className="py-3 px-3 text-right font-mono font-bold">₹{item.grossAmount.toFixed(2)}</td>
                          
                          {/* Tax Amount */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-500">₹{item.taxAmount.toFixed(2)}</td>
                          
                          {/* Total Amount */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-indigo-650 dark:text-indigo-400">₹{item.totalAmount.toFixed(2)}</td>
                          
                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(idx)}
                                  className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                  title="Save Changes"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={editingIndex !== null}
                                  onClick={() => handleStartEdit(idx)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-50 transition-all"
                                  title="Edit Row"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={editingIndex !== null}
                                  onClick={() => handleDeleteItem(idx)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-all"
                                  title="Delete Row"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 text-xs font-bold text-slate-805 dark:text-slate-200 select-none">
                      {/* Overall Invoice Discount Inputs on the Left */}
                      <td colSpan={6} className="py-4 px-3">
                        <div className="flex items-center gap-1.5 justify-start">
                          <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-500 mr-1">Invoice Discount:</span>
                          <select
                            value={invoiceDiscountType}
                            onChange={(e) => setInvoiceDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                            className="h-8 px-1.5 text-xs bg-white dark:bg-slate-955 border border-red-300 dark:border-red-900/60 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl focus:outline-none text-red-600 dark:text-red-400 font-bold cursor-pointer transition-colors"
                          >
                            <option value="PERCENTAGE">PERCENTAGE</option>
                            <option value="FIXED">FIXED</option>
                          </select>
                          <input
                            type="number"
                            value={invoiceDiscountAmount}
                            onChange={(e) => setInvoiceDiscountAmount(e.target.value ? parseFloat(e.target.value) : '')}
                            placeholder="DISCOUNT AMOUNT"
                            className="w-36 h-8 px-2 text-xs bg-white dark:bg-slate-955 border border-red-300 dark:border-red-900/60 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl focus:outline-none text-red-600 dark:text-red-400 placeholder-red-300 dark:placeholder-red-800/80 font-bold transition-all"
                          />
                        </div>
                      </td>
                      <td colSpan={3} className="py-4 px-3 text-right uppercase tracking-wider text-slate-700">Totals:</td>
                      <td className="py-4 px-3 text-right font-mono">₹{totals.gross}</td>
                      <td className="py-4 px-3 text-right font-mono text-slate-700">₹{totals.tax}</td>
                      <td className="py-4 px-3 text-right font-mono text-indigo-650 dark:text-indigo-400">₹{totals.total}</td>
                      <td colSpan={1}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Submission Action */}
            {addedItems.length > 0 && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                {/* GRN Remarks Textarea */}
                <div className="w-full max-w-lg">
                  <textarea
                    rows={3}
                    value={grnRemarks}
                    onChange={(e) => setGrnRemarks(e.target.value)}
                    placeholder="Enter optional GRN remarks here..."
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl focus:outline-none text-slate-850 dark:text-slate-200 resize-none transition-all"
                  />
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={submittingGrn || editingIndex !== null}
                    onClick={handleSubmitGrn}
                    className="px-10 h-11 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    {submittingGrn ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting GRN...
                      </>
                    ) : (
                      <>
                        Submit Invoice Stock
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <SupplierModal
        open={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleSupplierCreated}
      />
    </div>
  );
}
