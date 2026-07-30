/**
 * angelitaInteligencia — el MOTOR de comportamiento de Angelita.
 *
 * Contratos que cuidamos:
 *   - los 4 estados de comportamiento y su mapeo al vocabulario VISUAL real.
 *   - ruteo pantalla → mundo.
 *   - comentario por mundo GROUNDED (usa datos reales; si no hay, acompaña
 *     honesto — nunca inventa cifras).
 *   - notificaciones priorizadas + severidad.
 *   - anti-molestia (lección Clippy): cooldown, no interrumpir a mitad de tarea,
 *     silencio, y que la urgencia alta sí pueda interrumpir.
 *   - arbitraje del resolvedor (aviso urgente > celebra > husmea; veto → calma).
 *   - tono: usted, SIN voseo (ni "vos", ni "tenés/querés/podés"), nunca tuteo.
 */
import { describe, it, expect } from 'vitest';
import {
  ESTADOS_COMPORTAMIENTO,
  MUNDOS,
  estadoVisualDeComportamiento,
  ariaDeComportamiento,
  mundoDePantalla,
  comentarioDeMundo,
  notificacionesInteligentes,
  notificacionDeClima,
  debeHablar,
  resolverComportamiento,
  llaveDeDecision,
  COOLDOWN_MS,
  CADENCIA_MIN_MS,
  CADENCIA_BASE_MS,
  CADENCIA_MAX_MS,
  MOLESTIA_MIN,
  MOLESTIA_MAX,
  aplicarSenalMolestia,
  multiplicadorDeCadencia,
  cadenciaEfectivaMs,
} from '../angelitaInteligencia';
// Contrato con la CARA: los estados visuales canónicos que el dibujo entiende.
import { ESTADOS_ANGELITA } from '../../visual/agente/angelitaEstados';

const MINUTO = 60 * 1000;
const sinVoseo = (s) => expect(s).not.toMatch(/\bvos\b|tenés|querés|podés|\btú\b/i);

describe('estados de comportamiento', () => {
  it('expone los cinco estados canónicos (incluye luto, #109)', () => {
    expect(ESTADOS_COMPORTAMIENTO).toEqual(['calma', 'aviso', 'celebra', 'husmea', 'luto']);
  });

  it('mapea cada estado a vocabulario VISUAL conocido (contrato con la cara)', () => {
    for (const e of ESTADOS_COMPORTAMIENTO) {
      const v = estadoVisualDeComportamiento(e);
      expect(ESTADOS_ANGELITA).toContain(v);
    }
    // aviso urgente vs tranquilo → dos poses visuales distintas y válidas.
    const urgente = estadoVisualDeComportamiento('aviso', { severidad: 'alta' });
    const tranquilo = estadoVisualDeComportamiento('aviso', { severidad: 'media' });
    expect(urgente).toBe('preocupada');
    expect(tranquilo).toBe('invita');
    expect(ESTADOS_ANGELITA).toContain(urgente);
    expect(ESTADOS_ANGELITA).toContain(tranquilo);
  });

  it('calma es el default seguro ante estado desconocido', () => {
    expect(estadoVisualDeComportamiento('calma')).toBe('acompana');
    expect(estadoVisualDeComportamiento('inventado_xyz')).toBe('acompana');
  });

  it('celebra y husmea tienen su pose', () => {
    expect(estadoVisualDeComportamiento('celebra')).toBe('contenta');
    expect(estadoVisualDeComportamiento('husmea')).toBe('senala');
  });

  it('aria narra en usted, sin voseo', () => {
    for (const e of ESTADOS_COMPORTAMIENTO) sinVoseo(ariaDeComportamiento(e));
  });
});

