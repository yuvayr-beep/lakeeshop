'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, RefreshCw, 
  Plus, Search, Edit2, Download, ArrowLeft, Layers, Building2, 
  Tag, ShieldAlert, Check, X, FileText, ExternalLink, Calendar, ArrowRight, 
  Loader2, Sparkles, Filter, ChevronLeft, ChevronRight, Info, ShieldCheck, Power
} from 'lucide-react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

interface BusinessUnit {
  id: number;
  clientId: number;
  unitCode?: string;
  unitName?: string;
  legalName?: string;
}

interface ClientItem {
  id: number;
  clientCode: string;
  clientName: string;
  legalName?: string;
  logoUrl?: string;
  businessUnits?: BusinessUnit[];
}

interface TemplateItem {
  id: number;
  clientId: number;
  businessUnitId: number;
  templateName: string;
  originalFileName?: string;
  filePath?: string;
  sheetName?: string;
  headerRowNumber?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ExcelHeader {
  columnIndex: number;
  columnHeader: string;
}

interface SystemField {
  id: number;
  fieldCode: string;
  fieldName: string;
  targetColumn?: string;
  dataType?: string;
  isRequired?: boolean;
  dateFormat?: string | null;
}

interface MappingRow {
  systemFieldId: number;
  columnHeader: string;
  columnIndex: number;
  dateFormat?: string | null;
  priority: number;
}

const DEFAULT_SYSTEM_FIELDS: SystemField[] = [
  { id: 1, fieldCode: 'CLIENT_ORDER_NO', fieldName: 'Client Order Number', targetColumn: 'client_order_no', dataType: 'STRING', isRequired: true },
  { id: 2, fieldCode: 'CLIENT_ORDER_LINE_NO', fieldName: 'Client Order Line No', targetColumn: 'client_order_line_no', dataType: 'STRING', isRequired: false },
  { id: 3, fieldCode: 'ORDER_DATE', fieldName: 'Order Date', targetColumn: 'order_date', dataType: 'DATE', isRequired: true, dateFormat: 'yyyy-MM-dd' },
  { id: 4, fieldCode: 'ORDER_DATE_TIME', fieldName: 'Order Date Time', targetColumn: 'order_date_time', dataType: 'DATETIME', isRequired: false, dateFormat: 'yyyy-MM-dd HH:mm:ss' },
  { id: 6, fieldCode: 'PO_NUMBER', fieldName: 'PO Number', targetColumn: 'po_number', dataType: 'STRING', isRequired: false },
  { id: 7, fieldCode: 'REDEMPTION_POINT', fieldName: 'Redemption Point', targetColumn: 'redemption_point', dataType: 'NUMBER', isRequired: false },
  { id: 8, fieldCode: 'REDEMPTION_AMOUNT', fieldName: 'Redemption Amount', targetColumn: 'redemption_amount', dataType: 'NUMBER', isRequired: false },
  { id: 9, fieldCode: 'PRODUCT_CODE', fieldName: 'Product Code', targetColumn: 'product_code', dataType: 'STRING', isRequired: true },
  { id: 10, fieldCode: 'PRODUCT_NAME', fieldName: 'Product Name', targetColumn: 'product_name', dataType: 'STRING', isRequired: true },
  { id: 12, fieldCode: 'QUANTITY', fieldName: 'Quantity', targetColumn: 'quantity', dataType: 'NUMBER', isRequired: true },
  { id: 13, fieldCode: 'CUSTOMER_FIRST_NAME', fieldName: 'Customer First Name', targetColumn: 'customer_first_name', dataType: 'STRING', isRequired: true },
  { id: 14, fieldCode: 'CUSTOMER_LAST_NAME', fieldName: 'Customer Last Name', targetColumn: 'customer_last_name', dataType: 'STRING', isRequired: false },
  { id: 15, fieldCode: 'MOBILE', fieldName: 'Mobile Number', targetColumn: 'mobile', dataType: 'STRING', isRequired: true },
  { id: 16, fieldCode: 'ALTERNATE_MOBILE', fieldName: 'Alternate Mobile Number', targetColumn: 'alternate_mobile', dataType: 'STRING', isRequired: false },
  { id: 17, fieldCode: 'EMAIL', fieldName: 'Email', targetColumn: 'email', dataType: 'STRING', isRequired: false },
  { id: 18, fieldCode: 'ADDRESS_LINE1', fieldName: 'Address Line 1', targetColumn: 'address_line1', dataType: 'STRING', isRequired: true },
  { id: 19, fieldCode: 'ADDRESS_LINE2', fieldName: 'Address Line 2', targetColumn: 'address_line2', dataType: 'STRING', isRequired: false },
  { id: 20, fieldCode: 'ADDRESS_LINE3', fieldName: 'Address Line 3', targetColumn: 'address_line3', dataType: 'STRING', isRequired: false },
  { id: 21, fieldCode: 'ADDRESS_LINE4', fieldName: 'Address Line 4', targetColumn: 'address_line4', dataType: 'STRING', isRequired: false },
  { id: 22, fieldCode: 'LANDMARK', fieldName: 'Landmark', targetColumn: 'landmark', dataType: 'STRING', isRequired: false },
  { id: 23, fieldCode: 'CITY', fieldName: 'City', targetColumn: 'city', dataType: 'STRING', isRequired: true },
  { id: 24, fieldCode: 'STATE', fieldName: 'State', targetColumn: 'state', dataType: 'STRING', isRequired: true },
  { id: 25, fieldCode: 'PINCODE', fieldName: 'Pincode', targetColumn: 'pincode', dataType: 'STRING', isRequired: true },
  { id: 41, fieldCode: 'REDEMPTION_TYPE', fieldName: 'Redemption Type', targetColumn: 'redemption_type', dataType: 'STRING', isRequired: false },
];

const parseNdjson = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const items: any[] = [];
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          items.push(JSON.parse(trimmed));
        } catch (e) {
          console.error('Error parsing NDJSON line:', trimmed, e);
        }
      }
    });
    return items;
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === 'object') return [raw.data];
  }
  return [];
};

