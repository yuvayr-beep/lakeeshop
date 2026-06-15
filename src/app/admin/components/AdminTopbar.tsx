'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, Ticket, Sun, Moon, ChevronDown, User, KeyRound, LogOut,
  Menu, PanelLeftClose, AlertTriangle, Package, Truck, Clock, TrendingDown
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { toggleTheme } from '@/redux/slices/themeSlice';
import { logout } from '@/redux/slices/authSlice';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import LakeeeLogoMark from '@/components/auth/LakeeeLogoMark';

interface AdminTopbarProps {
  onToggleSidebar: () => void;
  onMobileMenu: () => void;
}

const notifications = [
  { id: 1, label: 'Pending Stock Assign', count: 24, icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 2, label: 'Critical Stock Assign', count: 7, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 3, label: 'Escalated Stock Assign', count: 3, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 4, label: 'Pending Courier Assign', count: 18, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 5, label: 'Pending Outscan', count: 12, icon: Clock, color: 'text-violet-500', bg: 'bg-violet-50' },
  { id: 6, label: 'Pending Outscan Stock Available', count: 9, icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 7, label: 'Pending Delivery', count: 31, icon: Truck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export default function AdminTopbar({ onToggleSidebar, onMobileMenu }: AdminTopbarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const userProfile = useAppSelector((s) => s.user.profile);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalNotifs = notifications.reduce((a, n) => a + n.count, 0);

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
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/60 px-4 md:px-6 h-16 flex items-center gap-3 shadow-sm">
      {/* Desktop sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
        aria-label="Toggle sidebar"
      >
        <PanelLeftClose size={18} />
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

        {/* Dark/Light toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
          aria-label="Toggle theme"
        >
          {themeMode === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen((p) => !p); setProfileOpen(false); }}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {totalNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-700 rounded-full flex items-center justify-center px-1">
                {totalNotifs > 99 ? '99+' : totalNotifs}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-700 text-slate-800 dark:text-white">Alerts</h3>
                <span className="text-xs font-600 text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{totalNotifs} total</span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <div className={`w-8 h-8 rounded-lg ${n.bg} flex items-center justify-center flex-shrink-0`}>
                      <n.icon size={14} className={n.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-600 text-slate-700 dark:text-slate-200 truncate">{n.label}</p>
                    </div>
                    <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${n.bg} ${n.color}`}>{n.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen((p) => !p); setNotifOpen(false); }}
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
    </header>
  );
}
