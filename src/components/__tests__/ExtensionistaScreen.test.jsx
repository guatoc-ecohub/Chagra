/**
 * ExtensionistaScreen.test.jsx — panel SUPERVISOR del modo extensionista
 * (ADR-048 MVP). Lista las fincas delegadas con su estado.
 *
 * Contrato cubierto:
 *   - Sin rol extensionista (o flag off) → mensaje de acceso no disponible,
 *     NO se listan fincas (gate de UX defensivo).
 *   - Con rol + fincas → renderiza el resumen (contadores) y una tarjeta por
 *     finca con nombre, operador y estado legible.
 *   - Con rol pero sin fincas delegadas → estado vacío explícito (no inventa).
 *   - El aviso de "datos de ejemplo / no autorización real" (frontera MVP) es
 *     visible — para no confundir a un piloto con un permiso verificado.
 *   - Botón volver invoca onBack.
 *
 * Español colombiano (tú/usted), SIN voseo. Offline-first.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const { esExtensionistaActual } = vi.hoisted(() => ({
  esExtensionistaActual: vi.fn(),
}));
const { esOperadorActual } = vi.hoisted(() => ({ esOperadorActual: vi.fn() }));
const { construirTableroExtensionista } = vi.hoisted(() => ({
  construirTableroExtensionista: vi.fn(),
}));
const { getActiveTenantId } = vi.hoisted(() => ({ getActiveTenantId: vi.fn() }));
const { useFincaActiveStoreMock } = vi.hoisted(() => ({
  useFincaActiveStoreMock: Object.assign(
    vi.fn((selector) =>
      selector({
        activeFincaSlug: 'finca-el-paramo',
        setActiveFinca: vi.fn(),
      })
    ),
    {
      getState: vi.fn(() => ({
        activeFincaSlug: 'finca-el-paramo',
        setActiveFinca: vi.fn(),
      })),
    }
  ),
}));

vi.mock('../../config/extensionistaAccess', () => ({ esExtensionistaActual }));
vi.mock('../../config/glaciarAccess', () => ({ esOperadorActual }));
vi.mock('../../services/extensionistaService', () => ({
  construirTableroExtensionista,
}));
vi.mock('../../services/tenantContext', () => ({ getActiveTenantId }));
vi.mock('../../services/fincaActiveStore', () => ({ default: useFincaActiveStoreMock }));
vi.mock('../../components/common/ScreenShell', () => ({
  ScreenShell: ({ children, onBack }) => (
    <div>
      <button type="button" aria-label="Volver" onClick={onBack}>
        Volver
      </button>
      {children}
    </div>
  ),
}));

import ExtensionistaScreen from '../ExtensionistaScreen';

const TABLERO = {
  fincas: [
    {
      slug: 'finca-el-paramo',
      nombre: 'Finca El Páramo',
      operador: 'pedro_g',
      municipio: 'Choachí',
      estado: 'sin_sync_reciente',
      pendientes: 0,
      alertas: 2,
      _clasificacion: { label: 'Sin sincronizar hace días', severidad: 3, tono: 'alerta' },
    },
    {
      slug: 'finca-la-esperanza',
      nombre: 'Finca La Esperanza',
      operador: 'campesino_juan',
      municipio: 'Silvania',
      estado: 'al_dia',
      pendientes: 0,
      alertas: 0,
      _clasificacion: { label: 'Al día', severidad: 0, tono: 'ok' },
    },
  ],
  resumen: { total: 2, con_alertas: 1, con_pendientes: 0 },
};

beforeEach(() => {
  esExtensionistaActual.mockReset();
  esOperadorActual.mockReset();
  esOperadorActual.mockReturnValue(false);
  construirTableroExtensionista.mockReset();
  getActiveTenantId.mockReset();
  getActiveTenantId.mockReturnValue('demo-extensionista');
});
afterEach(() => cleanup());

describe('ExtensionistaScreen — gate de rol', () => {
  it('sin rol extensionista muestra acceso no disponible y NO lista fincas', () => {
    esExtensionistaActual.mockReturnValue(false);
    construirTableroExtensionista.mockReturnValue(TABLERO);
    render(<ExtensionistaScreen onBack={() => {}} />);
    expect(screen.getByText('Vista no disponible')).toBeInTheDocument();
    expect(screen.queryByText('Finca El Páramo')).not.toBeInTheDocument();
    // No debe ni construir el tablero si no hay rol.
    expect(construirTableroExtensionista).not.toHaveBeenCalled();
  });
});

describe('ExtensionistaScreen — con rol extensionista', () => {
  beforeEach(() => {
    esExtensionistaActual.mockReturnValue(true);
  });

  it('renderiza el resumen con los contadores agregados', () => {
    construirTableroExtensionista.mockReturnValue(TABLERO);
    render(<ExtensionistaScreen onBack={() => {}} />);
    // El resumen expone las etiquetas de los chips agregados.
    expect(screen.getByText('fincas que acompañas')).toBeInTheDocument();
    expect(screen.getByText('con alertas')).toBeInTheDocument();
    expect(screen.getByText('con pendientes')).toBeInTheDocument();
  });

  it('renderiza una tarjeta por finca con nombre, operador y estado', () => {
    construirTableroExtensionista.mockReturnValue(TABLERO);
    render(<ExtensionistaScreen onBack={() => {}} />);
    expect(screen.getByText('Finca El Páramo')).toBeInTheDocument();
    expect(screen.getByText('Finca La Esperanza')).toBeInTheDocument();
    expect(screen.getByText(/pedro_g/)).toBeInTheDocument();
    expect(screen.getByText(/Sin sincronizar hace días/)).toBeInTheDocument();
    expect(screen.getByText(/Al día/)).toBeInTheDocument();
  });

  it('muestra selector de finca activa y permite cambiar la delegada activa', () => {
    const setActiveFinca = vi.fn();
    useFincaActiveStoreMock.mockImplementation((selector) =>
      selector({ activeFincaSlug: 'finca-la-esperanza', setActiveFinca })
    );
    useFincaActiveStoreMock.getState.mockReturnValue({
      activeFincaSlug: 'finca-la-esperanza',
      setActiveFinca,
    });
    construirTableroExtensionista.mockReturnValue(TABLERO);
    render(<ExtensionistaScreen onBack={() => {}} />);

    const selector = screen.getByTestId('finca-selector');
    expect(selector).toBeInTheDocument();
    expect(/** @type {HTMLSelectElement} */ (selector).value).toBe('finca-la-esperanza');

    fireEvent.change(selector, { target: { value: 'finca-el-paramo' } });
    expect(setActiveFinca).toHaveBeenCalledWith('finca-el-paramo');
  });

  it('muestra el aviso de frontera MVP (datos de ejemplo, no autorización real)', () => {
    construirTableroExtensionista.mockReturnValue(TABLERO);
    render(<ExtensionistaScreen onBack={() => {}} />);
    expect(
      screen.getByText(/Todavía no es una\s+autorización verificada/i)
    ).toBeInTheDocument();
  });

  it('sin fincas delegadas muestra estado vacío explícito (no inventa)', () => {
    construirTableroExtensionista.mockReturnValue({
      fincas: [],
      resumen: { total: 0, con_alertas: 0, con_pendientes: 0 },
    });
    render(<ExtensionistaScreen onBack={() => {}} />);
    expect(
      screen.getByText('Todavía no tienes fincas asignadas')
    ).toBeInTheDocument();
  });

  it('el botón volver invoca onBack', () => {
    construirTableroExtensionista.mockReturnValue(TABLERO);
    const onBack = vi.fn();
    render(<ExtensionistaScreen onBack={onBack} />);
    // ScreenShell expone "Volver" (atrás) y "Volver al inicio" (home);
    // el botón atrás tiene el aria-label exacto "Volver".
    fireEvent.click(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ExtensionistaScreen — operador (demo visión total)', () => {
  beforeEach(() => {
    esExtensionistaActual.mockReturnValue(true);
  });

  it('si el tenant del operador no tiene fincas, cae al mock demo (no vacío)', () => {
    esOperadorActual.mockReturnValue(true);
    getActiveTenantId.mockReturnValue('admin');
    // Primera llamada (tenant admin) → vacío; fallback (demo-extensionista) → tablero.
    construirTableroExtensionista
      .mockReturnValueOnce({ fincas: [], resumen: { total: 0, con_alertas: 0, con_pendientes: 0 } })
      .mockReturnValueOnce(TABLERO);
    render(<ExtensionistaScreen onBack={() => {}} />);
    // Muestra las fincas de ejemplo en vez del estado vacío → NO queda en blanco.
    expect(screen.getByText('Finca El Páramo')).toBeInTheDocument();
    expect(
      screen.queryByText('Todavía no tienes fincas asignadas')
    ).not.toBeInTheDocument();
    expect(construirTableroExtensionista).toHaveBeenLastCalledWith('demo-extensionista');
  });

  it('un no-operador con tenant sin fincas SÍ ve el estado vacío (sin inventar)', () => {
    esOperadorActual.mockReturnValue(false);
    getActiveTenantId.mockReturnValue('demo-extensionista');
    construirTableroExtensionista.mockReturnValue({
      fincas: [],
      resumen: { total: 0, con_alertas: 0, con_pendientes: 0 },
    });
    render(<ExtensionistaScreen onBack={() => {}} />);
    expect(
      screen.getByText('Todavía no tienes fincas asignadas')
    ).toBeInTheDocument();
    // No debe pedir el fallback demo si no es operador.
    expect(construirTableroExtensionista).toHaveBeenCalledTimes(1);
  });
});
