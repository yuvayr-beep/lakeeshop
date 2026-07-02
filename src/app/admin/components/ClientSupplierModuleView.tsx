'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  User, Building2, MapPin, Users, CreditCard, FileText, Percent, 
  Mail, History, Plus, Search, Trash2, Edit2, Eye, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, Image as ImageIcon, ShieldCheck, CheckCircle2, 
  AlertTriangle, Globe, Phone, ExternalLink, ChevronDown, Check, X, Info, Download,
  RefreshCw, Package, AlertCircle
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectClient, clearSelectedClient, Client } from '@/redux/slices/clientSlice';
import { selectSupplier, clearSelectedSupplier, Supplier } from '@/redux/slices/supplierSlice';
import ClientModal from '../clients/components/ClientModal';
import SupplierModal from '../suppliers/components/SupplierModal';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import Badge from '@/components/ui/Badge';

interface ViewProps {
  type: 'client' | 'supplier';
  tab: string;
}

const parseNdjson = (raw: string): any[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const cleanStr = dateStr.replace('Z', '');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr.replace('T', ' ').split('.')[0];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return dateStr;
  }
};

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: 'asc' | 'desc' }) {
  if (col !== sortCol) return <ArrowUpDown size={11} className="text-black dark:text-slate-400 ml-1" />;
  return sortDir === 'asc'
    ? <ArrowUp size={11} className="text-blue-600 ml-1" />
    : <ArrowDown size={11} className="text-blue-600 ml-1" />;
}

