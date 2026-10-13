'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Grid, Shield, Save, RefreshCw, CheckSquare, Square,
  Layers, Search, CheckCircle2, AlertCircle, Info, Lock
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import Badge from '@/components/ui/Badge';
import { permissionService } from '@/services/permission.service';
import { RoleDto, ScreenDto, ScreenActionPermission, PermissionAction } from '@/types/permissions';
import { toast } from 'sonner';
import Link from 'next/link';

const ACTIONS: PermissionAction[] = ['READ', 'WRITE', 'EDIT', 'DELETE', 'EXPORT'];

const MODULE_NAMES: Record<string, string> = {
  DASH: 'Dashboard Module',
  PRODUCT: 'Product Catalog Module',
  CLIENT: 'Client Management Module',
  VENDOR: 'Supplier & Vendor Module',
  STOCK: 'Stock & Inventory Module',
  ORDER: 'Orders & Fulfillment Module',
  COURIER: 'Logistics & Courier Module',
  FINANCE: 'Finance & Billing Module',
  USER: 'User & Security Module',
  MEDIA: 'Media Storage Module',
};

export default function RolePermissionMatrixClient() {
  const searchParams = useSearchParams();
  const initialRoleIdParam = searchParams.get('roleId');

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [screens, setScreens] = useState<ScreenDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(
    initialRoleIdParam ? Number(initialRoleIdParam) : null
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');

  // Matrix State: map of screenCode -> set of actions
  const [matrixState, setMatrixState] = useState<Record<string, Set<PermissionAction>>>({});

  // Fetch initial roles & screens
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, screensData] = await Promise.all([
        permissionService.getRoles(),
        permissionService.getScreens(),
      ]);
      setRoles(rolesData);
      setScreens(screensData);

      if (rolesData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rolesData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch matrix prerequisites:', err);
      toast.error('Failed to load screens or roles catalog');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch permissions when selectedRoleId changes
  const fetchPermissionsForRole = useCallback(async (roleId: number) => {
    setLoadingPermissions(true);
    try {
      const perms = await permissionService.getRolePermissions(roleId);
      const newMap: Record<string, Set<PermissionAction>> = {};
      
      perms.forEach((p) => {
        const actionSet = new Set(p.actions);
        // 1. Direct screenCode key
        newMap[p.screenCode] = actionSet;

        // 2. Find matching screen in current catalog by code or path (e.g. PROD / PROD_LIST / /admin/products/list)
        const matchedScreen = screens.find(
          (s) => s.code.toLowerCase() === p.screenCode.toLowerCase() || (p.path && s.path.toLowerCase() === p.path.toLowerCase())
        );
        if (matchedScreen) {
          newMap[matchedScreen.code] = actionSet;
        }
      });

      setMatrixState(newMap);
    } catch (err) {
      console.error('Failed to fetch role permissions:', err);
      toast.error('Failed to load current permissions for role');
    } finally {
      setLoadingPermissions(false);
    }
  }, [screens]);

  useEffect(() => {
    if (selectedRoleId) {
      fetchPermissionsForRole(selectedRoleId);
    }
  }, [selectedRoleId, fetchPermissionsForRole]);

  // Filtered screens based on search & module filter
  const filteredScreens = useMemo(() => {
    return screens.filter((scr) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        scr.title.toLowerCase().includes(q) ||
        scr.code.toLowerCase().includes(q) ||
        scr.moduleCode.toLowerCase().includes(q);

      const matchesModule = moduleFilter === 'ALL' || scr.moduleCode === moduleFilter;

      return matchesSearch && matchesModule;
    });
  }, [screens, searchQuery, moduleFilter]);

  // Grouped screens by module code
  const groupedScreens = useMemo(() => {
    const map: Record<string, ScreenDto[]> = {};
    filteredScreens.forEach((scr) => {
      if (!map[scr.moduleCode]) {
        map[scr.moduleCode] = [];
      }
      map[scr.moduleCode].push(scr);
    });
    return map;
  }, [filteredScreens]);

  // Toggle single action checkbox
  const toggleAction = (screenCode: string, action: PermissionAction) => {
    setMatrixState((prev) => {
      const currentActions = new Set(prev[screenCode] || []);
      if (currentActions.has(action)) {
        currentActions.delete(action);
      } else {
        currentActions.add(action);
      }
      return {
        ...prev,
        [screenCode]: currentActions,
      };
    });
  };

  // Toggle entire row (screen)
  const toggleScreenRow = (screenCode: string) => {
    setMatrixState((prev) => {
      const currentActions = new Set(prev[screenCode] || []);
      const allSelected = ACTIONS.every((a) => currentActions.has(a));
      if (allSelected) {
        return { ...prev, [screenCode]: new Set() };
      } else {
        return { ...prev, [screenCode]: new Set(ACTIONS) };
      }
    });
  };

  // Toggle entire action column across visible screens
  const toggleActionColumn = (action: PermissionAction) => {
    const allHaveAction = filteredScreens.every((scr) => (matrixState[scr.code] || new Set()).has(action));

    setMatrixState((prev) => {
      const nextMap = { ...prev };
      filteredScreens.forEach((scr) => {
        const currentActions = new Set(nextMap[scr.code] || []);
        if (allHaveAction) {
          currentActions.delete(action);
        } else {
          currentActions.add(action);
        }
        nextMap[scr.code] = currentActions;
      });
      return nextMap;
    });
  };

  // Save Permissions Matrix
  const handleSaveMatrix = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const payload: ScreenActionPermission[] = screens.map((scr) => {
        const actionsSet = matrixState[scr.code] || new Set();
        return {
          screenCode: scr.code,
          actions: Array.from(actionsSet),
        };
      });

      const res = await permissionService.saveRolePermissions(selectedRoleId, payload);
      toast.success(res.message || 'Role permission matrix saved successfully!');
    } catch (err: any) {
      console.error('Failed to save permission matrix:', err);
      toast.error(err.message || err.response?.data?.message || 'Failed to save permission matrix');
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  return (
    <AdminLayout
      fullWidth={true}
      screenFit={true}
      pageTitle="Role Permission Checkbox Matrix"
      pageSubtitle="Screens (Y-axis) × Actions (READ, WRITE, EDIT, DELETE, EXPORT) (X-axis)"
      pageIcon={<Grid className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">

        {/* Single Unified Header & Filter Card */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3 shrink-0">
          {/* Top Row: Role Selector + Actions + Redis Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase shrink-0">Configure Role:</label>
                <select
                  value={selectedRoleId || ''}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                  className="font-bold text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 dark:bg-slate-800/50"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {selectedRole && (
                <div className="flex items-center gap-1.5 text-[11px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
                  <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Saving automatically invalidates Redis cache (`user:perms:*`).</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => selectedRoleId && fetchPermissionsForRole(selectedRoleId)}
                disabled={loadingPermissions}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                title="Reset matrix state"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPermissions ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleSaveMatrix}
                disabled={saving || !selectedRoleId}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-xs disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Matrix
              </button>
            </div>
          </div>

          {/* Bottom Row: Search Input + Module Filter Pills */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search screen by title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-0.5 md:pb-0 scrollbar-thin">
              <button
                onClick={() => setModuleFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition shrink-0 ${
                  moduleFilter === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Modules
              </button>
              {Object.keys(MODULE_NAMES).map((modCode) => (
                <button
                  key={modCode}
                  onClick={() => setModuleFilter(modCode)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition shrink-0 ${
                    moduleFilter === modCode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {modCode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permission Matrix Table Container (Fixed Height + Vertical & Horizontal Scrollbar) */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
          {loading || loadingPermissions ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3 flex-1">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Loading permission matrix data...</p>
            </div>
          ) : Object.keys(groupedScreens).length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
              <Grid className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No screens match filter criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting search filters.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-full text-xs whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white border-b border-slate-800 shadow-2xs">
                  <tr className="text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 whitespace-nowrap">Screen Name</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Code</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Screen Path / Route</th>
                    {ACTIONS.map((action) => (
                      <th key={action} className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{action}</span>
                          <button
                            onClick={() => toggleActionColumn(action)}
                            className="text-[10px] text-indigo-300 hover:text-white underline font-normal lowercase"
                            title={`Toggle ${action} for all visible screens`}
                          >
                            select all
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Row Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {Object.entries(groupedScreens).map(([modCode, screensList]) => (
                    <React.Fragment key={modCode}>
                      {/* Module Header Row */}
                      <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                        <td colSpan={9} className="py-1.5 px-3 font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>{MODULE_NAMES[modCode] || modCode}</span>
                            <span className="text-slate-500 dark:text-slate-400 font-normal">({screensList.length} screens)</span>
                          </div>
                        </td>
                      </tr>

                      {/* Compact Screen Rows */}
                      {screensList.map((screen) => {
                        const currentActions = matrixState[screen.code] || new Set();
                        const isAllSelected = ACTIONS.every((a) => currentActions.has(a));

                        return (
                          <tr key={screen.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-colors">
                            <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                              {screen.title}
                            </td>
                            <td className="py-1.5 px-3 whitespace-nowrap">
                              <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/60 inline-block">
                                {screen.code}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 whitespace-nowrap">
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs block" title={screen.path}>
                                {screen.path}
                              </span>
                            </td>

                            {ACTIONS.map((action) => {
                              const isChecked = currentActions.has(action);
                              return (
                                <td key={action} className="py-1 px-3 text-center whitespace-nowrap">
                                  <label className="inline-flex items-center justify-center cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleAction(screen.code, action)}
                                      className="sr-only"
                                    />
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                                    )}
                                  </label>
                                </td>
                              );
                            })}

                            <td className="py-1 px-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => toggleScreenRow(screen.code)}
                                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline"
                              >
                                {isAllSelected ? 'Unselect All' : 'Select All'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
