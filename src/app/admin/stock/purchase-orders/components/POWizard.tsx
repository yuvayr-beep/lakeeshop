'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Check, FileText, ChevronRight, HelpCircle, 
  Trash2, Plus, Info, MoveRight, HelpCircle as DragIcon,
  Search, ShieldAlert, X
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axios';
import Badge from '@/components/ui/Badge';

interface POWizardProps {
  poId?: number; // If provided, we are in EDIT mode
}

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

export default function POWizard({ poId }: POWizardProps) {
  const router = useRouter();
  const isEditMode = !!poId;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Reference data loaded on mount
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Supplier search states
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierFocused, setIsSupplierFocused] = useState(false);

  // Selected supplier dynamic details
  const [addresses, setAddresses] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);

  // Form states - Step 1
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(getTodayString());
  const [remarks, setRemarks] = useState('');
  const [applyNegotiatedDiscount, setApplyNegotiatedDiscount] = useState(false);
  const [poStatus, setPoStatus] = useState('DRAFT');
  const [initialStatus, setInitialStatus] = useState('DRAFT');

  // Supplier Address parts
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrLine3, setAddrLine3] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [pan, setPan] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [editSupplierAddress, setEditSupplierAddress] = useState('');

  // Warehouse BillTo parts
  const [billToName, setBillToName] = useState('Lakee e Shopping India Pvt Ltd');
  const [billToAddressLine1, setBillToAddressLine1] = useState('NO. 6,7 & 8, 3rd FLOOR');
  const [billToAddressLine2, setBillToAddressLine2] = useState('RAHAJA COMPLEX');
  const [billToAddressLine3, setBillToAddressLine3] = useState('68/834, ANNA SALAI');
  const [billToCity, setBillToCity] = useState('CHENNAI');
  const [billToState, setBillToState] = useState('TAMIL NADU');
  const [billToCountry, setBillToCountry] = useState('INDIA');
  const [billToPincode, setBillToPincode] = useState('600002');

  // Warehouse ShipTo parts
  const [shipToName, setShipToName] = useState('Lakee e Shopping India Pvt Ltd');
  const [shipToAddressLine1, setShipToAddressLine1] = useState('NO. 6,7 & 8, 3rd FLOOR');
  const [shipToAddressLine2, setShipToAddressLine2] = useState('RAHAJA COMPLEX');
  const [shipToAddressLine3, setShipToAddressLine3] = useState('68/834, ANNA SALAI');
  const [shipToCity, setShipToCity] = useState('CHENNAI');
  const [shipToState, setShipToState] = useState('TAMIL NADU');
  const [shipToCountry, setShipToCountry] = useState('INDIA');
  const [shipToPincode, setShipToPincode] = useState('600002');

  // Contact Person parts
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Step 2 Catalog & Dropped Items
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]); // Approved supplier products
  const [allProductsMap, setAllProductsMap] = useState<Record<number, any>>({}); // Map: productId -> productDetails
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [droppedItems, setDroppedItems] = useState<any[]>([]); // Selected products with quantities

  // Wizard status trackers
  const [loading, setLoading] = useState(false);
  const [activePoId, setActivePoId] = useState<number | null>(poId || null);

  // Load basic reference data
  useEffect(() => {
    async function loadBasicData() {
      try {
        setLoading(true);
        // Suppliers
        const supRes = await axiosInstance.get('/vendor/suppliers', {
          headers: { Accept: 'application/x-ndjson' },
        });
        setSuppliers(parseNdjson(supRes.data));

        // Warehouses
        const whRes = await axiosInstance.get('/stock/warehouse/active', {
          headers: { Accept: 'application/x-ndjson' },
        });
        setWarehouses(parseNdjson(whRes.data));
      } catch (err) {
        console.error('Error loading wizard reference data:', err);
        toast.error('Failed to load setup parameters.');
      } finally {
        setLoading(false);
      }
    }
    loadBasicData();
  }, []);

  const filteredSuppliers = React.useMemo(() => {
    if (!supplierSearch) return suppliers;
    const query = supplierSearch.toLowerCase();
    return suppliers.filter(
      (sup) =>
        sup.name?.toLowerCase().includes(query) ||
        String(sup.id).includes(query)
    );
  }, [suppliers, supplierSearch]);

  // Auto-populate supplierSearch text when supplierId or suppliers list changes
  useEffect(() => {
    if (supplierId && suppliers.length > 0) {
      const match = suppliers.find((s) => s.id === Number(supplierId));
      if (match) {
        setSupplierSearch(match.name || '');
      }
    }
  }, [supplierId, suppliers]);

  const selectedSupplierName = React.useMemo(() => {
    if (!supplierId || suppliers.length === 0) return '';
    const match = suppliers.find((s) => s.id === Number(supplierId));
    return match ? match.name : '';
  }, [supplierId, suppliers]);

  // If editing, load the existing PO details
  useEffect(() => {
    if (!poId) return;

    async function loadPOForEdit() {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(`/stock/purchase-orders/${poId}`);
        if (data.success && data.data) {
          const po = data.data;
          setActivePoId(po.id);
          setSupplierId(po.supplierId);
          setWarehouseId(po.warehouseId);
          setPoNumber(po.poNumber || '');
          setPoDate(po.poDate || getTodayString());
          setRemarks(po.remarks || '');
          setApplyNegotiatedDiscount(po.applyNegotiatedDiscount || false);
          setPoStatus(po.status || 'DRAFT');
          setInitialStatus(po.status || 'DRAFT');

          // Parse supplier address fields if possible (split or read directly)
          // Wait, the API returns supplierAddress, supplierGstin, supplierStateName, supplierStateCode, supplierPan, supplierEmail, supplierContact
          setGstin(po.supplierGstin || '');
          setStateName(po.supplierStateName || '');
          setStateCode(po.supplierStateCode || '');
          setPan(po.supplierPan || '');
          setSupEmail(po.supplierEmail || '');
          setSupPhone(po.supplierContact || '');
          setEditSupplierAddress(po.supplierAddress || '');

          // We try to fill address lines as best as possible
          const addrParts = po.supplierAddress ? po.supplierAddress.split(',').map((p: string) => p.trim()) : [];
          setAddrLine1(addrParts[0] || '');
          setAddrLine2(addrParts[1] || '');
          setAddrLine3(addrParts[2] || '');
          setCity(addrParts[3] || '');
          setPincode(addrParts[addrParts.length - 1] || '');

          // Warehouse billTo
          setBillToName(po.billToName || 'Lakee e Shopping India Pvt Ltd');
          setBillToAddressLine1(po.billToAddressLine1 || '');
          setBillToAddressLine2(po.billToAddressLine2 || '');
          setBillToAddressLine3(po.billToAddressLine3 || '');
          setBillToCity(po.billToCity || '');
          setBillToState(po.billToState || '');
          setBillToCountry(po.billToCountry || 'India');
          setBillToPincode(po.billToPincode || '');

          // Warehouse shipTo
          setShipToName(po.shipToName || 'Lakee e Shopping India Pvt Ltd');
          setShipToAddressLine1(po.shipToAddressLine1 || '');
          setShipToAddressLine2(po.shipToAddressLine2 || '');
          setShipToAddressLine3(po.shipToAddressLine3 || '');
          setShipToCity(po.shipToCity || '');
          setShipToState(po.shipToState || '');
          setShipToCountry(po.shipToCountry || 'India');
          setShipToPincode(po.shipToPincode || '');

          // Contact details
          setContactName(po.contactName || '');
          setContactPhone(po.contactPhone || '');
          setContactEmail(po.contactEmail || '');

          // Fetch items for Step 2
          const itemsRes = await axiosInstance.get(`/stock/purchase-order-item/po/${poId}`, {
            headers: { Accept: 'application/x-ndjson' },
          });
          const parsedItems = parseNdjson(itemsRes.data);
          setDroppedItems(parsedItems.map((item: any) => ({
            productId: item.productId,
            vendorSku: item.vendorSku,
            productName: item.productName,
            hsnCode: item.hsnCode || '8471',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 18,
          })));
        }
      } catch (err) {
        console.error('Failed to load purchase order details:', err);
        toast.error('Failed to retrieve PO details.');
      } finally {
        setLoading(false);
      }
    }

    loadPOForEdit();
  }, [poId]);

  // Load supplier dependent options (Addresses, Contacts, Emails) when supplierId changes
  useEffect(() => {
    if (!supplierId) {
      setAddresses([]);
      setContacts([]);
      setEmails([]);
      return;
    }

    async function loadSupplierDetails() {
      try {
        // Find supplier PAN from selected supplier object
        const selectedSup = suppliers.find((s) => s.id === Number(supplierId));
        if (selectedSup) {
          setPan(selectedSup.pan || '');
        }

        // Addresses
        const addrRes = await axiosInstance.get(`/vendor/supplier-addresses/${supplierId}`, {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsedAddrs = parseNdjson(addrRes.data);
        setAddresses(parsedAddrs);

        // Auto-fill default billing/head-office address if creating
        if (!isEditMode && parsedAddrs.length > 0) {
          const defaultAddr = parsedAddrs.find((a) => a.isDefault) || parsedAddrs[0];
          applyAddress(defaultAddr);
        }

        // Contacts
        const contactRes = await axiosInstance.get(`/vendor/supplier-contacts/${supplierId}`, {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsedContacts = parseNdjson(contactRes.data);
        setContacts(parsedContacts);

        if (parsedContacts.length > 0) {
          const primaryContact = parsedContacts.find((c) => c.isPrimary) || parsedContacts[0];
          if (!isEditMode) {
            applyContact(primaryContact);
            setSupPhone(primaryContact.phone || '');
          } else if (!supPhone) {
            setSupPhone(primaryContact.phone || '');
          }
        }

        // Emails
        const emailRes = await axiosInstance.get(`/vendor/supplier-emails/${supplierId}`, {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsedEmails = parseNdjson(emailRes.data);
        setEmails(parsedEmails);

        if (!isEditMode && parsedEmails.length > 0) {
          const defaultEmail = parsedEmails.find((e) => e.type === 'TO') || parsedEmails[0];
          setSupEmail(defaultEmail.email || '');
        }
      } catch (err) {
        console.warn('Failed to load supplier details:', err);
      }
    }

    loadSupplierDetails();
  }, [supplierId, suppliers, isEditMode]);

  // Handle warehouse changes to fill billTo and shipTo
  const handleWarehouseChange = async (whId: number) => {
    setWarehouseId(whId);
    try {
      const { data } = await axiosInstance.get(`/stock/warehouse/${whId}`);
      const wh = data.data || data;
      if (wh) {
        // set shipTo fields
        setShipToName('Lakee e Shopping India Pvt Ltd');
        setShipToAddressLine1(wh.addressLine1 || 'NO. 6,7 & 8, 3rd FLOOR');
        setShipToAddressLine2(wh.addressLine2 || 'RAHAJA COMPLEX');
        setShipToAddressLine3(wh.addressLine3 || '68/834, ANNA SALAI');
        setShipToCity(wh.city || 'CHENNAI');
        setShipToState(wh.state || 'TAMIL NADU');
        setShipToCountry(wh.country || 'INDIA');
        setShipToPincode(wh.pincode || '600002');
      }
    } catch (err) {
      console.warn('Failed to fetch warehouse details:', err);
    }
  };

  const applyAddress = (addr: any) => {
    if (!addr) return;
    setAddrLine1(addr.addressLine1 || '');
    setAddrLine2(addr.addressLine2 || '');
    setAddrLine3(addr.addressLine3 || '');
    setCity(addr.city || '');
    setStateName(addr.state || '');
    setPincode(addr.pincode || '');
    setGstin(addr.gstin || '');
    setStateCode(addr.stateCode || '');

    const combined = [addr.addressLine1, addr.addressLine2, addr.addressLine3, addr.city, addr.state, addr.pincode]
      .filter(Boolean)
      .join(', ');
    setEditSupplierAddress(combined);
  };

  const applyContact = (c: any) => {
    if (!c) return;
    setContactName(c.name || '');
    setContactPhone(c.phone || '');
    setContactEmail(c.email || '');
  };

  // Step 2 Supplier catalog loading
  useEffect(() => {
    if (currentStep !== 2 || !supplierId) return;

    async function loadCatalog() {
      try {
        setLoading(true);
        // Get products approved for supplier
        const shareRes = await axiosInstance.get(
          `/prod/supplier-product-share?supplierId=${supplierId}&shareStatus=APPROVED`,
          { headers: { Accept: 'application/x-ndjson' } }
        );
        const parsedShare = parseNdjson(shareRes.data);
        setCatalogProducts(parsedShare);

        // Fetch product list details to get matching product names and HSN codes
        const prodRes = await axiosInstance.get('/prod/products', {
          headers: { Accept: 'application/x-ndjson' },
        });
        const parsedProds = parseNdjson(prodRes.data);
        const mapping: Record<number, any> = {};
        parsedProds.forEach((p: any) => {
          mapping[p.id] = p;
        });
        setAllProductsMap(mapping);
      } catch (err) {
        console.error('Failed to load supplier product catalog:', err);
        toast.error('Failed to load product list.');
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, [currentStep, supplierId]);

  // Submit Step 1 details
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error('Please select a Supplier.');
      return;
    }
    if (!warehouseId) {
      toast.error('Please select a Warehouse.');
      return;
    }

    const supplierAddressCombined = isEditMode
      ? editSupplierAddress
      : [addrLine1, addrLine2, addrLine3, city, stateName, pincode]
          .filter(Boolean)
          .join(', ');

    const payload = {
      supplierId: Number(supplierId),
      warehouseId: Number(warehouseId),
      supplierAddress: supplierAddressCombined,
      supplierGstin: gstin,
      supplierStateName: stateName,
      supplierStateCode: stateCode,
      supplierPan: pan,
      supplierEmail: supEmail,
      supplierContact: supPhone,
      billToName,
      billToAddressLine1,
      billToAddressLine2,
      billToAddressLine3,
      billToCity,
      billToState,
      billToCountry,
      billToPincode,
      shipToName,
      shipToAddressLine1,
      shipToAddressLine2,
      shipToAddressLine3,
      shipToCity,
      shipToState,
      shipToCountry,
      shipToPincode,
      contactName,
      contactPhone,
      contactEmail,
      status: poStatus,
      remarks,
      applyNegotiatedDiscount,
    };

    const toastId = toast.loading(isEditMode ? 'Updating PO details...' : 'Creating Purchase Order...');
    
    console.log("=== PO Save Parameters ===");
    console.log("URL:", isEditMode && activePoId ? `/stock/purchase-orders/${activePoId}` : '/stock/purchase-orders');
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      if (isEditMode && activePoId) {
        // Put request to update details
        // Check standard REST API URL for update
        const response = await axiosInstance.put(`/stock/purchase-orders/${activePoId}`, payload);
        // Check if status needs separate patch (only if status has changed)
        if (poStatus !== initialStatus) {
          await axiosInstance.patch(`/stock/purchase-orders/${activePoId}/status?status=${poStatus}`);
          setInitialStatus(poStatus);
        }
        toast.success('PO updated successfully!', { id: toastId });
        setCurrentStep(2);
      } else {
        // Create request
        const { data } = await axiosInstance.post('/stock/purchase-orders', payload);
        if (data.success && data.data) {
          const po = data.data;
          setActivePoId(po.id);
          setPoNumber(po.poNumber);
          setPoDate(po.poDate);
          toast.success('PO details created successfully!', { id: toastId });
          setCurrentStep(2);
        } else {
          throw new Error('Response payload malformed.');
        }
      }
    } catch (err: any) {
      console.error("=== PO Save Error ===");
      console.error(err);
      let errMsg = 'Failed to save PO. Verify all fields are correctly formatted.';
      if (err.response) {
        console.error("Response Status:", err.response.status);
        console.error("Response Headers:", err.response.headers);
        console.error("Response Data:", JSON.stringify(err.response.data, null, 2));
        
        let rawMsg = '';
        if (err.response.data) {
          if (typeof err.response.data === 'string') {
            rawMsg = err.response.data;
          } else if (err.response.data.message) {
            rawMsg = err.response.data.message;
          } else if (err.response.data.exception_message) {
            rawMsg = err.response.data.exception_message;
          }
        }
        
        if (rawMsg) {
          const match = rawMsg.match(/"([^"]+)"/);
          errMsg = match ? match[1] : rawMsg;
        }
      }
      toast.error(errMsg, { id: toastId });
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const item = JSON.parse(dataStr);
      addProductToPO(item);
    } catch (err) {
      console.error('Error handling drop event:', err);
    }
  };

  const addProductToPO = (item: any) => {
    // Check if product already exists in dropped items
    const exists = droppedItems.some((di) => di.productId === item.productId);
    if (exists) {
      toast.info('Product is already in the selection list.');
      return;
    }

    const prodDetails = allProductsMap[item.productId] || {};
    const newItem = {
      productId: item.productId,
      vendorSku: item.supplierSkuCode || prodDetails.defaultSku || 'SKU-TEMP',
      productName: prodDetails.baseProductName || 'BAJAJ DLX Kettle',
      hsnCode: prodDetails.hsnCode || '8471',
      quantity: item.moq || 1,
      unitPrice: item.supplierPrice || 0,
      taxRate: prodDetails.taxPercentage || 18,
    };

    setDroppedItems((prev) => [...prev, newItem]);
    toast.success('Product added to order!');
  };

  const handleRemoveItem = (index: number) => {
    setDroppedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemField = (index: number, field: string, val: any) => {
    setDroppedItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return {
            ...item,
            [field]: val,
          };
        }
        return item;
      })
    );
  };

  // Computations
  const calculations = React.useMemo(() => {
    let taxableTotal = 0;
    let gstTotal = 0;
    let totalVal = 0;

    droppedItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const tax = Number(item.taxRate) || 0;

      const taxable = qty * price;
      const gst = taxable * (tax / 100);
      const subTotal = taxable + gst;

      taxableTotal += taxable;
      gstTotal += gst;
      totalVal += subTotal;
    });

    return {
      taxable: taxableTotal.toFixed(2),
      gst: gstTotal.toFixed(2),
      total: totalVal.toFixed(2),
    };
  }, [droppedItems]);

  // Step 2 Submit (Save Products)
  const handleStep2Submit = async () => {
    if (droppedItems.length === 0) {
      toast.error('Please drag & drop at least one product into the PO.');
      return;
    }

    if (!activePoId) {
      toast.error('PO details not found. Please go back to Step 1.');
      return;
    }

    const payload = droppedItems.map((item) => ({
      purchaseOrderId: activePoId,
      productId: item.productId,
      vendorSku: item.vendorSku,
      productName: item.productName,
      hsnCode: item.hsnCode,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
    }));

    const toastId = toast.loading('Saving purchase order items...');

    console.log("=== PO Items Save Parameters ===");
    console.log("URL: /stock/purchase-order-item");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      const { data } = await axiosInstance.post('/stock/purchase-order-item', payload);
      toast.success('PO Items saved successfully!', { id: toastId });
      setCurrentStep(3);
    } catch (err: any) {
      console.error("=== PO Items Save Error ===");
      console.error(err);
      let errMsg = 'Failed to save products. Verify all quantities and prices.';
      if (err.response) {
        console.error("Response Status:", err.response.status);
        console.error("Response Headers:", err.response.headers);
        console.error("Response Data:", JSON.stringify(err.response.data, null, 2));
        
        let rawMsg = '';
        if (err.response.data) {
          if (typeof err.response.data === 'string') {
            rawMsg = err.response.data;
          } else if (err.response.data.message) {
            rawMsg = err.response.data.message;
          } else if (err.response.data.exception_message) {
            rawMsg = err.response.data.exception_message;
          }
        }
        
        if (rawMsg) {
          const match = rawMsg.match(/"([^"]+)"/);
          errMsg = match ? match[1] : rawMsg;
        }
      }
      toast.error(errMsg, { id: toastId });
    }
  };

  // Step 3 Download PDF
  const handleDownloadPdf = async () => {
    if (!activePoId) return;
    const toastId = toast.loading('Downloading purchase order PDF...');
    try {
      const response = await axiosInstance.get(`/stock/purchase-orders/${activePoId}/pdf`, {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${poNumber || `PO-${activePoId}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF.', { id: toastId });
    }
  };

  // Filter left catalog
  const filteredCatalog = React.useMemo(() => {
    return catalogProducts.filter((item) => {
      // Exclude products already selected in Zone 2
      const isAlreadySelected = droppedItems.some((di) => di.productId === item.productId);
      if (isAlreadySelected) return false;

      const prodDetails = allProductsMap[item.productId] || {};
      const matchCode =
        !searchCode ||
        item.supplierSkuCode?.toLowerCase().includes(searchCode.toLowerCase()) ||
        prodDetails.defaultSku?.toLowerCase().includes(searchCode.toLowerCase());
      const matchName =
        !searchName || prodDetails.baseProductName?.toLowerCase().includes(searchName.toLowerCase());
      return matchCode && matchName;
    });
  }, [catalogProducts, allProductsMap, searchCode, searchName, droppedItems]);

  return (
    <div className="flex-1 p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/stock/purchase-orders/list')}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            {isEditMode ? `Edit Purchase Order #${poNumber || poId}` : 'Generate Purchase Order'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create or edit purchase orders with product drag and drop interface.
          </p>
        </div>
      </div>

      {/* Stepper progress */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
              currentStep === 1
                ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-500/20'
                : currentStep > 1
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {currentStep > 1 ? <Check size={14} /> : '1'}
          </div>
          <span className={`text-xs font-semibold ${currentStep >= 1 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
            PO Details
          </span>
        </div>

        <div className="flex-1 h-0.5 mx-4 bg-slate-200 dark:bg-slate-700"></div>

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
              currentStep === 2
                ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-500/20'
                : currentStep > 2
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {currentStep > 2 ? <Check size={14} /> : '2'}
          </div>
          <span className={`text-xs font-semibold ${currentStep >= 2 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
            Product Selection
          </span>
        </div>

        <div className="flex-1 h-0.5 mx-4 bg-slate-200 dark:bg-slate-700"></div>

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
              currentStep === 3
                ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            '3'
          </div>
          <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
            Confirmation
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500 dark:text-slate-400">Processing request...</span>
        </div>
      )}

      {/* Step 1: PO Creation & Edit Form */}
      {!loading && currentStep === 1 && (
        <form onSubmit={handleStep1Submit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-red-600 text-white py-3 px-4 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide">Supplier Information</span>
            {isEditMode && (
              <Badge variant="warning" size="sm" className="bg-white/20 border-0 text-white">
                Edit Mode
              </Badge>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Supplier search & select */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Supplier *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={isEditMode}
                    value={supplierSearch}
                    onFocus={() => setIsSupplierFocused(true)}
                    onBlur={() => {
                      setTimeout(() => setIsSupplierFocused(false), 200);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSupplierSearch(val);
                      setIsSupplierFocused(true);
                      const match = suppliers.find((s) => s.id === Number(supplierId));
                      if (!match || match.name !== val) {
                        setSupplierId('');
                      }
                    }}
                    placeholder="Search supplier..."
                    className="w-full h-10 pl-3 pr-8 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {supplierId && !isEditMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierId('');
                        setSupplierSearch('');
                      }}
                      className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-655 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown Options */}
                {isSupplierFocused && !isEditMode && filteredSuppliers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                    {filteredSuppliers.map((sup, idx) => (
                      <button
                        key={`supplier-select-${sup.id || idx}`}
                        type="button"
                        onMouseDown={() => {
                          setSupplierId(sup.id);
                          setSupplierSearch(sup.name || '');
                          setIsSupplierFocused(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 transition-colors"
                      >
                        <div className="font-semibold truncate">{sup.name}</div>
                        {sup.email && (
                          <div className="text-[10px] text-slate-450 mt-0.5">{sup.email}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PO Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Purchase Order Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated"
                  disabled={!isEditMode}
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* PO Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Purchase Order Date *</label>
                <input
                  type="date"
                  required
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Address fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Contact Person *</label>
                <select
                  required
                  disabled={!supplierId}
                  value={contacts.find((c) => c.name === contactName)?.id || ''}
                  onChange={(e) => {
                    const selected = contacts.find((c) => c.id === Number(e.target.value));
                    applyContact(selected);
                  }}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                >
                  <option value="">Select Contact for Kind Attn:</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Supplier Address Type {isEditMode ? '' : '*'}
                </label>
                <select
                  required={!isEditMode}
                  disabled={!supplierId}
                  value={addresses.find((a) => a.addressLine1 === addrLine1)?.id || ''}
                  onChange={(e) => {
                    const selected = addresses.find((a) => a.id === Number(e.target.value));
                    applyAddress(selected);
                  }}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                >
                  <option value="">Select Address Type</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">GST IN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {!isEditMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address 1 *</label>
                    <input
                      type="text"
                      required
                      value={addrLine1}
                      onChange={(e) => setAddrLine1(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address 2</label>
                    <input
                      type="text"
                      value={addrLine2}
                      onChange={(e) => setAddrLine2(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address 3</label>
                    <input
                      type="text"
                      value={addrLine3}
                      onChange={(e) => setAddrLine3(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">State *</label>
                    <input
                      type="text"
                      required
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Supplier Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={editSupplierAddress}
                    onChange={(e) => setEditSupplierAddress(e.target.value)}
                    className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none resize-none"
                    placeholder="Enter combined supplier address..."
                  />
                </div>
              </div>
            )}

            {/* Additional Supplier info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">State Code</label>
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Supplier PAN</label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Supplier Email</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Supplier Contact</label>
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Warehouse setup */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Warehouse *</label>
                <select
                  required
                  value={warehouseId}
                  onChange={(e) => handleWarehouseChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none font-medium"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {isEditMode && (
              <>
                {/* Billing Details */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">Billing Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Billing Name *</label>
                      <input
                        type="text"
                        required
                        value={billToName}
                        onChange={(e) => setBillToName(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address Line 1 *</label>
                      <input
                        type="text"
                        required
                        value={billToAddressLine1}
                        onChange={(e) => setBillToAddressLine1(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address Line 2</label>
                      <input
                        type="text"
                        value={billToAddressLine2}
                        onChange={(e) => setBillToAddressLine2(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address Line 3</label>
                      <input
                        type="text"
                        value={billToAddressLine3}
                        onChange={(e) => setBillToAddressLine3(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">City *</label>
                      <input
                        type="text"
                        required
                        value={billToCity}
                        onChange={(e) => setBillToCity(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">State *</label>
                      <input
                        type="text"
                        required
                        value={billToState}
                        onChange={(e) => setBillToState(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Country *</label>
                      <input
                        type="text"
                        required
                        value={billToCountry}
                        onChange={(e) => setBillToCountry(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Pincode *</label>
                      <input
                        type="text"
                        required
                        value={billToPincode}
                        onChange={(e) => setBillToPincode(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Details */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">Shipping Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Shipping Name *</label>
                      <input
                        type="text"
                        required
                        value={shipToName}
                        onChange={(e) => setShipToName(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address Line 1 *</label>
                      <input
                        type="text"
                        required
                        value={shipToAddressLine1}
                        onChange={(e) => setShipToAddressLine1(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address Line 2</label>
                      <input
                        type="text"
                        value={shipToAddressLine2}
                        onChange={(e) => setShipToAddressLine2(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Address Line 3</label>
                      <input
                        type="text"
                        value={shipToAddressLine3}
                        onChange={(e) => setShipToAddressLine3(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">City *</label>
                      <input
                        type="text"
                        required
                        value={shipToCity}
                        onChange={(e) => setShipToCity(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">State *</label>
                      <input
                        type="text"
                        required
                        value={shipToState}
                        onChange={(e) => setShipToState(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Country *</label>
                      <input
                        type="text"
                        required
                        value={shipToCountry}
                        onChange={(e) => setShipToCountry(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Pincode *</label>
                      <input
                        type="text"
                        required
                        value={shipToPincode}
                        onChange={(e) => setShipToPincode(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Remarks & Toggle options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none resize-none"
                  placeholder="Enter procurement notes..."
                />
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Apply Negotiated Discount
                  </span>
                  <label className="inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyNegotiatedDiscount}
                      onChange={(e) => setApplyNegotiatedDiscount(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {applyNegotiatedDiscount ? 'Yes' : 'No'}
                    </span>
                  </label>
                </div>

                {isEditMode && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">PO Status</label>
                    <select
                      value={poStatus}
                      onChange={(e) => setPoStatus(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-lg focus:outline-none font-semibold text-amber-700 dark:text-amber-400"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="OPEN">OPEN</option>
                      <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="PRECLOSED">PRECLOSED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/stock/purchase-orders/list')}
              className="h-10 px-5 text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all text-sm flex items-center gap-1.5"
            >
              Save & Next
              <ChevronRight size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Product Selection (Drag and Drop) */}
      {!loading && currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Zone 1: Supplier Products List (6 Columns) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="bg-red-600 text-white px-4 flex items-center justify-between h-11">
              <span className="text-sm font-semibold tracking-wide">Available Supplier Products</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{filteredCatalog.length}</span>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 grid grid-cols-3 gap-3">
              <div className="relative col-span-1">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Product Code..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full h-9 pl-8 pr-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
              <div className="relative col-span-2">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Product Name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full h-9 pl-8 pr-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Product catalog list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
                  No products approved for this supplier.
                </div>
              ) : (
                filteredCatalog.map((item) => {
                  const prodDetails = allProductsMap[item.productId] || {};
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => addProductToPO(item)}
                      className="p-3 border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-grab transition-all flex flex-col gap-1 select-none active:cursor-grabbing group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                          {prodDetails.baseProductName || `Product ID: ${item.productId}`}
                        </span>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                          title="Click to add"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <div>
                          <span className="font-semibold text-slate-400">CODE:</span>{' '}
                          <span className="font-mono">{prodDetails.defaultSku || '-'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-400">SUP. CODE:</span>{' '}
                          <span className="font-mono">{item.supplierSkuCode || '-'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-400">MOQ:</span>{' '}
                          <span className="font-mono">{item.moq || 1}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-400">PRICE:</span>{' '}
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            ₹{item.supplierPrice}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Zone 2: Drag and Drop Target area (6 Columns) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="bg-red-600 text-white px-4 flex items-center justify-between h-11">
              <div>
                <span className="text-sm font-semibold tracking-wide">Purchase Order Products</span>
                <span className="ml-3 text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">{droppedItems.length}</span>
              </div>
              <div className="text-xs font-medium opacity-90 text-right">
                {selectedSupplierName && <span className="font-semibold text-white/95 mr-2">{selectedSupplierName} -</span>}
                <span>PO: <span className="font-bold">{poNumber}</span></span>
              </div>
            </div>

            {/* Dropped items list */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex-1 p-4 overflow-y-auto scrollbar-thin space-y-3 flex flex-col justify-start"
            >
              {droppedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/10 min-h-[250px]">
                  <DragIcon size={44} className="text-slate-300 dark:text-slate-700 mb-4 stroke-[1.5]" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                    DRAG & DROP IT HERE
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[280px]">
                    Drag products from the left catalog and drop
                  </p>
                </div>
              ) : (
                droppedItems.map((item, idx) => {
                  const taxable = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                  const gst = taxable * ((Number(item.taxRate) || 0) / 100);
                  const total = taxable + gst;

                  return (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="p-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex flex-col gap-3 shadow-sm hover:shadow transition-shadow relative"
                    >
                      {/* Name & SKU Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.productName}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            Vendor SKU: {item.vendorSku} | HSN: {item.hsnCode}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Inputs Row */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 items-end">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemField(idx, 'quantity', e.target.value)}
                            className="w-full h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Unit Price</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItemField(idx, 'unitPrice', e.target.value)}
                            className="w-full h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tax Rate %</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={item.taxRate}
                            onChange={(e) => handleUpdateItemField(idx, 'taxRate', e.target.value)}
                            className="w-full h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div className="text-right">
                          <span className="block text-[9px] font-semibold text-slate-400">Taxable</span>
                          <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                            ₹{taxable.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="block text-[9px] font-semibold text-slate-400">GST</span>
                          <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                            ₹{gst.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="block text-[9px] font-semibold text-slate-400">Total</span>
                          <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-100">
                            ₹{total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations and submit bar */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center gap-6 mb-4">
                <div className="text-center flex-1 border-r border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] font-semibold text-slate-400">Taxable Value</span>
                  <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200">
                    ₹{calculations.taxable}
                  </span>
                </div>
                <div className="text-center flex-1 border-r border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] font-semibold text-slate-400">GST</span>
                  <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200">
                    ₹{calculations.gst}
                  </span>
                </div>
                <div className="text-center flex-1">
                  <span className="block text-[10px] font-semibold text-slate-400">Total</span>
                  <span className="text-sm font-mono font-bold text-slate-800 dark:text-white">
                    ₹{calculations.total}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="h-10 px-5 text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  onClick={handleStep2Submit}
                  className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all text-sm flex items-center gap-1.5"
                >
                  Submit PO
                  <Check size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: PO Confirmation */}
      {!loading && currentStep === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm max-w-xl mx-auto overflow-hidden animate-fadeIn">
          <div className="bg-red-600 text-white py-3 px-4 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide">Purchase Order Download</span>
          </div>

          <div className="p-8 text-center space-y-6 flex flex-col items-center">
            {/* Success icon */}
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-500 border-4 border-emerald-100 dark:border-emerald-900/60">
              <Check size={32} className="stroke-[3]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Purchase Order Generated Successfully
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>
                  PO Date : <span className="font-semibold text-slate-700 dark:text-slate-350">{poDate}</span>
                </p>
                <p>
                  PO Number : <span className="font-semibold text-slate-700 dark:text-slate-350">{poNumber}</span>
                </p>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row items-stretch justify-center gap-3">
              <button
                onClick={handleDownloadPdf}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                PO Download
              </button>
              <button
                onClick={() => router.push('/admin/stock/purchase-orders/list')}
                className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
              >
                Go to Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
