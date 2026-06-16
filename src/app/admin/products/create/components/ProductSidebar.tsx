'use client';
import React, { useState, useRef } from 'react';
import { ImagePlus, X, Plus, Upload } from 'lucide-react';

function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{badge}</span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function ProductImageBox() {
  const [image, setImage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImage(URL.createObjectURL(file));
  };

  return (
    <Panel title="Product Image">
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {image ? (
        <div className="relative group rounded-lg overflow-hidden aspect-square">
          <img src={image} alt="Product" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">Change</button>
            <button type="button" onClick={() => setImage(null)} className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={`w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
            dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dragging ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <Upload size={20} className={dragging ? 'text-indigo-600' : 'text-slate-400'} />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Drop image here</p>
            <p className="text-xs text-slate-400 mt-0.5">or click to browse</p>
          </div>
        </button>
      )}
    </Panel>
  );
}

export function ProductGalleryBox() {
  const [images, setImages] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = Array.from(e.target.files || []).map((f) => URL.createObjectURL(f));
    setImages((p) => [...p, ...urls]);
  };

  return (
    <Panel title="Gallery" badge={images.length > 0 ? `${images.length}` : undefined}>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 h-9 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <ImagePlus size={14} /> Add images
      </button>
    </Panel>
  );
}

interface SidebarSelectBoxProps {
  title: string;
  items: { id: number; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  addTitle: string;
}

function SidebarSelectBox({ title, items, selected, onSelect, onAdd, addTitle }: SidebarSelectBoxProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
    setShowCreate(false);
  };

  return (
    <Panel title={title}>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 h-9 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 appearance-none"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 h-9 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">
          <Plus size={13} /> Add
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{addTitle}</span>
              <button type="button" onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full h-9 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200" />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={handleCreate} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function CategoriesBox({ categoryId, onCategoryChange }: { categoryId: string; onCategoryChange: (id: string) => void }) {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Mobiles' },
    { id: 3, name: 'Personal Care' },
    { id: 4, name: 'Home Care' },
    { id: 5, name: 'FMCG' },
    { id: 6, name: 'Pharma' },
  ]);

  return (
    <SidebarSelectBox
      title="Categories"
      items={categories}
      selected={categoryId}
      onSelect={onCategoryChange}
      onAdd={(name) => {
        const newCat = { id: Date.now(), name };
        setCategories((prev) => [...prev, newCat]);
        onCategoryChange(String(newCat.id));
      }}
      addTitle="Add Category"
    />
  );
}

export function BrandBox({ brandId, onBrandChange }: { brandId: string; onBrandChange: (id: string) => void }) {
  const [brands, setBrands] = useState([
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Samsung' },
    { id: 3, name: 'HUL' },
    { id: 4, name: 'Dabur' },
    { id: 5, name: 'ITC' },
  ]);

  return (
    <SidebarSelectBox
      title="Brand"
      items={brands}
      selected={brandId}
      onSelect={onBrandChange}
      onAdd={(name) => {
        const newBrand = { id: Date.now(), name };
        setBrands((prev) => [...prev, newBrand]);
        onBrandChange(String(newBrand.id));
      }}
      addTitle="Add Brand"
    />
  );
}

export function ProductTypeBox({ productTypeId, onProductTypeChange }: { productTypeId: string; onProductTypeChange: (id: string) => void }) {
  const [productTypes, setProductTypes] = useState([
    { id: 1, name: 'Simple Product' },
    { id: 2, name: 'Laptops' },
    { id: 3, name: 'Mobiles' },
    { id: 4, name: 'Accessories' },
    { id: 5, name: 'Combo' },
  ]);

  return (
    <SidebarSelectBox
      title="Product Type"
      items={productTypes}
      selected={productTypeId}
      onSelect={onProductTypeChange}
      onAdd={(name) => {
        const newType = { id: Date.now(), name };
        setProductTypes((prev) => [...prev, newType]);
        onProductTypeChange(String(newType.id));
      }}
      addTitle="Add Product Type"
    />
  );
}
