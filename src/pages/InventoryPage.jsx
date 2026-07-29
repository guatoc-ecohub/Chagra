/**
 * InventoryPage, orquesta los flujos de inventario: stock en vivo, bitácora
 * por ítem y el panel global de auditoría/reconciliación.
 *
 * Estado local:
 *   - selectedItemId: cuál ítem está siendo editado / inspeccionado
 *   - viewMode: 'dashboard' | 'audit' | 'reconciliation'
 *       - 'dashboard': stock en vivo (InventoryDashboard), default.
 *       - 'audit': bitácora completa de UN ítem (InventoryAuditTrail).
 *       - 'reconciliation': panel global de auditoría (InventoryAuditDashboard,
 *         reconcileAllItems de inventoryReconcile.js) + línea de tiempo global
 *         de eventos (InventoryEventTimeline, sin itemId).
 *   - recountTarget: si != null, abre el RecountDrawer
 *
 * Refresh strategy: después de cada appendEvent exitoso, recargar el
 * componente Dashboard cambiando una `refreshKey` que dispara su useEffect.
 *
 * Ruteado en App.jsx bajo el case 'auditoria_inventario' (envuelto en
 * ScreenShell para navegación back/home), accesible desde la Bodega
 * ('bodega') vía el botón "Auditoría y reconciliación" del header.
 *
 * Role-gate recomendado (no implementado aquí):
 *   - Solo usuarios con rol 'operador' o superior
 *   - Owner ve todos los items
 *   - Operadores comunes ven solo items que aplican a sus parcelas (futuro)
 */

import { useState, useCallback } from 'react';
import { Scale } from 'lucide-react';
import InventoryDashboard from '../components/InventoryDashboard.jsx';
import InventoryAuditTrail from '../components/InventoryAuditTrail.jsx';
import InventoryAuditDashboard from '../components/InventoryAuditDashboard.jsx';
import InventoryEventTimeline from '../components/InventoryEventTimeline.jsx';
import RecountDrawer from '../components/RecountDrawer.jsx';

export default function InventoryPage() {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  const [recountTarget, setRecountTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRecount = useCallback((itemId) => {
    setRecountTarget({ itemId });
  }, []);

  const handleRecountSubmitted = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setRecountTarget(null);
  }, []);

  const handleViewAudit = useCallback((itemId) => {
    setSelectedItemId(itemId);
    setViewMode('audit');
  }, []);

  const handleViewReconciliation = useCallback(() => {
    setViewMode('reconciliation');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setSelectedItemId(null);
    setViewMode('dashboard');
  }, []);

  return (
    <div style={{ background: 'var(--bg, #0e1116)' }} data-testid="inventory-page">
      {viewMode === 'dashboard' && (
        <>
          <header
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border, #30363d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Inventario</h1>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--fg-dim, #8b949e)' }}>
                Stock en vivo · ADR-027 event sourcing · Local-first
              </p>
            </div>
            <button
              type="button"
              onClick={handleViewReconciliation}
              data-testid="inventory-open-reconciliation"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border, #30363d)',
                background: 'transparent',
                color: 'inherit',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Scale size={14} /> Auditoría y reconciliación
            </button>
          </header>
          <InventoryDashboard
            key={refreshKey}
            onRecount={handleRecount}
            onViewAudit={handleViewAudit}
          />
        </>
      )}

      {viewMode === 'audit' && (
        <>
          <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border, #30363d)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleBackToDashboard} aria-label="Volver al dashboard">
              ← Volver
            </button>
            <h1 style={{ margin: 0, fontSize: '1.1rem' }}>Bitácora · {selectedItemId}</h1>
          </header>
          <InventoryAuditTrail itemId={selectedItemId} />
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <button onClick={() => handleRecount(selectedItemId)}>
              ± Conteo manual de este item
            </button>
          </div>
        </>
      )}

      {viewMode === 'reconciliation' && (
        <div data-testid="inventory-view-reconciliation">
          <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border, #30363d)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleBackToDashboard} aria-label="Volver al dashboard">
              ← Volver
            </button>
            <h1 style={{ margin: 0, fontSize: '1.1rem' }}>Auditoría y reconciliación</h1>
          </header>
          <InventoryAuditDashboard />
          <section style={{ padding: '1.5rem', paddingTop: '0.5rem' }}>
            <h2
              style={{
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--fg-dim, #8b949e)',
                margin: '0 0 0.75rem',
              }}
            >
              Línea de tiempo global de eventos
            </h2>
            {/* Altura explícita: InventoryEventTimeline usa GroupedVirtuoso
                (react-virtuoso) con `height: 100%` internamente — sin un
                ancestro con altura definida, el virtualizador colapsa a 0px. */}
            <div style={{ height: '55vh' }}>
              <InventoryEventTimeline itemId={selectedItemId} />
            </div>
          </section>
        </div>
      )}

      {recountTarget && (
        <RecountDrawer
          itemId={recountTarget.itemId}
          currentQty={recountTarget.currentQty}
          currentUnit={recountTarget.currentUnit}
          onClose={() => setRecountTarget(null)}
          onSubmitted={handleRecountSubmitted}
        />
      )}
    </div>
  );
}
