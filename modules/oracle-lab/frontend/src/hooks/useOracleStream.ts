/**
 * useOracleStream — WebSocket subscription al backend con auto-reconnect.
 *
 * Estados:
 *   - connecting | connected | disconnected | error
 *
 * Pattern: WS-first con REST fallback automático cuando WS no responde
 * en 5s. Reconnect exponential backoff (1s → 30s max).
 */
import { useEffect, useRef, useState } from 'react';

export type Snapshot = {
  status: 'ok' | 'error';
  timestamp: string;
  providers: Record<string, ProviderResponse>;
};

export type ProviderResponse = {
  status: 'ok' | 'error' | 'no_data' | 'stale';
  data?: any;
  error?: string;
  fetched_at?: string;
  source?: string;
};

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseOracleStreamReturn {
  snapshot: Snapshot | null;
  connectionState: ConnectionState;
  forceRefresh: () => Promise<void>;
}

export function useOracleStream(): UseOracleStreamReturn {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  const fetchViaRest = async () => {
    try {
      const r = await fetch('/api/oracle/snapshot');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: Snapshot = await r.json();
      setSnapshot(data);
    } catch (err) {
      console.warn('[Oracle] REST fallback failed:', err);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws/oracle/stream`;

    setConnectionState('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    // 5s sin response → fallback REST + retry
    fallbackTimerRef.current = window.setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.warn('[Oracle] WS no respondió en 5s, REST fallback');
        fetchViaRest();
      }
    }, 5000);

    ws.onopen = () => {
      console.log('[Oracle] WebSocket conectado');
      setConnectionState('connected');
      reconnectDelayRef.current = 1000; // reset backoff
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data);
        if (event.type === 'snapshot') {
          setSnapshot(event.payload);
        } else if (event.type === 'manual_event') {
          console.log('[Oracle] Manual event:', event.payload);
        }
      } catch (err) {
        console.error('[Oracle] WS parse error:', err);
      }
    };

    ws.onerror = () => {
      console.warn('[Oracle] WS error → REST fallback');
      setConnectionState('error');
      fetchViaRest();
    };

    ws.onclose = () => {
      console.log(`[Oracle] WS cerrado, retry en ${reconnectDelayRef.current}ms`);
      setConnectionState('disconnected');
      reconnectTimerRef.current = window.setTimeout(connectWebSocket, reconnectDelayRef.current);
      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 1.5, 30_000);
      // Mientras reconnecta, mantener REST poll
      fetchViaRest();
    };
  };

  useEffect(() => {
    fetchViaRest();         // first paint
    connectWebSocket();     // luego WS

    // Backup poll cada 90s en caso de WS muerto silencioso
    const restInterval = window.setInterval(fetchViaRest, 90_000);

    return () => {
      clearInterval(restInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const forceRefresh = async () => {
    await fetchViaRest();
  };

  return { snapshot, connectionState, forceRefresh };
}
