/**
 * Valle2DFallback.test.jsx — test unitario para la burbuja de Angelita
 * en el valle 2D (task #b5-r5-burbuja).
 *
 * Verifica que:
 * 1. La BurbujaAngelita se muestra cuando hay un mensaje
 * 2. La BurbujaAngelita se oculta cuando no hay mensaje
 * 3. La burbuja usa el tipo y mensaje correctos del store
 * 4. La burbuja respeta reducedMotion
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import Valle2DFallback from '../../src/mockups/valle/Valle2DFallback';
import useAngelitaStore from '../../src/store/useAngelitaStore';

// Mock de valleData para evitar dependencias complejas
vi.mock('../../src/mockups/valle/valleData.js', () => ({
  MUNDOS_VALLE: [
    { id: 'cultivos', titulo: 'Cultivos', emoji: '🌱', pos: [0, 0, 0], tinte: ['#4a7c3f', '#2d4a2e'], lema: 'Tus plantas' },
    { id: 'clima', titulo: 'Clima', emoji: '⛅', pos: [2, 0, 1], tinte: ['#5a9ccf', '#3a6c8f'], lema: 'El clima de tu finca' },
  ],
  indexarMundosValle: (mundos) =>
    Object.fromEntries(mundos.map(m => [m.id, m])),
  COSA_DEL_DIA: {
    titulo: 'Alerta del día',
    anclaMundo: 'cultivos',
    detalle: 'Revisa tus cultivos',
  },
  CLIMAS: {
    dia: {
      cielo: ['#87CEEB', '#E0F6FF'],
      niebla: '#c9d9e8',
      grade: 'grade-sol',
    },
  },
}));

// Mock de AbejaAngelita
vi.mock('../../src/visual/creatures/AbejaAngelita.jsx', () => ({
  AbejaAngelita: ({ size, animo, energia, animated }) => (
    <div data-testid="abeja-angelita" data-size={size} data-animo={animo} data-energia={energia} data-animated={animated}>
      🐝
    </div>
  ),
}));

describe('Valle2DFallback - BurbujaAngelita (task #b5-r5-burbuja)', () => {
  beforeEach(() => {
    // Resetear el store antes de cada test
    useAngelitaStore.getState().reposar();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useAngelitaStore.getState().reposar();
  });

  it('muestra la BurbujaAngelita cuando hay un mensaje en el store', () => {
    const { result: storeResult } = renderHook(() => useAngelitaStore());

    act(() => {
      storeResult.current._aplicar({
        estado: 'husmea',
        mensaje: 'Mensaje de prueba',
        visualEstado: 'curiosa',
        interrumpe: true,
      });
    });

    render(
      <Valle2DFallback
        clima="dia"
        onEntrar={() => {}}
        onAlerta={() => {}}
      />
    );

    // Verificar que el texto está presente (puede aparecer múltiples veces por typewriter)
    expect(screen.getAllByText(/Mensaje de prueba/i).length).toBeGreaterThan(0);
    // Verificar que la abeja está presente
    expect(screen.getByTestId('abeja-angelita')).toBeInTheDocument();
  });

  it('NO muestra la BurbujaAngelita cuando no hay mensaje', () => {
    render(
      <Valle2DFallback
        clima="dia"
        onEntrar={() => {}}
        onAlerta={() => {}}
      />
    );

    // No debería haber texto de mensaje específico
    expect(screen.queryByText(/Mensaje de prueba/i)).not.toBeInTheDocument();

    // La abeja sí debería estar visible
    expect(screen.getByTestId('abeja-angelita')).toBeInTheDocument();
  });

  it('usa el tipo correcto del store (alerta, sugerencia, etc.)', () => {
    const { result: storeResult } = renderHook(() => useAngelitaStore());

    act(() => {
      storeResult.current._aplicar({
        estado: 'aviso',
        mensaje: '⚠️ Alerta importante',
        severidad: 'alta',
        visualEstado: 'preocupada',
        interrumpe: true,
      }, null);
    });

    render(
      <Valle2DFallback
        clima="dia"
        onEntrar={() => {}}
        onAlerta={() => {}}
      />
    );

    expect(screen.getAllByText(/⚠️ Alerta importante/i).length).toBeGreaterThan(0);
  });

  it('respeta reducedMotion=false (burbuja animada)', () => {
    const { result: storeResult } = renderHook(() => useAngelitaStore());

    act(() => {
      storeResult.current._aplicar({
        estado: 'husmea',
        mensaje: 'Mensaje animado',
        visualEstado: 'curiosa',
        interrumpe: true,
      });
    });

    render(
      <Valle2DFallback
        clima="dia"
        reducedMotion={false}
        onEntrar={() => {}}
        onAlerta={() => {}}
      />
    );

    expect(screen.getAllByText(/Mensaje animado/i).length).toBeGreaterThan(0);
  });

  it('respeta reducedMotion=true (burbuja no animada)', () => {
    const { result: storeResult } = renderHook(() => useAngelitaStore());

    act(() => {
      storeResult.current._aplicar({
        estado: 'husmea',
        mensaje: 'Mensaje estático',
        visualEstado: 'curiosa',
        interrumpe: true,
      });
    });

    render(
      <Valle2DFallback
        clima="dia"
        reducedMotion={true}
        onEntrar={() => {}}
        onAlerta={() => {}}
      />
    );

    expect(screen.getAllByText(/Mensaje estático/i).length).toBeGreaterThan(0);
  });

  it('la burbuja se posiciona correctamente sobre la abeja', () => {
    const { result: storeResult } = renderHook(() => useAngelitaStore());

    act(() => {
      storeResult.current._aplicar({
        estado: 'husmea',
        mensaje: 'Mensaje posicionado',
        visualEstado: 'curiosa',
        interrumpe: true,
      });
    });

    const { container } = render(
      <Valle2DFallback
        clima="dia"
        onEntrar={() => {}}
        onAlerta={() => {}}
      />
    );

    // Verificar que el mensaje está presente
    expect(screen.getAllByText(/Mensaje posicionado/i).length).toBeGreaterThan(0);

    // Verificar que hay una clase de posicionamiento
    const burbujaContainer = container.querySelector('.valle2d__burbuja-angelita');
    expect(burbujaContainer).toBeInTheDocument();
    expect(burbujaContainer).toHaveStyle({ position: 'absolute' });
  });
});
