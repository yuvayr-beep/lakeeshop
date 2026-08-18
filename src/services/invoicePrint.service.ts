import axiosInstance from '@/lib/axios';
import {
  InvoiceListItem,
  PendingInvoiceGroupItem,
  InvoiceBatchItem,
  InvoiceBatchFilterParams,
  InvoicePrintLayoutFormat,
  InvoiceDocType,
  ValidateIdentifiersPayload,
  ValidateIdentifiersResponseData,
  ReprintRequestPayload,
} from '@/types/invoicePrint';

// Helper to parse NDJSON strings or JSON arrays into typed arrays
const parseNdjson = <T>(raw: any): T[] => {
  if (typeof raw === 'string') {
    const parsed: T[] = [];
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

export const invoicePrintService = {
  // 1. Fetch Invoice List Preview (NDJSON / JSON)
  // GET /courier/invoice/list/preview
  getInvoiceListPreview: async (): Promise<InvoiceListItem[]> => {
    const url = '/courier/invoice/list/preview';
    const response = await axiosInstance.get(url, {
      headers: {
        Accept: 'application/x-ndjson, application/json, */*',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    return parseNdjson<InvoiceListItem>(response.data);
  },

  // 2. Fetch Pending Invoice Counts by Group
  // GET /courier/invoice/pending-counts
  getPendingCounts: async (): Promise<PendingInvoiceGroupItem[]> => {
    const url = '/courier/invoice/pending-counts';
    const response = await axiosInstance.get(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  // 3. Print Invoices by Group IDs (1x1 Thermal, 1x4 Sheet, or Multi Packing Slip)
  // POST /courier/invoice/print/{format}/{groupIds}?docType={docType}
  printInvoices: async (
    groupIds: (number | string)[],
    format: InvoicePrintLayoutFormat,
    docType: InvoiceDocType = 'challan'
  ): Promise<void> => {
    const idsString = Array.isArray(groupIds) ? groupIds.join(',') : String(groupIds);
    const url = `/courier/invoice/print/${format}/${idsString}?docType=${docType}`;

    const response = await axiosInstance.post(
      url,
      {},
      {
        headers: {
          Accept: 'application/pdf, application/json, */*',
        },
        responseType: 'blob',
      }
    );

    // Create Blob URL for PDF
    const contentTypeHeader = response.headers?.['content-type'];
    const contentType = contentTypeHeader ? String(contentTypeHeader) : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);

    // Open PDF preview in a new window/tab for instant viewing and browser printing
    const pdfWindow = window.open(blobUrl, '_blank');
    if (!pdfWindow) {
      const filename = `Invoice_Print_${format}_${idsString}_${Date.now()}.pdf`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },

  // 4. Fetch Created Invoice Batches List
  // GET /courier/invoice/batch/list
  getInvoiceBatchList: async (params?: InvoiceBatchFilterParams): Promise<InvoiceBatchItem[]> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.groupId && String(params.groupId) !== 'ALL') queryParams.append('groupId', String(params.groupId));
    if (params?.clientId && String(params.clientId) !== 'ALL') queryParams.append('clientId', String(params.clientId));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `/courier/invoice/batch/list${queryString}`;

    const response = await axiosInstance.get(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  // 5. Reprint Invoice Format (1x1 Thermal or 1x4 Sheet)
  // POST /courier/invoice/reprint/{format} with body { batchNos: [...] }
  reprintInvoiceFormat: async (batchNos: string[], format: '1x1' | '1x4'): Promise<void> => {
    const url = `/courier/invoice/reprint/${format}`;
    const payload = { batchNos };

    const response = await axiosInstance.post(
      url,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf, application/json, */*',
        },
        responseType: 'blob',
      }
    );

    const contentTypeHeader = response.headers?.['content-type'];
    const contentType = contentTypeHeader ? String(contentTypeHeader) : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);

    const pdfWindow = window.open(blobUrl, '_blank');
    if (!pdfWindow) {
      const filename = `Reprint_${format}_${batchNos.join('_')}_${Date.now()}.pdf`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },

  // 6. Print Packing Slip Batch (PS)
  // POST /courier/packing-slip/print/batch/{batchId}
  printPackingSlipBatch: async (batchIds: (number | string)[]): Promise<void> => {
    const idsString = Array.isArray(batchIds) ? batchIds.join(',') : String(batchIds);
    const url = `/courier/packing-slip/print/batch/${idsString}`;

    const response = await axiosInstance.post(
      url,
      {},
      {
        headers: {
          Accept: 'application/pdf, application/json, */*',
        },
        responseType: 'blob',
      }
    );

    const contentTypeHeader = response.headers?.['content-type'];
    const contentType = contentTypeHeader ? String(contentTypeHeader) : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);

    const pdfWindow = window.open(blobUrl, '_blank');
    if (!pdfWindow) {
      const filename = `Packing_Slip_Batch_${idsString}_${Date.now()}.pdf`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },

  // 7. Download Pending Invoice List Excel Spreadsheet
  // GET /courier/invoice/list/download
  downloadInvoiceListExcel: async (): Promise<void> => {
    const primaryUrl = '/courier/invoice/list/download';
    const fallbackUrl = '/courier/invoice/print/list/excel';

    let response;
    try {
      response = await axiosInstance.get(primaryUrl, {
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        responseType: 'blob',
      });
    } catch (err: any) {
      response = await axiosInstance.get(fallbackUrl, {
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        responseType: 'blob',
      });
    }

    let fileName = `Invoice_List_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const contentDisposition = response.headers?.['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = String(contentDisposition).match(/filename="?([^";]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        fileName = filenameMatch[1];
      }
    }

    const contentType = response.headers?.['content-type']
      ? String(response.headers['content-type'])
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  // 8. Validate Submitted Identifiers for Batch Reprint
  // POST /courier/invoice/reprint/validate
  validateReprintIdentifiers: async (
    identifiers: string[]
  ): Promise<ValidateIdentifiersResponseData> => {
    const url = '/courier/invoice/reprint/validate';
    const payload: ValidateIdentifiersPayload = { identifiers };

    const response = await axiosInstance.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  // 9. Execute Batch Reprint (1x1, 1x4, Multi, or PS) for Valid Identifiers
  // POST /courier/invoice/reprint/{format}?docType={docType}
  reprintValidIdentifiers: async (
    payload: ReprintRequestPayload,
    format: InvoicePrintLayoutFormat | 'ps',
    docType: InvoiceDocType = 'challan'
  ): Promise<void> => {
    const isPs = format === 'ps';
    const batchIdParam = payload.batchNos?.[0] || '1';
    const url = isPs
      ? `/courier/packing-slip/reprint/batch/${batchIdParam}`
      : `/courier/invoice/reprint/${format}?docType=${docType}`;

    const response = await axiosInstance.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/pdf, application/json, */*',
      },
      responseType: 'blob',
    });

    const contentTypeHeader = response.headers?.['content-type'];
    const contentType = contentTypeHeader ? String(contentTypeHeader) : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);

    const pdfWindow = window.open(blobUrl, '_blank');
    if (!pdfWindow) {
      const filename = `Batch_Reprint_${format}_${Date.now()}.pdf`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },
};
