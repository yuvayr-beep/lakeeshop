'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ProductEditScreen from './ProductEditScreen';
import { mockProducts } from '../list/data/mockProducts';

function EditPageContent() {
  const searchParams = useSearchParams();
  const productId = searchParams?.get('id');
  const product = mockProducts?.find((p) => p?.id === productId);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg">Product not found</p>
          <a href="/admin/products/list" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">
            Back to Products
          </a>
        </div>
      </div>
    );
  }

  return <ProductEditScreen product={product} />;
}

export default function ProductEditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="text-slate-400">Loading…</div></div>}>
      <EditPageContent />
    </Suspense>
  );
}
