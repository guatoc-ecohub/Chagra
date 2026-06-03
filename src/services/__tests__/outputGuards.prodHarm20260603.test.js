/**
 * outputGuards.prodHarm20260603.test.js — PACK de fixes de DAÑO en producción
 * (transcript real operador, Choachí 1923 msnm, templado — 2026-06-03).
 *
 * Ground-truth del bug:
 *   Chagra-strategy/ops/PROD-ERRORS-TRANSCRIPT-2026-06-03.md
 *
 * Cubre cinco fallas observadas EN VIVO en la finca del operador:
 *  1. CRÍTICO inverted-viability FALSO-NEGATIVO (#350): papa y fresa a 1923 m
 *     son VIABLES (Choachí es zona papera templada); el guard las marcaba
 *     "NO viable" y desviaba a Daikon/variedades extranjeras. Un staple dentro
 *     de su piso real NUNCA debe marcarse inviable. No-regresión: papa@3500 sí
 *     es inviable (demasiado alto).
 *  2. CRÍTICO agroquímico (#351): "NPK", "urea", "fosfato triple/diamónico",
 *     "sulfato de potasio", "nitrato de amonio" deben disparar el redirect a
 *     abono orgánico/biopreparado/compost.
 *  3. Guard de dominio (#352): consultas off-domain (física/química/matemáticas)
 *     se declinan amable y se redirigen, SIN tool ni grounding falso.
 *  4. Fuga inventario en precio (#347): "bulto/arroba/carga de X" = price_intent
 *     → los guards de siembra y la inyección de finca NO corren.
 *  5. Disclaimer de dosis mal ubicado (#8): en biopreparado CASERO no decir
 *     "confirma con la etiqueta del producto".
 */

import { describe, it, expect } from 'vitest';
import {
  guardInvertedViability,
  guardSyntheticAgrochemical,
  guardOffDomain,
  guardDoseWithoutSource,
  classifyQueryIntent,
  applyOutputGuards,
} from '../outputGuards.js';

