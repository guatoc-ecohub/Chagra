/**
 * voseoFilter.test.js — Suite vitest del filtro post-process anti-voseo
 * argentino (DR-LANG-1, 2026-05-28).
 *
 * Cubre 52+ casos organizados en seis grupos:
 *   1. Marcadores básicos (presente, sos, vos).
 *   2. Imperativos planos y capitalización.
 *   3. Reglas de contexto (acá, dale, allá aislados vs en frase voseo).
 *   4. Bloques de código y JSON protegidos.
 *   5. Modo usted (formality='usted').
 *   6. Casos agroecológicos realistas extraídos del piloto y bench.
 *
 * Todas las aserciones son determinísticas. La suite NO mocketea el LLM:
 * el filtro es una función pura sobre el texto del modelo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterVoseo,
  getVoseoTelemetry,
  resetVoseoTelemetry,
  listVoseoMarkerIds,
} from '../voseoFilter.js';

describe('voseoFilter — Grupo 1: marcadores básicos en tú colombiano', () => {
  it('reemplaza pronombre vos por tú', () => {
    expect(filterVoseo('vos podés probar', { formality: 'tu' })).toBe('tú puedes probar');
  });

  it('reemplaza tenés por tienes', () => {
    expect(filterVoseo('tenés que regar', { formality: 'tu' })).toBe('tienes que regar');
  });

  it('reemplaza querés por quieres', () => {
    expect(filterVoseo('querés que te explique?', { formality: 'tu' })).toBe('quieres que te explique?');
  });

  it('reemplaza podés por puedes', () => {
    expect(filterVoseo('podés sembrar maíz', { formality: 'tu' })).toBe('puedes sembrar maíz');
  });

  it('reemplaza decís por dices', () => {
    expect(filterVoseo('decís que la auyama necesita sol', { formality: 'tu' }))
      .toBe('dices que la auyama necesita sol');
  });

  it('reemplaza sabés por sabes', () => {
    expect(filterVoseo('sabés cuándo cosechar?', { formality: 'tu' })).toBe('sabes cuándo cosechar?');
  });

  it('reemplaza vivís por vives', () => {
    expect(filterVoseo('vivís en el Cauca?', { formality: 'tu' })).toBe('vives en el Cauca?');
  });

  it('reemplaza venís por vienes', () => {
    expect(filterVoseo('venís de Boyacá?', { formality: 'tu' })).toBe('vienes de Boyacá?');
  });

  it('reemplaza salís por sales', () => {
    expect(filterVoseo('salís a sembrar mañana?', { formality: 'tu' })).toBe('sales a sembrar mañana?');
  });

  it('reemplaza sos por eres', () => {
    expect(filterVoseo('sos campesino?', { formality: 'tu' })).toBe('eres campesino?');
  });

  it('reemplaza imperativo mirá por mira', () => {
    expect(filterVoseo('mirá las hojas', { formality: 'tu' })).toBe('mira las hojas');
  });

  it('reemplaza imperativo andá por ve', () => {
    expect(filterVoseo('andá al lote', { formality: 'tu' })).toBe('ve al lote');
  });

  it('reemplaza imperativo vení por ven', () => {
    expect(filterVoseo('vení a la huerta', { formality: 'tu' })).toBe('ven a la huerta');
  });

  it('reemplaza imperativo elegí por elige', () => {
    expect(filterVoseo('elegí semillas certificadas', { formality: 'tu' }))
      .toBe('elige semillas certificadas');
  });

  it('reemplaza fijate por fíjate y atilda', () => {
    expect(filterVoseo('fijate en la luna', { formality: 'tu' })).toBe('fíjate en la luna');
  });

  it('reemplaza fijáte (forma alterna) por fíjate', () => {
    expect(filterVoseo('fijáte en la luna', { formality: 'tu' })).toBe('fíjate en la luna');
  });

  it('reemplaza poné por pon (imperativo)', () => {
    expect(filterVoseo('poné la composta', { formality: 'tu' })).toBe('pon la composta');
  });
});

describe('voseoFilter — Grupo 2: capitalización inicial preservada', () => {
  it('preserva mayúscula inicial: Vos → Tú', () => {
    expect(filterVoseo('Vos podés', { formality: 'tu' })).toBe('Tú puedes');
  });

  it('preserva mayúscula inicial en modo usted: Vos → Usted', () => {
    expect(filterVoseo('Vos podés', { formality: 'usted' })).toBe('Usted puede');
  });

  it('preserva mayúscula en imperativo: Mirá → Mira', () => {
    expect(filterVoseo('Mirá esto', { formality: 'tu' })).toBe('Mira esto');
  });

  it('preserva mayúscula en imperativo atildado: Fijate → Fíjate', () => {
    expect(filterVoseo('Fijate en la luna', { formality: 'tu' })).toBe('Fíjate en la luna');
  });

  it('mantiene puntuación al final: Tenés que regar. → Tienes que regar.', () => {
    expect(filterVoseo('Tenés que regar.', { formality: 'tu' })).toBe('Tienes que regar.');
  });

  it('preserva mayúscula en imperativo plano: Sembrá → Siembra', () => {
    expect(filterVoseo('Sembrá maíz.', { formality: 'tu' })).toBe('Siembra maíz.');
  });

  it('preserva mayúscula en sos → Eres', () => {
    expect(filterVoseo('Sos campesino', { formality: 'tu' })).toBe('Eres campesino');
  });

  it('respeta capitalización con marcador débil + contexto: Acá vos podés → Aquí tú puedes', () => {
    expect(filterVoseo('Acá vos podés sembrar.', { formality: 'tu' }))
      .toBe('Aquí tú puedes sembrar.');
  });
});

describe('voseoFilter — Grupo 3: reglas de contexto (acá, dale, allá)', () => {
  it('preserva acá aislado en oración sin marcador fuerte voseo', () => {
    const input = 'acá hace sol.';
    expect(filterVoseo(input, { formality: 'tu' })).toBe('acá hace sol.');
  });

  it('reemplaza acá cuando comparte oración con marcador fuerte', () => {
    expect(filterVoseo('acá vos podés sembrar', { formality: 'tu' }))
      .toBe('aquí tú puedes sembrar');
  });

  it('preserva dale aislado (uso bogotano / paisa sin connotación voseo)', () => {
    expect(filterVoseo('dale, te explico.', { formality: 'tu' })).toBe('dale, te explico.');
  });

  it('reemplaza dale cuando comparte oración con marcador fuerte', () => {
    expect(filterVoseo('dale, vos sabés mejor', { formality: 'tu' }))
      .toBe('listo, tú sabes mejor');
  });

  it('preserva allá aislado en oración sin marcador fuerte', () => {
    expect(filterVoseo('allá hay un cultivo de café.', { formality: 'tu' }))
      .toBe('allá hay un cultivo de café.');
  });

  it('reemplaza allá cuando comparte oración con marcador fuerte', () => {
    expect(filterVoseo('allá vos elegí el lote', { formality: 'tu' }))
      .toBe('allí tú elige el lote');
  });

  it('preserva primera oración aislada y filtra la segunda con marcador fuerte', () => {
    // "acá." está aislado en su propia oración → preservado.
    // "Tenés tiempo." es marcador fuerte → filtrado.
    const out = filterVoseo('acá. Tenés tiempo.', { formality: 'tu' });
    expect(out).toBe('acá. Tienes tiempo.');
  });

  it('reemplaza acá y tenés cuando están en la misma oración', () => {
    expect(filterVoseo('acá tenés tiempo', { formality: 'tu' }))
      .toBe('aquí tienes tiempo');
  });

  it('preserveIsolatedAca=false desactiva la guarda y siempre reemplaza acá', () => {
    expect(filterVoseo('acá hace sol.', { formality: 'tu', preserveIsolatedAca: false }))
      .toBe('aquí hace sol.');
  });
});

describe('voseoFilter — Grupo 4: bloques de código y JSON protegidos', () => {
  it('preserva ``` ... ``` y filtra fuera del bloque', () => {
    const input = '```js\nconst tenes = 1\n``` y tenés tiempo';
    const out = filterVoseo(input, { formality: 'tu' });
    expect(out).toContain('```js\nconst tenes = 1\n```');
    expect(out).toContain('tienes tiempo');
  });

  it('preserva inline code `vos` y filtra vos en texto libre con contexto', () => {
    const input = '`vos` en código y vos podés probar';
    const out = filterVoseo(input, { formality: 'tu' });
    expect(out).toContain('`vos`');
    expect(out).toContain('tú puedes probar');
  });

  it('preserva strings JSON con escape y filtra fuera', () => {
    const input = '{"name": "podés"} y querés saber';
    const out = filterVoseo(input, { formality: 'tu' });
    expect(out).toContain('"podés"');
    expect(out).toContain('quieres saber');
  });

  it('preserva inline code `acordate` sin atildación', () => {
    const input = 'código `acordate` en línea';
    const out = filterVoseo(input, { formality: 'tu' });
    expect(out).toBe('código `acordate` en línea');
  });

  it('preserva bloque python con querés y filtra fuera', () => {
    const input = "respuesta con bloque ```python\nprint('querés')\n``` y querés saber";
    const out = filterVoseo(input, { formality: 'tu' });
    expect(out).toContain("print('querés')");
    expect(out).toContain('quieres saber');
  });

  it('preserva múltiples regiones protegidas en una sola entrada', () => {
    const input = 'antes ```tenés``` medio `podés` después tenés';
    const out = filterVoseo(input, { formality: 'tu' });
    expect(out).toContain('```tenés```');
    expect(out).toContain('`podés`');
    expect(out).toMatch(/después tienes$/);
  });
});

describe('voseoFilter — Grupo 5: modo usted (formality=usted)', () => {
  it('vos podés → usted puede', () => {
    expect(filterVoseo('vos podés', { formality: 'usted' })).toBe('usted puede');
  });

  it('tenés que regar → tiene que regar', () => {
    expect(filterVoseo('tenés que regar', { formality: 'usted' })).toBe('tiene que regar');
  });

  it('mirá las hojas → mire las hojas', () => {
    expect(filterVoseo('mirá las hojas', { formality: 'usted' })).toBe('mire las hojas');
  });

  it('acordate → acuérdese', () => {
    expect(filterVoseo('acordate', { formality: 'usted' })).toBe('acuérdese');
  });

  it('fijate → fíjese', () => {
    expect(filterVoseo('fijate', { formality: 'usted' })).toBe('fíjese');
  });

  it('default formality es usted si no se pasa option', () => {
    expect(filterVoseo('vos podés')).toBe('usted puede');
  });
});

describe('voseoFilter — Grupo 6: casos agroecológicos realistas', () => {
  it('caso piloto: vos podés sembrar maíz acá en tu lote', () => {
    const input = 'vos podés sembrar maíz en luna creciente acá en tu lote';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('tú puedes sembrar maíz en luna creciente aquí en tu lote');
  });

  it('caso piloto: mirá las hojas amarillas, fijate si tiene mosca blanca', () => {
    const input = 'mirá las hojas amarillas, fijate si tiene mosca blanca';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('mira las hojas amarillas, fíjate si tiene mosca blanca');
  });

  it('caso piloto: tenés que aplicar ceniza cada 15 días, acordate de regar antes', () => {
    const input = 'tenés que aplicar ceniza cada 15 días, acordate de regar antes';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('tienes que aplicar ceniza cada 15 días, acuérdate de regar antes');
  });

  it('caso piloto: elegí semillas criollas y dejá que se adapten', () => {
    const input = 'elegí semillas criollas y dejá que se adapten';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('elige semillas criollas y deja que se adapten');
  });

  it('caso piloto: sabés que la gulupa necesita 1800 msnm mínimo?', () => {
    const input = 'sabés que la gulupa necesita 1800 msnm mínimo?';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('sabes que la gulupa necesita 1800 msnm mínimo?');
  });

  it('caso piloto: vení a la huerta, te muestro el biopreparado', () => {
    const input = 'vení a la huerta, te muestro el biopreparado';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('ven a la huerta, te muestro el biopreparado');
  });

  it('caso piloto: vos sos el dueño del lote, vos decidís', () => {
    const input = 'vos sos el dueño del lote, vos decidís';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('tú eres el dueño del lote, tú decides');
  });

  it('caso piloto: fijate en la luna nueva para sembrar tubérculos', () => {
    const input = 'fijate en la luna nueva para sembrar tubérculos';
    expect(filterVoseo(input, { formality: 'tu' }))
      .toBe('fíjate en la luna nueva para sembrar tubérculos');
  });

  it('caso piloto modo usted: vos podés probar siembra de gulupa', () => {
    expect(filterVoseo('vos podés probar siembra de gulupa', { formality: 'usted' }))
      .toBe('usted puede probar siembra de gulupa');
  });

  it('caso piloto modo usted: tenés que regar más seguido', () => {
    expect(filterVoseo('tenés que regar más seguido', { formality: 'usted' }))
      .toBe('tiene que regar más seguido');
  });
});

describe('voseoFilter — extensión chilena (opt-in)', () => {
  it('por defecto NO filtra tenís', () => {
    expect(filterVoseo('tenís que regar', { formality: 'tu' })).toBe('tenís que regar');
  });

  it('con includeChilean=true filtra tenís → tienes', () => {
    expect(filterVoseo('tenís que regar', { formality: 'tu', includeChilean: true }))
      .toBe('tienes que regar');
  });

  it('con includeChilean=true filtra querís → quieres', () => {
    expect(filterVoseo('querís sembrar', { formality: 'tu', includeChilean: true }))
      .toBe('quieres sembrar');
  });
});

describe('voseoFilter — robustez y edge cases', () => {
  it('retorna texto vacío sin modificar', () => {
    expect(filterVoseo('', { formality: 'tu' })).toBe('');
  });

  it('retorna texto null/undefined sin throw', () => {
    expect(filterVoseo(null)).toBe(null);
    expect(filterVoseo(undefined)).toBe(undefined);
  });

  it('retorna número/objeto sin throw', () => {
    expect(filterVoseo(/** @type {any} */ (42))).toBe(42);
    expect(filterVoseo(/** @type {any} */ ({ a: 1 }))).toEqual({ a: 1 });
  });

  it('no rompe palabras que contienen "vos" como substring', () => {
    expect(filterVoseo('nosotros sabemos', { formality: 'tu' })).toBe('nosotros sabemos');
    expect(filterVoseo('vosotros', { formality: 'tu' })).toBe('vosotros');
  });

  it('es idempotente: filterVoseo(filterVoseo(t)) === filterVoseo(t)', () => {
    const t = 'vos podés sembrar acá, mirá la luna y fijate.';
    const once = filterVoseo(t, { formality: 'tu' });
    const twice = filterVoseo(once, { formality: 'tu' });
    expect(twice).toBe(once);
  });

  it('respeta texto sin marcadores como passthrough', () => {
    const t = 'Hola, ¿cómo está usted hoy?';
    expect(filterVoseo(t, { formality: 'tu' })).toBe(t);
  });

  it('lista de marker ids cubre al menos 9 familias (no chileno)', () => {
    const ids = listVoseoMarkerIds();
    expect(ids.length).toBeGreaterThanOrEqual(9);
    expect(ids).toContain('vos');
    expect(ids).toContain('tenes');
    expect(ids).toContain('queres');
    expect(ids).toContain('podes');
    expect(ids).toContain('decis');
    expect(ids).toContain('mira_voseo');
    expect(ids).toContain('dale');
    expect(ids).toContain('aca');
    expect(ids).toContain('acordate');
  });
});