export default function ClientSupplierModuleView({ type, tab }: ViewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Redux selected client state
  const selectedClientId = useAppSelector((state) => state.client.selectedClientId);
  const selectedClient = useAppSelector((state) => state.client.selectedClient);

  // Redux selected supplier state
  const selectedSupplierId = useAppSelector((state) => state.supplier.selectedSupplierId);
  const selectedSupplier = useAppSelector((state) => state.supplier.selectedSupplier);

  // Unified active state variables
  const activeId = type === 'client' ? selectedClientId : selectedSupplierId;
  const activeEntity = type === 'client' ? selectedClient : selectedSupplier;

  // Client list and search states
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

  // Supplier list states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  // Table sorting & pagination
  const [sortCol, setSortCol] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Selected Client edit form states
  const [editClientCode, setEditClientCode] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Selected Supplier edit form states
  const [editSupplierCode, setEditSupplierCode] = useState('');
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editSupplierLegalName, setEditSupplierLegalName] = useState('');
  const [editSupplierCategoryId, setEditSupplierCategoryId] = useState<number | ''>('');
  const [editSupplierGstType, setEditSupplierGstType] = useState('CGST_SGST');
  const [editSupplierGstin, setEditSupplierGstin] = useState('');
  const [editSupplierPan, setEditSupplierPan] = useState('');
  const [editSupplierWebsite, setEditSupplierWebsite] = useState('');
  const [editSupplierLeadDays, setEditSupplierLeadDays] = useState<number>(0);
  const [editSupplierDiscountPercent, setEditSupplierDiscountPercent] = useState<number>(0);
  const [editSupplierUsesOwnProductCode, setEditSupplierUsesOwnProductCode] = useState(false);
  const [editSupplierPaymentTermsDays, setEditSupplierPaymentTermsDays] = useState<number>(0);
  const [editSupplierCreditLimit, setEditSupplierCreditLimit] = useState<number>(0);
  const [editSupplierPreferredSupplier, setEditSupplierPreferredSupplier] = useState(false);
  const [editSupplierRemarks, setEditSupplierRemarks] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);

  // Define side tabs depending on type
  const clientTabs = [
    { code: 'profile', title: 'Profile', icon: User, desc: 'Company profile details' },
    { code: 'business-unit', title: 'Business Unit', icon: Building2, desc: 'Branches & business units' },
    { code: 'address', title: 'Address', icon: MapPin, desc: 'Billing & shipping addresses' },
    { code: 'contacts', title: 'Contacts', icon: Users, desc: 'Key contact persons' },
    { code: 'banks', title: 'Banks', icon: CreditCard, desc: 'Payment bank accounts' },
    { code: 'documents', title: 'Documents', icon: FileText, desc: 'Compliance & attachments' },
    { code: 'tax', title: 'Tax', icon: Percent, desc: 'GST & registration info' },
  ];

  const supplierTabs = [
    { code: 'profile', title: 'Profile', icon: User, desc: 'Supplier profile details' },
    { code: 'address', title: 'Address', icon: MapPin, desc: 'Office & warehouse locations' },
    { code: 'contacts', title: 'Contacts', icon: Users, desc: 'Key contact persons' },
    { code: 'banks', title: 'Banks', icon: CreditCard, desc: 'Remittance bank accounts' },
    { code: 'documents', title: 'Documents', icon: FileText, desc: 'Agreements & certifications' },
    { code: 'emails', title: 'Emails', icon: Mail, desc: 'Communication logs' },
    { code: 'status-logs', title: 'Status Logs', icon: History, desc: 'System status audits' },
    { code: 'tax', title: 'Tax', icon: Percent, desc: 'Tax configuration' },
  ];

  const activeTabs = type === 'client' ? clientTabs : supplierTabs;
  const activeTabDetails = activeTabs.find(t => t.code === tab) || activeTabs[0];

  // Fetch clients for list view
  const fetchClients = useCallback(async () => {
    if (type !== 'client') return;
    setLoadingClients(true);
    try {
      const response = await axiosInstance.get<string>('/client', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data) as Client[];
      setClients(parsed);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      toast.error('Failed to load clients list.');
    } finally {
      setLoadingClients(false);
    }
  }, [type]);

  // Fetch suppliers for list view
  const fetchSuppliers = useCallback(async () => {
    if (type !== 'supplier') return;
    setLoadingSuppliers(true);
    try {
      const response = await axiosInstance.get<string>('/vendor/suppliers', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data) as Supplier[];
      setSuppliers(parsed);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      toast.error('Failed to load suppliers list.');
    } finally {
      setLoadingSuppliers(false);
    }
  }, [type]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await axiosInstance.get<string>('/vendor/supplier-categories', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(res.data);
      setCategories(parsed);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    if (type === 'client' && !selectedClientId) {
      fetchClients();
    }
    if (type === 'supplier' && !selectedSupplierId) {
      fetchSuppliers();
    }
  }, [type, selectedClientId, selectedSupplierId, fetchClients, fetchSuppliers]);

  useEffect(() => {
    if (type === 'supplier') {
      fetchCategories();
    }
  }, [type, fetchCategories]);

  // Synchronize form fields when selectedClient updates
  useEffect(() => {
    if (selectedClient && tab === 'profile') {
      setEditClientCode(selectedClient.clientCode || '');
      setEditClientName(selectedClient.clientName || '');
      setEditLegalName(selectedClient.legalName || '');
      setEditLogoUrl(selectedClient.logoUrl || '');
      setEditRemarks(selectedClient.remarks || '');
    }
  }, [selectedClient, tab]);

  // Synchronize form fields when selectedSupplier updates
  useEffect(() => {
    if (selectedSupplier && tab === 'profile') {
      setEditSupplierCode(selectedSupplier.supplierCode || '');
      setEditSupplierName(selectedSupplier.name || '');
      setEditSupplierLegalName(selectedSupplier.legalName || '');
      setEditSupplierCategoryId(selectedSupplier.categoryId || '');
      setEditSupplierGstType(selectedSupplier.gstType || 'CGST_SGST');
      setEditSupplierGstin(selectedSupplier.gstin || '');
      setEditSupplierPan(selectedSupplier.pan || '');
      setEditSupplierWebsite(selectedSupplier.website || '');
      setEditSupplierLeadDays(selectedSupplier.leadDays || 0);
      setEditSupplierDiscountPercent(selectedSupplier.defaultDiscountPercent || 0);
      setEditSupplierUsesOwnProductCode(selectedSupplier.usesOwnProductCode || false);
      setEditSupplierPaymentTermsDays(selectedSupplier.paymentTermsDays || 0);
      setEditSupplierCreditLimit(selectedSupplier.creditLimit || 0);
      setEditSupplierPreferredSupplier(selectedSupplier.preferredSupplier || false);
      setEditSupplierRemarks(selectedSupplier.remarks || '');
    }
  }, [selectedSupplier, tab]);

  // Handle selected client profile edit save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    if (!editClientCode.trim()) {
      toast.error('Client Code is required');
      return;
    }
    if (!editClientName.trim()) {
      toast.error('Client Name is required');
      return;
    }
    if (!editLegalName.trim()) {
      toast.error('Legal Name is required');
      return;
    }

    setSavingProfile(true);
    const toastId = toast.loading('Saving changes...');

    const payload = {
      clientCode: editClientCode.trim(),
      clientName: editClientName.trim(),
      legalName: editLegalName.trim(),
      logoUrl: editLogoUrl.trim() || null,
      remarks: editRemarks.trim() || null,
    };

    try {
      const response = await axiosInstance.put(`/client/${selectedClient.id}`, payload);
      const updatedClient = response.data.data || { ...selectedClient, ...payload };
      dispatch(selectClient(updatedClient));
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile.', { id: toastId });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle selected supplier profile edit save
  const handleSupplierProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    if (!editSupplierName.trim()) {
      toast.error('Supplier Name is required');
      return;
    }
    if (!editSupplierLegalName.trim()) {
      toast.error('Legal Name is required');
      return;
    }

    setSavingProfile(true);
    const toastId = toast.loading('Saving changes...');

    const payload = {
      name: editSupplierName.trim(),
      legalName: editSupplierLegalName.trim(),
      categoryId: editSupplierCategoryId || null,
      gstType: editSupplierGstType,
      gstin: editSupplierGstin.trim() || null,
      pan: editSupplierPan.trim() || null,
      website: editSupplierWebsite.trim() || null,
      leadDays: editSupplierLeadDays,
      defaultDiscountPercent: editSupplierDiscountPercent,
      usesOwnProductCode: editSupplierUsesOwnProductCode,
      paymentTermsDays: editSupplierPaymentTermsDays,
      creditLimit: editSupplierCreditLimit,
      preferredSupplier: editSupplierPreferredSupplier,
      remarks: editSupplierRemarks.trim() || null,
      status: selectedSupplier.status
    };

    try {
      const response = await axiosInstance.put(`/vendor/suppliers/${selectedSupplier.id}`, payload);
      const updatedSupplier = response.data.data || { ...selectedSupplier, ...payload };
      dispatch(selectSupplier(updatedSupplier));
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile.', { id: toastId });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle client delete
  const handleDeleteClient = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    const toastId = toast.loading('Deleting client...');
    try {
      await axiosInstance.delete(`/client/${id}`);
      toast.success('Client deleted successfully', { id: toastId });
      fetchClients();
      if (selectedClientId === id) {
        dispatch(clearSelectedClient());
      }
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast.error('Failed to delete client.', { id: toastId });
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedClientIds.length} selected clients?`)) return;
    const toastId = toast.loading(`Deleting ${selectedClientIds.length} clients...`);
    try {
      await Promise.all(
        selectedClientIds.map((id) =>
          axiosInstance.delete(`/client/${id}`)
        )
      );
      toast.success(`Deleted ${selectedClientIds.length} clients`, { id: toastId });
      setSelectedClientIds([]);
      fetchClients();
    } catch (err) {
      console.warn('Backend API delete failed:', err);
      toast.error('Failed to delete selected clients.', { id: toastId });
      fetchClients();
    }
  };

  // Handle supplier delete (status: 0)
  const handleDeleteSupplier = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    const toastId = toast.loading('Deleting supplier...');
    try {
      const supp = suppliers.find(s => s.id === id);
      if (supp) {
        const payload = {
          name: supp.name,
          legalName: supp.legalName,
          gstin: supp.gstin || null,
          pan: supp.pan || null,
          website: supp.website || null,
          gstType: supp.gstType || 'CGST_SGST',
          categoryId: supp.categoryId || null,
          leadDays: supp.leadDays || 0,
          defaultDiscountPercent: supp.defaultDiscountPercent || 0,
          usesOwnProductCode: supp.usesOwnProductCode || false,
          paymentTermsDays: supp.paymentTermsDays || 0,
          creditLimit: supp.creditLimit || 0,
          preferredSupplier: supp.preferredSupplier || false,
          remarks: supp.remarks || null,
          status: 0
        };
        await axiosInstance.put(`/vendor/suppliers/${id}`, payload);
        toast.success('Supplier deleted successfully', { id: toastId });
        fetchSuppliers();
        if (selectedSupplierId === id) {
          dispatch(clearSelectedSupplier());
        }
      } else {
        throw new Error('Supplier not found locally');
      }
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      toast.error('Failed to delete supplier.', { id: toastId });
    }
  };

  const handleDeleteSelectedSuppliers = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedSupplierIds.length} selected suppliers?`)) return;
    const toastId = toast.loading(`Deleting ${selectedSupplierIds.length} suppliers...`);
    try {
      await Promise.all(
        selectedSupplierIds.map(async (id) => {
          const supp = suppliers.find(s => s.id === id);
          if (supp) {
            const payload = {
              name: supp.name,
              legalName: supp.legalName,
              gstin: supp.gstin || null,
              pan: supp.pan || null,
              website: supp.website || null,
              gstType: supp.gstType || 'CGST_SGST',
              categoryId: supp.categoryId || null,
              leadDays: supp.leadDays || 0,
              defaultDiscountPercent: supp.defaultDiscountPercent || 0,
              usesOwnProductCode: supp.usesOwnProductCode || false,
              paymentTermsDays: supp.paymentTermsDays || 0,
              creditLimit: supp.creditLimit || 0,
              preferredSupplier: supp.preferredSupplier || false,
              remarks: supp.remarks || null,
              status: 0
            };
            await axiosInstance.put(`/vendor/suppliers/${id}`, payload);
          }
        })
      );
      toast.success(`Deleted ${selectedSupplierIds.length} suppliers`, { id: toastId });
      setSelectedSupplierIds([]);
      fetchSuppliers();
    } catch (err) {
      console.warn('Backend API delete failed:', err);
      toast.error('Failed to delete selected suppliers.', { id: toastId });
      fetchSuppliers();
    }
  };

  // Sort & filter list
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortedClients = useMemo(() => {
    let result = [...clients];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.clientName.toLowerCase().includes(q) || 
        c.clientCode.toLowerCase().includes(q) || 
        c.legalName.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let valA = a[sortCol as keyof Client];
      let valB = b[sortCol as keyof Client];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'string') {
        return sortDir === 'asc' 
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      }
      if (typeof valA === 'number') {
        return sortDir === 'asc'
          ? valA - (valB as number)
          : (valB as number) - valA;
      }
      return 0;
    });
    return result;
  }, [clients, searchQuery, sortCol, sortDir]);

  const paginatedClients = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedClients.slice(start, start + perPage);
  }, [sortedClients, page, perPage]);

  const totalPages = Math.ceil(sortedClients.length / perPage) || 1;

  // Single & Multi-selection checkbox handlers for clients
  const allPageIds = paginatedClients.map(c => c.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedClientIds.includes(id));
  const someSelected = allPageIds.some(id => selectedClientIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedClientIds(prev => prev.filter(id => !allPageIds.includes(id)));
    } else {
      setSelectedClientIds(prev => [...new Set([...prev, ...allPageIds])]);
    }
  };

  const toggleSelectOne = (id: number) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedClientIds(prev => [...prev, id]);
    }
  };

  // Supplier Memoized sorting, paging and handlers
  const sortedSuppliers = useMemo(() => {
    let result = [...suppliers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.name || '').toLowerCase().includes(q) || 
        (s.supplierCode || '').toLowerCase().includes(q) || 
        (s.legalName || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let valA = a[sortCol as keyof Supplier];
      let valB = b[sortCol as keyof Supplier];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'string') {
        return sortDir === 'asc' 
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      }
      if (typeof valA === 'number') {
        return sortDir === 'asc'
          ? valA - (valB as number)
          : (valB as number) - valA;
      }
      return 0;
    });
    return result;
  }, [suppliers, searchQuery, sortCol, sortDir]);

  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedSuppliers.slice(start, start + perPage);
  }, [sortedSuppliers, page, perPage]);

  const totalPagesSupp = Math.ceil(sortedSuppliers.length / perPage) || 1;

  // Single & Multi-selection checkbox handlers for suppliers
  const allPageSuppIds = paginatedSuppliers.map(s => s.id);
  const allSuppSelected = allPageSuppIds.length > 0 && allPageSuppIds.every(id => selectedSupplierIds.includes(id));
  const someSuppSelected = allPageSuppIds.some(id => selectedSupplierIds.includes(id));

  const toggleSelectAllSupp = () => {
    if (allSuppSelected) {
      setSelectedSupplierIds(prev => prev.filter(id => !allPageSuppIds.includes(id)));
    } else {
      setSelectedSupplierIds(prev => [...new Set([...prev, ...allPageSuppIds])]);
    }
  };

  const toggleSelectOneSupp = (id: number) => {
    if (selectedSupplierIds.includes(id)) {
      setSelectedSupplierIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedSupplierIds(prev => [...prev, id]);
    }
  };

  // Mock submenus data lists
  const businessUnits = [
    { name: 'Acme HQ', code: 'HQ-01', manager: 'John Doe', location: 'New York, US', status: 'Active' },
    { name: 'Acme Warehouse East', code: 'WH-02', manager: 'Jane Smith', location: 'Boston, US', status: 'Active' },
    { name: 'Acme Europe Hub', code: 'EU-03', manager: 'Pierre Dubois', location: 'Paris, FR', status: 'Inactive' }
  ];

  const addresses = [
    { type: 'Corporate Headquarter', street: '123 Corporate Way', city: 'New York', state: 'NY', zip: '10001', country: 'US', isPrimary: true },
    { type: 'Distribution Warehouse', street: '456 Industrial Blvd', city: 'Boston', state: 'MA', zip: '02101', country: 'US', isPrimary: false }
  ];

  const contacts = [
    { name: 'Sarah Connor', role: 'Purchasing Manager', email: 'sconnor@acme.com', phone: '+1 (555) 019-1111', department: 'Procurement' },
    { name: 'Miles Dyson', role: 'Technical Lead', email: 'mdyson@acme.com', phone: '+1 (555) 019-2222', department: 'Engineering' }
  ];

  const banks = [
    { bankName: 'Chase Bank', accountNo: '•••• •••• 5678', ifsc: 'CHASUS33XXX', branch: 'Wall Street', currency: 'USD', status: 'Primary' },
    { bankName: 'HSBC Bank', accountNo: '•••• •••• 9012', ifsc: 'MIDLGB21XXX', branch: 'London Main', currency: 'GBP', status: 'Secondary' }
  ];

  const documents = [
    { name: 'Certificate of Incorporation', type: 'PDF', size: '2.4 MB', date: '2026-01-15', status: 'Verified' },
    { name: 'Tax Exemption Certificate', type: 'PDF', size: '1.1 MB', date: '2026-03-10', status: 'Pending Review' },
    { name: 'Standard Terms & Conditions', type: 'DOCX', size: '512 KB', date: '2026-05-01', status: 'Verified' }
  ];

  const emails = [
    { subject: 'Dispatch Notice: Shipment #99218', date: '2026-06-30 14:30', sender: 'system@globallogistics.com', status: 'Delivered' },
    { subject: 'Rate Card Update Q3', date: '2026-06-28 09:15', sender: 'sales@globallogistics.com', status: 'Opened' },
    { subject: 'Urgent: Invoice Reconciliation Request', date: '2026-06-20 17:45', sender: 'accounts@globallogistics.com', status: 'Bounced' }
  ];

  const statusLogs = [
    { event: 'Onboarding approved by Admin', date: '2026-06-01 11:00', user: 'Admin User', remarks: 'All credentials check passed.' },
    { event: 'Supplier profile created', date: '2026-05-28 15:45', user: 'Self Onboarding', remarks: 'Awaiting document verification.' },
    { event: 'Tax parameters configured', date: '2026-05-28 16:02', user: 'System Agent', remarks: 'Linked to Zone-1 standard tax rates.' }
  ];

  // Render contents according to current tab
  const renderTabContent = () => {
    switch (tab) {
      case 'profile':
        if (type === 'client') {
          return (
            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">General Information</h3>
                  <p className="text-xs text-slate-400">View and update core business descriptors.</p>
                </div>
                <button 
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                >
                  <ShieldCheck size={14} />
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Client Code</label>
                  <input 
                    type="text" 
                    value={editClientCode} 
                    onChange={e => setEditClientCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Client Name</label>
                  <input 
                    type="text" 
                    value={editClientName} 
                    onChange={e => setEditClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Legal Name</label>
                  <input 
                    type="text" 
                    value={editLegalName} 
                    onChange={e => setEditLegalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Logo URL</label>
                  <input 
                    type="url" 
                    value={editLogoUrl} 
                    onChange={e => setEditLogoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Remarks</label>
                  <textarea 
                    value={editRemarks} 
                    onChange={e => setEditRemarks(e.target.value)}
                    rows={3}
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </form>
          );
        } else {
          return (
            <form onSubmit={handleSupplierProfileSave} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">Supplier General Information</h3>
                  <p className="text-xs text-slate-400">View and update core vendor descriptors.</p>
                </div>
                <button 
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                >
                  <ShieldCheck size={14} />
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Supplier Code</label>
                  <input 
                    type="text" 
                    disabled
                    value={editSupplierCode}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Supplier Name</label>
                  <input 
                    type="text" 
                    value={editSupplierName} 
                    onChange={e => setEditSupplierName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Legal Name</label>
                  <input 
                    type="text" 
                    value={editSupplierLegalName} 
                    onChange={e => setEditSupplierLegalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Supplier Category</label>
                  <select 
                    value={editSupplierCategoryId} 
                    onChange={e => setEditSupplierCategoryId(Number(e.target.value) || '')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">GST Type</label>
                  <select 
                    value={editSupplierGstType} 
                    onChange={e => setEditSupplierGstType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  >
                    <option value="CGST_SGST">LOCAL (CGST_SGST)</option>
                    <option value="IGST">IGST (Inter-State)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">GSTIN</label>
                  <input 
                    type="text" 
                    value={editSupplierGstin} 
                    onChange={e => setEditSupplierGstin(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">PAN No</label>
                  <input 
                    type="text" 
                    value={editSupplierPan} 
                    onChange={e => setEditSupplierPan(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Website URL</label>
                  <input 
                    type="url" 
                    value={editSupplierWebsite} 
                    onChange={e => setEditSupplierWebsite(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Lead Days</label>
                  <input 
                    type="number" 
                    value={editSupplierLeadDays} 
                    onChange={e => setEditSupplierLeadDays(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Default Discount (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editSupplierDiscountPercent} 
                    onChange={e => setEditSupplierDiscountPercent(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Terms (Days)</label>
                  <input 
                    type="number" 
                    value={editSupplierPaymentTermsDays} 
                    onChange={e => setEditSupplierPaymentTermsDays(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Credit Limit</label>
                  <input 
                    type="number" 
                    value={editSupplierCreditLimit} 
                    onChange={e => setEditSupplierCreditLimit(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="editSupplierUsesOwnProductCode"
                    checked={editSupplierUsesOwnProductCode} 
                    onChange={e => setEditSupplierUsesOwnProductCode(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-350 accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="editSupplierUsesOwnProductCode" className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                    Supplier has own product code
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="editSupplierPreferredSupplier"
                    checked={editSupplierPreferredSupplier} 
                    onChange={e => setEditSupplierPreferredSupplier(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-350 accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="editSupplierPreferredSupplier" className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                    Preferred Supplier
                  </label>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Remarks</label>
                  <textarea 
                    value={editSupplierRemarks} 
                    onChange={e => setEditSupplierRemarks(e.target.value)}
                    rows={3}
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </form>
          );
        }

      case 'business-unit':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Business Units</h3>
                <p className="text-xs text-slate-400">Manage office locations and cost centers.</p>
              </div>
              <button 
                type="button"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
              >
                <Plus size={14} /> Add Unit
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-100 dark:border-slate-850/30 rounded-xl overflow-hidden">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-3">Unit Name</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Manager</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-600 dark:text-slate-350">
                  {businessUnits.map((bu, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{bu.name}</td>
                      <td className="p-3">{bu.code}</td>
                      <td className="p-3">{bu.manager}</td>
                      <td className="p-3">{bu.location}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          bu.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {bu.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:text-blue-500 rounded transition-colors"><Edit2 size={13} /></button>
                        <button className="p-1 hover:text-red-500 rounded transition-colors"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'address':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Registered Addresses</h3>
                <p className="text-xs text-slate-400">Billing, dispatch and shipping centers.</p>
              </div>
              <button 
                type="button"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
              >
                <Plus size={14} /> Add Address
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr, idx) => (
                <div key={idx} className="relative p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between group hover:border-blue-500/40 dark:hover:border-blue-500/45 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-white">{addr.type}</span>
                      {addr.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {addr.street},<br />
                      {addr.city}, {addr.state} {addr.zip},<br />
                      {addr.country}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      <MapPin size={12} /> View on Map
                    </button>
                    <div className="space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white font-medium">Edit</button>
                      <button className="text-[11px] text-red-500 hover:text-red-600 font-medium">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Contacts & Representatives</h3>
                <p className="text-xs text-slate-400">Point of contacts for billing and logistics.</p>
              </div>
              <button 
                type="button"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
              >
                <Plus size={14} /> Add Contact
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.map((contact, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{contact.name}</h4>
                      <p className="text-[10px] text-slate-400">{contact.role} • <span className="font-medium">{contact.department}</span></p>
                    </div>
                    <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 truncate">
                        <Mail size={11} className="text-slate-400" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone size={11} className="text-slate-400" />
                        <span>{contact.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'banks':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Bank Accounts</h3>
                <p className="text-xs text-slate-400">Remittance credentials and banking information.</p>
              </div>
              <button 
                type="button"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
              >
                <Plus size={14} /> Add Bank Account
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {banks.map((bank, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-900/40 dark:to-slate-950/60 shadow-lg text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] group">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-300" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <h4 className="text-xs font-bold tracking-wide">{bank.bankName}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">{bank.branch} Branch</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">
                      {bank.status}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 z-10">
                    <p className="text-sm font-semibold tracking-widest">{bank.accountNo}</p>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <div>
                        <span>IFSC / SWIFT</span>
                        <p className="font-semibold text-white tracking-wider">{bank.ifsc}</p>
                      </div>
                      <div className="text-right">
                        <span>CURRENCY</span>
                        <p className="font-semibold text-white">{bank.currency}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Uploaded Documents</h3>
                <p className="text-xs text-slate-400">Compliance documentation, licenses, and contracts.</p>
              </div>
              <button 
                type="button"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
              >
                <Plus size={14} /> Upload Doc
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="p-3.5 pl-5">Document Name</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">File Size</th>
                      <th className="p-3.5">Uploaded Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-600 dark:text-slate-350">
                    {documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3.5 pl-5 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <FileText size={14} className="text-red-500" />
                          {doc.name}
                        </td>
                        <td className="p-3.5"><span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[10px]">{doc.type}</span></td>
                        <td className="p-3.5">{doc.size}</td>
                        <td className="p-3.5">{doc.date}</td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === 'Verified' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                          }`}>
                            <CheckCircle2 size={10} />
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right space-x-1.5">
                          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition-colors"><Download size={13} /></button>
                          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500 rounded transition-colors"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'tax':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Tax Configuration</h3>
                <p className="text-xs text-slate-400">GST, Permanent Account Number (PAN) and tax bracket profiles.</p>
              </div>
              <button 
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02]"
              >
                <ShieldCheck size={14} />
                Save Tax Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">GSTIN / Registration Number</label>
                <input 
                  type="text" 
                  defaultValue={type === 'client' ? '27AAAAA1111A1Z1' : '33BBBBB2222B2Z2'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">PAN Card Number</label>
                <input 
                  type="text" 
                  defaultValue={type === 'client' ? 'AAAAA1111A' : 'BBBBB2222B'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        );

      case 'emails':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Email Communication History</h3>
                <p className="text-xs text-slate-400">Recent email notifications, dispatch requests and logs.</p>
              </div>
            </div>

            <div className="space-y-3">
              {emails.map((email, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start justify-between gap-4 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-white truncate">{email.subject}</h4>
                      <span className={`px-2 py-0.25 rounded-full text-[9px] font-bold ${
                        email.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                        email.status === 'Opened' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600' : 'bg-red-50 dark:bg-red-950/20 text-red-600'
                      }`}>
                        {email.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Sender: {email.sender}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{email.date}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'status-logs':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Status Audit Logs</h3>
                <p className="text-xs text-slate-400">System generated audit timelines for onboarding and status transitions.</p>
              </div>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
              {statusLogs.map((log, idx) => (
                <div key={idx} className="relative group">
                  <span className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-blue-600" />
                  <div>
                    <span className="text-[10px] text-slate-400">{log.date}</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{log.event}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.remarks}</p>
                    <span className="inline-block text-[10px] text-slate-400 font-medium mt-1">By: {log.user}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div>Section not found.</div>;
    }
  };

  // --- RENDERING TABS AND MASTER-DETAIL VIEW ---
  // If we're on a submenu and NO client/supplier is selected, show warning
  const shouldShowEmptyDetailsPrompt = tab !== 'profile' && !activeId;

  // If we are showing the Supplier list (Supplier Profile page when no supplier is selected)
  if (type === 'supplier' && !selectedSupplierId) {
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, sortedSuppliers.length);

    const pageNumbers: (number | string)[] = [];
    if (totalPagesSupp <= 7) {
      for (let i = 1; i <= totalPagesSupp; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (page > 3) pageNumbers.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPagesSupp - 1, page + 1); i++) pageNumbers.push(i);
      if (page < totalPagesSupp - 2) pageNumbers.push('...');
      pageNumbers.push(totalPagesSupp);
    }

    return (
      <AdminLayout>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Supplier Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {sortedSuppliers.length} suppliers · {suppliers.filter(s => s.status === 1).length} active
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={fetchSuppliers}
                disabled={loadingSuppliers}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-60"
              >
                <RefreshCw size={13} className={loadingSuppliers ? 'animate-spin' : ''} />
                {loadingSuppliers ? 'Loading' : 'Refresh'}
              </button>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-150"
              >
                <Plus size={14} />
                Create Supplier
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by supplier code, name, or legal name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 pl-8 pr-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedSupplierIds.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 flex items-center gap-4">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{selectedSupplierIds.length} selected</span>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <button
                  onClick={handleDeleteSelectedSuppliers}
                  className="px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg hover:opacity-80 transition-opacity"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedSupplierIds([])}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSuppSelected}
                        ref={(el) => { if (el) el.indeterminate = someSuppSelected && !allSuppSelected; }}
                        onChange={toggleSelectAllSupp}
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 w-16 text-xs font-600 text-black dark:text-slate-400 text-left">S.No</th>
                    <th
                      onClick={() => handleSort('supplierCode')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Supplier Code
                        <SortIcon col="supplierCode" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Supplier Name
                        <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('legalName')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Legal Name
                        <SortIcon col="legalName" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('website')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Website
                        <SortIcon col="website" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Created At
                        <SortIcon col="createdAt" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 text-left w-24">Status</th>
                    <th className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSuppliers ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-blue-600" />
                        Loading suppliers...
                      </td>
                    </tr>
                  ) : paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">No suppliers found</td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((s, i) => {
                      const isSelected = selectedSupplierIds.includes(s.id);
                      const serialNumber = start + i;
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/10'
                              : i % 2 === 0
                                ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                : 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOneSupp(s.id)}
                              className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 text-xs text-black dark:text-slate-400 whitespace-nowrap">{serialNumber}</td>
                          <td className="px-3 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">{s.supplierCode}</td>
                          <td className="px-3 py-3 text-xs font-medium text-black dark:text-slate-200">{s.name}</td>
                          <td className="px-3 py-3 text-xs text-black dark:text-slate-400">{s.legalName}</td>
                          <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {s.website ? (
                              <a
                                href={s.website.startsWith('http') ? s.website : `https://${s.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {s.website.replace(/^https?:\/\/(www\.)?/, '')}
                                <ExternalLink size={10} />
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-black dark:text-slate-400 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                          <td className="px-3 py-3">
                            <Badge variant={s.status === 1 ? 'success' : 'danger'} size="sm">
                              {s.status === 1 ? 'Active' : 'InActive'}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="hidden group-hover:flex items-center justify-center gap-1">
                              <button
                                onClick={() => dispatch(selectSupplier(s))}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                                title="View details"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSupplier(s);
                                  setModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit Supplier"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteSupplier(s.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete Supplier"
                              >
                                <Trash2 size={13} />
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

            {/* Pagination Footer */}
            {sortedSuppliers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                    Showing {start}–{end} of {sortedSuppliers.length} suppliers
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-black dark:text-slate-400">Per page:</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-slate-300"
                    >
                      {[10, 20, 50].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={13} className="text-black dark:text-slate-400" />
                  </button>
                  <div className="flex items-center gap-1">
                    {pageNumbers.map((num, idx) => {
                      if (num === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs">...</span>
                        );
                      }
                      const isCurrent = num === page;
                      return (
                        <button
                          key={`page-${num}`}
                          onClick={() => setPage(num as number)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'text-black dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPagesSupp}
                    className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={13} className="text-black dark:text-slate-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Supplier Create/Edit Modal */}
          <SupplierModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingSupplier(null);
            }}
            onSuccess={fetchSuppliers}
            supplier={editingSupplier}
          />
        </div>
      </AdminLayout>
    );
  }

  // If we are showing the Client list (Client Profile page when no client is selected)
  if (type === 'client' && !selectedClientId) {
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, sortedClients.length);

    const pageNumbers: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (page > 3) pageNumbers.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNumbers.push(i);
      if (page < totalPages - 2) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }

    return (
      <AdminLayout>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Client Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {sortedClients.length} clients · {clients.filter(c => c.status === 1).length} active
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={fetchClients}
                disabled={loadingClients}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-60"
              >
                <RefreshCw size={13} className={loadingClients ? 'animate-spin' : ''} />
                {loadingClients ? 'Loading' : 'Refresh'}
              </button>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-150"
              >
                <Plus size={14} />
                Create Client
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client code, name, or legal name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 pl-8 pr-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedClientIds.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 flex items-center gap-4">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{selectedClientIds.length} selected</span>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg hover:opacity-80 transition-opacity"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedClientIds([])}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 w-16 text-xs font-600 text-black dark:text-slate-400 text-left">S.No</th>
                    <th className="px-3 py-3 w-14 text-xs font-600 text-black dark:text-slate-400 text-left">Image</th>
                    <th
                      onClick={() => handleSort('clientCode')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Client Code
                        <SortIcon col="clientCode" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('clientName')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Client Name
                        <SortIcon col="clientName" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('legalName')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Legal Name
                        <SortIcon col="legalName" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 whitespace-nowrap text-left cursor-pointer hover:text-black/80 dark:hover:text-slate-200 select-none"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Created At
                        <SortIcon col="createdAt" sortCol={sortCol} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 text-left w-24">Status</th>
                    <th className="px-3 py-3 text-xs font-600 text-black dark:text-slate-400 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingClients ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-blue-600" />
                        Loading clients...
                      </td>
                    </tr>
                  ) : paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">No clients found</td>
                    </tr>
                  ) : (
                    paginatedClients.map((c, i) => {
                      const isSelected = selectedClientIds.includes(c.id);
                      const serialNumber = start + i;
                      return (
                        <tr
                          key={c.id}
                          className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/10'
                              : i % 2 === 0
                                ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                : 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(c.id)}
                              className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 text-xs text-black dark:text-slate-400 whitespace-nowrap">{serialNumber}</td>
                          <td className="px-3 py-3">
                            {c.logoUrl ? (
                              <img
                                src={c.logoUrl}
                                alt={c.clientName}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <ImageIcon size={14} />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">{c.clientCode}</td>
                          <td className="px-3 py-3 text-xs font-medium text-black dark:text-slate-200">{c.clientName}</td>
                          <td className="px-3 py-3 text-xs text-black dark:text-slate-400">{c.legalName}</td>
                          <td className="px-3 py-3 text-xs text-black dark:text-slate-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                          <td className="px-3 py-3">
                            <Badge variant={c.status === 1 ? 'success' : 'danger'} size="sm">
                              {c.status === 1 ? 'Active' : 'InActive'}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="hidden group-hover:flex items-center justify-center gap-1">
                              <button
                                onClick={() => dispatch(selectClient(c))}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                                title="View details"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClient(c);
                                  setModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit Client"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(c.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete Client"
                              >
                                <Trash2 size={13} />
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

            {/* Pagination Footer */}
            {sortedClients.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black dark:text-slate-400 tabular-nums">
                    Showing {start}–{end} of {sortedClients.length} clients
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-black dark:text-slate-400">Per page:</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-slate-300"
                    >
                      {[10, 20, 50].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={13} className="text-black dark:text-slate-400" />
                  </button>
                  <div className="flex items-center gap-1">
                    {pageNumbers.map((num, idx) => {
                      if (num === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs">...</span>
                        );
                      }
                      const isCurrent = num === page;
                      return (
                        <button
                          key={`page-${num}`}
                          onClick={() => setPage(num as number)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'text-black dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={13} className="text-black dark:text-slate-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Client Create/Edit Modal */}
          <ClientModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingClient(null);
            }}
            onSuccess={fetchClients}
            client={editingClient}
          />
        </div>
      </AdminLayout>
    );
  }

  // --- RENDERING TABS AND MASTER-DETAIL VIEW ---
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{type}s</span>
              <span className="w-1 h-1 rounded-full bg-slate-350 dark:bg-slate-750" />
              <span className="text-xs text-slate-400">{activeTabDetails.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mt-1 capitalize">
              {type === 'client' ? 'Client' : 'Supplier'} {activeTabDetails.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {activeTabDetails.desc}
            </p>
          </div>

          {/* Active entity banner/stats */}
          {type === 'client' && selectedClientId ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shadow-sm">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Active Client: {selectedClient?.clientName} ({selectedClient?.clientCode})
                </span>
              </div>
              <button
                onClick={() => {
                  dispatch(clearSelectedClient());
                  router.push('/admin/clients/profile');
                }}
                className="px-3.5 py-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
              >
                Change Client
              </button>
            </div>
          ) : (
            type === 'client' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl shadow-sm">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Active Client Selected
                </span>
              </div>
            )
          )}
        </div>

        {shouldShowEmptyDetailsPrompt ? (
          // Warning prompt to select a client first
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-12 shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mb-4">
              <User size={28} className="text-amber-600 dark:text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1.5">No Client Selected</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
              You must select a client from the Client Profile page to view and manage their {activeTabDetails.title}.
            </p>
            <button
              onClick={() => router.push('/admin/clients/profile')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5"
            >
              Go to Clients List
            </button>
          </div>
        ) : (
          // Render the Master Detail layout for the selected client / supplier
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Tab Sidebar Selector */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3 space-y-1 shadow-sm">
              {activeTabs.map((item) => {
                const Icon = item.icon;
                const isSelected = item.code === tab;
                return (
                  <Link
                    key={item.code}
                    href={`/admin/${type}s/${item.code}`}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                    <div className="text-left">
                      <span>{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Tab View Container */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-sm">
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
