import axiosInstance from '@/lib/axios';
import { PreorderShortageReason } from '@/types/preorderMaster';

export const preorderMasterService = {
  /**
   * Fetch Pre-Order Shortage Reasons list (NDJSON stream)
   * GET /order/master/preorder-shortage-reasons
   */
  getShortageReasons: async (): Promise<PreorderShortageReason[]> => {
    const response = await axiosInstance.get('/order/master/preorder-shortage-reasons', {
      responseType: 'text',
      headers: {
        Accept: 'application/x-ndjson',
      },
    });

    const items: PreorderShortageReason[] = [];

    if (typeof response.data === 'string') {
      const lines = response.data.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed && typeof parsed === 'object') {
            items.push(parsed);
          }
        } catch (e) {
          console.warn('NDJSON line parse warning:', line, e);
        }
      }
    } else if (Array.isArray(response.data)) {
      items.push(...response.data);
    } else if (response.data && typeof response.data === 'object' && Array.isArray((response.data as any).data)) {
      items.push(...(response.data as any).data);
    }

    return items;
  },
};
