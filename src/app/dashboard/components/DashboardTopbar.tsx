'use client';
import React, { useState } from 'react';

import { Menu, PanelLeftClose, Search, Bell, ChevronDown, RefreshCw } from 'lucide-react';

interface TopbarProps {
  onToggleSidebar: () => void;
  onMobileMenu: () => void;
}

export default function DashboardTopbar({ onToggleSidebar, onMobileMenu }: TopbarProps) {
  const [lastUpdated] = useState('10:48 AM');

  return (
    <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-sm border-b border-border px-4 md:px-6 h-14 flex items-center gap-3">
      {/* Sidebar toggle — desktop */}
      <button
        onClick={onToggleSidebar}
        className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
        aria-label="Toggle sidebar"
      >
        <PanelLeftClose size={18} />
      </button>

      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenu}
        className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h2 className="text-sm font-600 text-foreground hidden sm:block">Overview</h2>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Partner Dashboard · Last updated {lastUpdated}
        </p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors duration-150">
          <RefreshCw size={12} />
          Refresh
        </button>

        {/* Search */}
        <button className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150">
          <Search size={16} />
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-muted transition-colors duration-150">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white text-[10px] font-700">RP</span>
          </div>
          <span className="hidden sm:block text-sm font-500 text-foreground">Rajan Patel</span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}