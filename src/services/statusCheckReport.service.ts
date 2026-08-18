import axiosInstance from '@/lib/axios';

export interface OrderTimelineItem {
  id: number;
  status: number;
  remarks: string;
  createdBy?: number;
  createdAt?: string;
  [key: string]: any;
}

export interface StatusCheckReportDetails {
  matchedValue?: string | null;
  matchedField?: string | null;
  clientName?: string | null;
  businessUnitName?: string | null;
  clientOrderNo?: string | null;
  orderRefNo?: string | null;
  orderDate?: string | null;
  poNumber?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  childOrderRefNo?: string | null;
  productCode?: string | null;
  productName?: string | null;
  clientProductCode?: string | null;
  clientProductName?: string | null;
  quantity?: number | null;
  isExternal?: boolean | null;
  executionId?: number | null;
  executionType?: number | null;
  executionRefNo?: string | null;
  isExternalFulfillment?: boolean | null;
  externalFulfillmentType?: string | null;
  alternateProductName?: string | null;
  executionQty?: number | null;
  courierName?: string | null;
  awbNumber?: string | null;
  shipMode?: string | null;
  courierAssignDate?: string | null;
  awbAssignDate?: string | null;
  outscanDate?: string | null;
  deliveryDate?: string | null;
  executionStatus?: number | null;
  isPreorder?: boolean | null;
  preorderDate?: string | null;
  reshipReason?: string | null;
  remarks?: string | null;
  isHold?: boolean | null;
  holdReason?: string | null;
  lastProcessedBy?: number | null;
  timeline?: OrderTimelineItem[];
  [key: string]: any;
}

export const statusCheckReportService = {
  // POST /order/executions/status-check
  getStatusCheckDetails: async (identifier: string): Promise<StatusCheckReportDetails | null> => {
    const url = '/order/executions/status-check';
    const payload = [identifier.trim()];

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: {
          Accept: 'application/x-ndjson, application/json, */*',
          'Content-Type': 'application/json',
        },
        responseType: 'text', // Handles NDJSON text stream as well as JSON
      });

      let parsedData: any = null;

      // Handle String response (NDJSON or raw JSON string)
      if (typeof response.data === 'string') {
        const rawText = response.data.trim();
        if (rawText) {
          const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
          for (const line of lines) {
            try {
              const item = JSON.parse(line);
              if (item && (item.matchedValue || item.executionId || item.clientOrderNo)) {
                parsedData = item;
                break;
              } else if (item?.data) {
                parsedData = item.data;
                break;
              }
            } catch (e) {
              // Try parsing whole string as single JSON if line split fails
            }
          }

          if (!parsedData) {
            try {
              const singleObj = JSON.parse(rawText);
              if (Array.isArray(singleObj) && singleObj.length > 0) {
                parsedData = singleObj[0];
              } else if (singleObj?.data) {
                parsedData = Array.isArray(singleObj.data) ? singleObj.data[0] : singleObj.data;
              } else {
                parsedData = singleObj;
              }
            } catch (e) {
              // Ignored
            }
          }
        }
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        parsedData = response.data[0];
      } else if (response.data?.data) {
        parsedData = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        parsedData = response.data;
      }

      if (parsedData && typeof parsedData === 'object') {
        return parsedData;
      }

      return null;
    } catch (err: any) {
      // Fallback endpoint
      try {
        const fallbackUrl = `/order/execution/lookup-details?identifier=${encodeURIComponent(identifier)}`;
        const fallbackRes = await axiosInstance.get(fallbackUrl, {
          headers: { Accept: '*/*' },
        });
        if (fallbackRes.data?.data) return fallbackRes.data.data;
        if (fallbackRes.data && typeof fallbackRes.data === 'object') return fallbackRes.data;
      } catch (fbErr) {
        // Ignored
      }

      throw err;
    }
  },
};
