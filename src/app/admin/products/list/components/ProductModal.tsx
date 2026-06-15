'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Product, CATEGORIES, BRANDS, MANUFACTURERS, TAX_SLABS, SHIP_MODES } from '../data/mockProducts';

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

type ProductForm = {
  sku: string;
  name: string;
  category: string;
  brand: string;
  manufacturer: string;
  taxSlab: string;
  shipMode: string;
  unitPrice: number;
  mrp: number;
  stockQty: number;
  uom: string;
  hsnCode: string;
  status: 'active' | 'inactive' | 'discontinued';
  description?: string;
  weight?: string;
  dimensions?: string;
};

export default function ProductModal({ open, onClose, product }: ProductModalProps) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProductForm>({
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          category: product.category,
          brand: product.brand,
          manufacturer: product.manufacturer,
          taxSlab: product.taxSlab,
          shipMode: product.shipMode,
          unitPrice: product.unitPrice,
          mrp: product.mrp,
          stockQty: product.stockQty,
          uom: product.uom,
          hsnCode: product.hsnCode,
          status: product.status,
          description: product.description,
          weight: product.weight,
          dimensions: product.dimensions,
        }
      : {
          status: 'active',
          taxSlab: '18%',
          shipMode: 'Surface',
          category: '',
          brand: '',
          manufacturer: '',
          uom: 'Pkt',
        },
  });

  const onSubmit = async (data: ProductForm) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      reset();
      onClose();
    }, 800);
  };

  const handleClose = () => {
    if (isDirty && !saved) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return;
    }
    reset();
    onClose();
  };

  const inputClass = (hasError?: boolean) =>
    `w-full h-8 px-3 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'
    }`;

  const Field = ({
    label, required, helper, children,
  }: {
    label: string;
    required?: boolean;
    helper?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {helper && <p className="text-[10px] text-slate-400 mb-1">{helper}</p>}
      {children}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? `Edit Product — ${product?.sku}` : 'Add New Product'}
      subtitle={isEdit ? 'Update product details and inventory information' : 'Fill in all required fields to create a new product'}
      size="2xl"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            form="product-form"
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed min-w-[120px] justify-center"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>✓ Saved</>
            ) : (
              <>
                <Save size={13} />
                {isEdit ? 'Save Changes' : 'Create Product'}
              </>
            )}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Basic Info */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
            Basic Information
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" required helper="Unique stock-keeping unit identifier">
              <input className={inputClass(!!errors.sku)} placeholder="e.g. SKU-4821" {...register('sku', { required: 'SKU is required' })} />
              {errors.sku && <p className="mt-1 text-[10px] text-red-500">{errors.sku.message}</p>}
            </Field>
            <Field label="Product Name" required>
              <input className={inputClass(!!errors.name)} placeholder="e.g. Tata Salt 1kg" {...register('name', { required: 'Product name is required' })} />
              {errors.name && <p className="mt-1 text-[10px] text-red-500">{errors.name.message}</p>}
            </Field>
            <Field label="Category" required>
              <select className={inputClass(!!errors.category)} {...register('category', { required: 'Category is required' })}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={`cat-${c}`} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="mt-1 text-[10px] text-red-500">{errors.category.message}</p>}
            </Field>
            <Field label="Brand" required>
              <select className={inputClass(!!errors.brand)} {...register('brand', { required: 'Brand is required' })}>
                <option value="">Select brand</option>
                {BRANDS.map((b) => <option key={`brand-${b}`} value={b}>{b}</option>)}
              </select>
              {errors.brand && <p className="mt-1 text-[10px] text-red-500">{errors.brand.message}</p>}
            </Field>
            <Field label="Manufacturer" required>
              <select className={inputClass(!!errors.manufacturer)} {...register('manufacturer', { required: 'Manufacturer is required' })}>
                <option value="">Select manufacturer</option>
                {MANUFACTURERS.map((m) => <option key={`mfr-${m}`} value={m}>{m}</option>)}
              </select>
              {errors.manufacturer && <p className="mt-1 text-[10px] text-red-500">{errors.manufacturer.message}</p>}
            </Field>
            <Field label="Description">
              <textarea rows={2} className={`${inputClass()} h-auto py-1.5 resize-none`} placeholder="Brief product description" {...register('description')} />
            </Field>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
            Pricing & Tax
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit Price (₹)" required helper="Net price to distributor">
              <input type="number" step="0.01" min="0" className={inputClass(!!errors.unitPrice)} placeholder="0.00"
                {...register('unitPrice', { required: 'Unit price is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })} />
              {errors.unitPrice && <p className="mt-1 text-[10px] text-red-500">{errors.unitPrice.message}</p>}
            </Field>
            <Field label="MRP (₹)" required helper="Maximum retail price">
              <input type="number" step="0.01" min="0" className={inputClass(!!errors.mrp)} placeholder="0.00"
                {...register('mrp', { required: 'MRP is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })} />
              {errors.mrp && <p className="mt-1 text-[10px] text-red-500">{errors.mrp.message}</p>}
            </Field>
            <Field label="Tax Slab (GST)" required>
              <select className={inputClass(!!errors.taxSlab)} {...register('taxSlab', { required: 'Tax slab is required' })}>
                {TAX_SLABS.map((t) => <option key={`tax-${t}`} value={t}>{t}</option>)}
              </select>
              {errors.taxSlab && <p className="mt-1 text-[10px] text-red-500">{errors.taxSlab.message}</p>}
            </Field>
          </div>
        </div>

        {/* Inventory */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
            Inventory & Logistics
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Stock Quantity" required>
              <input type="number" min="0" className={inputClass(!!errors.stockQty)} placeholder="0"
                {...register('stockQty', { required: 'Stock qty is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })} />
              {errors.stockQty && <p className="mt-1 text-[10px] text-red-500">{errors.stockQty.message}</p>}
            </Field>
            <Field label="Unit of Measure" required helper="Pkt, Btl, Box, Jar, etc.">
              <input className={inputClass(!!errors.uom)} placeholder="Pkt" {...register('uom', { required: 'UOM is required' })} />
              {errors.uom && <p className="mt-1 text-[10px] text-red-500">{errors.uom.message}</p>}
            </Field>
            <Field label="HSN Code" helper="8-digit HSN classification">
              <input className={inputClass()} placeholder="e.g. 25010010" {...register('hsnCode')} />
            </Field>
            <Field label="Ship Mode" required>
              <select className={inputClass(!!errors.shipMode)} {...register('shipMode', { required: 'Ship mode is required' })}>
                {SHIP_MODES.map((s) => <option key={`ship-${s}`} value={s}>{s}</option>)}
              </select>
              {errors.shipMode && <p className="mt-1 text-[10px] text-red-500">{errors.shipMode.message}</p>}
            </Field>
            <Field label="Weight" helper="e.g. 1.05 kg">
              <input className={inputClass()} placeholder="1.05 kg" {...register('weight')} />
            </Field>
            <Field label="Dimensions" helper="L × W × H in cm">
              <input className={inputClass()} placeholder="10x6x4 cm" {...register('dimensions')} />
            </Field>
          </div>
        </div>

        {/* Status */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
            Product Status
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status" required>
              <select className={inputClass(!!errors.status)} {...register('status', { required: 'Status is required' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
              {errors.status && <p className="mt-1 text-[10px] text-red-500">{errors.status.message}</p>}
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}
