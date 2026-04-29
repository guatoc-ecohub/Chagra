/**
 * RecountDrawer — drawer modal para emitir un evento `inventory_counted`.
 *
 * UX clave: el conteo manual NO destruye el log histórico. Reanchora el
 * stock al valor manual en T, descartando contribuciones anteriores en la
 * proyección. Pero los events anteriores siguen visibles en la bitácora
 * (AuditTrail).
 *
 * El operador entiende:
 *   "Estoy diciendo que AHORA hay X kg. Lo que el sistema decía antes
 *    queda registrado pero NO afecta el cálculo desde este momento."
 */

import { useState } from 'react';
import { appendEvent } from '../services/inventoryService.js';
import { createInventoryEvent, EVENT_TYPES, VALID_UNITS } from '../services/inventoryEvents.js';
import { getCurrentOperatorHash } from '../services/operatorIdentityService.js';

export default function RecountDrawer({ itemId, currentQty, currentUnit, onClose, onSubmitted }) {
  const [countedQty, setCountedQty] = useState(currentQty ?? 0);
  const [unit, setUnit] = useState(currentUnit || 'kg');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const operatorHash = getCurrentOperatorHash();
      if (!operatorHash) {
        throw new Error('No hay operador activo. Login requerido.');
      }
      const event = await createInventoryEvent(
        EVENT_TYPES.COUNTED,
        {
          item_id: itemId,
          counted_qty: Number(countedQty),
          unit,
          notes: notes.trim() || undefined,
        },
        { operator_id_hash: operatorHash }
      );
      await appendEvent(event);
      onSubmitted?.(event);
      onClose?.();
    } catch (e) {
      setError(e.message || 'Error al persistir conteo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg, #0e1116)',
          padding: '1.5rem',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Conteo manual</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--fg-dim, #8b949e)' }}>
            <strong>{itemId}</strong> — esto reanchora el stock SIN borrar logs.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Cantidad real contada físicamente
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1.4rem',
                fontWeight: 600,
                background: 'transparent',
                border: '1px solid var(--border, #30363d)',
                borderRadius: 6,
                color: 'inherit',
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Unidad
            </span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'transparent',
                border: '1px solid var(--border, #30363d)',
                borderRadius: 6,
                color: 'inherit',
              }}
            >
              {[...VALID_UNITS].sort().map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Nota (opcional, ej: "post deterioro abr 2026")
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'transparent',
                border: '1px solid var(--border, #30363d)',
                borderRadius: 6,
                color: 'inherit',
                fontFamily: 'inherit',
              }}
            />
          </label>

          {error && (
            <div role="alert" style={{ color: 'var(--err, #ef4444)', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'var(--accent, #0E92A6)',
                color: 'white',
                fontWeight: 600,
              }}
            >
              {submitting ? 'Guardando…' : 'Reanchorar stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
