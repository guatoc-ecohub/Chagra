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
  guardReforestacionNativasRol,
  applyOutputGuards,
  guardDoseWithoutSource,
  guardThermalViability,
  guardInventedName,
  guardParamoNormativa,
  guardClimaConsejo,
} from '../../src/services/outputGuards.js';
import {
  generateSourceCitationRules,
  generateViabilityRules,
} from '../../src/services/agentService.js';

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


describe('guardReforestacionNativasRol — sugerencia POSITIVA de nativas con rol (DR-RESTAURACION-INCENDIOS)', () => {
  // Lado positivo del guard de restauración: ante una pregunta genérica de
  // reforestación/restauración SIN especies concretas, sugiere nativas agrupadas
  // por rol (pioneras, fijadoras de N, cortafuego, ancla por rebrote).
  it('query genérica de reforestación → anexa nativas con rol', () => {
    const userMessage = '¿Qué siembro para reforestar mi finca quemada?';
    const respuesta = 'Buena idea recuperar el bosque. Prepara el terreno y siembra al inicio de lluvias.';
    const res = guardReforestacionNativasRol(respuesta, { userMessage });
    expect(res.modified).toBe(true);
    expect(res.reason).toBe('reforestacion_nativas_rol');
    const lower = res.text.toLowerCase();
    // Roles presentes.
    expect(lower).toContain('pioner');
    expect(lower).toContain('fijador');
    expect(lower).toContain('cortafuego');
    expect(lower).toContain('rebrote');
    // Especies clave del consolidado.
    expect(res.text).toContain('Alnus acuminata');
    expect(res.text).toContain('Quercus humboldtii');
    expect(res.text).toContain('Clusia multiflora');
    // Dato cuantitativo del aliso.
    expect(res.text).toContain('280');
    // Conserva el texto original.
    expect(res.text).toContain('recuperar el bosque');
  });

  it('query genérica con vocablo campesino ("recuperar el monte") → dispara', () => {
    const userMessage = 'quiero volver a recuperar el monte que se quemó, qué hago';
    const res = guardReforestacionNativasRol('Vamos a ayudarte con eso.', { userMessage });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Trichanthera gigantea');
  });

  it('query AGRÍCOLA normal (no restauración) → NO toca el texto', () => {
    const userMessage = '¿qué le echo a la papa para el gusano?';
    const respuesta = 'Para el gusano de la papa usa Bacillus thuringiensis y monitoreo del foco.';
    const res = guardReforestacionNativasRol(respuesta, { userMessage });
    expect(res.modified).toBe(false);
    expect(res.text).toBe(respuesta);
  });

  it('sin userMessage → no-op (fail-closed)', () => {
    const res = guardReforestacionNativasRol('Texto cualquiera sobre árboles.', {});
    expect(res.modified).toBe(false);
  });

  it('idempotente: no re-dispara si la nota ya está', () => {
    const userMessage = 'reforestar nacimiento de agua';
    const res1 = guardReforestacionNativasRol('Recupera el nacimiento.', { userMessage });
    expect(res1.modified).toBe(true);
    const res2 = guardReforestacionNativasRol(res1.text, { userMessage });
    expect(res2.modified).toBe(false);
    expect(res2.text).toBe(res1.text);
  });

  it('anti-redundancia: respuesta que YA da nativas con rol → no anexa', () => {
    const userMessage = '¿cómo restauro el bosque nativo?';
    const respuesta =
      'Usa especies pioneras como Alnus acuminata (aliso) que fija nitrógeno, ' +
      'y de cortafuego Clusia multiflora; el roble (Quercus humboldtii) rebrota tras el fuego.';
    const res = guardReforestacionNativasRol(respuesta, { userMessage });
    expect(res.modified).toBe(false);
    expect(res.text).toBe(respuesta);
  });

  it('applyOutputGuards: query reforestación genérica → incluye la sugerencia y reason', () => {
    const userMessage = 'necesito reforestar una ladera erosionada, qué especies nativas uso';
    const respuesta = 'Empieza por estabilizar el suelo de la ladera.';
    const out = applyOutputGuards(respuesta, { userMessage });
    expect(out.modified).toBe(true);
    expect(out.reasons).toContain('reforestacion_nativas_rol');
    expect(out.text).toContain('Alnus acuminata');
  });

  it('applyOutputGuards: query agrícola normal → la sugerencia NO aparece', () => {
    const userMessage = '¿a cómo está la papa en la plaza?';
    const respuesta = 'La papa está por el orden de los 80 mil el bulto esta semana.';
    const out = applyOutputGuards(respuesta, { userMessage });
    expect(out.reasons).not.toContain('reforestacion_nativas_rol');
    expect(out.text).not.toContain('🌱 Para restaurar con nativas');
  });
});

