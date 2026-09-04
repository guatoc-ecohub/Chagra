/**
 * ActionConfirmModal.bug02.test.jsx — regresión del BUG-02 del hard-test
 * David/Cata (síntoma: «sin UI de confirmación de las operaciones parseadas»).
 *
 * El núcleo de la respuesta lo arregló ee80ad0cf (2026-08-31, ya en dev); lo
 * que quedaba roto era este gate: para `registrar_ingesta_compleja` el modal
 * volcaba `JSON.stringify({ plan: { operations: [...] } })` crudo — con el
 * objeto `proposal` duplicado dentro de cada operación — en vez de una lista
 * legible de lo que se va a registrar.
 *
 * Contrato del fix: cuando la tool es `registrar_ingesta_compleja` y el plan
 * trae `operations`, los parámetros se muestran como lista legible (una
 * etiqueta humana por operación). Es un cambio SOLO de presentación: aprobar
 * sigue enviando el objeto de parámetros completo e intacto, y cualquier otra
 * tool conserva su volcado JSON genérico.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import ActionConfirmModal from '../ActionConfirmModal';

afterEach(cleanup);

const PLAN_COMPLETO = {
  plan: {
    detected: true,
    requiresConfirmation: true,
    operations: [
      { kind: 'ensure_land', tool_name: 'crear_lote', parameters: { name: 'Surco 12', land_type: 'bed' } },
      { kind: 'create_seeding', tool_name: 'registrar_siembra', parameters: { crop: 'tomate cherry', quantity: 10 } },
      { kind: 'register_harvest', tool_name: 'crear_log', parameters: { log_type: 'log--harvest', ordinal: 1 } },
      { kind: 'register_fertilizer_cadence', tool_name: 'crear_log', parameters: { interval_days: 15 } },
      { kind: 'register_problem', tool_name: 'crear_log', parameters: { name: 'trozador', problem_type: 'plaga' } },
    ],
  },
};

function renderGate(overrides = {}) {
  return render(
    <ActionConfirmModal
      key="gate-bug02"
      isOpen
      toolName="registrar_ingesta_compleja"
      description="Revisar y registrar una siembra histórica con sus cosechas, abonos y observaciones detectadas"
      parameters={PLAN_COMPLETO}
      intent="sembré 10 tomate cherry en el surco 12 hace 3 meses…"
      onApprove={vi.fn()}
      onReject={vi.fn()}
      onEdit={vi.fn()}
      {...overrides}
    />,
  );
}

describe('ActionConfirmModal — lista legible para registrar_ingesta_compleja (BUG-02)', () => {
  it('muestra las operaciones del plan como lista legible y NO como JSON crudo', () => {
    const { container } = renderGate();

    for (const etiqueta of [
      'el surco',
      'la siembra retrofechada',
      'la cosecha 1',
      'el abono cada 15 días',
      'la observación de trozador',
    ]) {
      expect(screen.getByText(etiqueta)).toBeInTheDocument();
    }

    // Control negativo: si el fix se revierte, vuelve el <pre> con el
    // volcado JSON.stringify del plan completo (incluido el proposal duplicado).
    expect(container.querySelector('pre')).toBeNull();
    expect(container.textContent).not.toContain('"kind"');
    expect(container.textContent).not.toContain('"operations"');
    expect(container.textContent).not.toContain('"proposal"');
  });

  it('control negativo: otras tools conservan su volcado JSON genérico', () => {
    const { container } = renderGate({
      toolName: 'crear_log',
      parameters: { log_type: 'log--harvest', quantity: 3 },
    });

    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.textContent).toContain('"log_type"');
    expect(screen.queryByText('la cosecha 1')).toBeNull();
  });

  it('sin plan.operations el modal cae al JSON genérico en vez de quedarse mudo', () => {
    const { container } = renderGate({ parameters: {} });

    expect(container.querySelector('pre')).not.toBeNull();
  });

  it('aprobar sigue enviando el plan COMPLETO: la rama legible es solo visual', async () => {
    const onApprove = vi.fn();
    renderGate({ onApprove });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    expect(onApprove).toHaveBeenCalledWith(PLAN_COMPLETO);
  });
});
