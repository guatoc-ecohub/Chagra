/**
 * proactiveGreeting.test.js
 *
 * Saludo proactivo de entrada del agente (operador 2026-06-03):
 *   - CON pendientes → el saludo LIDERA con lo más importante (1-2 cosas) y
 *     NOMBRA la alerta/tarea top. El resto queda como conteo para la campana.
 *   - SIN pendientes → da una IDEA contextual (cultivo/clima/temporada) y NUNCA
 *     inventa una alarma (no aparece "helada", "riego", "vencida", etc.).
 *
 * Reusa la lógica de AnalisisProactivoIA (#331) + alertEngine (#162) +
 * getPendingTasks (#298) extraída a un builder puro.
 */

import { describe, it, expect } from 'vitest';
import { buildProactiveGreeting, resolveProactiveGreeting } from '../proactiveGreeting.js';

// Fecha fija (martes 3 jun 2026, 8 a.m.) → "Buenos días" + temporada seca media.
const MORNING = new Date('2026-06-03T08:00:00');

describe('buildProactiveGreeting — CON pendientes (lidera con lo clave)', () => {
  it('nombra la alerta top (helada danger) en el lead', () => {
    const g = buildProactiveGreeting({
      activeAlerts: [
        { type: 'helada', severity: 'danger', title: 'Riesgo de helada esta noche', due: 'Hoy, 2–6 a.m.' },
      ],
      pendingTasks: [],
      date: MORNING,
    });
    expect(g.state).toBe('pending');
    expect(g.lead).toContain('Riesgo de helada esta noche');
    expect(g.items).toHaveLength(1);
    expect(g.items[0].kind).toBe('alert');
    expect(g.items[0].icon).toBe('❄️');
  });

  it('prioriza danger sobre warning y destaca máximo 2, deja el resto en restCount', () => {
    const g = buildProactiveGreeting({
      activeAlerts: [
        { type: 'lluvia', severity: 'warning', title: 'Lluvia fuerte mañana' },
        { type: 'helada', severity: 'danger', title: 'Helada esta noche' },
        { type: 'viento', severity: 'info', title: 'Viento moderado' },
      ],
      pendingTasks: [],
      date: MORNING,
    });
    expect(g.items).toHaveLength(2);
    // La danger va primero.
    expect(g.items[0].title).toBe('Helada esta noche');
    expect(g.lead).toContain('Helada esta noche');
    // La tercera no se muestra en el lead, queda contada.
    expect(g.restCount).toBe(1);
  });

  it('detecta tarea VENCIDA por timestamp y la nombra con su atraso', () => {
    const dosDiasAtras = Math.floor(MORNING.getTime() / 1000) - 2 * 24 * 60 * 60;
    const g = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [
        { type: 'log--task', status: 'pending', name: 'Aplicar caldo bordelés al tomate', timestamp: dosDiasAtras },
      ],
      date: MORNING,
    });
    expect(g.state).toBe('pending');
    expect(g.items[0].kind).toBe('task');
    expect(g.items[0].title).toBe('Aplicar caldo bordelés al tomate');
    expect(g.items[0].due).toBe('Vencida hace 2 días');
    expect(g.lead).toContain('Aplicar caldo bordelés al tomate');
  });

  it('NO destaca tareas FUTURAS como urgentes (solo hoy/vencidas)', () => {
    const enTresDias = Math.floor(MORNING.getTime() / 1000) + 3 * 24 * 60 * 60;
    const g = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [
        { type: 'log--task', status: 'pending', name: 'Cosechar arveja', timestamp: enTresDias },
      ],
      date: MORNING,
    });
    // Sin alertas ni tareas vencidas/hoy → cae a idea contextual.
    expect(g.state).toBe('idea');
    expect(g.items).toHaveLength(0);
  });

  it('mezcla alerta + tarea: alerta danger lidera, tarea de hoy la sigue', () => {
    const hoy = Math.floor(MORNING.getTime() / 1000);
    const g = buildProactiveGreeting({
      activeAlerts: [
        { type: 'helada', severity: 'danger', title: 'Helada esta noche' },
      ],
      pendingTasks: [
        { type: 'log--task', status: 'pending', name: 'Riego del lote 2', timestamp: hoy },
      ],
      date: MORNING,
    });
    expect(g.items).toHaveLength(2);
    expect(g.items[0].kind).toBe('alert');
    expect(g.items[1].kind).toBe('task');
    expect(g.lead).toContain('Helada esta noche');
  });

  it('soporta activeAlerts como Map (forma interna del engine)', () => {
    const map = new Map();
    map.set('helada', { type: 'helada', severity: 'danger', title: 'Helada nocturna' });
    const g = buildProactiveGreeting({ activeAlerts: /** @type {any} */ (map), pendingTasks: [], date: MORNING });
    expect(g.state).toBe('pending');
    expect(g.lead).toContain('Helada nocturna');
  });
});

