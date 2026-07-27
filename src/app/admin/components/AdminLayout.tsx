'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import AdminFooter from './AdminFooter';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { applyThemeToDom } from '@/redux/slices/themeSlice';
import { fetchUserProfile } from '@/redux/slices/userSlice';
import { clearSelectedClient } from '@/redux/slices/clientSlice';
import { clearSelectedSupplier } from '@/redux/slices/supplierSlice';
import { clearSelectedCourier } from '@/redux/slices/courierSlice';

interface AdminLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function AdminLayout({ children, fullWidth = true }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const selectedClientId = useAppSelector((state) => state.client.selectedClientId);
  const selectedSupplierId = useAppSelector((state) => state.supplier.selectedSupplierId);
  const selectedCourierId = useAppSelector((state) => state.courier.selectedCourierId);

  useEffect(() => {
    if (selectedClientId && pathname && !pathname.startsWith('/admin/clients')) {
      dispatch(clearSelectedClient());
    }
    if (selectedSupplierId && pathname && !pathname.startsWith('/admin/suppliers')) {
      dispatch(clearSelectedSupplier());
    }
    if (selectedCourierId && pathname && !pathname.startsWith('/admin/courier')) {
      dispatch(clearSelectedCourier());
    }
  }, [pathname, selectedClientId, selectedSupplierId, selectedCourierId, dispatch]);

  const themeMode = useAppSelector((s) => s.theme.mode);
  const themeColor = useAppSelector((s) => s.theme.color);
  const customHex = useAppSelector((s) => s.theme.customHex);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedSidebar = localStorage.getItem('adminSidebarOpen');
      if (savedSidebar === 'false') {
        setSidebarOpen(false);
      }
      const savedMobileSidebar = localStorage.getItem('adminMobileSidebarOpen');
      if (savedMobileSidebar === 'true') {
        setMobileSidebarOpen(true);
      }
    }
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleSidebar = (val: boolean) => {
    setSidebarOpen(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminSidebarOpen', String(val));
    }
  };

  const handleToggleMobileSidebar = (val: boolean) => {
    setMobileSidebarOpen(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminMobileSidebarOpen', String(val));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/');
      return;
    }
    // Restore user profile
    const phone = localStorage.getItem('userPhone');
    if (phone) {
      dispatch(fetchUserProfile(phone));
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        router.replace('/');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [router, dispatch]);

  useEffect(() => {
    applyThemeToDom(themeMode, themeColor, customHex);
  }, [themeMode, themeColor, customHex]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <AdminSidebar
        collapsed={!sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => handleToggleMobileSidebar(false)}
        onRequestOpen={() => handleToggleSidebar(true)}
        isInitialized={isInitialized}
      />

      <div className={`flex-1 flex flex-col min-w-0 ${isInitialized ? 'transition-all duration-300' : ''}`}>
        <AdminTopbar
          onToggleSidebar={() => handleToggleSidebar(!sidebarOpen)}
          onMobileMenu={() => handleToggleMobileSidebar(true)}
        />
        <main className={`flex-1 overflow-auto scrollbar-thin px-4 md:px-6 xl:px-8 py-6 w-full ${fullWidth ? '' : 'max-w-screen-2xl mx-auto'}`}>
          {children}
        </main>
        <AdminFooter />
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}
    </div>
  );
}
