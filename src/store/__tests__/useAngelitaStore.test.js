/**
 * useAngelitaStore — la API en vivo del comportamiento de Angelita.
 *
 * Smoke tests del store: que el motor puro quede bien conectado al estado vivo,
 * que la anti-molestia (cooldown por mundo) funcione entre llamadas sucesivas,
 * que el dedup de logro persista, y que el silencio la deje en calma.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useAngelitaStore from '../useAngelitaStore';

// El store persiste en localStorage; lo reseteamos entre pruebas.
const reset = () => {
  useAngelitaStore.setState({
    estado: 'calma',
    visualEstado: 'acompana',
    mensaje: null,
    aria: null,
    severidad: null,
    prioridad: 0,
    prompt: null,
    mundoActual: null,
    ultimaHablaPorLlave: {},
    ultimoLogroId: null,
    silenciado: false,
  });
};

describe('useAngelitaStore', () => {
  beforeEach(reset);

  it('arranca en calma', () => {
    const s = useAngelitaStore.getState();
    expect(s.estado).toBe('calma');
    expect(s.visualEstado).toBe('acompana');
    expect(s.mensaje).toBeNull();
  });

  it('entrarMundo husmea con comentario grounded', () => {
    useAngelitaStore.getState().entrarMundo('mis_animales', { total: 6 });
    const s = useAngelitaStore.getState();
    expect(s.estado).toBe('husmea');
    expect(s.visualEstado).toBe('senala');
    expect(s.mensaje).toMatch(/6 animales/i);
  });

  it('anti-molestia: no re-comenta el MISMO mundo enseguida', () => {
    const api = useAngelitaStore.getState();
    api.entrarMundo('mis_matas', { cultivos: [{ name: 'Café', count: 4 }] });
    expect(useAngelitaStore.getState().estado).toBe('husmea');
    // segunda entrada inmediata al mismo mundo → cooldown → calma
    useAngelitaStore.getState().entrarMundo('mis_matas', { cultivos: [{ name: 'Café', count: 4 }] });
    expect(useAngelitaStore.getState().estado).toBe('calma');
  });

  it('celebrar un logro real, con dedup por id', () => {
    useAngelitaStore.getState().celebrar({ id: 'racha-3', texto: '¡Tres días seguidos anotando!' });
    expect(useAngelitaStore.getState().estado).toBe('celebra');
    useAngelitaStore.getState().reposar();
    // mismo logro → ya no se celebra
    useAngelitaStore.getState().celebrar({ id: 'racha-3', texto: '¡Tres días seguidos anotando!' });
    expect(useAngelitaStore.getState().estado).toBe('calma');
  });

  it('silenciar la deja en calma y no habla', () => {
    useAngelitaStore.getState().silenciar(true);
    useAngelitaStore.getState().entrarMundo('clima', { snapshot: { alertas_locales: [{}] } });
    expect(useAngelitaStore.getState().estado).toBe('calma');
    expect(useAngelitaStore.getState().mensaje).toBeNull();
  });

  it('reposar vuelve a calma sin borrar la memoria anti-molestia', () => {
    const api = useAngelitaStore.getState();
    api.entrarMundo('mis_matas', { cultivos: [{ name: 'Papa', count: 2 }] });
    const memoriaAntes = useAngelitaStore.getState().ultimaHablaPorLlave;
    expect(Object.keys(memoriaAntes)).toContain('husmea:mis_matas');
    useAngelitaStore.getState().reposar();
    expect(useAngelitaStore.getState().estado).toBe('calma');
    // la memoria del cooldown NO se borra al reposar
    expect(useAngelitaStore.getState().ultimaHablaPorLlave).toEqual(memoriaAntes);
  });
});
