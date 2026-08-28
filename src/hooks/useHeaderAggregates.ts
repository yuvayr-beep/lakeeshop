import { useState, useEffect } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface HeaderAggregatesData {
  totalPendingStockAssign?: number;
  criticalStockAssign?: number;
  escalatedStockAssign?: number;
  pendingCourierAssign?: number;
  pendingOutscan?: number;
  pendingOutscanStockAvailable?: number;
  pendingDelivery?: number;
  awbGenerationFailures?: number;
  activeHolds?: number;
  failedTallySyncs?: number;
  lastComputedAt?: string;
}

export function useHeaderAggregates(baseUrl: string = '/api/proxy', token: string | null = null) {
  const [headerAggregates, setHeaderAggregates] = useState<HeaderAggregatesData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

    const controller = new AbortController();

    async function connectSSE() {
      try {
        const streamUrl = `${baseUrl}/order/sse/header-aggregates`;
        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        console.log('[Header Bell API Request] GET /order/sse/header-aggregates', { streamUrl, headers });

        await fetchEventSource(streamUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,

          onopen(response) {
            if (response.ok) {
              setIsConnected(true);
              setError(null);
              return Promise.resolve();
            } else {
              setError(`HTTP Error ${response.status}`);
              setIsConnected(false);
              return Promise.reject(new Error(`Stream HTTP ${response.status}`));
            }
          },

          onmessage(event) {
            if (event.event === 'comment' || !event.data) return;

            try {
              const data = JSON.parse(event.data);
              console.log('[Header Bell API Response Data]:', data);
              setHeaderAggregates(data);
              setIsConnected(true);
            } catch (err) {
              console.error('Error parsing header aggregates SSE payload:', err);
            }
          },

          onerror(err) {
            console.error('SSE Connection Error:', err);
            setIsConnected(false);
            setError(err.message || 'Connection lost');
          },
        });
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      }
    }

    connectSSE();

    return () => {
      controller.abort();
      setIsConnected(false);
    };
  }, [baseUrl, token]);

  return { headerAggregates, isConnected, error };
}