// ============================================================================
// TASK #6234 — Expansión cobertura anti-alucinación
// ============================================================================

describe('generateSourceCitationRules — (a) especie inventada NO se describe', () => {
  it('contiene regla explícita de NO describir especie desconocida', () => {
    const rules = generateSourceCitationRules();
    expect(rules).not.toBe('');
    // Debe mencionar explícitamente la regla de especie desconocida
    expect(rules).toMatch(/especie desconocida|NO aparece.*catálogo/);
    // Wording endurecido (#95): PROHÍBE describir/manejar la especie desconocida.
    expect(rules).toMatch(/PROHIBIDO.*(descripci[oó]n|manejo|usos)|NO improvises|[Ii]nventar.*(manejo|descripci[oó]n)/);
  });

  it('contiene regla de NO inventar nombres científicos (binomios)', () => {
    const rules = generateSourceCitationRules();
    expect(rules).toMatch(/binomio|nombre científico/);
    expect(rules).toMatch(/NO inventes|inventarlo por similitud/);
    // Menciona el incidente prod 2026-05-30
    expect(rules).toMatch(/2026-05-30|tomate de árbol|cherry/);
  });

  it('contiene regla de citar fuentes para datos técnicos', () => {
    const rules = generateSourceCitationRules();
    expect(rules).toMatch(/cita.*origen|citar su fuente|fuente verificable/);
    expect(rules).toMatch(/Restrepo|ICA|Agrosavia|IDEAM|SENA/);
  });

  it('instruye declinar honestamente cuando NO hay fuente', () => {
    const rules = generateSourceCitationRules();
    expect(rules).toMatch(/No tengo fuente confiable|técnico local|agrónomo/);
  });
});

describe('generateViabilityRules — (c) viabilidad fuera de rango altitudinal', () => {
  it('contiene instrucción de usar datos de grounding para viabilidad', () => {
    const rules = generateViabilityRules();
    expect(rules).not.toBe('');
    // Debe mencionar que se basa en el grounding (altitud_min/altitud_max)
    expect(rules).toMatch(/altitud_min|altitud_max|grounding|catálogo/);
  });

  it('contiene regla de declinar honestamente cuando fuera de rango', () => {
    const rules = generateViabilityRules();
    // La regla debe mencionar que se debe declinar con honestidad
    expect(rules).toMatch(/honestidad|probabilidad de éxito muy baja|FUERA/);
    // Debe mencionar que se dan alternativas
    expect(rules).toMatch(/alternativas viables/);
  });

  it('contiene advertencia de NO afirmar sin rango (null)', () => {
    const rules = generateViabilityRules();
    // Sin rango no debe afirmar nada
    expect(rules).toMatch(/Sin rango|NO afirmes/);
  });

  it('contiene instrucción de NO inventar especies ni viabilidad', () => {
    const rules = generateViabilityRules();
    // No debe inventar especies ni viabilidad
    expect(rules).toMatch(/NUNCA inventes.*especies|NUNCA inventes.*viabilidad|inventes.*especies.*inventes.*viabilidad/);
  });
});

describe('guardDoseWithoutSource — (b) dosis específica sin fuente', () => {
  it('NO modifica si la dosis YA trae cita de fuente', () => {
    const textoConFuente =
      'Aplica 5 ml/L de Glifosato según ICA Resolución 1234 para malezas.';
    const res = guardDoseWithoutSource(textoConFuente);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(textoConFuente);
    expect(res.reason).toBeNull();
  });

  it('NO modifica si no hay patrones de dosis numérica', () => {
    const textoSinDosis = 'Usa abono orgánico y compost para mejorar el suelo.';
    const res = guardDoseWithoutSource(textoSinDosis);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(textoSinDosis);
  });

  it('ANEXA nota de cautela si hay dosis SIN fuente', () => {
    const textoSinFuente =
      'Aplica 5 ml/L de este producto para controlar la plaga.';
    const res = guardDoseWithoutSource(textoSinFuente);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('confirma la dosis');
    expect(res.text).toContain('etiqueta');
    expect(res.text).toContain('técnico agrícola local');
    expect(res.reason).toMatch(/dosis_sin_fuente/);
  });

  it('detecta múltiples patrones de dosis (ml, g, kg, l)', () => {
    const dosisCompuesta =
      'Usa 2 g por planta, 10 ml/L de caldo, y 50 kg/ha de fertilizante.';
    const res = guardDoseWithoutSource(dosisCompuesta);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('confirma la dosis');
    // El reason debe mencionar al menos algunas de las dosis detectadas
    expect(res.reason).toMatch(/dosis_sin_fuente/);
  });

  it('es idempotente: NO re-anexa la nota si ya está', () => {
    const textoConNota =
      'Aplica 5 ml/L del producto.\n\nNota sobre las dosis: confirma la dosis exacta con la etiqueta';
    const res = guardDoseWithoutSource(textoConNota);
    expect(res.modified).toBe(false);
    // No debería duplicar la nota
    const ocurrencias = (res.text.match(/Nota sobre las dosis/g) || []).length;
    expect(ocurrencias).toBe(1);
  });
});

