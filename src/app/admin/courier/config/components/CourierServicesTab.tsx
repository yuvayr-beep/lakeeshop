'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Search, RefreshCw, Loader2, 
  Layers, ChevronLeft, ChevronRight, Tag, ShieldCheck
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { CourierPartner } from '@/types/courier';
import { CourierService } from '@/types/courierService';
import CourierServiceModal from './CourierServiceModal';
import CourierServiceDeleteModal from './CourierServiceDeleteModal';

interface CourierServicesTabProps {
  courier: CourierPartner | null;
}

const PER_PAGE = 10;

export default function CourierServicesTab({ courier }: CourierServicesTabProps) {
  const [services, setServices] = useState<CourierService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // UI Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal States
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<CourierService | null>(null);

  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [serviceToDelete, setServiceToDelete] = useState<CourierService | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // NDJSON Parser Helper
  const parseServicesResponse = (raw: any): CourierService[] => {
    if (typeof raw === 'string') {
      const parsed: CourierService[] = [];
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            parsed.push(JSON.parse(trimmed));
          } catch (e) {
            console.error('Error parsing NDJSON line:', trimmed, e);
          }
        }
      });
      return parsed;
    }
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.data)) return raw.data;
      if (raw.data && typeof raw.data === 'object') return [raw.data];
    }
    return [];
  };

  // Fetch Services API
  const fetchServices = useCallback(async () => {
    if (!courier?.id) return;
    setLoading(true);
    setError('');

    try {
      const res = await axiosInstance.get(`/courier/services/courier/${courier.id}`, {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson' },
      });
      const parsed = parseServicesResponse(res.data);
      setServices(parsed);
    } catch (err: any) {
      console.error('Failed to load courier services:', err);
      setError('Failed to load courier services.');
      toast.error('Failed to load courier services');
    } finally {
      setLoading(false);
    }
  }, [courier?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filter logic
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (s.serviceCode && s.serviceCode.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (s.serviceName && s.serviceName.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchesType = typeFilter === 'ALL' || s.serviceType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [services, searchQuery, typeFilter]);

  // Paginated list
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE;
    return filteredServices.slice(start, start + PER_PAGE);
  }, [filteredServices, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PER_PAGE));

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const handleCreate = () => {
    setEditingService(null);
    setModalOpen(true);
  };

  const handleEdit = (service: CourierService) => {
    setEditingService(service);
    setModalOpen(true);
  };

  const handleDelete = (service: CourierService) => {
    setServiceToDelete(service);
    setDeleteOpen(true);
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'SURFACE':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'DP':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'BOTH':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search service code, name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {['ALL', 'SURFACE', 'DP', 'BOTH'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  typeFilter === type
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={fetchServices}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Refresh Services"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:opacity-95"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus size={16} />
            Add Service
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Service Code</th>
                <th className="p-4">Service Name</th>
                <th className="p-4">Service Type</th>
                <th className="p-4">Description</th>
                <th className="p-4">Attributes</th>
                <th className="p-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
                      <span className="text-xs font-semibold">Loading courier services...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Services Configured</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery || typeFilter !== 'ALL'
                          ? 'No services match the active filters.'
                          : 'Click "Add Service" to setup shipping modes for this courier partner.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedServices.map((service, idx) => {
                  const sno = (currentPage - 1) * PER_PAGE + idx + 1;
                  return (
                    <tr key={service.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{sno}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--primary-light-bg)] text-[var(--primary)] inline-block">
                          {service.serviceCode}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-white">
                        {service.serviceName}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getTypeBadgeClass(
                            service.serviceType
                          )}`}
                        >
                          {service.serviceType}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {service.description || '-'}
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {service.attributes || '-'}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(service)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Edit Service"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(service)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Service"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {filteredServices.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500">
            <span>
              Showing <strong>{paginatedServices.length}</strong> of <strong>{filteredServices.length}</strong> services
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CourierServiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchServices}
        courier={courier}
        serviceToEdit={editingService}
      />

      <CourierServiceDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={fetchServices}
        serviceToDelete={serviceToDelete}
      />
    </div>
  );
}
