'use client';
import React from 'react';
import { X, Layers, Box, Package, ShieldCheck, Tag, BarChart2 } from 'lucide-react';
import { HierarchicalStockBreakdownDto } from '../list/components/ProductTable';

interface StockBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: HierarchicalStockBreakdownDto | null;
  productName?: string;
  productCode?: string;
  fallbackQty?: number;
}

export default function StockBreakdownModal({
  isOpen,
  onClose,
  breakdown,
  productName,
  productCode,
  fallbackQty = 0,
}: StockBreakdownModalProps) {
  if (!isOpen) return null;

  const role = breakdown?.relationRole || 'INDEPENDENT';
  const individualQty = breakdown ? breakdown.individualQty : fallbackQty;
  const totalQty = breakdown ? breakdown.totalQty : fallbackQty;
  const items = breakdown?.breakdown || [];
  const displayName = breakdown?.productName || productName || 'Product';
  const displayCode = breakdown?.productCode || productCode || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/50">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">Stock Breakdown</h3>
              <p className="text-xs text-slate-400">Live parent & child variation stock hierarchy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
          {/* Target Product Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white">{displayName}</span>
                {displayCode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {displayCode}
                  </span>
                )}
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                role === 'PARENT'
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : role === 'CHILD'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                Role: {role}
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1">
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Individual Qty</span>
              <p className="text-xl font-black text-slate-800 dark:text-white font-mono">{individualQty}</p>
              <span className="text-[10px] text-slate-400">Direct product stock</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Combined Qty</span>
              <p className="text-xl font-black text-slate-800 dark:text-white font-mono">{totalQty}</p>
              <span className="text-[10px] text-slate-400">Parent + All Variations</span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1">
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Hierarchy Items</span>
              <p className="text-xl font-black text-slate-800 dark:text-white font-mono">{items.length || 1}</p>
              <span className="text-[10px] text-slate-400">Total variants</span>
            </div>
          </div>

          {/* Breakdown Items List / Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Variation Breakdown List</span>
              <span className="text-[10px] font-normal text-slate-400">Real-time SSE updates</span>
            </h4>

            {items.length > 0 ? (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Product</th>
                      <th className="px-3.5 py-2.5">Role</th>
                      <th className="px-3.5 py-2.5 text-right">Available Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {items.map((it, idx) => (
                      <tr key={`item-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{it.productName || `Product #${it.productId}`}</span>
                            {it.productCode && <span className="text-[10px] font-mono text-slate-400">{it.productCode}</span>}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className={`px-1.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider ${
                            it.relationRole === 'PARENT'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}>
                            {it.relationRole || 'ITEM'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold">
                          <span className={it.availableQty === 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {it.availableQty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Single or Independent Product. No additional variation child items.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
