'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Eye, Send, CheckCircle2, AlertCircle,
  LayoutGrid, Bold, Italic, Link, List, ListOrdered, ImageIcon, Loader2, Code,
} from 'lucide-react';
import ProductDataTabs, { defaultProductDataState, ProductDataState } from '../create/components/ProductDataTabs';
import { ProductImageBox, ProductGalleryBox, CategoriesBox, BrandBox, ProductTypeBox } from '../create/components/ProductSidebar';
import axiosInstance from '@/lib/axios';

type Notif = { type: 'success' | 'error'; msg: string } | null;

const SECTION_NAV = [
  { id: 'identity', label: '01 — Identity', desc: 'Name & permalink' },
  { id: 'description', label: '02 — Description', desc: 'Long-form content' },
  { id: 'data', label: '03 — Product Data', desc: 'Pricing, stock…' },
  { id: 'summary', label: '04 — Summary', desc: 'Short description' },
];

const stripHtml = (html: string) => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
};

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
  productId: string;
}

export default function ProductEditScreen({ productId }: ProductEditScreenProps) {
  const router = useRouter();
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plainText, setPlainText] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [notif, setNotif] = useState<Notif>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState('identity');
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState('1');
  const [brandId, setBrandId] = useState('1');
  const [productTypeId, setProductTypeId] = useState('1');
  const [productData, setProductData] = useState<ProductDataState>(defaultProductDataState);
  const [originalProduct, setOriginalProduct] = useState<any>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

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

  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (editorMode === 'visual' && editorRef.current) {
      if (editorRef.current.innerHTML !== description) {
        editorRef.current.innerHTML = description;
      }
    }
  }, [editorMode, description]);

  const handleVisualInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setDescription(html);
    setPlainText(e.currentTarget.innerText || '');
  };

  const executeCommand = (command: string, value: string = '') => {
    if (editorMode !== 'visual') return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setDescription(html);
      setPlainText(editorRef.current.innerText || '');
    }
  };

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      setLoadingProduct(true);
      try {
        const response = await axiosInstance.get(`/prod/products/${productId}`);
        const data = response.data;
        setOriginalProduct(data);
        
        setTitle(data.baseProductName || '');
        const htmlVal = data.longDescriptionHtml || data.longDescription || '';
        setDescription(htmlVal);
        setPlainText(data.longDescription || stripHtml(htmlVal));
        setShortDesc(data.shortDescription || '');
        setCategoryId(String(data.categoryId || '1'));
        setBrandId(String(data.brandId || '1'));
        setProductTypeId(String(data.productTypeId || '1'));
        
        if (data.images && data.images.length > 0) {
          const sorted = [...data.images].sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));
          setMainImage(sorted[0].url || null);
          setGalleryImages(sorted.slice(1).map((img: any) => img.url));
        } else {
          setMainImage(null);
          setGalleryImages([]);
        }

        // Fetch component product names if it is a combo
        let comboProductsList: any[] = [];
        if (data.comboItems && data.comboItems.length > 0) {
          comboProductsList = await Promise.all(
            data.comboItems.map(async (item: any) => {
              try {
                const compRes = await axiosInstance.get(`/prod/products/${item.componentProductId}`);
                return {
                  componentProductId: item.componentProductId,
                  quantity: item.quantity,
                  name: compRes.data.baseProductName || `Product #${item.componentProductId}`
                };
              } catch (err) {
                console.error(`Failed to fetch component product ${item.componentProductId}:`, err);
                return {
                  componentProductId: item.componentProductId,
                  quantity: item.quantity,
                  name: `Product #${item.componentProductId}`
                };
              }
            })
          );
        }

        setProductData({
          mrp: String(data.mrp || ''),
          costPrice: String(data.costPrice || ''),
          defaultCourierPrice: data.defaultCourierPrice !== null && data.defaultCourierPrice !== undefined ? String(data.defaultCourierPrice) : '',
          saleSchedule: false,
          saleFrom: '',
          saleTo: '',
          modelName: data.modelName || '',
          modelNumber: data.modelNumber || '',
          selectedHsn: String(data.hsnId || '1'),
          eanCode: data.eanCode || '',
          sku: data.defaultSku || '',
          manageStock: false,
          stockQty: '',
          allowBackorders: 'no',
          lowStockThreshold: '',
          stockStatus: 'instock',
          soldIndividually: false,
          weight: String(data.weight || ''),
          length: String(data.length || ''),
          width: String(data.width || ''),
          height: String(data.height || ''),
          shippingClass: '',
          preferredShipmentMode: data.preferredShipmentMode || 'DP',
          upsells: '',
          crossSells: '',
          variant: data.variant || '',
          size: data.size || '',
          capacity: data.capacity || '',
          packQuantity: String(data.packQuantity || '1'),
          gender: data.gender || '',
          materialCode: data.materialCode || '',
          colorCode: data.colorCode || '',
          patternFinishCode: data.patternFinishCode || '',
          editionCode: data.editionCode || '',
          selectedWarranty: data.warrantyCode || 'WAR1',
          selectedHandling: data.handlingCode || 'HHH',
          isSplit: data.isSplit || false,
          splitQuantity: String(data.splitQuantity || ''),
          surfaceQuantity: String(data.surfaceQuantity || '1'),
          comboProducts: comboProductsList,
          productType: data.isCombo ? 'grouped' : 'simple',
          externalProduct: data.isExternal || false,
        });
      } catch (err) {
        console.error('Error fetching product:', err);
        showNotif('error', 'Failed to load product details.');
      } finally {
        setLoadingProduct(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleSave = async () => {
    if (!title.trim()) {
      showNotif('error', 'Product name is required.');
      return;
    }
    setLoading(true);
    let payload: any = null;
    try {
      const imagesPayload = [];
      if (mainImage) {
        imagesPayload.push({
          alt: 'Front view',
          url: mainImage,
          priority: 1,
        });
      }
      galleryImages.forEach((url, i) => {
        imagesPayload.push({
          alt: `Gallery view ${i + 1}`,
          url,
          priority: i + 2,
        });
      });

      payload = {
        baseProductName: title,
        defaultSku: productData.sku,
        eanCode: productData.eanCode || null,
        categoryId: Number(categoryId),
        brandId: Number(brandId),
        productTypeId: Number(productTypeId),
        modelName: productData.modelName,
        modelNumber: productData.modelNumber,
        variant: productData.variant,
        size: productData.size,
        capacity: productData.capacity,
        packQuantity: productData.packQuantity ? Number(productData.packQuantity) : 1,
        colorCode: productData.colorCode,
        materialCode: productData.materialCode,
        gender: productData.gender,
        patternFinishCode: productData.patternFinishCode,
        editionCode: productData.editionCode,
        warrantyCode: productData.selectedWarranty,
        mrp: productData.mrp ? Number(productData.mrp) : 0,
        hsnId: Number(productData.selectedHsn),
        costPrice: productData.costPrice ? Number(productData.costPrice) : 0,
        defaultCourierPrice: productData.defaultCourierPrice ? Number(productData.defaultCourierPrice) : null,
        isCombo: productData.productType === 'grouped',
        shortDescription: shortDesc,
        longDescription: plainText,
        longDescriptionHtml: description,
        images: imagesPayload,
        dimensions: {
          length: productData.length ? Number(productData.length) : 0,
          width: productData.width ? Number(productData.width) : 0,
          height: productData.height ? Number(productData.height) : 0,
          weight: productData.weight ? Number(productData.weight) : 0,
        },
        length: productData.length ? Number(productData.length) : 0,
        width: productData.width ? Number(productData.width) : 0,
        height: productData.height ? Number(productData.height) : 0,
        weight: productData.weight ? Number(productData.weight) : 0,
        preferredShipmentMode: productData.preferredShipmentMode,
        handlingCode: productData.selectedHandling,
        isSplit: productData.isSplit,
        splitQuantity: productData.splitQuantity ? Number(productData.splitQuantity) : null,
        surfaceQuantity: productData.surfaceQuantity ? Number(productData.surfaceQuantity) : 1,
        isExternal: !!productData.externalProduct,
        comboItems: productData.productType === 'grouped' ? productData.comboProducts.map((c) => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
        })) : [],
      };

      await axiosInstance.put(`/prod/products/${productId}`, payload);
      showNotif('success', 'Product updated successfully!');
      setTimeout(() => router.push('/admin/products/list'), 1500);
    } catch (err: any) {
      console.error('API Error details:', err);
      console.log('Request Payload:', payload);
      if (err.response) {
        console.log('Response Status:', err.response.status);
        console.log('Response Data:', err.response.data);
      }
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update product. Please try again.';
      showNotif('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading product details...</p>
      </div>
    );
  }

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
            <span className="text-slate-800 dark:text-white font-medium truncate max-w-[200px]">{productData.sku || 'Product Details'}</span>
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
            <a
              href={`/admin/products/view?sku=${productData.sku}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Eye size={14} /> Preview
            </a>
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
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 mr-2 bg-slate-100 dark:bg-slate-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditorMode('visual')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        editorMode === 'visual'
                          ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('html')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                        editorMode === 'html'
                          ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Code size={12} />
                      HTML
                    </button>
                  </div>
                  {[
                    { icon: <Bold size={13} />, title: 'Bold', action: () => executeCommand('bold') },
                    { icon: <Italic size={13} />, title: 'Italic', action: () => executeCommand('italic') },
                    { icon: <Link size={13} />, title: 'Link', action: () => {
                      const url = prompt('Enter link URL:');
                      if (url) executeCommand('createLink', url);
                    }},
                    { icon: <List size={13} />, title: 'Unordered list', action: () => executeCommand('insertUnorderedList') },
                    { icon: <ListOrdered size={13} />, title: 'Ordered list', action: () => executeCommand('insertOrderedList') },
                    { icon: <ImageIcon size={13} />, title: 'Image', action: () => {
                      const url = prompt('Enter image URL:');
                      if (url) executeCommand('insertImage', url);
                    }},
                  ].map(({ icon, title: t, action }) => (
                    <button
                      key={t}
                      type="button"
                      title={t}
                      onClick={action}
                      disabled={editorMode !== 'visual'}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        editorMode === 'visual'
                          ? 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                          : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                  <div className="ml-auto">
                    <span className="text-xs text-slate-400 font-mono">{wordCount} words</span>
                  </div>
                </div>
                {editorMode === 'visual' ? (
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleVisualInput}
                    placeholder="Write a detailed product description in visual mode…"
                    className="w-full min-h-[250px] p-5 focus:outline-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto bg-white dark:bg-slate-900 border-none prose dark:prose-invert max-w-none focus:ring-0"
                    style={{ outline: 'none' }}
                  />
                ) : (
                  <textarea
                    value={description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDescription(val);
                      setPlainText(stripHtml(val));
                    }}
                    placeholder="Write HTML markup directly in this editor…"
                    rows={10}
                    className="w-full p-5 bg-transparent focus:outline-none text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none leading-relaxed font-mono"
                  />
                )}
              </div>
            </section>

            {/* Section 3: Product Data */}
            <section ref={(el) => { sectionRefs.current['data'] = el; }} className="scroll-mt-20">
              <SectionHeader index="03" title="Product Data" />
              <ProductDataTabs data={productData} onChange={setProductData} hideLinkedProducts={true} />
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
              <CategoriesBox categoryId={categoryId} onCategoryChange={setCategoryId} />
              <ProductImageBox image={mainImage} onChange={setMainImage} />
              <ProductGalleryBox images={galleryImages} onChange={setGalleryImages} />
              <ProductTypeBox productTypeId={productTypeId} onProductTypeChange={setProductTypeId} />
              <BrandBox brandId={brandId} onBrandChange={setBrandId} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
