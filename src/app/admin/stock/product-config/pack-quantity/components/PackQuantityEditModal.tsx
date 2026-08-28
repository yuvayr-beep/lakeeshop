'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Box, Package } from 'lucide-react';
import { Product } from '@/app/admin/products/list/data/mockProducts';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface PackQuantityEditModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedFields: { id: string; packQuantity: number }) => void;
}

const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === 'object') {
    if (raw && 'success' in raw && 'data' in raw) {
      return parseNdjson(raw.data);
    }
    return Array.isArray(raw) ? raw : [raw];
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      if ('success' in parsed && 'data' in parsed) {
        return parseNdjson(parsed.data);
      }
      return Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          const parsedLine = JSON.parse(line);
          if (parsedLine && typeof parsedLine === 'object' && 'success' in parsedLine && 'data' in parsedLine) {
            return parsedLine.data;
          }
          return parsedLine;
        } catch {
          return line;
        }
      });
  }
  return [trimmed];
};

const parseSingleProduct = (resData: any): any => {
  const parsed = parseNdjson(resData);
  return parsed.length > 0 ? parsed[0] : null;
};

export default function PackQuantityEditModal({
  product,
  open,
  onClose,
  onSuccess,
}: PackQuantityEditModalProps) {
  const [packQuantity, setPackQuantity] = useState<string>('1');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      setPackQuantity(
        product.packQuantity !== null && product.packQuantity !== undefined ? String(product.packQuantity) : '1'
      );
    }
  }, [product]);

  if (!open || !product) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Fetch original product details from API to maintain full payload integrity
      const response = await axiosInstance.get(`/prod/products/${product.id}`);
      const data = parseSingleProduct(response.data);
      if (!data) throw new Error('Could not fetch product details from server.');

      const parsedPackQty = packQuantity !== '' ? Math.max(1, Number(packQuantity)) : 1;

      // 2. Prepare payload
      const payload = {
        ...data,
        packQuantity: parsedPackQty,
      };

      // 3. Update product
      await axiosInstance.put(`/prod/products/${product.id}`, payload);

      toast.success(`Pack quantity updated for ${product.sku}`);
      onSuccess({
        id: product.id,
        packQuantity: parsedPackQty,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving pack quantity config:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update Pack Quantity config.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Box size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Product Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Edit Pack Quantity Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Details Header */}
        <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-700 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
              <Package size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{product.sku}</p>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={product.name}>
              {product.name}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Brand: {product.brand || '-'} | Type: {product.productTypeName || '-'}
            </p>
          </div>
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-5">
          {/* Pack Quantity Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Box size={14} className="text-blue-500" />
              Pack Quantity
            </label>
            <input
              type="number"
              min="1"
              placeholder="1"
              value={packQuantity}
              onChange={(e) => setPackQuantity(e.target.value)}
              className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Specify the number of units/pieces in a single product package.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={15} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
