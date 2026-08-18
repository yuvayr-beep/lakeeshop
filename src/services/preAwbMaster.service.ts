import axiosInstance from '@/lib/axios';
import {
  PreAwbSummaryItem,
  PreAwbReportItem,
  PreAwbReportFilterParams,
  PreAwbManualAllotPayload,
} from '@/types/preAwbMaster';
import { CourierPartner } from '@/types/courier';

export const preAwbMasterService = {
  // 1. Download Pre-AWB Template
  // GET /courier/pre-awb/template
  downloadTemplate: async (): Promise<void> => {
    const response = await axiosInstance.get('/courier/pre-awb/template', {
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    });

    const filename = `pre_allotted_awb_upload_template_${Date.now()}.xlsx`;
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 2. Upload Pre-AWB Excel File for a Courier
  // POST /courier/pre-awb/upload?courierId={courierId}
  uploadPreAwbFile: async (courierId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      `/courier/pre-awb/upload?courierId=${courierId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      }
    );

    return response.data;
  },

  // 3. Get Pre-AWB Summary List (NDJSON Stream)
  // GET /courier/pre-awb/summary
  getSummaryList: async (): Promise<PreAwbSummaryItem[]> => {
    const response = await axiosInstance.get('/courier/pre-awb/summary', {
      responseType: 'text',
      headers: {
        Accept: 'application/x-ndjson',
      },
    });

    const items: PreAwbSummaryItem[] = [];

    if (typeof response.data === 'string') {
      const lines = response.data.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            items.push(parsed);
          }
        } catch (e) {
          console.warn('Pre-AWB summary NDJSON parse warning for line:', line, e);
        }
      }
    } else if (Array.isArray(response.data)) {
      items.push(...response.data);
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      items.push(...response.data.data);
    }

    return items;
  },

  // 4. Get Detailed AWB Report List for a Courier (NDJSON Stream)
  // GET /courier/pre-awb/report?courierId={courierId}&awbNumber={awbNumber}&awbStatus={awbStatus}&format=ndjson
  getReportList: async (filters: PreAwbReportFilterParams): Promise<PreAwbReportItem[]> => {
    const params: Record<string, any> = {
      courierId: filters.courierId,
      format: 'ndjson',
    };

    if (filters.awbNumber && filters.awbNumber.trim()) {
      params.awbNumber = filters.awbNumber.trim();
    }
    if (filters.awbStatus && filters.awbStatus !== 'ALL') {
      params.awbStatus = filters.awbStatus;
    }

    const response = await axiosInstance.get('/courier/pre-awb/report', {
      params,
      responseType: 'text',
      headers: {
        Accept: 'application/x-ndjson, */*',
      },
    });

    const items: PreAwbReportItem[] = [];

    if (typeof response.data === 'string') {
      const lines = response.data.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            items.push(parsed);
          }
        } catch (e) {
          console.warn('Pre-AWB report NDJSON parse warning for line:', line, e);
        }
      }
    } else if (Array.isArray(response.data)) {
      items.push(...response.data);
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      items.push(...response.data.data);
    }

    return items;
  },

  // 5. Download Pre-AWB Excel Report for a Courier
  // GET /courier/pre-awb/report?courierId={courierId}&format=excel
  downloadReportExcel: async (courierId: number): Promise<void> => {
    const params = {
      courierId,
      format: 'excel',
    };

    const response = await axiosInstance.get('/courier/pre-awb/report', {
      params,
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    });

    const filename = `Pre_Allotted_AWB_Report_${courierId}_${Date.now()}.xlsx`;
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 6. Manual Allotment of AWB
  // POST /courier/pre-awb/manual-allot
  manualAllot: async (payload: PreAwbManualAllotPayload): Promise<any> => {
    const response = await axiosInstance.post('/courier/pre-awb/manual-allot', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  },

  // 8. Fetch All Courier Partners (from /admin/courier/partners screen API)
  // GET /courier
  getCourierPartnersList: async (): Promise<CourierPartner[]> => {
    const response = await axiosInstance.get('/courier', {
      responseType: 'text',
      headers: {
        Accept: 'application/x-ndjson',
      },
    });

    const list: CourierPartner[] = [];

    if (typeof response.data === 'string') {
      const lines = response.data.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            list.push(parsed);
          }
        } catch (e) {
          console.warn('Courier list NDJSON parse error:', line, e);
        }
      }
    } else if (Array.isArray(response.data)) {
      list.push(...response.data);
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      list.push(...response.data.data);
    }

    // Sort alphabetically by courierName
    list.sort((a, b) => (a.courierName || '').localeCompare(b.courierName || '', undefined, { sensitivity: 'base' }));

    return list;
  },
};