describe('guardInventedName — (a) especie de nombre común inventada', () => {
  it('NO dispara si el texto NO menciona nombre de perfil', () => {
    const texto = 'El café es un cultivo importante para Colombia.';
    const res = guardInventedName(texto, { profileName: 'Juan Pérez' });
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
  });

  it('NO dispara si el nombre mencionado COINCIDE con el perfil', () => {
    const texto = 'Juan, tu finca está bien manejada.';
    const res = guardInventedName(texto, { profileName: 'Juan' });
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
  });

  it('test.skip — nombre inventado mencionado (hueco conocido)', () => {
    // Este caso documenta el comportamiento esperado cuando el modelo
    // menciona una especie con nombre común inventado (ej: "quirubanto andino").
    // El guard DEBERÍA detectarlo y corregirlo, pero si hoy no lo hace,
    // lo marcamos como .skip con TODO-Opus.
    // TODO-Opus: Implementar detección de nombres comunes inventados que no
    // están en el catálogo de especies conocidas.
    // Esperado: el guard debe anexar nota de que no reconoce esa especie.
  });
});

describe('guardThermalViability — (c) viabilidad térmica fuera de rango', () => {
  it('NO dispara sin datos de pronóstico térmico', () => {
    const texto = 'El tomate se siembra en clima cálido.';
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'tomate',
        temp_min: 15,
        temp_max: 30,
      },
    ];
    const res = guardThermalViability(texto, entities);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
  });

  it('NO dispara si la especie NO se está fomentando para siembra', () => {
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'papa',
        temp_min: 10,
        temp_max: 25,
      },
    ];
    // Texto neutral que describe la papa pero NO la fomenta para siembra
    const texto = 'La papa pertenece a la familia Solanaceae.';
    const res = guardThermalViability(texto, entities, null, {
      forecastTempMin: 5,
      forecastTempMax: 28,
    });
    expect(res.modified).toBe(false);
  });

  it('ANEXA advertencia si pronóstico riesgo de helada', () => {
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'tomate',
        temp_min: 18,
        temp_max: 30,
      },
    ];
    // Texto que claramente fomenta la siembra
    const texto = 'Puedes sembrar tomate en este ciclo, es ideal.';
    const res = guardThermalViability(texto, entities, null, {
      forecastTempMin: 15, // Bajo el margen de 18°C (2°C de margen = 20°C)
      forecastTempMax: 25,
    });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('riesgo de helada');
    expect(res.text).toContain('tomate');
    expect(res.reason).toMatch(/viabilidad_térmica/);
  });

  it('ANEXA advertencia si pronóstico riesgo de golpe de calor', () => {
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'papa',
        temp_min: 10,
        temp_max: 22,
      },
    ];
    const texto = 'La papa se siembra en este ciclo.';
    const res = guardThermalViability(texto, entities, null, {
      forecastTempMin: 15,
      forecastTempMax: 26, // Sobre el margen de 22°C
    });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('riesgo de golpe de calor');
    expect(res.text).toContain('papa');
    expect(res.reason).toMatch(/viabilidad_térmica/);
  });

  it('es idempotente: NO re-advierte si ya está la nota', () => {
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'tomate',
        temp_min: 18,
        temp_max: 30,
      },
    ];
    const textoConNota =
      'El tomate es excelente para sembrar ahora.\n\nOjo con tomate: riesgo de helada...';
    const res = guardThermalViability(textoConNota, entities, null, {
      forecastTempMin: 15,
      forecastTempMax: 25,
    });
    expect(res.modified).toBe(false);
  });
});

