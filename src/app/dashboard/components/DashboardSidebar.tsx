'use client';
import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import LakeeeLogoMark from '@/components/auth/LakeeeLogoMark';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  active?: boolean;
}

const navItems: NavItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', active: true },
  { id: 'nav-transactions', label: 'Transactions', icon: ArrowLeftRight, href: '/dashboard', badge: 4 },
  { id: 'nav-wallet', label: 'Wallet', icon: Wallet, href: '/dashboard' },
  { id: 'nav-partners', label: 'Partners', icon: Users, href: '/dashboard', badge: 2 },
  { id: 'nav-reports', label: 'Reports', icon: BarChart3, href: '/dashboard' },
  { id: 'nav-compliance', label: 'Compliance', icon: ShieldCheck, href: '/dashboard' },
];

const bottomItems: NavItem[] = [
  { id: 'nav-notifications', label: 'Notifications', icon: Bell, href: '/dashboard', badge: 7 },
  { id: 'nav-settings', label: 'Settings', icon: Settings, href: '/dashboard' },
  { id: 'nav-help', label: 'Help & Support', icon: HelpCircle, href: '/dashboard' },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function DashboardSidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const sidebarWidth = collapsed ? 64 : 240;

  const SidebarInner = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-border ${collapsed ? 'justify-center px-0' : ''}`}>
        <LakeeeLogoMark size={collapsed ? 32 : 36} />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="text-base font-700 text-foreground whitespace-nowrap">
                LAKEE<span className="text-primary">E</span>
              </div>
              <div className="text-[10px] font-500 text-muted-foreground whitespace-nowrap">
                Redemption Partner
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav section */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2 space-y-1">
        {!collapsed && (
          <p className="text-[10px] font-600 text-muted-foreground/60 uppercase tracking-widest px-3 mb-2">
            Main Menu
          </p>
        )}
        {navItems.map((item) => (
          <NavItemRow key={item.id} item={item} collapsed={collapsed} />
        ))}

        <div className={`my-3 border-t border-border ${collapsed ? 'mx-2' : 'mx-1'}`} />

        {!collapsed && (
          <p className="text-[10px] font-600 text-muted-foreground/60 uppercase tracking-widest px-3 mb-2">
            Account
          </p>
        )}
        {bottomItems.map((item) => (
          <NavItemRow key={item.id} item={item} collapsed={collapsed} />
        ))}
      </div>

      {/* User section */}
      <div className={`border-t border-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors duration-150"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-700">RP</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-600 text-foreground truncate">Rajan Patel</p>
              <p className="text-xs text-muted-foreground truncate">+91 86677 57668</p>
            </div>
            <button
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="hidden md:block flex-shrink-0 h-screen sticky top-0"
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <SidebarInner />
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-40 w-60 md:hidden"
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <SidebarInner />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all duration-150 ${
        item.active
          ? 'sidebar-item-active' :'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      } ${collapsed ? 'justify-center px-0 w-10 mx-auto' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} className="flex-shrink-0" />

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            className="flex-1 truncate"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {!collapsed && item.badge && (
        <span className="ml-auto bg-primary/10 text-primary text-[10px] font-700 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {item.badge}
        </span>
      )}

      {collapsed && item.badge && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[9px] font-700 rounded-full flex items-center justify-center">
          {item.badge}
        </span>
      )}
    </Link>
  );
}