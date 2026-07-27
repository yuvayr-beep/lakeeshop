'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes, Search, ArrowRight, MapPin, RotateCcw, CheckCircle2,
  Trash2, Loader2, Plus, Barcode, ListFilter, Tag, Activity,
  FileText, AlertTriangle, Layers, ChevronDown, Check, X, ShieldAlert,
  ClipboardList, Package, QrCode
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// Type definitions
interface LocationInfo {
  id: number;
  warehouseId: number;
  warehouseName: string;
  locationCode: string;
  rackNo: string | null;
  shelfNo: string | null;
  binNo: string | null;
  zoneName: string | null;
  locationType: number;
  description: string | null;
  capacityWeight: number | null;
  capacityVolume: number | null;
  status: boolean;
}

interface ProductInfo {
  id: number;
  baseProductName: string;
  productCode: string;
  sku: string;
  mrp?: number;
}

interface GrnInfo {
  id: number;
  grnNumber: string;
  grnDate: string;
  supplierName: string;
  supplierInvoiceNumber: string;
}

interface InventoryUnit {
  inventoryUnitId: number;
  productId: number;
  productCode: string;
  productName: string;
  locationId: number;
  locationCode: string;
  barcode: string;
  inventoryStatus: number;
  serialNumber: string | null;
  receivedDate: string;
  grnId: number | null;
  grnNumber: string | null;
  supplierInvoiceNumber: string | null;
  supplierName: string | null;
}

interface ProductLocationSummary {
  locationId: number;
  locationCode: string;
  warehouseId: number;
  warehouseName: string;
  rackNo: string | null;
  shelfNo: string | null;
  binNo: string | null;
  zoneName: string | null;
  availableQty: number;
}

interface TransferItem {
  id: string; // client-side unique id
  type: 'single' | 'bulk';
  inventoryUnitId?: number;
  productId: number;
  productName: string;
  productCode: string;
  barcode?: string;
  serialNumber?: string | null;
  sourceLocationId: number;
  sourceLocationCode: string;
  destinationLocationId: number;
  destinationLocationCode: string;
  quantity: number;
  remarks: string;
}

