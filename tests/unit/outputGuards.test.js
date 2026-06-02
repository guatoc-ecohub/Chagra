/**
 * outputGuards.test.js — tests unitarios para guardInvertedViability (#1240).
 *
 * Foco: HOTFIX del bug anti-alucinación donde `fincaAltitud === null` (finca sin
 * altitud configurada / geolocalización fallida) hacía que `Number(null) === 0`
 * tratara la finca como 0 msnm. En la rama de fallback-por-rango eso marcaba
 * cultivos de MONTAÑA como "inviable a 0 msnm" en FALSO, y como #1237 hizo que el
 * guard REEMPLACE el texto del modelo, borraba respuestas correctas.
 *
 * Sigue el patrón de tests/unit/setup.js y usa Vitest.
 */
import { describe, it, expect } from 'vitest';
import {
  guardInvertedViability,
  guardSpeciesSubstitution,
  guardCompanionBinomial,
  classifyQueryIntent,
  applyOutputGuards,
} from '../../src/services/outputGuards.js';

describe('guardInvertedViability — altitud null (HOTFIX #1240)', () => {
  it('1) altitud null + especie de montaña SIN viabilidad autoritativa → NO dispara', () => {
    // Especie de montaña (banda 1800–2600 msnm). Sin campo `viabilidad`, el guard
    // cae al fallback-por-rango. Con altitud null NO debe inventar "inviable a 0 msnm".
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'curuba',
        altitud_min: 1800,
        altitud_max: 2600,
        // sin `viabilidad`: fuerza la rama de fallback-por-rango
      },
    ];
    const texto = 'La curuba es buena para tu zona, puedes sembrarla sin problema.';
    const res = guardInvertedViability(texto, entities, null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('2) altitud null + especie con viabilidad:"inviable" autoritativa → SÍ corrige', () => {
    // La rama autoritativa NO depende de la altitud: si el grafo ya dictaminó
    // 'inviable', el guard debe corregir aunque la altitud sea null.
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'curuba',
        viabilidad: 'inviable',
        altitud_min: 1800,
        altitud_max: 2600,
        alternativas_viables: ['lulo', 'mora'],
      },
    ];
    const texto = 'La curuba es excelente para tu finca, puedes sembrarla este invierno.';
    const res = guardInvertedViability(texto, entities, null);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Corrección importante');
    expect(res.text).toContain('curuba');
    expect(res.text).toContain('NO es viable');
    // Sin altitud no debe inventar "a 0 msnm".
    expect(res.text).not.toContain('0 msnm');
    expect(res.text).not.toContain('msnm');
    expect(res.reason).toMatch(/viabilidad_invertida/);
  });

  it('3) altitud 2580 válida + especie inviable por banda → sigue corrigiendo (no-regresión)', () => {
    // Finca a 2580 msnm; especie de tierra caliente (0–1000) → fuera de banda por
    // >300m → inviable por fallback. Debe seguir corrigiendo con la altitud real.
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'cacao',
        altitud_min: 0,
        altitud_max: 1000,
        // sin `viabilidad`: usa el fallback-por-rango con la altitud real
      },
    ];
    const texto = 'El cacao es ideal para tu finca, deberías sembrarlo ya.';
    const res = guardInvertedViability(texto, entities, 2580);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Corrección importante');
    expect(res.text).toContain('cacao');
    expect(res.text).toContain('NO es viable');
    // Con altitud válida SÍ menciona los msnm reales.
    expect(res.text).toContain('2580 msnm');
    expect(res.reason).toMatch(/viabilidad_invertida/);
  });
});

describe('guardSpeciesSubstitution — prosa española NO es binomio (fix 2026-06-02)', () => {
  // Caso real prod (query de precio "¿a cómo está la papa?"): el guard tomaba
  // "Sin embargo", "Estos cultivos", "Marzano debido" como binomios foráneos y
  // emitía "...es X, no Sin embargo". El gate _looksLikeLatinBinomial lo corta.
  it('1) "Sin embargo" / "Estos cultivos" NO disparan corrección', () => {
    const entities = [
      { kind: 'species', nombre_comun: 'aliso andino', nombre_cientifico: 'Alnus acuminata' },
    ];
    const texto =
      'El aliso andino es un buen árbol de sombra. Sin embargo, necesita suelo húmedo. ' +
      'Estos cultivos conviven bien con él.';
    const res = guardSpeciesSubstitution(texto, entities, null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.text).not.toContain('Sin embargo. Ese');
    expect(res.text).not.toContain('no Sin');
  });

  it('2) binomio foráneo REAL (Passiflora tripartita atribuido al lulo) SÍ corrige', () => {
    // No-regresión: el caso para el que se diseñó el guard sigue funcionando.
    // A10: el culprit debe ser un binomio REAL conocido por el grounding. Aquí la
    // curuba=Passiflora tripartita está en el universo (otra entidad resuelta),
    // así que atribuírselo al lulo SÍ es una confusión entre especies reales.
    const entities = [
      { kind: 'species', nombre_comun: 'lulo', nombre_cientifico: 'Solanum quitoense' },
      { kind: 'species', nombre_comun: 'curuba', nombre_cientifico: 'Passiflora tripartita' },
    ];
    const texto =
      'El lulo es una fruta andina; su nombre científico es Passiflora tripartita y ' +
      'se da bien en clima frío.';
    const res = guardSpeciesSubstitution(texto, entities, null);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Corrección importante');
    expect(res.text).toContain('Solanum quitoense');
    expect(res.reason).toMatch(/sustituci/);
  });
});