describe('voseoFilter — telemetría onMatch + counters', () => {
  beforeEach(() => {
    resetVoseoTelemetry();
  });

  it('invoca onMatch por cada marcador reemplazado', () => {
    /** @type {string[]} */
    const hits = [];
    filterVoseo('vos podés', {
      formality: 'tu',
      onMatch: (id) => hits.push(id),
    });
    expect(hits).toEqual(['vos', 'podes']);
  });

  it('no invoca onMatch para marcador débil aislado', () => {
    /** @type {string[]} */
    const hits = [];
    filterVoseo('acá hace sol', {
      formality: 'tu',
      onMatch: (id) => hits.push(id),
    });
    expect(hits).toEqual([]);
  });

  it('telemetry=true incrementa contador local', () => {
    filterVoseo('vos podés', { formality: 'tu', telemetry: true });
    const counters = getVoseoTelemetry();
    expect(counters.vos).toBe(1);
    expect(counters.podes).toBe(1);
    expect(counters.__total).toBe(2);
  });

  it('telemetry=false no incrementa contador', () => {
    filterVoseo('vos podés', { formality: 'tu', telemetry: false });
    const counters = getVoseoTelemetry();
    expect(counters.vos).toBeUndefined();
  });

  it('onMatch que tira excepción no rompe el filtro', () => {
    const out = filterVoseo('vos podés', {
      formality: 'tu',
      onMatch: () => { throw new Error('boom'); },
    });
    expect(out).toBe('tú puedes');
  });
});

