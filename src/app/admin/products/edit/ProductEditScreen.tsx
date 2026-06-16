'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Eye, Send, CheckCircle2, AlertCircle,
  LayoutGrid, Bold, Italic, Link, List, ListOrdered, ImageIcon, Loader2,
} from 'lucide-react';
import ProductDataTabs, { defaultProductDataState, ProductDataState } from '../create/components/ProductDataTabs';
import { ProductImageBox, ProductGalleryBox, CategoriesBox, BrandBox, ProductTypeBox } from '../create/components/ProductSidebar';
import { Product } from '../list/data/mockProducts';

type Notif = { type: 'success' | 'error'; msg: string } | null;

const SECTION_NAV = [
  { id: 'identity', label: '01 — Identity', desc: 'Name & permalink' },
  { id: 'description', label: '02 — Description', desc: 'Long-form content' },
  { id: 'data', label: '03 — Product Data', desc: 'Pricing, stock…' },
  { id: 'summary', label: '04 — Summary', desc: 'Short description' },
];

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{index}</span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      <h2 className="text-sm text-slate-500 dark:text-slate-400">{title}</h2>
    </div>
  );
}

interface ProductEditScreenProps {
  product: Product;
}

export default function ProductEditScreen({ product }: ProductEditScreenProps) {
  const router = useRouter();
  const [title, setTitle] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [shortDesc, setShortDesc] = useState('');
  const [editorMode, setEditorMode] = useState<'visual' | 'text'>('visual');
  const [notif, setNotif] = useState<Notif>(null);
  const [activeSection, setActiveSection] = useState('identity');
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState('1');
  const [brandId, setBrandId] = useState('1');
  const [productTypeId, setProductTypeId] = useState('1');
  const [productData, setProductData] = useState<ProductDataState>({
    ...defaultProductDataState,
    mrp: String(product.mrp || ''),
    costPrice: String(product.unitPrice || ''),
    modelName: product.modelName || '',
    modelNumber: product.modelNumber || '',
    sku: product.sku || '',
    weight: product.weight?.replace(' kg', '') || '',
    productType: product.isCombo ? 'grouped' : 'simple',
  });

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const toSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const showNotif = (type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 3200);
  };

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  const handleSave = async () => {
    if (!title.trim()) {
      showNotif('error', 'Product name is required.');
      return;
    }
    setLoading(true);
    try {
      // Simulate save - in real implementation this would be a PUT/PATCH request
      await new Promise((r) => setTimeout(r, 1000));
      showNotif('success', 'Product updated successfully!');
      setTimeout(() => router.push('/admin/products/list'), 1500);
    } catch (err) {
      console.error(err);
      showNotif('error', 'Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/products/list')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <LayoutGrid size={14} />
            <span>Products</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-800 dark:text-white font-medium truncate max-w-[200px]">{product.sku}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {notif && (
              <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${
                notif.type === 'success' ?'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' :'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40'
              }`}>
                {notif.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {notif.msg}
              </div>
            )}
            <button type="button" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Eye size={14} /> Preview
            </button>
            <button type="button" onClick={() => router.push('/admin/products/list')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-8">
        <div className="flex gap-6">
          {/* Left section nav */}
          <aside className="w-52 flex-shrink-0 hidden xl:block">
            <div className="sticky top-[88px] space-y-1">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3 px-3">Sections</p>
              {SECTION_NAV.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                    activeSection === s.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' :'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* Section 1: Identity */}
            <section ref={(el) => { sectionRefs.current['identity'] = el; }} className="scroll-mt-20">
              <SectionHeader index="01" title="Identity" />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl p-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Product Name</label>
                    <span className="text-red-500 text-xs">*</span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a clear, descriptive product name…"
                    className="w-full bg-transparent border-none outline-none text-2xl text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium caret-indigo-600"
                  />
                  <div className="h-px bg-gradient-to-r from-indigo-500/60 via-indigo-300/20 to-transparent mt-2" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Permalink</label>
                  <div className="flex items-center gap-0 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                    <span className="px-3 py-2.5 text-sm text-slate-500 border-r border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800 whitespace-nowrap">
                      yourstore.com/product/
                    </span>
                    <span className="flex-1 px-3 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 font-mono truncate">
                      {toSlug(title) || 'product-slug'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Description */}
            <section ref={(el) => { sectionRefs.current['description'] = el; }} className="scroll-mt-20">
              <SectionHeader index="02" title="Long Description" />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-1 flex-wrap">
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 mr-2">
                    {(['visual', 'text'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditorMode(m)}
                        className={`px-3 py-1 text-xs capitalize transition-colors ${
                          editorMode === m
                            ? 'bg-indigo-600 text-white' :'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {[
                    { icon: <Bold size={13} />, title: 'Bold' },
                    { icon: <Italic size={13} />, title: 'Italic' },
                    { icon: <Link size={13} />, title: 'Link' },
                    { icon: <List size={13} />, title: 'Unordered list' },
                    { icon: <ListOrdered size={13} />, title: 'Ordered list' },
                    { icon: <ImageIcon size={13} />, title: 'Image' },
                  ].map(({ icon, title: t }) => (
                    <button
                      key={t}
                      type="button"
                      title={t}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      {icon}
                    </button>
                  ))}
                  <div className="ml-auto">
                    <span className="text-xs text-slate-400 font-mono">{wordCount} words</span>
                  </div>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a detailed product description…"
                  rows={10}
                  className="w-full p-5 bg-transparent focus:outline-none text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none leading-relaxed"
                />
              </div>
            </section>

            {/* Section 3: Product Data */}
            <section ref={(el) => { sectionRefs.current['data'] = el; }} className="scroll-mt-20">
              <SectionHeader index="03" title="Product Data" />
              <ProductDataTabs data={productData} onChange={setProductData} />
            </section>

            {/* Section 4: Short Description */}
            <section ref={(el) => { sectionRefs.current['summary'] = el; }} className="scroll-mt-20">
              <SectionHeader index="04" title="Short Description" />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A brief summary shown in product listings and search results. Keep it under 160 characters for best SEO.
                  </p>
                </div>
                <div className="relative">
                  <textarea
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value.slice(0, 320))}
                    placeholder="A punchy one-liner that sells the product at a glance…"
                    rows={4}
                    className="w-full p-5 bg-transparent focus:outline-none text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none leading-relaxed"
                  />
                  <span className={`absolute bottom-3 right-4 text-xs font-mono transition-colors ${
                    shortDesc.length > 260 ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                  }`}>
                    {shortDesc.length}/320
                  </span>
                </div>
              </div>
            </section>
          </main>

          {/* Right sidebar */}
          <aside className="w-72 flex-shrink-0 space-y-4">
            <div className="sticky top-[88px] space-y-4">
              <ProductImageBox />
              <ProductGalleryBox />
              <ProductTypeBox productTypeId={productTypeId} onProductTypeChange={setProductTypeId} />
              <CategoriesBox categoryId={categoryId} onCategoryChange={setCategoryId} />
              <BrandBox brandId={brandId} onBrandChange={setBrandId} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