describe('mundoDePantalla', () => {
  it('rutea pantallas conocidas a su mundo', () => {
    expect(mundoDePantalla('animales_gallinas')).toBe('mis_animales');
    expect(mundoDePantalla('clima_boletin')).toBe('clima');
    expect(mundoDePantalla('mercado')).toBe('vender');
    expect(mundoDePantalla('aprende')).toBe('aprender');
    expect(mundoDePantalla('bosque_vivo')).toBe('bosque');
    expect(mundoDePantalla('glaciar')).toBe('paramo');
    expect(mundoDePantalla('valle3d')).toBe('finca');
  });

  it('los cultivos con mundo propio caen en mis_matas', () => {
    expect(mundoDePantalla('cafe')).toBe('mis_matas');
    expect(mundoDePantalla('papa')).toBe('mis_matas');
    expect(mundoDePantalla('uchuva')).toBe('mis_matas');
  });

  it('prefijos paramétricos caen a su mundo', () => {
    expect(mundoDePantalla('animales_lo_que_sea')).toBe('mis_animales');
    expect(mundoDePantalla('seguimiento_reforestacion')).toBe('mis_matas');
    expect(mundoDePantalla('valle3d_lluvia')).toBe('clima'); // mapeo explícito gana
  });

  it('desconocida / vacía / no-string → null', () => {
    expect(mundoDePantalla('pantalla_inventada')).toBeNull();
    expect(mundoDePantalla('')).toBeNull();
    expect(mundoDePantalla(null)).toBeNull();
    expect(mundoDePantalla(42)).toBeNull();
  });

  it('todo destino de PANTALLA_A_MUNDO es un mundo válido', () => {
    const muestras = ['activos', 'animales', 'agua', 'mercados', 'curso', 'restauracion', 'diorama_paramo', 'dashboard'];
    for (const p of muestras) {
      const m = mundoDePantalla(p);
      expect(MUNDOS).toContain(m);
    }
  });
});

describe('comentarioDeMundo — grounded + honesto', () => {
  it('mis_matas: usa el inventario REAL cuando lo hay', () => {
    const s = comentarioDeMundo('mis_matas', { cultivos: [{ name: 'Café #01', count: 12 }, { name: 'Fríjol', count: 3 }] });
    expect(s).toMatch(/café/i);
    expect(s).toMatch(/12/);
    sinVoseo(s);
  });

  it('mis_matas: sin datos → acompañamiento honesto, SIN cifras inventadas', () => {
    const s = comentarioDeMundo('mis_matas', { cultivos: [] });
    expect(s).toMatch(/todavía no me ha contado/i);
    expect(s).not.toMatch(/\d/); // no inventa números
    sinVoseo(s);
  });

  it('mis_animales: cuenta real o fallback honesto', () => {
    expect(comentarioDeMundo('mis_animales', { total: 5 })).toMatch(/5 animales/i);
    expect(comentarioDeMundo('mis_animales', {})).toMatch(/cuando anote los suyos/i);
  });

  it('clima: prioriza alertas reales, luego fase, luego honestidad', () => {
    const conAlerta = comentarioDeMundo('clima', { snapshot: { alertas_locales: [{}, {}] } });
    expect(conAlerta).toMatch(/2 avisos/i);
    const conFase = comentarioDeMundo('clima', {
      snapshot: { enso_status: { phase: 'nina_fuerte' } },
      describirFase: (p) => (p === 'nina_fuerte' ? 'La Niña fuerte — mucha lluvia' : 'Estado del clima desconocido'),
    });
    expect(conFase).toMatch(/niña fuerte/i);
    const sinDato = comentarioDeMundo('clima', {});
    expect(sinDato).toMatch(/no tengo el parte del clima/i);
  });

  it('vender: NUNCA inventa precios', () => {
    const s = comentarioDeMundo('vender', { cultivos: [{ name: 'Aguacate', count: 4 }] });
    expect(s).toMatch(/aguacate/i);
    expect(s).not.toMatch(/\$|peso|precio de|a \d/i);
    sinVoseo(s);
  });

  it('aprender / bosque / páramo: acompañamiento en pregunta, sin dato de la finca', () => {
    for (const m of ['aprender', 'bosque', 'paramo']) {
      const s = comentarioDeMundo(m, {});
      expect(s).toBeTruthy();
      sinVoseo(s);
    }
    expect(comentarioDeMundo('paramo', {})).toMatch(/agua/i);
  });

  it('mundo inexistente → null', () => {
    expect(comentarioDeMundo('mundo_fantasma', {})).toBeNull();
  });

  it('todos los mundos comentan en usted sin voseo', () => {
    for (const m of MUNDOS) {
      const s = comentarioDeMundo(m, {});
      expect(s).toBeTruthy();
      sinVoseo(s);
    }
  });
});

