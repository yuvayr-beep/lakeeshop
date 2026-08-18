import axiosInstance from '@/lib/axios';
import { StatusCheckReportDetails } from './statusCheckReport.service';

export const statusCheckBatchService = {
  // 1. POST /order/executions/status-check (NDJSON Multi-order status check)
  postBatchStatusCheck: async (identifiers: string[]): Promise<StatusCheckReportDetails[]> => {
    const url = '/order/executions/status-check';
    const payload = identifiers.map((id) => id.trim()).filter((id) => id.length > 0);

    const response = await axiosInstance.post(url, payload, {
      headers: {
        Accept: 'application/x-ndjson, application/json, */*',
        'Content-Type': 'application/json',
      },
      responseType: 'text',
    });

    const results: StatusCheckReportDetails[] = [];

    if (typeof response.data === 'string') {
      const rawText = response.data.trim();
      if (rawText) {
        const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
        for (const line of lines) {
          try {
            const parsedObj = JSON.parse(line.trim());
            if (parsedObj && typeof parsedObj === 'object') {
              if (parsedObj.clientOrderNo || parsedObj.executionRefNo || parsedObj.orderRefNo || parsedObj.clientName) {
                results.push(parsedObj);
              } else if (parsedObj.data && typeof parsedObj.data === 'object') {
                results.push(parsedObj.data);
              }
            }
          } catch (lineErr) {
            console.warn('NDJSON line parse warning:', lineErr, line);
          }
        }
      }
    } else if (Array.isArray(response.data)) {
      results.push(...response.data);
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      results.push(...response.data.data);
    } else if (response.data && typeof response.data === 'object') {
      results.push(response.data);
    }

    return results;
  },

  // 2. POST /order/executions/status-check/excel (Batch Excel Download)
  downloadBatchStatusCheckExcel: async (identifiers: string[]): Promise<void> => {
    const url = '/order/executions/status-check/excel';
    const payload = identifiers.map((id) => id.trim()).filter((id) => id.length > 0);

    const response = await axiosInstance.post(url, payload, {
      responseType: 'blob',
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Type': 'application/json',
      },
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `Batch_Status_Check_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
