/**
 * InventoryAuditTrail — bitácora completa de events por item.
 *
 * Cumple ADR-019: muestra TODOS los events incluyendo los "perdidos" en la
 * proyección (counted que reanchoró logs anteriores, idempotency duplicados).
 *
 * UX: scrollable timeline con badges por event_type. Hover muestra detalle.
 */

import { useEffect, useState } from 'react';
import { getEventsForItem } from '../services/inventoryService.js';
import { EVENT_TYPES } from '../services/inventoryEvents.js';

const TYPE_BADGES = {
  [EVENT_TYPES.RECEIVED]:    { label: 'recibido',    color: '#22c55e', sign: '+' },
  [EVENT_TYPES.CONSUMED]:    { label: 'consumido',   color: '#0E92A6', sign: '−' },
  [EVENT_TYPES.TRANSFORMED]: { label: 'transformado', color: '#a78bfa', sign: '↺' },
  [EVENT_TYPES.COUNTED]:     { label: 'conteo',      color: '#f59e0b', sign: '⚓' },
  [EVENT_TYPES.ADJUSTED]:    { label: 'ajuste',      color: '#fb923c', sign: '±' },
  [EVENT_TYPES.TRANSFERRED]: { label: 'movido',      color: '#60a5fa', sign: '→' },
  [EVENT_TYPES.LOST]:        { label: 'perdido',     color: '#ef4444', sign: '✗' },
  [EVENT_TYPES.PRODUCED]:    { label: 'producido',   color: '#22c55e', sign: '+' },
};

function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function deltaForEvent(event) {
  const p = event.payload || {};
  switch (event.event_type) {
    case EVENT_TYPES.RECEIVED:
    case EVENT_TYPES.PRODUCED:
      return `+${p.delta} ${p.unit || ''}`;
    case EVENT_TYPES.CONSUMED:
    case EVENT_TYPES.LOST:
      return `${p.delta} ${p.unit || ''}`; // delta es negativo
    case EVENT_TYPES.ADJUSTED:
      return `${p.delta > 0 ? '+' : ''}${p.delta} (${p.reason})`;
    case EVENT_TYPES.COUNTED:
      return `= ${p.counted_qty} ${p.unit || ''}`;
    case EVENT_TYPES.TRANSFORMED:
      return `inputs ${(p.inputs || []).length} → outputs ${(p.outputs || []).length}`;
    case EVENT_TYPES.TRANSFERRED:
      return `${p.qty} ${p.unit || ''} → ${p.to_location_id?.slice(0, 8)}`;
    default:
      return '—';
  }
}

export default function InventoryAuditTrail({ itemId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!itemId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const evts = await getEventsForItem(itemId);
        if (mounted) setEvents(evts);
      } catch (e) {
        if (mounted) setError(e.message || 'Error cargando bitácora');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [itemId]);

  if (loading) return <div>Cargando bitácora…</div>;
  if (error) return <div style={{ color: 'var(--err)' }}>{error}</div>;
  if (events.length === 0) {
    return (
      <p style={{ color: 'var(--fg-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
        Sin events registrados para este item.
      </p>
    );
  }

  // Mostrar más recientes primero
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <section style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
        Bitácora · {itemId} ({events.length} events)
      </h3>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sorted.map((event) => {
          const badge = TYPE_BADGES[event.event_type] || { label: event.event_type, color: '#666', sign: '?' };
          return (
            <li
              key={event.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.75rem 0',
                borderBottom: '1px solid var(--border, #30363d)',
              }}
              title={`ULID: ${event.id}\nDevice: ${event.device_id_lex_hash} (seq ${event.sequence_number})\nIdempotency: ${event.idempotency_key}\nOperator: ${event.operator_id_hash.slice(0, 12)}…`}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: badge.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {badge.sign}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '0.85rem', color: badge.color }}>{badge.label}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-dim, #8b949e)' }}>
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                  {deltaForEvent(event)}
                </div>
                {event.notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-dim, #8b949e)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    "{event.notes}"
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