describe('notificacionesInteligentes', () => {
  const helada = { type: 'helada', severity: 'danger', title: 'Helada esta noche' };
  const tareaHoy = { name: 'Regar el semillero', timestamp: Math.floor(Date.now() / 1000) };

  it('sin alertas ni tareas → calma, sin severidad', () => {
    const n = notificacionesInteligentes({ activeAlerts: [], pendingTasks: [] });
    expect(n.hay).toBe(false);
    expect(n.estado).toBe('calma');
    expect(n.severidad).toBeNull();
    expect(n.prioridad).toBe(0);
  });

  it('alerta danger → aviso severidad alta y prioridad máxima', () => {
    const n = notificacionesInteligentes({ activeAlerts: [helada], pendingTasks: [] });
    expect(n.hay).toBe(true);
    expect(n.estado).toBe('aviso');
    expect(n.severidad).toBe('alta');
    expect(n.prioridad).toBe(100);
    expect(n.lead).toBeTruthy();
    expect(n.items.length).toBeGreaterThan(0);
  });

  it('tarea de hoy sin alertas → aviso severidad baja/media', () => {
    const n = notificacionesInteligentes({ activeAlerts: [], pendingTasks: [tareaHoy] });
    expect(n.hay).toBe(true);
    expect(['media', 'baja']).toContain(n.severidad);
  });
});

describe('notificacionDeClima (#111 — vive el clima real)', () => {
  it('sin reacción (null) → calma, no inventa aviso', () => {
    const n = notificacionDeClima(null);
    expect(n.hay).toBe(false);
    expect(n.estado).toBe('calma');
    expect(n.severidad).toBeNull();
  });

  it('reacción de helada (severidad alta) → aviso con prioridad máxima', () => {
    const n = notificacionDeClima({
      tipo: 'helada', mensaje: 'Uy, mañana hiela.', estado: 'aviso', severidad: 'alta', gesto: 'abriga',
    });
    expect(n.hay).toBe(true);
    expect(n.estado).toBe('aviso');
    expect(n.severidad).toBe('alta');
    expect(n.prioridad).toBe(100);
    expect(n.lead).toBe('Uy, mañana hiela.');
  });

  it('reacción de sequía (severidad baja) → prioridad de aviso_baja', () => {
    const n = notificacionDeClima({
      tipo: 'sequia', mensaje: 'Tengo sed.', estado: 'aviso', severidad: 'baja', gesto: 'pideAgua',
    });
    expect(n.prioridad).toBe(45);
  });
});

describe('debeHablar — anti-molestia', () => {
  const ahora = 1_000_000_000;

  it('silenciado → nunca habla', () => {
    expect(debeHablar({ estado: 'aviso', severidad: 'alta', silenciado: true, ahoraMs: ahora })).toBe(false);
  });

  it('calma → nunca "habla" (reposa)', () => {
    expect(debeHablar({ estado: 'calma', ahoraMs: ahora })).toBe(false);
  });

  it('no interrumpe a mitad de tarea… salvo aviso URGENTE', () => {
    expect(debeHablar({ estado: 'husmea', ocupado: true, ahoraMs: ahora })).toBe(false);
    expect(debeHablar({ estado: 'celebra', ocupado: true, ahoraMs: ahora })).toBe(false);
    expect(debeHablar({ estado: 'aviso', severidad: 'media', ocupado: true, ahoraMs: ahora })).toBe(false);
    // urgente sí puede interrumpir
    expect(debeHablar({ estado: 'aviso', severidad: 'alta', ocupado: true, ahoraMs: ahora })).toBe(true);
  });

  it('respeta el cooldown por tipo', () => {
    // husmea recién habló → aún no
    expect(debeHablar({ estado: 'husmea', ahoraMs: ahora, ultimaMs: ahora - 5 * MINUTO })).toBe(false);
    // pasado el cooldown → sí
    expect(debeHablar({ estado: 'husmea', ahoraMs: ahora, ultimaMs: ahora - (COOLDOWN_MS.husmea + MINUTO) })).toBe(true);
  });

  it('aviso urgente ignora el cooldown (cooldown 0)', () => {
    expect(COOLDOWN_MS.aviso_alta).toBe(0);
    expect(debeHablar({ estado: 'aviso', severidad: 'alta', ahoraMs: ahora, ultimaMs: ahora - 1000 })).toBe(true);
  });
});

