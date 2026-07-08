/**
 * useRecorridoStore — sesión del "Recorrido de finca por voz".
 * GPS y lotes se inyectan (sin navegador ni IndexedDB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useRecorridoStore from '../useRecorridoStore';

const POTRERO = {
  id: 'potrero',
  type: 'asset--land',
  attributes: {
    name: 'Potrero de abajo',
    land_type: 'field',
    intrinsic_geometry: {
      value: 'POLYGON((-73.925 4.529, -73.925 4.531, -73.923 4.531, -73.923 4.529, -73.925 4.529))',
    },
  },
};

const gpsDentro = () => vi.fn().mockResolvedValue({ lat: 4.530, lng: -73.924, accuracy: 6 });

beforeEach(() => {
  useRecorridoStore.getState().reset();
});

describe('ciclo de vida', () => {
  it('iniciarRecorrido activa la sesión y limpia', () => {
    useRecorridoStore.getState().iniciarRecorrido();
    const s = useRecorridoStore.getState();
    expect(s.activo).toBe(true);
    expect(s.startedAt).toBeTypeOf('number');
    expect(s.observaciones).toEqual([]);
  });

  it('terminarRecorrido desactiva y devuelve el resumen', async () => {
    const s = useRecorridoStore.getState();
    s.iniciarRecorrido();
    await s.registrarObservacion('sembré 20 tomates', 'observacion', {
      lotes: [POTRERO], getPosition: gpsDentro(), now: 1,
    });
    const resumen = useRecorridoStore.getState().terminarRecorrido();
    expect(useRecorridoStore.getState().activo).toBe(false);
    expect(resumen.total).toBe(1);
    expect(resumen.lotes).toContain('Potrero de abajo');
    expect(resumen.texto).toContain('1 observación');
  });
});

describe('registrarObservacion', () => {
  it('NO registra fuera de un recorrido activo', async () => {
    const obs = await useRecorridoStore.getState().registrarObservacion('algo', 'observacion', {
      lotes: [POTRERO], getPosition: gpsDentro(),
    });
    expect(obs).toBeNull();
    expect(useRecorridoStore.getState().observaciones).toHaveLength(0);
  });

  it('registra con GPS + lote resuelto y apila', async () => {
    const s = useRecorridoStore.getState();
    s.iniciarRecorrido();
    const getPosition = gpsDentro();
    const obs = await s.registrarObservacion('este lote está seco', 'observacion', {
      lotes: [POTRERO], getPosition, now: 100,
    });
    expect(obs).not.toBeNull();
    expect(obs.loteId).toBe('potrero');
    expect(obs.pertenencia).toBe('dentro');
    const st = useRecorridoStore.getState();
    expect(st.observaciones).toHaveLength(1);
    expect(st.ultimaObservacion).toEqual(obs);
    expect(st.registrando).toBe(false);
  });

  it('ignora texto vacío', async () => {
    const s = useRecorridoStore.getState();
    s.iniciarRecorrido();
    expect(await s.registrarObservacion('   ', 'observacion', {})).toBeNull();
    expect(useRecorridoStore.getState().observaciones).toHaveLength(0);
  });

  it('adjunta la especie cuando viene de cámara', async () => {
    const s = useRecorridoStore.getState();
    s.iniciarRecorrido();
    const especie = { scientific_name: 'Musa paradisiaca', common_name: 'plátano' };
    const obs = await s.registrarObservacion('mira esta mata — plátano', 'planta_foto', {
      lotes: [POTRERO], getPosition: gpsDentro(), now: 3, especie,
    });
    expect(obs.tipo).toBe('planta_foto');
    expect(obs.especie).toEqual(especie);
  });
});

describe('resumen / readback', () => {
  it('leerResumen usa el speaker inyectado', async () => {
    const s = useRecorridoStore.getState();
    s.iniciarRecorrido();
    await s.registrarObservacion('sembré tomates', 'observacion', {
      lotes: [POTRERO], getPosition: gpsDentro(), now: 1,
    });
    const speak = vi.fn().mockResolvedValue(true);
    const texto = await useRecorridoStore.getState().leerResumen({ speak });
    expect(speak).toHaveBeenCalledWith(texto);
    expect(texto).toContain('1 observación');
  });

  it('agregarObservacionListo apila una observación ya construida', () => {
    const s = useRecorridoStore.getState();
    s.iniciarRecorrido();
    const obs = { id: 'x1', texto: 'nota', loteNombre: 'Potrero' };
    const out = s.agregarObservacionListo(obs);
    expect(out).toEqual(obs);
    expect(useRecorridoStore.getState().observaciones).toHaveLength(1);
    expect(s.agregarObservacionListo(null)).toBeNull();
  });
});
