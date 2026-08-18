'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Loader2, FileText, CheckCircle2, AlertTriangle, Layers, Building2, Package, Truck, Compass } from 'lucide-react';
import { toast } from 'sonner';
import {
  InvoiceGroup,
  InvoiceGroupDetail,
  ClientItem,
  ClientProgram,
  CourierServiceItem,
  CreateInvoiceGroupPayload,
  EditInvoiceGroupPayload,
} from '@/types/invoiceGroup';
import { invoiceGroupService } from '@/services/invoiceGroup.service';

interface InvoiceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialGroup?: InvoiceGroup | null;
  clients: ClientItem[];
  courierServices: CourierServiceItem[];
  nextSequenceNo: number;
}

interface DetailFormRow {
  id?: number;
  clientId: number | '';
  programId: number | '';
  courierServiceId: number | '';
  shipMode: string;
  // Metadata for rendering
  hasProgram?: boolean;
  businessUnitId?: number;
  loadingPrograms?: boolean;
  programsList?: ClientProgram[];
}

export default function InvoiceGroupModal({
  isOpen,
  onClose,
  onSuccess,
  initialGroup,
  clients,
  courierServices,
  nextSequenceNo,
}: InvoiceGroupModalProps) {
  const isEdit = Boolean(initialGroup?.id);

  // Main Form State
  const [groupName, setGroupName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [sequenceNo, setSequenceNo] = useState<number>(1);

  // Dynamic details array
  const [detailRows, setDetailRows] = useState<DetailFormRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Programs cache keyed by businessUnitId
  const [buProgramsCache, setBuProgramsCache] = useState<Record<number, ClientProgram[]>>({});

  // Helper to fetch programs for a business unit ID
  const fetchProgramsForBu = useCallback(
    async (buId: number): Promise<ClientProgram[]> => {
      if (buProgramsCache[buId]) return buProgramsCache[buId];
      try {
        const progs = await invoiceGroupService.getClientPrograms(buId);
        setBuProgramsCache((prev) => ({ ...prev, [buId]: progs }));
        return progs;
      } catch (err) {
        console.error(`Failed to load programs for businessUnit ${buId}:`, err);
        return [];
      }
    },
    [buProgramsCache]
  );

  // Initialize Modal state when opening or initialGroup changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialGroup) {
      setGroupName(initialGroup.groupName || '');
      setRemarks(initialGroup.remarks || '');
      setSequenceNo(initialGroup.sequenceNo ?? 1);

      // Pre-fill details
      if (initialGroup.details && initialGroup.details.length > 0) {
        const mappedRows: DetailFormRow[] = initialGroup.details.map((d) => {
          const client = clients.find((c) => c.id === d.clientId);
          const bu = client?.businessUnits?.[0];
          const hasProg = Boolean(bu?.hasProgram);

          return {
            id: d.id,
            clientId: d.clientId,
            programId: d.programId,
            courierServiceId: d.courierServiceId,
            shipMode: d.shipMode || 'SURFACE',
            hasProgram: hasProg,
            businessUnitId: bu?.id,
            loadingPrograms: false,
            programsList: [],
          };
        });

        setDetailRows(mappedRows);

        // Fetch programs for rows with business units that have programs
        mappedRows.forEach(async (row, idx) => {
          if (row.hasProgram && row.businessUnitId) {
            setDetailRows((prev) =>
              prev.map((r, i) => (i === idx ? { ...r, loadingPrograms: true } : r))
            );
            const progs = await fetchProgramsForBu(row.businessUnitId);
            setDetailRows((prev) =>
              prev.map((r, i) =>
                i === idx ? { ...r, loadingPrograms: false, programsList: progs } : r
              )
            );
          }
        });
      } else {
        setDetailRows([createEmptyRow()]);
      }
    } else {
      // Create mode defaults
      setGroupName('');
      setRemarks('');
      setSequenceNo(nextSequenceNo || 1);
      setDetailRows([createEmptyRow()]);
    }
  }, [isOpen, initialGroup, clients, nextSequenceNo, fetchProgramsForBu]);

  const createEmptyRow = (): DetailFormRow => {
    const defaultClient = clients.length > 0 ? clients[0] : null;
    const defaultBu = defaultClient?.businessUnits?.[0];
    const defaultCourier = courierServices.length > 0 ? courierServices[0] : null;

    return {
      clientId: defaultClient ? defaultClient.id : '',
      programId: 0,
      courierServiceId: defaultCourier ? defaultCourier.id : '',
      shipMode: defaultCourier ? defaultCourier.serviceType || 'SURFACE' : 'SURFACE',
      hasProgram: Boolean(defaultBu?.hasProgram),
      businessUnitId: defaultBu?.id,
      loadingPrograms: false,
      programsList: [],
    };
  };

  // Handle Client Selection Change for a row
  const handleClientChange = async (index: number, clientIdNum: number) => {
    const selectedClient = clients.find((c) => c.id === clientIdNum);
    const bu = selectedClient?.businessUnits?.[0];
    const hasProg = Boolean(bu?.hasProgram);

    // Update row state
    setDetailRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              clientId: clientIdNum,
              programId: hasProg ? '' : 0,
              hasProgram: hasProg,
              businessUnitId: bu?.id,
              programsList: [],
              loadingPrograms: hasProg && Boolean(bu?.id),
            }
          : row
      )
    );

    if (hasProg && bu?.id) {
      const progs = await fetchProgramsForBu(bu.id);
      setDetailRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                loadingPrograms: false,
                programsList: progs,
                programId: progs.length > 0 ? progs[0].id : '',
              }
            : row
        )
      );
    }
  };

  // Handle Courier Service Change for a row
  const handleCourierServiceChange = (index: number, courierServiceIdNum: number) => {
    const selectedService = courierServices.find((cs) => cs.id === courierServiceIdNum);
    const mode = selectedService?.serviceType || 'SURFACE';

    setDetailRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              courierServiceId: courierServiceIdNum,
              shipMode: mode,
            }
          : row
      )
    );
  };

  // Add new detail row
  const handleAddRow = () => {
    setDetailRows((prev) => [...prev, createEmptyRow()]);
  };

  // Remove detail row
  const handleRemoveRow = (index: number) => {
    if (detailRows.length <= 1) {
      toast.warning('At least one group detail mapping is required');
      return;
    }
    setDetailRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error('Please enter a Group Name');
      return;
    }

    if (detailRows.length === 0) {
      toast.error('At least one detail mapping is required');
      return;
    }

    // Validate details rows
    for (let idx = 0; idx < detailRows.length; idx++) {
      const row = detailRows[idx];
      if (!row.clientId) {
        toast.error(`Row #${idx + 1}: Please select a Client`);
        return;
      }
      if (row.hasProgram && (row.programId === '' || row.programId === null)) {
        toast.error(`Row #${idx + 1}: Please select a Program for the selected Client`);
        return;
      }
      if (!row.courierServiceId) {
        toast.error(`Row #${idx + 1}: Please select a Courier Service`);
        return;
      }
    }

    setSaving(true);
    try {
      const formattedDetails = detailRows.map((r) => ({
        ...(isEdit && r.id ? { id: r.id } : {}),
        clientId: Number(r.clientId),
        programId: Number(r.programId || 0),
        courierServiceId: Number(r.courierServiceId),
        shipMode: r.shipMode || 'SURFACE',
      }));

      if (isEdit && initialGroup?.id) {
        const payload: EditInvoiceGroupPayload = {
          groupName: groupName.trim(),
          remarks: remarks.trim(),
          sequenceNo: Number(sequenceNo),
          details: formattedDetails,
        };

        await invoiceGroupService.updateInvoiceGroup(initialGroup.id, payload);
        toast.success('Invoice Group updated successfully!');
      } else {
        const payload: CreateInvoiceGroupPayload = {
          groupName: groupName.trim(),
          remarks: remarks.trim(),
          sequenceNo: Number(sequenceNo),
          details: formattedDetails,
        };

        await invoiceGroupService.createInvoiceGroup(payload);
        toast.success('Invoice Group created successfully!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Invoice group submit error:', err);
      const errMsg =
        err?.response?.data?.message || err?.message || 'Failed to save Invoice Group';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {isEdit ? 'Edit Invoice Group' : 'Create New Invoice Group'}
              </h3>
              <p className="text-xs text-blue-100/90">
                Configure grouping, sequence numbers, client-program and courier service rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Axis - Delhivery - SURFACE"
                required
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sequence Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={sequenceNo}
                onChange={(e) => setSequenceNo(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Remarks / Description
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Standard surface delivery for Axis orders"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Details Mapping Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Group Detail Mappings ({detailRows.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              >
                <Plus className="h-4 w-4" />
                <span>Add Detail Row</span>
              </button>
            </div>

            {/* List of Details Rows */}
            <div className="space-y-3">
              {detailRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 rounded-full">
                      Mapping Rule #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={detailRows.length <= 1}
                      className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Client Selector */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Client <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={row.clientId}
                        onChange={(e) => handleClientChange(idx, Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">-- Select Client --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName} ({c.clientCode}) [ID: {c.id}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Program Selector */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Program {row.hasProgram ? <span className="text-red-500">*</span> : null}
                      </label>
                      {row.hasProgram ? (
                        row.loadingPrograms ? (
                          <div className="flex items-center space-x-2 py-1 text-xs text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            <span>Loading programs...</span>
                          </div>
                        ) : (
                          <select
                            value={row.programId}
                            onChange={(e) =>
                              setDetailRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, programId: Number(e.target.value) } : r
                                )
                              )
                            }
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="">-- Select Program --</option>
                            {row.programsList && row.programsList.length > 0 ? (
                              row.programsList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.programName} ({p.programCode})
                                </option>
                              ))
                            ) : (
                              <option value="0">Default Program (0)</option>
                            )}
                          </select>
                        )
                      ) : (
                        <div className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800">
                          N/A (No Program Required)
                        </div>
                      )}
                    </div>

                    {/* Courier Service Selector */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Courier Service <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={row.courierServiceId}
                        onChange={(e) => handleCourierServiceChange(idx, Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">-- Select Service --</option>
                        {courierServices.map((cs) => (
                          <option key={cs.id} value={cs.id}>
                            {cs.serviceName} ({cs.serviceCode}) [{cs.serviceType}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ship Mode */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Ship Mode <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={row.shipMode}
                        onChange={(e) =>
                          setDetailRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, shipMode: e.target.value } : r))
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs font-semibold uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="SURFACE">SURFACE</option>
                        <option value="DP">DP</option>
                        <option value="EXPRESS">EXPRESS</option>
                        <option value="AIR">AIR</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isEdit ? 'Update Group' : 'Create Group'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
