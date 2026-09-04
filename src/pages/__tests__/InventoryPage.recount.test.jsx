/**
 * BUG-08 (2026-09-04) — camino completo del escritor de inventory_events.
 *
 * Antes: InventoryDashboard ignoraba onRecount/onViewAudit → la vista 'audit'
 * era inalcanzable → RecountDrawer jamás se montaba → inventory_events
 * quedaba en 0. Este test verifica, sobre InventoryPage real, que:
 *   1. "Conteo manual" desde el dashboard abre el RecountDrawer prellenado.
 *   2. Enviar el conteo crea el evento inventory_counted y lo anexa al log
 *      (createInventoryEvent + appendEvent con hash del operador).
 *   3. "Bitácora" lleva a la vista de auditoría del ítem.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import InventoryPage from '../InventoryPage';
import { EVENT_TYPES } from '../../services/inventoryEvents.js';

// Stub del dashboard: simula que la tarjeta llama los callbacks cableados,
// que es justo lo que ANTES del fix nunca pasaba.
vi.mock('../../components/InventoryDashboard', () => ({
  default: ({ onRecount, onViewAudit }) => (
    <div data-testid="inventory-dashboard-stub">
      <button
        type="button"
        data-testid="stub-recount"
        onClick={() => onRecount('asset--material-1', 3.5, 'kg')}
      >
        conteo manual stub
      </button>
      <button
        type="button"
        data-testid="stub-view-audit"
        onClick={() => onViewAudit('asset--material-1')}
      >
        bitácora stub
      </button>
    </div>
  ),
}));

vi.mock('../../components/InventoryAuditTrail', () => ({
  default: ({ itemId }) => <div data-testid="audit-trail-stub">{itemId}</div>,
}));

vi.mock('../../components/InventoryAuditDashboard', () => ({
  default: () => <div data-testid="audit-dashboard-stub" />,
}));

vi.mock('../../components/InventoryEventTimeline', () => ({
  default: () => <div data-testid="event-timeline-stub" />,
}));

// `_event` sin tipar por JSDoc quedaría inferido `any` y le tumbaría la
// aridad al mock (0 params) — `.mock.calls[0][0]` en el test de abajo
// necesita esa aridad de 1 para no ser una tupla vacía (TS2493/TS2532).
const appendEvent = vi.fn(async (/** @type {object} */ _event) => undefined);
const createInventoryEvent = vi.fn(async (eventType, payload, opts) => ({
  id: 'evt-test-1',
  event_type: eventType,
  payload,
  operator_id_hash: opts.operator_id_hash,
}));

vi.mock('../../services/inventoryEvents', async (importOriginal) => ({
  ...(await importOriginal()),
  // El cast tipa `args` como la tupla real de createInventoryEvent (arriba);
  // un rest sin anotar es `any[]`, que TS2556 rechaza al esparcirlo sobre
  // parámetros fijos. Se tipa solo la FIRMA (Parameters/ReturnType), no
  // `typeof createInventoryEvent` completo: ese es un `Mock<F>` (trae
  // `.mock`, `.mockClear()`, etc.) y una arrow function plana no lo
  // satisface (TS2322).
  /** @type {(...args: Parameters<typeof createInventoryEvent>) => ReturnType<typeof createInventoryEvent>} */
  createInventoryEvent: (...args) => createInventoryEvent(...args),
}));

vi.mock('../../services/inventoryService', async (importOriginal) => ({
  ...(await importOriginal()),
  /** @type {(...args: Parameters<typeof appendEvent>) => ReturnType<typeof appendEvent>} */
  appendEvent: (...args) => appendEvent(...args),
}));

vi.mock('../../services/operatorIdentityService', async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentOperatorHash: () => 'hash-test-operador',
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InventoryPage — RecountDrawer alcanzable (BUG-08)', () => {
  test('el conteo manual abre el drawer prellenado con stock y unidad de la tarjeta', async () => {
    render(<InventoryPage />);

    await userEvent.click(screen.getByTestId('stub-recount'));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByText('asset--material-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('kg')).toBeInTheDocument();
  });

  test('enviar el conteo escribe inventory_counted en el log y cierra el drawer', async () => {
    render(<InventoryPage />);
    await userEvent.click(screen.getByTestId('stub-recount'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Corrige la cantidad (limpia el prellenado antes de tipear) y envía el
    // formulario. jsdom no implementa la acción por defecto del click en un
    // botón submit, así que se dispara el submit del form directamente.
    const input = screen.getByLabelText(/cantidad real contada/i);
    await userEvent.clear(input);
    await userEvent.type(input, '3.75');
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));

    // El drawer se cierra (refreshKey remonta el dashboard).
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(createInventoryEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload, opts] = createInventoryEvent.mock.calls[0];
    expect(eventType).toBe(EVENT_TYPES.COUNTED);
    expect(payload).toMatchObject({
      item_id: 'asset--material-1',
      counted_qty: 3.75,
      unit: 'kg',
    });
    expect(opts.operator_id_hash).toBe('hash-test-operador');
    expect(appendEvent).toHaveBeenCalledTimes(1);
    expect(appendEvent.mock.calls[0][0].id).toBe('evt-test-1');
  });

  test('"Bitácora" desde el dashboard lleva a la vista de auditoría del ítem', async () => {
    render(<InventoryPage />);

    await userEvent.click(screen.getByTestId('stub-view-audit'));

    expect(screen.getByTestId('audit-trail-stub')).toBeInTheDocument();
    expect(screen.getByText('asset--material-1')).toBeInTheDocument();
    // Desde la bitácora el conteo manual sigue disponible (solo itemId).
    expect(screen.getByRole('button', { name: /conteo manual de este item/i })).toBeInTheDocument();
  });
});