describe('Integration — (a)+(b)+(c) combinados anti-alucinación', () => {
  it('applyOutputGuards: respuesta con dosis sin fuente + especie inventada', () => {
    const userMessage = '¿qué le echo al quirubanto andino?';
    const respuesta = 'Aplica 5 ml/L de fungicida al quirubanto andino cada 8 días.';
    const entities = []; // No hay especies resueltas (nombre inventado)
    const out = applyOutputGuards(respuesta, {
      resolvedEntities: entities,
      fincaAltitud: 2000,
      userMessage,
    });
    // Debe anexar nota de dosis
    expect(out.text).toContain('confirma la dosis');
    // NO debe afirmar datos sobre la especie inventada
    // (este comportamiento depende de generateSourceCitationRules en el prompt)
  });

  it('applyOutputGuards: viabilidad invertida + dosis sin fuente', () => {
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'cacao',
        viabilidad: 'inviable',
        altitud_min: 0,
        altitud_max: 1000,
        nombre_cientifico: 'Theobroma cacao',
      },
    ];
    const respuesta =
      'El cacao es ideal para tu finca a 2500 msnm. Aplica 10 kg/ha de fertilizante.';
    const out = applyOutputGuards(respuesta, {
      resolvedEntities: entities,
      fincaAltitud: 2500,
      userMessage: '¿siembro cacao?',
    });
    // Debe corregir viabilidad invertida
    expect(out.text).toContain('NO es viable');
    expect(out.text).toContain('cacao');
    // Debe anexar nota de dosis
    expect(out.text).toContain('confirma la dosis');
    expect(out.reasons).toHaveLength(2);
  });

  it('test.skip — especie inventada descrita con detalles (hueco conocido)', () => {
    // Este caso documenta el hueco donde el modelo Describe una especie
    // inventada con detalles completos (usos, siembra, manejo).
    // Hoy el guard NO detecta esto directamente (el modelo ya violó
    // generateSourceCitationRules).
    // TODO-Opus: Implementar post-validación de especies mencionadas
    // contra el catálogo para detectar descripciones de especies inventadas.
    // Esperado: el post-validator debe marcar "quirubanto andino" como especie
    // desconocida y emitir advertencia en lugar de dejar la descripción pasar.
  });

  it('test.skip — dosis específica inventada sin contexto (hueco conocido)', () => {
    // Este caso documenta cuando el modelo inventa una dosis específica
    // sin ningún contexto de producto ni fuente.
    // TODO-Opus: Mejorar guardDoseWithoutSource para detectar dosis
    // que parecen inventadas por ser demasiado específicas sin contexto
    // (ej: "37.5 ml/L" en vez de "40 ml/L").
    // Esperado: el guard debe ser más estricto con dosis muy específicas.
  });
});

