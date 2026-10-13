'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Key, Search, RefreshCw, Zap, Shield, CheckCircle2,
  XCircle, AlertTriangle, Layers, UserCheck, Lock, User, Phone, Mail,
  ChevronDown, Check, X
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import Badge from '@/components/ui/Badge';
import { permissionService } from '@/services/permission.service';
import { EffectiveUserActionDto, ScreenDto, PermissionAction, UserItem } from '@/types/permissions';
import { toast } from 'sonner';
import Link from 'next/link';

const ALL_ACTIONS: PermissionAction[] = ['READ', 'WRITE', 'EDIT', 'DELETE', 'EXPORT'];

interface SearchableSelectProps<T> {
  options: T[];
  value: string | number;
  onChange: (item: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  getItemKey: (item: T) => string | number;
  getItemLabel: (item: T) => string;
  getItemSubLabel?: (item: T) => string;
  filterFn: (item: T, query: string) => boolean;
}

function SearchableSelect<T>({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Type to search...',
  getItemKey,
  getItemLabel,
  getItemSubLabel,
  filterFn,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Currently selected item
  const selectedItem = useMemo(() => {
    return options.find((item) => String(getItemKey(item)) === String(value)) || null;
  }, [options, value, getItemKey]);

  // Filtered options list
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((item) => filterFn(item, q));
  }, [options, searchQuery, filterFn]);