export default function ColumnMappingClient() {
  // Main Data States
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<number | ''>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Upload Modal / Wizard States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  // Form Inputs - Step 1 Upload
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [selectedBuId, setSelectedBuId] = useState<number | ''>('');
  const [templateName, setTemplateName] = useState('');
  const [sheetName, setSheetName] = useState('data');
  const [headerRowNumber, setHeaderRowNumber] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Pricing Source Validation States
  const [checkingPricingSource, setCheckingPricingSource] = useState(false);
  const [showPricingSourceWarning, setShowPricingSourceWarning] = useState(false);
  const [pricingSourceWarningMessage, setPricingSourceWarningMessage] = useState('');

  // Center-screen Success/Error Feedback Popup State
  const [feedbackPopup, setFeedbackPopup] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Uploading / Parsing States
  const [uploading, setUploading] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);

  // Step 2 Mapping Grid States
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<ExcelHeader[]>([]);
  const [systemFields, setSystemFields] = useState<SystemField[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<number, { columnIndex: number; columnHeader: string; dateFormat: string }>>({});

  // Fetch Templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await axiosInstance.get<string>('/order/client-mapping/template/list', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setTemplates(parsed);
    } catch (err) {
      console.error('Failed to fetch template list:', err);
      toast.error('Failed to load column mapping templates.');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch Clients
  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const response = await axiosInstance.get<string>('/client', {
        headers: { Accept: 'application/x-ndjson' },
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      const parsed = parseNdjson(response.data);
      setClients(parsed);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchClients();
  }, [fetchTemplates, fetchClients]);

  // Selected Client Object
  const selectedClientObj = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === Number(selectedClientId)) || null;
  }, [clients, selectedClientId]);

  // Business Units for selected client
  const availableBusinessUnits = useMemo(() => {
    return selectedClientObj?.businessUnits || [];
  }, [selectedClientObj]);

  // Handle Client selection change + auto-select single BU
  const handleClientChange = (cId: number | '') => {
    setSelectedClientId(cId);
    setShowPricingSourceWarning(false);
    if (!cId) {
      setSelectedBuId('');
      return;
    }
    const targetClient = clients.find((c) => c.id === cId);
    const bus = targetClient?.businessUnits || [];
    if (bus.length === 1) {
      setSelectedBuId(bus[0].id);
      checkPricingSourceConfig(cId, bus[0].id);
    } else {
      setSelectedBuId('');
    }
  };

  // Handle Business Unit selection change
  const handleBuChange = (buId: number | '') => {
    setSelectedBuId(buId);
    setShowPricingSourceWarning(false);
    if (selectedClientId && buId) {
      checkPricingSourceConfig(Number(selectedClientId), buId);
    }
  };

  // Pricing Source Check API Validation
  const checkPricingSourceConfig = async (cId: number, buId: number) => {
    setCheckingPricingSource(true);
    try {
      const response = await axiosInstance.get<string>(
        `/client/config/${cId}?configKey=PRICING_SOURCE&businessUnitId=${buId}`,
        {
          headers: { Accept: 'application/x-ndjson' },
          responseType: 'text',
          transformResponse: [(data) => data],
        }
      );
      const parsed = parseNdjson(response.data);
      let configObj = null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        configObj = parsed.find((item: any) => item.configKey === 'PRICING_SOURCE') || parsed[0];
      } else if (response.data && typeof response.data === 'object') {
        configObj = response.data;
      }

      if (!configObj || (!configObj.id && !configObj.configValue)) {
        setShowPricingSourceWarning(true);
        setPricingSourceWarningMessage(
          'PRICING_SOURCE is not assigned for this Client & Business Unit. Please configure Pricing Source before proceeding.'
        );
      } else {
        setShowPricingSourceWarning(false);
      }
    } catch (err) {
      console.warn('Pricing source check warning:', err);
      setShowPricingSourceWarning(true);
      setPricingSourceWarningMessage(
        'PRICING_SOURCE configuration check failed or is not assigned for this Client & Business Unit.'
      );
    } finally {
      setCheckingPricingSource(false);
    }
  };

  // Auto-Match Helper Logic
  const autoMatchColumns = useCallback((sysFields: SystemField[], headers: ExcelHeader[]) => {
    const initialMap: Record<number, { columnIndex: number; columnHeader: string; dateFormat: string }> = {};
    const claimedColumns = new Set<number>();

    sysFields.forEach((field) => {
      const fName = field.fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fCode = field.fieldCode.toLowerCase().replace(/[^a-z0-9]/g, '');

      const matchedHeader = headers.find((h) => {
        if (claimedColumns.has(h.columnIndex)) return false;
        const hName = h.columnHeader.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hName === fName || hName === fCode) return true;
        if (fCode === 'clientorderno' && (hName.includes('poorder') || hName.includes('purchaseorder') || hName.includes('orderref'))) return true;
        if (fCode === 'productcode' && (hName.includes('itemcode') || hName.includes('productcode') || hName.includes('sku'))) return true;
        if (fCode === 'productname' && hName.includes('productname')) return true;
        if (fCode === 'quantity' && (hName.includes('orderqty') || hName.includes('quantity') || hName.includes('qty'))) return true;
        if (fCode === 'customerfirstname' && (hName.includes('firstname') || hName.includes('memberfirst') || hName.includes('customername'))) return true;
        if (fCode === 'customerlastname' && hName.includes('lastname')) return true;
        if (fCode === 'mobile' && (hName.includes('mobile') || hName.includes('phone') || hName.includes('telephone'))) return true;
        if (fCode === 'pincode' && (hName.includes('postcode') || hName.includes('pincode') || hName.includes('zip'))) return true;
        if (fCode === 'addressline1' && (hName === 'add1' || hName.includes('address1'))) return true;
        if (fCode === 'addressline2' && (hName === 'add2' || hName.includes('address2'))) return true;
        if (fCode === 'addressline3' && (hName === 'add3' || hName.includes('address3'))) return true;
        if (fCode === 'addressline4' && (hName === 'add4' || hName.includes('address4'))) return true;
        if (fCode === 'city' && hName === 'city') return true;
        if (fCode === 'state' && hName === 'state') return true;
        if (fCode === 'country' && hName === 'country') return true;
        if (fCode === 'email' && hName === 'email') return true;
        if ((fCode === 'orderdatetime' || fCode === 'orderdate') && (hName.includes('clientorderdate') || hName.includes('creationdate') || hName.includes('orderdate'))) return true;
        return false;
      });

      if (matchedHeader) {
        claimedColumns.add(matchedHeader.columnIndex);
        let defaultDateFormat = '';
        if (field.dataType === 'DATE' || field.dataType === 'DATETIME' || fCode.includes('date')) {
          defaultDateFormat = field.dateFormat || 'yyyy-MM-dd';
        }
        initialMap[field.id] = {
          columnIndex: matchedHeader.columnIndex,
          columnHeader: matchedHeader.columnHeader,
          dateFormat: defaultDateFormat,
        };
      }
    });

    setFieldMappings(initialMap);
  }, []);

  // Compute map of which Excel column index is used by which System Field
  const usedColumnMap = useMemo(() => {
    const map: Record<number, { sysFieldId: number; fieldName: string }> = {};
    Object.entries(fieldMappings).forEach(([sysIdStr, val]) => {
      if (val && val.columnIndex !== -1 && val.columnHeader) {
        const sysId = Number(sysIdStr);
        const sysField = systemFields.find((sf) => sf.id === sysId);
        if (sysField) {
          map[val.columnIndex] = {
            sysFieldId: sysId,
            fieldName: sysField.fieldName,
          };
        }
      }
    });
    return map;
  }, [fieldMappings, systemFields]);

  // Count of uniquely mapped Excel columns
  const mappedColumnCount = useMemo(() => {
    return Object.keys(usedColumnMap).length;
  }, [usedColumnMap]);

  // Handle selecting an Excel column for a system field with duplicate validation
  const handleSelectColumnForField = (fieldId: number, selectedVal: string) => {
    const currentMapping = fieldMappings[fieldId] || { columnIndex: -1, columnHeader: '', dateFormat: '' };

    if (selectedVal === '') {
      setFieldMappings((prev) => ({
        ...prev,
        [fieldId]: { columnIndex: -1, columnHeader: '', dateFormat: currentMapping.dateFormat },
      }));
      return;
    }

    const colIdx = Number(selectedVal);
    const headerObj = excelHeaders.find((h) => h.columnIndex === colIdx);
    if (!headerObj) return;

    // Duplicate Check Validation
    const existingUse = usedColumnMap[colIdx];
    if (existingUse && existingUse.sysFieldId !== fieldId) {
      toast.error(
        `Column "[Col ${colIdx}] ${headerObj.columnHeader}" is already mapped to "${existingUse.fieldName}". Each Excel column can only be selected once.`
      );
      return;
    }

    setFieldMappings((prev) => ({
      ...prev,
      [fieldId]: {
        columnIndex: colIdx,
        columnHeader: headerObj.columnHeader,
        dateFormat: currentMapping.dateFormat,
      },
    }));
  };

  // Handle Step 1 Upload Submission
  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId || !selectedBuId) {
      toast.error('Please select both Client and Business Unit.');
      return;
    }
    if (showPricingSourceWarning) {
      toast.error('Cannot proceed. PRICING_SOURCE configuration is missing.');
      return;
    }
    if (!templateName.trim()) {
      toast.error('Please enter a Template Name.');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading and parsing Excel template headers...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    const queryParams = new URLSearchParams({
      clientId: String(selectedClientId),
      businessUnitId: String(selectedBuId),
      templateName: templateName.trim(),
      sheetName: sheetName.trim() || 'data',
      headerRowNumber: String(headerRowNumber || 1),
    });

    try {
      const response = await axiosInstance.post(
        `/order/client-mapping/template/upload?${queryParams.toString()}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data?.success && response.data?.data) {
        toast.success('Template uploaded successfully!', { id: toastId });
        const resData = response.data.data;
        setActiveTemplateId(resData.templateId);
        setExcelHeaders(resData.headers || []);
        setSystemFields(resData.systemFields || []);
        autoMatchColumns(resData.systemFields || [], resData.headers || []);
        setWizardStep(2);
      } else {
        toast.error(response.data?.message || 'Failed to upload template file.', { id: toastId });
      }
    } catch (err: any) {
      console.error('Upload Error:', err);
      toast.error(err.response?.data?.message || 'Upload failed. Please check file format.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // Handle Step 2 Save Mapping Submission
  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeTemplateId || !selectedClientId) {
      toast.error('Template ID or Client ID is missing.');
      return;
    }

    // Validate Required Fields
    const unmappedRequired = systemFields.filter((field) => {
      if (!field.isRequired) return false;
      const m = fieldMappings[field.id];
      return !m || m.columnIndex === -1 || !m.columnHeader;
    });

    if (unmappedRequired.length > 0) {
      const names = unmappedRequired.map((f) => f.fieldName).join(', ');
      toast.error(`Please map all mandatory fields: ${names}`);
      return;
    }

    // Validate No Duplicate Column Mappings
    const usedColIndices = new Set<number>();
    for (const [sysIdStr, mapVal] of Object.entries(fieldMappings)) {
      if (mapVal && mapVal.columnIndex !== -1 && mapVal.columnHeader) {
        if (usedColIndices.has(mapVal.columnIndex)) {
          const dupHeader = excelHeaders.find((h) => h.columnIndex === mapVal.columnIndex);
          toast.error(
            `Duplicate column mapping detected: "[Col ${mapVal.columnIndex}] ${dupHeader?.columnHeader || ''}" is assigned to multiple fields. Each Excel column can only be mapped once.`
          );
          return;
        }
        usedColIndices.add(mapVal.columnIndex);
      }
    }

    setSavingMapping(true);
    const toastId = toast.loading('Saving column mappings...');

    const mappingsArray: MappingRow[] = [];
    Object.entries(fieldMappings).forEach(([sysFieldIdStr, mapVal]) => {
      if (mapVal && mapVal.columnIndex !== -1 && mapVal.columnHeader) {
        mappingsArray.push({
          systemFieldId: Number(sysFieldIdStr),
          columnHeader: mapVal.columnHeader,
          columnIndex: mapVal.columnIndex,
          dateFormat: mapVal.dateFormat?.trim() || null,
          priority: 1,
        });
      }
    });

    const payload = {
      clientId: Number(selectedClientId),
      templateId: activeTemplateId,
      mappings: mappingsArray,
    };

    try {
      const response = await axiosInstance.post('/order/client-mapping/template/save', payload);
      if (response.data?.success !== false) {
        toast.dismiss(toastId);
        setIsModalOpen(false);
        resetFormState();
        fetchTemplates();
        setFeedbackPopup({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Column mapping saved successfully!',
        });
      } else {
        toast.dismiss(toastId);
        const errMsg = response.data?.message || 'Failed to save column mappings.';
        setFeedbackPopup({
          isOpen: true,
          type: 'error',
          title: 'Save Failed',
          message: errMsg,
        });
      }
    } catch (err: any) {
      console.error('Save Mapping Error:', err);
      toast.dismiss(toastId);
      const errMsg = err.response?.data?.message || 'Failed to save column mappings. Please try again.';
      setFeedbackPopup({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: errMsg,
      });
    } finally {
      setSavingMapping(false);
    }
  };

  // Open Edit Mapping for Existing Template
  const handleEditTemplate = async (template: TemplateItem) => {
    setSelectedClientId(template.clientId);
    setSelectedBuId(template.businessUnitId);
    setTemplateName(template.templateName);
    setSheetName(template.sheetName || 'data');
    setHeaderRowNumber(template.headerRowNumber || 1);
    setActiveTemplateId(template.id);

    const toastId = toast.loading('Loading template details...');
    try {
      const response = await axiosInstance.get(`/order/client-mapping/template/${template.id}`);
      const rawData = response.data;
      const mappingList: any[] = Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData)
        ? rawData
        : [];

      if (mappingList.length > 0) {
        // Extract Excel Headers from mapping array
        const headerMap = new Map<number, string>();
        mappingList.forEach((m) => {
          if (m.columnIndex !== undefined && m.columnIndex !== null && m.columnIndex >= 0) {
            headerMap.set(m.columnIndex, m.columnHeader?.trim() || `Column ${m.columnIndex}`);
          }
        });
        const extractedHeaders: ExcelHeader[] = Array.from(headerMap.entries())
          .map(([columnIndex, columnHeader]) => ({ columnIndex, columnHeader }))
          .sort((a, b) => a.columnIndex - b.columnIndex);

        // Extract System Fields from mapping array
        const fieldMap = new Map<number, SystemField>();
        mappingList.forEach((m) => {
          fieldMap.set(m.systemFieldId, {
            id: m.systemFieldId,
            fieldCode: m.fieldCode,
            fieldName: m.fieldName,
            targetColumn: m.targetColumn,
            dataType: m.dataType,
            isRequired: m.isRequired,
            dateFormat: m.dateFormat || undefined,
          });
        });

        // Merge with existing preloaded systemFields & DEFAULT_SYSTEM_FIELDS so all unmapped system fields are also displayed
        const extractedFields = Array.from(fieldMap.values());
        
        systemFields.forEach((sf) => {
          if (!fieldMap.has(sf.id)) {
            extractedFields.push(sf);
            fieldMap.set(sf.id, sf);
          }
        });

        DEFAULT_SYSTEM_FIELDS.forEach((dsf) => {
          if (!fieldMap.has(dsf.id)) {
            extractedFields.push(dsf);
            fieldMap.set(dsf.id, dsf);
          }
        });

        // Populate fieldMappings state map
        const mapState: Record<number, { columnIndex: number; columnHeader: string; dateFormat: string }> = {};
        mappingList.forEach((m) => {
          mapState[m.systemFieldId] = {
            columnIndex: m.columnIndex,
            columnHeader: m.columnHeader,
            dateFormat: m.dateFormat || '',
          };
        });

        setExcelHeaders(extractedHeaders);
        setSystemFields(extractedFields);
        setFieldMappings(mapState);

        setWizardStep(2);
        setIsModalOpen(true);
        toast.dismiss(toastId);
      } else if (rawData?.data?.headers || rawData?.headers) {
        // Alternative response structure fallback
        const dataObj = rawData.data || rawData;
        setExcelHeaders(dataObj.headers || []);
        setSystemFields(dataObj.systemFields || []);
        if (dataObj.mappings && Array.isArray(dataObj.mappings)) {
          const mapState: Record<number, { columnIndex: number; columnHeader: string; dateFormat: string }> = {};
          dataObj.mappings.forEach((m: any) => {
            mapState[m.systemFieldId] = {
              columnIndex: m.columnIndex,
              columnHeader: m.columnHeader,
              dateFormat: m.dateFormat || '',
            };
          });
          setFieldMappings(mapState);
        } else {
          autoMatchColumns(dataObj.systemFields || [], dataObj.headers || []);
        }
        setWizardStep(2);
        setIsModalOpen(true);
        toast.dismiss(toastId);
      } else {
        toast.error('Failed to load template configuration details.', { id: toastId });
      }
    } catch (err: any) {
      console.error('Fetch template detail error:', err);
      toast.error('Could not load template details. You can re-upload to map.', { id: toastId });
    }
  };

  // Toggle Template Active / Inactive Status (PUT /order/client-mapping/template/{id})
  const handleToggleStatus = async (template: TemplateItem) => {
    const newStatus = template.active === false ? true : false;
    const actionLabel = newStatus ? 'Activate' : 'Inactivate';
    
    const payload = {
      templateName: template.templateName,
      sheetName: template.sheetName || 'Sheet1',
      headerRowNumber: template.headerRowNumber || 1,
      active: newStatus,
    };

    const toastId = toast.loading(`${actionLabel}ing template...`);
    try {
      const response = await axiosInstance.put(`/order/client-mapping/template/${template.id}`, payload);
      if (response.data?.success !== false) {
        toast.dismiss(toastId);
        setFeedbackPopup({
          isOpen: true,
          type: 'success',
          title: 'Status Updated',
          message: `Template "${template.templateName}" has been successfully ${newStatus ? 'activated' : 'inactivated'}.`,
        });
        fetchTemplates();
      } else {
        toast.dismiss(toastId);
        const errMsg = response.data?.message || `Failed to ${actionLabel.toLowerCase()} template.`;
        setFeedbackPopup({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: errMsg,
        });
      }
    } catch (err: any) {
      console.error('Toggle status error:', err);
      toast.dismiss(toastId);
      const errMsg = err.response?.data?.message || `Failed to ${actionLabel.toLowerCase()} template. Please try again.`;
      setFeedbackPopup({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: errMsg,
      });
    }
  };

  // Reset Modal Form State
  const resetFormState = () => {
    setSelectedClientId('');
    setSelectedBuId('');
    setTemplateName('');
    setSheetName('data');
    setHeaderRowNumber(1);
    setSelectedFile(null);
    setShowPricingSourceWarning(false);
    setWizardStep(1);
    setActiveTemplateId(null);
    setExcelHeaders([]);
    setSystemFields([]);
    setFieldMappings({});
  };

  // Client lookup map for fast rendering
  const clientMap = useMemo(() => {
    const map: Record<number, ClientItem> = {};
    clients.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [clients]);

  // Download URL Formatter
  const getDownloadUrl = (path?: string) => {
    if (!path) return '#';
    let clean = path.replace(/^\/?opt\/lakee\//, '');
    clean = clean.replace(/^storage\//, 'storage/');
    if (!clean.startsWith('http')) {
      clean = clean.startsWith('/') ? clean.slice(1) : clean;
      return `http://download.lakeeshop.com/${clean}`;
    }
    return clean;
  };

  // Filtered Templates List
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const client = clientMap[t.clientId];
      const clientName = client?.clientName || '';
      const buName = client?.businessUnits?.find((b) => b.id === t.businessUnitId)?.unitName || '';
      const matchesSearch =
        t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.originalFileName && t.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClientFilter = !clientFilter || t.clientId === Number(clientFilter);
      return matchesSearch && matchesClientFilter;
    });
  }, [templates, searchQuery, clientFilter, clientMap]);

  // Paginated Templates List
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage) || 1;
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTemplates.slice(start, start + itemsPerPage);
  }, [filteredTemplates, currentPage]);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 w-full">
        
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Layers size={14} />
              <span>Orders / Master Configuration</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="text-blue-600 dark:text-blue-400" size={26} />
              Client Column Mapping Setup
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Map client-specific Excel order columns to standard system order ingestion fields. Upload sample templates, align fields, and manage mapping configurations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchTemplates}
              disabled={loadingTemplates}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              title="Refresh Templates"
            >
              <RefreshCw size={16} className={loadingTemplates ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              type="button"
              onClick={() => {
                resetFormState();
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold shadow-md transition-all duration-150 flex items-center gap-2 hover:scale-[1.02]"
            >
              <Plus size={16} />
              <span>Create New Mapping</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by template, client, file..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter size={14} />
              <span>Filter Client:</span>
            </div>
            <select
              value={clientFilter}
              onChange={(e) => {
                setClientFilter(e.target.value === '' ? '' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName} ({c.clientCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates Table Container */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4 pl-6 w-16">S.No</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Business Unit</th>
                  <th className="p-4">Template Name</th>
                  <th className="p-4">Original File</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Sample File</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loadingTemplates || loadingClients ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-blue-600" />
                        <span>Loading column mapping templates...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet size={32} className="text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold text-slate-600 dark:text-slate-400">No Mapping Templates Found</span>
                        <span className="text-xs text-slate-400">Click &quot;Create New Mapping&quot; to upload an Excel template file.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTemplates.map((template, idx) => {
                    const client = clientMap[template.clientId];
                    const clientName = client?.clientName || `Client #${template.clientId}`;
                    const buName = client?.businessUnits?.find((b) => b.id === template.businessUnitId)?.unitName || `Unit #${template.businessUnitId}`;
                    const downloadUrl = getDownloadUrl(template.filePath);
                    const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <tr 
                        key={template.id} 
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 pl-6 font-mono font-medium text-slate-500 dark:text-slate-400">
                          {serialNumber}
                        </td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Building2 size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span>{clientName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                            {buName}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-white">
                          {template.templateName}
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate" title={template.originalFileName}>
                          {template.originalFileName || '-'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            template.active !== false
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${template.active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {template.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {template.filePath ? (
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-semibold text-[11px] transition-colors"
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(template)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all ${
                                template.active !== false
                                  ? 'bg-amber-50 hover:bg-amber-600 hover:text-white dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              }`}
                              title={template.active !== false ? 'Inactivate Template' : 'Activate Template'}
                            >
                              <Power size={13} />
                              <span>{template.active !== false ? 'Inactivate' : 'Activate'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditTemplate(template)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition-all"
                            >
                              <Edit2 size={13} />
                              <span>Edit Mapping</span>
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
          {filteredTemplates.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredTemplates.length)}</span> of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredTemplates.length}</span> templates
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* CREATE / EDIT MAPPING MODAL & WIZARD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-850 dark:text-white">
                    {wizardStep === 1 ? 'Upload Excel Column Template' : `Configure Column Mapping - ${templateName}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {wizardStep === 1
                      ? 'Step 1 of 2: Upload Excel file & template identifiers'
                      : 'Step 2 of 2: Map Excel headers to system order ingestion fields'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetFormState();
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pricing Source Missing Alert Popup */}
            {showPricingSourceWarning && (
              <div className="mx-6 mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Pricing Source Configuration Required</span>
                    <span>{pricingSourceWarningMessage}</span>
                  </div>
                </div>
                <Link
                  href="/admin/clients/business-unit"
                  target="_blank"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <span>Configure Pricing Source</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            )}

            {/* Modal Body - Step 1: Upload Form */}
            {wizardStep === 1 && (
              <form onSubmit={handleUploadTemplate} className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Select Client */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Select Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => handleClientChange(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select Client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clientName} ({c.clientCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Business Unit */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Select Business Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!selectedClientId}
                      value={selectedBuId}
                      onChange={(e) => handleBuChange(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:opacity-50"
                    >
                      <option value="">Select Business Unit</option>
                      {availableBusinessUnits.map((bu) => (
                        <option key={bu.id} value={bu.id}>
                          {bu.unitName || `Unit #${bu.id}`} ({bu.unitCode || 'B2C'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Template Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Axis Bank Order File Template"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Sheet Name & Header Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Sheet Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="e.g. data or Sheet1"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Header Row # <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={headerRowNumber}
                        onChange={(e) => setHeaderRowNumber(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* File Dropzone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sample Excel File (.xlsx, .xls) <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/40 dark:bg-slate-800/20">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      required
                      id="excel-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        if (file && !templateName) {
                          const baseName = file.name.replace(/\.[^/.]+$/, "");
                          setTemplateName(baseName);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                      <UploadCloud size={32} className="text-blue-600 dark:text-blue-400" />
                      {selectedFile ? (
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedFile.name}</p>
                          <p className="text-[11px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB - Click to replace</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Click to select or drag and drop Excel sample file
                          </p>
                          <p className="text-[11px] text-slate-400">Supports .xlsx, .xls format files</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetFormState();
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={uploading || checkingPricingSource || showPricingSourceWarning}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Uploading & Parsing Headers...</span>
                      </>
                    ) : (
                      <>
                        <span>Next: Map Columns</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Modal Body - Step 2: Mapping Grid */}
            {wizardStep === 2 && (
              <form onSubmit={handleSaveMapping} className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs gap-3">
                  <div className="flex items-center gap-3 text-blue-900 dark:text-blue-300">
                    <Sparkles size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Auto-Matched Columns: </span>
                      <span>Review system field mappings below. Required fields must be mapped before saving.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                      Mapped Excel Columns: <strong className="text-blue-600 dark:text-blue-400">{mappedColumnCount} / {excelHeaders.length}</strong>
                    </span>
                    <span>System Fields: <strong className="text-blue-600 dark:text-blue-400">{systemFields.length}</strong></span>
                  </div>
                </div>

                {/* Mapping Table */}
                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
                        <tr>
                          <th className="p-3.5 pl-5 w-1/3">System Order Field</th>
                          <th className="p-3.5 w-1/6">Requirement</th>
                          <th className="p-3.5 w-2/5">Excel File Header Column</th>
                          <th className="p-3.5 pr-5 w-1/5">Date Format (If Applicable)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {systemFields.map((field) => {
                          const currentMapping = fieldMappings[field.id] || { columnIndex: -1, columnHeader: '', dateFormat: '' };
                          const isMapped = currentMapping.columnIndex !== -1 && currentMapping.columnHeader !== '';
                          const isDateField = field.dataType === 'DATE' || field.dataType === 'DATETIME' || field.fieldCode.toLowerCase().includes('date');

                          return (
                            <tr 
                              key={field.id} 
                              className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                                field.isRequired && !isMapped ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                              }`}
                            >
                              <td className="p-3.5 pl-5 font-semibold text-slate-800 dark:text-white">
                                <div>
                                  <span className="text-sm font-semibold">{field.fieldName}</span>
                                  <span className="block font-mono text-[10px] text-slate-400">{field.fieldCode}</span>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  field.isRequired
                                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {field.isRequired ? '* Required' : 'Optional'}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <select
                                  value={currentMapping.columnIndex === -1 ? '' : currentMapping.columnIndex}
                                  onChange={(e) => handleSelectColumnForField(field.id, e.target.value)}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                    isMapped
                                      ? 'border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium'
                                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
                                  }`}
                                >
                                  <option value="">-- Do Not Map --</option>
                                  {excelHeaders.map((h) => {
                                    const isUsedByOther = usedColumnMap[h.columnIndex] && usedColumnMap[h.columnIndex].sysFieldId !== field.id;
                                    const otherFieldName = isUsedByOther ? usedColumnMap[h.columnIndex].fieldName : '';
                                    return (
                                      <option key={h.columnIndex} value={h.columnIndex} disabled={isUsedByOther}>
                                        [Col {h.columnIndex}] {h.columnHeader} {isUsedByOther ? `(Mapped to ${otherFieldName})` : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>

                              <td className="p-3.5 pr-5">
                                {isDateField ? (
                                  <input
                                    type="text"
                                    value={currentMapping.dateFormat || ''}
                                    onChange={(e) => {
                                      const newFmt = e.target.value;
                                      setFieldMappings((prev) => ({
                                        ...prev,
                                        [field.id]: {
                                          ...currentMapping,
                                          dateFormat: newFmt,
                                        },
                                      }));
                                    }}
                                    placeholder="e.g. yyyy-MM-dd"
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to File Upload</span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingMapping}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                  >
                    {savingMapping ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Saving Mapping...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Save & Finalize Mapping</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* SUCCESS / FAILURE FEEDBACK POPUP MODAL */}
      {feedbackPopup.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              {feedbackPopup.type === 'success' ? (
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center border-4 border-emerald-100 dark:border-emerald-900/30">
                  <CheckCircle2 size={36} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center border-4 border-red-100 dark:border-red-900/30">
                  <AlertTriangle size={36} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                {feedbackPopup.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                {feedbackPopup.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFeedbackPopup((prev) => ({ ...prev, isOpen: false }))}
                className={`w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-150 hover:scale-[1.01] ${
                  feedbackPopup.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {feedbackPopup.type === 'success' ? 'OK / Continue' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