describe('buildProactiveGreeting — SIN pendientes (idea contextual, NO inventa alarma)', () => {
  const ALARM_WORDS = /helada|riego pendiente|vencida|alerta activa|⚠️|❄️|🔥|🌧️/i;

  it('sin alertas ni tareas → estado idea y NO menciona ninguna alarma', () => {
    const g = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      cultivos: [{ name: 'Papa', count: 12 }],
      altitud: 2600,
      date: MORNING,
    });
    expect(g.state).toBe('idea');
    expect(g.items).toHaveLength(0);
    expect(g.restCount).toBe(0);
    expect(g.lead).not.toMatch(ALARM_WORDS);
  });

  it('teje el cultivo principal del inventario en la idea', () => {
    const g = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      cultivos: [{ name: 'Café', count: 30 }, { name: 'Plátano', count: 4 }],
      altitud: 1500,
      date: MORNING,
    });
    expect(g.state).toBe('idea');
    expect(g.lead.toLowerCase()).toContain('café');
    expect(g.lead).not.toMatch(ALARM_WORDS);
  });

  it('sin cultivos pero con altitud → usa piso térmico, sin inventar alarma', () => {
    const g = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      cultivos: [],
      altitud: 2600,
      date: MORNING,
    });
    expect(g.state).toBe('idea');
    expect(g.lead.toLowerCase()).toContain('frío'); // piso térmico de 2600 msnm
    expect(g.lead).not.toMatch(ALARM_WORDS);
  });

  it('sin nada de contexto → fallback amable, jamás una alarma', () => {
    const g = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      cultivos: [],
      altitud: null,
      date: MORNING,
    });
    expect(g.state).toBe('idea');
    expect(g.lead).not.toMatch(ALARM_WORDS);
    expect(g.lead.length).toBeGreaterThan(20);
  });

  // Fix 2026-06-03: el saludo afirmaba la temporada como HECHO ("Como estamos en
  // segunda temporada seca…") en plena época de lluvias → falso. Ahora la enmarca
  // como referencia de calendario que SIEMPRE cede al clima real de la finca.
  it('NO afirma el clima de hoy como hecho — enmarca la temporada como calendario y defiere al clima real', () => {
    for (const ctx of [
      { cultivos: [{ name: 'Fresa', count: 8 }], altitud: 2600 }, // rama cultivo
      { cultivos: [], altitud: 2600 }, // rama piso térmico
      { cultivos: [], altitud: null }, // rama fallback
    ]) {
      const g = buildProactiveGreeting({ activeAlerts: [], pendingTasks: [], date: MORNING, ...ctx });
      expect(g.state).toBe('idea');
      // NUNCA debe afirmar la temporada como un parte meteorológico presente.
      expect(g.lead).not.toMatch(/(como )?estamos en .*temporada/i);
      // SÍ debe enmarcarla como calendario y deferir explícitamente al clima real.
      expect(g.lead.toLowerCase()).toContain('el calendario marca');
      expect(g.lead.toLowerCase()).toContain('clima real');
    }
  });
});

describe('buildProactiveGreeting — saludo según hora', () => {
  it('mañana → Buenos días', () => {
    expect(buildProactiveGreeting({ date: new Date('2026-06-03T08:00:00') }).hi).toBe('Buenos días');
  });
  it('tarde → Buenas tardes', () => {
    expect(buildProactiveGreeting({ date: new Date('2026-06-03T15:00:00') }).hi).toBe('Buenas tardes');
  });
  it('noche → Buenas noches', () => {
    expect(buildProactiveGreeting({ date: new Date('2026-06-03T21:00:00') }).hi).toBe('Buenas noches');
  });
});

describe('resolveProactiveGreeting — hidrata desde stores async', () => {
  it('llama getPendingTasks y arma el saludo con pendientes', async () => {
    const dosDiasAtras = Math.floor(MORNING.getTime() / 1000) - 2 * 24 * 60 * 60;
    const g = await resolveProactiveGreeting(/** @type {any} */ ({
      activeAlerts: [],
      getPendingTasks: async () => [
        { type: 'log--task', status: 'pending', name: 'Deshierbe del lote de arveja', timestamp: dosDiasAtras },
      ],
      date: MORNING,
    }));
    expect(g.state).toBe('pending');
    expect(g.lead).toContain('Deshierbe del lote de arveja');
  });

  it('degrada a idea si getPendingTasks lanza error (no rompe el render)', async () => {
    const g = await resolveProactiveGreeting(/** @type {any} */ ({
      activeAlerts: [],
      getPendingTasks: async () => { throw new Error('IndexedDB caído'); },
      cultivos: [{ name: 'Maíz', count: 5 }],
      altitud: 1800,
      date: MORNING,
    }));
    expect(g.state).toBe('idea');
    expect(g.lead.toLowerCase()).toContain('maíz');
  });
});
