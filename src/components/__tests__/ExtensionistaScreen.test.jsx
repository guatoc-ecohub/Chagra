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
const { construirTableroExtensionista } = vi.hoisted(() => ({
  construirTableroExtensionista: vi.fn(),
}));
const { getActiveTenantId } = vi.hoisted(() => ({ getActiveTenantId: vi.fn() }));

vi.mock('../../config/extensionistaAccess', () => ({ esExtensionistaActual }));
vi.mock('../../services/extensionistaService', () => ({
  construirTableroExtensionista,
}));
vi.mock('../../services/tenantContext', () => ({ getActiveTenantId }));

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
  construirTableroExtensionista.mockReset();
  getActiveTenantId.mockReset();
  getActiveTenantId.mockReturnValue('kortux');
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