describe('resolverComportamiento — arbitraje', () => {
  const ahora = 2_000_000_000;
  const avisoAlto = notificacionesInteligentes({ activeAlerts: [{ type: 'helada', severity: 'danger', title: 'Helada' }], pendingTasks: [] });

  it('sin nada → calma silenciosa', () => {
    const d = resolverComportamiento({ ahoraMs: ahora });
    expect(d.estado).toBe('calma');
    expect(d.mensaje).toBeNull();
    expect(d.interrumpe).toBe(false);
    expect(d.visualEstado).toBe('acompana');
  });

  it('aviso urgente le gana a celebrar y a husmear', () => {
    const d = resolverComportamiento({
      ahoraMs: ahora,
      notificaciones: avisoAlto,
      logro: { id: 'l1', texto: '¡Registró su cosecha!' },
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Café', count: 9 }] },
    });
    expect(d.estado).toBe('aviso');
    expect(d.severidad).toBe('alta');
    expect(d.visualEstado).toBe('preocupada');
    expect(d.interrumpe).toBe(true);
    expect(d.mensaje).toBeTruthy();
  });

  it('celebra un logro real (dedup por id)', () => {
    const ctx = { ahoraMs: ahora, logro: { id: 'cosecha-42', texto: '¡Buena cosecha!' } };
    const d1 = resolverComportamiento(ctx);
    expect(d1.estado).toBe('celebra');
    expect(d1.visualEstado).toBe('contenta');
    expect(d1.logroId).toBe('cosecha-42');
    // ya celebrado → no repite
    const d2 = resolverComportamiento({ ...ctx, ultimoLogroId: 'cosecha-42' });
    expect(d2.estado).toBe('calma');
  });

  it('lamenta una pérdida real (#109, dedup por id, tono nunca culposo)', () => {
    const ctx = { ahoraMs: ahora, luto: { id: 'luto-planta-7', texto: 'Se nos fue el tomate. Pasa, y se aprende.' } };
    const d1 = resolverComportamiento(ctx);
    expect(d1.estado).toBe('luto');
    expect(d1.visualEstado).toBe('preocupada');
    expect(d1.logroId).toBe('luto-planta-7');
    expect(d1.mensaje).not.toMatch(/usted (la |lo )?(dej[oó]|mat[oó])|su culpa|descuid/i);
    // ya lamentada → no repite
    const d2 = resolverComportamiento({ ...ctx, ultimoLutoId: 'luto-planta-7' });
    expect(d2.estado).toBe('calma');
  });

  it('luto y celebra son independientes: lamentar una planta no bloquea celebrar un logro', () => {
    const d = resolverComportamiento({
      ahoraMs: ahora,
      logro: { id: 'cosecha-9', texto: '¡Buena cosecha!' },
      ultimoLutoId: 'luto-planta-7', // otra planta, ya lamentada antes
    });
    expect(d.estado).toBe('celebra');
  });

  it('luto le gana a husmear (prioridad 65 > 20) pero no a un aviso urgente', () => {
    const d = resolverComportamiento({
      ahoraMs: ahora,
      notificaciones: avisoAlto,
      luto: { id: 'luto-planta-8', texto: 'Se nos fue la lechuga.' },
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Café', count: 2 }] },
    });
    expect(d.estado).toBe('aviso'); // la helada real manda
  });

  it('husmea un mundo con comentario grounded', () => {
    const d = resolverComportamiento({
      ahoraMs: ahora,
      mundo: 'mis_animales',
      datosMundo: { total: 8 },
    });
    expect(d.estado).toBe('husmea');
    expect(d.visualEstado).toBe('senala');
    expect(d.mensaje).toMatch(/8 animales/i);
    expect(d.interrumpe).toBe(true);
  });

  it('husmea respeta cooldown POR MUNDO → si ya comentó ese mundo, calla', () => {
    const llave = 'husmea:mis_matas';
    const d = resolverComportamiento({
      ahoraMs: ahora,
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Café', count: 3 }] },
      ultimaHablaPorLlave: { [llave]: ahora - 60 * 1000 }, // habló hace 1 min
    });
    expect(d.estado).toBe('calma'); // vetado por cooldown de mundo
  });

  it('no interrumpe a mitad de tarea (ocupado) salvo urgencia', () => {
    const husmeando = resolverComportamiento({
      ahoraMs: ahora, ocupado: true, mundo: 'mis_matas', datosMundo: { cultivos: [{ name: 'Papa', count: 2 }] },
    });
    expect(husmeando.estado).toBe('calma');
    const urgente = resolverComportamiento({ ahoraMs: ahora, ocupado: true, notificaciones: avisoAlto });
    expect(urgente.estado).toBe('aviso');
  });

  it('silenciado → siempre calma', () => {
    const d = resolverComportamiento({ ahoraMs: ahora, notificaciones: avisoAlto, silenciado: true });
    expect(d.estado).toBe('calma');
  });

  it('llaveDeDecision devuelve la llave correcta para el cooldown', () => {
    expect(llaveDeDecision({ estado: 'calma' })).toBeNull();
    expect(llaveDeDecision({ estado: 'husmea' }, 'clima')).toBe('husmea:clima');
    expect(llaveDeDecision({ estado: 'aviso', severidad: 'media' })).toBe('aviso_media');
  });
});

