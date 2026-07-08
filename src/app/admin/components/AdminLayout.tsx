'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import AdminFooter from './AdminFooter';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setTheme } from '@/redux/slices/themeSlice';
import { fetchUserProfile } from '@/redux/slices/userSlice';
import { clearSelectedClient } from '@/redux/slices/clientSlice';
import { clearSelectedSupplier } from '@/redux/slices/supplierSlice';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const selectedClientId = useAppSelector((state) => state.client.selectedClientId);
  const selectedSupplierId = useAppSelector((state) => state.supplier.selectedSupplierId);

  useEffect(() => {
    if (selectedClientId && pathname && !pathname.startsWith('/admin/clients')) {
      dispatch(clearSelectedClient());
    }
    if (selectedSupplierId && pathname && !pathname.startsWith('/admin/suppliers')) {
      dispatch(clearSelectedSupplier());
    }
  }, [pathname, selectedClientId, selectedSupplierId, dispatch]);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSidebar = localStorage.getItem('adminSidebarOpen');
      if (savedSidebar === 'true') {
        setSidebarOpen(true);
      }
      const savedMobileSidebar = localStorage.getItem('adminMobileSidebarOpen');
      if (savedMobileSidebar === 'true') {
        setMobileSidebarOpen(true);
      }
    }
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
    // Restore theme
    const savedTheme = localStorage.getItem('themeMode') as 'light' | 'dark' | null;
    if (savedTheme) {
      dispatch(setTheme(savedTheme));
    }
    // Fetch user profile
    const phone = localStorage.getItem('userPhone');
    if (phone) {
      dispatch(fetchUserProfile(phone));
    }
  }, [router, dispatch]);

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <AdminSidebar
        collapsed={!sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => handleToggleMobileSidebar(false)}
        onRequestOpen={() => handleToggleSidebar(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <AdminTopbar
          onToggleSidebar={() => handleToggleSidebar(!sidebarOpen)}
          onMobileMenu={() => handleToggleMobileSidebar(true)}
        />
        <main className="flex-1 overflow-auto scrollbar-thin px-4 md:px-6 xl:px-8 py-6 max-w-screen-2xl mx-auto w-full">
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
