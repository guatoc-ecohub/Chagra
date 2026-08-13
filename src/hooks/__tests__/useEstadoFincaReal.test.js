import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useAssetStore from '../../store/useAssetStore.js';
import useCosechaStore from '../../store/useCosechaStore.js';
import { setEnsoPhase, clearEnsoPhase } from '../../services/ensoService.js';
import { useEstadoFincaReal } from '../useEstadoFincaReal.js';

// Mock simple de useAssetStore para test del hook de estado finca
const mockAssets = [
  { id: '1', type: 'asset--plant', attributes: { name: 'Café', status: 'growing' } },
  { id: '2', type: 'asset--plant', attributes: { name: 'Plátano', status: 'growing' } },
  { id: '3', type: 'asset--plant', attributes: { name: 'Tomate', status: 'dead' } },
  { id: '4', type: 'asset--animal', attributes: { name: 'Lucero', status: 'activo' } },
];

describe('useEstadoFincaReal — estructura', () => {
  it('filtra plantas vivas vs muertas', () => {
    const vivas = mockAssets.filter(a =>
      a.type === 'asset--plant' && a.attributes?.status !== 'dead'
    );
    expect(vivas.length).toBe(2);
  });

  it('filtra animales', () => {
    const animales = mockAssets.filter(a =>
      a.type === 'asset--animal'
    ).map(a => ({
      especie: a.attributes?.name || '',
      nombre: a.attributes?.name || '',
      raza: '',
      estado: a.attributes?.status || '',
    }));
    expect(animales.length).toBe(1);
    expect(animales[0].nombre).toBe('Lucero');
  });

  it('construye saludFinca con conteo real', () => {
    const plantas = mockAssets.filter(a => a.type === 'asset--plant');
    const vivas = plantas.filter(p => p.attributes?.status !== 'dead').length;
    expect(vivas).toBe(2);
    const salud = { matasVivas: vivas, matasTotal: plantas.length, agua: true };
    expect(salud.matasVivas).toBe(2);
    expect(salud.matasTotal).toBe(3);
  });
});

// Ítem #78 del GAP compAI (2026-08-13): `enso` y `cosechaReciente` salían
// SIEMPRE 'neutro'/null, sin mirar ningún dato real. Estos tests montan el
// hook DE VERDAD (antes ninguno lo hacía) contra las mismas fuentes reales
// que usa useFincaViva.js: ensoService (localStorage) y useCosechaStore.
describe('useEstadoFincaReal — enso y cosechaReciente reales (ítem #78)', () => {
  beforeEach(() => {
    useAssetStore.setState({ plants: [], equipment: [] });
    useCosechaStore.setState({ summary: null, isLoading: false, error: null });
    clearEnsoPhase();
    // El hook (mismo patrón que useFincaViva.js) calienta el store con la
    // llamada REAL a loadHarvests() cuando summary===null — eso pega a
    // IndexedDB real y es fire-and-forget (el efecto no la espera). Sin este
    // spy, la promesa puede resolver DESPUÉS de terminado un test y pisar el
    // `summary` que el siguiente test acaba de fijar a mano (leak entre
    // tests). Los tests de este bloque controlan `summary` explícitamente
    // vía `useCosechaStore.setState`, así que el warm-up real no hace falta.
    vi.spyOn(useCosechaStore.getState(), 'loadHarvests').mockResolvedValue(null);
  });

  afterEach(() => {
    clearEnsoPhase();
    useCosechaStore.setState({ summary: null, isLoading: false, error: null });
    vi.restoreAllMocks();
  });

  it('sin override ni caché vivo: enso sale "neutro" (no null, no fabricado)', async () => {
    const { result } = renderHook(() => useEstadoFincaReal());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.estadoFinca.enso).toBe('neutro');
  });

  it('con override manual el_nino: enso refleja el dato real (ya no hardcoded)', async () => {
    setEnsoPhase('el_nino');
    const { result } = renderHook(() => useEstadoFincaReal());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.estadoFinca.enso).toBe('nino');
  });

  it('con override manual la_nina: enso refleja el dato real', async () => {
    setEnsoPhase('la_nina');
    const { result } = renderHook(() => useEstadoFincaReal());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.estadoFinca.enso).toBe('nina');
  });

  it('sin cosechas registradas: cosechaReciente sale null (no fabrica un banquete)', async () => {
    const { result } = renderHook(() => useEstadoFincaReal());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.estadoFinca.cosechaReciente).toBeNull();
  });

  it('con una cosecha DENTRO de la ventana de 14 días: cosechaReciente trae el cultivo real', async () => {
    const ahora = Date.now();
    useCosechaStore.setState({
      summary: {
        byCrop: [{ crop: 'café', lastMs: ahora - 2 * 24 * 60 * 60 * 1000 }],
        dateRange: { lastMs: ahora - 2 * 24 * 60 * 60 * 1000 },
      },
      isLoading: false,
    });
    const { result } = renderHook(() => useEstadoFincaReal());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.estadoFinca.cosechaReciente).toEqual({ cultivo: 'café', mundoId: null });
  });

  it('con una cosecha VIEJA (fuera de la ventana): cosechaReciente sale null', async () => {
    const ahora = Date.now();
    useCosechaStore.setState({
      summary: {
        byCrop: [{ crop: 'café', lastMs: ahora - 60 * 24 * 60 * 60 * 1000 }],
        dateRange: { lastMs: ahora - 60 * 24 * 60 * 60 * 1000 },
      },
      isLoading: false,
    });
    const { result } = renderHook(() => useEstadoFincaReal());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.estadoFinca.cosechaReciente).toBeNull();
  });
});