  // Reset highlightedIndex to 0 (1st item in list) whenever filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll active item into view during arrow key navigation
  useEffect(() => {
    if (isOpen && listRef.current) {
      const children = listRef.current.children;
      if (children[highlightedIndex]) {
        (children[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const commitSelection = (item: T) => {
    onChange(item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        commitSelection(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Tab') {
      if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        commitSelection(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Control Box */}
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between gap-2 shadow-xs transition-colors"
      >
        <div className="truncate flex-1 min-w-0">
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent outline-none text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium"
            />
          ) : (
            <span className="truncate block font-bold text-slate-800 dark:text-slate-100">
              {selectedItem ? getItemLabel(selectedItem) : placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {searchQuery && isOpen && (
            <X
              size={13}
              className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
            />
          )}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </div>
      </div>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 text-xs scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-slate-400 dark:text-slate-500 font-medium">
              No matching results
            </div>
          ) : (
            filteredOptions.map((item, idx) => {
              const itemKey = getItemKey(item);
              const isSelected = String(itemKey) === String(value);
              const isHighlighted = idx === highlightedIndex;
              const sub = getItemSubLabel ? getItemSubLabel(item) : '';

              return (
                <div
                  key={String(itemKey)}
                  onClick={(e) => {
                    e.stopPropagation();
                    commitSelection(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    isHighlighted
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-bold border-l-2 border-indigo-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate flex-1 min-w-0">
                    <p className="font-bold truncate text-slate-900 dark:text-white">{getItemLabel(item)}</p>
                    {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{sub}</p>}
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 font-bold" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function UserPermissionOverridesClient() {
  const [screens, setScreens] = useState<ScreenDto[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userIdInput, setUserIdInput] = useState<string>('39');
  const [selectedScreenCode, setSelectedScreenCode] = useState<string>('ORD_BATCH');

  const [effectiveData, setEffectiveData] = useState<EffectiveUserActionDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [flushingCache, setFlushingCache] = useState<boolean>(false);

  // Load screens list
  useEffect(() => {
    const loadScreens = async () => {
      try {
        const scrs = await permissionService.getScreens();
        setScreens(scrs);
        if (scrs.length > 0) {
          setSelectedScreenCode(scrs[0].code);
        }
      } catch (err) {
        console.error('Failed to load screens:', err);
      }
    };
    loadScreens();
  }, []);

  // Load users list (GET /users) with NDJSON support
  const fetchUsersList = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const fetchedUsers = await permissionService.getUsers();
      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
        // If current userIdInput is not in fetched list, preset to first user
        const exists = fetchedUsers.some((u) => String(u.id) === userIdInput);
        if (!exists) {
          setUserIdInput(String(fetchedUsers[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [userIdInput]);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  // Derived selected user info
  const selectedUser = useMemo(() => {
    const numId = Number(userIdInput);
    return users.find((u) => u.id === numId) || null;
  }, [users, userIdInput]);

  const selectedUserName = useMemo(() => {
    if (!selectedUser) return `User #${userIdInput}`;
    const fullName = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim();
    return fullName || `User #${selectedUser.id}`;
  }, [selectedUser, userIdInput]);

  const handleInspectEffectiveActions = useCallback(async () => {
    if (!userIdInput.trim()) {
      toast.error('Please enter or select a valid User');
      return;
    }
    setLoading(true);
    try {
      const res = await permissionService.getEffectiveUserActions(
        Number(userIdInput),
        selectedScreenCode
      );
      setEffectiveData(res);
    } catch (err: any) {
      console.error('Failed to inspect effective actions:', err);
      toast.error('Failed to resolve effective permissions');
    } finally {
      setLoading(false);
    }
  }, [userIdInput, selectedScreenCode]);

  useEffect(() => {
    if (userIdInput && selectedScreenCode) {
      handleInspectEffectiveActions();
    }
  }, [selectedScreenCode, handleInspectEffectiveActions]);

  const handleFlushRedisCache = async () => {
    if (!userIdInput.trim()) {
      toast.error('Please enter a valid User ID');
      return;
    }
    setFlushingCache(true);
    try {
      const res = await permissionService.refreshUserPermissionCache(Number(userIdInput));
      toast.success(res.message || `Redis permission cache flushed for ${selectedUserName}`);
      handleInspectEffectiveActions();
    } catch (err: any) {
      console.error('Failed to flush Redis cache:', err);
      toast.error(err.response?.data?.message || 'Failed to invalidate cache');
    } finally {
      setFlushingCache(false);
    }
  };

  return (
    <AdminLayout
      fullWidth={true}
      screenFit={true}
      pageTitle="Effective Permissions Inspector & Cache Tools"
      pageSubtitle="Inspect resolved user actions (/users/permissions/{userId}/{screenCode}) and flush Gateway Redis cache"
      pageIcon={<Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      headerAction={
        <button
          onClick={handleFlushRedisCache}
          disabled={flushingCache}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50"
        >
          {flushingCache ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Force Refresh Redis Cache
        </button>
      }
    >
      <div className="flex flex-col h-full space-y-4 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin space-y-4 pr-1">

        {/* Auto-Healing Cache Explanation Banner
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-md border border-indigo-900 space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
            <Shield className="w-5 h-5 text-indigo-400" />
            Gateway Auto-Healing Permission Cache Architecture
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
            On any Redis cache miss, the API Gateway automatically queries PostgreSQL DB `v2`, resolves user role mappings & screen-action permissions, saves them to Redis (`user:perms:{'{userId}'}` with 24-hour TTL), and authorizes requests seamlessly.
          </p>
        </div>
        */}

        {/* Inspector Inputs Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          
          {/* Select User Dropdown (Searchable Combobox) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Select User ({users.length} Users Loaded)
            </label>
            <SearchableSelect<UserItem>
              options={users}
              value={userIdInput}
              onChange={(u) => setUserIdInput(String(u.id))}
              placeholder="Select User..."
              searchPlaceholder="Type name, ID, phone or email..."
              getItemKey={(u) => u.id}
              getItemLabel={(u) => {
                const uName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || `User #${u.id}`;
                return `#${u.id} - ${uName}`;
              }}
              getItemSubLabel={(u) => {
                const parts = [];
                if (u.phoneNumber) parts.push(u.phoneNumber);
                if (u.email) parts.push(u.email);
                return parts.join(' • ');
              }}
              filterFn={(u, q) => {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                const idStr = String(u.id);
                const phone = (u.phoneNumber || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                return idStr.includes(q) || fullName.includes(q) || phone.includes(q) || email.includes(q);
              }}
            />
          </div>

          {/* Target System Screen Code Dropdown (Searchable Combobox) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Target System Screen Code
            </label>
            <SearchableSelect<ScreenDto>
              options={screens}
              value={selectedScreenCode}
              onChange={(s) => setSelectedScreenCode(s.code)}
              placeholder="Select Screen..."
              searchPlaceholder="Type screen code, title or path..."
              getItemKey={(s) => s.code}
              getItemLabel={(s) => `${s.title} (${s.code})`}
              getItemSubLabel={(s) => `${s.moduleCode || ''} • ${s.path || ''}`}
              filterFn={(s, q) => {
                const code = (s.code || '').toLowerCase();
                const title = (s.title || '').toLowerCase();
                const path = (s.path || '').toLowerCase();
                const mod = (s.moduleCode || '').toLowerCase();
                return code.includes(q) || title.includes(q) || path.includes(q) || mod.includes(q);
              }}
            />
          </div>

          <div>
            <button
              onClick={handleInspectEffectiveActions}
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Inspect Resolved Permissions
            </button>
          </div>
        </div>

        {/* Selected User Header Info Card */}
        {selectedUser && (
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                {selectedUser.firstName ? selectedUser.firstName[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {selectedUserName}
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono font-bold">
                    User ID #{selectedUser.id}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                  {selectedUser.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} className="text-slate-400" />
                      {selectedUser.email}
                    </span>
                  )}
                  {selectedUser.phoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-slate-400" />
                      {selectedUser.phoneNumber}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFlushRedisCache}
                disabled={flushingCache}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5"
              >
                <Zap size={13} />
                Flush {selectedUserName}'s Cache
              </button>
            </div>
          </div>
        )}

        {/* Inspection Results */}
        {effectiveData && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Effective Permission Result for {selectedUserName} (User #{effectiveData.userId})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Screen Code: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{effectiveData.screenCode}</span>
                </p>
              </div>

              {effectiveData.isSuperUser && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Lock className="w-3.5 h-3.5" /> SUPER-USER Priority Active
                </span>
              )}
            </div>

            {/* Resolved Actions Badges */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Resolved Action Matrix Status
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {ALL_ACTIONS.map((action) => {
                  const actionsList = Array.isArray(effectiveData?.actions) ? effectiveData.actions : [];
                  const isAllowed = !!effectiveData?.isSuperUser || actionsList.includes(action);
                  return (
                    <div
                      key={action}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${
                        isAllowed
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isAllowed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      )}
                      <span className="font-bold text-xs uppercase tracking-wider">{action}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isAllowed
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {isAllowed ? 'ALLOWED' : 'DENIED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}

