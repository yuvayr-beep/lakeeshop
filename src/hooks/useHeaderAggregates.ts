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

export function useHeaderAggregates(baseUrl: string = '/api/proxy', token: string | null = null) {
  const [headerAggregates, setHeaderAggregates] = useState<HeaderAggregatesData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    let retryTimer: NodeJS.Timeout | null = null;
    let controller = new AbortController();

    async function startSSEStream() {
      if (!isSubscribed) return;

      const authToken =
        token ||
        (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null) ||
        'erp-init-2025';

      // Use /api/proxy when in browser unless a custom local base URL is provided
      let resolvedBase = baseUrl;
      if (typeof window !== 'undefined') {
        if (!baseUrl || baseUrl.includes('v2.lakeetech.com')) {
          resolvedBase = '/api/proxy';
        }
      }
      const cleanBase = resolvedBase.endsWith('/') ? resolvedBase.slice(0, -1) : resolvedBase;
      const targetUrl = `${cleanBase}/order/sse/header-aggregates`;

      try {
        const response = await fetch(targetUrl, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (isSubscribed) {
            setError(`HTTP ${response.status}`);
            setIsConnected(false);
            // Schedule reconnect if non-200 with backoff
            retryTimer = setTimeout(() => {
              if (isSubscribed) startSSEStream();
            }, 10000);
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
                if (isSubscribed) {
                  setHeaderAggregates((prev) => ({ ...prev, ...data }));
                  setIsConnected(true);
                }
              } catch (e) {
                // Non-JSON SSE ping/keepalive
              }
            }
          }
        }
      } catch (err: any) {
        // Suppress expected abort errors on unmount or tab change
        if (!isSubscribed || controller.signal.aborted || err.name === 'AbortError') {
          return;
        }

        console.warn('[Header Bell SSE Info]: Stream disconnected, reconnecting in 10s...', err.message);
        if (isSubscribed) {
          setIsConnected(false);
          setError(err.message || 'Stream disconnected');
          retryTimer = setTimeout(() => {
            if (isSubscribed) {
              controller = new AbortController();
              startSSEStream();
            }
          }, 10000);
        }
      }
    }

    // Also fetch dashboard metrics for client order breakdown
    async function fetchDashboardMetrics() {
      if (!isSubscribed) return;

      const authToken =
        token ||
        (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null) ||
        'erp-init-2025';

      let resolvedBase = baseUrl;
      if (typeof window !== 'undefined') {
        if (!baseUrl || baseUrl.includes('v2.lakeetech.com')) {
          resolvedBase = '/api/proxy';
        }
      }
      const cleanBase = resolvedBase.endsWith('/') ? resolvedBase.slice(0, -1) : resolvedBase;
      const today = new Date().toISOString().split('T')[0];
      const metricsUrl = `${cleanBase}/order/sse/dashboard-metrics?date=${today}`;

      try {
        const response = await fetch(metricsUrl, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'text/event-stream',
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
              } catch (e) {
                /* ignore parse err */
              }
            }
          }
        }
      } catch (e: any) {
        if (!isSubscribed || controller.signal.aborted || e?.name === 'AbortError') {
          return;
        }
        console.warn('[Dashboard Metrics Fetch Warning]:', e.message);
      }
    }

    startSSEStream();
    fetchDashboardMetrics();

    return () => {
      isSubscribed = false;
      if (retryTimer) clearTimeout(retryTimer);
      try {
        controller.abort();
      } catch {}
      setIsConnected(false);
    };
  }, [baseUrl, token]);

  return { headerAggregates, isConnected, error };
}
