import { useState, useEffect } from 'react';

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
  clientOrderCounts?: Record<string, number>;
}

export function useHeaderAggregates(baseUrl: string = 'https://v2.lakeetech.com', token: string | null = null) {
  const [headerAggregates, setHeaderAggregates] = useState<HeaderAggregatesData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    let retryTimer: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    async function startSSEStream() {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null) || 'erp-init-2025';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const targetUrl = `${cleanBase}/order/sse/header-aggregates`;

      console.log('[Header Bell SSE Stream] Connecting to:', targetUrl);

      try {
        const response = await fetch(targetUrl, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (isSubscribed) {
            setError(`HTTP ${response.status}`);
            setIsConnected(false);
            // Schedule reconnect if non-200
            retryTimer = setTimeout(() => {
              if (isSubscribed) startSSEStream();
            }, 8000);
          }
          return;
        }

        if (isSubscribed) {
          setIsConnected(true);
          setError(null);
        }

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (isSubscribed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep partial line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.substring(5).trim();
              try {
                const data = JSON.parse(jsonStr);
                console.log('[Header Bell SSE Data Received]:', data);
                if (isSubscribed) {
                  setHeaderAggregates((prev) => ({ ...prev, ...data }));
                  setIsConnected(true);
                }
              } catch (e) {
                console.log('[Header Bell SSE Raw Data]:', jsonStr);
              }
            }
          }
        }
      } catch (err: any) {
        if (!controller.signal.aborted && isSubscribed) {
          console.error('[Header Bell SSE Error]:', err);
          setIsConnected(false);
          setError(err.message || 'Stream error');
          retryTimer = setTimeout(() => {
            if (isSubscribed) startSSEStream();
          }, 5000);
        }
      }
    }

    // Also fetch dashboard metrics for client order breakdown
    async function fetchDashboardMetrics() {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null) || 'erp-init-2025';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const today = new Date().toISOString().split('T')[0];
      const metricsUrl = `${cleanBase}/order/sse/dashboard-metrics?date=${today}`;

      try {
        const response = await fetch(metricsUrl, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'text/event-stream',
          },
          signal: controller.signal,
        });
        if (response.ok) {
          const text = await response.text();
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('data:')) {
              try {
                const data = JSON.parse(line.trim().substring(5));
                if (isSubscribed && data) {
                  setHeaderAggregates((prev) => ({
                    ...prev,
                    clientOrderCounts: data.clientOrderCounts,
                    lastComputedAt: data.lastComputedAt,
                  }));
                }
              } catch (e) { /* ignore parse err */ }
            }
          }
        }
      } catch (e) {
        console.warn('[Dashboard Metrics Fetch Warning]:', e);
      }
    }

    startSSEStream();
    fetchDashboardMetrics();

    return () => {
      isSubscribed = false;
      if (retryTimer) clearTimeout(retryTimer);
      controller.abort();
      setIsConnected(false);
    };
  }, [baseUrl, token]);

  return { headerAggregates, isConnected, error };
}
