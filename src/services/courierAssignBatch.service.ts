import axiosInstance from '@/lib/axios';
import {
  EligibleCourier,
  AwbBatchJobSubmitPayload,
  AwbBatchJobResponseData,
  EligibleCouriersApiResponse,
  AwbBatchJobApiResponse,
} from '@/types/courierAssignBatch';
import { CourierPartner } from '@/types/courier';

// Helper to parse NDJSON or JSON response for couriers list
const parseCourierPartners = (raw: any): CourierPartner[] => {
  if (typeof raw === 'string') {
    const parsed: CourierPartner[] = [];
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

export const courierAssignBatchService = {
  // 1. Fetch Eligible Couriers with Pending AWB Counts & enriched logos
  // GET /order/execution/awb-assignment/eligible-couriers
  getEligibleCouriers: async (): Promise<EligibleCourier[]> => {
    const url = '/order/execution/awb-assignment/eligible-couriers';

    // Fetch eligible couriers list
    const response = await axiosInstance.get<EligibleCouriersApiResponse | EligibleCourier[]>(url, {
      headers: { Accept: 'application/json' },
    });

    let eligibleList: EligibleCourier[] = [];
    if (Array.isArray(response.data)) {
      eligibleList = response.data;
    } else if (response.data && Array.isArray((response.data as EligibleCouriersApiResponse).data)) {
      eligibleList = (response.data as EligibleCouriersApiResponse).data;
    }

    // Try fetching courier partner details to enrich logos by courierServiceId / courierCode / id
    try {
      const partnersRes = await axiosInstance.get('/courier', {
        responseType: 'text',
        headers: { Accept: 'application/x-ndjson' },
      });
      const partners = parseCourierPartners(partnersRes.data);

      if (partners.length > 0) {
        eligibleList = eligibleList.map((item) => {
          const matchedPartner = partners.find(
            (p) => p.id === item.courierServiceId || (p.courierCode && item.courierCode && p.courierCode.toLowerCase() === item.courierCode.toLowerCase())
          );
          return {
            ...item,
            logoUrl: matchedPartner?.logoUrl || item.logoUrl,
          };
        });
      }
    } catch (partnerErr) {
      // Ignored
    }

    return eligibleList;
  },

  // 2. Submit AWB Batch API Job
  // POST /order/execution/awb-assignment/job/submit
  submitAwbBatchJob: async (
    payload: AwbBatchJobSubmitPayload
  ): Promise<AwbBatchJobResponseData> => {
    const url = '/order/execution/awb-assignment/job/submit';

    const response = await axiosInstance.post<AwbBatchJobApiResponse | { data: AwbBatchJobResponseData }>(
      url,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data as unknown as AwbBatchJobResponseData;
  },
};