describe('voseoFilter — region-aware (fix paisa 2026-06-02)', () => {
  it('paisa/pacífico: PRESERVA el voseo (no aplana morfología)', () => {
    expect(filterVoseo('Vos podés sembrar el maíz', { region: 'paisa' }))
      .toBe('Vos podés sembrar el maíz');
    expect(filterVoseo('Tenés que regar temprano', { region: 'pacifico' }))
      .toBe('Tenés que regar temprano');
  });

  it('caribe: aplana voseo → tú', () => {
    expect(filterVoseo('Vos podés sembrar el maíz', { region: 'caribe' }))
      .toBe('Tú puedes sembrar el maíz');
  });

  it('cundiboyacense: aplana voseo → usted', () => {
    expect(filterVoseo('Vos podés sembrar el maíz', { region: 'cundiboyacense' }))
      .toBe('Usted puede sembrar el maíz');
  });

  it('léxico rioplatense se limpia INCLUSO en región voseante', () => {
    // "che/laburo" son argentinos puros; "tenés" es voseo paisa legítimo.
    expect(filterVoseo('Che, tenés que ir al laburo', { region: 'paisa' }))
      .toBe('Oiga, tenés que ir al trabajo');
  });

  it('back-compat: sin región se comporta como antes (aplana a formality)', () => {
    expect(filterVoseo('vos podés', { formality: 'tu' })).toBe('tú puedes');
    expect(filterVoseo('vos podés', { formality: 'usted' })).toBe('usted puede');
    expect(filterVoseo('vos podés', { region: 'narnia' })).toBe('usted puede');
  });
});
