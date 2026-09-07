/**
 * useAngelitaStore — la API en vivo del comportamiento de Angelita.
 *
 * Smoke tests del store: que el motor puro quede bien conectado al estado vivo,
 * que la anti-molestia (cooldown por mundo) funcione entre llamadas sucesivas,
 * que el dedup de logro persista, y que el silencio la deje en calma.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useAngelitaStore from '../useAngelitaStore';

// El store persiste en localStorage; lo reseteamos entre pruebas.
const reset = () => {
  localStorage.clear();
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
    ultimoLutoId: null,
    silenciado: false,
    molestia: 0,
    hoyNoFecha: null,
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
    useAngelitaStore.getState().entrarMundo('mis_animales', { total: 6 }, { rand: () => 1 });
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

  it('lamentar una pérdida real (#109), con dedup por id — independiente de celebrar', () => {
    useAngelitaStore.getState().lamentar({ id: 'luto-tomate-3', texto: 'Se nos fue el tomate. Pasa, y se aprende.' });
    expect(useAngelitaStore.getState().estado).toBe('luto');
    expect(useAngelitaStore.getState().visualEstado).toBe('preocupada');
    expect(useAngelitaStore.getState().tipo).toBe('luto');
    useAngelitaStore.getState().reposar();
    // mismo evento → ya no se lamenta de nuevo
    useAngelitaStore.getState().lamentar({ id: 'luto-tomate-3', texto: 'Se nos fue el tomate. Pasa, y se aprende.' });
    expect(useAngelitaStore.getState().estado).toBe('calma');
    // celebrar sigue funcionando después de un luto (memorias independientes)
    useAngelitaStore.getState().celebrar({ id: 'cosecha-1', texto: '¡Buena cosecha!' });
    expect(useAngelitaStore.getState().estado).toBe('celebra');
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

describe('cadencia adaptativa — contador de molestia (#102/#106)', () => {
  beforeEach(reset);

  it('registrarSenalMolestia sube y baja el contador, clamped', () => {
    const api = useAngelitaStore.getState();
    api.registrarSenalMolestia('silenciar');
    expect(useAngelitaStore.getState().molestia).toBe(3);
    api.registrarSenalMolestia('abrirTip');
    expect(useAngelitaStore.getState().molestia).toBe(1);
  });

  it('silenciar(true) registra una señal de molestia además de silenciar', () => {
    useAngelitaStore.getState().silenciar(true);
    const s = useAngelitaStore.getState();
    expect(s.silenciado).toBe(true);
    expect(s.molestia).toBeGreaterThan(0);
  });

  it('el contador de molestia persiste (partialize incluye molestia)', () => {
    useAngelitaStore.getState().registrarSenalMolestia('silenciar');
    const persistido = JSON.parse(localStorage.getItem('compai:cooldowns'));
    expect(persistido.state.molestia).toBe(3);
  });
});

describe('"hoy no" — descanso del resto del día (#107)', () => {
  beforeEach(reset);

  it('marcarHoyNo activa hoyNoActivo() y calla a Angelita', () => {
    const api = useAngelitaStore.getState();
    api.marcarHoyNo();
    expect(useAngelitaStore.getState().hoyNoActivo()).toBe(true);
    api.entrarMundo('clima', { snapshot: { alertas_locales: [{}] } });
    expect(useAngelitaStore.getState().estado).toBe('calma');
    expect(useAngelitaStore.getState().mensaje).toBeNull();
  });

  it('marcarHoyNo también registra una señal de molestia', () => {
    useAngelitaStore.getState().marcarHoyNo();
    expect(useAngelitaStore.getState().molestia).toBeGreaterThan(0);
  });

  it('hoyNoActivo() es false si la fecha guardada no es HOY (vence a medianoche)', () => {
    useAngelitaStore.setState({ hoyNoFecha: '2020-01-01' });
    expect(useAngelitaStore.getState().hoyNoActivo()).toBe(false);
  });

  it('quitarHoyNo desactiva el descanso antes de que venza solo', () => {
    const api = useAngelitaStore.getState();
    api.marcarHoyNo();
    expect(useAngelitaStore.getState().hoyNoActivo()).toBe(true);
    api.quitarHoyNo();
    expect(useAngelitaStore.getState().hoyNoActivo()).toBe(false);
  });

  it('el "hoy no" persiste (partialize incluye hoyNoFecha)', () => {
    useAngelitaStore.getState().marcarHoyNo();
    const persistido = JSON.parse(localStorage.getItem('compai:cooldowns'));
    expect(persistido.state.hoyNoFecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('cross-stack 2D-3D: el cooldown ahora SÍ cruza (#compai-estado-cruza-2d-3d)', () => {
  beforeEach(reset);

  it('SOLUCIÓN: los cooldowns ahora usan una llave genérica compartida', () => {
    // Después de la implementación, los cooldowns deberían usar 'compai:cooldowns'
    // que es genérica y puede ser compartida por todos los compañeros.

    // Simulamos que el usuario usa el compañero y entra a mis_matas
    const api = useAngelitaStore.getState();
    api.entrarMundo('mis_matas', { cultivos: [{ name: 'Café', count: 4 }] });

    // Verificamos que el compañero habló (cooldown activado)
    expect(useAngelitaStore.getState().estado).toBe('husmea');
    const cooldowns = useAngelitaStore.getState().ultimaHablaPorLlave;
    expect(cooldowns).toHaveProperty('husmea:mis_matas');

    // El cooldown ahora se guardó bajo 'compai:cooldowns' (genérico)
    const cooldownsGenericos = localStorage.getItem('compai:cooldowns');
    expect(cooldownsGenericos).not.toBeNull();

    const cooldownsParseados = JSON.parse(cooldownsGenericos);
    // Zustand persist guarda el estado en { state: {...}, version: N }
    expect(cooldownsParseados.state.ultimaHablaPorLlave).toHaveProperty('husmea:mis_matas');

    // Ahora los cooldowns crucen entre compañeros porque usan una llave genérica
    // que puede ser leída por cualquier compañero (abeja, jaguar, etc.)
  });
});
