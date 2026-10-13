'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Search, RefreshCw, Trash2, Shield, AlertCircle,
  CheckCircle2, UserCheck, ShieldAlert, Lock, Filter
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { permissionService } from '@/services/permission.service';
import { UserRoleMapping, RoleDto } from '@/types/permissions';
import { toast } from 'sonner';
import Link from 'next/link';

const isRoleActive = (role: RoleDto): boolean => {
  if (role.statusId !== undefined) {
    return role.statusId === 1;
  }
  if (role.status !== undefined) {
    return role.status === 'ACTIVE' || role.status === 1 || role.status === '1';
  }
  return true; // Default to active if status is omitted
};

export default function UserRoleMappingClient() {
  const [userMappings, setUserMappings] = useState<UserRoleMapping[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal States for Assigning Role
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [initialAssignedRoleIds, setInitialAssignedRoleIds] = useState<number[]>([]);
  const [userRoleAssignments, setUserRoleAssignments] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [loadingUserRoles, setLoadingUserRoles] = useState<boolean>(false);

  // Revoke confirmation state
  const [revokeModalOpen, setRevokeModalOpen] = useState<boolean>(false);
  const [targetRevoke, setTargetRevoke] = useState<{ userId: number; roleId: number; roleName: string } | null>(null);
  const [revoking, setRevoking] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mappingsData, rolesData] = await Promise.all([
        permissionService.getAllUserWiseRoles(),
        permissionService.getRoles(),
      ]);
      setUserMappings(mappingsData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Failed to load user-role mapping data:', err);
      toast.error('Failed to load user-role mappings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SUPER-USER Exposure Policy: Filter out SUPER-USER role from assignable options
  const assignableRoles = useMemo(() => {
    return roles.filter(
      (r) => isRoleActive(r) && r.name.toUpperCase() !== 'SUPER-USER' && r.name.toUpperCase() !== 'SUPERUSER'
    );
  }, [roles]);

  const getRoleName = useCallback((rId: number): string => {
    const found = roles.find((r) => r.id === rId);
    return found ? found.name : `Role #${rId}`;
  }, [roles]);

  const getUserRolesList = useCallback((item: UserRoleMapping): { roleId: number; roleName: string; isSuper: boolean }[] => {
    const result: { roleId: number; roleName: string; isSuper: boolean }[] = [];
    const names = item.roleNames && item.roleNames.length > 0
      ? item.roleNames
      : item.roles
      ? item.roles.split(',').map((s) => s.trim()).filter(Boolean)
      : item.roleIds.map(getRoleName);

    names.forEach((rName) => {
      const isSuper = rName.toUpperCase() === 'SUPER-USER' || rName.toUpperCase() === 'SUPERUSER';
      const matchedRole = roles.find((r) => r.name.toLowerCase() === rName.toLowerCase());
      const rId = matchedRole ? matchedRole.id : item.roleIds[0] || 0;

      if (!result.some((r) => r.roleName.toLowerCase() === rName.toLowerCase())) {
        result.push({ roleId: rId, roleName: rName, isSuper });
      }
    });

    return result;
  }, [roles, getRoleName]);

  const filteredMappings = useMemo(() => {
    return userMappings.filter((item) => {
      const q = searchQuery.toLowerCase();
      const uName = (item.name || `${item.firstName || ''} ${item.lastName || ''}` || item.userName || '').toLowerCase();
      const uEmail = (item.email || item.userEmail || '').toLowerCase();
      const uPhone = (item.phone || item.mobile || item.phoneNumber || item.userPhone || '').toLowerCase();
      const uRoles = (item.roles || (item.roleNames || []).join(', ') || '').toLowerCase();

      const matchesUser =
        searchQuery === '' ||
        String(item.userId).includes(q) ||
        uName.includes(q) ||
        uEmail.includes(q) ||
        uPhone.includes(q) ||
        uRoles.includes(q);

      const assignedRoles = getUserRolesList(item);
      const filterRoleIdNum = Number(roleFilter);
      const filterRoleObj = roles.find((r) => r.id === filterRoleIdNum);

      const matchesRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'UNASSIGNED' && assignedRoles.length === 0) ||
        item.roleIds.includes(filterRoleIdNum) ||
        (filterRoleObj && assignedRoles.some((r) => r.roleName.toLowerCase() === filterRoleObj.name.toLowerCase()));

      return matchesUser && matchesRole;
    });
  }, [userMappings, searchQuery, roleFilter, roles, getUserRolesList]);

  // Fetch live assigned roles for modal user selection GET /users/user-roles/user/{userId}
  const fetchUserRolesForModal = useCallback(async (targetUserId: number) => {
    const targetUser = userMappings.find((u) => u.userId === targetUserId);
    let initialIds: number[] = [];
    if (targetUser) {
      const assigned = getUserRolesList(targetUser);
      initialIds = assigned.map((r) => r.roleId).filter(Boolean);
      setSelectedRoleIds(initialIds);
      setInitialAssignedRoleIds(initialIds);
    } else {
      setSelectedRoleIds([]);
      setInitialAssignedRoleIds([]);
    }

    setLoadingUserRoles(true);
    try {
      const userRolesData = await permissionService.getUserRoles(targetUserId);
      setUserRoleAssignments(userRolesData || []);
      if (Array.isArray(userRolesData) && userRolesData.length > 0) {
        const fetchedRoleIds = userRolesData.map((ur) => ur.roleId).filter(Boolean);
        const merged = Array.from(new Set([...initialIds, ...fetchedRoleIds]));
        setSelectedRoleIds(merged);
        setInitialAssignedRoleIds(merged);
      }
    } catch (err) {
      console.error(`Failed to fetch GET /users/user-roles/user/${targetUserId}:`, err);
    } finally {
      setLoadingUserRoles(false);
    }
  }, [userMappings, getUserRolesList]);

  const handleOpenAssignModal = (presetUserId?: number) => {
    if (presetUserId) {
      setSelectedUserId(presetUserId);
      fetchUserRolesForModal(presetUserId);
    } else {
      setSelectedUserId('');
      setSelectedRoleIds([]);
      setInitialAssignedRoleIds([]);
      setUserRoleAssignments([]);
    }
    setAssignModalOpen(true);
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a User');
      return;
    }

    setAssigning(true);
    try {
      const targetUid = Number(selectedUserId);
      // Newly checked role IDs to POST
      const rolesToAdd = selectedRoleIds.filter((id) => !initialAssignedRoleIds.includes(id));
      // Unchecked role IDs to DELETE
      const rolesToRemove = initialAssignedRoleIds.filter((id) => !selectedRoleIds.includes(id));

      // 1. Post new role assignments (POST /users/user-roles)
      for (const roleId of rolesToAdd) {
        await permissionService.assignUserRole(targetUid, roleId);
      }

      // 2. Delete unchecked role assignments using userRoleId (DELETE /users/user-roles/{userRoleId})
      for (const roleId of rolesToRemove) {
        const match = userRoleAssignments.find((ur) => ur.roleId === roleId);
        const userRoleId = match ? match.id : 0;
        await permissionService.removeUserRole(userRoleId || 0, targetUid, roleId);
      }

      toast.success(`Role assignments updated successfully for User #${targetUid}`);
      setAssignModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to update user role assignments:', err);
      toast.error(err.response?.data?.message || 'Failed to update role assignments');
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenRevokeModal = (userId: number, roleId: number, roleName: string) => {
    setTargetRevoke({ userId, roleId, roleName });
    setRevokeModalOpen(true);
  };

  const handleRevokeRole = async () => {
    if (!targetRevoke) return;
    setRevoking(true);
    try {
      // Fetch live user-role assignments to find the exact userRoleId for DELETE /users/user-roles/{userRoleId}
      const liveUserRoles = await permissionService.getUserRoles(targetRevoke.userId);
      const match = liveUserRoles.find((ur) => ur.roleId === targetRevoke.roleId);
      const userRoleId = match ? match.id : 0;

      const res = await permissionService.removeUserRole(userRoleId || 0, targetRevoke.userId, targetRevoke.roleId);
      const msg = res?.data?.message || res?.message || `Role "${targetRevoke.roleName}" revoked from User #${targetRevoke.userId}`;
      toast.success(msg);
      setRevokeModalOpen(false);
      setTargetRevoke(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to revoke user role:', err);
      toast.error(err.response?.data?.message || 'Failed to revoke user role');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <AdminLayout
      fullWidth={true}
      screenFit={true}
      pageTitle="User-Role Mappings"
      pageSubtitle="Assign and manage role mappings for individual user accounts"
      pageIcon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      headerAction={
        /* 
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            title="Refresh User Mappings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleOpenAssignModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Assign Role to User
          </button>
        </div>
        */
        null
      }
    >
      <div className="flex-1 flex flex-col h-full min-h-0 space-y-4 overflow-hidden">

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by User ID, Name, Email, or Roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh User Mappings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Mappings</option>
              <option value="UNASSIGNED">Unassigned Users Only</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  Role: {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* User Mappings Table Container (Fixed Height + Vertical & Horizontal Scrollbar matching /admin/stock/reports/current-status) */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden flex flex-col">
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3 flex-1 flex flex-col justify-center items-center">
              <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Loading user role mappings...</p>
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center items-center">
              <UserCheck size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">No user mappings match criteria</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search query or assign a role to a user.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-full whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800 shadow-2xs">
                  <tr className="bg-slate-50 dark:bg-slate-955 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <th className="py-2.5 px-3 whitespace-nowrap w-16 text-center">S.No</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">User Info</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Assigned Roles (`roles`)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium whitespace-nowrap">
                  {filteredMappings.map((item, index) => {
                    const userName = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.userName || `User #${item.userId}`;
                    const userEmail = item.email || item.userEmail;
                    const userPhone = item.phone || item.mobile || item.phoneNumber || item.userPhone;
                    const assignedRoles = getUserRolesList(item);

                    return (
                      <tr
                        key={item.userId}
                        data-user-id={item.userId}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-slate-800 dark:text-slate-200 whitespace-nowrap"
                      >
                        <td className="py-2 px-3 font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap w-16 text-center">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{userName}</p>
                            {userPhone && (
                              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 font-medium">
                                📱 {userPhone}
                              </p>
                            )}
                            {userEmail ? (
                              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{userEmail}</p>
                            ) : (
                              <p className="text-[11px] italic text-slate-400 dark:text-slate-600">No email provided</p>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {assignedRoles.length === 0 ? (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 inline-flex items-center">
                              No Roles Assigned
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                              {assignedRoles.map(({ roleId, roleName, isSuper }) => (
                                <span
                                  key={roleName}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border whitespace-nowrap ${
                                    isSuper
                                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/60'
                                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60'
                                  }`}
                                >
                                  {isSuper ? <Lock size={12} /> : <Shield size={12} />}
                                  {roleName}
                                  {!isSuper && (
                                    <button
                                      onClick={() => handleOpenRevokeModal(item.userId, roleId, roleName)}
                                      className="hover:text-red-600 dark:hover:text-red-400 transition ml-0.5 font-bold"
                                      title={`Revoke ${roleName} role`}
                                    >
                                      &times;
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenAssignModal(item.userId)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-900/60 inline-flex items-center gap-1"
                          >
                            <Plus size={12} />
                            Assign Role
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assign Role Modal */}
        <Modal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Role to User"
        >
          <form onSubmit={handleAssignRole} className="space-y-4 pt-2">
            {loadingUserRoles && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-medium border border-blue-200 dark:border-blue-800">
                <RefreshCw size={13} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span>Fetching user's assigned roles...</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select User *
              </label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val) {
                    setSelectedUserId(val);
                    fetchUserRolesForModal(val);
                  } else {
                    setSelectedUserId('');
                    setSelectedRoleIds([]);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">-- Choose User --</option>
                {userMappings.map((u) => {
                  const uName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.userName || `User #${u.userId}`;
                  return (
                    <option key={u.userId} value={u.userId}>
                      #{u.userId} - {uName} {u.email ? `(${u.email})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  Select Role(s) to Assign * ({selectedRoleIds.length} selected)
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedRoleIds(assignableRoles.map((r) => r.id))}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRoleIds([])}
                    className="text-slate-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Multi-Select Roles Checklist Container */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1.5 bg-slate-50/50 dark:bg-slate-800/40 scrollbar-thin">
                {assignableRoles.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No assignable active roles available</p>
                ) : (
                  assignableRoles.map((r) => {
                    const isChecked = selectedRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoleIds((prev) => [...prev, r.id]);
                              } else {
                                setSelectedRoleIds((prev) => prev.filter((id) => id !== r.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="flex items-center gap-1.5 font-bold">
                            <Shield size={13} className="text-indigo-600 dark:text-indigo-400" />
                            <span>{r.name}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[200px]" title={r.description}>
                          {r.description || 'System Role'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                `SUPER-USER` is excluded from role assignment options per exposure policy.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {assigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Assign Role Mapping
              </button>
            </div>
          </form>
        </Modal>

        {/* Revoke Role Modal */}
        <Modal
          open={revokeModalOpen}
          onClose={() => setRevokeModalOpen(false)}
          title="Confirm Revoking Role"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs space-y-1">
              <p className="font-semibold">
                Revoke "{targetRevoke?.roleName}" from User #{targetRevoke?.userId}?
              </p>
              <p>This will remove the user's role assignment.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setRevokeModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeRole}
                disabled={revoking}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {revoking && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Revoke Role
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