describe('cadencia adaptativa (#102/#106)', () => {
  it('aplicarSenalMolestia suma/resta y clampea', () => {
    expect(aplicarSenalMolestia(0, 'silenciar')).toBe(3);
    expect(aplicarSenalMolestia(0, 'abrirTip')).toBe(-2);
    expect(aplicarSenalMolestia(MOLESTIA_MAX, 'silenciar')).toBe(MOLESTIA_MAX); // no se pasa del techo
    expect(aplicarSenalMolestia(MOLESTIA_MIN, 'hablarle')).toBe(MOLESTIA_MIN); // no se pasa del piso
    expect(aplicarSenalMolestia(5, 'senalDesconocida')).toBe(5); // señal inválida no muta nada
  });

  it('multiplicadorDeCadencia: 0 es 1x, molestia estira, atención encoge', () => {
    expect(multiplicadorDeCadencia(0)).toBe(1);
    expect(multiplicadorDeCadencia(MOLESTIA_MAX)).toBeCloseTo(3, 5);
    expect(multiplicadorDeCadencia(MOLESTIA_MIN)).toBeCloseTo(0.4, 5);
    // monótono: más molestia nunca acelera, más atención nunca frena.
    expect(multiplicadorDeCadencia(5)).toBeGreaterThan(multiplicadorDeCadencia(0));
    expect(multiplicadorDeCadencia(-5)).toBeLessThan(multiplicadorDeCadencia(0));
  });

  it('cadenciaEfectivaMs respeta SIEMPRE el piso de 13s y el techo de 6min', () => {
    expect(cadenciaEfectivaMs(COOLDOWN_MS.aviso_media, MOLESTIA_MIN)).toBeGreaterThanOrEqual(CADENCIA_MIN_MS);
    expect(cadenciaEfectivaMs(COOLDOWN_MS.husmea, MOLESTIA_MAX)).toBeLessThanOrEqual(CADENCIA_MAX_MS);
    // cooldown 0 (aviso_alta) no se modula: sigue "siempre puede".
    expect(cadenciaEfectivaMs(0, MOLESTIA_MAX)).toBe(0);
  });

  it('cadenciaEfectivaMs(CADENCIA_BASE_MS, 0) queda cerca de la base (referencia del SPEC ~46s)', () => {
    expect(cadenciaEfectivaMs(CADENCIA_BASE_MS, 0)).toBe(CADENCIA_BASE_MS);
  });

  it('debeHablar: con mucha molestia, un cooldown que ya venció sin modular sigue vetado', () => {
    const ahoraMs = 1000000;
    // husmea (20 min base) con mucha molestia se estira, pero el TECHO (6 min)
    // gobierna: a los 3 min SIN modular ya hubiera hablado (era husmea, no
    // aplica), y CON el multiplicador tampoco alcanza el techo modulado.
    const tresMin = 3 * 60 * 1000;
    const sieteMin = 7 * 60 * 1000;
    const conMolestiaAntesDelTecho = debeHablar({ estado: 'husmea', ahoraMs, ultimaMs: ahoraMs - tresMin, molestia: MOLESTIA_MAX });
    const conMolestiaTrasElTecho = debeHablar({ estado: 'husmea', ahoraMs, ultimaMs: ahoraMs - sieteMin, molestia: MOLESTIA_MAX });
    expect(conMolestiaAntesDelTecho).toBe(false); // el techo (6 min) aún no pasó
    expect(conMolestiaTrasElTecho).toBe(true); // pasado el techo modulado, sí habla
  });

  it('debeHablar: aviso_alta habla siempre pase lo que pase con la molestia', () => {
    const ahoraMs = 1000000;
    expect(debeHablar({
      estado: 'aviso', severidad: 'alta', ahoraMs, ultimaMs: ahoraMs, molestia: MOLESTIA_MAX,
    })).toBe(true);
  });
});
