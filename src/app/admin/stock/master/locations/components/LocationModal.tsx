'use client';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface Location {
  id: number;
  warehouseId: number | null;
  warehouseName: string | null;
  locationCode: string | null;
  rackNo: string | null;
  shelfNo: string | null;
  binNo: string | null;
  zoneName: string | null;
  locationType: number | null;
  description: string | null;
  capacityWeight: number | null;
  capacityVolume: number | null;
  status: boolean;
}

interface Warehouse {
  id: number;
  name: string;
}

interface LocationType {
  code: number;
  name: string;
}

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  locationItem: Location | null;
  locationTypes: LocationType[];
  onSuccess: () => void;
}

export default function LocationModal({
  open,
  onClose,
  locationItem,
  locationTypes: initialLocationTypes,
  onSuccess,
}: LocationModalProps) {
  const isEdit = !!locationItem;

  // Form fields
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [locationCode, setLocationCode] = useState<string>('');
  const [rackNo, setRackNo] = useState<string>('');
  const [shelfNo, setShelfNo] = useState<string>('');
  const [binNo, setBinNo] = useState<string>('');
  const [zoneName, setZoneName] = useState<string>('');
  const [locationType, setLocationType] = useState<string>('1');
  const [description, setDescription] = useState<string>('');
  const [capacityWeight, setCapacityWeight] = useState<string>('');
  const [capacityVolume, setCapacityVolume] = useState<string>('');

  // Loader and Dropdown lists states
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [types, setTypes] = useState<LocationType[]>(initialLocationTypes);

  // Parse NDJSON helper for warehouses
  const parseNdjson = (rawString: string): Warehouse[] => {
    const parsed: Warehouse[] = [];
    rawString.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          parsed.push(JSON.parse(trimmed));
        } catch (e) {
          console.error(e);
        }
      }
    });
    return parsed;
  };

  // Fetch active warehouses and location types
  useEffect(() => {
    if (open) {
      // 1. Fetch Warehouses
      setLoadingWarehouses(true);
      axiosInstance
        .get('/stock/warehouse/active', { headers: { Accept: 'application/x-ndjson' } })
        .then((res) => {
          const list = parseNdjson(res.data || '');
          setWarehouses(list);
          if (list.length > 0 && !warehouseId && !isEdit) {
            setWarehouseId(String(list[0].id));
          }
        })
        .catch((err) => {
          console.error('Failed to load warehouses:', err);
          toast.error('Failed to load active warehouses');
        })
        .finally(() => setLoadingWarehouses(false));

      // 2. Fetch Location types if parent didn't load them
      if (types.length === 0) {
        axiosInstance
          .get('/stock/location/types')
          .then((res) => {
            if (Array.isArray(res.data)) {
              setTypes(res.data);
            }
          })
          .catch((err) => console.error('Failed to load location types:', err));
      }
    }
  }, [open]);

  // Sync form states with editing item
  useEffect(() => {
    if (open) {
      if (locationItem) {
        setWarehouseId(locationItem.warehouseId ? String(locationItem.warehouseId) : '');
        setLocationCode(locationItem.locationCode || '');
        setRackNo(locationItem.rackNo || '');
        setShelfNo(locationItem.shelfNo || '');
        setBinNo(locationItem.binNo || '');
        setZoneName(locationItem.zoneName || '');
        setLocationType(locationItem.locationType ? String(locationItem.locationType) : '1');
        setDescription(locationItem.description || '');
        setCapacityWeight(locationItem.capacityWeight !== null ? String(locationItem.capacityWeight) : '');
        setCapacityVolume(locationItem.capacityVolume !== null ? String(locationItem.capacityVolume) : '');
      } else {
        setWarehouseId(warehouses.length > 0 ? String(warehouses[0].id) : '');
        setLocationCode('');
        setRackNo('');
        setShelfNo('');
        setBinNo('');
        setZoneName('');
        setLocationType('1');
        setDescription('');
        setCapacityWeight('');
        setCapacityVolume('');
      }
    }
  }, [open, locationItem, warehouses]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId) {
      toast.error('Warehouse selection is required');
      return;
    }
    if (!locationCode.trim()) {
      toast.error('Location code is required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(isEdit ? 'Updating location configuration...' : 'Creating new storage location...');

    const payload = {
      warehouseId: Number(warehouseId),
      locationCode: locationCode.trim(),
      rackNo: rackNo.trim() || null,
      shelfNo: shelfNo.trim() || null,
      binNo: binNo.trim() || null,
      zoneName: zoneName.trim() || null,
      locationType: Number(locationType),
      description: description.trim() || null,
      capacityWeight: capacityWeight ? Number(capacityWeight) : null,
      capacityVolume: capacityVolume ? Number(capacityVolume) : null,
    };

    try {
      if (isEdit && locationItem) {
        await axiosInstance.put(`/stock/location/${locationItem.id}`, payload);
        toast.success('Storage location updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/stock/location', payload);
        toast.success('Storage location created successfully!', { id: toastId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Failed to save storage location details.';
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'string') {
          errMsg = data;
        } else if (typeof data === 'object') {
          errMsg = data.message || data.error || data.details || JSON.stringify(data);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {isEdit ? 'Edit Storage Location' : 'Create Storage Location'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isEdit ? `Modifying Location ID: #${locationItem?.id}` : 'Map out racks, shelves, and storage layout metrics.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Warehouse Select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={warehouseId}
                required
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={loadingWarehouses}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-805 dark:text-slate-200 font-medium cursor-pointer"
              >
                {loadingWarehouses && warehouses.length === 0 ? (
                  <option value="">Loading warehouses...</option>
                ) : (
                  warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Location Code */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Location Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. LOC001"
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Zone Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Zone Name
              </label>
              <input
                type="text"
                placeholder="e.g. RAH or ZONE-A"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Location Type Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Location Type <span className="text-red-500">*</span>
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-805 dark:text-slate-200 font-medium cursor-pointer"
              >
                {types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rack No */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Rack Number
              </label>
              <input
                type="text"
                placeholder="e.g. 1"
                value={rackNo}
                onChange={(e) => setRackNo(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Shelf No */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Shelf Number
              </label>
              <input
                type="text"
                placeholder="e.g. 2"
                value={shelfNo}
                onChange={(e) => setShelfNo(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Bin No */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Bin Number
              </label>
              <input
                type="text"
                placeholder="e.g. 1"
                value={binNo}
                onChange={(e) => setBinNo(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Capacity Weight */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Capacity Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 100"
                value={capacityWeight}
                onChange={(e) => setCapacityWeight(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Capacity Volume */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
                Capacity Volume (Litres)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 150"
                value={capacityVolume}
                onChange={(e) => setCapacityVolume(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Pallet slot in upper bay..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 font-medium resize-none leading-relaxed"
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-650 dark:text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isEdit ? 'Update location' : 'Save location'}
          </button>
        </div>

      </div>
    </div>
  );
}
