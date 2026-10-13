'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Loader2, DollarSign, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { ProposedAveragePrice } from '@/types/proposedAveragePrice';

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

export default function ProposedAveragePricesClient() {
  const [items, setItems] = useState<ProposedAveragePrice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const fetchProposedPrices = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.get('/courier/actuals/proposed-average-prices', {
        headers: { Accept: 'application/json' },
      });

      const resData = response.data;
      let list: ProposedAveragePrice[] = [];

      if (Array.isArray(resData)) {
        list = resData;
      } else if (Array.isArray(resData?.data)) {
        list = resData.data;
      } else if (resData?.data && typeof resData.data === 'object') {
        list = [resData.data];
      }

      setItems(list);
    } catch (err: any) {
      console.error('Failed to fetch proposed average prices:', err);
      setError('Failed to load proposed average courier prices.');
      toast.error('Failed to load proposed average prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposedPrices();
  }, [fetchProposedPrices]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const start = items.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, items.length);
  const total = items.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Top Toolbar (Simple - Refresh Only) */}
      <div className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <DollarSign size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
              Proposed Average Courier Prices
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {total} calculated product price records
            </p>
          </div>
        </div>

        <button
          onClick={fetchProposedPrices}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm shrink-0"
          title="Refresh List"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Loading proposed average courier prices...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 px-4">
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchProposedPrices}
              className="mt-4 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Retry Load
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4">
            <DollarSign size={44} className="text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No Proposed Average Price Records Found</p>
            <p className="text-xs text-slate-500 mt-1">There are currently no proposed average price calculations available.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
                <tr className="border-b border-slate-150 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="w-16 py-3 px-4 text-center">#</th>
                  <th className="w-40 py-3 px-4">Product Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-right">Proposed Avg Price (₹)</th>
                  <th className="py-3 px-4 text-center">Reference Month</th>
                  <th className="py-3 px-4 text-center">Shipment Count</th>
                  <th className="py-3 px-4 text-center">Total Shipments (Month)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 text-xs font-medium">
                {paginated.map((item, idx) => {
                  const sno = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={item.productId || idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      {/* S.No */}
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{sno}</td>

                      {/* Product Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {item.productCode || '-'}
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.productName || '-'}
                      </td>

                      {/* Proposed Average Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{Number(item.proposedAverageCourierPrice || 0).toFixed(2)}
                      </td>

                      {/* Reference Month */}
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 inline-block">
                          {item.referenceMonth || '-'}
                        </span>
                      </td>

                      {/* Shipment Count */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.shipmentCount ?? 0}
                      </td>

                      {/* Total Shipments in Month */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        {item.totalShipmentsInMonth ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!loading && items.length > 0 && (
          <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{total}</strong> records
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none text-slate-700 dark:text-slate-300"
                >
                  {PER_PAGE_OPTIONS.map((opt) => (
                    <option key={`per-page-${opt}`} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
