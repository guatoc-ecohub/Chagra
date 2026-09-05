/**
 * CicloVivoFullView.test.jsx — la vista full-screen de la rueda.
 * =====================================================================
 * Verifica el CORAZÓN del pedido: cada chip de función se pinta según su estado
 * REAL en `/chagra-stats.json` (mockeado), y cuando ese estado cambia a
 * 'activo' el chip se enciende y navega — sin tocar el componente.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const saveProfile = vi.fn();
let profileData = {};
vi.mock('../../services/userProfileService', () => ({
  getProfile: () => profileData,
  saveProfile: (partial) => saveProfile(partial),
}));
vi.mock('../../services/altitudeService', () => ({
  getDeviceAltitude: vi.fn().mockResolvedValue(null),
}));
const { getPrecioSipsa } = vi.hoisted(() => ({
  getPrecioSipsa: vi.fn(),
}));
vi.mock('../../services/sidecarClient', () => ({
  getPrecioSipsa,
}));

import CicloVivoFullView from './CicloVivoFullView';
import { PHASES } from './cicloVivoData';
import { __TEST__ as sipsaPriceTest } from '../../hooks/useSipsaLatestPrice';

function buildCaps(overrides = {}) {
  const caps = {};
  for (const fase of PHASES) {
    for (const fn of fase.functions) {
      caps[fn.cap] = { estado: 'activo', view: fn.cap === 'nutricion' ? 'ciclo_nutrientes' : fn.cap, nota: '' };
    }
  }
  caps.cromatografia_suelo = { estado: 'activo', view: 'cromatografia', nota: '' };
  caps.mip_plagas = { estado: 'parcial', view: 'directorio', nota: '' };
  for (const [id, spec] of Object.entries(overrides)) caps[id] = spec;
  return caps;
}

function stubStatsFetch(caps) {
  vi.stubGlobal('fetch', vi.fn((url) => {
    if (String(url).includes('/chagra-stats.json')) {
      return Promise.resolve({ ok: true, json: async () => ({ capacidades: caps }) });
    }
    return Promise.reject(new Error('unexpected fetch: ' + url));
  }));
}

function openNode(container, idx) {
  const node = container.querySelector(`.cv-wnode[data-idx="${idx}"]`);
  expect(node, `nodo de fase ${idx}`).toBeTruthy();
  fireEvent.click(node);
}

describe('CicloVivoFullView', () => {
  beforeEach(() => {
    profileData = {};
    saveProfile.mockClear();
    getPrecioSipsa.mockReset();
    getPrecioSipsa.mockResolvedValue(null);
    try { globalThis.localStorage.clear(); } catch { /* ignore */ }
  });
  afterEach(() => {
    sipsaPriceTest.clearCache();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('dibuja la rueda con los 7 nodos de fase', async () => {
    stubStatsFetch(buildCaps());
    const { container } = render(<CicloVivoFullView onBack={() => {}} onNavigate={() => {}} />);
    await waitFor(() => {
      expect(container.querySelectorAll('.cv-wnode')).toHaveLength(7);
    });
  });

  it('un chip ACTIVO navega a su vista', async () => {
    stubStatsFetch(buildCaps());
    const onNavigate = vi.fn();
    const { container } = render(<CicloVivoFullView onBack={() => {}} onNavigate={onNavigate} />);
    await waitFor(() => expect(container.querySelector('.cv-wnode')).toBeTruthy());
    // Crecimiento (idx 2) trae Nutrición (activo → ciclo_nutrientes).
    openNode(container, 2);
    const chip = await screen.findByRole('button', { name: /Nutrición$/ });
    fireEvent.click(chip);
    expect(onNavigate).toHaveBeenCalledWith('ciclo_nutrientes');
  });

  it('un chip PARCIAL muestra el badge "parcial" y aún navega', async () => {
    stubStatsFetch(buildCaps());
    const onNavigate = vi.fn();
    const { container } = render(<CicloVivoFullView onBack={() => {}} onNavigate={onNavigate} />);
    await waitFor(() => expect(container.querySelector('.cv-wnode')).toBeTruthy());
    openNode(container, 2); // Crecimiento tiene "Plagas de esta etapa (MIP)" = parcial
    const chip = await screen.findByRole('button', { name: /Plagas de esta etapa/ });
    await waitFor(() => expect(chip.className).toMatch(/is-parcial/));
    expect(chip.textContent).toMatch(/parcial/);
    fireEvent.click(chip);
    expect(onNavigate).toHaveBeenCalledWith('directorio');
  });

  it('un chip PRÓXIMAMENTE sale en fantasma con "pronto" y NO navega', async () => {
    stubStatsFetch(buildCaps({ cromatografia_suelo: { estado: 'proximamente', view: null, nota: '' } }));
    const onNavigate = vi.fn();
    const { container } = render(<CicloVivoFullView onBack={() => {}} onNavigate={onNavigate} />);
    await waitFor(() => expect(container.querySelector('.cv-wnode')).toBeTruthy());
    openNode(container, 1); // Germinación tiene "Suelo (cromatografía)"
    const chip = await screen.findByRole('button', { name: /Suelo \(cromatografía\)/ });
    await waitFor(() => expect(chip.className).toMatch(/is-proximamente/));
    expect(chip.textContent).toMatch(/pronto/);
    fireEvent.click(chip);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('AUTO-LIGHT: el mismo chip se enciende y navega cuando la fuente de verdad lo pasa a activo', async () => {
    // Estado 1: cromatografía en camino.
    stubStatsFetch(buildCaps({ cromatografia_suelo: { estado: 'proximamente', view: null, nota: '' } }));
    let onNavigate = vi.fn();
    let view = render(<CicloVivoFullView onBack={() => {}} onNavigate={onNavigate} />);
    await waitFor(() => expect(view.container.querySelector('.cv-wnode')).toBeTruthy());
    openNode(view.container, 1);
    const ghost = await screen.findByRole('button', { name: /Suelo \(cromatografía\)/ });
    await waitFor(() => expect(ghost.className).toMatch(/is-proximamente/));
    fireEvent.click(ghost);
    expect(onNavigate).not.toHaveBeenCalled();

    cleanup();

    // Estado 2: se activó el artefacto en la fuente de verdad. Mismo widget.
    stubStatsFetch(buildCaps({ cromatografia_suelo: { estado: 'activo', view: 'cromatografia', nota: '' } }));
    onNavigate = vi.fn();
    view = render(<CicloVivoFullView onBack={() => {}} onNavigate={onNavigate} />);
    await waitFor(() => expect(view.container.querySelector('.cv-wnode')).toBeTruthy());
    openNode(view.container, 1);
    const encendido = await screen.findByRole('button', { name: /Suelo \(cromatografía\)/ });
    await waitFor(() => expect(encendido.className).toMatch(/is-activo/));
    fireEvent.click(encendido);
    expect(onNavigate).toHaveBeenCalledWith('cromatografia');
  });

  it('cambiar la especie guarda el override en el perfil', async () => {
    stubStatsFetch(buildCaps());
    const { container } = render(<CicloVivoFullView onBack={() => {}} onNavigate={() => {}} />);
    await waitFor(() => expect(container.querySelector('.cv-wnode')).toBeTruthy());
    const select = screen.getByLabelText('Especie del cultivo');
    fireEvent.change(select, { target: { value: 'papa' } });
    expect(saveProfile).toHaveBeenCalledWith({ ciclo_vivo_especie: 'papa' });
  });

  it('muestra el precio SIPSA vivo en el motor y en la fase de cosecha', async () => {
    stubStatsFetch(buildCaps());
    getPrecioSipsa.mockResolvedValueOnce({
      available: true,
      price: {
        producto: 'Maiz',
        plaza: 'Corabastos',
        fecha: '2026-07-01',
        precio_promedio_cop_kg: 1450,
      },
      central_abastos: 'Corabastos, Bogotá',
      frescura: {
        fecha_dato: '2026-07-01',
        desactualizado: false,
      },
    });

    const { container } = render(<CicloVivoFullView onBack={() => {}} onNavigate={() => {}} />);
    await waitFor(() => expect(container.querySelector('.cv-wnode')).toBeTruthy());
    expect(await screen.findByText('$1.450 COP/kg')).toBeInTheDocument();

    openNode(container, 5);
    const priceChips = screen.getAllByRole('button', { name: /Precio SIPSA/i });
    expect(priceChips.length).toBeGreaterThanOrEqual(2);
    expect(priceChips.some((chip) => chip.getAttribute('title')?.includes('Corabastos, Bogotá'))).toBe(true);
  });
});
