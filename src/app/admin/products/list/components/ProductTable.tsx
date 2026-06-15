'use client';
import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2, Eye, ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Product } from '../data/mockProducts';

interface ProductTableProps {
  products: Product[];
  allProducts: Product[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  sortCol: keyof Product;
  sortDir: 'asc' | 'desc';
  onSort: (col: keyof Product) => void;
  onEdit?: (p: Product) => void;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (n: number) => void;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'warning' },
  discontinued: { label: 'Discontinued', variant: 'muted' },
};

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: 'asc' | 'desc' }) {
  if (col !== sortCol) return <ArrowUpDown size={11} className="text-slate-400 ml-1" />;
  return sortDir === 'asc'
    ? <ArrowUp size={11} className="text-blue-600 ml-1" />
    : <ArrowDown size={11} className="text-blue-600 ml-1" />;
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

  if (!open) return null;

  const current = images[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
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
            className="max-w-full max-h-full object-contain"
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

export default function ProductTable({
  products, allProducts, selectedIds, onSelectionChange,
  sortCol, sortDir, onSort, onEdit,
  page, perPage, total, totalPages, onPageChange, onPerPageChange,
}: ProductTableProps) {
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

  const cols: { key: keyof Product; label: string; sortable?: boolean }[] = [
    { key: 'id', label: 'Image', sortable: false },
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'isCombo', label: 'Is Combo', sortable: false },
    { key: 'productTypeName', label: 'Product Type', sortable: true },
    { key: 'modelName', label: 'Model', sortable: true },
    { key: 'taxSlab', label: 'Tax', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

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
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                />
              </th>
              {cols.map((col) => (
                <th
                  key={`th-${col.key}-${col.label}`}
                  className={`px-3 py-3 text-xs font-600 text-slate-500 dark:text-slate-400 whitespace-nowrap text-left ${
                    col.sortable ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none' : ''
                  }`}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-xs font-600 text-slate-500 dark:text-slate-400 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <tr
                  key={p.id}
                  className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/10'
                      : i % 2 === 0
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' :'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(p.id)}
                      className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3">
                    {p.images && p.images.length > 0 ? (
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setImageModalOpen(true);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 overflow-hidden transition-colors"
                        title="View images"
                      >
                        <img src={p.images[0].url} alt={p.images[0].alt} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <ImageIcon size={14} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">{p.sku}</td>
                  <td className="px-3 py-3">
                    <div className="max-w-[180px]">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.uom} · HSN {p.hsnCode}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.category}</td>
                  <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.brand}</td>
                  <td className="px-3 py-3">
                    <Badge variant={p.isCombo ? 'success' : 'muted'} size="sm">
                      {p.isCombo ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.productTypeName}</td>
                  <td className="px-3 py-3">
                    <div className="max-w-[140px]">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{p.modelName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.modelNumber}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.taxSlab}</td>
                  <td className="px-3 py-3">
                    <Badge variant={statusConfig[p.status].variant} size="sm">
                      {statusConfig[p.status].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="hidden group-hover:flex items-center justify-center gap-1">
                      <button
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                        title="View product details"
                      >
                        <Eye size={13} />
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit product"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedProduct && (
        <ImageCarouselModal
          images={selectedProduct.images}
          productName={selectedProduct.name}
          open={imageModalOpen}
          onClose={() => { setImageModalOpen(false); setSelectedProduct(null); }}
        />
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Showing {start}–{end} of {total} products
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Per page:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
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
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          {pageNumbers.map((pn, idx) =>
            typeof pn === 'string' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
            ) : (
              <button
                key={`page-${pn}`}
                onClick={() => onPageChange(pn)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  pn === page
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {pn}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
