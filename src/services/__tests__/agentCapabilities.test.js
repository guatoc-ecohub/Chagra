/**
 * agentCapabilities.test.js — cobertura del manifiesto único de capacidades
 * (src/services/agentCapabilities.js) y de la lógica de DERIVACIÓN de
 * `CHIP_INTENTS`/`CHIP_DEFS`.
 *
 * Consumidores como profileChipSelector.test.js, capabilityHealth.test.js o
 * manoRamasReachable.test.js ejercitan CAPABILITY_MANIFEST/CHIP_DEFS de forma
 * indirecta (a través de su propia lógica), pero ninguno valida el manifiesto
 * ni la transformación (`filter`/`reduce`/`map` con spreads condicionales) EN
 * SÍ MISMOS. Acá se cubre:
 *
 *   - Invariantes estructurales del manifiesto (ids únicos, hero⇒heroRoute,
 *     heroRoute.kind conocido, featured⇒hero, stub⇒stubMessage+status soon).
 *   - CHIP_INTENTS: solo entradas con `intent`, mapeo identidad, sin duplicar.
 *   - CHIP_DEFS: mismo orden y longitud que las entradas con `intent`, y los
 *     spreads condicionales de `stubMessage`/`moreGroup` (la clave NO debe
 *     existir cuando el manifiesto no la trae — no basta con que sea
 *     falsy/undefined).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
import { describe, it, expect } from 'vitest';
import { CAPABILITY_MANIFEST, CHIP_INTENTS, CHIP_DEFS } from '../agentCapabilities.js';

const HERO_ROUTE_KINDS = new Set(['ask', 'nav', 'photo', 'unavailable']);

describe('CAPABILITY_MANIFEST — invariantes estructurales', () => {
  it('todos los ids son únicos', () => {
    const ids = CAPABILITY_MANIFEST.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo intent declarado es único (CHIP_INTENTS no puede pisar entradas)', () => {
    const intents = CAPABILITY_MANIFEST.filter((e) => e.intent).map((e) => e.intent);
    expect(new Set(intents).size).toBe(intents.length);
  });

  it('toda entrada hero:true trae heroRoute con kind conocido', () => {
    for (const e of CAPABILITY_MANIFEST) {
      if (e.hero === true) {
        expect(e.heroRoute, `${e.id}: hero:true sin heroRoute`).toBeTruthy();
        expect(HERO_ROUTE_KINDS.has(e.heroRoute.kind), `${e.id}: heroRoute.kind desconocido (${e.heroRoute.kind})`).toBe(true);
      }
    }
  });

  it('heroRoute kind "nav" siempre trae view; kind "ask" siempre trae prompt', () => {
    for (const e of CAPABILITY_MANIFEST) {
      if (!e.heroRoute) continue;
      if (e.heroRoute.kind === 'nav') expect(e.heroRoute.view, `${e.id}`).toBeTruthy();
      if (e.heroRoute.kind === 'ask') expect(e.heroRoute.prompt, `${e.id}`).toBeTruthy();
    }
  });

  it('featured:true implica hero:true (no hay destacada fuera del anillo principal)', () => {
    for (const e of CAPABILITY_MANIFEST) {
      if (e.featured === true) {
        expect(e.hero, `${e.id}: featured sin hero:true`).toBe(true);
      }
    }
  });

  it('toda entrada kind:"stub" trae status:"soon" y un stubMessage no vacío', () => {
    for (const e of CAPABILITY_MANIFEST) {
      if (e.kind === 'stub') {
        expect(e.status, `${e.id}`).toBe('soon');
        expect(typeof e.stubMessage, `${e.id}`).toBe('string');
        expect(e.stubMessage.trim().length, `${e.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('toda entrada kind:"tool" trae un nombre de tool no vacío', () => {
    for (const e of CAPABILITY_MANIFEST) {
      if (e.kind === 'tool') {
        expect(typeof e.tool, `${e.id}`).toBe('string');
        expect(e.tool.trim().length, `${e.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('toda entrada trae un group no vacío', () => {
    for (const e of CAPABILITY_MANIFEST) {
      expect(typeof e.group, `${e.id}`).toBe('string');
      expect(e.group.trim().length, `${e.id}`).toBeGreaterThan(0);
    }
  });
});

describe('CHIP_INTENTS — derivación (filter + reduce)', () => {
  const entriesConIntent = CAPABILITY_MANIFEST.filter((e) => e.intent);

  it('tiene exactamente una clave por entrada con intent (sin más, sin menos)', () => {
    expect(Object.keys(CHIP_INTENTS).length).toBe(entriesConIntent.length);
  });

  it('excluye entradas del manifiesto sin campo intent (acciones puras de AgentHero)', () => {
    // 'plantas', 'aprender_hub', 'foto' son acciones de la mano sin chip/intent.
    expect(CHIP_INTENTS.plantas).toBeUndefined();
    expect(CHIP_INTENTS.aprender_hub).toBeUndefined();
    expect(CHIP_INTENTS.foto).toBeUndefined();
  });

  it('cada clave mapea a sí misma (identidad) para todas las entradas con intent', () => {
    for (const e of entriesConIntent) {
      expect(CHIP_INTENTS[e.intent]).toBe(e.intent);
    }
  });
});

describe('CHIP_DEFS — derivación (filter + map con spreads condicionales)', () => {
  const entriesConIntent = CAPABILITY_MANIFEST.filter((e) => e.intent);

  it('mismo largo y mismo orden que las entradas del manifiesto con intent', () => {
    expect(CHIP_DEFS.length).toBe(entriesConIntent.length);
    expect(CHIP_DEFS.map((d) => d.intent)).toEqual(entriesConIntent.map((e) => e.intent));
  });

  it('cada CHIP_DEF trae emoji/label/kind/placeholder tomados del manifiesto', () => {
    const siembro = CHIP_DEFS.find((d) => d.intent === 'siembro');
    const manifiestoSiembro = CAPABILITY_MANIFEST.find((e) => e.id === 'siembro');
    expect(siembro).toMatchObject({
      emoji: manifiestoSiembro.icon,
      label: manifiestoSiembro.label,
      kind: manifiestoSiembro.kind,
      placeholder: manifiestoSiembro.placeholder,
    });
  });

  it('stubMessage: la CLAVE no existe si el manifiesto no trae stubMessage (no solo undefined)', () => {
    const siembro = CHIP_DEFS.find((d) => d.intent === 'siembro');
    expect('stubMessage' in siembro).toBe(false);
  });

  it('stubMessage: SÍ está presente y con el texto exacto cuando el manifiesto lo define (chip "deep")', () => {
    const deep = CHIP_DEFS.find((d) => d.intent === 'deep');
    const manifiestoDeep = CAPABILITY_MANIFEST.find((e) => e.id === 'deep');
    expect(deep.stubMessage).toBe(manifiestoDeep.stubMessage);
  });

  it('moreGroup: la CLAVE no existe si el manifiesto no marca chipMore', () => {
    const siembro = CHIP_DEFS.find((d) => d.intent === 'siembro');
    expect('moreGroup' in siembro).toBe(false);
  });

  it('moreGroup:true SOLO en los chips marcados chipMore (grounding oscuro agrupado bajo "Más")', () => {
    const conMoreGroup = CHIP_DEFS.filter((d) => d.moreGroup === true).map((d) => d.intent).sort();
    const chipMoreEsperados = CAPABILITY_MANIFEST.filter((e) => e.chipMore).map((e) => e.intent).sort();
    expect(conMoreGroup).toEqual(chipMoreEsperados);
    expect(conMoreGroup).toEqual(
      ['alerta_paramo', 'fenologia', 'polinizacion', 'saberes_tradicionales', 'toxicidad', 'variedades'].sort(),
    );
  });

  it('un chip puede tener moreGroup Y stubMessage ausentes a la vez sin heredar claves del vecino', () => {
    // Regresión: si el spread condicional se rompiera (p. ej. reusando el
    // mismo objeto acumulador), un chip sin stubMessage podría "heredar" el
    // del anterior. Verificamos aislamiento entre entradas consecutivas.
    const plaga = CHIP_DEFS.find((d) => d.intent === 'plaga'); // sin stub, sin moreGroup
    const deep = CHIP_DEFS.find((d) => d.intent === 'deep'); // con stub, sin moreGroup
    expect('stubMessage' in plaga).toBe(false);
    expect(deep.stubMessage).not.toBe(plaga.stubMessage);
  });
});
