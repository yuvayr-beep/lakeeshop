import axiosInstance from '@/lib/axios';
import {
  ExecutionTransitionRequest,
  CourierDamageClaim,
  CourierDamageClaimRequest,
  CourierClaimSettleRequest,
  CourierClaimFilters
} from '@/types/courierReturn';

import { uploadMediaFile, MediaUploadResponse } from '@/services/mediaApi';

export type { MediaUploadResponse };

export const courierReturnService = {
  /**
   * Upload Media Proof (Unboxing video or damage photo)
   * Calls /media/upload (via direct media server or gateway fallback)
   */
  uploadMediaProof: async (file: File): Promise<MediaUploadResponse> => {
    return uploadMediaFile(file, 'LOCAL');
  },

  /**
   * Scan & Inward Courier Return (Intact or Damaged)
   * POST /courier/invoice/status/update
   */
  scanReturn: async (payload: ExecutionTransitionRequest) => {
    const response = await axiosInstance.post('/courier/invoice/status/update', payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  /**
   * Bulk Upload Spreadsheet for Return Intake
   * POST /courier/invoice/status/upload
   */
  uploadReturnSheet: async (file: File, type: string = 'AWB') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('statusId', '13'); // 13 = RETURNED

    const response = await axiosInstance.post('/courier/invoice/status/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * List Courier Damage Recovery Claims (Accounts Ledger)
   * GET /courier/claims
   */
  getClaims: async (filters?: CourierClaimFilters): Promise<CourierDamageClaim[]> => {
    const response = await axiosInstance.get('/courier/claims', {
      params: filters
    });
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  },

  /**
   * Get Single Claim Details
   * GET /courier/claims/{id}
   */
  getClaimById: async (id: number): Promise<CourierDamageClaim> => {
    const response = await axiosInstance.get(`/courier/claims/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Update Claim (Attach Ticket Number, Photos, Notes)
   * PUT /courier/claims/{id}
   */
  updateClaim: async (id: number, payload: CourierDamageClaimRequest) => {
    const response = await axiosInstance.put(`/courier/claims/${id}`, payload);
    return response.data;
  },

  /**
   * Settle Claim (Record Credit Note or Rejection)
   * POST /courier/claims/{id}/settle
   */
  settleClaim: async (id: number, payload: CourierClaimSettleRequest) => {
    const response = await axiosInstance.post(`/courier/claims/${id}/settle`, payload);
    return response.data;
  }
};