describe('guardSpeciesSubstitution — A10: culprit debe ser binomio REAL del catálogo', () => {
  // Doctrina A10: el guard corrige confusiones entre especies REALES
  // (lulo→Passiflora tripartita), no prosa latino-plausible. Un par
  // "Género epíteto" que NO existe en el universo del grounding se trata como
  // sospechoso de prosa y NO dispara (conservador).
  it('1) binomio inventado/no-catálogo (Quercus inventus) NO dispara', () => {
    const entities = [
      { kind: 'species', nombre_comun: 'lulo', nombre_cientifico: 'Solanum quitoense' },
    ];
    const texto =
      'El lulo es una fruta andina; algunos lo confunden con Quercus inventus, ' +
      'que no existe en nuestro catálogo.';
    const res = guardSpeciesSubstitution(texto, entities, null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('2) culprit REAL presente como companion del grounding SÍ dispara', () => {
    // Passiflora tripartita entra al universo como companion de otra entidad.
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'lulo',
        nombre_cientifico: 'Solanum quitoense',
        companions: [{ nombre_comun: 'curuba', nombre_cientifico: 'Passiflora tripartita' }],
      },
    ];
    const texto =
      'El lulo se llama científicamente Passiflora tripartita según algunos.';
    const res = guardSpeciesSubstitution(texto, entities, null);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Solanum quitoense');
  });
});

describe('guardCompanionBinomial — A10: culprit debe ser binomio REAL del catálogo', () => {
  it('1) binomio inventado atribuido a un companion NO dispara', () => {
    // "Nogal andino" es companion (Juglans neotropica). Si el texto le atribuye
    // un binomio que NO existe en el universo del grounding, es prosa/alucinación
    // sin referente real → conservador, no corrige.
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'papa',
        nombre_cientifico: 'Solanum tuberosum',
        antagonists: [{ nombre_comun: 'nogal andino', nombre_cientifico: 'Juglans neotropica' }],
      },
    ];
    const texto = 'El nogal andino (Quercus inexistente) le compite a la papa por luz.';
    const res = guardCompanionBinomial(texto, entities, null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('2) culprit REAL (otro binomio del catálogo) sustituido SÍ dispara', () => {
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'papa',
        nombre_cientifico: 'Solanum tuberosum',
        antagonists: [
          { nombre_comun: 'nogal andino', nombre_cientifico: 'Juglans neotropica' },
          { nombre_comun: 'aliso', nombre_cientifico: 'Alnus acuminata' },
        ],
      },
    ];
    // Le atribuye al nogal andino el binomio del aliso (real, en el universo).
    const texto = 'El nogal andino (Alnus acuminata) le compite a la papa por luz.';
    const res = guardCompanionBinomial(texto, entities, null);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Juglans neotropica');
  });
});

describe('classifyQueryIntent — A12: detección de intención del usuario', () => {
  it('precio: "¿a cómo está la papa?" → precio', () => {
    expect(classifyQueryIntent('¿a cómo está la papa?')).toBe('precio');
  });
  it('precio: "cuánto vale el lulo en el mercado" → precio', () => {
    expect(classifyQueryIntent('cuánto vale el lulo en el mercado')).toBe('precio');
  });
  it('precio: "dónde puedo vender mi cosecha de papa" → precio', () => {
    expect(classifyQueryIntent('dónde puedo vender mi cosecha de papa')).toBe('precio');
  });
  it('siembra: "¿siembro papa a 1923 msnm?" → siembra', () => {
    expect(classifyQueryIntent('¿siembro papa a 1923 msnm?')).toBe('siembra');
  });
  it('siembra: "qué cultivo para mi finca" con verbo de siembra → siembra', () => {
    expect(classifyQueryIntent('quiero cultivar tomate en mi finca')).toBe('siembra');
  });
  it('info general sin verbo de siembra → no es siembra', () => {
    expect(classifyQueryIntent('qué es la papa criolla')).not.toBe('siembra');
  });
  it('vacío/null → unknown (conservador)', () => {
    expect(classifyQueryIntent('')).toBe('unknown');
    expect(classifyQueryIntent(null)).toBe('unknown');
  });
});