// ───────────────────────────────────────────────────────────────────────────
// #1 — inverted-viability FALSO-NEGATIVO: papa/fresa a 1923 m son VIABLES
// ───────────────────────────────────────────────────────────────────────────
describe('#350 inverted-viability falso-negativo (staple en su piso)', () => {
  // El sidecar mal-matcheó la base (ej. "fresa silvestre andina") y devolvió
  // viabilidad:'inviable' con una banda equivocada para un staple templado.
  const papaMalMarcada = {
    kind: 'species',
    mentioned: 'papa',
    nombre_comun: 'papa',
    nombre_cientifico: 'Solanum tuberosum',
    viabilidad: 'inviable', // ← veredicto ERRÓNEO heredado del grounding
    altitud_min: 2500,
    altitud_max: 3500,
    alternativas_viables: ['daikon', 'ajo'],
  };
  const fresaMalMarcada = {
    kind: 'species',
    mentioned: 'fresa',
    nombre_comun: 'fresa',
    nombre_cientifico: 'Fragaria × ananassa',
    viabilidad: 'inviable', // ← matcheó "fresa silvestre andina", banda alta
    altitud_min: 2400,
    altitud_max: 3000,
    alternativas_viables: ['mora', 'uchuva'],
  };

  it('papa a 1923 m NO se marca inviable (Choachí, zona papera templada)', () => {
    const txt = 'En tu finca puedes sembrar papa, es un buen cultivo para la zona.';
    const out = guardInvertedViability(txt, [papaMalMarcada], 1923);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
    expect(out.text).not.toMatch(/no es viable/i);
    // No debe empujar las alternativas extranjeras/absurdas.
    expect(out.text).not.toMatch(/daikon/i);
  });

  it('fresa a 1923 m NO se marca inviable (templado, viable)', () => {
    const txt = 'La fresa se da bien acá, puedes sembrarla en camas altas.';
    const out = guardInvertedViability(txt, [fresaMalMarcada], 1923);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
    expect(out.text).not.toMatch(/no es viable/i);
  });

  it('NO-REGRESIÓN: papa a 3500 m SÍ es inviable (demasiado alto, fuera del piso)', () => {
    const papaAlta = {
      kind: 'species',
      mentioned: 'papa',
      nombre_comun: 'papa',
      nombre_cientifico: 'Solanum tuberosum',
      viabilidad: 'inviable',
      altitud_min: 2000,
      altitud_max: 3000,
      alternativas_viables: ['nabo', 'haba'],
    };
    const txt = 'Puedes sembrar papa en tu parcela, es buena opción.';
    // 3600 está por encima del techo real del staple (3400) → inviable real.
    const out = guardInvertedViability(txt, [papaAlta], 3600);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/NO es viable/i);
  });

  it('NO-REGRESIÓN: el guard sigue corrigiendo un cultivo NO-staple realmente inviable (maracuyá a 2100 m)', () => {
    const maracuya = {
      kind: 'species',
      mentioned: 'maracuyá',
      nombre_comun: 'maracuyá',
      viabilidad: 'inviable',
      altitud_min: 0,
      altitud_max: 1300,
      alternativas_viables: ['gulupa'],
    };
    const txt = 'Es recomendable priorizar la maracuyá en tu finca a 2100 m.';
    const out = guardInvertedViability(txt, [maracuya], 2100);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/NO es viable/i);
    expect(out.text).toMatch(/gulupa/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// #2 — agroquímico: fertilizantes minerales de síntesis (NPK/urea/etc.)
// ───────────────────────────────────────────────────────────────────────────
describe('#351 guardSyntheticAgrochemical cubre fertilizantes minerales de síntesis', () => {
  const casos = [
    ['NPK', 'Para alimentar las fresas aplica NPK 5-10-10 cada quince días.'],
    ['urea', 'Echa urea para que crezca verde y frondoso el tomate.'],
    ['fosfato triple', 'Mezcla fosfato triple con la tierra antes de trasplantar.'],
    ['fosfato diamónico', 'El fosfato diamónico (DAP) le sube el fósforo al cultivo.'],
    ['sulfato de potasio', 'Aplica sulfato de potasio para el cuaje de los frutos.'],
    ['nitrato de amonio', 'Un poco de nitrato de amonio acelera el crecimiento.'],
  ];

  it.each(casos)('dispara y redirige a orgánico ante "%s"', (_label, texto) => {
    const out = guardSyntheticAgrochemical(texto);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/agroquímico_sintético/);
    // Redirige a la ruta agroecológica.
    expect(out.text).toMatch(/agroecol|org[aá]nic|biopreparado|compost|bocashi/i);
  });

  it('receta del transcript (urea + fosfato triple + sulfato de potasio) dispara', () => {
    const receta =
      'Para hacer tu propio NPK casero mezcla urea, fosfato triple y sulfato de potasio ' +
      'en partes iguales y aplícalo a las fresas.';
    const out = guardSyntheticAgrochemical(receta);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/agroquímico_sintético/);
  });

  it('NO-REGRESIÓN: "compost" / "bocashi" (abono orgánico) NO disparan', () => {
    const ok = 'Para alimentar tus fresas usa compost maduro y bocashi, son los mejores abonos.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
  });

  it('NO falso-positivo: "potasio" mencionado como nutriente del suelo, sin la sal de síntesis', () => {
    const ok = 'Las fresas necesitan potasio para el fruto; te lo da la ceniza de leña y la cáscara de banano.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// #3 — guard de DOMINIO: off-domain declina, no inventa tool/grounding
// ───────────────────────────────────────────────────────────────────────────
describe('#352 guardOffDomain — declina consultas fuera de agro', () => {
  it('declina "teoría de cuerdas" (física) sin tool', () => {
    const respuestaFisica =
      'La teoría de cuerdas postula que las partículas elementales son vibraciones ' +
      'de cuerdas unidimensionales en un espacio de 11 dimensiones...';
    const out = guardOffDomain(respuestaFisica, { userMessage: 'explícame la teoría de cuerdas' });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/off_domain/);
    // Declina amable y redirige al dominio agro.
    expect(out.text).toMatch(/cultivo|finca|agro/i);
    // No deja la disertación de física.
    expect(out.text).not.toMatch(/once dimensiones|11 dimensiones|vibraciones de cuerdas/i);
  });

  it('declina "teoría de la relatividad" (física)', () => {
    const out = guardOffDomain('E = mc² describe la equivalencia masa-energía...', {
      userMessage: 'qué es la teoría de la relatividad',
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/off_domain/);
  });

  it('declina química inorgánica pura (sin agro)', () => {
    const out = guardOffDomain('La diferencia entre química orgánica e inorgánica es el carbono...', {
      userMessage: 'diferencia entre química orgánica e inorgánica',
    });
    expect(out.modified).toBe(true);
  });

  it('NO toca una consulta agro normal ("qué siembro en mi finca")', () => {
    const out = guardOffDomain('En tu finca a 1923 m te recomiendo papa, arveja y fresa.', {
      userMessage: '¿qué siembro en mi finca?',
    });
    expect(out.modified).toBe(false);
  });

  it('NO toca consulta de plaga/biopreparado (dominio agro)', () => {
    const out = guardOffDomain('Para el gusano trozador usa Bacillus thuringiensis y trampas.', {
      userMessage: 'cómo controlo el gusano trozador en mis tomates',
    });
    expect(out.modified).toBe(false);
  });

  it('NO actúa sin userMessage (fail-open al resto de la cadena)', () => {
    const out = guardOffDomain('La teoría de cuerdas...', {});
    expect(out.modified).toBe(false);
  });

  it('"química orgánica para mi compost" SÍ es agro (no declina)', () => {
    const out = guardOffDomain('La materia orgánica del compost...', {
      userMessage: 'cómo mejoro la química orgánica de mi compost en la finca',
    });
    expect(out.modified).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// #4 — fuga de inventario en consulta de PRECIO: "bulto/arroba/carga de X"
// ───────────────────────────────────────────────────────────────────────────
describe('#347 price_intent para bulto/arroba/carga', () => {
  it('clasifica "a cómo el bulto de papa" como precio', () => {
    expect(classifyQueryIntent('¿a cómo está el bulto de papa?')).toBe('precio');
  });

  it('clasifica "cuánto vale la arroba de fresa" como precio', () => {
    expect(classifyQueryIntent('¿cuánto vale la arroba de fresa?')).toBe('precio');
  });

  it('clasifica "precio de la carga de papa" como precio', () => {
    expect(classifyQueryIntent('precio de la carga de papa en plaza')).toBe('precio');
  });

  it('"arroba de X" sin más contexto de siembra es precio', () => {
    expect(classifyQueryIntent('la arroba de papa')).toBe('precio');
  });

  it('siembra sigue ganando: "siembro una arroba de papa" → siembra', () => {
    expect(classifyQueryIntent('cuántas semillas siembro por arroba de papa')).toBe('siembra');
  });

  it('en applyOutputGuards: query de precio NO corre el guard de siembra (no inyecta "NO viable")', () => {
    const maracuya = {
      kind: 'species',
      mentioned: 'maracuyá',
      nombre_comun: 'maracuyá',
      viabilidad: 'inviable',
      altitud_min: 0,
      altitud_max: 1300,
      alternativas_viables: ['gulupa'],
    };
    const respuesta = 'La maracuyá es recomendable y se vende bien.';
    const out = applyOutputGuards(respuesta, {
      resolvedEntities: [maracuya],
      fincaAltitud: 2100,
      userMessage: '¿a cómo está la arroba de maracuyá?',
    });
    // El guard de siembra NO corre → no se inyecta el bloque de viabilidad.
    expect(out.text).not.toMatch(/NO es viable/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// #5 — disclaimer de dosis mal ubicado en biopreparado CASERO
// ───────────────────────────────────────────────────────────────────────────
describe('#8 disclaimer de dosis: biopreparado casero no menciona "etiqueta del producto"', () => {
  it('en receta de biopreparado casero, la nota NO dice "etiqueta del producto"', () => {
    const receta =
      'Para el caldo sulfocálcico casero usa 2 kg de azufre por cada 10 litros de agua, ' +
      'hierve 45 minutos y aplica 250 ml por bomba de 20 litros.';
    const out = guardDoseWithoutSource(receta, null, null, {
      userMessage: 'cómo preparo caldo sulfocálcico casero en mi finca',
    });
    expect(out.modified).toBe(true);
    // No hay etiqueta en un preparado casero.
    expect(out.text).not.toMatch(/etiqueta del producto/i);
    // Sí debe orientar a una referencia válida para lo casero (Restrepo / técnico / receta).
    expect(out.text).toMatch(/casero|receta|t[eé]cnico|Restrepo|fuente confiable/i);
  });

  it('en dosis de PRODUCTO comercial, sí puede mencionar la etiqueta', () => {
    const txt = 'Aplica 30 ml por litro de este producto comercial sobre el cultivo.';
    const out = guardDoseWithoutSource(txt, null, null, {
      userMessage: 'qué dosis de fungicida comercial uso',
    });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/etiqueta/i);
  });

  it('NO-REGRESIÓN: sin userMessage el comportamiento previo se conserva (nota genérica)', () => {
    const txt = 'Aplica 5 g por planta del preparado.';
    const out = guardDoseWithoutSource(txt);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/confirma la dosis/i);
  });
});