describe('guardParamoNormativa — Ley 1930 (suppress-and-replace)', () => {
  it('1) siembra en páramo → SUPRIME y REEMPLAZA con restricción legal', () => {
    // Caso directo: modelo recomienda sembrar en páramo
    const texto = 'Puedes sembrar papa en el páramo sin problema. El clima es ideal.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).toContain('prohíbe actividades agropecuarias');
    expect(res.text).toContain('Páramo');
    // El texto original NO debe estar presente (suprimido)
    expect(res.text).not.toContain('sembrar papa en el páramo');
    expect(res.text).not.toContain('clima es ideal');
    expect(res.reason).toBe('paramo_normativa_suprimido: siembra/fumigación_recomendada_en_paramo');
  });

  it('2) fumigación en páramo → SUPRIME y REEMPLAZA con restricción legal', () => {
    // Caso de aplicación de pesticidas en páramo
    const texto = 'Aplica este fungicida en tu cultivo del páramo para controlar la plaga.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).toContain('prohíbe');
    expect(res.text).toContain('agroquímicos');
    // El texto original NO debe estar presente
    expect(res.text).not.toContain('Aplica este fungicida');
    expect(res.reason).toBe('paramo_normativa_suprimido: siembra/fumigación_recomendada_en_paramo');
  });

  it('3) frailejón + sembrar → dispara (frailejón es keyword de páramo)', () => {
    // "frailejón" es keyword de páramo
    const texto = 'Planta frailejones para recuperar la zona y siembra papa al lado.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('siembra papa al lado');
  });

  it('4) páramo sin verbo de siembra/fumigación → NO dispara', () => {
    // Menciona páramo pero no recomienda sembrar/fumigar
    const texto = 'Los páramos son ecosistemas de importancia hídrica para Colombia.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('5) siembra/fumigación sin páramo → NO dispara', () => {
    // Recomienda sembrar pero no menciona páramo
    const texto = 'Puedes sembrar papa en tu finca. El clima es ideal.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('6) string vacío → NO dispara', () => {
    const res = guardParamoNormativa('');
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('7) null → NO dispara (graceful degradation)', () => {
    const res = guardParamoNormativa(null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('8) subpáramo + rociado → dispara (subpáramo es keyword)', () => {
    // "subpáramo" también es keyword de ecosistema de páramo
    const texto = 'Rocia fungicida en el subpáramo para proteger las plantas.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('Rocia fungicida');
  });

  it('9) cultivo en zona de páramo → dispara', () => {
    // "zona de páramo" también es keyword
    const texto = 'Cultiva cebolla en la zona de páramo con riego constante.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('Cultiva cebolla');
  });

  it('10) aspersión de pesticida en páramo → dispara', () => {
    // "aspersión" y "pesticida" son keywords de fumigación
    const texto = 'Realiza aspersión de pesticida en el páramo para controlar plagas.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('aspersión de pesticida');
  });
});

describe('guardClimaConsejo — consejo general de clima (aditivo)', () => {
  it('1) helada mencionada → adiciona consejo climático', () => {
    // Caso simple: texto menciona helada
    const texto = 'Protégete de las heladas nocturnas con cubiertas.';
    const res = guardClimaConsejo(texto, { forecastTempMin: 2 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    expect(res.text).toContain('plan de contingencia');
    // El texto original debe estar presente (aditivo, no suppress)
    expect(res.text).toContain('Protégete de las heladas');
    expect(res.text).toContain('cubiertas');
    expect(res.reason).toBe('clima_consejo_aditivo: condiciones_extremas_detectadas');
  });

  it('2) sequía mencionada → adiciona consejo climático', () => {
    // Caso de sequía
    const texto = 'La sequía está afectando el cultivo. Riega más frecuente.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    // El texto original debe estar presente
    expect(res.text).toContain('La sequía está afectando');
    expect(res.text).toContain('Riega más frecuente');
  });

  it('3) forecastTempMin < 5°C → adiciona consejo específico', () => {
    // Temperatura muy baja en pronóstico
    const texto = 'Las heladas pueden dañar las plantas jóvenes.';
    const res = guardClimaConsejo(texto, { forecastTempMin: 3 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Pronóstico: se esperan temperaturas bajas');
    expect(res.text).toContain('3.0°C');
    expect(res.text).toContain('proteger cultivos sensibles');
  });

  it('4) forecastTempMax > 32°C → adiciona consejo específico', () => {
    // Temperatura muy alta en pronóstico
    const texto = 'El calor extremo puede estrés hídrico.';
    const res = guardClimaConsejo(texto, { forecastTempMax: 34 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Pronóstico: se esperan temperaturas altas');
    expect(res.text).toContain('34.0°C');
    expect(res.text).toContain('Asegura riego suficiente');
    expect(res.text).toContain('sombreado temporal');
  });

  it('5) fenómeno del Niño mencionado → adiciona consejo', () => {
    // Fenómeno climático específico
    const texto = 'El fenómeno del Niño reduce las lluvias en la región.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    // El texto original debe estar presente
    expect(res.text).toContain('El fenómeno del Niño reduce');
  });

  it('6) texto sin clima extremo → NO dispara', () => {
    // Texto normal sin condiciones extremas
    const texto = 'El cultivo de papa se da bien en clima frío.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('7) string vacío → NO dispara', () => {
    const res = guardClimaConsejo('', {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('8) null → NO dispara (graceful degradation)', () => {
    const res = guardClimaConsejo(null, {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('9) texto con consejo ya aplicado → NO re-dispara (idempotencia)', () => {
    // Si el texto ya incluye el consejo, no debe aplicarlo de nuevo
    const texto =
      'Las heladas pueden dañar las plantas.\n\n💡 Consejo climático\n\nMonitorear los pronósticos locales (IDEAM o meteoblue) regularmente.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('10) ola de calor mencionada → adiciona consejo', () => {
    // Caso de ola de calor
    const texto = 'La ola de calor está provocando estrés en los cultivos.';
    const res = guardClimaConsejo(texto, { forecastTempMax: 35 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Pronóstico: se esperan temperaturas altas');
    expect(res.text).toContain('35.0°C');
    // El texto original debe estar presente
    expect(res.text).toContain('La ola de calor está provocando');
  });

  it('11) variabilidad climática mencionada → adiciona consejo', () => {
    // Caso de variabilidad climática
    const texto = 'La variabilidad climática afecta los ciclos de cosecha.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    expect(res.text).toContain('plan de contingencia');
  });

  it('12) inundación mencionada → adiciona consejo', () => {
    // Caso de inundación
    const texto = 'La inundación dañó el cultivo en la zona baja.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
  });
});
