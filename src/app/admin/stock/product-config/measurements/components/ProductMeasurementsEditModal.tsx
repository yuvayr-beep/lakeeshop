'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Scale, Maximize2, Package } from 'lucide-react';
import { Product } from '@/app/admin/products/list/data/mockProducts';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface ProductMeasurementsEditModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedFields: {
    id: string;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
  }) => void;
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

export default function ProductMeasurementsEditModal({
  product,
  open,
  onClose,
  onSuccess,
}: ProductMeasurementsEditModalProps) {
  const [weight, setWeight] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      setWeight(
        product.weightNum !== null && product.weightNum !== undefined
          ? String(product.weightNum)
          : (product.weight || '')
      );
      setLength(
        product.length !== null && product.length !== undefined
          ? String(product.length)
          : ''
      );
      setWidth(
        product.width !== null && product.width !== undefined
          ? String(product.width)
          : ''
      );
      setHeight(
        product.height !== null && product.height !== undefined
          ? String(product.height)
          : ''
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

      const parsedWeight = weight.trim() !== '' ? Number(weight) : 0;
      const parsedLength = length.trim() !== '' ? Number(length) : 0;
      const parsedWidth = width.trim() !== '' ? Number(width) : 0;
      const parsedHeight = height.trim() !== '' ? Number(height) : 0;

      // 2. Prepare payload matching admin/products/edit
      const payload = {
        ...data,
        weight: parsedWeight,
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight,
        dimensions: {
          weight: parsedWeight,
          length: parsedLength,
          width: parsedWidth,
          height: parsedHeight,
        },
      };

      // 3. Update product
      await axiosInstance.put(`/prod/products/${product.id}`, payload);

      toast.success(`Measurements updated for ${product.sku}`);
      onSuccess({
        id: product.id,
        weight: parsedWeight,
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving product measurements:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update product measurements.';
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
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Product Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Edit Product Measurements (Weight & Dimensions)</p>
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
          {/* Weight Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Scale size={14} className="text-emerald-500" />
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
            />
          </div>

          {/* Dimensions Section (Length x Width x Height) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Maximize2 size={14} className="text-indigo-500" />
              Dimensions (Length × Width × Height in cm)
            </label>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Length (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Length"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Width (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Height (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Product physical dimensions used for packaging & shipping calculations.
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
