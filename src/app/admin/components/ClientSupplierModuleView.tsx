'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  User, Building2, MapPin, Users, CreditCard, FileText, Percent, Tag,
  Mail, History, Plus, Search, Trash2, Edit2, Eye, EyeOff, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, Image as ImageIcon, ShieldCheck, CheckCircle2, 
  AlertTriangle, Globe, Phone, ExternalLink, ChevronDown, Check, X, Info, Download,
  RefreshCw, Package, AlertCircle, Upload
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
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Selected Client edit business unit states
  const [buId, setBuId] = useState<number | undefined>(undefined);
  const [buUnitCode, setBuUnitCode] = useState('B2C');
  const [buUnitName, setBuUnitName] = useState('');
  const [buUnitLegalName, setBuUnitLegalName] = useState('');
  const [buDispatchWithinDays, setBuDispatchWithinDays] = useState<number | ''>(2);
  const [buDeliverWithinDays, setBuDeliverWithinDays] = useState<number | ''>(7);
  const [buHasOwnProductCode, setBuHasOwnProductCode] = useState(true);
  const [buHasMultiProductOrder, setBuHasMultiProductOrder] = useState(true);
  const [isLegalNameSynced, setIsLegalNameSynced] = useState(true);
  const [savingBU, setSavingBU] = useState(false);
  const [buSubTab, setBuSubTab] = useState('profile');
  const [fetchedClientId, setFetchedClientId] = useState<number | null>(null);
  const [buOriginalData, setBuOriginalData] = useState<any>(null);

  // Client address states
  const [addressTypes, setAddressTypes] = useState<any[]>([]);
  const [clientAddresses, setClientAddresses] = useState<any[]>([]);
  const [supplierAddresses, setSupplierAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  // Client address form field states
  const [addrTypeId, setAddrTypeId] = useState<number>(1);
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrLine3, setAddrLine3] = useState('');
  const [addrLine4, setAddrLine4] = useState('');
  const [addrLabel, setAddrLabel] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrCountry, setAddrCountry] = useState('India');
  const [addrIsPrimary, setAddrIsPrimary] = useState(false);
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrStatus, setAddrStatus] = useState<number>(1);

  // Address Type creation states
  const [showAddAddrTypeModal, setShowAddAddrTypeModal] = useState(false);
  const [newAddrTypeCode, setNewAddrTypeCode] = useState('');
  const [newAddrTypeName, setNewAddrTypeName] = useState('');
  const [savingAddrType, setSavingAddrType] = useState(false);

  // Client program states
  const [clientPrograms, setClientPrograms] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);

  // Client program form fields
  const [progCode, setProgCode] = useState('');
  const [progName, setProgName] = useState('');
  const [progLabel, setProgLabel] = useState('');
  const [progPoweredBy, setProgPoweredBy] = useState('');
  const [progAllowRpi, setProgAllowRpi] = useState(false);
  const [progPriorityProc, setProgPriorityProc] = useState(false);
  const [progSpecialPack, setProgSpecialPack] = useState(false);
  const [progSepInvPrint, setProgSepInvPrint] = useState(false);
  const [progSepPicklist, setProgSepPicklist] = useState(false);
  const [progSepBatching, setProgSepBatching] = useState(false);
  const [progTatHours, setProgTatHours] = useState<number | ''>(0);
  const [progPrintGroup, setProgPrintGroup] = useState('');

  // Client GST states
  const [clientGsts, setClientGsts] = useState<any[]>([]);
  const [loadingGsts, setLoadingGsts] = useState(false);
  const [statesList, setStatesList] = useState<any[]>([]);
  const [showGstForm, setShowGstForm] = useState(false);
  const [savingGst, setSavingGst] = useState(false);
  const [editingGstId, setEditingGstId] = useState<number | null>(null);

  // Client GST form fields
  const [gstin, setGstin] = useState('');
  const [selectedStateIndex, setSelectedStateIndex] = useState<number | ''>('');
  const [gstAddressId, setGstAddressId] = useState<number | ''>('');
  const [gstIsPrimary, setGstIsPrimary] = useState(false);

  // Business Unit sub-tab states
  const [buPrograms, setBuPrograms] = useState([
    { id: 1, name: 'B2B Corporate Credit', code: 'B2BCC', discount: '2.5%', status: true, validity: '31 Dec 2026' },
    { id: 2, name: 'Festival Bulk Reward', code: 'FESTBULK', discount: '5.0%', status: false, validity: '30 Oct 2026' },
    { id: 3, name: 'Early Payment Rebate', code: 'EARLYPAY', discount: '1.0%', status: true, validity: 'Unlimited' }
  ]);
  // Business Unit payment modes states
  const [buMappedPaymentModes, setBuMappedPaymentModes] = useState<any[]>([]);
  const [loadingBuPaymentModes, setLoadingBuPaymentModes] = useState(false);
  const [savingBuPaymentModes, setSavingBuPaymentModes] = useState(false);
  const [selectedPaymentModeIds, setSelectedPaymentModeIds] = useState<number[]>([]);
  const [masterPaymentModes, setMasterPaymentModes] = useState<any[]>([
    { id: 1, name: 'Credit & Debit Card', code: 'CARD', desc: 'Accept Visa, MasterCard, RuPay, Maestro' },
    { id: 2, name: 'Net Banking', code: 'NB', desc: 'Direct bank transfer from major banks' },
    { id: 3, name: 'UPI / QR Code', code: 'UPI', desc: 'Instant mobile payments via GPay, PhonePe, BHIM' },
    { id: 4, name: 'Wallets', code: 'WALLET', desc: 'Paytm, PhonePe Wallet, Amazon Pay' },
    { id: 5, name: 'Corporate Credit Limit', code: 'CREDIT', desc: 'Allow net terms invoicing & corporate credit line' },
    { id: 6, name: 'Bank Transfer (NEFT/RTGS)', code: 'FT', desc: 'Manual deposit verification with bank receipt' },
    { id: 7, name: 'Cash on Delivery', code: 'COD', desc: 'Collect cash upon delivery' }
  ]);
  const [buGstNo, setBuGstNo] = useState('27ICICIBANK1Z1');
  const [buPanNo, setBuPanNo] = useState('ICICIBANKP');
  const [buGstState, setBuGstState] = useState('Maharashtra');
  const [buGstAddress, setBuGstAddress] = useState('ICICI Bank Towers, BKC, Mumbai - 400051');
  
  // Business Unit config form states
  const [buCredentials, setBuCredentials] = useState<any>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [environmentId, setEnvironmentId] = useState<number | ''>('');
  const [showSecret, setShowSecret] = useState(false);

  // Business Unit communication templates states
  const [buCommTemplates, setBuCommTemplates] = useState<any[]>([]);
  const [loadingCommTemplates, setLoadingCommTemplates] = useState(false);
  const [showCommForm, setShowCommForm] = useState(false);
  const [savingCommTemplate, setSavingCommTemplate] = useState(false);
  const [editingCommTemplateId, setEditingCommTemplateId] = useState<number | null>(null);
  const [packStatus, setPackStatus] = useState('');
  const [messageText, setMessageText] = useState('');
  const [channelType, setChannelType] = useState('');
  const [subject, setSubject] = useState('');
  const [commEnums, setCommEnums] = useState<any[]>([]);

  // Contacts states
  const [buContacts, setBuContacts] = useState<any[]>([]);
  const [supplierContacts, setSupplierContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [contactStatus, setContactStatus] = useState<number>(1);

  // Contact Form Fields
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactTypeId, setContactTypeId] = useState<number | ''>('');
  const [isPrimaryContact, setIsPrimaryContact] = useState<boolean>(false);

  // Contact Types states
  const [contactTypes, setContactTypes] = useState<any[]>([]);
  const [loadingContactTypes, setLoadingContactTypes] = useState(false);
  const [showAddContactTypeModal, setShowAddContactTypeModal] = useState(false);
  const [savingContactType, setSavingContactType] = useState(false);

  // Banks states
  const [buBanks, setBuBanks] = useState<any[]>([]);
  const [supplierBanks, setSupplierBanks] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [editingBankId, setEditingBankId] = useState<number | null>(null);

  // Bank Form Fields
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState('SAVINGS');
  const [isPrimaryBank, setIsPrimaryBank] = useState<boolean>(false);
  const [bankStatus, setBankStatus] = useState<number>(1);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');

  // Tags states
  const [globalTags, setGlobalTags] = useState<any[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [savingTag, setSavingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  // Tag Form Fields
  const [tagName, setTagName] = useState('');
  const [tagStatus, setTagStatus] = useState<number>(1);

  // Documents & Document Types states
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);

  // Document Form Fields
  const [docTypeId, setDocTypeId] = useState<string | number>('');
  const [docNumber, setDocNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ path: string; originalName: string; contentType: string; size: number } | null>(null);

  // Document Types Management states
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loadingDocumentTypes, setLoadingDocumentTypes] = useState(false);
  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);
  const [editingDocumentTypeId, setEditingDocumentTypeId] = useState<number | null>(null);
  const [docTypeCode, setDocTypeCode] = useState('');
  const [docTypeName, setDocTypeName] = useState('');
  const [docTypeDescription, setDocTypeDescription] = useState('');
  const [savingDocumentType, setSavingDocumentType] = useState(false);

  // Supplier Emails states
  const [supplierEmails, setSupplierEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailType, setEmailType] = useState('TO');
  const [emailStatus, setEmailStatus] = useState<number>(1);
  const [savingEmail, setSavingEmail] = useState(false);

  // Supplier Documents states
  const [supplierDocuments, setSupplierDocuments] = useState<any[]>([]);
  const [loadingSupplierDocs, setLoadingSupplierDocs] = useState(false);
  const [showSupplierDocForm, setShowSupplierDocForm] = useState(false);
  const [savingSupplierDoc, setSavingSupplierDoc] = useState(false);
  const [editingSupplierDocId, setEditingSupplierDocId] = useState<number | null>(null);
  const [supDocType, setSupDocType] = useState('');
  const [supDocNumber, setSupDocNumber] = useState('');
  const [supDocRemarks, setSupDocRemarks] = useState('');
  const [supDocStatus, setSupDocStatus] = useState<number>(1);

  const handleLegalNameChange = (val: string) => {
    setEditLegalName(val);
    if (isLegalNameSynced) {
      setBuUnitLegalName(val);
    }
  };

  const handleBUSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setSavingBU(true);
    const toastId = toast.loading('Saving business unit...');

    const payload = {
      ...buOriginalData,
      clientId: selectedClient.id,
      unitCode: buUnitCode.trim(),
      unitName: buUnitName.trim(),
      legalName: buUnitLegalName.trim(),
      dispatchWithinDays: buDispatchWithinDays === '' ? 2 : Number(buDispatchWithinDays),
      deliverWithinDays: buDeliverWithinDays === '' ? 7 : Number(buDeliverWithinDays),
      hasOwnProductCode: !!buHasOwnProductCode,
      hasMultiProductOrder: !!buHasMultiProductOrder
    };

    try {
      let updatedBU;
      if (buId) {
        const response = await axiosInstance.put(`/client/business-unit/${buId}`, payload);
        updatedBU = response.data.data || response.data;
      } else {
        const clientPayload = {
          clientCode: editClientCode.trim(),
          clientName: editClientName.trim(),
          legalName: editLegalName.trim(),
          logoUrl: editLogoUrl.trim() || null,
          remarks: editRemarks.trim() || null,
          businessUnits: [payload]
        };
        const response = await axiosInstance.put(`/client/${selectedClient.id}`, clientPayload);
        const updatedClient = response.data.data || response.data;
        updatedBU = updatedClient.businessUnits?.[0] || payload;
      }

      setBuOriginalData(updatedBU);
      if (updatedBU.id) setBuId(updatedBU.id);

      const updatedClient = {
        ...selectedClient,
        businessUnits: [updatedBU]
      };
      dispatch(selectClient(updatedClient));

      toast.success('Business Unit saved successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save business unit.', { id: toastId });
    } finally {
      setSavingBU(false);
    }
  };

  const fetchAddressTypes = useCallback(async () => {
    try {
      const url = type === 'supplier' ? '/vendor/address-types' : '/client/address-type';
      const response = await axiosInstance.get<string>(url, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setAddressTypes(parsed);
      if (parsed.length > 0) {
        setAddrTypeId(parsed[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch address types:', err);
    }
  }, [type]);

  const fetchClientAddresses = useCallback(async (clientId: number) => {
    setLoadingAddresses(true);
    try {
      const response = await axiosInstance.get<string>(`/client/address/${clientId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setClientAddresses(parsed);
    } catch (err) {
      console.error('Failed to fetch client addresses:', err);
      setClientAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  const fetchSupplierAddresses = useCallback(async (supplierId: number) => {
    setLoadingAddresses(true);
    try {
      const response = await axiosInstance.get<string>(`/vendor/supplier-addresses/${supplierId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setSupplierAddresses(parsed);
    } catch (err) {
      console.error('Failed to fetch supplier addresses:', err);
      setSupplierAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClient?.id && type === 'client') {
      if (tab === 'address') {
        fetchAddressTypes();
        fetchClientAddresses(selectedClient.id);
      }
    } else if (selectedSupplier?.id && type === 'supplier') {
      if (tab === 'address') {
        fetchAddressTypes();
        fetchSupplierAddresses(selectedSupplier.id);
      }
    }
  }, [selectedClient?.id, selectedSupplier?.id, tab, type, fetchAddressTypes, fetchClientAddresses, fetchSupplierAddresses]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'client') {
      if (!selectedClient) return;
      setSavingAddress(true);
      const toastId = toast.loading(editingAddressId ? 'Updating address...' : 'Adding address...');
      const payload = {
        clientId: selectedClient.id,
        addressTypeId: Number(addrTypeId),
        addressLine1: addrLine1.trim(),
        addressLine2: addrLine2.trim(),
        addressLine3: addrLine3.trim(),
        addressLine4: addrLine4.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        pincode: addrPincode.trim(),
        country: addrCountry.trim(),
        isPrimary: !!addrIsPrimary
      };
      try {
        if (editingAddressId) {
          await axiosInstance.put(`/client/address/${editingAddressId}`, payload);
          toast.success('Address updated successfully!', { id: toastId });
        } else {
          await axiosInstance.post('/client/address', payload);
          toast.success('Address added successfully!', { id: toastId });
        }
        
        // Reset form states
        setEditingAddressId(null);
        setShowAddressForm(false);
        setAddrLine1('');
        setAddrLine2('');
        setAddrLine3('');
        setAddrLine4('');
        setAddrLabel('');
        setAddrCity('');
        setAddrState('');
        setAddrPincode('');
        setAddrCountry('India');
        setAddrIsPrimary(false);
        setAddrIsDefault(false);
        if (addressTypes.length > 0) {
          setAddrTypeId(addressTypes[0].id || 1);
        } else {
          setAddrTypeId(1);
        }

        fetchClientAddresses(selectedClient.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to save address.', { id: toastId });
      } finally {
        setSavingAddress(false);
      }
    } else {
      if (!selectedSupplier) return;
      setSavingAddress(true);
      const toastId = toast.loading(editingAddressId ? 'Updating address...' : 'Adding address...');
      try {
        if (editingAddressId) {
          const payload = {
            addressTypeId: Number(addrTypeId),
            label: addrLabel.trim(),
            addressLine1: addrLine1.trim(),
            addressLine2: addrLine2.trim(),
            addressLine3: addrLine3.trim(),
            city: addrCity.trim(),
            state: addrState.trim(),
            pincode: addrPincode.trim(),
            country: addrCountry.trim(),
            isDefault: addrIsDefault,
            status: addrStatus
          };
          await axiosInstance.put(`/vendor/supplier-addresses/${editingAddressId}`, payload);
          toast.success('Address updated successfully!', { id: toastId });
        } else {
          const payload = {
            supplierId: selectedSupplier.id,
            addressTypeId: Number(addrTypeId),
            label: addrLabel.trim(),
            addressLine1: addrLine1.trim(),
            addressLine2: addrLine2.trim(),
            addressLine3: addrLine3.trim(),
            city: addrCity.trim(),
            state: addrState.trim(),
            pincode: addrPincode.trim(),
            country: addrCountry.trim(),
            isDefault: addrIsDefault
          };
          await axiosInstance.post('/vendor/supplier-addresses', payload);
          toast.success('Address added successfully!', { id: toastId });
        }
        
        // Reset form states
        setEditingAddressId(null);
        setShowAddressForm(false);
        setAddrLine1('');
        setAddrLine2('');
        setAddrLine3('');
        setAddrLine4('');
        setAddrLabel('');
        setAddrCity('');
        setAddrState('');
        setAddrPincode('');
        setAddrCountry('India');
        setAddrIsPrimary(false);
        setAddrIsDefault(false);
        setAddrStatus(1);
        if (addressTypes.length > 0) {
          setAddrTypeId(addressTypes[0].id || 1);
        } else {
          setAddrTypeId(1);
        }

        fetchSupplierAddresses(selectedSupplier.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to save address.', { id: toastId });
      } finally {
        setSavingAddress(false);
      }
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (type === 'client') {
      if (!selectedClient) return;
      if (!confirm('Are you sure you want to delete this address?')) return;
      const toastId = toast.loading('Deleting address...');
      try {
        await axiosInstance.delete(`/client/address/${addressId}`);
        toast.success('Address deleted successfully!', { id: toastId });
        fetchClientAddresses(selectedClient.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to delete address.', { id: toastId });
      }
    } else {
      if (!selectedSupplier) return;
      if (!confirm('Are you sure you want to delete this address?')) return;
      const toastId = toast.loading('Deleting address...');
      try {
        await axiosInstance.delete(`/vendor/supplier-addresses/${addressId}`);
        toast.success('Address deleted successfully!', { id: toastId });
        fetchSupplierAddresses(selectedSupplier.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to delete address.', { id: toastId });
      }
    }
  };

  const handleEditAddressClick = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddrTypeId(addr.addressTypeId || 1);
    setAddrLine1(addr.addressLine1 || '');
    setAddrLine2(addr.addressLine2 || '');
    setAddrLine3(addr.addressLine3 || '');
    setAddrLine4(addr.addressLine4 || '');
    setAddrLabel(addr.label || '');
    setAddrCity(addr.city || '');
    setAddrState(addr.state || '');
    setAddrPincode(addr.pincode || '');
    setAddrCountry(addr.country || 'India');
    setAddrIsPrimary(!!addr.isPrimary);
    setAddrIsDefault(!!addr.isDefault);
    setAddrStatus(addr.status !== undefined ? addr.status : 1);
    setShowAddressForm(true);
  };

  const handleSaveAddressType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrTypeCode.trim() || !newAddrTypeName.trim()) {
      toast.error('Code and Name are required');
      return;
    }
    setSavingAddrType(true);
    const toastId = toast.loading('Creating address type...');
    const payload = {
      code: newAddrTypeCode.trim().toUpperCase().replace(/\s+/g, '_'),
      name: newAddrTypeName.trim()
    };
    try {
      const url = type === 'supplier' ? '/vendor/address-types' : '/client/address-type';
      const response = await axiosInstance.post(url, payload);
      toast.success('Address Type created successfully!', { id: toastId });
      setShowAddAddrTypeModal(false);
      setNewAddrTypeCode('');
      setNewAddrTypeName('');
      await fetchAddressTypes();
      if (response.data?.data?.id) {
        setAddrTypeId(response.data.data.id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create address type.', { id: toastId });
    } finally {
      setSavingAddrType(false);
    }
  };

  const fetchClientPrograms = useCallback(async (businessUnitId: number) => {
    setLoadingPrograms(true);
    try {
      const response = await axiosInstance.get<string>(`/client/program/${businessUnitId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setClientPrograms(parsed);
    } catch (err) {
      console.error('Failed to fetch client programs:', err);
      setClientPrograms([]);
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  useEffect(() => {
    if (buId && type === 'client') {
      if (tab === 'business-unit' && buSubTab === 'programs') {
        fetchClientPrograms(buId);
      }
    }
  }, [buId, tab, buSubTab, type, fetchClientPrograms]);

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buId) {
      toast.error('Business Unit ID is missing.');
      return;
    }

    setSavingProgram(true);
    const toastId = toast.loading(editingProgramId ? 'Updating program...' : 'Creating program...');

    const payload = {
      businessUnitId: buId,
      programCode: progCode.trim(),
      programName: progName.trim(),
      programLabel: progLabel.trim(),
      poweredByDescription: progPoweredBy.trim(),
      allowRpi: !!progAllowRpi,
      isPriorityProcurement: !!progPriorityProc,
      isSpecialPacking: !!progSpecialPack,
      isSeparateInvoicePrint: !!progSepInvPrint,
      isSeparatePicklist: !!progSepPicklist,
      isSeparateBatching: !!progSepBatching,
      tatHours: progTatHours === '' ? 0 : Number(progTatHours),
      printGroup: progPrintGroup.trim()
    };

    try {
      if (editingProgramId) {
        await axiosInstance.put(`/client/program/${editingProgramId}`, payload);
        toast.success('Program updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/client/program', payload);
        toast.success('Program created successfully!', { id: toastId });
      }

      // Reset fields
      setEditingProgramId(null);
      setShowProgramForm(false);
      setProgCode('');
      setProgName('');
      setProgLabel('');
      setProgPoweredBy('');
      setProgAllowRpi(false);
      setProgPriorityProc(false);
      setProgSpecialPack(false);
      setProgSepInvPrint(false);
      setProgSepPicklist(false);
      setProgSepBatching(false);
      setProgTatHours(0);
      setProgPrintGroup('');

      // Re-fetch
      fetchClientPrograms(buId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save program.', { id: toastId });
    } finally {
      setSavingProgram(false);
    }
  };

  const handleDeleteProgram = async (programId: number) => {
    if (!buId) return;
    if (!confirm('Are you sure you want to delete this program?')) return;

    const toastId = toast.loading('Deleting program...');
    try {
      await axiosInstance.delete(`/client/program/${programId}`);
      toast.success('Program deleted successfully!', { id: toastId });
      fetchClientPrograms(buId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete program.', { id: toastId });
    }
  };

  const handleEditProgramClick = (prog: any) => {
    setEditingProgramId(prog.id);
    setProgCode(prog.programCode || '');
    setProgName(prog.programName || '');
    setProgLabel(prog.programLabel || '');
    setProgPoweredBy(prog.poweredByDescription || '');
    setProgAllowRpi(!!prog.allowRpi);
    setProgPriorityProc(!!prog.isPriorityProcurement);
    setProgSpecialPack(!!prog.isSpecialPacking);
    setProgSepInvPrint(!!prog.isSeparateInvoicePrint);
    setProgSepPicklist(!!prog.isSeparatePicklist);
    setProgSepBatching(!!prog.isSeparateBatching);
    setProgTatHours(prog.tatHours ?? 0);
    setProgPrintGroup(prog.printGroup || '');
    setShowProgramForm(true);
  };

  const fetchStatesList = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/order/pincode/states');
      if (res.data) {
        setStatesList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  }, []);

  const fetchClientGsts = useCallback(async (businessUnitId: number) => {
    setLoadingGsts(true);
    try {
      const response = await axiosInstance.get<string>(`/client/gst/${businessUnitId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setClientGsts(parsed);
    } catch (err) {
      console.error('Failed to fetch GST list:', err);
      setClientGsts([]);
    } finally {
      setLoadingGsts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClient?.id && buId && type === 'client') {
      if (tab === 'business-unit' && buSubTab === 'gst') {
        fetchStatesList();
        fetchClientAddresses(selectedClient.id);
        fetchClientGsts(buId);
      }
    }
  }, [selectedClient?.id, buId, tab, buSubTab, type, fetchStatesList, fetchClientAddresses, fetchClientGsts]);

  const fetchMasterPaymentModes = useCallback(async () => {
    try {
      const response = await axiosInstance.get<string>('/client/payment-mode', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      if (parsed && parsed.length > 0) {
        const fallbackModes = [
          { id: 1, name: 'Credit & Debit Card', code: 'CARD', desc: 'Accept Visa, MasterCard, RuPay, Maestro' },
          { id: 2, name: 'Net Banking', code: 'NB', desc: 'Direct bank transfer from major banks' },
          { id: 3, name: 'UPI / QR Code', code: 'UPI', desc: 'Instant mobile payments via GPay, PhonePe, BHIM' },
          { id: 4, name: 'Wallets', code: 'WALLET', desc: 'Paytm, PhonePe Wallet, Amazon Pay' },
          { id: 5, name: 'Corporate Credit Limit', code: 'CREDIT', desc: 'Allow net terms invoicing & corporate credit line' },
          { id: 6, name: 'Bank Transfer (NEFT/RTGS)', code: 'FT', desc: 'Manual deposit verification with bank receipt' },
          { id: 7, name: 'Cash on Delivery', code: 'COD', desc: 'Collect cash upon delivery' }
        ];
        const mapped = parsed.map((m: any) => {
          const mId = m.id || m.paymentModeId;
          const matched = fallbackModes.find(item => item.id === mId);
          return {
            id: mId,
            name: m.modeName || m.name || matched?.name || `Payment Mode ${mId}`,
            code: m.modeCode || m.code || matched?.code || `MODE_${mId}`,
            desc: m.description || m.desc || matched?.desc || 'No description available'
          };
        });
        setMasterPaymentModes(mapped);
      }
    } catch (err) {
      console.warn('Failed to fetch master payment modes, using static master list:', err);
    }
  }, []);

  const fetchBuPaymentModes = useCallback(async (businessUnitId: number) => {
    setLoadingBuPaymentModes(true);
    try {
      const response = await axiosInstance.get<string>(`/client/payment-mode-mapping/${businessUnitId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setBuMappedPaymentModes(parsed);
    } catch (err) {
      console.error('Failed to fetch business unit payment modes:', err);
      setBuMappedPaymentModes([]);
    } finally {
      setLoadingBuPaymentModes(false);
    }
  }, []);

  useEffect(() => {
    if (buId && type === 'client') {
      if (tab === 'business-unit' && buSubTab === 'payment-modes') {
        fetchMasterPaymentModes();
        fetchBuPaymentModes(buId);
      }
    }
  }, [buId, tab, buSubTab, type, fetchMasterPaymentModes, fetchBuPaymentModes]);

  useEffect(() => {
    if (buMappedPaymentModes) {
      const ids = buMappedPaymentModes.map((m: any) => m.paymentModeId || m.id);
      setSelectedPaymentModeIds(ids);
    }
  }, [buMappedPaymentModes]);

  const togglePaymentMode = (id: number) => {
    setSelectedPaymentModeIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSavePaymentModes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buId) {
      toast.error('Business Unit ID is missing.');
      return;
    }

    setSavingBuPaymentModes(true);
    const toastId = toast.loading('Saving payment modes...');

    const payload = {
      businessUnitId: buId,
      paymentModeIds: selectedPaymentModeIds
    };

    try {
      const response = await axiosInstance.post('/client/payment-mode-mapping', payload);
      if (response.data?.success) {
        toast.success('Payment modes updated successfully!', { id: toastId });
        fetchBuPaymentModes(buId);
      } else {
        toast.error(response.data?.message || 'Failed to save payment modes.', { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save payment modes.', { id: toastId });
    } finally {
      setSavingBuPaymentModes(false);
    }
  };

  const fetchEnvironments = useCallback(async () => {
    setLoadingEnvironments(true);
    try {
      const response = await axiosInstance.get<string>('/client/environment', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setEnvironments(parsed);
    } catch (err) {
      console.error('Failed to fetch environments:', err);
      setEnvironments([
        { id: 1, envCode: 'DEV', envName: 'Development' },
        { id: 2, envCode: 'PROD', envName: 'Production' }
      ]);
    } finally {
      setLoadingEnvironments(false);
    }
  }, []);

  const fetchBuCredentials = useCallback(async (businessUnitId: number) => {
    setLoadingCredentials(true);
    try {
      const response = await axiosInstance.get(`/client/config/business-unit/${businessUnitId}/credentials`);
      if (response.data?.success && response.data?.data) {
        const creds = response.data.data;
        setBuCredentials(creds);
        setMerchantId(creds.merchantId || '');
        setSecretKey(creds.secretKey || '');
        setEnvironmentId(creds.environmentId || '');
      } else {
        setBuCredentials(null);
        setMerchantId('');
        setSecretKey('');
        setEnvironmentId('');
      }
    } catch (err) {
      console.error('Failed to fetch business unit credentials:', err);
      setBuCredentials(null);
      setMerchantId('');
      setSecretKey('');
      setEnvironmentId('');
    } finally {
      setLoadingCredentials(false);
    }
  }, []);

  useEffect(() => {
    if (buId && type === 'client') {
      if (tab === 'business-unit' && buSubTab === 'config') {
        fetchEnvironments();
        fetchBuCredentials(buId);
      }
    }
  }, [buId, tab, buSubTab, type, fetchEnvironments, fetchBuCredentials]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buId) {
      toast.error('Business Unit ID is missing.');
      return;
    }
    if (!merchantId.trim() || !secretKey.trim() || !environmentId) {
      toast.error('All fields (Merchant ID, Secret Key, and Environment) are required.');
      return;
    }

    setSavingCredentials(true);
    const toastId = toast.loading('Saving configurations...');

    const payload = {
      merchantId: merchantId.trim(),
      secretKey: secretKey.trim(),
      environmentId: Number(environmentId)
    };

    try {
      const response = await axiosInstance.put(`/client/config/business-unit/${buId}/credentials`, payload);
      if (response.data?.success) {
        toast.success('API configurations updated successfully!', { id: toastId });
        fetchBuCredentials(buId);
      } else {
        toast.error(response.data?.message || 'Failed to save configurations.', { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save configurations.', { id: toastId });
    } finally {
      setSavingCredentials(false);
    }
  };

  const fetchBuCommTemplates = useCallback(async (businessUnitId: number) => {
    setLoadingCommTemplates(true);
    try {
      const response = await axiosInstance.get<string>(`/client/transaction-text/${businessUnitId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setBuCommTemplates(parsed);
    } catch (err) {
      console.error('Failed to fetch communication templates:', err);
      setBuCommTemplates([]);
    } finally {
      setLoadingCommTemplates(false);
    }
  }, []);

  const fetchCommEnums = useCallback(async () => {
    try {
      const response = await axiosInstance.get<string>('/client/transaction-text/enums', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setCommEnums(parsed);
    } catch (err) {
      console.error('Failed to fetch communication enums:', err);
      setCommEnums([
        { type: 'CHANNEL_TYPE', value: 'SMS', displayName: 'SMS' },
        { type: 'CHANNEL_TYPE', value: 'EMAIL', displayName: 'Email' },
        { type: 'CHANNEL_TYPE', value: 'WHATSAPP', displayName: 'WhatsApp' }
      ]);
    }
  }, []);

  useEffect(() => {
    if (buId && type === 'client') {
      if (tab === 'business-unit' && buSubTab === 'comm-templates') {
        fetchBuCommTemplates(buId);
        fetchCommEnums();
      }
    }
  }, [buId, tab, buSubTab, type, fetchBuCommTemplates, fetchCommEnums]);

  const handleSaveCommTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buId) {
      toast.error('Business Unit ID is missing.');
      return;
    }
    if (!packStatus.trim() || !messageText.trim() || !channelType.trim()) {
      toast.error('Pack Status, Message Text and Channel Type are required.');
      return;
    }

    setSavingCommTemplate(true);
    const toastId = toast.loading(editingCommTemplateId ? 'Updating template...' : 'Creating template...');

    const payload = {
      businessUnitId: buId,
      packStatus: packStatus.trim(),
      channelType: channelType.trim(),
      subject: subject.trim() || null,
      messageText: messageText.trim()
    };

    try {
      if (editingCommTemplateId) {
        await axiosInstance.put(`/client/transaction-text/${editingCommTemplateId}`, payload);
        toast.success('Template updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/client/transaction-text', payload);
        toast.success('Template created successfully!', { id: toastId });
      }

      setEditingCommTemplateId(null);
      setShowCommForm(false);
      setPackStatus('');
      setMessageText('');
      setChannelType('');
      setSubject('');
      fetchBuCommTemplates(buId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save template.', { id: toastId });
    } finally {
      setSavingCommTemplate(false);
    }
  };

  const handleDeleteCommTemplate = async (templateId: number) => {
    if (!buId) return;
    if (!confirm('Are you sure you want to delete this template?')) return;

    const toastId = toast.loading('Deleting template...');
    try {
      await axiosInstance.delete(`/client/transaction-text/${templateId}`);
      toast.success('Template deleted successfully!', { id: toastId });
      fetchBuCommTemplates(buId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete template.', { id: toastId });
    }
  };

  const handleEditCommTemplateClick = (item: any) => {
    setEditingCommTemplateId(item.id);
    setPackStatus(item.packStatus || '');
    setMessageText(item.messageText || '');
    setChannelType(item.channelType || '');
    setSubject(item.subject || '');
    setShowCommForm(true);
  };

  const fetchContactTypes = useCallback(async () => {
    setLoadingContactTypes(true);
    try {
      const response = await axiosInstance.get<string>('/client/contact-type', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setContactTypes(parsed);
    } catch (err) {
      console.error('Failed to fetch contact types:', err);
      setContactTypes([
        { id: 1, typeCode: 'PRIMARY', typeName: 'Primary Contact' },
        { id: 2, typeCode: 'ACCOUNTS', typeName: 'Accounts Contact' },
        { id: 3, typeCode: 'OPERATIONS', typeName: 'Operations Contact' },
        { id: 4, typeCode: 'ESCALATION', typeName: 'Escalation Contact' }
      ]);
    } finally {
      setLoadingContactTypes(false);
    }
  }, []);

  const fetchBuContacts = useCallback(async (clientId: number) => {
    setLoadingContacts(true);
    try {
      const response = await axiosInstance.get<string>(`/client/contact/${clientId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setBuContacts(parsed);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setBuContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const fetchSupplierContacts = useCallback(async (supplierId: number) => {
    setLoadingContacts(true);
    try {
      const response = await axiosInstance.get<string>(`/vendor/supplier-contacts/${supplierId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setSupplierContacts(parsed);
    } catch (err) {
      console.error('Failed to fetch supplier contacts:', err);
      setSupplierContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const fetchBuBanks = useCallback(async (clientId: number) => {
    setLoadingBanks(true);
    try {
      const response = await axiosInstance.get<string>(`/client/bank/${clientId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setBuBanks(parsed);
    } catch (err) {
      console.error('Failed to fetch business unit banks:', err);
      setBuBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  const fetchSupplierBanks = useCallback(async (supplierId: number) => {
    setLoadingBanks(true);
    try {
      const response = await axiosInstance.get<string>(`/vendor/supplier-banks/${supplierId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setSupplierBanks(parsed);
    } catch (err) {
      console.error('Failed to fetch supplier banks:', err);
      setSupplierBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  const fetchGlobalTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const endpoint = type === 'client' ? '/client/tag' : '/vendor/supplier-tags';
      const response = await axiosInstance.get<string>(endpoint, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setGlobalTags(parsed);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setGlobalTags([]);
    } finally {
      setLoadingTags(false);
    }
  }, [type]);

  const fetchDocumentTypes = useCallback(async () => {
    setLoadingDocumentTypes(true);
    try {
      const response = await axiosInstance.get<string>('/client/document-type', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setDocumentTypes(parsed);
    } catch (err) {
      console.error('Failed to fetch document types:', err);
      setDocumentTypes([]);
    } finally {
      setLoadingDocumentTypes(false);
    }
  }, []);

  const fetchClientDocuments = useCallback(async (clientId: number) => {
    setLoadingDocuments(true);
    try {
      const response = await axiosInstance.get<string>(`/client/document/${clientId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setClientDocuments(parsed);
    } catch (err) {
      console.error('Failed to fetch client documents:', err);
      setClientDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  const fetchSupplierEmails = useCallback(async (supplierId: number) => {
    setLoadingEmails(true);
    try {
      const response = await axiosInstance.get<string>(`/vendor/supplier-emails/${supplierId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setSupplierEmails(parsed);
    } catch (err) {
      console.error('Failed to fetch supplier emails:', err);
      setSupplierEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  }, []);

  const fetchSupplierDocuments = useCallback(async (supplierId: number) => {
    setLoadingSupplierDocs(true);
    try {
      const response = await axiosInstance.get<string>(`/vendor/supplier-documents/${supplierId}`, {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setSupplierDocuments(parsed);
    } catch (err) {
      console.error('Failed to fetch supplier documents:', err);
      setSupplierDocuments([]);
    } finally {
      setLoadingSupplierDocs(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'tags') {
      fetchGlobalTags();
    }
    if (selectedClient?.id && type === 'client') {
      if (tab === 'contacts') {
        fetchContactTypes();
        fetchBuContacts(selectedClient.id);
      }
      if (tab === 'banks') {
        fetchBuBanks(selectedClient.id);
      }
      if (tab === 'documents') {
        fetchDocumentTypes();
        fetchClientDocuments(selectedClient.id);
      }
    } else if (selectedSupplier?.id && type === 'supplier') {
      if (tab === 'contacts') {
        fetchSupplierContacts(selectedSupplier.id);
      }
      if (tab === 'banks') {
        fetchSupplierBanks(selectedSupplier.id);
      }
      if (tab === 'emails') {
        fetchSupplierEmails(selectedSupplier.id);
      }
      if (tab === 'documents') {
        fetchSupplierDocuments(selectedSupplier.id);
      }
    }
  }, [selectedClient?.id, selectedSupplier?.id, tab, type, fetchContactTypes, fetchBuContacts, fetchSupplierContacts, fetchBuBanks, fetchSupplierBanks, fetchGlobalTags, fetchDocumentTypes, fetchClientDocuments, fetchSupplierEmails, fetchSupplierDocuments]);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'client') {
      if (!selectedClient?.id) {
        toast.error('Client ID is missing.');
        return;
      }
      if (!contactName.trim() || !contactEmail.trim() || !contactMobile.trim() || contactTypeId === '') {
        toast.error('Name, Email, Mobile and Contact Type are required.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        toast.error('Please enter a valid email address.');
        return;
      }

      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(contactMobile.trim())) {
        toast.error('Please enter a valid 10-digit mobile number (e.g. 8667757668).');
        return;
      }

      setSavingContact(true);
      const toastId = toast.loading(editingContactId ? 'Updating contact...' : 'Creating contact...');

      const payload = {
        clientId: selectedClient.id,
        contactName: contactName.trim(),
        email: contactEmail.trim(),
        mobile: contactMobile.trim(),
        designation: contactDesignation.trim(),
        contactTypeId: Number(contactTypeId),
        isPrimary: isPrimaryContact
      };

      try {
        if (editingContactId) {
          await axiosInstance.put(`/client/contact/${editingContactId}`, payload);
          toast.success('Contact updated successfully!', { id: toastId });
        } else {
          await axiosInstance.post('/client/contact', payload);
          toast.success('Contact created successfully!', { id: toastId });
        }

        setEditingContactId(null);
        setShowContactForm(false);
        setContactName('');
        setContactEmail('');
        setContactMobile('');
        setContactDesignation('');
        setContactTypeId('');
        setIsPrimaryContact(false);
        setContactStatus(1);

        fetchBuContacts(selectedClient.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to save contact.', { id: toastId });
      } finally {
        setSavingContact(false);
      }
    } else {
      if (!selectedSupplier?.id) {
        toast.error('Supplier ID is missing.');
        return;
      }
      if (!contactName.trim() || !contactEmail.trim() || !contactMobile.trim()) {
        toast.error('Name, Email, and Phone number are required.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        toast.error('Please enter a valid email address.');
        return;
      }

      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(contactMobile.trim())) {
        toast.error('Please enter a valid 10-digit mobile number (e.g. 8667757668).');
        return;
      }

      setSavingContact(true);
      const toastId = toast.loading(editingContactId ? 'Updating contact...' : 'Creating contact...');

      try {
        if (editingContactId) {
          const payload = {
            name: contactName.trim(),
            designation: contactDesignation.trim(),
            phone: contactMobile.trim(),
            email: contactEmail.trim(),
            isPrimary: isPrimaryContact,
            status: contactStatus
          };
          await axiosInstance.put(`/vendor/supplier-contacts/${editingContactId}`, payload);
          toast.success('Contact updated successfully!', { id: toastId });
        } else {
          const payload = {
            supplierId: selectedSupplier.id,
            name: contactName.trim(),
            designation: contactDesignation.trim(),
            phone: contactMobile.trim(),
            email: contactEmail.trim(),
            isPrimary: isPrimaryContact
          };
          await axiosInstance.post('/vendor/supplier-contacts', payload);
          toast.success('Contact created successfully!', { id: toastId });
        }

        setEditingContactId(null);
        setShowContactForm(false);
        setContactName('');
        setContactEmail('');
        setContactMobile('');
        setContactDesignation('');
        setContactTypeId('');
        setIsPrimaryContact(false);
        setContactStatus(1);

        fetchSupplierContacts(selectedSupplier.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to save contact.', { id: toastId });
      } finally {
        setSavingContact(false);
      }
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (type === 'client') {
      if (!selectedClient?.id) return;
      if (!confirm('Are you sure you want to delete this contact?')) return;

      const toastId = toast.loading('Deleting contact...');
      try {
        await axiosInstance.delete(`/client/contact/${contactId}`);
        toast.success('Contact deleted successfully!', { id: toastId });
        fetchBuContacts(selectedClient.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to delete contact.', { id: toastId });
      }
    } else {
      if (!selectedSupplier?.id) return;
      if (!confirm('Are you sure you want to delete this contact?')) return;

      const toastId = toast.loading('Deleting contact...');
      try {
        await axiosInstance.delete(`/vendor/supplier-contacts/${contactId}`);
        toast.success('Contact deleted successfully!', { id: toastId });
        fetchSupplierContacts(selectedSupplier.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to delete contact.', { id: toastId });
      }
    }
  };

  const handleSaveContactType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeCode.trim() || !newTypeName.trim()) {
      toast.error('Type Code and Type Name are required.');
      return;
    }

    setSavingContactType(true);
    const toastId = toast.loading('Creating contact type...');

    const payload = {
      typeCode: newTypeCode.trim().toUpperCase(),
      typeName: newTypeName.trim(),
      description: newTypeDescription.trim()
    };

    try {
      const response = await axiosInstance.post('/client/contact-type', payload);
      if (response.data?.success) {
        toast.success('Contact type created successfully!', { id: toastId });
        setShowAddContactTypeModal(false);
        setNewTypeCode('');
        setNewTypeName('');
        setNewTypeDescription('');
        
        await fetchContactTypes();
        if (response.data.data?.id) {
          setContactTypeId(response.data.data.id);
        }
      } else {
        toast.error(response.data?.message || 'Failed to create contact type.', { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create contact type.', { id: toastId });
    } finally {
      setSavingContactType(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'client') {
      if (!selectedClient?.id) {
        toast.error('Client ID is missing.');
        return;
      }
      if (!accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim() || !bankName.trim() || !branchName.trim()) {
        toast.error('All fields except Primary are required.');
        return;
      }

      // IFSC validation (standard Indian format: 4 letters, 0, 6 alphanumeric/numbers)
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifscCode.trim().toUpperCase())) {
        toast.error('Please enter a valid IFSC code (e.g. ICIC0006020).');
        return;
      }

      setSavingBank(true);
      const toastId = toast.loading(editingBankId ? 'Updating bank account...' : 'Adding bank account...');

      const payload = {
        clientId: selectedClient.id,
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        isPrimary: isPrimaryBank
      };

      try {
        if (editingBankId) {
          await axiosInstance.put(`/client/bank/${editingBankId}`, payload);
          toast.success('Bank account updated successfully!', { id: toastId });
        } else {
          await axiosInstance.post('/client/bank', payload);
          toast.success('Bank account added successfully!', { id: toastId });
        }

        setEditingBankId(null);
        setShowBankForm(false);
        setAccountHolderName('');
        setAccountNumber('');
        setIfscCode('');
        setBankName('');
        setBranchName('');
        setAccountType('SAVINGS');
        setIsPrimaryBank(false);
        setBankStatus(1);
        fetchBuBanks(selectedClient.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to save bank account.', { id: toastId });
      } finally {
        setSavingBank(false);
      }
    } else {
      if (!selectedSupplier?.id) {
        toast.error('Supplier ID is missing.');
        return;
      }
      if (!accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim() || !bankName.trim() || !branchName.trim() || !accountType) {
        toast.error('All fields except Primary are required.');
        return;
      }

      // IFSC validation
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifscCode.trim().toUpperCase())) {
        toast.error('Please enter a valid IFSC code (e.g. HDFC0000456).');
        return;
      }

      setSavingBank(true);
      const toastId = toast.loading(editingBankId ? 'Updating bank account...' : 'Adding bank account...');

      try {
        if (editingBankId) {
          const payload = {
            accountName: accountHolderName.trim(),
            accountNumber: accountNumber.trim(),
            bankName: bankName.trim(),
            branch: branchName.trim(),
            ifsc: ifscCode.trim().toUpperCase(),
            accountType: accountType,
            isPrimary: isPrimaryBank,
            status: bankStatus
          };
          await axiosInstance.put(`/vendor/supplier-banks/${editingBankId}`, payload);
          toast.success('Bank account updated successfully!', { id: toastId });
        } else {
          const payload = {
            supplierId: selectedSupplier.id,
            accountName: accountHolderName.trim(),
            accountNumber: accountNumber.trim(),
            bankName: bankName.trim(),
            branch: branchName.trim(),
            ifsc: ifscCode.trim().toUpperCase(),
            accountType: accountType,
            isPrimary: isPrimaryBank
          };
          await axiosInstance.post('/vendor/supplier-banks', payload);
          toast.success('Bank account added successfully!', { id: toastId });
        }

        setEditingBankId(null);
        setShowBankForm(false);
        setAccountHolderName('');
        setAccountNumber('');
        setIfscCode('');
        setBankName('');
        setBranchName('');
        setAccountType('SAVINGS');
        setIsPrimaryBank(false);
        setBankStatus(1);
        fetchSupplierBanks(selectedSupplier.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to save bank account.', { id: toastId });
      } finally {
        setSavingBank(false);
      }
    }
  };

  const handleDeleteBank = async (bankId: number) => {
    if (type === 'client') {
      if (!selectedClient?.id) return;
      if (!confirm('Are you sure you want to delete this bank account?')) return;

      const toastId = toast.loading('Deleting bank account...');
      try {
        await axiosInstance.delete(`/client/bank/${bankId}`);
        toast.success('Bank account deleted successfully!', { id: toastId });
        fetchBuBanks(selectedClient.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to delete bank account.', { id: toastId });
      }
    } else {
      if (!selectedSupplier?.id) return;
      if (!confirm('Are you sure you want to delete this bank account?')) return;

      const toastId = toast.loading('Deleting bank account...');
      try {
        await axiosInstance.delete(`/vendor/supplier-banks/${bankId}`);
        toast.success('Bank account deleted successfully!', { id: toastId });
        fetchSupplierBanks(selectedSupplier.id);
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to delete bank account.', { id: toastId });
      }
    }
  };

  const handleEditBankClick = (bank: any) => {
    setEditingBankId(bank.id);
    if (type === 'client') {
      setAccountHolderName(bank.accountHolderName || '');
      setAccountNumber(bank.accountNumber || '');
      setIfscCode(bank.ifscCode || '');
      setBankName(bank.bankName || '');
      setBranchName(bank.branchName || '');
      setIsPrimaryBank(!!bank.isPrimary);
    } else {
      setAccountHolderName(bank.accountName || '');
      setAccountNumber(bank.accountNumber || '');
      setIfscCode(bank.ifsc || '');
      setBankName(bank.bankName || '');
      setBranchName(bank.branch || '');
      setAccountType(bank.accountType || 'SAVINGS');
      setIsPrimaryBank(!!bank.isPrimary);
      setBankStatus(bank.status !== undefined ? bank.status : 1);
    }
    setShowBankForm(true);
  };

  const handleFileChangeAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadingFile(true);
    setUploadedFileInfo(null);

    const toastId = toast.loading(`Uploading "${file.name}"...`);

    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = type === 'client' 
      ? '/client/upload?category=client' 
      : '/vendor/upload?category=supplier';

    try {
      const response = await axiosInstance.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data?.success && response.data?.data) {
        setUploadedFileInfo(response.data.data);
        toast.success('File uploaded successfully!', { id: toastId });
      } else {
        throw new Error('Upload response was not successful');
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
      toast.error(err.response?.data?.message || 'File upload failed. Please try again.', { id: toastId });
      setSelectedFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id) {
      toast.error('Client ID is missing.');
      return;
    }
    if (!docTypeId) {
      toast.error('Document Type is required.');
      return;
    }
    if (!docNumber.trim()) {
      toast.error('Document Number is required.');
      return;
    }
    if (!uploadedFileInfo) {
      toast.error('Please upload a document file.');
      return;
    }

    setSavingDocument(true);
    const toastId = toast.loading('Registering document...');

    const payload = {
      clientId: selectedClient.id,
      documentTypeId: Number(docTypeId),
      documentUrl: uploadedFileInfo.path,
      originalName: uploadedFileInfo.originalName,
      contentType: uploadedFileInfo.contentType,
      fileSize: uploadedFileInfo.size,
      documentNumber: docNumber.trim()
    };

    try {
      await axiosInstance.post('/client/document', payload);
      toast.success('Document registered successfully!', { id: toastId });

      setShowDocumentForm(false);
      setDocTypeId('');
      setDocNumber('');
      setSelectedFile(null);
      setUploadedFileInfo(null);

      fetchClientDocuments(selectedClient.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to register document.', { id: toastId });
    } finally {
      setSavingDocument(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!selectedClient?.id) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    const toastId = toast.loading('Deleting document...');
    try {
      await axiosInstance.delete(`/client/document/${docId}`);
      toast.success('Document deleted successfully!', { id: toastId });
      fetchClientDocuments(selectedClient.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete document.', { id: toastId });
    }
  };

  const handleDownloadDocument = async (documentUrl: string, originalName: string) => {
    // Remove "client/" from documentUrl if it starts with it
    const filename = documentUrl.startsWith('client/') ? documentUrl.replace('client/', '') : documentUrl;
    const downloadUrl = `/client/upload/files/client/${filename}`;
    
    const toastId = toast.loading(`Downloading "${originalName}"...`);
    try {
      const response = await axiosInstance.get(downloadUrl, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download completed successfully', { id: toastId });
    } catch (err: any) {
      console.error('Failed to download document:', err);
      toast.error(err.response?.data?.message || 'Failed to download document', { id: toastId });
    }
  };

  const handleSaveSupplierDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier?.id) {
      toast.error('Supplier ID is missing.');
      return;
    }
    if (!supDocType.trim() || !supDocNumber.trim()) {
      toast.error('Document Type and Number are required.');
      return;
    }
    if (!editingSupplierDocId && !uploadedFileInfo) {
      toast.error('Please upload a document file first.');
      return;
    }

    setSavingSupplierDoc(true);
    const toastId = toast.loading(editingSupplierDocId ? 'Updating document...' : 'Saving document...');

    try {
      if (editingSupplierDocId) {
        const payload: any = {
          documentType: supDocType.trim(),
          documentNumber: supDocNumber.trim(),
          remarks: supDocRemarks.trim(),
          status: Number(supDocStatus)
        };
        if (uploadedFileInfo) {
          payload.filePath = uploadedFileInfo.path;
          payload.originalName = uploadedFileInfo.originalName;
          payload.contentType = uploadedFileInfo.contentType;
          payload.fileSize = uploadedFileInfo.size;
        }
        await axiosInstance.put(`/vendor/supplier-documents/${editingSupplierDocId}`, payload);
        toast.success('Document updated successfully!', { id: toastId });
      } else {
        const payload = {
          supplierId: selectedSupplier.id,
          documentType: supDocType.trim(),
          documentNumber: supDocNumber.trim(),
          filePath: uploadedFileInfo!.path,
          originalName: uploadedFileInfo!.originalName,
          contentType: uploadedFileInfo!.contentType,
          fileSize: uploadedFileInfo!.size,
          remarks: supDocRemarks.trim()
        };
        await axiosInstance.post('/vendor/supplier-documents', payload);
        toast.success('Document saved successfully!', { id: toastId });
      }

      setShowSupplierDocForm(false);
      setEditingSupplierDocId(null);
      setSupDocType('');
      setSupDocNumber('');
      setSupDocRemarks('');
      setSupDocStatus(1);
      setSelectedFile(null);
      setUploadedFileInfo(null);
      fetchSupplierDocuments(selectedSupplier.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save document.', { id: toastId });
    } finally {
      setSavingSupplierDoc(false);
    }
  };

  const handleEditSupplierDocClick = (doc: any) => {
    setEditingSupplierDocId(doc.id);
    setSupDocType(doc.documentType || '');
    setSupDocNumber(doc.documentNumber || '');
    setSupDocRemarks(doc.remarks || '');
    setSupDocStatus(doc.status !== undefined ? doc.status : 1);
    setSelectedFile(null);
    setUploadedFileInfo({
      path: doc.filePath,
      originalName: doc.originalName,
      contentType: doc.contentType || '',
      size: doc.fileSize || 0
    });
    setShowSupplierDocForm(true);
  };

  const handleDeleteSupplierDocument = async (docId: number) => {
    if (!selectedSupplier?.id) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    const toastId = toast.loading('Deleting document...');
    try {
      await axiosInstance.delete(`/vendor/supplier-documents/${docId}`);
      toast.success('Document deleted successfully!', { id: toastId });
      fetchSupplierDocuments(selectedSupplier.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete document.', { id: toastId });
    }
  };

  const handleDownloadSupplierDocument = async (documentUrl: string, originalName: string) => {
    const cleanUrl = documentUrl.startsWith('vendor/') ? documentUrl.replace('vendor/', '') : documentUrl;
    const filename = cleanUrl.startsWith('supplier/') ? cleanUrl.replace('supplier/', '') : cleanUrl;
    const downloadUrl = `/vendor/upload/files/supplier/${filename}`;

    const toastId = toast.loading(`Downloading "${originalName}"...`);
    try {
      const response = await axiosInstance.get(downloadUrl, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download completed successfully', { id: toastId });
    } catch (err: any) {
      console.error('Failed to download supplier document:', err);
      toast.error(err.response?.data?.message || 'Failed to download document', { id: toastId });
    }
  };

  const handleSaveDocumentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTypeCode.trim() || !docTypeName.trim() || !docTypeDescription.trim()) {
      toast.error('All fields are required.');
      return;
    }

    setSavingDocumentType(true);
    const toastId = toast.loading(editingDocumentTypeId ? 'Updating document type...' : 'Creating document type...');

    const payload = {
      typeCode: docTypeCode.trim().toUpperCase(),
      typeName: docTypeName.trim(),
      description: docTypeDescription.trim()
    };

    try {
      if (editingDocumentTypeId) {
        await axiosInstance.put(`/client/document-type/${editingDocumentTypeId}`, payload);
        toast.success('Document Type updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/client/document-type', payload);
        toast.success('Document Type created successfully!', { id: toastId });
      }

      setEditingDocumentTypeId(null);
      setDocTypeCode('');
      setDocTypeName('');
      setDocTypeDescription('');
      fetchDocumentTypes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save document type.', { id: toastId });
    } finally {
      setSavingDocumentType(false);
    }
  };

  const handleDeleteDocumentType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document type?')) return;

    const toastId = toast.loading('Deleting document type...');
    try {
      await axiosInstance.delete(`/client/document-type/${id}`);
      toast.success('Document Type deleted successfully!', { id: toastId });
      fetchDocumentTypes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete document type.', { id: toastId });
    }
  };

  const handleSaveSupplierEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier?.id) {
      toast.error('Supplier ID is missing.');
      return;
    }
    if (!emailAddress.trim()) {
      toast.error('Email address is required.');
      return;
    }

    setSavingEmail(true);
    const toastId = toast.loading(editingEmailId ? 'Updating email configuration...' : 'Adding email configuration...');

    try {
      if (editingEmailId) {
        const payload = {
          email: emailAddress.trim(),
          type: emailType,
          status: Number(emailStatus)
        };
        await axiosInstance.put(`/vendor/supplier-emails/${editingEmailId}`, payload);
        toast.success('Email configuration updated successfully!', { id: toastId });
      } else {
        const payload = {
          supplierId: selectedSupplier.id,
          email: emailAddress.trim(),
          type: emailType
        };
        await axiosInstance.post('/vendor/supplier-emails', payload);
        toast.success('Email configuration added successfully!', { id: toastId });
      }

      setShowEmailForm(false);
      setEditingEmailId(null);
      setEmailAddress('');
      setEmailType('TO');
      setEmailStatus(1);
      fetchSupplierEmails(selectedSupplier.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save email configuration.', { id: toastId });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleEditEmailClick = (emailObj: any) => {
    setEditingEmailId(emailObj.id);
    setEmailAddress(emailObj.email || '');
    setEmailType(emailObj.type || 'TO');
    setEmailStatus(emailObj.status || 1);
    setShowEmailForm(true);
  };

  const handleDeleteSupplierEmail = async (emailId: number) => {
    if (!selectedSupplier?.id) return;
    if (!confirm('Are you sure you want to delete this email configuration?')) return;

    const toastId = toast.loading('Deleting email configuration...');
    try {
      await axiosInstance.delete(`/vendor/supplier-emails/${emailId}`);
      toast.success('Email configuration deleted successfully!', { id: toastId });
      fetchSupplierEmails(selectedSupplier.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete email configuration.', { id: toastId });
    }
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      toast.error('Tag Name is required.');
      return;
    }

    setSavingTag(true);
    const toastId = toast.loading(editingTagId ? 'Updating tag...' : 'Creating tag...');

    try {
      if (type === 'client') {
        const payload = {
          tagName: tagName.trim()
        };
        if (editingTagId) {
          await axiosInstance.put(`/client/tag/${editingTagId}`, payload);
          toast.success('Tag updated successfully!', { id: toastId });
        } else {
          await axiosInstance.post('/client/tag', payload);
          toast.success('Tag created successfully!', { id: toastId });
        }
      } else {
        if (editingTagId) {
          const payload = {
            name: tagName.trim(),
            status: Number(tagStatus)
          };
          await axiosInstance.put(`/vendor/supplier-tags/${editingTagId}`, payload);
          toast.success('Tag updated successfully!', { id: toastId });
        } else {
          const payload = {
            name: tagName.trim()
          };
          await axiosInstance.post('/vendor/supplier-tags', payload);
          toast.success('Tag created successfully!', { id: toastId });
        }
      }

      setEditingTagId(null);
      setShowTagForm(false);
      setTagName('');
      setTagStatus(1);
      fetchGlobalTags();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save tag.', { id: toastId });
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (type !== 'client') return;
    if (!confirm('Are you sure you want to delete this tag?')) return;

    const toastId = toast.loading('Deleting tag...');
    try {
      await axiosInstance.delete(`/client/tag/${tagId}`);
      toast.success('Tag deleted successfully!', { id: toastId });
      fetchGlobalTags();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete tag.', { id: toastId });
    }
  };

  const handleEditTagClick = (tag: any) => {
    setEditingTagId(tag.id);
    setTagName(type === 'client' ? (tag.tagName || '') : (tag.name || ''));
    setTagStatus(tag.status !== undefined ? tag.status : 1);
    setShowTagForm(true);
  };

  const handleSaveGst = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id || !buId) {
      toast.error('Client ID or Business Unit ID is missing.');
      return;
    }
    if (selectedStateIndex === '') {
      toast.error('Please select a GST state.');
      return;
    }
    if (!gstAddressId) {
      toast.error('Please select an address.');
      return;
    }

    const stateObj = statesList[Number(selectedStateIndex)];
    if (!stateObj) {
      toast.error('Selected state is invalid.');
      return;
    }

    setSavingGst(true);
    const toastId = toast.loading(editingGstId ? 'Updating GST registration...' : 'Adding GST registration...');

    const payload = {
      clientId: selectedClient.id,
      businessUnitId: buId,
      gstin: gstin.trim(),
      gstState: stateObj.stateName,
      gstStateCode: stateObj.stateCode,
      addressId: Number(gstAddressId),
      isPrimary: !!gstIsPrimary
    };

    try {
      if (editingGstId) {
        await axiosInstance.put(`/client/gst/${editingGstId}`, payload);
        toast.success('GST registration updated successfully!', { id: toastId });
      } else {
        await axiosInstance.post('/client/gst', payload);
        toast.success('GST registration created successfully!', { id: toastId });
      }

      // Reset fields
      setEditingGstId(null);
      setShowGstForm(false);
      setGstin('');
      setSelectedStateIndex('');
      setGstAddressId('');
      setGstIsPrimary(false);

      // Re-fetch
      fetchClientGsts(buId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save GST registration.', { id: toastId });
    } finally {
      setSavingGst(false);
    }
  };

  const handleDeleteGst = async (gstId: number) => {
    if (!buId) return;
    if (!confirm('Are you sure you want to delete this GST registration?')) return;

    const toastId = toast.loading('Deleting GST registration...');
    try {
      await axiosInstance.delete(`/client/gst/${gstId}`);
      toast.success('GST registration deleted successfully!', { id: toastId });
      fetchClientGsts(buId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete GST registration.', { id: toastId });
    }
  };

  const handleEditGstClick = (gst: any) => {
    setEditingGstId(gst.id);
    setGstin(gst.gstin || '');
    setGstAddressId(gst.addressId || '');
    setGstIsPrimary(!!gst.isPrimary);

    // Find state index in statesList
    const idx = statesList.findIndex(s => s.stateCode === gst.gstStateCode);
    setSelectedStateIndex(idx !== -1 ? idx : '');

    setShowGstForm(true);
  };

  useEffect(() => {
    if (!selectedClient?.id) {
      setFetchedClientId(null);
      return;
    }
    if (type === 'client' && selectedClient.id !== fetchedClientId) {
      const fetchClientDetails = async () => {
        try {
          const res = await axiosInstance.get(`/client/${selectedClient.id}`);
          const clientData = res.data?.data || res.data;
          
          if (clientData) {
            setFetchedClientId(selectedClient.id);
            // Update Redux state with latest detailed client details
            dispatch(selectClient(clientData));
            
            const buData = clientData.businessUnits?.[0];
            if (buData) {
              setBuOriginalData(buData);
              setBuId(buData.id);
              setBuUnitCode(buData.unitCode || 'B2C');
              setBuUnitName(buData.unitName || '');
              setBuUnitLegalName(buData.legalName || '');
              setBuDispatchWithinDays(buData.dispatchWithinDays ?? 2);
              setBuDeliverWithinDays(buData.deliverWithinDays ?? 7);
              setBuHasOwnProductCode(buData.hasOwnProductCode ?? true);
              setBuHasMultiProductOrder(buData.hasMultiProductOrder ?? true);
              setIsLegalNameSynced(false);
            } else {
              setBuOriginalData(null);
              setBuId(undefined);
              setBuUnitCode('B2C');
              setBuUnitName(clientData.clientName + ' Unit');
              setBuUnitLegalName(clientData.legalName);
              setBuDispatchWithinDays(2);
              setBuDeliverWithinDays(7);
              setBuHasOwnProductCode(true);
              setBuHasMultiProductOrder(true);
              setIsLegalNameSynced(true);
            }
          }
        } catch (err) {
          console.error('Failed to fetch client details:', err);
          setFetchedClientId(selectedClient.id); // Also set to prevent infinite loop on failure
          // Fallback if GET /client/:id fails: use selectedClient properties
          const buData = selectedClient.businessUnits?.[0];
          if (buData) {
            setBuOriginalData(buData);
            setBuId(buData.id);
            setBuUnitCode(buData.unitCode || 'B2C');
            setBuUnitName(buData.unitName || '');
            setBuUnitLegalName(buData.legalName || '');
            setBuDispatchWithinDays(buData.dispatchWithinDays ?? 2);
            setBuDeliverWithinDays(buData.deliverWithinDays ?? 7);
            setBuHasOwnProductCode(buData.hasOwnProductCode ?? true);
            setBuHasMultiProductOrder(buData.hasMultiProductOrder ?? true);
            setIsLegalNameSynced(false);
          } else {
            setBuOriginalData(null);
            setBuId(undefined);
            setBuUnitCode('B2C');
            setBuUnitName(selectedClient.clientName + ' Unit');
            setBuUnitLegalName(selectedClient.legalName);
            setBuDispatchWithinDays(2);
            setBuDeliverWithinDays(7);
            setBuHasOwnProductCode(true);
            setBuHasMultiProductOrder(true);
            setIsLegalNameSynced(true);
          }
        }
      };
      fetchClientDetails();
    }
  }, [selectedClient?.id, fetchedClientId, type, dispatch]);

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
    { code: 'address', title: 'Address', icon: MapPin, desc: 'Billing & shipping addresses' },
    { code: 'business-unit', title: 'Business Unit', icon: Building2, desc: 'Branches & business units' },
    { code: 'contacts', title: 'Contacts', icon: Users, desc: 'Key contact persons' },
    { code: 'banks', title: 'Banks', icon: CreditCard, desc: 'Payment bank accounts' },
    { code: 'documents', title: 'Documents', icon: FileText, desc: 'Compliance & attachments' },
    { code: 'tags', title: 'Tags', icon: Tag, desc: 'GST & registration info' },
  ];

  const supplierTabs = [
    { code: 'profile', title: 'Profile', icon: User, desc: 'Supplier profile details' },
    { code: 'address', title: 'Address', icon: MapPin, desc: 'Office & warehouse locations' },
    { code: 'contacts', title: 'Contacts', icon: Users, desc: 'Key contact persons' },
    { code: 'banks', title: 'Banks', icon: CreditCard, desc: 'Remittance bank accounts' },
    { code: 'documents', title: 'Documents', icon: FileText, desc: 'Agreements & certifications' },
    { code: 'emails', title: 'Emails', icon: Mail, desc: 'Communication logs' },
    { code: 'tags', title: 'Tags', icon: Tag, desc: 'Tax configuration' },
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
      businessUnits: [
        {
          ...buOriginalData,
          id: buId,
          unitCode: buUnitCode.trim(),
          unitName: buUnitName.trim(),
          legalName: buUnitLegalName.trim(),
          dispatchWithinDays: buDispatchWithinDays === '' ? 2 : Number(buDispatchWithinDays),
          deliverWithinDays: buDeliverWithinDays === '' ? 7 : Number(buDeliverWithinDays),
          hasOwnProductCode: !!buHasOwnProductCode,
          hasMultiProductOrder: !!buHasMultiProductOrder
        }
      ]
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

  const channelTypeOptions = useMemo(() => {
    return commEnums.filter(e => e.type === 'CHANNEL_TYPE');
  }, [commEnums]);


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
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Client Code <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editClientCode} 
                    onChange={e => setEditClientCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editClientName} 
                    onChange={e => setEditClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editLegalName} 
                    onChange={e => setEditLegalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Logo URL</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="url" 
                      value={editLogoUrl} 
                      onChange={e => setEditLogoUrl(e.target.value)}
                      placeholder="e.g. https://logo.png"
                      className="flex-grow px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    {editLogoUrl && (
                      <div className="flex-shrink-0 p-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                        <img 
                          src={editLogoUrl} 
                          alt="Logo Preview" 
                          className="h-8 w-auto max-w-[80px] object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
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

      case 'business-unit': {
        const buSubTabs = [
          { code: 'profile', title: 'Profile' },
          { code: 'programs', title: 'Programs' },
          { code: 'gst', title: 'GST' },
          { code: 'payment-modes', title: 'Payment Modes' },
          { code: 'config', title: 'Config' },
          { code: 'comm-templates', title: 'Communication Template' },
        ];

        return (
          <div className="space-y-6">
            {/* Sub Tabs Horizontal Menu */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none gap-6 pb-px">
              {buSubTabs.map((subTab) => {
                const isActive = buSubTab === subTab.code;
                return (
                  <button
                    key={subTab.code}
                    type="button"
                    onClick={() => setBuSubTab(subTab.code)}
                    className={`pb-3 text-xs font-bold transition-all relative flex-shrink-0 ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {subTab.title}
                  </button>
                );
              })}
            </div>

            {/* Sub Tab Content */}
            {buSubTab === 'profile' && (
              <form onSubmit={handleBUSave} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-850 gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-850 dark:text-white">Business Unit Profile</h3>
                    <p className="text-xs text-slate-400">Configure business unit settings and ordering rules.</p>
                  </div>
                  <button 
                    type="submit"
                    disabled={savingBU}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                  >
                    <ShieldCheck size={14} />
                    {savingBU ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Unit Code <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={buUnitCode} 
                        onChange={e => setBuUnitCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Unit Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={buUnitName} 
                        onChange={e => setBuUnitName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={buUnitLegalName} 
                      onChange={e => setBuUnitLegalName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Dispatch Days</label>
                      <input 
                        type="number" 
                        value={buDispatchWithinDays} 
                        onChange={e => setBuDispatchWithinDays(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivery Days</label>
                      <input 
                        type="number" 
                        value={buDeliverWithinDays} 
                        onChange={e => setBuDeliverWithinDays(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Client has Own Product code</label>
                      <select 
                        value={buHasOwnProductCode ? 'true' : 'false'} 
                        onChange={e => setBuHasOwnProductCode(e.target.value === 'true')}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Multiple Product Order</label>
                      <select 
                        value={buHasMultiProductOrder ? 'true' : 'false'} 
                        onChange={e => setBuHasMultiProductOrder(e.target.value === 'true')}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {buSubTab === 'programs' && (
              type === 'client' ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-white">Loyalty & Reward Programs</h3>
                      <p className="text-xs text-slate-400">Manage client reward schedules and special discount campaigns.</p>
                    </div>
                    {!showProgramForm && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingProgramId(null);
                          setProgCode('');
                          setProgName('');
                          setProgLabel('');
                          setProgPoweredBy('');
                          setProgAllowRpi(false);
                          setProgPriorityProc(false);
                          setProgSpecialPack(false);
                          setProgSepInvPrint(false);
                          setProgSepPicklist(false);
                          setProgSepBatching(false);
                          setProgTatHours(0);
                          setProgPrintGroup('');
                          setShowProgramForm(true);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                      >
                        <Plus size={14} /> Add Program
                      </button>
                    )}
                  </div>

                  {/* Form card when active */}
                  {showProgramForm && (
                    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                          {editingProgramId ? 'Edit Program' : 'Add New Program'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowProgramForm(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveProgram} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Program Code <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              value={progCode} 
                              onChange={e => setProgCode(e.target.value)}
                              placeholder="e.g. TEST001"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Program Name <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              value={progName} 
                              onChange={e => setProgName(e.target.value)}
                              placeholder="e.g. Test Program 001"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Program Label <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              value={progLabel} 
                              onChange={e => setProgLabel(e.target.value)}
                              placeholder="e.g. Test Program 001"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Powered By Description <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              value={progPoweredBy} 
                              onChange={e => setProgPoweredBy(e.target.value)}
                              placeholder="e.g. Test Power"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              TAT Hours <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="number" 
                              required
                              value={progTatHours} 
                              onChange={e => setProgTatHours(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="e.g. 10"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Print Group <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              value={progPrintGroup} 
                              onChange={e => setProgPrintGroup(e.target.value)}
                              placeholder="e.g. TEST001"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Allow RPI</label>
                            <select 
                              value={progAllowRpi ? 'true' : 'false'} 
                              onChange={e => setProgAllowRpi(e.target.value === 'true')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Is Priority Procurement</label>
                            <select 
                              value={progPriorityProc ? 'true' : 'false'} 
                              onChange={e => setProgPriorityProc(e.target.value === 'true')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Is Special Packing</label>
                            <select 
                              value={progSpecialPack ? 'true' : 'false'} 
                              onChange={e => setProgSpecialPack(e.target.value === 'true')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Is Separate Invoice Print</label>
                            <select 
                              value={progSepInvPrint ? 'true' : 'false'} 
                              onChange={e => setProgSepInvPrint(e.target.value === 'true')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Is Separate Picklist</label>
                            <select 
                              value={progSepPicklist ? 'true' : 'false'} 
                              onChange={e => setProgSepPicklist(e.target.value === 'true')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Is Separate Batching</label>
                            <select 
                              value={progSepBatching ? 'true' : 'false'} 
                              onChange={e => setProgSepBatching(e.target.value === 'true')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => setShowProgramForm(false)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingProgram}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <ShieldCheck size={14} />
                            {savingProgram ? 'Saving...' : editingProgramId ? 'Update Program' : 'Create Program'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Table displaying programs */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <th className="p-3.5 pl-5 w-16">S.No</th>
                            <th className="p-3.5">Program Code</th>
                            <th className="p-3.5">Program Name</th>
                            <th className="p-3.5">Program Label</th>
                            <th className="p-3.5 pr-5 text-right w-28">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-600 dark:text-slate-350">
                          {loadingPrograms ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                Loading programs...
                              </td>
                            </tr>
                          ) : clientPrograms.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                No programs found. Click "Add Program" to create one.
                              </td>
                            </tr>
                          ) : (
                            clientPrograms.map((prog, idx) => (
                              <tr key={prog.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="p-3.5 pl-5 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                                <td className="p-3.5 font-mono text-slate-800 dark:text-white font-semibold">
                                  {prog.programCode || '-'}
                                </td>
                                <td className="p-3.5 text-slate-800 dark:text-slate-200">{prog.programName || '-'}</td>
                                <td className="p-3.5 text-slate-850 dark:text-slate-350">{prog.programLabel || '-'}</td>
                                <td className="p-3.5 pr-5 text-right space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEditProgramClick(prog)}
                                    className="p-1 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                                    title="Edit Program"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProgram(prog.id)}
                                    className="p-1 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                                    title="Delete Program"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-855">
                    <div>
                      <h3 className="text-base font-semibold text-slate-850 dark:text-white">Loyalty & Reward Programs</h3>
                      <p className="text-xs text-slate-400">Manage client reward schedules and special discount campaigns.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const name = prompt('Enter Program Name:');
                        const discount = prompt('Enter Discount %:');
                        if (name && discount) {
                          setBuPrograms([
                            ...buPrograms,
                            { id: Date.now(), name, code: name.slice(0, 5).toUpperCase(), discount, status: true, validity: 'Unlimited' }
                          ]);
                          toast.success('Program added successfully!');
                        }
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                    >
                      <Plus size={14} /> Add Program
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <th className="p-3.5 pl-5">Program Name</th>
                            <th className="p-3.5">Code</th>
                            <th className="p-3.5">Discount Rate</th>
                            <th className="p-3.5">Validity</th>
                            <th className="p-3.5 text-center">Status</th>
                            <th className="p-3.5 pr-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-600 dark:text-slate-350">
                          {buPrograms.map((prog) => (
                            <tr key={prog.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="p-3.5 pl-5 font-semibold text-slate-800 dark:text-slate-200">
                                {prog.name}
                              </td>
                              <td className="p-3.5">
                                <span className="font-mono bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded text-[10px]">
                                  {prog.code}
                                </span>
                              </td>
                              <td className="p-3.5 text-blue-600 dark:text-blue-400 font-bold">{prog.discount}</td>
                              <td className="p-3.5">{prog.validity}</td>
                              <td className="p-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBuPrograms(buPrograms.map(p => p.id === prog.id ? { ...p, status: !p.status } : p));
                                    toast.success(`Program ${prog.status ? 'disabled' : 'enabled'} successfully!`);
                                  }}
                                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${prog.status ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                                >
                                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${prog.status ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                              </td>
                              <td className="p-3.5 pr-5 text-right space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const name = prompt('Update Program Name:', prog.name);
                                    const discount = prompt('Update Discount %:', prog.discount);
                                    if (name && discount) {
                                      setBuPrograms(buPrograms.map(p => p.id === prog.id ? { ...p, name, discount } : p));
                                      toast.success('Program updated successfully!');
                                    }
                                  }}
                                  className="p-1 hover:text-blue-500 rounded transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Delete this program?')) {
                                      setBuPrograms(buPrograms.filter(p => p.id !== prog.id));
                                      toast.success('Program removed!');
                                    }
                                  }}
                                  className="p-1 hover:text-red-500 rounded transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            )}

            {buSubTab === 'gst' && (
              type === 'client' ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-white">GST & Tax Registrations</h3>
                      <p className="text-xs text-slate-400">Configure Goods and Services Tax credentials for this business unit.</p>
                    </div>
                    {!showGstForm && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingGstId(null);
                          setGstin('');
                          setSelectedStateIndex('');
                          setGstAddressId('');
                          setGstIsPrimary(false);
                          setShowGstForm(true);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                      >
                        <Plus size={14} /> Add GST
                      </button>
                    )}
                  </div>

                  {/* Form card when active */}
                  {showGstForm && (
                    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                          {editingGstId ? 'Edit GST Registration' : 'Add New GST Registration'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowGstForm(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveGst} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              GSTIN <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              maxLength={15}
                              value={gstin} 
                              onChange={e => setGstin(e.target.value.toUpperCase())}
                              placeholder="e.g. 29RPFXV9716UNZV"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              GST State & Code <span className="text-red-500">*</span>
                            </label>
                            <select 
                              required
                              value={selectedStateIndex} 
                              onChange={e => setSelectedStateIndex(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="">Select State</option>
                              {statesList.map((state, idx) => (
                                <option key={idx} value={idx}>
                                  {state.stateName} ({state.stateCode})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Address <span className="text-red-500">*</span>
                            </label>
                            <select 
                              required
                              value={gstAddressId} 
                              onChange={e => setGstAddressId(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="">Select Address</option>
                              {clientAddresses.map((addr) => (
                                <option key={addr.id} value={addr.id}>
                                  {addr.addressLine1}, {addr.city} ({addr.pincode})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Is Primary</label>
                            <select 
                              value={gstIsPrimary ? 'true' : 'false'} 
                              onChange={e => setGstIsPrimary(e.target.value === 'true')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => setShowGstForm(false)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingGst}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <ShieldCheck size={14} />
                            {savingGst ? 'Saving...' : editingGstId ? 'Update GST' : 'Create GST'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Table displaying GST registrations */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <th className="p-3.5 pl-5 w-16">S.No</th>
                            <th className="p-3.5">GST</th>
                            <th className="p-3.5">GST State</th>
                            <th className="p-3.5">Code</th>
                            <th className="p-3.5">Address</th>
                            <th className="p-3.5 text-center">Primary</th>
                            <th className="p-3.5 pr-5 text-right w-28">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-600 dark:text-slate-350">
                          {loadingGsts ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                                Loading GST registrations...
                              </td>
                            </tr>
                          ) : clientGsts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                                No GST registrations found. Click "Add GST" to create one.
                              </td>
                            </tr>
                          ) : (
                            clientGsts.map((gst, idx) => {
                              // Resolve address
                              const addr = clientAddresses.find(a => a.id === gst.addressId);
                              const addressStr = addr 
                                ? `${addr.addressLine1}, ${addr.addressLine2 ? addr.addressLine2 + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pincode}`
                                : `Address #${gst.addressId}`;

                              return (
                                <tr key={gst.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                  <td className="p-3.5 pl-5 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                                  <td className="p-3.5 font-mono text-slate-800 dark:text-white font-semibold">
                                    {gst.gstin || '-'}
                                  </td>
                                  <td className="p-3.5 text-slate-800 dark:text-slate-200">{gst.gstState || '-'}</td>
                                  <td className="p-3.5 font-mono text-[11px] text-slate-500">{gst.gstStateCode || '-'}</td>
                                  <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={addressStr}>
                                    {addressStr}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold leading-5 ${gst.isPrimary ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                                      {gst.isPrimary ? 'Yes' : 'No'}
                                    </span>
                                  </td>
                                  <td className="p-3.5 pr-5 text-right space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditGstClick(gst)}
                                      className="p-1 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                                      title="Edit GST"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGst(gst.id)}
                                      className="p-1 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                                      title="Delete GST"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); toast.success('GST Configuration updated successfully!'); }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-855 gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-850 dark:text-white">GST & Tax Registrations</h3>
                      <p className="text-xs text-slate-400">Configure Goods and Services Tax credentials for this business unit.</p>
                    </div>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02]"
                    >
                      <ShieldCheck size={14} /> Save Tax Profile
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        GSTIN Registration Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          maxLength={15}
                          value={buGstNo} 
                          onChange={e => setBuGstNo(e.target.value.toUpperCase())}
                          className="w-full pl-3.5 pr-20 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          VERIFIED
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        PAN Card Number <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        maxLength={10}
                        value={buPanNo} 
                        onChange={e => setBuPanNo(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered GST State</label>
                      <select 
                        value={buGstState} 
                        onChange={e => setBuGstState(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      >
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Gujarat">Gujarat</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered GST Address</label>
                      <textarea 
                        value={buGstAddress} 
                        onChange={e => setBuGstAddress(e.target.value)}
                        rows={2}
                        className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </form>
              )
            )}

            {buSubTab === 'payment-modes' && (
              <form onSubmit={handleSavePaymentModes} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800 gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">Payment Options</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-550">Configure enabled payment methods for this business unit.</p>
                  </div>
                  <button 
                    type="submit"
                    disabled={savingBuPaymentModes || loadingBuPaymentModes}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingBuPaymentModes ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Save Payment Modes
                      </>
                    )}
                  </button>
                </div>

                {loadingBuPaymentModes ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-550">
                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs">Loading payment options...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {masterPaymentModes.map((mode) => {
                      const isActive = selectedPaymentModeIds.includes(mode.id);
                      return (
                        <div key={mode.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-850 dark:text-white">{mode.name}</h4>
                              <span className="px-1.5 py-0.25 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold">
                                Code: {mode.code}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{mode.desc}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => togglePaymentMode(mode.id)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </form>
            )}

            {buSubTab === 'config' && (
              <form onSubmit={handleSaveCredentials} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800 gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">API & Technical Integrations</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-555">Configure merchant credentials, security keys, and environment for this business unit.</p>
                  </div>
                  <button 
                    type="submit"
                    disabled={savingCredentials || loadingCredentials}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingCredentials ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Save Configurations
                      </>
                    )}
                  </button>
                </div>

                {loadingCredentials || loadingEnvironments ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-550">
                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs">Loading API configurations...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Merchant ID <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={merchantId} 
                        onChange={e => setMerchantId(e.target.value)}
                        placeholder="e.g. 0GZUTWABXK6Q2MP"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        API Environment <span className="text-red-500">*</span>
                      </label>
                      <select 
                        required
                        value={environmentId} 
                        onChange={e => setEnvironmentId(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      >
                        <option value="">Select Environment</option>
                        {environments.map((env) => (
                          <option key={env.id} value={env.id}>
                            {env.envName} ({env.envCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Merchant API Secret Key <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type={showSecret ? 'text' : 'password'} 
                          required
                          value={secretKey} 
                          onChange={e => setSecretKey(e.target.value)}
                          placeholder="Enter secret key token"
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors"
                        >
                          {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {buSubTab === 'comm-templates' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800 gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-850 dark:text-white">Communication Alert Templates</h3>
                    <p className="text-xs text-slate-400">Configure custom transactional text alerts triggered by package/order status updates.</p>
                  </div>
                  {!showCommForm && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingCommTemplateId(null);
                        setPackStatus('');
                        setMessageText('');
                        setChannelType('');
                        setSubject('');
                        setShowCommForm(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02]"
                    >
                      <Plus size={14} /> Add Template
                    </button>
                  )}
                </div>

                {showCommForm ? (
                  <form onSubmit={handleSaveCommTemplate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Pack Status / Trigger Event <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={packStatus} 
                          onChange={e => setPackStatus(e.target.value)}
                          placeholder="e.g. SHIPPED"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Channel Type <span className="text-red-500">*</span>
                        </label>
                        <select 
                          required
                          value={channelType} 
                          onChange={e => setChannelType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        >
                          <option value="">Select Channel</option>
                          {channelTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Subject
                        </label>
                        <input 
                          type="text" 
                          value={subject} 
                          onChange={e => setSubject(e.target.value)}
                          placeholder="e.g. Order Shipped (Optional/Required for Email)"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Message Content (supports template variables) <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          required
                          rows={3}
                          value={messageText} 
                          onChange={e => setMessageText(e.target.value)}
                          placeholder="e.g. Order Confirmation - {{orderId}}"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-slate-550">
                          Available variables: <code className="font-mono text-blue-500">{"{{orderId}}"}</code>, <code className="font-mono text-blue-500">{"{{amount}}"}</code>, <code className="font-mono text-blue-500">{"{{clientName}}"}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCommForm(false);
                          setEditingCommTemplateId(null);
                          setPackStatus('');
                          setMessageText('');
                          setChannelType('');
                          setSubject('');
                        }}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingCommTemplate}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                      >
                        {savingCommTemplate ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} />
                            {editingCommTemplateId ? 'Update Template' : 'Save Template'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <th className="p-3.5 pl-5 w-1/5">Pack Status / Event</th>
                            <th className="p-3.5 w-1/8">Channel</th>
                            <th className="p-3.5 w-1/5">Subject</th>
                            <th className="p-3.5 w-2/5">Message Text Template</th>
                            <th className="p-3.5 text-center w-1/10">Status</th>
                            <th className="p-3.5 pr-5 text-right w-1/10">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-600 dark:text-slate-350">
                          {loadingCommTemplates ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400">
                                <div className="flex items-center justify-center gap-2">
                                  <RefreshCw size={14} className="animate-spin text-blue-600" />
                                  <span>Loading templates...</span>
                                </div>
                              </td>
                            </tr>
                          ) : buCommTemplates.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400">
                                No custom templates set for this business unit.
                              </td>
                            </tr>
                          ) : (
                            buCommTemplates.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="p-3.5 pl-5 font-semibold text-slate-800 dark:text-slate-200">
                                  {item.packStatus}
                                </td>
                                <td className="p-3.5">
                                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                    {item.channelType || 'SMS'}
                                  </span>
                                </td>
                                <td className="p-3.5 text-slate-700 dark:text-slate-300">
                                  {item.subject || '-'}
                                </td>
                                <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 break-words max-w-md">
                                  {item.messageText}
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold leading-5 ${item.status === 1 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {item.status === 1 ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="p-3.5 pr-5 text-right space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEditCommTemplateClick(item)}
                                    className="p-1 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                                    title="Edit Template"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCommTemplate(item.id)}
                                    className="p-1 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                                    title="Delete Template"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'address':
        if (type === 'client') {
          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">Registered Addresses</h3>
                  <p className="text-xs text-slate-400">Billing, dispatch and shipping centers.</p>
                </div>
                {!showAddressForm && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingAddressId(null);
                      setAddrLine1('');
                      setAddrLine2('');
                      setAddrLine3('');
                      setAddrLine4('');
                      setAddrCity('');
                      setAddrState('');
                      setAddrPincode('');
                      setAddrCountry('India');
                      setAddrIsPrimary(false);
                      if (addressTypes.length > 0) {
                        setAddrTypeId(addressTypes[0].id);
                      }
                      setShowAddressForm(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                  >
                    <Plus size={14} /> Add Address
                  </button>
                )}
              </div>

              {/* Form card when active */}
              {showAddressForm && (
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      {editingAddressId ? 'Edit Address' : 'Add New Address'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAddress} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Address Type Dropdown */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Type <span className="text-red-500">*</span>
                        </label>
                        <select 
                          required
                          value={addrTypeId} 
                          onChange={e => setAddrTypeId(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        >
                          {addressTypes.map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.typeName} ({t.typeCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Primary Toggle (Select) */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Is Primary? <span className="text-red-500">*</span>
                        </label>
                        <select 
                          required
                          value={addrIsPrimary ? 'true' : 'false'} 
                          onChange={e => setAddrIsPrimary(e.target.value === 'true')}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>

                      {/* Address Lines 1-4 */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Line 1 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLine1} 
                          onChange={e => setAddrLine1(e.target.value)}
                          placeholder="e.g. 1021"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Line 2 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLine2} 
                          onChange={e => setAddrLine2(e.target.value)}
                          placeholder="e.g. Srinivasan Street"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Line 3 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLine3} 
                          onChange={e => setAddrLine3(e.target.value)}
                          placeholder="e.g. Mandaveli"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Line 4 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLine4} 
                          onChange={e => setAddrLine4(e.target.value)}
                          placeholder="e.g. test"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* City & State */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrCity} 
                          onChange={e => setAddrCity(e.target.value)}
                          placeholder="e.g. Chennai"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrState} 
                          onChange={e => setAddrState(e.target.value)}
                          placeholder="e.g. TN"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Pincode & Country */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrPincode} 
                          onChange={e => setAddrPincode(e.target.value)}
                          placeholder="e.g. 600028"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrCountry} 
                          onChange={e => setAddrCountry(e.target.value)}
                          placeholder="e.g. India"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ShieldCheck size={14} />
                        {savingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Add Address'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {loadingAddresses ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs">Loading addresses...</span>
                  </div>
                ) : clientAddresses.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-400 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl">
                    No registered addresses found. Click "Add Address" to create one.
                  </div>
                ) : (
                  clientAddresses.map((addr) => {
                    const matchedType = addressTypes.find(t => t.id === addr.addressTypeId);
                    const typeLabel = matchedType ? (matchedType.typeName || matchedType.name) : `Type ${addr.addressTypeId}`;
                    const combinedLines = [addr.addressLine1, addr.addressLine2, addr.addressLine3, addr.addressLine4]
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <div 
                        key={addr.id} 
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-900/40 dark:to-slate-950/60 shadow-lg text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] group"
                      >
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-300" />
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <h4 className="text-xs font-bold tracking-wide uppercase">{typeLabel}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${addr.isPrimary ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/20 text-slate-400 border-slate-500/20'}`}>
                            {addr.isPrimary ? 'Primary' : 'Alternative'}
                          </span>
                        </div>

                        <div className="space-y-1 mt-3 z-10 text-xs">
                          <p className="text-slate-200 line-clamp-2 leading-relaxed" title={combinedLines}>
                            {combinedLines || '-'}
                          </p>
                          <p className="text-slate-400">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-slate-550 text-[10px]">
                            {addr.country}
                          </p>
                        </div>

                        {/* Hover Overlay Actions matching Bank Card design */}
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                          <button
                            type="button"
                            onClick={() => handleEditAddressClick(addr)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all duration-150 flex items-center gap-1.5 hover:scale-105 font-semibold text-xs"
                            title="Edit Address"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all duration-150 flex items-center gap-1.5 hover:scale-105 font-semibold text-xs"
                            title="Delete Address"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">Registered Addresses</h3>
                  <p className="text-xs text-slate-400">Billing, dispatch and shipping centers.</p>
                </div>
                {!showAddressForm && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingAddressId(null);
                      setAddrLine1('');
                      setAddrLine2('');
                      setAddrLine3('');
                      setAddrLabel('');
                      setAddrCity('');
                      setAddrState('');
                      setAddrPincode('');
                      setAddrCountry('India');
                      setAddrIsDefault(false);
                      if (addressTypes.length > 0) {
                        setAddrTypeId(addressTypes[0].id);
                      }
                      setShowAddressForm(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                  >
                    <Plus size={14} /> Add Address
                  </button>
                )}
              </div>

              {/* Address Form Card when active */}
              {showAddressForm && (
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      {editingAddressId ? 'Edit Address' : 'Add New Address'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-355 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAddress} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Address Type Dropdown with Add Plus Button */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select 
                            required
                            value={addrTypeId} 
                            onChange={e => setAddrTypeId(Number(e.target.value))}
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                          >
                            {addressTypes.map((t: any) => (
                              <option key={t.id} value={t.id}>
                                {t.typeName || t.name} ({t.typeCode || t.code})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowAddAddrTypeModal(true)}
                            className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center text-xs font-semibold gap-1.5"
                            title="Add Address Type"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Label Input Field */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Label <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLabel} 
                          onChange={e => setAddrLabel(e.target.value)}
                          placeholder="e.g. Branch Office, Head Office"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Address Line 1 */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Line 1 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLine1} 
                          onChange={e => setAddrLine1(e.target.value)}
                          placeholder="e.g. Door No / Plot No"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Address Line 2 */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Line 2 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLine2} 
                          onChange={e => setAddrLine2(e.target.value)}
                          placeholder="e.g. Street / Locality"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Address Line 3 */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address Line 3 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrLine3} 
                          onChange={e => setAddrLine3(e.target.value)}
                          placeholder="e.g. Landmark / Area"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* City */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrCity} 
                          onChange={e => setAddrCity(e.target.value)}
                          placeholder="e.g. Chennai"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* State */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrState} 
                          onChange={e => setAddrState(e.target.value)}
                          placeholder="e.g. TN"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Pincode */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrPincode} 
                          onChange={e => setAddrPincode(e.target.value)}
                          placeholder="e.g. 600004"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Country */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={addrCountry} 
                          onChange={e => setAddrCountry(e.target.value)}
                          placeholder="e.g. India"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* isDefault Radio Button Field */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                          Is Default Address? <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="radio" 
                              name="addrIsDefault"
                              checked={addrIsDefault === true}
                              onChange={() => setAddrIsDefault(true)}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="radio" 
                              name="addrIsDefault"
                              checked={addrIsDefault === false}
                              onChange={() => setAddrIsDefault(false)}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">No</span>
                          </label>
                        </div>
                      </div>

                      {/* status Radio Button Field (only when editing) */}
                      {editingAddressId && (
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                            Address Status <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="radio" 
                                name="addrStatus"
                                checked={addrStatus === 1}
                                onChange={() => setAddrStatus(1)}
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                              />
                              <span className="text-xs text-slate-700 dark:text-slate-300">Active</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="radio" 
                                name="addrStatus"
                                checked={addrStatus === 0}
                                onChange={() => setAddrStatus(0)}
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                              />
                              <span className="text-xs text-slate-700 dark:text-slate-300">Inactive</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ShieldCheck size={14} />
                        {savingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Add Address'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {loadingAddresses ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs">Loading addresses...</span>
                  </div>
                ) : supplierAddresses.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-400 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl">
                    No registered addresses found for this supplier. Click "Add Address" to create one.
                  </div>
                ) : (
                  supplierAddresses.map((addr) => {
                    const matchedType = addressTypes.find(t => t.id === addr.addressTypeId);
                    const typeLabel = matchedType ? (matchedType.typeName || matchedType.name) : `Type ${addr.addressTypeId}`;
                    const combinedLines = [addr.addressLine1, addr.addressLine2, addr.addressLine3]
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <div 
                        key={addr.id} 
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-900/40 dark:to-slate-950/60 shadow-lg text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] group"
                      >
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-300" />
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <h4 className="text-xs font-bold tracking-wide uppercase">{typeLabel}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{addr.label || 'No Label'}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${addr.isDefault ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/20 text-slate-400 border-slate-500/20'}`}>
                            {addr.isDefault ? 'Default' : 'Alternative'}
                          </span>
                        </div>

                        <div className="space-y-1 mt-3 z-10 text-xs">
                          <p className="text-slate-200 line-clamp-2 leading-relaxed" title={combinedLines}>
                            {combinedLines || '-'}
                          </p>
                          <p className="text-slate-400">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-slate-550 text-[10px]">
                            {addr.country}
                          </p>
                        </div>

                        {/* Hover Overlay Actions matching Bank Card design */}
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                          <button
                            type="button"
                            onClick={() => handleEditAddressClick(addr)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all duration-150 flex items-center gap-1.5 hover:scale-105 font-semibold text-xs"
                            title="Edit Address"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all duration-150 flex items-center gap-1.5 hover:scale-105 font-semibold text-xs"
                            title="Delete Address"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Inline Address Type Creation Modal */}
              {showAddAddrTypeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddAddrTypeModal(false)} />
                  <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">Add Address Type</h4>
                      <button 
                        type="button" 
                        onClick={() => setShowAddAddrTypeModal(false)}
                        className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-350 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <form onSubmit={handleSaveAddressType} className="space-y-4 mt-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Code</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. WAREHOUSE"
                          value={newAddrTypeCode}
                          onChange={e => setNewAddrTypeCode(e.target.value)}
                          className="w-full h-10 px-3 text-sm bg-slate-50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-350 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Warehouse Address"
                          value={newAddrTypeName}
                          onChange={e => setNewAddrTypeName(e.target.value)}
                          className="w-full h-10 px-3 text-sm bg-slate-50 focus:bg-white dark:bg-slate-950/20 dark:focus:bg-slate-900 border border-slate-355 hover:border-slate-400 focus:border-blue-500 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white transition-all"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button 
                          type="button"
                          onClick={() => setShowAddAddrTypeModal(false)}
                          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={savingAddrType}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                        >
                          {savingAddrType ? 'Saving...' : 'Add Type'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        }

      case 'contacts':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Contacts & Representatives</h3>
                <p className="text-xs text-slate-400">Point of contacts for billing and logistics.</p>
              </div>
              {!showContactForm && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingContactId(null);
                    setContactName('');
                    setContactEmail('');
                    setContactMobile('');
                    setContactDesignation('');
                    setContactTypeId('');
                    setIsPrimaryContact(false);
                    setContactStatus(1);
                    setShowContactForm(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                >
                  <Plus size={14} /> Add Contact
                </button>
              )}
            </div>

            {showContactForm ? (
              <form onSubmit={handleSaveContact} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    {editingContactId ? 'Edit Contact Person' : 'Register New Contact'}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {type === 'client' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Contact Type <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select 
                          required
                          value={contactTypeId} 
                          onChange={e => setContactTypeId(e.target.value === '' ? '' : Number(e.target.value))}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        >
                          <option value="">Select Contact Type</option>
                          {contactTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.typeName}
                            </option>
                          ))}
                        </select>
                        <button 
                          type="button"
                          onClick={() => setShowAddContactTypeModal(true)}
                          className="p-2.5 border border-slate-200 dark:border-slate-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                          title="Create Custom Contact Type"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={contactName} 
                      onChange={e => setContactName(e.target.value)}
                      placeholder="e.g. Yuvaraj"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Email ID <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      required
                      value={contactEmail} 
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="e.g. yuvayr@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Phone No <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel" 
                      required
                      value={contactMobile} 
                      onChange={e => setContactMobile(e.target.value)}
                      placeholder="e.g. 8667757668"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Designation
                    </label>
                    <textarea 
                      rows={2}
                      value={contactDesignation} 
                      onChange={e => setContactDesignation(e.target.value)}
                      placeholder="e.g. Marketing Head"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Is Primary Contact? <span className="text-red-500">*</span>
                    </span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                        <input 
                          type="radio" 
                          name="isPrimaryContact"
                          checked={isPrimaryContact === true}
                          onChange={() => setIsPrimaryContact(true)}
                          className="text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                        <input 
                          type="radio" 
                          name="isPrimaryContact"
                          checked={isPrimaryContact === false}
                          onChange={() => setIsPrimaryContact(false)}
                          className="text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        No
                      </label>
                    </div>
                  </div>

                  {/* Status Radio Field (Only for supplier contact in edit mode) */}
                  {type === 'supplier' && editingContactId && (
                    <div className="space-y-2 md:col-span-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Contact Status <span className="text-red-500">*</span>
                      </span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                          <input 
                            type="radio" 
                            name="contactStatus"
                            checked={contactStatus === 1}
                            onChange={() => setContactStatus(1)}
                            className="text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          Active
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                          <input 
                            type="radio" 
                            name="contactStatus"
                            checked={contactStatus === 2}
                            onChange={() => setContactStatus(2)}
                            className="text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          Inactive
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactForm(false);
                      setEditingContactId(null);
                      setContactName('');
                      setContactEmail('');
                      setContactMobile('');
                      setContactDesignation('');
                      setContactTypeId('');
                      setIsPrimaryContact(false);
                      setContactStatus(1);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingContact}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                  >
                    {savingContact ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        {editingContactId ? 'Update Contact' : 'Save Contact'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadingContacts ? (
                  <div className="col-span-2 flex items-center justify-center py-12 gap-2 text-slate-400">
                    <RefreshCw size={18} className="animate-spin text-blue-600" />
                    <span>Loading contacts...</span>
                  </div>
                ) : (type === 'client' ? buContacts : supplierContacts).length === 0 ? (
                  <div className="col-span-2 p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                    {type === 'client' ? 'No contact persons registered for this client.' : 'No contact persons registered for this supplier.'}
                  </div>
                ) : (
                  (type === 'client' ? buContacts : supplierContacts).map((contact) => {
                    const typeName = type === 'client'
                      ? (contactTypes.find(t => t.id === contact.contactTypeId)?.typeName || contact.contactTypeName || 'Contact')
                      : null;
                    const cName = type === 'client' ? contact.contactName : contact.name;
                    const cEmail = contact.email;
                    const cPhone = type === 'client' ? contact.mobile : contact.phone;

                    return (
                      <div key={contact.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start gap-4 relative group">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {cName ? cName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'C'}
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="pr-12">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{cName}</h4>
                              {contact.isPrimary && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                                  Primary
                                </span>
                              )}
                              {type === 'supplier' && (
                                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-bold ${contact.status === 1 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                  {contact.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {contact.designation || 'Representative'} {typeName ? `• ` : ''}
                              {typeName && <span className="font-semibold text-blue-600 dark:text-blue-400">{typeName}</span>}
                            </p>
                          </div>
                          <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail size={11} className="text-slate-400" />
                              <span className="truncate">{cEmail}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone size={11} className="text-slate-400" />
                              <span>{cPhone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="absolute right-3.5 top-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContactId(contact.id);
                              setContactName(cName || '');
                              setContactEmail(cEmail || '');
                              setContactMobile(cPhone || '');
                              setContactDesignation(contact.designation || '');
                              if (type === 'client') {
                                setContactTypeId(contact.contactTypeId || '');
                              } else {
                                setContactStatus(contact.status !== undefined ? contact.status : 1);
                              }
                              setIsPrimaryContact(!!contact.isPrimary);
                              setShowContactForm(true);
                            }}
                            className="p-1 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                            title="Edit Contact"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-1 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                            title="Delete Contact"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
              {!showBankForm && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingBankId(null);
                    setAccountHolderName('');
                    setAccountNumber('');
                    setIfscCode('');
                    setBankName('');
                    setBranchName('');
                    setAccountType('SAVINGS');
                    setIsPrimaryBank(false);
                    setBankStatus(1);
                    setShowBankForm(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                >
                  <Plus size={14} /> Add Bank Account
                </button>
              )}
            </div>

            {showBankForm ? (
              <form onSubmit={handleSaveBank} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Account Holder Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={accountHolderName} 
                      onChange={e => setAccountHolderName(e.target.value)}
                      placeholder="Enter account holder name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={accountNumber} 
                      onChange={e => setAccountNumber(e.target.value)}
                      placeholder="Enter bank account number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={bankName} 
                      onChange={e => setBankName(e.target.value)}
                      placeholder="e.g. ICICI Bank"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Branch Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={branchName} 
                      onChange={e => setBranchName(e.target.value)}
                      placeholder="e.g. Parrys Branch"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      IFSC Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={ifscCode} 
                      onChange={e => setIfscCode(e.target.value)}
                      placeholder="e.g. ICIC0006020"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>

                  {type === 'supplier' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                        Account Type <span className="text-red-500">*</span>
                      </label>
                      <select 
                        required
                        value={accountType} 
                        onChange={e => setAccountType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      >
                        <option value="SAVINGS">SAVINGS</option>
                        <option value="CURRENT">CURRENT</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-slate-550 dark:text-slate-400 block">
                      Is Primary Bank Account? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="isPrimaryBank"
                          checked={isPrimaryBank === true}
                          onChange={() => setIsPrimaryBank(true)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="isPrimaryBank"
                          checked={isPrimaryBank === false}
                          onChange={() => setIsPrimaryBank(false)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">No</span>
                      </label>
                    </div>
                  </div>

                  {type === 'supplier' && editingBankId && (
                    <div className="space-y-2 md:col-span-2">
                      <span className="text-xs font-medium text-slate-550 dark:text-slate-400 block">
                        Bank Account Status <span className="text-red-500">*</span>
                      </span>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="bankStatus"
                            checked={bankStatus === 1}
                            onChange={() => setBankStatus(1)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="bankStatus"
                            checked={bankStatus === 2}
                            onChange={() => setBankStatus(2)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">Inactive</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankForm(false);
                      setEditingBankId(null);
                      setAccountHolderName('');
                      setAccountNumber('');
                      setIfscCode('');
                      setBankName('');
                      setBranchName('');
                      setAccountType('SAVINGS');
                      setIsPrimaryBank(false);
                      setBankStatus(1);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                  >
                    {savingBank ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        {editingBankId ? 'Update Bank Account' : 'Save Bank Account'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {loadingBanks ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 gap-2 text-slate-550">
                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs">Loading bank accounts...</span>
                  </div>
                ) : (type === 'client' ? buBanks : supplierBanks).length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-400 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl">
                    {type === 'client' ? 'No bank accounts registered for this client.' : 'No bank accounts registered for this supplier.'}
                  </div>
                ) : (
                  (type === 'client' ? buBanks : supplierBanks).map((bank) => {
                    const bName = bank.bankName;
                    const bBranch = type === 'client' ? bank.branchName : bank.branch;
                    const bAccNumber = bank.accountNumber;
                    const bIfsc = type === 'client' ? bank.ifscCode : bank.ifsc;
                    const bHolder = type === 'client' ? bank.accountHolderName : bank.accountName;
                    const bType = type === 'supplier' ? bank.accountType : null;

                    return (
                      <div key={bank.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-900/40 dark:to-slate-950/60 shadow-lg text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-300" />
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <h4 className="text-xs font-bold tracking-wide">{bName}</h4>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {bBranch} Branch {bType ? `• ${bType}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${bank.isPrimary ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/20 text-slate-400 border-slate-500/20'}`}>
                              {bank.isPrimary ? 'Primary' : 'Secondary'}
                            </span>
                            {type === 'supplier' && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${bank.status === 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border-rose-500/20'}`}>
                                {bank.status === 1 ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mt-4 z-10">
                          <p className="text-sm font-semibold tracking-widest">{bAccNumber}</p>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <div>
                              <span>IFSC CODE</span>
                              <p className="font-semibold text-white tracking-wider font-mono">{bIfsc}</p>
                            </div>
                            <div className="text-right">
                              <span>HOLDER NAME</span>
                              <p className="font-semibold text-white truncate max-w-[120px]">{bHolder}</p>
                            </div>
                          </div>
                        </div>

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                          <button
                            type="button"
                            onClick={() => handleEditBankClick(bank)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all duration-150 flex items-center gap-1.5 hover:scale-105 font-semibold text-xs"
                            title="Edit Bank Account"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(bank.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all duration-150 flex items-center gap-1.5 hover:scale-105 font-semibold text-xs"
                            title="Delete Bank Account"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );

      case 'documents':
        if (type === 'supplier') {
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">Uploaded Documents</h3>
                  <p className="text-xs text-slate-400">Agreements, tax registrations, certificates and compliance files.</p>
                </div>
                {!showSupplierDocForm && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingSupplierDocId(null);
                      setSupDocType('');
                      setSupDocNumber('');
                      setSupDocRemarks('');
                      setSupDocStatus(1);
                      setSelectedFile(null);
                      setUploadedFileInfo(null);
                      setShowSupplierDocForm(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                  >
                    <Plus size={14} /> Upload Doc
                  </button>
                )}
              </div>

              {showSupplierDocForm ? (
                <form onSubmit={handleSaveSupplierDocument} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      {editingSupplierDocId ? 'Edit Supplier Document' : 'Register Supplier Document'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Document Type <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={supDocType} 
                        onChange={e => setSupDocType(e.target.value)}
                        placeholder="e.g. PAN, GST, AADHAR, LICENCE"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Document Number <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={supDocNumber} 
                        onChange={e => setSupDocNumber(e.target.value)}
                        placeholder="e.g. ASDIOIO112"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-555 dark:text-slate-400">
                        Remarks
                      </label>
                      <textarea
                        value={supDocRemarks}
                        onChange={e => setSupDocRemarks(e.target.value)}
                        placeholder="Enter any reference notes or remarks"
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>

                    {editingSupplierDocId && (
                      <div className="space-y-2 md:col-span-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                          Status <span className="text-red-500">*</span>
                        </span>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="radio" 
                              name="supDocStatus"
                              checked={supDocStatus === 1}
                              onChange={() => setSupDocStatus(1)}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Active</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="radio" 
                              name="supDocStatus"
                              checked={supDocStatus === 2 || supDocStatus === 0}
                              onChange={() => setSupDocStatus(2)}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Inactive</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-550 dark:text-slate-400">
                        Upload File <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors relative group min-h-[140px]">
                        <input 
                          type="file" 
                          required={!uploadedFileInfo}
                          onChange={handleFileChangeAndUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="text-center space-y-2">
                          {uploadingFile ? (
                            <>
                              <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
                              <p className="text-xs font-medium text-slate-505 dark:text-slate-400">Uploading file to secure vault...</p>
                            </>
                          ) : uploadedFileInfo ? (
                            <>
                              <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-450">File uploaded: {uploadedFileInfo.originalName}</p>
                              <p className="text-[10px] text-slate-400">{formatFileSize(uploadedFileInfo.size)}</p>
                            </>
                          ) : (
                            <>
                              <Upload size={24} className="text-slate-400 mx-auto group-hover:text-blue-500 transition-colors" />
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                Click or drag file here to upload
                              </p>
                              <p className="text-[10px] text-slate-400">PDF, PNG, JPG, or DOCX (max. 10MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSupplierDocForm(false);
                        setEditingSupplierDocId(null);
                        setSupDocType('');
                        setSupDocNumber('');
                        setSupDocRemarks('');
                        setSupDocStatus(1);
                        setSelectedFile(null);
                        setUploadedFileInfo(null);
                      }}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingSupplierDoc || uploadingFile || !uploadedFileInfo}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                    >
                      {savingSupplierDoc ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} />
                          {editingSupplierDocId ? 'Update Document' : 'Save Document'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900/30">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <th className="p-3.5 pl-5">Document Name</th>
                          <th className="p-3.5">Ref No</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Remarks</th>
                          <th className="p-3.5">File Size</th>
                          <th className="p-3.5">Uploaded Date</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 pr-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-650 dark:text-slate-350">
                        {loadingSupplierDocs ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-450">
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw size={14} className="animate-spin text-blue-600" />
                                <span>Loading documents...</span>
                              </div>
                            </td>
                          </tr>
                        ) : supplierDocuments.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              No agreements or compliance documents uploaded yet.
                            </td>
                          </tr>
                        ) : (
                          supplierDocuments.map((doc) => {
                            return (
                              <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="p-3.5 pl-5 font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-2">
                                  <FileText size={14} className="text-red-500" />
                                  <span className="truncate max-w-[200px]" title={doc.originalName}>
                                    {doc.originalName}
                                  </span>
                                </td>
                                <td className="p-3.5 font-mono text-[11px]">{doc.documentNumber}</td>
                                <td className="p-3.5">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-105 dark:bg-slate-800 font-medium text-[10px] uppercase">
                                    {doc.documentType}
                                  </span>
                                </td>
                                <td className="p-3.5 truncate max-w-[150px]" title={doc.remarks}>
                                  {doc.remarks || '-'}
                                </td>
                                <td className="p-3.5">{formatFileSize(doc.fileSize)}</td>
                                <td className="p-3.5">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}</td>
                                <td className="p-3.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    doc.status === 1 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-slate-50 dark:bg-slate-950/20 text-slate-500'
                                  }`}>
                                    <CheckCircle2 size={10} />
                                    {doc.status === 1 ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="p-3.5 pr-5 text-right space-x-1.5">
                                  <button 
                                    onClick={() => handleEditSupplierDocClick(doc)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                                    title="Edit Document"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button 
                                    onClick={() => handleDownloadSupplierDocument(doc.filePath, doc.originalName)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                                    title="Download Document"
                                  >
                                    <Download size={13} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSupplierDocument(doc.id)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500 rounded transition-colors"
                                    title="Delete Document"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Uploaded Documents</h3>
                <p className="text-xs text-slate-400">Compliance documentation, licenses, and contracts.</p>
              </div>
              {!showDocumentForm && (
                <button 
                  type="button"
                  onClick={() => {
                    setDocTypeId('');
                    setDocNumber('');
                    setSelectedFile(null);
                    setUploadedFileInfo(null);
                    setShowDocumentForm(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                >
                  <Plus size={14} /> Upload Doc
                </button>
              )}
            </div>

            {showDocumentForm ? (
              <form onSubmit={handleSaveDocument} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Register New Document
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Document Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select 
                        required
                        value={docTypeId} 
                        onChange={e => setDocTypeId(e.target.value === '' ? '' : Number(e.target.value))}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      >
                        <option value="">Select Document Type</option>
                        {documentTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.typeName} ({type.typeCode})
                          </option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingDocumentTypeId(null);
                          setDocTypeCode('');
                          setDocTypeName('');
                          setDocTypeDescription('');
                          setShowDocumentTypeModal(true);
                        }}
                        className="p-2.5 border border-slate-200 dark:border-slate-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        title="Manage Document Types"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Document Number / Reference <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={docNumber} 
                      onChange={e => setDocNumber(e.target.value)}
                      placeholder="e.g. DOC001"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-slate-550 dark:text-slate-400">
                      Upload File <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors relative group min-h-[140px]">
                      <input 
                        type="file" 
                        required={!uploadedFileInfo}
                        onChange={handleFileChangeAndUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="text-center space-y-2">
                        {uploadingFile ? (
                          <>
                            <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
                            <p className="text-xs font-medium text-slate-505 dark:text-slate-400">Uploading file to secure vault...</p>
                          </>
                        ) : uploadedFileInfo ? (
                          <>
                            <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-450">File uploaded: {uploadedFileInfo.originalName}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(uploadedFileInfo.size)}</p>
                          </>
                        ) : (
                          <>
                            <Upload size={24} className="text-slate-400 mx-auto group-hover:text-blue-500 transition-colors" />
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Click or drag file here to upload
                            </p>
                            <p className="text-[10px] text-slate-400">PDF, PNG, JPG, or DOCX (max. 10MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDocumentForm(false);
                      setDocTypeId('');
                      setDocNumber('');
                      setSelectedFile(null);
                      setUploadedFileInfo(null);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingDocument || uploadingFile || !uploadedFileInfo}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                  >
                    {savingDocument ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Save Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <th className="p-3.5 pl-5">Document Name</th>
                        <th className="p-3.5">Ref No</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">File Size</th>
                        <th className="p-3.5">Uploaded Date</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 pr-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-600 dark:text-slate-350">
                      {loadingDocuments ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-450">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={14} className="animate-spin text-blue-600" />
                              <span>Loading documents...</span>
                            </div>
                          </td>
                        </tr>
                      ) : clientDocuments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No compliance documents uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        clientDocuments.map((doc) => {
                          const typeName = documentTypes.find(t => t.id === doc.documentTypeId)?.typeName || doc.documentTypeName || 'Document';
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="p-3.5 pl-5 font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-2">
                                <FileText size={14} className="text-red-500" />
                                <span className="truncate max-w-[200px]" title={doc.originalName}>
                                  {doc.originalName}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono text-[11px]">{doc.documentNumber}</td>
                              <td className="p-3.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[10px]">
                                  {typeName}
                                </span>
                              </td>
                              <td className="p-3.5">{formatFileSize(doc.fileSize)}</td>
                              <td className="p-3.5">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}</td>
                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  doc.status === 1 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-slate-50 dark:bg-slate-950/20 text-slate-500'
                                }`}>
                                  <CheckCircle2 size={10} />
                                  {doc.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="p-3.5 pr-5 text-right space-x-1.5">
                                <button 
                                  onClick={() => handleDownloadDocument(doc.documentUrl, doc.originalName)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                                  title="Download file"
                                >
                                  <Download size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 text-red-500 rounded transition-colors"
                                  title="Delete document"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case 'tags':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Tags Configuration</h3>
                <p className="text-xs text-slate-400">Configure global classification tags to organize and categorize clients/suppliers.</p>
              </div>
              {!showTagForm && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingTagId(null);
                    setTagName('');
                    setTagStatus(1);
                    setShowTagForm(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                >
                  <Plus size={14} /> Add Tag
                </button>
              )}
            </div>

            {showTagForm ? (
              <form onSubmit={handleSaveTag} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Tag Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={tagName} 
                    onChange={e => setTagName(e.target.value)}
                    placeholder="e.g. VIP Customer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                {type === 'supplier' && editingTagId && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                      Status <span className="text-red-500">*</span>
                    </span>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="tagStatus"
                          checked={tagStatus === 1}
                          onChange={() => setTagStatus(1)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="tagStatus"
                          checked={tagStatus === 2}
                          onChange={() => setTagStatus(2)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Inactive</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTagForm(false);
                      setEditingTagId(null);
                      setTagName('');
                      setTagStatus(1);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTag}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                  >
                    {savingTag ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        {editingTagId ? 'Update Tag' : 'Save Tag'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                {loadingTags ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-550">
                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs">Loading tags...</span>
                  </div>
                ) : globalTags.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl">
                    No classification tags found. Create one to get started!
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {globalTags.map((tag) => {
                      const name = type === 'client' ? tag.tagName : tag.name;
                      const isActive = type === 'client' || tag.status === 1;
                      return (
                        <div 
                          key={tag.id} 
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-150 group text-xs ${
                            isActive 
                              ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-200 hover:border-blue-500/50 hover:bg-blue-50/20' 
                              : 'bg-red-50/40 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/50 text-red-650 dark:text-red-400 hover:border-red-500/50'
                          }`}
                        >
                          <span className="font-medium">{name}</span>
                          {!isActive && (
                            <span className="text-[9px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1 py-0.2 rounded font-bold uppercase">
                              Inactive
                            </span>
                          )}
                          <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleEditTagClick(tag)}
                              className="p-0.5 hover:text-blue-500 rounded transition-colors"
                              title="Edit Tag"
                            >
                              <Edit2 size={11} />
                            </button>
                            {type === 'client' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTag(tag.id)}
                                className="p-0.5 hover:text-red-500 rounded transition-colors"
                                title="Delete Tag"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'emails':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Email Configuration</h3>
                <p className="text-xs text-slate-400">Configure notification recipients (TO & CC lists) for orders and dispatches.</p>
              </div>
              {!showEmailForm && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingEmailId(null);
                    setEmailAddress('');
                    setEmailType('TO');
                    setEmailStatus(1);
                    setShowEmailForm(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1 hover:scale-[1.02]"
                >
                  <Plus size={14} /> Add Email Config
                </button>
              )}
            </div>

            {showEmailForm ? (
              <form onSubmit={handleSaveSupplierEmail} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    {editingEmailId ? 'Edit Email Configuration' : 'Add Email Configuration'}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Recipients Type <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required
                      value={emailType} 
                      onChange={e => setEmailType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    >
                      <option value="TO">TO (Direct Recipient)</option>
                      <option value="CC">CC (Carbon Copy)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Email Address(es) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={emailAddress} 
                      onChange={e => setEmailAddress(e.target.value)}
                      placeholder={emailType === 'TO' ? 'e.g. direct@domain.com' : 'e.g. first@domain.com,second@domain.com'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {emailType === 'TO' 
                        ? 'For TO type, specify exactly one email address.' 
                        : 'For CC type, you can enter multiple emails separated by commas.'}
                    </p>
                  </div>

                  {editingEmailId && (
                    <div className="space-y-2 md:col-span-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                        Status <span className="text-red-500">*</span>
                      </span>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="emailStatus"
                            checked={emailStatus === 1}
                            onChange={() => setEmailStatus(1)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-350 font-semibold">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="emailStatus"
                            checked={emailStatus === 2}
                            onChange={() => setEmailStatus(2)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Inactive</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(false);
                      setEditingEmailId(null);
                      setEmailAddress('');
                      setEmailType('TO');
                      setEmailStatus(1);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEmail}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                  >
                    {savingEmail ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        {editingEmailId ? 'Update Config' : 'Save Config'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <th className="p-3.5 pl-5">Email Address(es)</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 pr-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-650 dark:text-slate-350">
                      {loadingEmails ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-450">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={14} className="animate-spin text-blue-600" />
                              <span>Loading email list...</span>
                            </div>
                          </td>
                        </tr>
                      ) : supplierEmails.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            No email notification routing configured yet.
                          </td>
                        </tr>
                      ) : (
                        supplierEmails.map((emailObj) => (
                          <tr key={emailObj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="p-3.5 pl-5 font-semibold text-slate-850 dark:text-slate-200">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {emailObj.email.split(',').map((emailStr: string, index: number) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-0.5 bg-slate-105 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-md font-mono text-[11px] text-slate-700 dark:text-slate-300"
                                  >
                                    {emailStr.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                emailObj.type === 'TO' 
                                  ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30' 
                                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30'
                              }`}>
                                {emailObj.type}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                emailObj.status === 1 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                              }`}>
                                <CheckCircle2 size={10} />
                                {emailObj.status === 1 ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-3.5 pr-5 text-right space-x-1.5">
                              <button 
                                onClick={() => handleEditEmailClick(emailObj)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                                title="Edit Configuration"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteSupplierEmail(emailObj.id)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500 rounded transition-colors"
                                title="Delete Configuration"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                                className="h-8 w-auto max-w-[80px] object-contain"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg">
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
          {type === 'client' ? (
            selectedClientId ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shadow-sm">
                  {selectedClient?.logoUrl ? (
                    <img
                      src={selectedClient.logoUrl}
                      alt={selectedClient.clientName}
                      className="h-8 w-auto max-w-[80px] object-contain flex-shrink-0"
                    />
                  ) : (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
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
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl shadow-sm">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Active Client Selected
                </span>
              </div>
            )
          ) : (
            selectedSupplierId ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl shadow-sm">
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Active Supplier: {selectedSupplier?.name} ({selectedSupplier?.supplierCode})
                  </span>
                </div>
                <button
                  onClick={() => {
                    dispatch(clearSelectedSupplier());
                    router.push('/admin/suppliers/profile');
                  }}
                  className="px-3.5 py-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                >
                  Change Supplier
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl shadow-sm">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Active Supplier Selected
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

      {/* Create Contact Type Modal */}
      {showAddContactTypeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Create Custom Contact Type</h3>
              <p className="text-xs text-slate-400 mt-1">Add a new functional role/classification for client relations.</p>
            </div>

            <form onSubmit={handleSaveContactType} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Type Code <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={newTypeCode} 
                  onChange={e => setNewTypeCode(e.target.value)}
                  placeholder="e.g. TECHNICAL"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors uppercase font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Type Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={newTypeName} 
                  onChange={e => setNewTypeName(e.target.value)}
                  placeholder="e.g. Technical Contact"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Description
                </label>
                <input 
                  type="text" 
                  value={newTypeDescription} 
                  onChange={e => setNewTypeDescription(e.target.value)}
                  placeholder="Brief definition of this contact group"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddContactTypeModal(false);
                    setNewTypeCode('');
                    setNewTypeName('');
                    setNewTypeDescription('');
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContactType}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
                >
                  {savingContactType ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Create Type
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage Document Types Modal */}
      {showDocumentTypeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Manage Document Types</h3>
                <p className="text-xs text-slate-400 mt-1">Configure compliance and attachment categories.</p>
              </div>
              <button 
                onClick={() => setShowDocumentTypeModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1">
              {/* Form Side */}
              <div className="space-y-4 md:border-r md:border-slate-100 md:dark:border-slate-800 md:pr-6">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  {editingDocumentTypeId ? 'Edit Document Type' : 'Create Document Type'}
                </h4>
                <form onSubmit={handleSaveDocumentType} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Type Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={docTypeCode} 
                      onChange={e => setDocTypeCode(e.target.value)}
                      placeholder="e.g. DOC004"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Type Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={docTypeName} 
                      onChange={e => setDocTypeName(e.target.value)}
                      placeholder="e.g. Service Agreement"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      required
                      rows={2}
                      value={docTypeDescription} 
                      onChange={e => setDocTypeDescription(e.target.value)}
                      placeholder="Brief definition of this document class"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    {editingDocumentTypeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDocumentTypeId(null);
                          setDocTypeCode('');
                          setDocTypeName('');
                          setDocTypeDescription('');
                        }}
                        className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={savingDocumentType}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {savingDocumentType ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      {editingDocumentTypeId ? 'Update Type' : 'Add Type'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List Side */}
              <div className="space-y-3 flex flex-col overflow-y-auto max-h-[350px]">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Existing Types
                </h4>
                {loadingDocumentTypes ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-blue-600" />
                    <span>Loading types...</span>
                  </div>
                ) : documentTypes.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No custom document types configured yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentTypes.map((type) => (
                      <div key={type.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-800 dark:text-white">{type.typeName}</span>
                            <span className="text-[9px] font-mono font-bold bg-slate-250 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-500">
                              {type.typeCode}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{type.description}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDocumentTypeId(type.id);
                              setDocTypeCode(type.typeCode || '');
                              setDocTypeName(type.typeName || '');
                              setDocTypeDescription(type.description || '');
                            }}
                            className="p-1 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                            title="Edit Type"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocumentType(type.id)}
                            className="p-1 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-colors"
                            title="Delete Type"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
