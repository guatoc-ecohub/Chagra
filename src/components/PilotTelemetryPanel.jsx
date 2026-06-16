import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, Shield } from 'lucide-react';
import { esOperadorActual } from '../config/glaciarAccess';
import { openDB, STORES } from '../db/dbCore';
import ChagraGrowLoader from './ChagraGrowLoader';

const EVENT_TYPES = ['onboarding', 'modulo', 'pregunta', 'feedback', 'sync'];
const RECENT_LIMIT = 50;

async function collectEvents() {
  const events = [];
  try {
    const db = await openDB();
    for (const storeName of [STORES.VOICE_TELEMETRY, STORES.LLM_TELEMETRY, STORES.RAG_TELEMETRY]) {
      try {
        if (!db.objectStoreNames.contains(storeName)) continue;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const all = await new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        events.push(...all.map((e) => ({ ...e, _source: storeName })));
      } catch (_) { /* store may not exist */ }
    }
  } catch (_) { /* DB may not be openable */ }
  events.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return events;
}

function categorizeEvent(event) {
  const type = event.event_type || event.flujo || '';
  if (type.includes('onboarding')) return 'onboarding';
  if (type.includes('modulo') || type.includes('module')) return 'modulo';
  if (type.includes('ask') || type.includes('chat') || type.includes('pregunta') || type.includes('query')) return 'pregunta';
  if (type.includes('feedback') || type.includes('rating')) return 'feedback';
  if (type.includes('sync') || type.includes('sincronizacion')) return 'sync';
  return 'other';
}

function PilotTelemetryPanelInner({ events, loading, error, onRefresh }) {
  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <ChagraGrowLoader size={32} showLabel labelText="Cargando telemetria..." />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 text-sm mb-2">Error al cargar telemetria</p>
        <p className="text-slate-500 text-xs">{error}</p>
        <button onClick={onRefresh} className="mt-3 px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700">Reintentar</button>
      </div>
    );
  }

  const counts = {};
  for (const t of EVENT_TYPES) counts[t] = 0;
  counts.other = 0;
  for (const event of events) {
    const cat = categorizeEvent(event);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const recent = events.slice(0, RECENT_LIMIT);

  return (
    <div className="p-4 space-y-4" data-testid="pilot-telemetry-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <BarChart3 size={16} className="text-emerald-400" />
          Telemetria de Piloto
        </h3>
        <button onClick={onRefresh} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400" title="Refrescar" aria-label="Refrescar telemetria">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {EVENT_TYPES.map((t) => (
          <div key={t} className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-center">
            <p className="text-xl font-black text-emerald-400 tabular-nums" data-testid={`count-${t}`}>{counts[t] || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t}</p>
          </div>
        ))}
      </div>
      {events.length === 0 && <p className="text-slate-500 text-xs text-center py-4">Sin eventos registrados aun.</p>}
      {recent.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-400" data-testid="events-table">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="py-1.5 pr-2 font-medium text-slate-500">Tipo</th>
                <th className="py-1.5 pr-2 font-medium text-slate-500">Flujo</th>
                <th className="py-1.5 pr-2 font-medium text-slate-500">Fecha</th>
                <th className="py-1.5 font-medium text-slate-500">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((ev, i) => (
                <tr key={ev.id || i} className="border-b border-slate-800/50 hover:bg-slate-900/40">
                  <td className="py-1 pr-2">{categorizeEvent(ev)}</td>
                  <td className="py-1 pr-2">{ev.event_type || ev.flujo || '-'}</td>
                  <td className="py-1 pr-2 text-slate-500">{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '-'}</td>
                  <td className="py-1 text-[10px] text-slate-600">{ev._source || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PilotTelemetryPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let service = null;
      try { service = await import('../services/pilotTelemetryService.js').catch(() => null); } catch (_) { service = null; }
      if (service && typeof service.getEvents === 'function') {
        const result = await service.getEvents();
        setEvents(Array.isArray(result) ? result : []);
      } else {
        const result = await collectEvents();
        setEvents(result);
      }
    } catch (err) {
      setError(err?.message || 'Error desconocido');
      setEvents([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  if (!esOperadorActual()) {
    return (
      <div className="p-4 text-center" data-testid="pilot-telemetry-unauthorized">
        <Shield size={24} className="mx-auto mb-2 text-slate-600" />
        <p className="text-slate-500 text-sm">Acceso restringido al operador.</p>
      </div>
    );
  }

  return <PilotTelemetryPanelInner events={events} loading={loading} error={error} onRefresh={loadEvents} />;
}
