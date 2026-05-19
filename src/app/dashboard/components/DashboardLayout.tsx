'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import DashboardContent from './DashboardContent';

export default function DashboardLayout() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Route protection: redirect to login if not authenticated
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router?.replace('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <DashboardSidebar
        collapsed={!sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <DashboardTopbar
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
          onMobileMenu={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto scrollbar-thin px-4 md:px-6 xl:px-8 2xl:px-10 py-6 max-w-screen-2xl mx-auto w-full">
          <DashboardContent />
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}