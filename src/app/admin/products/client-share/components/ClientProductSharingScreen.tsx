'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, RefreshCw, Plus, Check, Slash, Edit, Trash2,
  Sparkles, CheckSquare, Square, Inbox, FileText, History,
  ChevronLeft, ChevronRight, Ban, Unlock, Upload
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import ClientProductShareModal from './ClientProductShareModal';
import ReasonModal from './ReasonModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import PriceChangeModal from './PriceChangeModal';

interface Client {
  id: number;
  clientCode: string;
  clientName: string;
  legalName: string;
  logoUrl?: string;
}

interface ClientProductSharingScreenProps {
  client: Client;
  onBack: () => void;
  clientsList: Client[];
}

const parseNdjson = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return [data];
  if (typeof data === 'string') {
    const trimmed = data.trim();
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
  }
  return [];
};

export default function ClientProductSharingScreen({
  client,
  onBack,
  clientsList,
}: ClientProductSharingScreenProps) {
  // Main Tab: 'shared' | 'price'
  const [mainTab, setMainTab] = useState<'shared' | 'price'>('shared');
  // Sub Tab: 'DRAFT' | 'APPROVED' | 'BLOCKED'
  const [subTab, setSubTab] = useState<'DRAFT' | 'APPROVED' | 'BLOCKED'>('DRAFT');

  // Shares list
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination (API is 0-indexed)
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  // Selections
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Resolution Caches
  const [productCache, setProductCache] = useState<Record<number, string>>({});
  const [skuCache, setSkuCache] = useState<Record<number, string>>({});
  const [priceTypeCache, setPriceTypeCache] = useState<Record<number, string>>({});

  // Modals state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<any | null>(null);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [blockingTarget, setBlockingTarget] = useState<'single' | 'bulk'>('single');
  const [singleBlockId, setSingleBlockId] = useState<number | null>(null);

  // Excel Upload states
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [uploadMode, setUploadMode] = useState<'block' | 'unblock' | 'approve' | 'add' | 'priceChange'>('block');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);

  // Delete Confirmation Modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk'>('single');
  const [singleDeleteId, setSingleDeleteId] = useState<number | null>(null);

  // Search / Filter states
  const [skuSearch, setSkuSearch] = useState('');
  const [productNameSearch, setProductNameSearch] = useState('');
  const [appliedSku, setAppliedSku] = useState('');
  const [appliedProductName, setAppliedProductName] = useState('');

  // Price History states
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historySize, setHistorySize] = useState(20);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historySkuSearch, setHistorySkuSearch] = useState('');
  const [historyProductNameSearch, setHistoryProductNameSearch] = useState('');
  const [appliedHistorySku, setAppliedHistorySku] = useState('');
  const [appliedHistoryProductName, setAppliedHistoryProductName] = useState('');

  const [priceChangeModalOpen, setPriceChangeModalOpen] = useState(false);
  const [editingPriceChange, setEditingPriceChange] = useState<any | null>(null);

  const handleApplyFilter = () => {
    setPage(0);
    setAppliedSku(skuSearch);
    setAppliedProductName(productNameSearch);
  };

  const handleClearFilter = () => {
    setSkuSearch('');
    setProductNameSearch('');
    setAppliedSku('');
    setAppliedProductName('');
    setPage(0);
  };

  const handleApplyHistoryFilter = () => {
    setHistoryPage(0);
    setAppliedHistorySku(historySkuSearch);
    setAppliedHistoryProductName(historyProductNameSearch);
  };

  const handleClearHistoryFilter = () => {
    setHistorySkuSearch('');
    setHistoryProductNameSearch('');
    setAppliedHistorySku('');
    setAppliedHistoryProductName('');
    setHistoryPage(0);
  };

  // Fetch shares from paginated or filtered endpoint
  const fetchShares = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      let url = '';
      const isFiltered = appliedSku.trim() !== '' || appliedProductName.trim() !== '';

      if (isFiltered) {
        url = `/prod/client-product-share?clientId=${client.id}&shareStatus=${subTab}`;
        if (appliedSku.trim() !== '') {
          url += `&sku=${encodeURIComponent(appliedSku.trim())}`;
        }
        if (appliedProductName.trim() !== '') {
          url += `&productName=${encodeURIComponent(appliedProductName.trim())}`;
        }
      } else {
        url = `/prod/client-product-share/paginated?clientId=${client.id}&shareStatus=${subTab}&page=${page}&size=${size}`;
      }

      const { data } = await axiosInstance.get<any>(url, {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson(data);

      setShares(parsed);
      if (isFiltered) {
        setHasMore(false);
      } else {
        setHasMore(parsed.length === size);
      }

      // Trigger resolution of IDs for this page
      resolveMissingIds(parsed);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load shared products');
      setShares([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [client.id, subTab, page, size, appliedSku, appliedProductName]);

  // Fetch price history from paginated & filtered endpoint
  const fetchPriceHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      let url = `/prod/client-product-share/price-history?clientId=${client.id}&page=${historyPage}&size=${historySize}`;
      if (appliedHistorySku.trim() !== '') {
        url += `&sku=${encodeURIComponent(appliedHistorySku.trim())}`;
      }
      if (appliedHistoryProductName.trim() !== '') {
        url += `&productName=${encodeURIComponent(appliedHistoryProductName.trim())}`;
      }

      const { data } = await axiosInstance.get<any>(url, {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson(data);
      setPriceHistory(parsed);
      setHistoryHasMore(parsed.length === historySize);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load price history');
      setPriceHistory([]);
      setHistoryHasMore(false);
    } finally {
      setHistoryLoading(false);
    }
  }, [client.id, historyPage, historySize, appliedHistorySku, appliedHistoryProductName]);

  // Trigger loading of shares when active parameters change
  useEffect(() => {
    if (mainTab === 'shared') {
      fetchShares();
    }
  }, [mainTab, subTab, page, size, fetchShares]);

  // Trigger loading of price history when parameters change
  useEffect(() => {
    if (mainTab === 'price') {
      fetchPriceHistory();
    }
  }, [mainTab, historyPage, historySize, fetchPriceHistory]);

  // Resolve IDs of products, SKUs, and priceTypes that are not in local cache
  const resolveMissingIds = async (sharesList: any[]) => {
    const missingProducts = new Set<number>();
    const missingSkus = new Set<number>();
    const missingPriceTypes = new Set<number>();

    sharesList.forEach((item) => {
      if (item.productId && !productCache[item.productId]) {
        missingProducts.add(item.productId);
      }
      if (item.skuId && !skuCache[item.skuId]) {
        missingSkus.add(item.skuId);
      }
      if (item.priceTypeId && !priceTypeCache[item.priceTypeId]) {
        missingPriceTypes.add(item.priceTypeId);
      }
    });

    // Fetch products in parallel
    if (missingProducts.size > 0) {
      Promise.all(
        Array.from(missingProducts).map(async (id) => {
          try {
            const { data } = await axiosInstance.get(`/prod/products/${id}`);
            return { id, name: data?.data?.baseProductName || `Product #${id}` };
          } catch {
            return { id, name: `Product #${id}` };
          }
        })
      ).then((results) => {
        setProductCache((prev) => {
          const updated = { ...prev };
          results.forEach((r) => {
            updated[r.id] = r.name;
          });
          return updated;
        });
      });
    }

    // Fetch SKUs in parallel
    if (missingSkus.size > 0) {
      Promise.all(
        Array.from(missingSkus).map(async (id) => {
          try {
            const { data } = await axiosInstance.get(`/prod/sku/${id}`);
            return { id, code: data?.data?.skuCode || `SKU #${id}` };
          } catch {
            return { id, code: `SKU #${id}` };
          }
        })
      ).then((results) => {
        setSkuCache((prev) => {
          const updated = { ...prev };
          results.forEach((r) => {
            updated[r.id] = r.code;
          });
          return updated;
        });
      });
    }

    // Fetch Price Types in parallel
    if (missingPriceTypes.size > 0) {
      Promise.all(
        Array.from(missingPriceTypes).map(async (id) => {
          try {
            const { data } = await axiosInstance.get(`/prod/types/${id}`);
            return { id, name: data?.data?.displayName || data?.data?.code || `Type #${id}` };
          } catch {
            return { id, name: `Type #${id}` };
          }
        })
      ).then((results) => {
        setPriceTypeCache((prev) => {
          const updated = { ...prev };
          results.forEach((r) => {
            updated[r.id] = r.name;
          });
          return updated;
        });
      });
    }
  };

  const [allClientShares, setAllClientShares] = useState<any[]>([]);

  const fetchAllClientShares = useCallback(async () => {
    try {
      const url = `/prod/client-product-share?clientId=${client.id}`;
      const { data } = await axiosInstance.get<any>(url, {
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseNdjson(data);
      setAllClientShares(parsed);
      resolveMissingIds(parsed);
    } catch (err) {
      console.error('Failed to load client shares for dropdown', err);
    }
  }, [client.id]);

  useEffect(() => {
    if (client.id) {
      fetchAllClientShares();
    }
  }, [client.id, fetchAllClientShares]);

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(shares.map((s) => s.clientShareId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((sid) => sid !== id)));
  };

  const isAllSelected = shares.length > 0 && shares.every((s) => selectedIds.includes(s.clientShareId));

  // Single Approve action
  const handleSingleApprove = async (shareId: number) => {
    const toastId = toast.loading('Approving share...');
    try {
      await axiosInstance.post('/prod/client-product-share/approve', [shareId]);
      toast.success('Product Share approved successfully!', { id: toastId });
      fetchShares();
    } catch (err) {
      console.error(err);
      toast.error('Approve failed', { id: toastId });
    }
  };

  // Bulk Approve action
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const toastId = toast.loading(`Approving ${selectedIds.length} shares...`);
    try {
      await axiosInstance.post('/prod/client-product-share/approve', selectedIds);
      toast.success('Selected Product Shares approved!', { id: toastId });
      setSelectedIds([]);
      fetchShares();
    } catch (err) {
      console.error(err);
      toast.error('Bulk Approve failed', { id: toastId });
    }
  };

  // Initiate Block (Single / Bulk)
  const handleBlockInitiate = (type: 'single' | 'bulk', shareId?: number) => {
    setBlockingTarget(type);
    if (type === 'single' && shareId) {
      setSingleBlockId(shareId);
    }
    setReasonModalOpen(true);
  };

  // Submit Block action
  const handleBlockSubmit = async (reason: string) => {
    setReasonModalOpen(false);
    const toastId = toast.loading('Updating block status...');

    let payload = [];
    if (blockingTarget === 'single' && singleBlockId !== null) {
      payload = [{
        clientShareId: singleBlockId,
        clientId: client.id,
        block: true,
        reason: reason,
      }];
    } else {
      payload = selectedIds.map((id) => ({
        clientShareId: id,
        clientId: client.id,
        block: true,
        reason: reason,
      }));
    }

    try {
      await axiosInstance.post('/prod/client-product-share/block', payload);
      toast.success('Block status updated successfully!', { id: toastId });
      setSelectedIds([]);
      setSingleBlockId(null);
      fetchShares();
    } catch (err) {
      console.error(err);
      toast.error('Block operation failed', { id: toastId });
    }
  };

  // Unblock action (Single / Bulk)
  const handleUnblock = async (shareIds: number[]) => {
    const toastId = toast.loading(shareIds.length === 1 ? 'Unblocking product share...' : `Unblocking ${shareIds.length} product shares...`);
    const payload = shareIds.map((id) => ({
      clientShareId: id,
      clientId: client.id,
      block: false,
      reason: 'Unblocked',
    }));

    try {
      await axiosInstance.post('/prod/client-product-share/block', payload);
      toast.success(shareIds.length === 1 ? 'Product share unblocked successfully!' : 'Selected product shares unblocked successfully!', { id: toastId });
      setSelectedIds([]);
      fetchShares();
    } catch (err) {
      console.error(err);
      toast.error('Unblock operation failed', { id: toastId });
    }
  };

  // Initiate Delete Confirmation
  const handleDeleteInitiate = (type: 'single' | 'bulk', id?: number) => {
    setDeleteTarget(type);
    if (type === 'single' && id) {
      setSingleDeleteId(id);
    }
    setDeleteConfirmOpen(true);
  };

  // Confirm Delete Action
  const handleDeleteConfirm = async () => {
    setDeleteConfirmOpen(false);
    const idsToDelete = deleteTarget === 'single' && singleDeleteId !== null ? [singleDeleteId] : selectedIds;
    if (idsToDelete.length === 0) return;

    const toastId = toast.loading(idsToDelete.length === 1 ? 'Deactivating share...' : `Deactivating ${idsToDelete.length} shares...`);
    try {
      await Promise.all(idsToDelete.map((id) => axiosInstance.delete(`/prod/client-product-share/${id}`)));
      toast.success(idsToDelete.length === 1 ? 'Product Share deactivated successfully!' : 'Selected Product Shares deactivated successfully!', { id: toastId });
      setSelectedIds([]);
      setSingleDeleteId(null);
      fetchShares();
    } catch (err) {
      console.error(err);
      toast.error('Deactivation failed', { id: toastId });
    }
  };

  // Download Sample Excel Template from API
  const handleDownloadSample = async () => {
    const toastId = toast.loading('Downloading template...');
    try {
      const endpoint = uploadMode === 'add'
        ? '/prod/client-product-share/addition-template'
        : uploadMode === 'approve'
          ? '/prod/client-product-share/approve/template'
          : uploadMode === 'priceChange'
            ? '/prod/client-product-share/price-change/template'
            : '/prod/client-product-share/block/template';

      const response = await axiosInstance.get(endpoint, {
        responseType: 'blob',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const filename = uploadMode === 'add'
        ? `client_share_addition_template_${Date.now()}.xlsx`
        : uploadMode === 'approve'
          ? `client_share_approve_template_${Date.now()}.xlsx`
          : uploadMode === 'priceChange'
            ? `client_share_price_change_template_${Date.now()}.xlsx`
            : `client_share_block_template_${Date.now()}.xlsx`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Sample template downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download template', { id: toastId });
    }
  };

  // Upload Excel file to block / unblock / approve / add / priceChange
  const handleUploadExcel = async () => {
    if (!selectedFile) return;
    setUploadingExcel(true);
    const toastId = toast.loading('Uploading excel file...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    const endpoint = uploadMode === 'add'
      ? '/prod/client-product-share/upload'
      : uploadMode === 'approve'
        ? '/prod/client-product-share/approve/upload'
        : uploadMode === 'priceChange'
          ? '/prod/client-product-share/price-change/upload'
          : '/prod/client-product-share/block/upload';

    console.log(`--- POST ${endpoint} Request ---`);
    console.log('Endpoint:', endpoint);
    console.log('File Details:', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
    });

    try {
      const response = await axiosInstance.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/x-ndjson',
        },
      });

      console.log(`--- POST ${endpoint} Response ---`);
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Raw Data:', response.data);

      // Parse ndjson response
      const data = response.data;
      let parsedLines: any[] = [];
      if (typeof data === 'string') {
        const lines = data.split('\n').filter(Boolean);
        parsedLines = lines.map((l: string) => JSON.parse(l));
      } else {
        parsedLines = Array.isArray(data) ? data : [data];
      }

      console.log('Parsed Lines:', parsedLines);

      const successful = parsedLines.filter((x: any) => x.success);
      const failed = parsedLines.filter((x: any) => !x.success);

      if (successful.length > 0) {
        toast.success(`Successfully processed ${successful.length} shares!`, { id: toastId });
      }
      if (failed.length > 0) {
        toast.error(`Failed to process ${failed.length} rows.`, { id: toastId });
      }

      setSelectedFile(null);
      setShowUploadArea(false);
      if (uploadMode === 'priceChange') {
        fetchPriceHistory();
      } else {
        fetchShares();
      }
    } catch (err: any) {
      console.error(err);
      console.error(`--- POST ${endpoint} Error ---`);
      if (err.response) {
        console.error('Response Error Status:', err.response.status);
        console.error('Response Error Headers:', err.response.headers);
        console.error('Response Error Data:', err.response.data);
      } else {
        console.error('Network/Client Error:', err.message);
      }
      toast.error('Upload failed. Please check the Excel file content.', { id: toastId });
    } finally {
      setUploadingExcel(false);
    }
  };

  // Edit click
  const handleEditClick = (shareItem: any) => {
    setEditingShare(shareItem);
    setShareModalOpen(true);
  };

  // Create click
  const handleCreateClick = () => {
    setEditingShare(null);
    setShareModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Client Product Sharing</span>
            <span className="text-slate-350 dark:text-slate-650 text-xs">&gt;</span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">{client.clientName}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">
            {client.clientName} ({client.clientCode})
          </h1>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setMainTab('shared')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${mainTab === 'shared'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
        >
          <FileText size={14} />
          Shared Product Details
        </button>
        <button
          onClick={() => setMainTab('price')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${mainTab === 'price'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
        >
          <History size={14} />
          Price History
        </button>
      </div>

      {mainTab === 'shared' ? (
        <div className="space-y-4">

          {/* Sub tabs and top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            {/* Sub Tabs */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-850 rounded-xl space-x-1">
              {(['DRAFT', 'APPROVED', 'BLOCKED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setSubTab(tab);
                    setPage(0);
                  }}
                  className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-all ${subTab === tab
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Top Table Actions */}
            <div className="flex items-center gap-2.5">
              {/* Bulk Actions for Selected Rows */}
              {selectedIds.length > 0 && (
                <>
                  {subTab === 'DRAFT' && (
                    <button
                      onClick={handleBulkApprove}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-250 dark:border-emerald-900/50 shadow-sm transition-all"
                    >
                      <Check size={13} />
                      Approve Selected ({selectedIds.length})
                    </button>
                  )}

                  {(subTab === 'DRAFT' || subTab === 'APPROVED') && (
                    <button
                      onClick={() => handleBlockInitiate('bulk')}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl border border-amber-250 dark:border-amber-900/50 shadow-sm transition-all"
                    >
                      <Ban size={13} />
                      Block Selected ({selectedIds.length})
                    </button>
                  )}

                  {subTab === 'BLOCKED' && (
                    <button
                      onClick={() => handleUnblock(selectedIds)}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-250 dark:border-emerald-900/50 shadow-sm transition-all"
                    >
                      <Unlock size={13} />
                      Unblock Selected ({selectedIds.length})
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteInitiate('bulk')}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all"
                  >
                    <Trash2 size={13} />
                    Delete Selected ({selectedIds.length})
                  </button>
                </>
              )}

              {/* Excel Bulk Upload Actions (Always Visible based on tab) */}
              {(subTab === 'DRAFT' || subTab === 'APPROVED') && (
                <button
                  onClick={() => {
                    setUploadMode('block');
                    setShowUploadArea(!showUploadArea || uploadMode !== 'block');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${showUploadArea && uploadMode === 'block'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-250 dark:border-amber-900/50'
                    }`}
                >
                  <Upload size={13} />
                  Block
                </button>
              )}

              {subTab === 'BLOCKED' && (
                <button
                  onClick={() => {
                    setUploadMode('unblock');
                    setShowUploadArea(!showUploadArea || uploadMode !== 'unblock');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${showUploadArea && uploadMode === 'unblock'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/50'
                    }`}
                >
                  <Upload size={13} />
                  Unblock
                </button>
              )}

              {(subTab === 'DRAFT' || subTab === 'BLOCKED') && (
                <button
                  onClick={() => {
                    setUploadMode('approve');
                    setShowUploadArea(!showUploadArea || uploadMode !== 'approve');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${showUploadArea && uploadMode === 'approve'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-50 hover:bg-blue-105 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                    }`}
                >
                  <Upload size={13} />
                  Approve
                </button>
              )}

              {/* Bulk Upload Products Addition Template (Always Visible in all 3 tabs) */}
              <button
                onClick={() => {
                  setUploadMode('add');
                  setShowUploadArea(!showUploadArea || uploadMode !== 'add');
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${showUploadArea && uploadMode === 'add'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
                  }`}
              >
                <Upload size={13} />
                Upload
              </button>

              <button
                onClick={fetchShares}
                className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
                title="Refresh Table"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={handleCreateClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
              >
                <Plus size={14} />
                Share
              </button>
            </div>

          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Filter by SKU Code..."
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                className="w-full pl-3.5 pr-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Filter by Product Name..."
                value={productNameSearch}
                onChange={(e) => setProductNameSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                className="w-full pl-3.5 pr-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyFilter}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
              >
                Search
              </button>
              {(appliedSku || appliedProductName || skuSearch || productNameSearch) && (
                <button
                  onClick={handleClearFilter}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Upload Files Expandable Area */}
          {showUploadArea && (
            <div className="bg-slate-50 dark:bg-slate-950/10 border-2 border-dashed border-slate-205 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    {uploadMode === 'add'
                      ? 'Bulk Add Product Shares (Draft) via Excel Upload'
                      : uploadMode === 'approve'
                        ? 'Bulk Approve via Excel Upload'
                        : uploadMode === 'block'
                          ? 'Bulk Block via Excel Upload'
                          : uploadMode === 'priceChange'
                            ? 'Bulk Price Change via Excel Upload'
                            : 'Bulk Unblock via Excel Upload'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {uploadMode === 'add'
                      ? 'Download the sample addition template, fill in the product share details, and upload it below.'
                      : uploadMode === 'approve'
                        ? 'Download the sample Excel template, fill in the approval details, and upload it below.'
                        : uploadMode === 'priceChange'
                          ? 'Download the sample price change template, fill in the price change details, and upload it below.'
                          : 'Download the sample Excel template, fill in the block details, and upload it below.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUploadArea(false);
                    setSelectedFile(null);
                  }}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                <label className="flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/55 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 rounded-xl cursor-pointer transition-all p-4 group">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                      <FileText size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedFile ? (
                        <span className="text-blue-600 font-bold">{selectedFile.name}</span>
                      ) : (
                        <span>
                          Drag your file here or <span className="text-blue-600 hover:underline">Browse</span>
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">File format: .xls & .xlsx</p>
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
                    onClick={handleDownloadSample}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-755 transition-colors shadow-sm"
                  >
                    <Upload size={12} className="rotate-180" />
                    Download Sample Excel
                  </button>

                  {selectedFile && (
                    <button
                      onClick={handleUploadExcel}
                      disabled={uploadingExcel}
                      className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
                    >
                      {uploadingExcel ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      {uploadingExcel ? 'Uploading...' : 'Submit Upload'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            {loading && shares.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                <RefreshCw size={36} className="animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-medium">Fetching shared products...</p>
              </div>
            ) : shares.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
                <Inbox size={44} className="text-slate-350 dark:text-slate-750 mb-3" />
                <p className="text-sm font-semibold">No shared products in {subTab}</p>
                <p className="text-xs text-slate-500 mt-1">Start by clicking "Create Share" button.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25">
                      <th className="w-12 py-3 px-4 text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-950">
                        <button
                          type="button"
                          onClick={() => handleSelectAll(!isAllSelected)}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          {isAllSelected ? (
                            <CheckSquare size={16} className="text-blue-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </th>
                      <th className="w-40 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center sticky left-[48px] z-20 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">Actions</th>
                      <th className="w-16 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">S.No</th>
                      <th className="w-64 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product Name</th>
                      <th className="w-48 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">SKU</th>
                      <th className="w-40 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Price Type</th>
                      <th className="w-44 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Client SKU</th>
                      <th className="w-20 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">MinQty</th>
                      <th className="w-24 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">BufStock</th>
                      <th className="w-20 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">LTD</th>
                      <th className="w-28 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Selling</th>
                      <th className="w-28 py-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Transfer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                    {shares.map((shareItem, index) => {
                      const serialNumber = page * size + index + 1;
                      const isSelected = selectedIds.includes(shareItem.clientShareId);
                      return (
                        <tr
                          key={shareItem.clientShareId}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors group ${isSelected ? 'bg-blue-50/30 dark:bg-blue-950/5' : ''
                            }`}
                        >
                          <td className={`py-2.5 px-4 text-center sticky left-0 z-10 transition-colors ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-950'
                            : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50/60 dark:group-hover:bg-slate-800/60'
                            }`}>
                            <button
                              type="button"
                              onClick={() => handleSelectRow(shareItem.clientShareId, !isSelected)}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              {isSelected ? (
                                <CheckSquare size={16} className="text-blue-600" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>
                          <td className={`py-2.5 px-4 text-center sticky left-[48px] z-10 transition-colors border-r border-slate-200 dark:border-slate-800/80 ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-950'
                            : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50/60 dark:group-hover:bg-slate-800/60'
                            }`}>
                            <div className="flex items-center justify-center gap-1">
                              {subTab === 'DRAFT' && (
                                <button
                                  onClick={() => handleSingleApprove(shareItem.clientShareId)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all"
                                  title="Approve"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                              {(subTab === 'DRAFT' || subTab === 'APPROVED') && (
                                <button
                                  onClick={() => handleBlockInitiate('single', shareItem.clientShareId)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-950/30 transition-all"
                                  title="Block"
                                >
                                  <Slash size={14} />
                                </button>
                              )}
                              {subTab === 'BLOCKED' && (
                                <button
                                  onClick={() => handleUnblock([shareItem.clientShareId])}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all"
                                  title="Unblock"
                                >
                                  <Unlock size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditClick(shareItem)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteInitiate('single', shareItem.clientShareId)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-650 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-500 text-center">{serialNumber}</td>
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={productCache[shareItem.productId]}>
                            {productCache[shareItem.productId] || <span className="text-slate-400 animate-pulse">Resolving...</span>}
                          </td>
                          <td className="py-2.5 px-3 text-xs font-mono text-slate-650 dark:text-slate-400 truncate">
                            {skuCache[shareItem.skuId] || <span className="text-slate-400 animate-pulse">Resolving...</span>}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 truncate">
                            {priceTypeCache[shareItem.priceTypeId] || <span className="text-slate-400 animate-pulse">Resolving...</span>}
                          </td>
                          <td className="py-2.5 px-3 text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold truncate">
                            {shareItem.clientSkuCode}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 text-right font-medium">
                            {shareItem.minQty}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 text-right font-medium">
                            {shareItem.bufferStock}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 text-right font-medium">
                            {shareItem.leadTimeDays}d
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 text-right font-bold font-mono">
                            ₹{shareItem.sellingPrice?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 text-right font-bold font-mono">
                            ₹{shareItem.transferPrice?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && shares.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Rows per page:</span>
                  <select
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                  >
                    {[10, 20, 50].map((opt) => (
                      <option key={`share-size-opt-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 tabular-nums">Page {page + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                      className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Tab 2: Price History */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Price History
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Log of historic price transitions, transfer price modifications, and approvals.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setUploadMode('priceChange');
                  setShowUploadArea(!showUploadArea || uploadMode !== 'priceChange');
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${showUploadArea && uploadMode === 'priceChange'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
                  }`}
              >
                <Upload size={13} />
                Upload
              </button>
              <button
                onClick={() => {
                  setEditingPriceChange(null);
                  setPriceChangeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
              >
                <Plus size={14} />
                Create
              </button>
            </div>
          </div>

          {/* Upload Files Expandable Area for Price History */}
          {showUploadArea && uploadMode === 'priceChange' && (
            <div className="bg-slate-50 dark:bg-slate-950/10 border-2 border-dashed border-slate-205 dark:border-slate-800 rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Bulk Price Change via Excel Upload
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Download the sample price change template, fill in the price change details, and upload it below.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUploadArea(false);
                    setSelectedFile(null);
                  }}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                <label className="flex flex-col items-center justify-center w-full max-w-lg h-36 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/55 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 rounded-xl cursor-pointer transition-all p-4 group">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                      <FileText size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedFile ? (
                        <span className="text-blue-600 font-bold">{selectedFile.name}</span>
                      ) : (
                        <span>
                          Drag your file here or <span className="text-blue-600 hover:underline">Browse</span>
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">File format: .xls & .xlsx</p>
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

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleDownloadSample}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-250 dark:border-slate-700 text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <Upload size={12} className="rotate-180" />
                    Download Sample Excel
                  </button>

                  {selectedFile && (
                    <button
                      onClick={handleUploadExcel}
                      disabled={uploadingExcel}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-650 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      {uploadingExcel ? 'Uploading...' : 'Upload Excel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar for Price History */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Filter by SKU Code..."
                value={historySkuSearch}
                onChange={(e) => setHistorySkuSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyHistoryFilter()}
                className="w-full pl-3.5 pr-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Filter by Product Name..."
                value={historyProductNameSearch}
                onChange={(e) => setHistoryProductNameSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyHistoryFilter()}
                className="w-full pl-3.5 pr-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyHistoryFilter}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
              >
                Search
              </button>
              {(appliedHistorySku || appliedHistoryProductName || historySkuSearch || historyProductNameSearch) && (
                <button
                  onClick={handleClearHistoryFilter}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <span className="text-xs text-slate-500 font-medium">Loading Price History...</span>
              </div>
            ) : priceHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <History size={48} className="text-slate-350 dark:text-slate-700 mb-3" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Price Changes Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                  {(appliedHistorySku || appliedHistoryProductName) ? 'Try clearing or modifying your filter criteria.' : 'Create a price change or upload an excel sheet to log pricing updates.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-w-full">
                <table className="w-full min-w-[1200px] table-layout border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800/80">
                      <th className="py-3 px-4 text-center text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky left-0 z-20 bg-slate-50 dark:bg-slate-850 border-r border-slate-200 dark:border-slate-800">
                        Action
                      </th>
                      <th className="py-3 px-3 text-center text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        #
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        Product Name
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        Product SKU
                      </th>
                      <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        Old Selling Price
                      </th>
                      <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        New Selling Price
                      </th>
                      <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        Old Transfer Price
                      </th>
                      <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        New Transfer Price
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850">
                        Reason
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850 whitespace-nowrap">
                        Created At
                      </th>
                      <th className="py-3 px-3 text-center text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-850 whitespace-nowrap">
                        Created By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {priceHistory.map((item, index) => {
                      const serialNumber = historyPage * historySize + index + 1;
                      const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';
                      return (
                        <tr key={`history-${item.id}-${index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors group">
                          <td className="py-2.5 px-4 text-center sticky left-0 z-10 transition-colors border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 group-hover:bg-slate-50/60 dark:group-hover:bg-slate-800/60">
                            <button
                              onClick={() => {
                                setEditingPriceChange(item);
                                setPriceChangeModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-all"
                              title="Edit Price Change"
                            >
                              <Edit size={14} />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-500 text-center">{serialNumber}</td>
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={item.productName}>
                            {item.productName}
                          </td>
                          <td className="py-2.5 px-3 text-xs font-mono text-slate-650 dark:text-slate-400 truncate">
                            {item.productSku}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-500 text-right font-mono line-through">
                            ₹{item.oldSellingPrice?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-850 dark:text-slate-200 text-right font-bold font-mono">
                            ₹{item.newSellingPrice?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-500 text-right font-mono line-through">
                            ₹{item.oldTransferPrice?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-855 dark:text-slate-200 text-right font-bold font-mono">
                            ₹{item.newTransferPrice?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={item.changeReason}>
                            {item.changeReason}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-550 dark:text-slate-450 whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-550 dark:text-slate-450 text-center font-mono">
                            {item.createdBy || 'System'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!historyLoading && priceHistory.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Rows per page:</span>
                  <select
                    value={historySize}
                    onChange={(e) => {
                      setHistorySize(Number(e.target.value));
                      setHistoryPage(0);
                    }}
                    className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                  >
                    {[10, 20, 50].map((opt) => (
                      <option key={`history-size-opt-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 tabular-nums">Page {historyPage + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                      disabled={historyPage === 0}
                      className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setHistoryPage((p) => p + 1)}
                      disabled={!historyHasMore}
                      className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {shareModalOpen && (
        <ClientProductShareModal
          open={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setEditingShare(null);
          }}
          onSuccess={() => {
            fetchShares();
          }}
          share={editingShare}
          currentClientId={client.id}
          clientsList={clientsList}
        />
      )}

      {reasonModalOpen && (
        <ReasonModal
          open={reasonModalOpen}
          onClose={() => {
            setReasonModalOpen(false);
            setSingleBlockId(null);
          }}
          onSubmit={handleBlockSubmit}
        />
      )}

      {deleteConfirmOpen && (
        <ConfirmDeleteModal
          open={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setSingleDeleteId(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Confirmation"
          message={
            deleteTarget === 'single'
              ? 'Are you sure you want to delete/deactivate this client product share?'
              : `Are you sure you want to delete/deactivate the selected ${selectedIds.length} client product shares?`
          }
        />
      )}

      {priceChangeModalOpen && (
        <PriceChangeModal
          open={priceChangeModalOpen}
          onClose={() => {
            setPriceChangeModalOpen(false);
            setEditingPriceChange(null);
          }}
          onSuccess={() => {
            fetchPriceHistory();
            fetchShares();
            fetchAllClientShares();
          }}
          clientId={client.id}
          sharesList={allClientShares}
          productCache={productCache}
          skuCache={skuCache}
          editItem={editingPriceChange}
        />
      )}

    </div>
  );
}