export default function TransferStockClient() {
  // Modes
  const [transferMode, setTransferMode] = useState<'single' | 'bulk'>('single');

  // Shared Data States
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [grns, setGrns] = useState<GrnInfo[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Autocomplete / Search dropdown states
  const [productSearch, setProductSearch] = useState('');
  const [isProductFocused, setIsProductFocused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);

  // Single Unit Filters State
  const [filterLocationId, setFilterLocationId] = useState<string>('');
  const [filterBarcode, setFilterBarcode] = useState<string>('');
  const [filterSerialNumber, setFilterSerialNumber] = useState<string>('');
  const [filterGrnId, setFilterGrnId] = useState<string>('');
  const [filterInvoiceNumber, setFilterInvoiceNumber] = useState<string>('');

  // Results
  const [searchingUnits, setSearchingUnits] = useState(false);
  const [searchedUnits, setSearchedUnits] = useState<InventoryUnit[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(new Set());

  // Quick Apply properties (For checked items)
  const [quickDestId, setQuickDestId] = useState<string>('');
  const [quickRemarks, setQuickRemarks] = useState<string>('');

  // Bulk Mode Specific States
  const [bulkProductSearch, setBulkProductSearch] = useState('');
  const [isBulkProductFocused, setIsBulkProductFocused] = useState(false);
  const [selectedBulkProduct, setSelectedBulkProduct] = useState<ProductInfo | null>(null);
  const [fetchingSummary, setFetchingSummary] = useState(false);
  const [productSummaries, setProductSummaries] = useState<ProductLocationSummary[]>([]);

  // Individual Bulk rows input state mapping
  const [bulkInputQtys, setBulkInputQtys] = useState<Record<number, string>>({});
  const [bulkInputDests, setBulkInputDests] = useState<Record<number, string>>({});
  const [bulkInputRemarks, setBulkInputRemarks] = useState<Record<number, string>>({});

  // Transfer Cart
  const [transferList, setTransferList] = useState<TransferItem[]>([]);

  // Submission Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIndex, setSubmitIndex] = useState(0);
  const [submitLogs, setSubmitLogs] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  // NDJSON Parser Helper
  const parseNdjson = (text: string) => {
    if (!text) return [];
    return text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((item) => item !== null);
  };

  // Fetch initial data
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoadingInitial(true);
        const [locRes, prodRes, grnRes] = await Promise.all([
          axiosInstance.get('/stock/location/active', { headers: { Accept: 'application/x-ndjson' } }),
          axiosInstance.get('/prod/products', { headers: { Accept: 'application/x-ndjson' } }),
          axiosInstance.get('/stock/grn', { headers: { Accept: 'application/x-ndjson' } })
        ]);

        setLocations(parseNdjson(locRes.data));
        setProducts(parseNdjson(prodRes.data));
        setGrns(parseNdjson(grnRes.data));
      } catch (err) {
        console.error('Failed to load metadata:', err);
        toast.error('Failed to load locations, products or GRN catalogs.');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchMetadata();
  }, []);

  // Autocomplete filtering for Single Mode Product Search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const query = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.baseProductName?.toLowerCase().includes(query) ||
        p.productCode?.toLowerCase().includes(query) ||
        String(p.id).includes(query)
    ).slice(0, 10);
  }, [products, productSearch]);

  // Autocomplete filtering for Bulk Mode Product Search
  const filteredBulkProducts = useMemo(() => {
    if (!bulkProductSearch) return [];
    const query = bulkProductSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.baseProductName?.toLowerCase().includes(query) ||
        p.productCode?.toLowerCase().includes(query) ||
        String(p.id).includes(query)
    ).slice(0, 10);
  }, [products, bulkProductSearch]);

  // Fetch Inventory Units for Single mode
  const handleSearchUnits = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchingUnits(true);
    setSelectedUnitIds(new Set());

    const params: Record<string, any> = {};
    if (selectedProduct) params.productId = selectedProduct.id;
    if (filterLocationId) params.locationId = Number(filterLocationId);
    if (filterBarcode.trim()) params.barcode = filterBarcode.trim();
    if (filterSerialNumber.trim()) params.serialNumber = filterSerialNumber.trim();
    if (filterGrnId) params.grnId = Number(filterGrnId);
    if (filterInvoiceNumber.trim()) params.invoiceNumber = filterInvoiceNumber.trim();

    // Check if at least one filter is applied
    if (Object.keys(params).length === 0) {
      toast.warning('Please specify at least one filter to search inventory units.');
      setSearchingUnits(false);
      return;
    }

    try {
      const { data } = await axiosInstance.get('/stock/units', { params });
      setSearchedUnits(data || []);
      if (data?.length === 0) {
        toast.info('No active inventory units found matching criteria.');
      }
    } catch (err) {
      console.error('Failed to search units:', err);
      toast.error('Error fetching inventory units from server.');
    } finally {
      setSearchingUnits(false);
    }
  };

  // Reset Single Mode Filters
  const handleResetFilters = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setFilterLocationId('');
    setFilterBarcode('');
    setFilterSerialNumber('');
    setFilterGrnId('');
    setFilterInvoiceNumber('');
    setSearchedUnits([]);
    setSelectedUnitIds(new Set());
  };

  // Handle Bulk Product Selection & Fetch Summary
  const handleSelectBulkProduct = async (prod: ProductInfo) => {
    setSelectedBulkProduct(prod);
    setBulkProductSearch(prod.baseProductName);
    setIsBulkProductFocused(false);
    setFetchingSummary(true);

    try {
      const { data } = await axiosInstance.get(`/stock/summary/${prod.id}/locations`);
      setProductSummaries(data || []);
      
      // Initialize inputs for summaries
      const qtys: Record<number, string> = {};
      const dests: Record<number, string> = {};
      const rems: Record<number, string> = {};
      data.forEach((s: ProductLocationSummary) => {
        qtys[s.locationId] = String(s.availableQty);
        dests[s.locationId] = '';
        rems[s.locationId] = 'Bulk Stock Location Transfer';
      });
      setBulkInputQtys(qtys);
      setBulkInputDests(dests);
      setBulkInputRemarks(rems);
    } catch (err) {
      console.error('Failed to load product stock breakdown:', err);
      toast.error('Error fetching location summaries for this product.');
    } finally {
      setFetchingSummary(false);
    }
  };

  // Checkbox select unit helper
  const handleToggleSelectUnit = (unitId: number) => {
    const updated = new Set(selectedUnitIds);
    if (updated.has(unitId)) {
      updated.delete(unitId);
    } else {
      updated.add(unitId);
    }
    setSelectedUnitIds(updated);
  };

  // Checkbox select all units helper
  const handleToggleSelectAllUnits = () => {
    if (selectedUnitIds.size === searchedUnits.length) {
      setSelectedUnitIds(new Set());
    } else {
      setSelectedUnitIds(new Set(searchedUnits.map((u) => u.inventoryUnitId)));
    }
  };

  // Add checked Single Units to transfer cart
  const handleAddSingleUnitsToCart = () => {
    if (selectedUnitIds.size === 0) {
      toast.warning('Please select at least one unit from the search results.');
      return;
    }
    if (!quickDestId) {
      toast.warning('Please select a destination location to apply.');
      return;
    }

    const destLoc = locations.find((l) => l.id === Number(quickDestId));
    if (!destLoc) return;

    const newItems: TransferItem[] = [];
    const updatedSelectedIds = new Set(selectedUnitIds);

    searchedUnits.forEach((unit) => {
      if (updatedSelectedIds.has(unit.inventoryUnitId)) {
        // Prevent duplicate units in transfer list
        if (transferList.some((t) => t.inventoryUnitId === unit.inventoryUnitId)) {
          updatedSelectedIds.delete(unit.inventoryUnitId);
          return;
        }

        newItems.push({
          id: `single-${unit.inventoryUnitId}-${Date.now()}`,
          type: 'single',
          inventoryUnitId: unit.inventoryUnitId,
          productId: unit.productId,
          productName: unit.productName,
          productCode: unit.productCode,
          barcode: unit.barcode,
          serialNumber: unit.serialNumber,
          sourceLocationId: unit.locationId,
          sourceLocationCode: unit.locationCode,
          destinationLocationId: destLoc.id,
          destinationLocationCode: destLoc.locationCode,
          quantity: 1,
          remarks: quickRemarks.trim() || 'Location Transfer'
        });
      }
    });

    if (newItems.length > 0) {
      setTransferList((prev) => [...prev, ...newItems]);
      setSelectedUnitIds(new Set());
      toast.success(`Added ${newItems.length} units to the transfer list.`);
    } else {
      toast.warning('Selected unit(s) are already in the transfer list.');
    }
  };

  // Add Bulk unit to transfer cart
  const handleAddBulkToCart = (summary: ProductLocationSummary) => {
    const qtyStr = bulkInputQtys[summary.locationId];
    const destId = bulkInputDests[summary.locationId];
    const remark = bulkInputRemarks[summary.locationId] || '';

    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid transfer quantity.');
      return;
    }
    if (qty > summary.availableQty) {
      toast.error(`Transfer quantity exceeds available stock (${summary.availableQty}).`);
      return;
    }
    if (!destId) {
      toast.error('Please select a destination location.');
      return;
    }
    if (Number(destId) === summary.locationId) {
      toast.error('Destination location cannot be the same as the source location.');
      return;
    }

    const destLoc = locations.find((l) => l.id === Number(destId));
    if (!destLoc || !selectedBulkProduct) return;

    // Check if duplicate bulk transfer already in cart
    const existing = transferList.find(
      (t) =>
        t.productId === selectedBulkProduct.id &&
        t.sourceLocationId === summary.locationId &&
        t.destinationLocationId === destLoc.id
    );

    if (existing) {
      toast.warning('A transfer entry for this product and locations is already in the list. Please edit or delete it.');
      return;
    }

    const newItem: TransferItem = {
      id: `bulk-${selectedBulkProduct.id}-${summary.locationId}-${destLoc.id}-${Date.now()}`,
      type: 'bulk',
      productId: selectedBulkProduct.id,
      productName: selectedBulkProduct.baseProductName,
      productCode: selectedBulkProduct.productCode,
      sourceLocationId: summary.locationId,
      sourceLocationCode: summary.locationCode,
      destinationLocationId: destLoc.id,
      destinationLocationCode: destLoc.locationCode,
      quantity: qty,
      remarks: remark.trim() || 'Bulk Transfer'
    };

    setTransferList((prev) => [...prev, newItem]);
    toast.success('Transfer item added to the list.');
  };

  // Remove item from cart
  const handleRemoveCartItem = (itemId: string) => {
    setTransferList((prev) => prev.filter((item) => item.id !== itemId));
    toast.info('Item removed from transfer list.');
  };

  const handleCloseModal = () => {
    setIsSubmitting(false);
    setTransferList([]);
    if (transferMode === 'single') {
      handleSearchUnits();
    } else if (transferMode === 'bulk' && selectedBulkProduct) {
      handleSelectBulkProduct(selectedBulkProduct);
    }
  };

  // Submit all transfers sequentially
  const handleSubmitTransfers = async () => {
    if (transferList.length === 0) {
      toast.warning('Your transfer list is empty.');
      return;
    }

    setIsSubmitting(true);
    setSubmitIndex(0);
    setSubmitLogs([]);
    setTotalItems(transferList.length);

    const logs: string[] = [];
    let hasFailure = false;

    for (let i = 0; i < transferList.length; i++) {
      setSubmitIndex(i);
      const item = transferList[i];
      const name = item.productName;
      const desc = item.type === 'single' ? `Barcode: ${item.barcode}` : `Qty: ${item.quantity}`;
      
      logs.push(`[Pending] Transferring "${name}" (${desc}) from ${item.sourceLocationCode} to ${item.destinationLocationCode}...`);
      setSubmitLogs([...logs]);

      try {
        const body: Record<string, any> = {
          productId: item.productId,
          quantity: item.quantity,
          sourceLocationId: item.sourceLocationId,
          destinationLocationId: item.destinationLocationId,
          remarks: item.remarks
        };

        if (item.type === 'single' && item.inventoryUnitId) {
          body.inventoryUnitId = item.inventoryUnitId;
        } else {
          body.inventoryUnitId = null;
        }

        const res = await axiosInstance.post('/stock/transfer', body);
        if (res.data?.success) {
          logs[i] = `[Success] "${name}" (${desc}) successfully transferred.`;
        } else {
          logs[i] = `[Failed] "${name}" (${desc}): ${res.data?.message || 'Unknown server error.'}`;
          hasFailure = true;
        }
      } catch (err: any) {
        console.error(err);
        const errMsg = err.response?.data?.message || err.message || 'API request failed.';
        logs[i] = `[Error] "${name}" (${desc}): ${errMsg}`;
        hasFailure = true;
      }
      setSubmitLogs([...logs]);
    }

    toast.success('Stock transfer process finished!');

    // Auto-close popup after 1.5 seconds if there are no failures
    if (!hasFailure) {
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-indigo-650 dark:text-indigo-400" size={32} />
        <span className="text-sm text-slate-500 font-bold">Initializing Transfer dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 p-6">
      {/* Header section */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Boxes size={22} className="text-indigo-650 dark:text-indigo-400 animate-pulse" />
          Transfer Stock
        </h1>
        <p className="text-xs text-slate-700 dark:text-slate-400 mt-1">
          Move inventory units between storage zones, racks, shelves, and bins. Supports unit-level scan validations or bulk quantity transfers.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-start">
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1 border border-slate-200 dark:border-slate-750">
          <button
            onClick={() => { setTransferMode('single'); setTransferList([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              transferMode === 'single'
                ? 'bg-white dark:bg-slate-900 text-indigo-605 dark:text-indigo-400 shadow-md scale-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800'
            }`}
          >
            <Barcode size={15} />
            Single Unit Transfer
          </button>
          <button
            onClick={() => { setTransferMode('bulk'); setTransferList([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              transferMode === 'bulk'
                ? 'bg-white dark:bg-slate-900 text-indigo-605 dark:text-indigo-400 shadow-md scale-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800'
            }`}
          >
            <Package size={15} />
            Bulk Quantity Transfer
          </button>
        </div>
      </div>

      {/* Split Dashboard Screen layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: Filter and Selection Panel */}
        <div className="space-y-6">
          {transferMode === 'single' ? (
            // SINGLE UNIT SEARCH CONTROLS
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ListFilter size={14} className="text-indigo-500" />
                  Search Filters
                </h6>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[10px] text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 transition-all"
                >
                  <RotateCcw size={10} />
                  Reset
                </button>
              </div>

              <form onSubmit={handleSearchUnits} className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Product Autocomplete Dropdown */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Product Lookup
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onFocus={() => setIsProductFocused(true)}
                        onBlur={() => setTimeout(() => setIsProductFocused(false), 200)}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setIsProductFocused(true);
                          if (selectedProduct) setSelectedProduct(null);
                        }}
                        placeholder="Search product name or code..."
                        className="w-full h-10 pl-3 pr-8 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                      />
                      {selectedProduct && (
                        <span className="absolute right-3 top-3 text-emerald-500">
                          <CheckCircle2 size={15} />
                        </span>
                      )}
                    </div>
                    {/* Autocomplete Dropdown */}
                    {isProductFocused && filteredProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                        {filteredProducts.map((p) => (
                          <button
                            key={`prod-search-${p.id}`}
                            type="button"
                            onMouseDown={() => {
                              setSelectedProduct(p);
                              setProductSearch(p.baseProductName);
                              setIsProductFocused(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-750 last:border-b-0"
                          >
                            <div className="font-semibold">{p.baseProductName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{p.productCode}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Location Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Current Location
                    </label>
                    <select
                      value={filterLocationId}
                      onChange={(e) => setFilterLocationId(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                    >
                      <option value="">All Locations</option>
                      {locations.map((loc) => (
                        <option key={`floc-${loc.id}`} value={loc.id}>
                          {loc.locationCode} - {loc.warehouseName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barcode Search (Simulate Scanning) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <QrCode size={12} className="text-slate-400" />
                      Barcode Scan
                    </label>
                    <input
                      type="text"
                      value={filterBarcode}
                      onChange={(e) => setFilterBarcode(e.target.value)}
                      placeholder="Scan or enter unique unit barcode..."
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-mono"
                    />
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={filterSerialNumber}
                      onChange={(e) => setFilterSerialNumber(e.target.value)}
                      placeholder="Enter unit serial/IMEI..."
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  {/* GRN ID Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Goods Receipt (GRN)
                    </label>
                    <select
                      value={filterGrnId}
                      onChange={(e) => setFilterGrnId(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                    >
                      <option value="">All GRNs</option>
                      {grns.map((g) => (
                        <option key={`fgrn-${g.id}`} value={g.id}>
                          {g.grnNumber} ({g.grnDate})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Supplier Invoice
                    </label>
                    <input
                      type="text"
                      value={filterInvoiceNumber}
                      onChange={(e) => setFilterInvoiceNumber(e.target.value)}
                      placeholder="Enter supplier invoice number..."
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={searchingUnits}
                    className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {searchingUnits ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    Search Units
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // BULK MODE PRODUCT SELECTION
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 rounded-t-2xl">
                <Package size={14} className="text-indigo-500" />
                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Product for Bulk Location Transfer
                </h6>
              </div>

              <div className="p-5">
                <div className="relative max-w-xl">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Search Product *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bulkProductSearch}
                      onFocus={() => setIsBulkProductFocused(true)}
                      onBlur={() => setTimeout(() => setIsBulkProductFocused(false), 200)}
                      onChange={(e) => {
                        setBulkProductSearch(e.target.value);
                        setIsBulkProductFocused(true);
                        if (selectedBulkProduct) {
                          setSelectedBulkProduct(null);
                          setProductSummaries([]);
                        }
                      }}
                      placeholder="Search base product by name or SKU..."
                      className="w-full h-10 pl-3 pr-8 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 font-semibold"
                    />
                    {selectedBulkProduct && (
                      <span className="absolute right-3 top-3 text-emerald-500">
                        <CheckCircle2 size={15} />
                      </span>
                    )}
                  </div>
                  {/* Autocomplete Dropdown */}
                  {isBulkProductFocused && filteredBulkProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
                      {filteredBulkProducts.map((p) => (
                        <button
                          key={`bulk-prod-search-${p.id}`}
                          type="button"
                          onMouseDown={() => handleSelectBulkProduct(p)}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-750 last:border-b-0"
                        >
                          <div className="font-semibold">{p.baseProductName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.productCode}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RESULTS TABLES */}
          {transferMode === 'single' ? (
            // SINGLE MODE UNITS RESULT TABLE
            searchedUnits.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Inventory Units ({searchedUnits.length})
                  </h6>
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                    {selectedUnitIds.size} Selected
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin max-h-96">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 text-slate-500 font-bold uppercase text-[9px] select-none">
                        <th className="py-2.5 px-4 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedUnitIds.size === searchedUnits.length}
                            onChange={handleToggleSelectAllUnits}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="py-2.5 px-2">Product Name</th>
                        <th className="py-2.5 px-2 w-28">Barcode</th>
                        <th className="py-2.5 px-2 w-24">Location</th>
                        <th className="py-2.5 px-2 w-24">Serial / IMEI</th>
                        <th className="py-2.5 px-2 w-20">GRN ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-300">
                      {searchedUnits.map((unit) => {
                        const isChecked = selectedUnitIds.has(unit.inventoryUnitId);
                        return (
                          <tr
                            key={`unit-${unit.inventoryUnitId}`}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-850/20 transition-all ${
                              isChecked ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectUnit(unit.inventoryUnitId)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="font-semibold truncate max-w-[200px]" title={unit.productName}>
                                {unit.productName}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">{unit.productCode}</div>
                            </td>
                            <td className="py-2.5 px-2 font-mono text-[10px] text-slate-500 truncate max-w-[120px]" title={unit.barcode}>
                              {unit.barcode.substring(0, 8)}...
                            </td>
                            <td className="py-2.5 px-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 rounded font-bold uppercase text-[10px]">
                                {unit.locationCode}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 font-mono">
                              {unit.serialNumber || 'N/A'}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 font-mono">
                              {unit.grnNumber ? `#${unit.grnId}` : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Single Units Batch Action Panel */}
                {selectedUnitIds.size > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-955 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Destination Location *
                        </label>
                        <select
                          value={quickDestId}
                          onChange={(e) => setQuickDestId(e.target.value)}
                          className="h-8 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-lg focus:outline-none text-slate-805 dark:text-slate-200 font-semibold"
                        >
                          <option value="">Select Location</option>
                          {locations.map((loc) => (
                            <option key={`dest-sel-${loc.id}`} value={loc.id}>
                              {loc.locationCode} ({loc.warehouseName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1 md:w-60">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Remarks
                        </label>
                        <input
                          type="text"
                          value={quickRemarks}
                          onChange={(e) => setQuickRemarks(e.target.value)}
                          placeholder="e.g. Rack reorganization"
                          className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-lg focus:outline-none text-slate-805 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSingleUnitsToCart}
                      className="h-8 px-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md flex-shrink-0"
                    >
                      <Plus size={14} />
                      Add Selected to List
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            // BULK MODE LOCATION QUANTITIES TABLE
            selectedBulkProduct && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Current Location Stocks - {selectedBulkProduct.baseProductName}
                  </h6>
                </div>

                {fetchingSummary ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-indigo-550" />
                    <span className="text-xs text-slate-400">Loading stock breakdown...</span>
                  </div>
                ) : productSummaries.length === 0 ? (
                  <div className="py-14 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                    <ShieldAlert size={28} className="text-slate-300" />
                    <p className="text-sm font-semibold">No Available Stock Found</p>
                    <p className="text-xs">This product has no active units in staging or racks.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 text-slate-500 font-bold uppercase text-[9px] select-none">
                          <th className="py-2.5 px-4">Source Location</th>
                          <th className="py-2.5 px-2 text-center w-24">Available</th>
                          <th className="py-2.5 px-2 text-center w-24">Transfer Qty</th>
                          <th className="py-2.5 px-2 w-40">Destination Location</th>
                          <th className="py-2.5 px-2 w-44">Remarks</th>
                          <th className="py-2.5 px-4 text-center w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs font-semibold text-slate-805 dark:text-slate-300">
                        {productSummaries.map((summary) => (
                          <tr key={`summary-${summary.locationId}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/20">
                            <td className="py-3 px-4">
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold uppercase text-[10px] block w-fit">
                                {summary.locationCode}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{summary.warehouseName}</span>
                            </td>
                            <td className="py-3 px-2 text-center text-sm font-bold text-slate-900 dark:text-white">
                              {summary.availableQty}
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={bulkInputQtys[summary.locationId] || ''}
                                onChange={(e) =>
                                  setBulkInputQtys({
                                    ...bulkInputQtys,
                                    [summary.locationId]: e.target.value
                                  })
                                }
                                placeholder="0"
                                className="w-full h-8 text-center text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-lg focus:outline-none font-bold"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <select
                                value={bulkInputDests[summary.locationId] || ''}
                                onChange={(e) =>
                                  setBulkInputDests({
                                    ...bulkInputDests,
                                    [summary.locationId]: e.target.value
                                  })
                                }
                                className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-lg focus:outline-none font-semibold"
                              >
                                <option value="">Select Destination</option>
                                {locations.map((loc) => (
                                  <option key={`b-dest-${loc.id}`} value={loc.id}>
                                    {loc.locationCode} ({loc.warehouseName})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="text"
                                value={bulkInputRemarks[summary.locationId] || ''}
                                onChange={(e) =>
                                  setBulkInputRemarks({
                                    ...bulkInputRemarks,
                                    [summary.locationId]: e.target.value
                                  })
                                }
                                placeholder="Remarks..."
                                className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 rounded-lg focus:outline-none"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleAddBulkToCart(summary)}
                                className="h-8 w-8 bg-indigo-50 hover:bg-indigo-650 dark:bg-indigo-900/20 dark:hover:bg-indigo-650 text-indigo-650 hover:text-white rounded-lg flex items-center justify-center transition-all mx-auto shadow-sm"
                                title="Add to Transfer List"
                              >
                                <Plus size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Right Side: Transfer List (Cart) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden sticky top-20">
            <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ClipboardList size={14} className="text-indigo-505" />
                Transfer List
              </h6>
              {transferList.length > 0 && (
                <button
                  onClick={() => setTransferList([])}
                  className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={11} />
                  Clear All
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {transferList.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <Boxes size={44} className="text-slate-300 dark:text-slate-800 mb-3" />
                  <p className="text-sm font-semibold">List is Empty</p>
                  <p className="text-xs text-slate-655 text-center mt-1 max-w-[240px]">
                    Search and select stock items on the left to queue transfers.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                    {transferList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-xl relative group transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove item"
                        >
                          <X size={14} />
                        </button>

                        <div className="font-semibold text-xs text-slate-800 dark:text-white pr-6 truncate" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.productCode}</div>

                        <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">
                            {item.sourceLocationCode}
                          </span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 rounded">
                            {item.destinationLocationCode}
                          </span>
                        </div>

                        {item.type === 'single' ? (
                          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                            <Barcode size={10} />
                            <span>Barcode: {item.barcode}</span>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                            <Package size={10} />
                            <span>Transfer Qty: {item.quantity} units</span>
                          </div>
                        )}

                        {item.remarks && (
                          <p className="mt-2 text-[9px] italic text-slate-400 bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                            {item.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitTransfers}
                    className="w-full h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-750 hover:to-blue-750 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Confirm & Submit Transfers ({transferList.length})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Submission Modal Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 dark:bg-slate-955 px-5 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-indigo-500 animate-spin" />
                Processing Stock Transfers
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                {submitIndex + 1} of {totalItems}
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#4f46e5] h-full rounded-full transition-all duration-300"
                  style={{ width: `${((submitIndex + 1) / totalItems) * 100}%` }}
                />
              </div>

              {/* Console Logs */}
              <div className="bg-slate-950 text-[11px] font-mono text-slate-300 p-4 rounded-xl max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
                {submitLogs.map((log, index) => {
                  let colorClass = 'text-slate-400';
                  if (log.startsWith('[Success]')) colorClass = 'text-emerald-500';
                  if (log.startsWith('[Failed]') || log.startsWith('[Error]')) colorClass = 'text-red-500';
                  return (
                    <div key={`log-${index}`} className={colorClass}>
                      {log}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                {submitIndex + 1 === submitLogs.length && (
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    Close & Finish
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
