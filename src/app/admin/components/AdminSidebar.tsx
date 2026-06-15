'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, User, ChevronDown,
  LogOut, BarChart3, Briefcase, KeyRound
} from 'lucide-react';
import { mockMenuData } from '@/constants/menuData';
import LakeeeLogoMark from '@/components/auth/LakeeeLogoMark';
import { useAppDispatch } from '@/redux/hooks';
import { logout } from '@/redux/slices/authSlice';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  User,
  BarChart3,
  Briefcase,
  KeyRound,
};

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AdminSidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [expandedModules, setExpandedModules] = useState<string[]>(['DASH']);

  const toggleModule = (code: string) => {
    setExpandedModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('https://v2.lakeetech.com/auth/logout');
    } catch { /* proceed */ }
    dispatch(logout());
    toast.success('Logged out successfully');
    router.replace('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-700/60 ${collapsed ? 'justify-center' : ''}`}>
        <LakeeeLogoMark size={collapsed ? 30 : 34} />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="text-sm font-700 text-slate-800 dark:text-white whitespace-nowrap">
                LAKEE<span className="text-blue-600">E</span>
              </div>
              <div className="text-[10px] font-500 text-slate-400 whitespace-nowrap">Admin Portal</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-0.5">
        {mockMenuData.map((module) => {
          const IconComp = iconMap[module.icon || 'LayoutDashboard'] || LayoutDashboard;
          const isExpanded = expandedModules.includes(module.code);
          const hasActiveChild = module.screens.some((s) => pathname === s.href);

          return (
            <div key={module.code}>
              {/* Module header */}
              <button
                onClick={() => !collapsed && toggleModule(module.code)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 transition-all duration-150 ${
                  hasActiveChild
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? module.module : undefined}
              >
                <IconComp size={17} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      className="flex-1 text-left truncate"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {module.module}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              {/* Sub-menu */}
              <AnimatePresence>
                {!collapsed && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden ml-3 pl-3 border-l border-slate-100 dark:border-slate-700/60 mt-0.5 mb-1 space-y-0.5"
                  >
                    {module.screens.map((screen) => {
                      const isActive = pathname === screen.href;
                      return (
                        <Link
                          key={screen.code}
                          href={screen.href}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-600 transition-all duration-150 ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          {screen.title}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className={`border-t border-slate-100 dark:border-slate-700/60 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="hidden md:block flex-shrink-0 h-screen sticky top-0"
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <SidebarContent />
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
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
