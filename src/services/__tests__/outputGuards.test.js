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
  guardCompanionBinomial,
  guardVisionWithoutPhoto,
  applyOutputGuards,
  filterNoiseEntities,
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

  // ── R1: detección DIRECTA por banda de altitud (sin frase-gatillo) ──────────
  // El re-bench post-guards (2026-05-31) mostró que el guard dependía de frases
  // como "es viable / recomendable / prospera". Cuando el modelo recomendaba
  // sembrar con OTRO fraseo, se escapaba aunque la altitud estuviera en el
  // grounding. Estos casos reales (CPX-010 curuba, CPX-001 chugua) deben
  // corregirse por comparación DETERMINÍSTICA altitud-finca vs banda de la
  // especie, no por el texto.
  describe('R1 — detección directa altitud vs banda (sin frase-gatillo)', () => {
    it('CPX-010 (escapado): curuba inviable, texto la siembra sin "es viable"', () => {
      // El re-bench: el modelo no usó ninguna frase de la lista recomiendaViable;
      // simplemente la presentó como cultivo a sembrar. Con viabilidad:inviable
      // del grounding + mención de siembra, debe corregir igual.
      const curuba = {
        kind: 'species',
        mentioned: 'curuba',
        nombre_comun: 'curuba',
        viabilidad: 'inviable',
        altitud_min: 1800,
        altitud_max: 3000,
        alternativas_viables: ['chontaduro'],
      };
      const llmFail =
        'Para tu finca en el llano te conviene sembrar la curuba; plántala al inicio ' +
        'de las lluvias y dale buen riego.';
      const out = guardInvertedViability(llmFail, [curuba], 450);
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/viabilidad_invertida/);
      expect(out.text).toMatch(/NO es viable/i);
      expect(out.text).toMatch(/chontaduro/);
    });

    it('CPX-001 (escapado): chugua a 3200m fuera de banda, texto la recomienda sembrar', () => {
      // La altitud (3200) estaba en el grounding y supera altitud_max por mucho.
      // Sin campo viabilidad, el guard debe deducir 'inviable' por la banda y
      // corregir cuando el texto la siembra, aunque no diga "es viable".
      const chugua = {
        kind: 'species',
        mentioned: 'chugua',
        nombre_comun: 'chugua',
        altitud_min: 2000,
        altitud_max: 2800,
        alternativas_viables: ['papa', 'haba'],
      };
      const llmFail =
        'En tu parcela puedes cultivar la chugua; prepara el suelo con materia orgánica ' +
        'y siémbrala en surcos.';
      const out = guardInvertedViability(llmFail, [chugua], 3200);
      expect(out.modified).toBe(true);
      expect(out.text).toMatch(/NO es viable/i);
      expect(out.text).toMatch(/papa|haba/);
    });

    it('dispara con "buena para sembrar acá" (fraseo coloquial fuera de la lista)', () => {
      const maracuya = { ...maracuyaInviable };
      const llmFail = 'La maracuyá es buena para sembrar acá, ponla cerca de tu casa.';
      const out = guardInvertedViability(llmFail, [maracuya], 2100);
      expect(out.modified).toBe(true);
      expect(out.text).toMatch(/gulupa/);
    });

    it('RESPETA marginal: dentro del margen de 300m NO bloquea aunque la siembre', () => {
      // 1500 está a 200m por encima de altitud_max 1300 → marginal (zona gris).
      const marginalPorBanda = {
        kind: 'species',
        mentioned: 'maracuyá',
        nombre_comun: 'maracuyá',
        altitud_min: 0,
        altitud_max: 1300,
        alternativas_viables: ['gulupa'],
      };
      const txt = 'Puedes sembrar la maracuyá con cuidados extra en tu finca.';
      const out = guardInvertedViability(txt, [marginalPorBanda], 1500);
      expect(out.modified).toBe(false);
    });

    it('RESPETA viable: dentro de la banda NO bloquea', () => {
      const viablePorBanda = {
        kind: 'species',
        mentioned: 'maracuyá',
        nombre_comun: 'maracuyá',
        altitud_min: 0,
        altitud_max: 1300,
      };
      const txt = 'Siembra la maracuyá, te va a dar buena cosecha.';
      const out = guardInvertedViability(txt, [viablePorBanda], 800);
      expect(out.modified).toBe(false);
    });

    it('NO dispara por banda si el texto NO la recomienda (solo la menciona)', () => {
      const curuba = {
        kind: 'species',
        mentioned: 'curuba',
        nombre_comun: 'curuba',
        viabilidad: 'inviable',
        alternativas_viables: ['chontaduro'],
      };
      const txt = 'La curuba es una fruta andina de clima frío. No es para tu zona cálida.';
      const out = guardInvertedViability(txt, [curuba], 450);
      expect(out.modified).toBe(false);
    });

    it('NO dispara si el modelo YA advirtió la inviabilidad (no duplica)', () => {
      const curuba = {
        kind: 'species',
        mentioned: 'curuba',
        nombre_comun: 'curuba',
        viabilidad: 'inviable',
        alternativas_viables: ['chontaduro'],
      };
      const ok =
        'No siembres curuba en el llano: no es viable a esa altura. Mejor el chontaduro.';
      const out = guardInvertedViability(ok, [curuba], 450);
      expect(out.modified).toBe(false);
    });
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
// GUARD 5b — binomio de compañía/antagonista sustituido
// Caso prod (2026-05-31): hablando de antagonistas de la papa, el agente escribió
// "Nogal andino (Quercus molinae)". El grounding de la papa trae el antagonist
// Nogal andino = Juglans neotropica (CORRECTO). El modelo sustituyó el binomio de
// un ANTAGONISTA (no del cultivo principal), por eso guardSpeciesSubstitution
// — que solo valida el cultivo preguntado — no lo cubre. guardCompanionBinomial
// valida los binomios de companions/antagonists/alternativas contra SU PROPIO
// grounding autoritativo.
// ──────────────────────────────────────────────────────────────────────────
describe('guardCompanionBinomial', () => {
  const papaResolved = [
    {
      mentioned: 'papa',
      kind: 'species',
      nombre_comun: 'Papa',
      nombre_cientifico: 'Solanum tuberosum L.',
      canonical_id: 'solanum_tuberosum',
      confidence: 0.96,
      antagonists: [
        {
          canonical_id: 'juglans_neotropica',
          nombre_comun: 'Nogal andino',
          nombre_cientifico: 'Juglans neotropica Diels',
        },
      ],
      companions: [
        {
          canonical_id: 'tagetes_erecta',
          nombre_comun: 'Caléndula',
          nombre_cientifico: 'Tagetes erecta L.',
        },
      ],
    },
  ];

  it('CASO REAL: corrige "Nogal andino (Quercus molinae)" → Juglans neotropica', () => {
    const llmFail =
      'Entre los antagonistas de la papa está el Nogal andino (Quercus molinae), que produce ' +
      'juglona y inhibe el cultivo. Manténlo lejos de tus surcos.';
    const out = guardCompanionBinomial(llmFail, papaResolved);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/binomio_compa[ñn]/i);
    // la corrección debe nombrar el binomio correcto y el errado.
    expect(out.text).toMatch(/Juglans neotropica/);
    expect(out.text).toMatch(/Quercus molinae/i);
    expect(out.text).toMatch(/Nogal andino/i);
  });

  it('NO dispara si el binomio del antagonista SÍ coincide con su grounding', () => {
    const ok =
      'Entre los antagonistas de la papa está el Nogal andino (Juglans neotropica), que ' +
      'produce juglona. Manténlo lejos.';
    const out = guardCompanionBinomial(ok, papaResolved);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('tolera autoría/variedad en el binomio mencionado (compara solo Género epíteto)', () => {
    const ok =
      'El Nogal andino (Juglans neotropica Diels) es antagonista de la papa por la juglona.';
    const out = guardCompanionBinomial(ok, papaResolved);
    expect(out.modified).toBe(false);
  });

  it('NO dispara si el binomio errado no está CERCA del nombre del companion/antagonista', () => {
    // El binomio foráneo aparece, pero a más de 160 chars del "Nogal andino":
    // están en bloques temáticos distintos, no es una atribución del binomio al
    // nombre común. El guard es conservador con la ventana de cercanía.
    const txt =
      'El Nogal andino es un árbol valioso que conviene mantener lejos de la papa por su efecto ' +
      'alelopático sobre el tubérculo, ya que reduce el rendimiento de las matas cercanas con el ' +
      'paso de las temporadas de cultivo. ' +
      'En una sección totalmente aparte del documento, hablando de otros robles del sur del país, ' +
      'se menciona que el Quercus molinae crece en bosques de niebla a gran altitud.';
    const out = guardCompanionBinomial(txt, papaResolved);
    expect(out.modified).toBe(false);
  });

  it('corrige un companion (no solo antagonist) con binomio errado', () => {
    const llmFail =
      'Como compañía planta Caléndula (Calendula officinalis) junto a la papa para repeler plagas.';
    const out = guardCompanionBinomial(llmFail, papaResolved);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/Tagetes erecta/);
  });

  it('NO dispara sin resolvedEntities', () => {
    const txt = 'El Nogal andino (Quercus molinae) es antagonista de la papa.';
    expect(guardCompanionBinomial(txt, null).modified).toBe(false);
    expect(guardCompanionBinomial(txt, []).modified).toBe(false);
  });

  it('NO dispara si la entidad no trae companions/antagonists con binomio', () => {
    const sinSubarrays = [
      {
        mentioned: 'papa',
        kind: 'species',
        nombre_comun: 'Papa',
        nombre_cientifico: 'Solanum tuberosum L.',
      },
    ];
    const txt = 'El Nogal andino (Quercus molinae) es antagonista de la papa.';
    expect(guardCompanionBinomial(txt, sinSubarrays).modified).toBe(false);
  });

  it('idempotente: no re-corrige si la corrección ya está aplicada', () => {
    const llmFail = 'El Nogal andino (Quercus molinae) es antagonista de la papa.';
    const once = guardCompanionBinomial(llmFail, papaResolved);
    const twice = guardCompanionBinomial(once.text, papaResolved);
    expect(twice.modified).toBe(false);
  });

  it('telemetría: cuenta el gatillo', () => {
    const llmFail = 'El Nogal andino (Quercus molinae) antagoniza a la papa.';
    guardCompanionBinomial(llmFail, papaResolved);
    const t = getOutputGuardTelemetry();
    expect(t.companion_binomial).toBe(1);
  });

  it('maneja entrada vacía / no-string', () => {
    expect(guardCompanionBinomial('', papaResolved).modified).toBe(false);
    expect(guardCompanionBinomial(null, papaResolved).text).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// R2 — filtro de entidades-ruido (stopwords NLU)
// El re-bench post-guards (2026-05-31): el resolver de entidades devolvía
// palabras campesinas comunes como si fueran especies ("aquí"→Pteridium,
// "don"→Oenocarpus, "mano", "pasto"). Esas entidades-ruido disparaban los
// guards sobre RUIDO (3/5 falsos positivos). filterNoiseEntities las descarta
// ANTES de applyOutputGuards.
// ──────────────────────────────────────────────────────────────────────────
describe('filterNoiseEntities', () => {
  it('descarta "aquí" aunque haya resuelto a una especie (Pteridium)', () => {
    const entities = [
      { mentioned: 'aquí', kind: 'species', nombre_comun: 'helecho marranero', nombre_cientifico: 'Pteridium aquilinum' },
      { mentioned: 'lulo', kind: 'species', nombre_comun: 'Lulo', nombre_cientifico: 'Solanum quitoense' },
    ];
    const out = filterNoiseEntities(entities);
    expect(out).toHaveLength(1);
    expect(out[0].mentioned).toBe('lulo');
  });

  it('descarta "don" (Oenocarpus), "doña", "sumercé"', () => {
    const entities = [
      { mentioned: 'don', kind: 'species', nombre_comun: 'milpesos', nombre_cientifico: 'Oenocarpus bataua' },
      { mentioned: 'doña', kind: 'species', nombre_comun: 'algo' },
      { mentioned: 'sumercé', kind: 'species', nombre_comun: 'algo' },
    ];
    expect(filterNoiseEntities(entities)).toHaveLength(0);
  });

  it('descarta "mano", "vea", "aquí", "allá", "ahí"', () => {
    const ruido = ['mano', 'vea', 'aquí', 'allá', 'ahí'].map((m) => ({ mentioned: m, kind: 'species' }));
    expect(filterNoiseEntities(ruido)).toHaveLength(0);
  });

  it('descarta "pasto" SOLO (genérico) pero NO un pasto con nombre real', () => {
    const entities = [
      { mentioned: 'pasto', kind: 'species', nombre_comun: 'pasto' },
      { mentioned: 'pasto guinea', kind: 'species', nombre_comun: 'pasto guinea', nombre_cientifico: 'Megathyrsus maximus' },
    ];
    const out = filterNoiseEntities(entities);
    expect(out.map((e) => e.mentioned)).toEqual(['pasto guinea']);
  });

  it('ignora diacríticos y mayúsculas ("Aquí", "AQUÍ", "aqui")', () => {
    const entities = ['Aquí', 'AQUÍ', 'aqui'].map((m) => ({ mentioned: m, kind: 'species' }));
    expect(filterNoiseEntities(entities)).toHaveLength(0);
  });

  it('NO toca especies legítimas (lulo, maíz, café)', () => {
    const entities = [
      { mentioned: 'lulo', kind: 'species' },
      { mentioned: 'maíz', kind: 'species' },
      { mentioned: 'café', kind: 'species' },
    ];
    expect(filterNoiseEntities(entities)).toHaveLength(3);
  });

  it('maneja entrada no-array sin romper', () => {
    expect(filterNoiseEntities(null)).toEqual([]);
    expect(filterNoiseEntities(undefined)).toEqual([]);
    expect(filterNoiseEntities('x')).toEqual([]);
  });

  it('en la cadena: "aquí"→Pteridium NO dispara guard de invasora', () => {
    // Pteridium (helecho marranero) ES invasora; sin el filtro, "aquí" la
    // arrastraría y el guard advertiría sobre RUIDO. Con el filtro, no dispara.
    const resolved = [
      {
        mentioned: 'aquí',
        kind: 'species',
        nombre_comun: 'helecho marranero',
        es_invasora: true,
        alternativas_viables: ['aliso'],
      },
    ];
    const txt = 'Aquí puedes sembrar tus cultivos sin problema, es buena tierra.';
    const out = applyOutputGuards(txt, { resolvedEntities: resolved });
    expect(out.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ORQUESTADOR + telemetría
// ──────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────
// GUARD 6 — diagnóstico visual fabricado SIN foto real (P0, prod 2026-05-31)
// ──────────────────────────────────────────────────────────────────────────
// El operador cazó 2 veces que el agente FABRICA un diagnóstico visual cuando
// NO hubo imagen en el turno: respondía "Analicé una foto, estado 95/100" e
// inventaba hallazgos de Mapacho/Nicotiana attenuata (que venían del RAG textual
// de un biopreparado de tabaco, NO de visión). Este guard corrige eso de forma
// determinista cuando hadVision=false.
describe('guardVisionWithoutPhoto', () => {
  it('CASO REAL (prod): corrige "Analicé una foto ... estado 95/100" SIN foto en el turno', () => {
    const llmFail =
      'Analicé una foto de tu planta de Mapacho (Nicotiana attenuata) y se observa en la imagen ' +
      'un estado fitosanitario excelente, estado 95/100, sin hallazgos visuales de plagas.';
    const out = guardVisionWithoutPhoto(llmFail, { hadVision: false });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/visi[oó]n_sin_foto|sin_foto/i);
    // NO debe seguir afirmando que analizó una foto / dio un puntaje visual.
    expect(out.text).not.toMatch(/Analic[eé] una foto/i);
    expect(out.text).not.toMatch(/95\/100/);
    expect(out.text).not.toMatch(/se observa en la imagen/i);
    // Debe pedir la foto explícitamente (botón de cámara).
    expect(out.text).toMatch(/No recib[ií] ninguna foto/i);
    expect(out.text).toMatch(/c[aá]mara/i);
  });

  it('corrige variantes: "en la imagen se aprecia" / "según la foto" / "hallazgos visuales"', () => {
    for (const claim of [
      'En la imagen se aprecia clorosis en las hojas inferiores.',
      'Según la foto que me enviaste, la planta tiene buen vigor.',
      'Los hallazgos visuales indican un estado 88/100.',
      'Observo en la imagen manchas necróticas.',
    ]) {
      const out = guardVisionWithoutPhoto(claim, { hadVision: false });
      expect(out.modified, claim).toBe(true);
      expect(out.text).toMatch(/No recib[ií] ninguna foto/i);
    }
  });

  it('NO toca la respuesta cuando SÍ hubo foto real con diagnóstico legítimo', () => {
    const ok =
      'Analicé la foto de tu planta de café y en la imagen se observa roya en las hojas, ' +
      'estado 70/100. Te recomiendo caldo bordelés preventivo.';
    const out = guardVisionWithoutPhoto(ok, { hadVision: true, visionConfidence: 0.82 });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('NO dispara en texto normal sin afirmación visual (aunque hadVision=false)', () => {
    const ok =
      'Para sembrar maíz a 2200 msnm te recomiendo variedades de clima frío y preparar el suelo ' +
      'con abono orgánico.';
    const out = guardVisionWithoutPhoto(ok, { hadVision: false });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('SUAVIZA cuando hubo foto pero la confianza de visión fue nula y el modelo afirma hallazgos detallados', () => {
    const detailed =
      'Analicé la foto y en la imagen se observa un estado 96/100 con hallazgos visuales precisos: ' +
      'ausencia total de plagas y nutrición óptima.';
    const out = guardVisionWithoutPhoto(detailed, { hadVision: true, visionConfidence: 0 });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/confianza|baja/i);
    // No borra la respuesta: anexa una nota de cautela.
    expect(out.text).toMatch(/no fue concluyente|baja|confirma|descripci[oó]n/i);
  });

  it('por defecto (sin ctx) asume que NO hubo foto y corrige una afirmación visual', () => {
    const llmFail = 'Analicé una foto y se observa en la imagen un estado 95/100.';
    const out = guardVisionWithoutPhoto(llmFail);
    expect(out.modified).toBe(true);
  });

  it('maneja entrada vacía / no-string', () => {
    expect(guardVisionWithoutPhoto('', { hadVision: false }).modified).toBe(false);
    expect(guardVisionWithoutPhoto(null, { hadVision: false }).text).toBe('');
  });
});

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

  it('cablea hadVision=false: corrige diagnóstico visual fabricado sin foto', () => {
    const llmFail = 'Analicé una foto de tu Mapacho y se observa en la imagen un estado 95/100.';
    const out = applyOutputGuards(llmFail, { hadVision: false });
    expect(out.modified).toBe(true);
    expect(out.reasons.some((r) => /visi[oó]n_sin_foto|sin_foto/i.test(r))).toBe(true);
    expect(out.text).toMatch(/No recib[ií] ninguna foto/i);
  });

  it('cablea hadVision=true: NO toca un diagnóstico visual legítimo con foto real', () => {
    const ok = 'Analicé la foto y en la imagen se observa roya, estado 70/100.';
    const out = applyOutputGuards(ok, { hadVision: true, visionConfidence: 0.8 });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });
});
