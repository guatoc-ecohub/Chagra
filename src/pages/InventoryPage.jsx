/**
 * InventoryPage — orquesta los 3 componentes del flujo inventario.
 *
 * Estado local:
 *   - selectedItemId: cuál ítem está siendo editado / inspeccionado
 *   - viewMode: 'dashboard' | 'audit' — dashboard por default, audit al click
 *   - recountTarget: si != null, abre el RecountDrawer
 *
 * Refresh strategy: después de cada appendEvent exitoso, recargar el
 * componente Dashboard cambiando una `refreshKey` que dispara su useEffect.
 *
 * Para integrar en App.jsx:
 *   import InventoryPage from './pages/InventoryPage';
 *   ...
 *   <Route path="/inventario" element={<InventoryPage />} />
 *
 * Role-gate recomendado (no implementado acá):
 *   - Solo usuarios con rol 'operador' o superior
 *   - Owner ve todos los items
 *   - Operadores comunes ven solo items que aplican a sus parcelas (futuro)
 */

import { useState, useCallback } from 'react';
import InventoryDashboard from '../components/InventoryDashboard.jsx';
import InventoryAuditTrail from '../components/InventoryAuditTrail.jsx';
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

  const handleBackToDashboard = useCallback(() => {
    setSelectedItemId(null);
    setViewMode('dashboard');
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0e1116)' }}>
      {viewMode === 'dashboard' ? (
        <>
          <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border, #30363d)' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Inventario</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--fg-dim, #8b949e)' }}>
              Stock en vivo · ADR-027 event sourcing · Local-first
            </p>
          </header>
          <InventoryDashboard
            key={refreshKey}
            onRecount={handleRecount}
            onViewAudit={handleViewAudit}
          />
        </>
      ) : (
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
