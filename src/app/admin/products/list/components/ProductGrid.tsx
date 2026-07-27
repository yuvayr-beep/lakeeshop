'use client';
import React, { useState } from 'react';
import { Edit2, Eye, ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Product } from '../data/mockProducts';

interface ProductGridProps {
  products: Product[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit?: (p: Product) => void;
  onView?: (p: Product) => void;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (n: number) => void;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'danger' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  active: { label: 'Active', variant: 'success' },
  BLOCKED: { label: 'Blocked', variant: 'danger' },
  inactive: { label: 'Inactive', variant: 'warning' },
  TEMP_BLOCKED: { label: 'Temporary Blocked', variant: 'warning' },
  discontinued: { label: 'Discontinued', variant: 'muted' },
};

const offlineStatusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  ONLINE: { label: 'Online', variant: 'success' },
  OFFLINE: { label: 'Offline', variant: 'danger' },
  TEMP_OFFLINE: { label: 'Temporary Offline', variant: 'warning' },
};

const PER_PAGE_OPTIONS = [10, 20, 50];

interface ImageCarouselModalProps {
  images: Product['images'];
  productName: string;
  open: boolean;
  onClose: () => void;
}

function ImageCarouselModal({ images, productName, open, onClose }: ImageCarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!open || !images || images.length === 0) return null;

  const current = images[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate pr-4">{productName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden min-h-[280px] relative">
          <img
            src={current.url}
            alt={current.alt}
            className="max-w-full max-h-full object-contain p-4"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-2 p-2 rounded-full bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentIndex((i) => (i + 1) % images.length)}
                className="absolute right-2 p-2 rounded-full bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700/60">
            <p className="text-[10px] text-slate-400 text-center mb-2">{currentIndex + 1} of {images.length}</p>
            <div className="flex gap-2 justify-center overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={`thumb-${idx}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-colors ${idx === currentIndex ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductGrid({
  products, selectedIds, onSelectionChange, onEdit, onView,
  page, perPage, total, totalPages, onPageChange, onPerPageChange,
}: ProductGridProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const allPageIds = products.map((p) => p.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
  const someSelected = allPageIds.some((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !allPageIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...allPageIds])]);
    }
  };

  const toggleOne = (id: string) => {
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
      {/* Select All top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
            id="grid-select-all"
          />
          <label htmlFor="grid-select-all" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            Select all on this page
          </label>
        </div>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          {selectedIds.length} selected
        </span>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
        {products.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <div
              key={p.id}
              className={`group relative border rounded-xl overflow-hidden transition-all duration-200 flex flex-col ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Type Badge (Combo/Single) */}
              <div className="absolute top-2 left-2 z-10 flex gap-1">
                {p.isCombo ? (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-orange-600 text-white font-bold text-[9px] shadow-sm select-none" title="Combo Product">
                    Combo
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9px] shadow-sm select-none" title="Single Product">
                    Single
                  </span>
                )}
              </div>

              {/* Checkbox Overlay */}
              <div className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-slate-900/90 p-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700/60">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(p.id)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer block"
                />
              </div>

              {/* Image Container */}
              <div className="relative aspect-square bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-900 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-900/80 transition-colors">
                {p.images && p.images.length > 0 ? (
                  <img
                    src={p.images[0].url}
                    alt={p.images[0].alt}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedProduct(p);
                      setImageModalOpen(true);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon size={28} />
                    <span className="text-[10px] mt-1">No Image</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                    <span>{p.brand}</span>
                    <span>•</span>
                    <span className="truncate">{p.productTypeName}</span>
                  </div>

                  <h3
                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 line-clamp-2 h-8 leading-tight hover:text-blue-600 cursor-pointer"
                    title={p.name}
                    onClick={() => onView && onView(p)}
                  >
                    {p.name}
                  </h3>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate" title={p.sku}>
                      {p.sku}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[80px]" title={p.modelName || p.modelNumber}>
                      {p.modelName || p.modelNumber}
                    </span>
                  </div>

                  {/* Status badges */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(() => {
                      const statusCode = p.productStatusCode || (p.status === 'active' ? 'ACTIVE' : 'BLOCKED');
                      const statusInfo = statusConfig[statusCode] || { label: statusCode, variant: 'muted' };
                      return (
                        <Badge variant={statusInfo.variant} size="sm" className="text-[9px] py-0 px-1.5">
                          {statusInfo.label}
                        </Badge>
                      );
                    })()}
                    {(() => {
                      const offlineCode = p.offlineStatusCode || 'ONLINE';
                      const offlineInfo = offlineStatusConfig[offlineCode] || { label: offlineCode, variant: 'muted' };
                      return (
                        <Badge variant={offlineInfo.variant} size="sm" className="text-[9px] py-0 px-1.5">
                          {offlineInfo.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                {/* Prices */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-end justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none">MRP</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-none mt-1 block">
                      Tk {p.mrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none">Cost Price</span>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-none mt-1 block">
                      Tk {p.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons overlay or footer */}
              <div className="flex border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                <button
                  onClick={() => onView && onView(p)}
                  className="flex-1 py-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1 border-r border-slate-100 dark:border-slate-800/60 transition-colors"
                >
                  <Eye size={11} />
                  View
                </button>
                {onEdit && (
                  <button
                    onClick={() => onEdit(p)}
                    className="flex-1 py-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Edit2 size={11} />
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedProduct && (
        <ImageCarouselModal
          images={selectedProduct.images}
          productName={selectedProduct.name}
          open={imageModalOpen}
          onClose={() => { setImageModalOpen(false); setSelectedProduct(null); }}
        />
      )}

      {/* Pagination (identical to ProductTable) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
        <div className="flex items-center gap-3">
          <span className="text-xs text-black dark:text-slate-400 tabular-nums">
            Showing {start}–{end} of {total} products
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-black dark:text-slate-400">Per page:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-slate-300"
            >
              {PER_PAGE_OPTIONS.map((opt) => (
                <option key={`per-page-${opt}`} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          {pageNumbers.map((pn, idx) =>
            typeof pn === 'string' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-black dark:text-slate-400">…</span>
            ) : (
              <button
                key={`page-${pn}`}
                onClick={() => onPageChange(pn)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${pn === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-slate-400'
                  }`}
              >
                {pn}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-slate-400 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
