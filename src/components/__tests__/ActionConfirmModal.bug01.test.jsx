/**
 * ActionConfirmModal.bug01.test.jsx — regresión del BUG-01 del hard-test
 * David/Cata (2026-08-31, P1): el agente DECÍA que registraba y NO persistía
 * nada.
 *
 * Causa raíz: el modal vive siempre montado (renderiza null cerrado) y
 * `useState(parameters)` solo captura los parámetros del PRIMER render ({});
 * al aprobar enviaba ese borrador rancio → el executor ejecutaba la tool con
 * {} → la persistencia quedaba en 0 mientras el agente afirmaba haber
 * registrado.
 *
 * Contrato del fix: AgentScreen remonta el modal por acción con
 * `key={gateId}`. Estos tests congelan ese patrón — si alguien le quita el
 * key al caller (o el estado interno deja de arrancar de `parameters`), el
 * approve vuelve a mandar un plan vacío y pisan.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import ActionConfirmModal from '../ActionConfirmModal';

afterEach(cleanup);

const PLAN_PARAMETERS = {
  plan: {
    detected: true,
    operations: [
      { kind: 'create_seeding', parameters: { crop: 'tomate cherry', quantity: 10 } },
    ],
  },
};

describe('ActionConfirmModal — el borrador arranca con los parámetros de la acción (BUG-01)', () => {
  it('aprueba con los parámetros que recibió al montar, no con un estado previo rancio', async () => {
    const onApprove = vi.fn();
    // Escenario exacto del AgentScreen: el gate abre con un key nuevo por
    // acción (remount) y SUS parámetros. El mount inicial del árbol con el
    // modal cerrado (parameters={}) quedó atrás.
    render(
      <ActionConfirmModal
        key="gate-1"
        isOpen
        toolName="registrar_ingesta_compleja"
        description="Confirmar registro"
        parameters={PLAN_PARAMETERS}
        intent="sembré 10 tomate cherry"
        onApprove={onApprove}
        onReject={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    // El contrato: lo que llega al executor es EXACTAMENTE el plan propuesto
    // cuando el operador no editó nada.
    expect(onApprove).toHaveBeenCalledWith(PLAN_PARAMETERS);
  });

  it('una SEGUNDA acción (key nuevo → remount) aprueba con SUS parámetros, no con los de la primera', async () => {
    const onApprove = vi.fn();
    const secondParameters = { plan: { detected: true, operations: [{ kind: 'ensure_land' }] } };
    const { rerender } = render(
      <ActionConfirmModal
        key="gate-1"
        isOpen
        toolName="registrar_ingesta_compleja"
        description="Primera acción"
        parameters={PLAN_PARAMETERS}
        onApprove={onApprove}
        onReject={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    // El primer gate cierra…
    rerender(
      <ActionConfirmModal
        key="gate-1"
        isOpen={false}
        toolName=""
        description=""
        parameters={PLAN_PARAMETERS}
        onApprove={onApprove}
        onReject={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    // …y llega una acción distinta con key distinto: REMOUNT (patrón AgentScreen).
    rerender(
      <ActionConfirmModal
        key="gate-2"
        isOpen
        toolName="registrar_ingesta_compleja"
        description="Segunda acción"
        parameters={secondParameters}
        onApprove={onApprove}
        onReject={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    expect(onApprove).toHaveBeenCalledWith(secondParameters);
  });

  it('una acción nueva tras editar otra no hereda el modo edición', async () => {
    const onApprove = vi.fn();
    const { rerender } = render(
      <ActionConfirmModal
        key="gate-1"
        isOpen
        toolName="crear_log"
        description="Primera"
        parameters={{ quantity: 10 }}
        onApprove={onApprove}
        onReject={vi.fn()}
        onEdit={onApprove}
      />,
    );
    // El operador entró a editar la primera acción…
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('button', { name: /Guardar y ejecutar/i })).toBeInTheDocument();
    // …pero la descartó y llegó otra acción nueva (remount).
    rerender(
      <ActionConfirmModal
        key="gate-2"
        isOpen
        toolName="crear_log"
        description="Segunda"
        parameters={{ quantity: 5 }}
        onApprove={onApprove}
        onReject={vi.fn()}
        onEdit={onApprove}
      />,
    );
    // La acción nueva abre en modo lectura (Aprobar/Rechazar/Editar), sin
    // arrastrar la edición de la descartada.
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar y ejecutar/i })).not.toBeInTheDocument();
  });
});
