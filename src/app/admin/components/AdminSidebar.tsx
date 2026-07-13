'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, User, ChevronDown,
  LogOut, BarChart3, Briefcase, KeyRound, Users, Truck, X
} from 'lucide-react';
import { mockMenuData } from '@/constants/menuData';
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
  Users,
  Truck,
};

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onRequestOpen: () => void;
  isInitialized?: boolean;
}

export default function AdminSidebar({ collapsed, mobileOpen, onMobileClose, onRequestOpen, isInitialized = false }: SidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();

  // Find active module/screen on render to prevent flickering/closing animations
  const initialActive = React.useMemo(() => {
    const activeModule = mockMenuData.find((module) => {
      if (module.code === 'CLIENTS' && pathname?.startsWith('/admin/clients')) return true;
      if (module.code === 'SUPPLIERS' && pathname?.startsWith('/admin/suppliers')) return true;
      if (module.href && pathname?.startsWith(module.href)) return true;
      return module.screens.some((s) => {
        if (pathname === s.href) return true;
        if (s.subScreens?.some((sub) => pathname === sub.href)) return true;
        if (s.href && s.href !== '/' && pathname.startsWith(s.href.split('/').slice(0, 3).join('/'))) return true;
        return false;
      });
    });
    let activeModuleCode = 'DASH';
    let activeScreenCode: string | null = null;
    if (activeModule) {
      activeModuleCode = activeModule.code;
      const activeScreen = activeModule.screens.find((s) => {
        if (pathname === s.href) return true;
        if (s.subScreens?.some((sub) => pathname === sub.href)) return true;
        if (s.href && s.href !== '/' && pathname.startsWith(s.href.split('/').slice(0, 3).join('/'))) return true;
        return false;
      });
      if (activeScreen && activeScreen.subScreens) {
        activeScreenCode = activeScreen.code;
      }
    }
    return { moduleCode: activeModuleCode, screenCode: activeScreenCode };
  }, [pathname]);

  const [expandedModule, setExpandedModule] = useState<string | null>(initialActive.moduleCode);
  const [expandedScreen, setExpandedScreen] = useState<string | null>(initialActive.screenCode);

  const isCollapsed = collapsed && !mobileOpen;

  useEffect(() => {
    setExpandedModule(initialActive.moduleCode);
    setExpandedScreen(initialActive.screenCode);
  }, [initialActive]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleModule = (code: string) => {
    setExpandedModule((prev) => (prev === code ? null : code));
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
      <div className={`flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-700/60 ${isCollapsed ? 'justify-center' : ''}`}>
        <Image
          src={isCollapsed ? '/assets/images/small_logo.png' : '/assets/images/app_logo.png'}
          alt="LAKEEE Admin Portal"
          width={isCollapsed ? 32 : 160}
          height={isCollapsed ? 32 : 40}
          className={isCollapsed ? 'h-8 w-8 object-contain' : 'h-10 max-w-full object-contain'}
        />
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-0.5">
        {mockMenuData.map((module) => {
          const IconComp = iconMap[module.icon || 'LayoutDashboard'] || LayoutDashboard;
          const isExpanded = expandedModule === module.code;
          const hasActiveChild = 
            (module.code === 'CLIENTS' && pathname?.startsWith('/admin/clients')) ||
            (module.code === 'SUPPLIERS' && pathname?.startsWith('/admin/suppliers'))
              ? true
              : module.href
                ? pathname === module.href || pathname?.startsWith(module.href)
                : module.screens.some((s) => {
                    if (pathname === s.href) return true;
                    if (s.subScreens?.some((sub) => pathname === sub.href)) return true;
                    return false;
                  });

          const buttonClasses = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 transition-all duration-150 ${
            hasActiveChild
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-white'
          } ${isCollapsed ? 'justify-center' : ''}`;

          return (
            <div key={module.code}>
              {/* Module header */}
              {module.href ? (
                <Link
                  href={module.href}
                  onClick={() => {
                    if (isCollapsed) onRequestOpen();
                  }}
                  className={buttonClasses}
                  title={isCollapsed ? module.module : undefined}
                >
                  <IconComp size={17} className="flex-shrink-0" />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
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
                </Link>
              ) : (
                <button
                  onClick={() => isCollapsed ? onRequestOpen() : toggleModule(module.code)}
                  className={buttonClasses}
                  title={isCollapsed ? module.module : undefined}
                >
                  <IconComp size={17} className="flex-shrink-0" />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
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
                  {!isCollapsed && (
                    <ChevronDown
                      size={14}
                      className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
              )}

              {/* Sub-menu */}
              <AnimatePresence initial={false}>
                {!isCollapsed && isExpanded && module.screens.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden ml-3 pl-3 border-l border-slate-100 dark:border-slate-700/60 mt-0.5 mb-1 space-y-0.5"
                  >
                    {module.screens.map((screen) => {
                      if (screen.subScreens && screen.subScreens.length > 0) {
                        const isScreenExpanded = expandedScreen === screen.code;
                        const hasActiveSubChild = screen.subScreens.some((sub) => pathname === sub.href);

                        return (
                          <div key={screen.code} className="space-y-0.5" style={{ width: '100%' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedScreen((prev) => (prev === screen.code ? null : screen.code))}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-600 transition-all duration-150 ${
                                hasActiveSubChild
                                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasActiveSubChild ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                <span>{screen.title}</span>
                              </div>
                              <ChevronDown
                                size={12}
                                className={`flex-shrink-0 transition-transform duration-200 ${isScreenExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {isScreenExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15, ease: 'easeInOut' }}
                                  className="overflow-hidden ml-3 pl-3 border-l border-slate-100 dark:border-slate-800 mt-0.5 space-y-0.5"
                                >
                                  {screen.subScreens.map((subScreen) => {
                                    const isSubActive = pathname === subScreen.href;
                                    return (
                                      <Link
                                        key={subScreen.code}
                                        href={subScreen.href!}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 ${
                                          isSubActive
                                            ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white'
                                        }`}
                                      >
                                        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isSubActive ? 'bg-white' : 'bg-slate-350 dark:bg-slate-650'}`} />
                                        {subScreen.title}
                                      </Link>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      }

                      const isActive = pathname === screen.href;
                      return (
                        <Link
                          key={screen.code}
                          href={screen.href!}
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
      <div className={`border-t border-slate-100 dark:border-slate-700/60 p-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
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
        className="hidden md:block flex-shrink-0 h-screen sticky top-0 z-50"
        animate={{ width: collapsed ? 64 : 240 }}
        transition={isInitialized ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
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
