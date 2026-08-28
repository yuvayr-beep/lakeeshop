'use client';
import React, { useState } from 'react';
import { Edit2, Eye, ChevronLeft, ChevronRight, X, Image as ImageIcon, Box } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Product } from '@/app/admin/products/list/data/mockProducts';

interface PackQuantityGridProps {
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
                  className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-colors ${
                    idx === currentIndex ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'
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

export default function PackQuantityGrid({
  products, selectedIds, onSelectionChange, onEdit, onView,
  page, perPage, total, totalPages, onPageChange, onPerPageChange,
}: PackQuantityGridProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const handleOpenImage = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.images && p.images.length > 0) {
      setSelectedProduct(p);
      setImageModalOpen(true);
    }
  };

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => {
          const selected = selectedIds.includes(p.id);
          const firstImage = p.images && p.images.length > 0 ? p.images[0] : null;

          return (
            <div
              key={p.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group ${
                selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Header Image & Badges */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800/60 mb-3 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  {firstImage ? (
                    <img src={firstImage.url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={32} className="text-slate-300 dark:text-slate-600" />
                  )}

                  {/* Combo Badge */}
                  {p.isCombo && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                      COMBO
                    </span>
                  )}

                  {/* Pack Quantity Badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm">
                    <Box size={11} />
                    Pack Qty: {p.packQuantity ?? 1}
                  </div>

                  {/* Gallery Button */}
                  {p.images && p.images.length > 0 && (
                    <button
                      onClick={(e) => handleOpenImage(p, e)}
                      className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 rounded text-[10px] flex items-center gap-1 backdrop-blur-sm transition-colors"
                      title="View all images"
                    >
                      <ImageIcon size={10} />
                      {p.images.length}
                    </button>
                  )}
                </div>

                {/* SKU & Category */}
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span
                    className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    onClick={() => onView && onView(p)}
                  >
                    {p.sku}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[110px]">{p.category || '-'}</span>
                </div>

                {/* Name */}
                <h4
                  className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mb-2 hover:text-blue-600 cursor-pointer"
                  title={p.name}
                  onClick={() => onView && onView(p)}
                >
                  {p.name}
                </h4>

                {/* Info Pills */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Brand:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.brand || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Product Type:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.productTypeName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Pack Quantity:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                      {p.packQuantity ?? 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                {onView && (
                  <button
                    onClick={() => onView(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="View details"
                  >
                    <Eye size={14} />
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(p)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Edit2 size={13} />
                    Edit Pack Qty
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span>Rows per page:</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-800 dark:text-slate-200"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="ml-2">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{total === 0 ? 0 : start}</span> to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{end}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
          >
            <ChevronLeft size={16} />
          </button>

          {pageNumbers.map((pNum, idx) =>
            typeof pNum === 'number' ? (
              <button
                key={pNum}
                onClick={() => onPageChange(pNum)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                  pNum === page
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {pNum}
              </button>
            ) : (
              <span key={`dots-${idx}`} className="px-1 text-slate-400">
                ...
              </span>
            )
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <ImageCarouselModal
        open={imageModalOpen}
        images={selectedProduct?.images || []}
        productName={selectedProduct?.name || ''}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
