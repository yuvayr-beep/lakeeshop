'use client';
import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2, Eye, ChevronLeft, ChevronRight, X, Image as ImageIcon, Scale, Maximize2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Product } from '@/app/admin/products/list/data/mockProducts';

interface ProductMeasurementsTableProps {
  products: Product[];
  allProducts: Product[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  sortCol: keyof Product;
  sortDir: 'asc' | 'desc';
  onSort: (col: keyof Product) => void;
  onEdit: (product: Product) => void;
  onView?: (product: Product) => void;
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

function SortIcon({ col, sortCol, sortDir }: { col: keyof Product; sortCol: keyof Product; sortDir: 'asc' | 'desc' }) {
  if (col !== sortCol) return <ArrowUpDown size={12} className="opacity-40 text-slate-400" />;
  return sortDir === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />;
}

export default function ProductMeasurementsTable({
  products,
  allProducts,
  selectedIds,
  onSelectionChange,
  sortCol,
  sortDir,
  onSort,
  onEdit,
  onView,
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onPerPageChange,
}: ProductMeasurementsTableProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const allSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  const someSelected = products.some((p) => selectedIds.includes(p.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !products.some((p) => p.id === id)));
    } else {
      const pageIds = products.map((p) => p.id);
      onSelectionChange(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleOpenImage = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.images && p.images.length > 0) {
      setSelectedProduct(p);
      setImageModalOpen(true);
    }
  };

  const cols: { key: keyof Product; label: string; sortable?: boolean }[] = [
    { key: 'id', label: 'Image', sortable: false },
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'productTypeName', label: 'Product Type', sortable: true },
    { key: 'weightNum', label: 'Weight (kg)', sortable: true },
    { key: 'dimensions', label: 'Length × Width × Height (cm)', sortable: false },
  ];

  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
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
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[960px] text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
            <tr>
              <th className="px-3 py-3 w-12 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                S.No
              </th>
              {cols.map((col) => (
                <th
                  key={`th-${col.key}-${col.label}`}
                  className={`px-3 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-left ${
                    col.sortable ? 'cursor-pointer hover:text-black dark:hover:text-white select-none' : ''
                  }`}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const isSelected = selectedIds.includes(p.id);
              const firstImage = p.images && p.images.length > 0 ? p.images[0] : null;

              const displayWeight = p.weightNum !== null && p.weightNum !== undefined
                ? `${p.weightNum} kg`
                : (p.weight ? `${p.weight} kg` : '-');

              const hasLwh = p.length || p.width || p.height;
              const displayDimensions = hasLwh
                ? `${p.length || 0} × ${p.width || 0} × ${p.height || 0} cm`
                : (p.dimensions || '-');

              return (
                <tr
                  key={p.id}
                  className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-900/20'
                      : i % 2 === 0
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-slate-50/40 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                    {(page - 1) * perPage + i + 1}
                  </td>

                  {/* Image Column */}
                  <td className="px-3 py-3">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center group/img">
                      {firstImage ? (
                        <>
                          <img src={firstImage.url} alt={p.name} className="w-full h-full object-cover" />
                          {p.images && p.images.length > 1 && (
                            <button
                              onClick={(e) => handleOpenImage(p, e)}
                              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity"
                              title="View gallery"
                            >
                              <ImageIcon size={14} />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">No Img</span>
                      )}
                    </div>
                  </td>

                  {/* SKU Column */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" onClick={() => onView?.(p)}>
                      {p.sku}
                    </span>
                  </td>

                  {/* Product Name Column */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 max-w-[240px]">
                      {p.isCombo && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white flex-shrink-0" title="Combo Product">
                          COMBO
                        </span>
                      )}
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1" title={p.name}>
                        {p.name}
                      </p>
                    </div>
                  </td>

                  {/* Category Column */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                    {p.category || '-'}
                  </td>

                  {/* Brand Column */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">
                    {p.brand || '-'}
                  </td>

                  {/* Product Type Column */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                    {p.productTypeName || '-'}
                  </td>

                  {/* Weight Column */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Scale size={14} className="text-emerald-500 flex-shrink-0" />
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {displayWeight}
                      </span>
                    </div>
                  </td>

                  {/* Dimensions (Length x Width x Height) Column */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Maximize2 size={14} className="text-indigo-500 flex-shrink-0" />
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {displayDimensions}
                      </span>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {onView && (
                        <button
                          onClick={() => onView(p)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit Measurements"
                      >
                        <Edit2 size={14} />
                      </button>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            Showing {start}–{end} of {total} products
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 dark:text-slate-400">Per page:</span>
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
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400 transition-colors"
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
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {pn}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
