'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
  Search,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Building2,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Info,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  InvoiceGroup,
  ClientItem,
  CourierServiceItem,
  EditInvoiceGroupPayload,
} from '@/types/invoiceGroup';
import { invoiceGroupService } from '@/services/invoiceGroup.service';
import InvoiceGroupModal from './InvoiceGroupModal';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function InvoiceGroupClient() {
  // Main Data States
  const [groups, setGroups] = useState<InvoiceGroup[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [courierServices, setCourierServices] = useState<CourierServiceItem[]>([]);

  // Loading and Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reordering, setReordering] = useState(false);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<InvoiceGroup | null>(null);

  // Delete Confirmation States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<InvoiceGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupsData, clientsData, servicesData] = await Promise.all([
        invoiceGroupService.getInvoiceGroups(),
        invoiceGroupService.getClients(),
        invoiceGroupService.getCourierServices(),
      ]);

      // Sort groups by sequenceNo ascending
      const sorted = [...groupsData].sort((a, b) => (a.sequenceNo || 0) - (b.sequenceNo || 0));
      setGroups(sorted);
      setClients(clientsData);
      setCourierServices(servicesData);
    } catch (err: any) {
      console.error('Error fetching invoice groups data:', err);
      setError('Failed to load Invoice Groups data. Please check backend network connection.');
      toast.error('Failed to load Invoice Groups data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lookup maps for client & service names
  const clientMap = useMemo(() => {
    const map = new Map<number, ClientItem>();
    clients.forEach((c) => map.set(c.id, c));
    return map;
  }, [clients]);

  const serviceMap = useMemo(() => {
    const map = new Map<number, CourierServiceItem>();
    courierServices.forEach((s) => map.set(s.id, s));
    return map;
  }, [courierServices]);

  // Compute Next Sequence Number
  const nextSequenceNo = useMemo(() => {
    if (groups.length === 0) return 1;
    const maxSeq = Math.max(...groups.map((g) => g.sequenceNo || 0));
    return maxSeq + 1;
  }, [groups]);

  // Search Filter
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();

    return groups.filter((g) => {
      const nameMatch = g.groupName?.toLowerCase().includes(q);
      const remarksMatch = g.remarks?.toLowerCase().includes(q);
      const seqMatch = String(g.sequenceNo).includes(q);

      // Check detail mappings
      const detailMatch = g.details?.some((d) => {
        const client = clientMap.get(d.clientId);
        const service = serviceMap.get(d.courierServiceId);
        const cName = client?.clientName?.toLowerCase() || '';
        const cCode = client?.clientCode?.toLowerCase() || '';
        const sName = service?.serviceName?.toLowerCase() || '';
        const mode = d.shipMode?.toLowerCase() || '';
        const pId = String(d.programId);

        return (
          cName.includes(q) ||
          cCode.includes(q) ||
          sName.includes(q) ||
          mode.includes(q) ||
          pId.includes(q)
        );
      });

      return nameMatch || remarksMatch || seqMatch || detailMatch;
    });
  }, [groups, searchQuery, clientMap, serviceMap]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / itemsPerPage));
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage, itemsPerPage]);

  // Re-order and persist sequence numbers
  const persistNewSequenceOrder = async (updatedList: InvoiceGroup[]) => {
    setReordering(true);
    // Assign 1-indexed sequence numbers based on list index
    const reindexedList = updatedList.map((item, idx) => ({
      ...item,
      sequenceNo: idx + 1,
    }));

    setGroups(reindexedList);

    try {
      // Find modified groups and update them via PUT API
      const updatePromises = reindexedList.map((g) => {
        const payload: EditInvoiceGroupPayload = {
          groupName: g.groupName,
          remarks: g.remarks || '',
          sequenceNo: g.sequenceNo,
          details: (g.details || []).map((d) => ({
            id: d.id,
            clientId: d.clientId,
            programId: d.programId,
            courierServiceId: d.courierServiceId,
            shipMode: d.shipMode,
          })),
        };
        return invoiceGroupService.updateInvoiceGroup(g.id, payload);
      });

      await Promise.all(updatePromises);
      toast.success('Sequence positions updated successfully!');
    } catch (err: any) {
      console.error('Error persisting sequence order:', err);
      toast.error('Failed to save updated sequence numbers to server');
      fetchData(); // Rollback to server state
    } finally {
      setReordering(false);
    }
  };

  // Move position Up by 1
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...groups];
    const temp = newList[index - 1];
    newList[index - 1] = newList[index];
    newList[index] = temp;
    persistNewSequenceOrder(newList);
  };

  // Move position Down by 1
  const handleMoveDown = (index: number) => {
    if (index === groups.length - 1) return;
    const newList = [...groups];
    const temp = newList[index + 1];
    newList[index + 1] = newList[index];
    newList[index] = temp;
    persistNewSequenceOrder(newList);
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newList = [...groups];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    setDraggedIndex(null);
    persistNewSequenceOrder(newList);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingGroup(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (group: InvoiceGroup) => {
    setEditingGroup(group);
    setModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (group: InvoiceGroup) => {
    setGroupToDelete(group);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      await invoiceGroupService.deleteInvoiceGroup(groupToDelete.id);
      toast.success(`Invoice Group "${groupToDelete.groupName}" deleted successfully`);
      setDeleteModalOpen(false);
      setGroupToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete Invoice Group');
    } finally {
      setDeleting(false);
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const toastId = toast.loading('Generating Excel report...');
    try {
      const headers = [
        'Sequence No',
        'Group ID',
        'Group Name',
        'Remarks',
        'Status',
        'Detail Rules Count',
        'Details Summary (Client - Program - Service - ShipMode)',
      ];

      const rows = filteredGroups.map((g) => {
        const detailsSummary = (g.details || [])
          .map((d) => {
            const client = clientMap.get(d.clientId)?.clientName || `Client #${d.clientId}`;
            const service = serviceMap.get(d.courierServiceId)?.serviceName || `Service #${d.courierServiceId}`;
            const prog = d.programId ? `Prog #${d.programId}` : 'No Prog';
            return `[${client} | ${prog} | ${service} | ${d.shipMode}]`;
          })
          .join('; ');

        return [
          g.sequenceNo,
          g.id,
          g.groupName || '',
          g.remarks || '',
          g.status !== false ? 'Active' : 'Inactive',
          g.details?.length || 0,
          detailsSummary,
        ];
      });

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          headers.join(','),
          ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Invoice_Groups_Export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Excel report exported successfully!', { id: toastId });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export Excel report', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Groups</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {groups.length}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Groups</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {groups.filter((g) => g.status !== false).length}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Mapping Rules</p>
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {groups.reduce((acc, g) => acc + (g.details?.length || 0), 0)}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Building2 className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Next Sequence No</p>
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              #{nextSequenceNo}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Truck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Action Controls Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by group name, remarks, client, service..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={fetchData}
              disabled={loading || reordering}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors shadow-sm disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredGroups.length === 0}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors shadow-sm disabled:opacity-50"
              title="Download Excel Report"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Invoice Group</span>
            </button>
          </div>
        </div>

        {/* Info Banner for Drag & Drop / Reordering */}
        <div className="px-6 py-2.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 flex-shrink-0 text-blue-500" />
            <span>
              <strong>Sequence Management:</strong> Drag & drop rows using the grip handle or use the <ChevronUp className="h-3 w-3 inline text-blue-600" /><ChevronDown className="h-3 w-3 inline text-blue-600" /> buttons to change priority positions.
            </span>
          </div>
          {reordering && (
            <span className="flex items-center space-x-1 font-semibold text-blue-600 dark:text-blue-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving sequence...</span>
            </span>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4 text-center w-24">Reorder</th>
                <th className="py-3.5 px-4 w-20 text-center">Seq #</th>
                <th className="py-3.5 px-4">Group Name & Remarks</th>
                <th className="py-3.5 px-4">Mapped Rules</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                <th className="py-3.5 px-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-xs font-medium">Loading Invoice Groups data...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-red-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <p className="text-sm font-semibold">{error}</p>
                      <button
                        onClick={fetchData}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-medium">No Invoice Groups found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? 'Try clearing your search filters.' : 'Click "Create Invoice Group" to add your first group.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group, idx) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                  const isExpanded = expandedGroupId === group.id;

                  return (
                    <React.Fragment key={group.id}>
                      <tr
                        draggable
                        onDragStart={() => handleDragStart(globalIndex)}
                        onDragOver={(e) => handleDragOver(e, globalIndex)}
                        onDrop={() => handleDrop(globalIndex)}
                        className={`group hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors ${
                          draggedIndex === globalIndex ? 'opacity-40 bg-blue-100 dark:bg-slate-800' : ''
                        }`}
                      >
                        {/* Drag Handle & Up/Down Position Controls */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span
                              className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                              title="Drag to reorder sequence"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <div className="flex flex-col space-y-0.5">
                              <button
                                onClick={() => handleMoveUp(globalIndex)}
                                disabled={globalIndex === 0 || reordering}
                                className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move Up"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveDown(globalIndex)}
                                disabled={globalIndex === groups.length - 1 || reordering}
                                className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move Down"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Sequence Number Badge */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 rounded-lg border border-blue-200 dark:border-blue-800">
                            #{group.sequenceNo}
                          </span>
                        </td>

                        {/* Group Name & Remarks */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {group.groupName}
                          </div>
                          {group.remarks && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {group.remarks}
                            </div>
                          )}
                        </td>

                        {/* Mapped Details Rules Count & Preview */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {group.details?.length || 0} Rules Mapped
                            </span>

                            <button
                              onClick={() =>
                                setExpandedGroupId(isExpanded ? null : group.id)
                              }
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                              {isExpanded ? (
                                <ChevronUpIcon className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDownIcon className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              group.status !== false
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {group.status !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(group)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Invoice Group"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(group)}
                              className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete Invoice Group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                                <span>Detailed Mapping Breakdown for "{group.groupName}"</span>
                              </h5>

                              {group.details && group.details.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {group.details.map((detail, dIdx) => {
                                    const client = clientMap.get(detail.clientId);
                                    const service = serviceMap.get(detail.courierServiceId);

                                    return (
                                      <div
                                        key={detail.id || dIdx}
                                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1">
                                          <span className="font-bold text-slate-800 dark:text-slate-200">
                                            Rule #{dIdx + 1}
                                          </span>
                                          <span className="px-2 py-0.5 font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[10px]">
                                            {detail.shipMode || 'SURFACE'}
                                          </span>
                                        </div>

                                        <div className="text-slate-600 dark:text-slate-300">
                                          <strong className="text-slate-800 dark:text-slate-200">
                                            Client:
                                          </strong>{' '}
                                          {client ? `${client.clientName} (${client.clientCode})` : `ID #${detail.clientId}`}
                                        </div>

                                        <div className="text-slate-600 dark:text-slate-300">
                                          <strong className="text-slate-800 dark:text-slate-200">
                                            Program ID:
                                          </strong>{' '}
                                          {detail.programId ? `#${detail.programId}` : '0 (None)'}
                                        </div>

                                        <div className="text-slate-600 dark:text-slate-300">
                                          <strong className="text-slate-800 dark:text-slate-200">
                                            Courier Service:
                                          </strong>{' '}
                                          {service ? `${service.serviceName} (${service.serviceCode})` : `ID #${detail.courierServiceId}`}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  No detail rules mapped for this group.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {PER_PAGE_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span>entries per page</span>
          </div>

          <div>
            Showing {filteredGroups.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredGroups.length)} of {filteredGroups.length}{' '}
            Invoice Groups
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <InvoiceGroupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
        initialGroup={editingGroup}
        clients={clients}
        courierServices={courierServices}
        nextSequenceNo={nextSequenceNo}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Invoice Group?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to soft-delete the invoice group{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                "{groupToDelete.groupName}"
              </strong>{' '}
              (Sequence #{groupToDelete.sequenceNo}) and all its associated detail mappings?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setGroupToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
