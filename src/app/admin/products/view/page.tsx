'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ProductViewScreen from './ProductViewScreen';
import AdminLayout from '@/app/admin/components/AdminLayout';

function ViewPageContent() {
  const searchParams = useSearchParams();
  const sku = searchParams?.get('sku') || '';

  return <ProductViewScreen sku={sku} />;
}

export default function ProductViewPage() {
  return (
    <AdminLayout>
      <Suspense fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-slate-400 dark:text-slate-500 animate-pulse text-sm">Loading screen configuration...</div>
        </div>
      }>
        <ViewPageContent />
      </Suspense>
    </AdminLayout>
  );
}