describe('applyOutputGuards — A12: gating por intención (cierra el bug prod 2026-06-02)', () => {
  // Bug real: "¿a cómo está la papa?" (precio) disparaba cascada de guards de
  // siembra (4× "NO es viable a 1923 msnm", una por variedad). Con el userMessage
  // de PRECIO ploma'o, los guards de siembra NO corren.
  const variedadesPapa = [
    { kind: 'species', nombre_comun: 'Papa criolla', viabilidad: 'inviable', nombre_cientifico: 'Solanum phureja' },
    { kind: 'species', nombre_comun: 'Papa Sabanera', viabilidad: 'inviable', nombre_cientifico: 'Solanum tuberosum' },
  ];
  const respuestaModelo =
    'La papa criolla es buena para sembrar y la papa sabanera también puedes cultivarla. ' +
    'Ambas se dan bien en tu zona.';

  it('query de PRECIO → NO dispara viabilidad aunque el modelo mencione variedades', () => {
    const res = applyOutputGuards(respuestaModelo, {
      resolvedEntities: variedadesPapa,
      fincaAltitud: 1923,
      userMessage: '¿a cómo está la papa?',
    });
    expect(res.text).not.toContain('NO es viable');
    expect(res.reasons.join(' ')).not.toMatch(/viabilidad/);
  });

  it('query de SIEMBRA → SÍ dispara viabilidad (no-regresión protección)', () => {
    const res = applyOutputGuards(respuestaModelo, {
      resolvedEntities: variedadesPapa,
      fincaAltitud: 1923,
      userMessage: '¿siembro papa a 1923 msnm?',
    });
    expect(res.modified).toBe(true);
    // A11: 2 variedades de papa → un bloque agrupado ("NO son viables").
    expect(res.text).toMatch(/NO (es|son) viable/);
    expect(res.text).toContain('Corrección importante');
    expect(res.reasons.join(' ')).toMatch(/viabilidad/);
  });

  it('sin userMessage → corre los guards (conservador, no rompe protección)', () => {
    const res = applyOutputGuards(respuestaModelo, {
      resolvedEntities: variedadesPapa,
      fincaAltitud: 1923,
    });
    expect(res.modified).toBe(true);
    expect(res.text).toMatch(/NO (es|son) viable/);
    expect(res.text).toContain('Corrección importante');
  });

  it('query de PRECIO → SÍ deja correr guard de agroquímico (inofensivo/safety)', () => {
    const respConGlifosato =
      'Para la papa puedes aplicar glifosato en las malezas antes de la siembra.';
    const res = applyOutputGuards(respConGlifosato, {
      resolvedEntities: variedadesPapa,
      fincaAltitud: 1923,
      userMessage: '¿a cómo está la papa?',
    });
    expect(res.modified).toBe(true);
    expect(res.reasons.join(' ')).toMatch(/agroqu[ií]mico/);
  });
});

describe('guardInvertedViability — A11: de-dup de variedades de la misma base', () => {
  // Cuando hay varias VARIEDADES de la misma especie base (papa criolla,
  // sabanera, pastusa…) todas inviables, colapsar en UN solo bloque en vez de
  // emitir N "Corrección importante: X NO es viable" repetidos.
  it('4 variedades de papa inviables → UN solo bloque de corrección', () => {
    const entities = [
      { kind: 'species', nombre_comun: 'Papa criolla', viabilidad: 'inviable', nombre_cientifico: 'Solanum phureja', alternativas_viables: ['arveja'] },
      { kind: 'species', nombre_comun: 'Papa Sabanera', viabilidad: 'inviable', nombre_cientifico: 'Solanum tuberosum' },
      { kind: 'species', nombre_comun: 'Papa Pastusa', viabilidad: 'inviable', nombre_cientifico: 'Solanum tuberosum' },
      { kind: 'species', nombre_comun: 'Papa Argentina', viabilidad: 'inviable', nombre_cientifico: 'Solanum tuberosum' },
    ];
    const texto =
      'La papa criolla es buena para sembrar, la papa sabanera también puedes cultivarla, ' +
      'la papa pastusa se da bien y la papa argentina es recomendable para tu finca.';
    const res = guardInvertedViability(texto, entities, 1923);
    expect(res.modified).toBe(true);
    // Un solo "Corrección importante" (no cuatro).
    const ocurrencias = (res.text.match(/Corrección importante/g) || []).length;
    expect(ocurrencias).toBe(1);
    // El bloque agrupa por nombre base "papa".
    expect(res.text.toLowerCase()).toContain('papa');
    expect(res.text).toContain('NO');
  });

  it('especies de bases distintas → un bloque por base', () => {
    const entities = [
      { kind: 'species', nombre_comun: 'Papa criolla', viabilidad: 'inviable', nombre_cientifico: 'Solanum phureja' },
      { kind: 'species', nombre_comun: 'cacao', viabilidad: 'inviable', nombre_cientifico: 'Theobroma cacao' },
    ];
    const texto =
      'La papa criolla es buena para sembrar y el cacao es ideal para tu finca, siémbralo ya.';
    const res = guardInvertedViability(texto, entities, 2580);
    expect(res.modified).toBe(true);
    const ocurrencias = (res.text.match(/Corrección importante/g) || []).length;
    expect(ocurrencias).toBe(2);
  });
});
