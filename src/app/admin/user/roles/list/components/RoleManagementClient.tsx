'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, Plus, Search, RefreshCw, Edit2, Trash2, CheckCircle2,
  AlertCircle, Key, Users, Grid, ArrowRight, Lock, Filter, ArrowUpDown
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { permissionService } from '@/services/permission.service';
import { RoleDto } from '@/types/permissions';
import { toast } from 'sonner';
import Link from 'next/link';

const isRoleActive = (role: RoleDto): boolean => {
  if (role.statusId !== undefined) {
    return role.statusId === 1;
  }
  if (role.status !== undefined) {
    return role.status === 'ACTIVE' || role.status === 1 || role.status === '1';
  }
  return true; // Default to Active if statusId/status is omitted
};

export default function RoleManagementClient() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Modal States
  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<RoleDto | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatusId, setFormStatusId] = useState<number>(1);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDto | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await permissionService.getRoles();
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      toast.error('Failed to load active roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const filteredRoles = useMemo(() => {
    return roles
      .filter((role) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          searchQuery === '' ||
          role.name.toLowerCase().includes(q) ||
          role.description.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && isRoleActive(role)) ||
          (statusFilter === 'INACTIVE' && !isRoleActive(role));

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id));
  }, [roles, searchQuery, statusFilter, sortAsc]);

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormStatusId(1);
    setRoleModalOpen(true);
  };

  const [fetchingRoleDetails, setFetchingRoleDetails] = useState<boolean>(false);

  const handleOpenEditModal = async (role: RoleDto) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormStatusId(role.statusId ?? 1);
    setRoleModalOpen(true);
    setFetchingRoleDetails(true);

    try {
      // GET /users/roles/{name}
      const roleDetails = await permissionService.getRoleByName(role.name);
      if (roleDetails) {
        setFormName(roleDetails.name || role.name);
        setFormDescription(roleDetails.description || '');
        if (roleDetails.statusId !== undefined) {
          setFormStatusId(roleDetails.statusId);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch role details for GET /users/roles/${role.name}:`, err);
    } finally {
      setFetchingRoleDetails(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Role name is required');
      return;
    }

    setSaving(true);
    try {
      const formattedName = formName.trim();
      if (editingRole) {
        // PUT /users/roles/{name}
        await permissionService.updateRole(editingRole.name, {
          name: formattedName,
          description: formDescription,
          statusId: formStatusId,
        });
        toast.success(`Role "${formattedName}" updated successfully`);
      } else {
        // POST /users/roles
        const createName = formattedName.toUpperCase().replace(/\s+/g, '_');
        await permissionService.createRole({
          name: createName,
          description: formDescription,
          statusId: formStatusId,
        });
        toast.success(`Role "${createName}" created successfully`);
      }
      setRoleModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      console.error('Failed to save role:', err);
      toast.error(err.response?.data?.message || 'Failed to save role definition');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = (role: RoleDto) => {
    setRoleToDelete(role);
    setDeleteModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeleting(true);
    try {
      // DELETE /users/roles/{name}
      const res = await permissionService.deleteRole(roleToDelete.name);
      const successMsg = res?.data?.message || res?.message || `Role "${roleToDelete.name}" deleted successfully`;
      toast.success(successMsg);
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (err: any) {
      console.error('Failed to delete role:', err);
      toast.error(err.response?.data?.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = useMemo(() => roles.filter((r) => isRoleActive(r)).length, [roles]);
  const inactiveCount = useMemo(() => roles.filter((r) => !isRoleActive(r)).length, [roles]);

  return (
    <AdminLayout
      fullWidth={true}
      screenFit={true}
      pageTitle="Role Management"
      pageSubtitle="Define access control roles, descriptions, and active statuses"
      pageIcon={<Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <div className="flex flex-col h-full space-y-4 overflow-hidden">

        {/* Filter Controls & Summary Statistics Toolbar Card (Matching /admin/stock/reports/current-status design) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 shrink-0">
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 flex flex-wrap items-center justify-between gap-3">
            {/* Inline Summary Statistics */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-200 dark:border-slate-800">
                <Filter size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Role Summary
                </h3>
              </div>

              {/* Stats 1: Total Roles */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Roles:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{roles.length}</span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden md:block shrink-0" />

              {/* Stats 2: Active Roles */}
              <div className="flex items-center gap-1.5 shrink-0">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Active Roles:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden md:block shrink-0" />

              {/* Stats 3: Inactive Roles */}
              <div className="flex items-center gap-1.5 shrink-0">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Inactive Roles:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{inactiveCount}</span>
              </div>
            </div>

            {/* Action Buttons at end of Role Summary Row */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={fetchRoles}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                title="Refresh Roles"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Create New Role
              </button>
            </div>
          </div>

          {/* Search Box & Controls Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by role name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <Link
                href="/admin/user/roles/matrix"
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 border border-indigo-200 dark:border-indigo-800"
              >
                <Grid className="w-3.5 h-3.5" />
                Permission Matrix
              </Link>
            </div>
          </div>
        </div>

        {/* Roles Table Container (Fixed Height + Vertical & Horizontal Scrollbar matching /admin/stock/reports/current-status) */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden flex flex-col">
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3 flex-1 flex flex-col justify-center items-center">
              <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Loading system roles...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center items-center">
              <Shield size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">No roles found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try refining your search filter or add a new role definition.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-full whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800 shadow-2xs">
                  <tr className="bg-slate-50 dark:bg-slate-955 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <th
                      className="py-2.5 px-3 whitespace-nowrap cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-16"
                      onClick={() => setSortAsc((prev) => !prev)}
                      title="Click to sort by Role ID"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>S.No</span>
                        <ArrowUpDown size={13} className={`transition-transform ${sortAsc ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Role Name & Code</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Description</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium whitespace-nowrap">
                  {filteredRoles.map((role, index) => (
                    <tr
                      key={role.id}
                      data-role-id={role.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-slate-800 dark:text-slate-200 whitespace-nowrap"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap w-16 text-center">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {role.name}
                          </span>
                          {role.name === 'Admin' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60">
                              <Lock size={12} /> System Master
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-md truncate whitespace-nowrap" title={role.description}>
                        {role.description || <span className="text-slate-400 italic">No description provided</span>}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isRoleActive(role) ? (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/user/roles/matrix?roleId=${role.id}`}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                            title="Configure Permissions Matrix"
                          >
                            <Grid size={15} />
                          </Link>
                          <button
                            onClick={() => handleOpenEditModal(role)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="Edit Role"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(role)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Role Modal */}
        <Modal
          open={roleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create New System Role'}
        >
          <form onSubmit={handleSaveRole} className="space-y-4 pt-2">
            {fetchingRoleDetails && (
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-medium border border-blue-200 dark:border-blue-800">
                <RefreshCw size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span>Fetching latest role details from backend...</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Role Name (Code) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. WAREHOUSE_OPERATOR"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe responsibilities and privileges assigned to this role..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {editingRole ? 'Update Role' : 'Save Role'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Confirm Role Deletion"
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">Deleting role "{roleToDelete?.name}"</p>
                <p>Are you sure you want to delete this role definition? Users mapped to this role may lose permissions.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
