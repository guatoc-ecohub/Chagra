/**
 * outputGuards.test.js — GUARDAS DETERMINISTAS sobre la salida del LLM.
 *
 * Contexto: bench 10 prompts complejos (2026-05-30) dio 1/10. El modelo TIENE
 * los hechos en el grounding (resolvedEntities) pero razona mal: invierte
 * viabilidad, INVENTA agroquímicos sintéticos, recomienda invasoras. Estos
 * tests mockean la SALIDA REAL que falló en el bench y verifican que el guard
 * AHORA la corrige (antes→después). Ground-truth:
 *   Chagra-strategy/deepresearch/RESULTADOS_BENCH_10_PROMPTS_2026-05-30.md
 *   Chagra-strategy/deepresearch/TEST_PROMPTS_COMPLEJOS_ROTATIVOS_2026-05-30.json
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardSyntheticAgrochemical,
  guardInvasiveSpecies,
  guardInvertedViability,
  guardDoseWithoutSource,
  guardSpeciesSubstitution,
  applyOutputGuards,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// ──────────────────────────────────────────────────────────────────────────
// GUARD 1 — agroquímico sintético
// ──────────────────────────────────────────────────────────────────────────
describe('guardSyntheticAgrochemical', () => {
  it('CPX-005 (bench): corrige "Mancozeb (M-02) o Metalaxil (M-03)" con códigos inventados', () => {
    const llmFail =
      'El cubio (Tropaeolum tuberosum) con hojas negras tiene tizón. Te recomiendo aplicar ' +
      'Mancozeb (M-02) o Metalaxil (M-03) como fungicida, y para los insectos Cipermetrina (I-05) ' +
      'siguiendo el calendario de aplicación.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/mancozeb|metalaxil|cipermetrina/i);
    // ANTES: recomendaba sintético sin contrapeso. DESPUÉS: anexa ruta orgánica.
    expect(out.text).toMatch(/agroecológico/i);
    expect(out.text).toMatch(/caldo bordelés/i);
  });

  it('CPX-007 (bench): corrige "piretroides, como el pirimex" descritos falsamente como Bt', () => {
    const llmFail =
      'Para el cogollero (Spodoptera frugiperda) puedes usar Bacillus thuringiensis, pero también ' +
      'piretroides, como el pirimex, que son pesticidas biológicos derivados del Bacillus thuringiensis.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/piretroide|pirimex/i);
    expect(out.text).toMatch(/Bacillus thuringiensis|Bt/);
    expect(out.text).toMatch(/agroecológico/i);
  });

  it('CPX-001 (bench): corrige fungicida sistémico "azoxystrobin/estrobilurinas"', () => {
    const llmFail =
      'Para la gota de la chugua aplica fungicidas cúpricos y azoxystrobin (estrobilurinas) ' +
      'como tratamiento.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/azoxystrobin|estrobilurina/i);
  });

  it('NO dispara con la ruta orgánica legítima (caldo bordelés, Bt, neem, cobre)', () => {
    const ok =
      'Para el tizón usa caldo bordelés (cobre) como preventivo, elimina focos enfermos y mejora el ' +
      'drenaje. Para el cogollero, Bacillus thuringiensis (Bt) y extracto de neem.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('NO marca un código tipo "M-02" si NO hay contexto de aplicación/agroquímico', () => {
    const ok = 'La variedad ICA M-02 es resistente. Siémbrala en abril.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
  });

  it('detecta glifosato / paraquat / clorpirifos (denylist herbicida+insecticida)', () => {
    for (const term of ['glifosato', 'paraquat', 'clorpirifos', 'deltametrina', 'imidacloprid']) {
      const out = guardSyntheticAgrochemical(`Aplica ${term} sobre el cultivo.`);
      expect(out.modified, term).toBe(true);
    }
  });

  it('redirige a manejo de plaga cuando el texto habla de gusanos/cogollero', () => {
    const out = guardSyntheticAgrochemical('Para el gusano cogollero aplica cipermetrina.');
    expect(out.text).toMatch(/Bacillus thuringiensis|Bt/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GUARD 2 — invasoras
// ──────────────────────────────────────────────────────────────────────────
describe('guardInvasiveSpecies', () => {
  const retamoEntity = {
    kind: 'species',
    mentioned: 'retamo',
    nombre_comun: 'retamo espinoso',
    nombre_cientifico: 'Ulex europaeus',
    es_invasora: true,
    alternativas_viables: ['chachafruto', 'aliso'],
  };

  it('CPX-006 (bench): corrige "adecuado como cerca viva" + "Si finalmente decides sembrar más"', () => {
    const llmFail =
      'El retamo (Ulex europaeus) es un arbusto espinoso de flor amarilla, adecuado como cerca viva. ' +
      'Si finalmente decides sembrar más ejemplares, hazlo en suelo bien drenado.';
    const out = guardInvasiveSpecies(llmFail, [retamoEntity]);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/invasora/i);
    // ANTES: la trataba como recurso. DESPUÉS: advierte NO sembrar + nativa.
    expect(out.text).toMatch(/INVASORA/);
    expect(out.text).toMatch(/No la siembres/i);
    expect(out.text).toMatch(/chachafruto/);
  });

  it('NO re-dispara si el modelo YA advirtió que es invasora y no sembrar', () => {
    const ok =
      'El retamo (Ulex europaeus) es una especie invasora declarada: NO la siembres, daña el páramo ' +
      'y es muy inflamable. Mejor erradícala y usa chachafruto como cerca viva.';
    const out = guardInvasiveSpecies(ok, [retamoEntity]);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('NO dispara si la entidad NO está marcada es_invasora', () => {
    const noInvasora = { ...retamoEntity, es_invasora: false };
    const out = guardInvasiveSpecies('Siembra retamo como cerca viva.', [noInvasora]);
    expect(out.modified).toBe(false);
  });

  it('degrada con gracia sin resolvedEntities', () => {
    const out = guardInvasiveSpecies('Siembra lo que quieras.', null);
    expect(out.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GUARD 3 — viabilidad invertida
// ──────────────────────────────────────────────────────────────────────────
describe('guardInvertedViability', () => {
  const maracuyaInviable = {
    kind: 'species',
    mentioned: 'maracuyá',
    nombre_comun: 'maracuyá',
    nombre_cientifico: 'Passiflora edulis f. flavicarpa',
    viabilidad: 'inviable',
    altitud_min: 0,
    altitud_max: 1300,
    alternativas_viables: ['gulupa'],
  };
  const ocaInviable = {
    kind: 'species',
    mentioned: 'oca',
    nombre_comun: 'oca',
    viabilidad: 'inviable',
    altitud_min: 2400,
    altitud_max: 2800,
    alternativas_viables: ['chontaduro', 'plátano'],
  };

  it('CPX-002 (bench): corrige "es recomendable priorizar la maracuyá" a 2100m', () => {
    const llmFail =
      'En tu finca de Sibundoy a 2100 metros, es recomendable priorizar la maracuyá ' +
      '(Passiflora edulis f. flavicarpa) porque pagan bien.';
    const out = guardInvertedViability(llmFail, [maracuyaInviable], 2100);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/viabilidad_invertida/);
    // ANTES: priorizaba maracuyá. DESPUÉS: corrige + lidera con gulupa.
    expect(out.text).toMatch(/NO es viable/i);
    expect(out.text).toMatch(/gulupa/);
    // La corrección debe ir ANTES del texto original (liderar).
    expect(out.text.indexOf('Corrección')).toBeLessThan(out.text.indexOf('es recomendable priorizar'));
  });

  it('CPX-009 (bench): corrige "puede prosperar sin problemas" / "se cultiva ampliamente" en Chocó', () => {
    const llmFail =
      'La oca (Oxalis tuberosa) se cultiva ampliamente en regiones montañosas como el Chocó y puede ' +
      'prosperar sin problemas en tu clima cálido.';
    const out = guardInvertedViability(llmFail, [ocaInviable], 50);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/NO es viable/i);
    expect(out.text).toMatch(/chontaduro|plátano/);
  });

  it('CPX-004 (bench): corrige cocona "podría tener éxito" a 2500m (deja puerta abierta a inviable)', () => {
    const cocona = {
      kind: 'species',
      mentioned: 'cocona',
      nombre_comun: 'cocona',
      viabilidad: 'inviable',
      alternativas_viables: ['lulo'],
    };
    const llmFail = 'La cocona podría tener éxito acá en Pasto a 2500m bajo invernadero.';
    const out = guardInvertedViability(llmFail, [cocona], 2500);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/NO es viable/i);
  });

  it('CPX-010 (bench): corrige curuba "adecuada para zonas tropicales como las del llano"', () => {
    const curuba = {
      kind: 'species',
      mentioned: 'curuba',
      nombre_comun: 'curuba',
      viabilidad: 'inviable',
      alternativas_viables: ['chontaduro'],
    };
    const llmFail = 'La curuba es adecuada para zonas tropicales como las del llano colombiano.';
    const out = guardInvertedViability(llmFail, [curuba], 450);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/chontaduro/);
  });

  it('NO toca "marginal" (zona gris — posible con cuidados)', () => {
    const marginal = { ...maracuyaInviable, viabilidad: 'marginal' };
    const txt = 'La maracuyá es recomendable y puede prosperar acá.';
    const out = guardInvertedViability(txt, [marginal], 2100);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
  });

  it('NO toca "viable"', () => {
    const viable = { ...maracuyaInviable, viabilidad: 'viable' };
    const out = guardInvertedViability('La gulupa es viable acá.', [viable], 2100);
    expect(out.modified).toBe(false);
  });

  it('NO re-dispara si el modelo YA dijo que es inviable', () => {
    const ok =
      'La maracuyá no es viable a 2100m, el clima es demasiado frío. Mejor siembra gulupa.';
    const out = guardInvertedViability(ok, [maracuyaInviable], 2100);
    expect(out.modified).toBe(false);
  });

  it('fallback por rango cuando NO viene campo viabilidad pero sí altitud_min/max', () => {
    const sinCampo = { ...maracuyaInviable };
    delete sinCampo.viabilidad;
    const llmFail = 'La maracuyá es recomendable para tu finca.';
    const out = guardInvertedViability(llmFail, [sinCampo], 2100); // 2100 >> max 1300 + 300
    expect(out.modified).toBe(true);
  });

  it('NO evalúa si no hay viabilidad NI rango usable (neutral)', () => {
    const sinDatos = { kind: 'species', nombre_comun: 'algo', mentioned: 'algo' };
    const out = guardInvertedViability('Algo es recomendable.', [sinDatos], 2100);
    expect(out.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GUARD 4 — dosis sin fuente (suaviza, no borra)
// ──────────────────────────────────────────────────────────────────────────
describe('guardDoseWithoutSource', () => {
  it('suaviza una dosis "30 ml/L" sin cita de fuente', () => {
    const txt = 'Aplica 30 ml/L de la solución cada semana.';
    const out = guardDoseWithoutSource(txt);
    expect(out.modified).toBe(true);
    // NO borra la dosis (suaviza, no censura).
    expect(out.text).toMatch(/30 ml\/L/);
    expect(out.text).toMatch(/confirma la dosis/i);
  });

  it('suaviza "5 g por planta" y "2 cc"', () => {
    expect(guardDoseWithoutSource('Pon 5 g por planta.').modified).toBe(true);
    expect(guardDoseWithoutSource('Diluye 2 cc en agua.').modified).toBe(true);
  });

  it('NO suaviza si la dosis viene con fuente citada (ICA / etiqueta / Agrosavia)', () => {
    const ok = 'Según el ICA, aplica 30 ml/L de caldo bordelés.';
    const out = guardDoseWithoutSource(ok);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('NO dispara si no hay dosis numérica', () => {
    const ok = 'Aplica caldo bordelés como preventivo, sin exagerar la cantidad.';
    const out = guardDoseWithoutSource(ok);
    expect(out.modified).toBe(false);
  });

  it('no duplica la nota si ya está', () => {
    const txt = 'Aplica 30 ml/L. confirma la dosis con la etiqueta.';
    const out = guardDoseWithoutSource(txt);
    expect(out.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GUARD 5 — sustitución de especie (binomio del cultivo principal contradice
// su resolución del grounding). Caso real prod (2026-05-30): el usuario pidió
// "sembrar lulo", el grounding resolvió lulo=Solanum quitoense CORRECTO, pero
// el LLM respondió "Lulo de Castilla (Passiflora tripartita var. mollissima)"
// — eso es CURUBA. El guard corrige con el binomio autoritativo del catálogo.
// ──────────────────────────────────────────────────────────────────────────
describe('guardSpeciesSubstitution', () => {
  const luloResolved = [
    {
      mentioned: 'lulo',
      kind: 'species',
      nombre_comun: 'Lulo / Naranjilla / Chuva',
      nombre_cientifico: 'Solanum quitoense Lam.',
      canonical_id: 'solanum_quitoense',
      confidence: 0.95,
    },
  ];

  it('CASO REAL: corrige "Passiflora tripartita" cuando lulo=Solanum quitoense', () => {
    const llmFail =
      'El Lulo de Castilla (Passiflora tripartita var. mollissima) es una fruta andina. ' +
      'Para sembrarlo necesitas un clima frío entre 2200 y 2800 msnm.';
    const out = guardSpeciesSubstitution(llmFail, luloResolved);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/sustituci/i);
    expect(out.reason).toMatch(/passiflora tripartita/i);
    // la corrección debe nombrar el binomio correcto del catálogo.
    expect(out.text).toMatch(/Solanum quitoense/);
    expect(out.text).toMatch(/seg[uú]n el cat[aá]logo/i);
  });

  it('NO dispara si el binomio coincide con la resolución del cultivo', () => {
    const ok =
      'El lulo (Solanum quitoense) prospera entre 1600 y 2400 msnm. Necesita sombra parcial.';
    const out = guardSpeciesSubstitution(ok, luloResolved);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('NO dispara con binomios de plagas/compañías que SÍ vienen en el grounding', () => {
    // El grounding trae el cultivo (lulo) + un companion con su propio binomio.
    const resolved = [
      ...luloResolved,
      {
        mentioned: 'aliso',
        kind: 'species',
        nombre_comun: 'Aliso andino',
        nombre_cientifico: 'Alnus acuminata Kunth',
        canonical_id: 'alnus_acuminata',
        confidence: 0.9,
      },
    ];
    const txt =
      'El lulo (Solanum quitoense) se asocia bien con el aliso andino (Alnus acuminata), ' +
      'que fija nitrógeno y da sombra.';
    const out = guardSpeciesSubstitution(txt, resolved);
    expect(out.modified).toBe(false);
  });

  it('NO dispara con binomios de companions presentes en el sub-objeto companions[]', () => {
    // companion binomial llega anidado en la entidad del cultivo, no como entidad top-level.
    const resolved = [
      {
        ...luloResolved[0],
        companions: [
          { canonical_id: 'alnus_acuminata', nombre_comun: 'Aliso andino', nombre_cientifico: 'Alnus acuminata Kunth' },
        ],
      },
    ];
    const txt = 'El lulo (Solanum quitoense) va bien con aliso (Alnus acuminata).';
    const out = guardSpeciesSubstitution(txt, resolved);
    expect(out.modified).toBe(false);
  });

  it('NO dispara sin resolvedEntities (no hay verdad de catálogo que enforcer)', () => {
    const txt = 'El lulo de castilla (Passiflora tripartita) es una fruta andina.';
    expect(guardSpeciesSubstitution(txt, null).modified).toBe(false);
    expect(guardSpeciesSubstitution(txt, []).modified).toBe(false);
  });

  it('NO dispara si el texto no menciona el nombre común del cultivo principal', () => {
    // El binomio errado aparece pero NO está ligado al cultivo preguntado.
    const txt = 'En general las pasifloras como Passiflora tripartita crecen en clima frío.';
    const out = guardSpeciesSubstitution(txt, luloResolved);
    // No menciona "lulo" → no podemos atribuir la sustitución al cultivo. Conservador.
    expect(out.modified).toBe(false);
  });

  it('tolera el binomio del catálogo con autoría/variedad (compara solo Género epíteto)', () => {
    // nombre_cientifico del grounding trae "Lam." de autoría; el texto trae el binomio puro.
    const txt = 'El lulo es en realidad Passiflora tripartita, una fruta de clima frío.';
    const out = guardSpeciesSubstitution(txt, luloResolved);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/Solanum quitoense/);
  });

  it('idempotente: no re-corrige si la corrección ya está aplicada', () => {
    const llmFail = 'El Lulo de Castilla (Passiflora tripartita var. mollissima) es andino.';
    const once = guardSpeciesSubstitution(llmFail, luloResolved);
    const twice = guardSpeciesSubstitution(once.text, luloResolved);
    expect(twice.modified).toBe(false);
  });

  it('maneja entrada vacía / no-string', () => {
    expect(guardSpeciesSubstitution('', luloResolved).modified).toBe(false);
    expect(guardSpeciesSubstitution(null, luloResolved).text).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ORQUESTADOR + telemetría
// ──────────────────────────────────────────────────────────────────────────
describe('applyOutputGuards (cadena)', () => {
  it('encadena varios guards en un mismo texto (agroquímico + dosis)', () => {
    const llmFail = 'Para el tizón aplica Mancozeb 30 ml/L cada semana.';
    const out = applyOutputGuards(llmFail, {});
    expect(out.modified).toBe(true);
    expect(out.reasons.length).toBeGreaterThanOrEqual(2);
    expect(out.reasons.some((r) => /agroquímico/.test(r))).toBe(true);
    expect(out.reasons.some((r) => /dosis/.test(r))).toBe(true);
  });

  it('cadena: corrige sustitución de especie (lulo→Passiflora) vía applyOutputGuards', () => {
    const resolved = [
      {
        mentioned: 'lulo',
        kind: 'species',
        nombre_comun: 'Lulo',
        nombre_cientifico: 'Solanum quitoense Lam.',
        canonical_id: 'solanum_quitoense',
      },
    ];
    const llmFail = 'El lulo (Passiflora tripartita var. mollissima) crece en clima frío.';
    const out = applyOutputGuards(llmFail, { resolvedEntities: resolved });
    expect(out.modified).toBe(true);
    expect(out.reasons.some((r) => /sustituci/i.test(r))).toBe(true);
    expect(out.text).toMatch(/Solanum quitoense/);
  });

  it('texto limpio pasa sin modificar', () => {
    const ok = 'Para el café usa variedades resistentes (Castillo) y caldo bordelés según CENICAFÉ.';
    const out = applyOutputGuards(ok, { resolvedEntities: [], fincaAltitud: 1500 });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('maneja entrada vacía / no-string', () => {
    expect(applyOutputGuards('', {}).text).toBe('');
    expect(applyOutputGuards(null, {}).text).toBe('');
    expect(applyOutputGuards(undefined, {}).modified).toBe(false);
  });

  it('telemetría cuenta cada guard que dispara', () => {
    applyOutputGuards('Aplica glifosato 2 L/ha.', {});
    const tel = getOutputGuardTelemetry();
    expect(tel.synthetic_agrochemical).toBeGreaterThanOrEqual(1);
    expect(tel.__total).toBeGreaterThanOrEqual(1);
  });
});
