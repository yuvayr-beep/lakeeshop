'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ProductViewScreen from './ProductViewScreen';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { Package } from 'lucide-react';

function ViewPageContent() {
  const searchParams = useSearchParams();
  const sku = searchParams?.get('sku') || '';

  return (
    <AdminLayout
      pageTitle="Product Details"
      pageSubtitle={sku ? `SKU: ${sku} · Overview, Stock & Specifications` : 'Product Details & Specifications'}
      pageIcon={<Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <ProductViewScreen sku={sku} />
    </AdminLayout>
  );
}

export default function ProductViewPage() {
  return (
    <Suspense fallback={
      <AdminLayout pageTitle="Product Details" pageSubtitle="Loading product specifications...">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-slate-400 dark:text-slate-500 animate-pulse text-sm">Loading screen configuration...</div>
        </div>
      </AdminLayout>
    }>
      <ViewPageContent />
    </Suspense>
  );
}
