'use client';
import React from 'react';
import { Edit2, FileText, Table, Mail, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Badge from '@/components/ui/Badge';

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
  emailStatus?: string;
  [key: string]: any;
}

interface POTableProps {
  orders: PurchaseOrder[];
  warehouses: Record<number, string>;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onEdit: (id: number) => void;
  onDownloadPdf: (order: PurchaseOrder) => void;
  onDownloadExcel: (order: PurchaseOrder) => void;
  onSendEmail: (order: PurchaseOrder) => void;
  onCancel: (order: PurchaseOrder) => void;
  onShowItems: (order: PurchaseOrder) => void;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (n: number) => void;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'danger' | 'info' }> = {
  DRAFT: { label: 'Draft', variant: 'muted' },
  OPEN: { label: 'Open', variant: 'info' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', variant: 'warning' },
  CLOSED: { label: 'Closed', variant: 'success' },
  PRECLOSED: { label: 'Preclosed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

const PER_PAGE_OPTIONS = [10, 20, 50];

export default function POTable({
  orders,
  warehouses,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDownloadPdf,
  onDownloadExcel,
  onSendEmail,
  onCancel,
  onShowItems,
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onPerPageChange,
}: POTableProps) {
  const allPageIds = orders.map((o) => o.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
  const someSelected = allPageIds.some((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !allPageIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...allPageIds])]);
    }
  };

  const toggleOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pageNumbers: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNumbers.push(i);
    if (page < totalPages - 2) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-left w-12">S.No</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-left">PO Number</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-left">PO Date</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-left">Warehouse</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-left">Supplier Name</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-left">SKU/QTY</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-center">Auto PO</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-center">Status</th>
              <th className="px-3 py-3 text-xs font-semibold text-black dark:text-slate-400 text-center w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                  No Purchase Orders found for the selected criteria.
                </td>
              </tr>
            ) : (
              orders.map((po, index) => {
                const isSelected = selectedIds.includes(po.id);
                const sNo = start + index;
                const statusInfo = statusConfig[po.status] || { label: po.status, variant: 'muted' };

                return (
                  <tr
                    key={po.id}
                    className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/10'
                        : index % 2 === 0
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        : 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(po.id)}
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{sNo}</td>
                    <td className="px-3 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                      {po.poNumber}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-350 whitespace-nowrap">
                      {po.poDate}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-350 truncate max-w-[150px]" title={warehouses[po.warehouseId] || `ID: ${po.warehouseId}`}>
                      {warehouses[po.warehouseId] || `Warehouse ${po.warehouseId}`}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                      {po.supplierName || `Supplier ${po.supplierId}`}
                    </td>
                    <td className="px-3 py-3 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                      <button
                        onClick={() => onShowItems(po)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-all hover:scale-105"
                        title="Click to view ordered items"
                      >
                        {po.totalSkus} / {po.totalSkuQty}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-center">
                      <Badge variant={po.isAuto ? 'success' : 'muted'} size="sm">
                        {po.isAuto ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(po.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit Purchase Order"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDownloadPdf(po)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors"
                          title="Download PDF"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          onClick={() => onDownloadExcel(po)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors"
                          title="Download Excel"
                        >
                          <Table size={14} />
                        </button>
                        <button
                          onClick={() => onSendEmail(po)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors"
                          title="Send Email"
                        >
                          <Mail size={14} />
                        </button>
                        {po.status !== 'CANCELLED' && (
                          <button
                            onClick={() => onCancel(po)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 transition-colors"
                            title="Cancel Purchase Order"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Showing {start}–{end} of {total} orders
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => onPerPageChange(Number(e.target.value))}
                className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-350"
              >
                {PER_PAGE_OPTIONS.map((opt) => (
                  <option key={`per-page-${opt}`} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((pn, idx) =>
              typeof pn === 'string' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-500 dark:text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={`page-${pn}`}
                  onClick={() => onPageChange(pn)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    pn === page
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {pn}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
