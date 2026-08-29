'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Marquee from 'react-fast-marquee';
import {
  Bell, Ticket, Sun, Moon, ChevronDown, User, KeyRound, LogOut, Lock,
  Menu, AlertTriangle, Package, Truck, Clock, TrendingDown, Palette, Sliders,
  AlertCircle, ShieldAlert, RefreshCw, Radio, Warehouse
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { logout, lockSession } from '@/redux/slices/authSlice';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import LakeeeLogoMark from '@/components/auth/LakeeeLogoMark';
import ThemeSettingsDrawer from './ThemeSettingsDrawer';
import { useHeaderAggregates } from '@/hooks/useHeaderAggregates';

interface AdminTopbarProps {
  onToggleSidebar: () => void;
  onMobileMenu: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
  pageIcon?: React.ReactNode;
  headerAction?: React.ReactNode;
}

interface HeaderAggregatesData {
  totalPendingStockAssign?: number;
  criticalStockAssign?: number;
  escalatedStockAssign?: number;
  pendingCourierAssign?: number;
  pendingOutscan?: number;
  pendingOutscanStockAvailable?: number;
  pendingDelivery?: number;
  awbGenerationFailures?: number;
  activeHolds?: number;
  failedTallySyncs?: number;
  lastComputedAt?: string;
}

export default function AdminTopbar({
  onToggleSidebar,
  onMobileMenu,
  pageTitle,
  pageSubtitle,
  pageIcon,
  headerAction,
}: AdminTopbarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userProfile = useAppSelector((s) => s.user.profile);

  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Realtime SSE Header Aggregates Hook
  const { headerAggregates: sseData, isConnected: sseConnected } = useHeaderAggregates('https://v2.lakeetech.com');

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotif = localStorage.getItem('adminNotifOpen');
      if (savedNotif === 'true') {
        setNotifOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggleNotif = () => {
    setNotifOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminNotifOpen', String(next));
      }
      return next;
    });
    setProfileOpen(false);
  };

  // Map SSE Header Aggregates response to notification list items with light pastel background color palettes
  const notificationItems = useMemo(() => {
    const raw = sseData || {};
    return [
      {
        id: 'totalPendingStockAssign',
        shortLabel: 'Pend Stk Alloc',
        label: 'Pending Stock Allocation',
        count: raw.totalPendingStockAssign ?? 0,
        icon: Package,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/60',
        cardBg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/60 hover:bg-amber-100',
        textColor: 'text-amber-900 dark:text-amber-100',
        href: '/admin/orders/list',
      },
      {
        id: 'criticalStockAssign',
        shortLabel: 'Crit Stk (>3d)',
        label: 'Critical Stock (>3 Days)',
        count: raw.criticalStockAssign ?? 0,
        icon: AlertTriangle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/60',
        cardBg: 'bg-red-50/90 dark:bg-red-950/40 border-red-200/90 dark:border-red-800/60 hover:bg-red-100',
        textColor: 'text-red-900 dark:text-red-100',
        href: '/admin/orders/list',
      },
      {
        id: 'escalatedStockAssign',
        shortLabel: 'Esc Stk (>6d)',
        label: 'Escalated Stock (>6 Days)',
        count: raw.escalatedStockAssign ?? 0,
        icon: TrendingDown,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-100 dark:bg-rose-900/60',
        cardBg: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/90 dark:border-rose-800/60 hover:bg-rose-100',
        textColor: 'text-rose-900 dark:text-rose-100',
        href: '/admin/orders/list',
      },
      {
        id: 'pendingCourierAssign',
        shortLabel: 'Pend Courier',
        label: 'Pending Courier Allocation',
        count: raw.pendingCourierAssign ?? 0,
        icon: Truck,
        color: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-100 dark:bg-sky-900/60',
        cardBg: 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-200/90 dark:border-sky-800/60 hover:bg-sky-100',
        textColor: 'text-sky-900 dark:text-sky-100',
        href: '/admin/orders/courier-assignment',
      },
      {
        id: 'pendingOutscan',
        shortLabel: 'Pend Outscan',
        label: 'Pending Warehouse Outscan',
        count: raw.pendingOutscan ?? 0,
        icon: Warehouse,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-100 dark:bg-violet-900/60',
        cardBg: 'bg-violet-50/90 dark:bg-violet-950/40 border-violet-200/90 dark:border-violet-800/60 hover:bg-violet-100',
        textColor: 'text-violet-900 dark:text-violet-100',
        href: '/admin/orders/list',
      },
      {
        id: 'pendingOutscanStockAvailable',
        shortLabel: 'Prior Outscan',
        label: 'Pending Outscan (Prior Stock)',
        count: raw.pendingOutscanStockAvailable ?? 0,
        icon: Package,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-100 dark:bg-indigo-900/60',
        cardBg: 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200/90 dark:border-indigo-800/60 hover:bg-indigo-100',
        textColor: 'text-indigo-900 dark:text-indigo-100',
        href: '/admin/orders/list',
      },
      {
        id: 'pendingDelivery',
        shortLabel: 'In-Transit',
        label: 'In-Transit Pending Delivery',
        count: raw.pendingDelivery ?? 0,
        icon: Truck,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/60',
        cardBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/60 hover:bg-emerald-100',
        textColor: 'text-emerald-900 dark:text-emerald-100',
        href: '/admin/orders/list',
      },
      {
        id: 'awbGenerationFailures',
        shortLabel: 'AWB Failures',
        label: 'AWB Generation Failures',
        count: raw.awbGenerationFailures ?? 0,
        icon: AlertCircle,
        color: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-100 dark:bg-pink-900/60',
        cardBg: 'bg-pink-50/90 dark:bg-pink-950/40 border-pink-200/90 dark:border-pink-800/60 hover:bg-pink-100',
        textColor: 'text-pink-900 dark:text-pink-100',
        href: '/admin/orders/list',
      },
      {
        id: 'activeHolds',
        shortLabel: 'Active Holds',
        label: 'Active Operational Holds',
        count: raw.activeHolds ?? 0,
        icon: ShieldAlert,
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/60',
        cardBg: 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-200/90 dark:border-orange-800/60 hover:bg-orange-100',
        textColor: 'text-orange-900 dark:text-orange-100',
        href: '/admin/orders/list',
      },
      {
        id: 'failedTallySyncs',
        shortLabel: 'Tally Sync Fail',
        label: 'Failed Tally ERP Syncs',
        count: raw.failedTallySyncs ?? 0,
        icon: RefreshCw,
        color: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-100 dark:bg-teal-900/60',
        cardBg: 'bg-teal-50/90 dark:bg-teal-950/40 border-teal-200/90 dark:border-teal-800/60 hover:bg-teal-100',
        textColor: 'text-teal-900 dark:text-teal-100',
        href: '/admin/orders/list',
      },
    ];
  }, [sseData]);

  const totalNotifs = useMemo(() => {
    return notificationItems.reduce((a, n) => a + n.count, 0);
  }, [notificationItems]);

  const displayName = userProfile
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : 'Admin User';
  const initials = userProfile
    ? `${userProfile.firstName[0]}${userProfile.lastName[0]}`
    : 'AU';
  const employeeId = userProfile?.clientCode || 'ADMIN';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await axiosInstance.post('https://v2.lakeetech.com/auth/logout');
    } catch {
      // proceed regardless
    }
    dispatch(logout());
    toast.success('Logged out successfully');
    router.replace('/');
    setLoggingOut(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/60 shadow-sm transition-all duration-200">
      <div className="px-4 md:px-6 h-16 flex items-center gap-3">
        {/* Desktop sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Mobile menu toggle */}
        <button
          onClick={onMobileMenu}
          className="flex md:hidden items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-150"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Logo - mobile */}
        <div className="flex md:hidden items-center gap-2">
          <LakeeeLogoMark size={28} />
          <span className="text-sm font-700 text-slate-800">LAKEE<span className="text-blue-600">E</span></span>
        </div>

        {/* Dynamic Page Header Title & Subtitle */}
        {pageTitle && (
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
            {pageIcon && (
              <div className="shrink-0 flex items-center justify-center">
                {pageIcon}
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate leading-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md lg:max-w-xl font-medium">
                  {pageSubtitle}
                </p>
              )}
            </div>
            {headerAction && (
              <div className="ml-2 flex items-center shrink-0">
                {headerAction}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">

          {/* Ticket icon */}
          <Link
            href="/admin/tickets"
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
            title="Tickets"
          >
            <Ticket size={17} />
          </Link>

          {/* Theme & Appearance Settings Button */}
          <button
            onClick={() => {
              setThemeDrawerOpen(true);
              setNotifOpen(false);
              setProfileOpen(false);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 relative group"
            title="Theme & Appearance Settings"
            aria-label="Theme settings"
          >
            <Palette size={17} className="text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--primary)] border-2 border-white dark:border-slate-900" />
          </button>

          {/* Theme Drawer */}
          <ThemeSettingsDrawer
            isOpen={themeDrawerOpen}
            onClose={() => setThemeDrawerOpen(false)}
          />

          {/* Notification Bell Icon */}
          <div>
            <button
              onClick={handleToggleNotif}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${
                notifOpen
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label="Notifications"
              title="Toggle Real-time Order Alerts Panel"
            >
              <Bell size={17} />
              {totalNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-700 rounded-full flex items-center justify-center px-1 shadow-xs">
                  {totalNotifs > 99 ? '99+' : totalNotifs}
                </span>
              )}
              {/* Live SSE pulsing indicator */}
              {sseConnected && (
                <span className="absolute bottom-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </div>

          {/* Profile Avatar Button & Menu */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setProfileOpen((p) => !p); }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-700">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-700 text-slate-800 dark:text-white leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{employeeId}</p>
              </div>
              <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-700 text-slate-800 dark:text-white">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ID: {employeeId}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/admin/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <User size={15} className="text-slate-400" />
                    Profile
                  </Link>
                  <Link
                    href="/admin/change-password"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <KeyRound size={15} className="text-slate-400" />
                    Change Password
                  </Link>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      dispatch(lockSession());
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Lock size={15} />
                      <span>Lock Screen</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={15} />
                      {loggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OPTION 1: Single Line Joined Notification Panel (Active when Bell is OPEN, pushes content down) */}
      {notifOpen && (
        <div className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 md:px-5 py-2.5 transition-all duration-200 animate-slide-down">
          {/* Single Line Grid of All 10 Notification Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-1.5">
            {notificationItems.map((n) => {
              const Icon = n.icon;
              return (
                <div key={`opt1-${n.id}`} className="relative group">
                  {/* Card Button with Light Pastel Background */}
                  <div
                    onClick={() => {
                      if (n.href) router.push(n.href);
                    }}
                    className={`flex items-center justify-between gap-1 px-2 py-1.5 ${n.cardBg} border rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer group-hover:scale-105 group-hover:z-30 relative active:scale-[0.97] min-w-0`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-5 h-5 rounded-lg ${n.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon size={12} className={n.color} />
                      </div>
                      <span className={`text-[10px] font-bold truncate leading-none ${n.textColor}`}>
                        {n.shortLabel}
                      </span>
                    </div>
                    <span className={`text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform duration-200 origin-center ${
                      n.count > 0
                        ? (n.id.includes('critical') || n.id.includes('Failures') || n.id.includes('escalated'))
                          ? 'bg-red-600 text-white animate-pulse shadow-xs'
                          : 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700'
                    }`}>
                      {n.count}
                    </span>
                  </div>

                  {/* Full Text Floating Zoom Badge on Mouse Over */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-800 dark:text-white text-xs font-bold rounded-xl shadow-2xl border border-slate-700 dark:border-slate-600 whitespace-nowrap z-50 pointer-events-none transform transition-all duration-150 scale-105">
                    <div className={`w-4 h-4 rounded-full ${n.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={10} className={n.color} />
                    </div>
                    <span className="text-white font-bold">{n.label}</span>
                    <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full ${
                      n.count > 0 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {n.count}
                    </span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OPTION 2: Bottom of Header Scrolling Marquee (Active when Bell is CLOSED, hides when Bell is OPEN) */}
      {!notifOpen && (
        <div className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 py-1.5 overflow-hidden transition-all duration-200">
          <Marquee speed={45} pauseOnHover={true} gradient={false}>
            <div className="flex items-center gap-2 px-2">
              {notificationItems.map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={`opt2-mq-${n.id}`}
                    onClick={() => {
                      if (n.href) router.push(n.href);
                    }}
                    className={`flex items-center gap-2 px-3 py-1 ${n.cardBg} border rounded-full transition-all cursor-pointer mx-1.5 shadow-2xs group flex-shrink-0`}
                    title={`${n.label}: ${n.count} alert(s)`}
                  >
                    <div className={`w-5 h-5 rounded-full ${n.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon size={12} className={n.color} />
                    </div>
                    <span className={`text-[11px] font-bold whitespace-nowrap ${n.textColor}`}>
                      {n.label}
                    </span>
                    <span className={`text-[10px] font-extrabold font-mono px-1.5 py-0.2 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform duration-200 origin-center ${
                      n.count > 0
                        ? (n.id.includes('critical') || n.id.includes('Failures') || n.id.includes('escalated'))
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700'
                    }`}>
                      {n.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Marquee>
        </div>
      )}
    </header>
  );
}
