'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Download, Mail, Trash2, RefreshCw, X, AlertCircle, Upload, FileText, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axios';
import POFilters from './POFilters';
import POTable from './POTable';
import Modal from '@/components/ui/Modal';

interface PurchaseOrder {
  id: number;
  poNumber: string;
  poDate: string;
  warehouseId: number;
  supplierId: number;
  supplierName: string;
  totalSkus: number;
  totalSkuQty: number;
  isAuto: boolean;
  status: string;
  [key: string]: any;
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

export default function POManagementClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // States for ordered items modal
  const [selectedPoForItems, setSelectedPoForItems] = useState<PurchaseOrder | null>(null);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // States for batch delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // States for Excel Upload
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [filters, setFilters] = useState({
    startDate: getTodayString(),
    endDate: getTodayString(),
    productid: '',
    brand: '',
    supplierId: '',
    status: '',
    isAuto: '',
  });

  const [isReady, setIsReady] = useState(false);

  // Load saved filters and pagination from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = sessionStorage.getItem('po_list_filters');
      if (savedFilters) {
        try {
          setFilters(JSON.parse(savedFilters));
        } catch (e) {
          console.error('Failed to parse saved PO filters:', e);
        }
      }
      const savedPage = sessionStorage.getItem('po_list_page');
      if (savedPage) {
        setPage(Number(savedPage));
      }
      const savedPerPage = sessionStorage.getItem('po_list_per_page');
      if (savedPerPage) {
        setPerPage(Number(savedPerPage));
      }
    }
    setIsReady(true);
  }, []);

  // Save filters to sessionStorage when they change
  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      sessionStorage.setItem('po_list_filters', JSON.stringify(filters));
    }
  }, [filters, isReady]);

  // Save page state to sessionStorage when it changes
  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      sessionStorage.setItem('po_list_page', String(page));
    }
  }, [page, isReady]);

  // Save perPage state to sessionStorage when it changes
  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      sessionStorage.setItem('po_list_per_page', String(perPage));
    }
  }, [perPage, isReady]);

  // Fetch warehouse mapping
  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/stock/warehouse/active', {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson(response.data);
      const mapping: Record<number, string> = {};
      parsed.forEach((w: any) => {
        mapping[w.id] = w.name;
      });
      setWarehouses(mapping);
    } catch (err) {
      console.warn('Failed to load active warehouses:', err);
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.productid) params.append('productid', filters.productid);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.supplierId) params.append('supplierId', filters.supplierId);
      if (filters.status) params.append('status', filters.status);
      if (filters.isAuto) params.append('isAuto', filters.isAuto);

      const queryString = params.toString();
      const url = `/stock/purchase-orders?${queryString ? `${queryString}&` : ''}_t=${Date.now()}`;

      const response = await axiosInstance.get<string>(url, {
        headers: {
          Accept: 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      const parsedOrders = parseNdjson(response.data) as PurchaseOrder[];
      setOrders(parsedOrders);
      setTotal(parsedOrders.length);
      setTotalPages(Math.ceil(parsedOrders.length / perPage));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      setError('Failed to load purchase orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, perPage]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    if (isReady) {
      fetchPurchaseOrders();
    }
  }, [isReady, fetchPurchaseOrders]);

  const handleResetFilters = () => {
    setFilters({
      startDate: getTodayString(),
      endDate: getTodayString(),
      productid: '',
      brand: '',
      supplierId: '',
      status: '',
      isAuto: '',
    });
    setPage(1);
  };

  const handleEdit = (id: number) => {
    router.push(`/admin/stock/purchase-orders/edit/${id}`);
  };

  const handleDownloadPdf = async (order: PurchaseOrder) => {
    const toastId = toast.loading(`Generating PDF for PO #${order.poNumber}...`);
    try {
      const response = await axiosInstance.get(`/stock/purchase-orders/${order.id}/pdf`, {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.poNumber || `PO-${order.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PO PDF.', { id: toastId });
    }
  };

  const handleDownloadExcel = async (order: PurchaseOrder) => {
    const toastId = toast.loading(`Generating Excel for PO #${order.poNumber}...`);
    try {
      const response = await axiosInstance.get(`/stock/purchase-orders/${order.id}/excel`, {
        responseType: 'blob',
        headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.poNumber || `PO-${order.id}`}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Excel downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PO Excel.', { id: toastId });
    }
  };

  const handleSendEmail = async (order: PurchaseOrder) => {
    const toastId = toast.loading(`Sending email for PO #${order.poNumber}...`);
    try {
      const response = await axiosInstance.post(`/stock/purchase-orders/${order.id}/send-email`, '');
      toast.success(response.data?.message || 'Email sent successfully!', { id: toastId });
      fetchPurchaseOrders(); // Refresh status or emailStatus
    } catch (err) {
      console.error(err);
      toast.error('Failed to dispatch email.', { id: toastId });
    }
  };

  const handleCancel = async (order: PurchaseOrder) => {
    if (!window.confirm(`Are you sure you want to CANCEL Purchase Order #${order.poNumber}?`)) {
      return;
    }
    const toastId = toast.loading(`Cancelling PO #${order.poNumber}...`);
    try {
      await axiosInstance.patch(`/stock/purchase-orders/${order.id}/status?status=CANCELLED`);
      toast.success('Purchase Order cancelled successfully!', { id: toastId });
      fetchPurchaseOrders(); // Refresh table
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel Purchase Order.', { id: toastId });
    }
  };

  const handleShowItems = async (po: PurchaseOrder) => {
    setSelectedPoForItems(po);
    setLoadingItems(true);
    setPoItems([]);
    try {
      const response = await axiosInstance.get(`/stock/purchase-order-item/po/${po.id}`, {
        headers: { Accept: 'application/x-ndjson' },
      });
      setPoItems(parseNdjson(response.data));
    } catch (err) {
      console.error('Failed to fetch PO items:', err);
      toast.error('Failed to load items for this Purchase Order.');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeleteSelectedTrigger = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmOpen(true);
  };

  const confirmBatchDelete = async () => {
    setDeleteConfirmOpen(false);
    const toastId = toast.loading(`Deleting ${selectedIds.length} purchase orders...`);
    try {
      await Promise.all(
        selectedIds.map((id) => axiosInstance.delete(`/stock/purchase-orders/${id}`))
      );
      toast.success('Selected purchase orders deleted successfully', { id: toastId });
      setSelectedIds([]);
      fetchPurchaseOrders();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete some purchase orders.', { id: toastId });
    }
  };

  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('Downloading purchase order template...');
    try {
      const response = await axiosInstance.post(
        '/stock/purchase-orders/template',
        ["string"],
        { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purchase_order_template_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Template downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Template download failed', { id: toastId });
    }
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const toastId = toast.loading('Uploading purchase order Excel file...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await axiosInstance.post('/stock/purchase-orders/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Purchase Order uploaded successfully!', { id: toastId });
      setSelectedFile(null);
      setShowUploadArea(false);
      fetchPurchaseOrders();
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + (err.response?.data?.message || err.message), { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // Get paginated orders
  const paginatedOrders = React.useMemo(() => {
    const startIdx = (page - 1) * perPage;
    return orders.slice(startIdx, startIdx + perPage);
  }, [orders, page, perPage]);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Purchase Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage procurement orders, generate supplier PDFs, and track receive status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelectedTrigger}
              className="flex items-center justify-center gap-2 h-10 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all text-xs"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => fetchPurchaseOrders()}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowUploadArea(!showUploadArea)}
            className={`flex items-center justify-center gap-2 h-10 px-4 text-xs font-bold rounded-xl shadow-sm transition-all border ${
              showUploadArea
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600'
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
            }`}
          >
            <Upload size={14} /> Upload
          </button>
          <button
            onClick={() => router.push('/admin/stock/purchase-orders/create')}
            className="flex items-center justify-center gap-2 h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-200 text-sm"
          >
            <Plus size={16} />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Upload Files Expandable Area */}
      {showUploadArea && (
        <div className="bg-slate-50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Bulk Purchase Order Upload via Excel
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download the template Excel sheet, fill in the details, and upload it below.
              </p>
            </div>
            <button
              onClick={() => {
                setShowUploadArea(false);
                setSelectedFile(null);
              }}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <label
              className="flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed border-slate-350 hover:border-blue-500 dark:border-slate-750 dark:hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 rounded-xl cursor-pointer transition-all p-4 text-center"
            >
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                  <FileText size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedFile ? (
                    <span className="text-blue-650 font-bold">{selectedFile.name}</span>
                  ) : (
                    <span>Drag your file here or <span className="text-blue-600 hover:underline">Browse</span></span>
                  )}
                </p>
                <p className="text-[10px] text-slate-450">File format: .xls & .xlsx</p>
              </div>
              <input
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </label>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-750 transition-colors shadow-sm"
              >
                <Download size={12} />
                Download Template Excel
              </button>

              {selectedFile && (
                <button
                  onClick={handleUploadExcel}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
                >
                  {uploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  {uploading ? 'Uploading...' : 'Submit Upload'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <POFilters filters={filters} onChange={setFilters} onReset={handleResetFilters} />

      {/* Main Table Content */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchPurchaseOrders()} className="underline font-medium hover:text-red-800">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading purchase orders...</span>
        </div>
      ) : (
        <POTable
          orders={paginatedOrders}
          warehouses={warehouses}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={handleEdit}
          onDownloadPdf={handleDownloadPdf}
          onDownloadExcel={handleDownloadExcel}
          onSendEmail={handleSendEmail}
          onCancel={handleCancel}
          onShowItems={handleShowItems}
          page={page}
          perPage={perPage}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      )}

      {/* Ordered Items Modal */}
      {selectedPoForItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide">
                Ordered Products - {selectedPoForItems.supplierName || `Supplier ${selectedPoForItems.supplierId}`} - {selectedPoForItems.poNumber}
              </h3>
              <button
                onClick={() => setSelectedPoForItems(null)}
                className="text-white/85 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {loadingItems ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading items...</span>
                </div>
              ) : poItems.length === 0 ? (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs">
                  No products registered in this Purchase Order.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 w-14">S.No</th>
                        <th className="px-4 py-3">PRODUCT</th>
                        <th className="px-4 py-3">VENDOR CODE</th>
                        <th className="px-4 py-3">HSN CODE</th>
                        <th className="px-4 py-3 text-right">ORDERED QTY</th>
                        <th className="px-4 py-3 text-right">RECEIVED QTY</th>
                        <th className="px-4 py-3 text-right">PENDING QTY</th>
                        <th className="px-4 py-3 text-right">{(poItems[0]?.historicalDays || 10)}DAYS QTY</th>
                        <th className="px-4 py-3 text-right">AVAILABLE QTY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {poItems.map((item, idx) => {
                        const recQty = item.receivedQty !== undefined ? Number(item.receivedQty) : 0;
                        const penQty = item.pendingQty !== undefined ? Number(item.pendingQty) : (Number(item.quantity) - recQty);

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-650 dark:text-slate-300 font-medium">
                            <td className="px-4 py-3 text-slate-400 font-normal">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.productName}</td>
                            <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-400">{item.vendorSku}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{item.hsnCode || '-'}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-850 dark:text-slate-100">{Number(item.quantity).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{recQty.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400">{penQty.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-800 dark:text-slate-200">{Number(item.totalOrderQty || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-800 dark:text-slate-200">{Number(item.availableQty || 0).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/40 px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <button
                onClick={() => setSelectedPoForItems(null)}
                className="h-9 px-6 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 font-semibold rounded-xl text-xs transition-colors shadow-sm"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Purchase Orders"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-650 dark:text-slate-350 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmBatchDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
            >
              Delete Selected
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
              Delete multiple purchase orders?
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium leading-relaxed">
              You are about to delete <span className="font-bold text-slate-850 dark:text-white">{selectedIds.length} selected purchase orders</span>. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
