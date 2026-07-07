/**
 * outputGuards.fabricatedBotanicalFamily.test.js — guard confusion_especie (#2132):
 * FABRICACIÓN de FAMILIA BOTÁNICA en prosa.
 *
 * Contexto (bench-contaminacion.mjs, sonda `confusion_especie`, 2026-07): tras
 * cerrar el hueco cross_thermal el residuo de contaminación migró a
 * confusion_especie (0% → 9.5% del passrate): granite afirma en TEXTO LIBRE
 * pertenencias de familia botánica INVENTADAS que ningún guard cortaba. Casos
 * reales cazados por el juez del bench (ground-truth del catálogo Chagra):
 *   - "la guayaba pertenece a Passifloraceae"      → es Myrtaceae
 *   - "el plátano es de la familia Passifloraceae" → es Musaceae
 *   - "la morera es Rosaceae"                      → es Moraceae
 *
 * El guard SUPRIME-Y-REEMPLAZA el cuerpo (no antepone aviso) por la corrección
 * grounded contra `familia_botanica` (HAS_FAMILY) del catálogo. Complementa el
 * PRE-prompt confusion-especie-guard (sidecar #292/#2077), que solo hace steering
 * del system prompt ANTES de responder y no valida la salida.
 *
 * Cubre:
 *   (a) los 3 casos reales (guayaba / plátano / morera) → suprime+corrige.
 *   (b) forma vernácula española ("las musáceas", "una mirtácea") + sinónimo
 *       clásico (leguminosas/gramíneas).
 *   (c) anti-FP: familia CORRECTA → no dispara.
 *   (d) anti-FP: enumeración con otra especie entre medias → no mis-atribuye.
 *   (e) anti-FP: compuesto folk ("papa china" = Araceae) → no dispara.
 *   (f) idempotencia + integración en applyOutputGuards (early-return) + telemetría.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardFabricatedBotanicalFamily,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

describe('guardFabricatedBotanicalFamily — casos reales del bench (#2132)', () => {
  it('(a1) guayaba → Passifloraceae (real: Myrtaceae): suprime y corrige', () => {
    const res = guardFabricatedBotanicalFamily(
      'La guayaba pertenece a Passifloraceae y se caracteriza por sus zarcillos trepadores.',
    );
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Myrtaceae');
    expect(res.text).toContain('no a Passifloraceae');
    // suppress-and-replace: el cuerpo fabricado NO sobrevive.
    expect(res.text).not.toContain('zarcillos trepadores');
    expect(res.reason).toContain('familia_botanica_fabricada');
  });

  it('(a2) plátano → "de la familia Passifloraceae" (real: Musaceae): corrige', () => {
    const res = guardFabricatedBotanicalFamily('El plátano es de la familia Passifloraceae.');
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Musaceae');
    expect(res.text).toContain('no a Passifloraceae');
  });

  it('(a3) morera → "es Rosaceae" (real: Moraceae): cópula desnuda, corrige', () => {
    const res = guardFabricatedBotanicalFamily('La morera es Rosaceae, un árbol de hoja para el gusano de seda.');
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Moraceae');
    expect(res.text).toContain('no a Rosaceae');
  });

  it('(b1) vernáculo español: "el plátano pertenece a las musáceas" NO debería... espera, esa es correcta', () => {
    // musáceas = Musaceae = familia real del plátano → NO dispara (anti-FP vernáculo).
    const res = guardFabricatedBotanicalFamily('El plátano pertenece a las musáceas.');
    expect(res.modified).toBe(false);
  });

  it('(b2) vernáculo español ERRÓNEO: "la guayaba es una pasiflorácea" → corrige', () => {
    const res = guardFabricatedBotanicalFamily('La guayaba es una pasiflorácea de la huerta.');
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Myrtaceae');
  });

  it('(b3) sinónimo clásico: "el fríjol pertenece a las gramíneas" (real: Fabaceae) → corrige', () => {
    const res = guardFabricatedBotanicalFamily('El fríjol pertenece a las gramíneas.');
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Fabaceae');
    expect(res.text).toContain('no a Poaceae');
  });

  it('(b4) latín puro no mapeado explícitamente: "el lulo pertenece a Ericaceae" (real: Solanaceae) → corrige', () => {
    const res = guardFabricatedBotanicalFamily('El lulo pertenece a Ericaceae.');
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Solanaceae');
    expect(res.text).toContain('no a Ericaceae');
  });
});

describe('guardFabricatedBotanicalFamily — anti-falsos-positivos', () => {
  it('(c1) familia CORRECTA (guayaba → Myrtaceae) no dispara', () => {
    const res = guardFabricatedBotanicalFamily(
      'La guayaba (Psidium guajava) pertenece a la familia Myrtaceae; es rica en vitamina C.',
    );
    expect(res.modified).toBe(false);
  });

  it('(c2) familia correcta vernácula (tomate → solanáceas) no dispara', () => {
    const res = guardFabricatedBotanicalFamily('El tomate es de las solanáceas, como la papa y el ají.');
    expect(res.modified).toBe(false);
  });

  it('(d) enumeración con otra especie entre medias: no mis-atribuye', () => {
    // "el maracuyá ... Passifloraceae ... la guayaba ... Myrtaceae" — ambas correctas;
    // la guayaba NO debe emparejar con Passifloraceae (hay maracuyá entre medias).
    const res = guardFabricatedBotanicalFamily(
      'El maracuyá pertenece a Passifloraceae y la guayaba a Myrtaceae.',
    );
    expect(res.modified).toBe(false);
  });

  it('(e) compuesto folk "papa china" (Araceae) no dispara el mapeo de papa', () => {
    const res = guardFabricatedBotanicalFamily('La papa china pertenece a Araceae.');
    expect(res.modified).toBe(false);
  });

  it('(e2) "tomate de árbol naranja" no dispara el mapeo de naranja (Rutaceae)', () => {
    const res = guardFabricatedBotanicalFamily(
      'El tomate de árbol naranja pertenece a Solanaceae.',
    );
    expect(res.modified).toBe(false);
  });

  it('(f1) cruce de oración: familia en otra frase no atribuye', () => {
    const res = guardFabricatedBotanicalFamily(
      'La guayaba es deliciosa. Muchas plantas de la huerta son Passifloraceae.',
    );
    expect(res.modified).toBe(false);
  });

  it('(f2) sin nombre de familia en el texto: no-op barato', () => {
    const res = guardFabricatedBotanicalFamily('La guayaba se cosecha madura y se come fresca.');
    expect(res.modified).toBe(false);
  });

  it('(f3) idempotencia: no re-suprime su propia corrección', () => {
    const once = guardFabricatedBotanicalFamily('La guayaba pertenece a Passifloraceae.');
    expect(once.modified).toBe(true);
    const twice = guardFabricatedBotanicalFamily(once.text);
    expect(twice.modified).toBe(false);
  });

  it('(f4) entrada vacía / no-string: no-op', () => {
    expect(guardFabricatedBotanicalFamily('').modified).toBe(false);
    expect(guardFabricatedBotanicalFamily(null).modified).toBe(false);
    expect(guardFabricatedBotanicalFamily(undefined).modified).toBe(false);
  });
});

describe('guardFabricatedBotanicalFamily — familia-primero (enumeración) + plurales', () => {
  it('BENCH real (gulupa): "de la familia Passifloraceae, como las guayabas (Psidium) o los plátanos (Musa)"', () => {
    // worst_case bench1-contaminacion 2026-07-06 (confusion_especie 9.5%): el modelo
    // enumera guayabas y plátanos como Passifloraceae; son Myrtaceae y Musaceae.
    const res = guardFabricatedBotanicalFamily(
      'La gulupa pertenece a la familia Passifloraceae. Tiene similitudes con otras plantas ' +
        'de la familia Passifloraceae, como las guayabas (Psidium) o los plátanos (Musa), cada una distinta.',
    );
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Myrtaceae'); // guayaba corregida
    expect(res.text).toContain('familia Musaceae'); // plátano corregido
    expect(res.text).toContain('no a Passifloraceae');
  });

  it('BENCH real (mora andina): puente anafórico "…familia Rosaceae. Esta familia … como en el caso de las moreras"', () => {
    const res = guardFabricatedBotanicalFamily(
      'La mora andina pertenece a la familia Rosaceae. Esta familia se caracteriza por frutos ' +
        'en baya, como en el caso de las moreras y otros arbustos.',
    );
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Moraceae'); // morera corregida
    expect(res.text).toContain('no a Rosaceae');
  });

  it('cue "incluye": "La familia Solanaceae incluye el maracuyá" (Passifloraceae) → corrige', () => {
    const res = guardFabricatedBotanicalFamily('La familia Solanaceae incluye el maracuyá y la papa.');
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Passifloraceae'); // maracuyá corregido
  });

  it('plural especie-primero: "las guayabas pertenecen a Passifloraceae" → corrige', () => {
    const res = guardFabricatedBotanicalFamily('Las guayabas pertenecen a Passifloraceae en esta región.');
    expect(res.modified).toBe(true);
    expect(res.text).toContain('familia Myrtaceae');
  });

  it('anti-FP: enumeración CORRECTA "familia Passifloraceae, como el maracuyá y la gulupa" no dispara', () => {
    const res = guardFabricatedBotanicalFamily(
      'La familia Passifloraceae, como el maracuyá, la gulupa y la granadilla, agrupa trepadoras.',
    );
    expect(res.modified).toBe(false);
  });

  it('anti-FP comparativo: "…familia Rosaceae. Se maneja como la papa" (sin puente "familia") no dispara', () => {
    const res = guardFabricatedBotanicalFamily(
      'La fresa es de la familia Rosaceae. Se maneja en camas altas como la papa.',
    );
    expect(res.modified).toBe(false);
  });

  it('anti-FP: "frutas como la guayaba y el maracuyá" (sin nombre de familia) no dispara', () => {
    const res = guardFabricatedBotanicalFamily('Cultivamos frutas como la guayaba y el maracuyá en la finca.');
    expect(res.modified).toBe(false);
  });
});

describe('guardFabricatedBotanicalFamily — integración en applyOutputGuards', () => {
  it('early-return: reemplaza el cuerpo y registra la razón', () => {
    const out = applyOutputGuards('El plátano es de la familia Passifloraceae y da racimos.', {
      userMessage: '¿a qué familia pertenece el plátano?',
    });
    expect(out.modified).toBe(true);
    expect(out.text).toContain('familia Musaceae');
    expect(out.text).not.toContain('racimos');
    expect(out.reasons.some((r) => r.includes('familia_botanica_fabricada'))).toBe(true);
  });

  it('telemetría: incrementa el contador fabricated_botanical_family', () => {
    guardFabricatedBotanicalFamily('La morera es Rosaceae.');
    expect(getOutputGuardTelemetry().fabricated_botanical_family).toBe(1);
  });

  it('múltiples contradicciones en un texto se listan juntas', () => {
    const res = guardFabricatedBotanicalFamily(
      'La guayaba pertenece a Passifloraceae. La morera es Rosaceae.',
    );
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Myrtaceae');
    expect(res.text).toContain('Moraceae');
  });
});

describe('familias correctas de la tabla curada (proyección verificada del catálogo)', () => {
  // La tabla FAMILIA_CANON_SPECIES es la proyección de familia_botanica
  // (HAS_FAMILY) del catálogo Chagra, verificada contra catalog/*.json (cero
  // familias contradictorias). Estos casos ejercen el guard como oráculo de la
  // familia REAL para las especies-clave y protegen contra regresiones si algún
  // día la tabla se edita por error.
  const REAL = {
    'la guayaba': 'Myrtaceae', 'el plátano': 'Musaceae', 'la morera': 'Moraceae',
    'el maracuyá': 'Passifloraceae', 'la fresa': 'Rosaceae', 'el tomate': 'Solanaceae',
    'el aguacate': 'Lauraceae', 'el mango': 'Anacardiaceae', 'el cacao': 'Malvaceae',
    'la yuca': 'Euphorbiaceae', 'el chontaduro': 'Arecaceae', 'la papaya': 'Caricaceae',
  };
  const PROBE = {
    'la guayaba': 'La guayaba pertenece a Fabaceae.',
    'el plátano': 'El plátano pertenece a Fabaceae.',
    'la morera': 'La morera pertenece a Fabaceae.',
    'el maracuyá': 'El maracuyá pertenece a Rosaceae.',
    'la fresa': 'La fresa pertenece a Fabaceae.',
    'el tomate': 'El tomate pertenece a Fabaceae.',
    'el aguacate': 'El aguacate pertenece a Fabaceae.',
    'el mango': 'El mango pertenece a Fabaceae.',
    'el cacao': 'El cacao pertenece a Fabaceae.',
    'la yuca': 'La yuca pertenece a Fabaceae.',
    'el chontaduro': 'El chontaduro pertenece a Fabaceae.',
    'la papaya': 'La papaya pertenece a Fabaceae.',
  };
  for (const [display, fam] of Object.entries(REAL)) {
    it(`${display} → familia real ${fam}`, () => {
      const res = guardFabricatedBotanicalFamily(PROBE[display]);
      expect(res.modified).toBe(true);
      expect(res.text).toContain(`familia ${fam}`);
    });
  }
});
