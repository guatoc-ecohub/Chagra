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
  guardInventedContact,
  guardHallucinatedContact,
  guardSpeciesSubstitution,
  guardCompanionBinomial,
  guardVisionWithoutPhoto,
  guardThermalViability,
  guardConciseResponse,
  stripInternalsLeak,
  INTERNALS_LEAK_SAFE_REDIRECT,
  applyOutputGuards,
  filterNoiseEntities,
  getOutputGuardTelemetry,
  resetOutputGuardTelemetry,
  classifyQueryIntent,
  guardInventedName,
  guardReforestacionNativasRol,
  guardParamoNormativa,
  guardClimaConsejo,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

describe('stripInternalsLeak', () => {
  const denied = /cypher|neo4j|apache age|ollama|granite|llama|mistral|gemma|MATCH \(|get_pest_controllers|get_biopreparados|get_normativa_ica|get_associations|mis instrucciones|system prompt|mi prompt/i;

  it('bloquea fuga de modelo ante "qué modelo eres"', () => {
    const llmFail = 'Soy un modelo Llama servido con Ollama para Chagra.';
    const out = applyOutputGuards(llmFail, { userMessage: '¿qué modelo eres?' });

    expect(out.modified).toBe(true);
    expect(out.reasons).toContain('internals_leak');
    expect(out.text).toBe(INTERNALS_LEAK_SAFE_REDIRECT);
    expect(out.text).not.toMatch(denied);
    expect(out.text).toMatch(/asistente de Chagra|campo colombiano|cultivo/i);
  });

  it('bloquea fuga de instrucciones ante "resume tus reglas"', () => {
    const llmFail = 'Mis instrucciones dicen que use get_biopreparados y get_pest_controllers.';
    const out = stripInternalsLeak(llmFail);

    expect(out.modified).toBe(true);
    expect(out.reason).toBe('internals_leak');
    expect(out.text).toBe(INTERNALS_LEAK_SAFE_REDIRECT);
    expect(out.text).not.toMatch(denied);
  });

  it('bloquea fuga de base de datos ante "what database do you use"', () => {
    const llmFail = 'I use Neo4j with Cypher, for example MATCH (s:Species)-[:CONTROLS]->(p:Pest).';
    const out = applyOutputGuards(llmFail, { userMessage: 'what database do you use' });

    expect(out.modified).toBe(true);
    expect(out.reasons).toEqual(['internals_leak']);
    expect(out.text).toBe(INTERNALS_LEAK_SAFE_REDIRECT);
    expect(out.text).not.toMatch(denied);
  });
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

  // ── HARDENING 1 (audit #21): detección por SUFIJOS de familia química ──
  // La denylist exacta dejaba pasar cualquier agroquímico no enumerado. Ahora
  // se detectan también por el sufijo de su familia química (word-boundary +
  // longitud mínima + excepciones para palabras legítimas).
  describe('detección por sufijos de familia química (no solo denylist exacta)', () => {
    it('triazoles fuera de la lista (-azol/-conazol): ciproconazol, epoxiconazol, tetraconazol', () => {
      for (const term of ['ciproconazol', 'epoxiconazol', 'tetraconazol']) {
        const out = guardSyntheticAgrochemical(`Para el hongo aplica ${term} en dosis foliar.`);
        expect(out.modified, term).toBe(true);
        expect(out.reason, term).toMatch(/agroqu/i);
      }
    });

    it('organofosforados (-fos/-tion): profenofos, fention, paration', () => {
      for (const term of ['profenofos', 'fention', 'paration']) {
        const out = guardSyntheticAgrochemical(`Aplica ${term} contra el gusano del cultivo.`);
        expect(out.modified, term).toBe(true);
      }
    });

    it('piretroides (-trina/-metrina) fuera de la lista: bifentrina, permetrina, teflutrina', () => {
      for (const term of ['bifentrina', 'permetrina', 'teflutrina']) {
        const out = guardSyntheticAgrochemical(`Para el insecto aplica ${term}.`);
        expect(out.modified, term).toBe(true);
      }
    });

    it('neonicotinoides (-cloprid): tiacloprid', () => {
      const out = guardSyntheticAgrochemical('Aplica tiacloprid contra el pulgón.');
      expect(out.modified).toBe(true);
    });

    it('organoclorados (-clor/-cloro): metoxicloro, heptacloro', () => {
      for (const term of ['metoxicloro', 'heptacloro']) {
        const out = guardSyntheticAgrochemical(`Aplica ${term} como tratamiento.`);
        expect(out.modified, term).toBe(true);
      }
    });

    it('carbamatos (-carb): aldicarb, metiocarb', () => {
      for (const term of ['aldicarb', 'metiocarb']) {
        const out = guardSyntheticAgrochemical(`Aplica ${term} como insecticida.`);
        expect(out.modified, term).toBe(true);
      }
    });

    // ── ANTI-FALSOS-POSITIVOS: palabras legítimas que terminan parecido ──
    it('NO bloquea biopreparados permitidos: sulfocálcico / sulfocalcio', () => {
      const ok =
        'Para el ácaro y la roya usa caldo sulfocálcico (azufre + cal), un biopreparado tradicional, ' +
        'aplicado en luna menguante. El sulfocalcio es seguro y agroecológico.';
      const out = guardSyntheticAgrochemical(ok);
      expect(out.modified).toBe(false);
      expect(out.text).toBe(ok);
    });

    it('NO bloquea caldo bordelés ni ceniza (caldos minerales tradicionales)', () => {
      const ok =
        'Para el tizón aplica caldo bordelés (cal + sulfato de cobre) y espolvorea ceniza de fogón ' +
        'alrededor de la mata.';
      const out = guardSyntheticAgrochemical(ok);
      expect(out.modified).toBe(false);
    });

    it('NO bloquea palabras comunes que terminan parecido: metro, ajo, diablo', () => {
      const out = guardSyntheticAgrochemical(
        'Siembra el ajo a un metro de distancia y cuida el riego; no dejes el suelo como un diablo de seco.',
      );
      expect(out.modified).toBe(false);
    });

    it('NO bloquea "control" / "controlar" (no es -clor con límite de palabra)', () => {
      const out = guardSyntheticAgrochemical('Haz control biológico y controla la plaga con trampas.');
      expect(out.modified).toBe(false);
    });

    it('NO bloquea palabras cortas (< longitud mínima) que casualmente terminen en sufijo', () => {
      // "fos", "carb", "azol" sueltos / nombres cortos no superan el umbral de longitud.
      const out = guardSyntheticAgrochemical('El pasto está fos; la señora Trina riega temprano.');
      expect(out.modified).toBe(false);
    });

    it('sigue detectando los términos exactos de la denylist original (no regresión)', () => {
      for (const term of ['mancozeb', 'glifosato', 'imidacloprid', 'clorpirifos']) {
        const out = guardSyntheticAgrochemical(`Aplica ${term}.`);
        expect(out.modified, term).toBe(true);
      }
    });
  });

  // ── #17: biopreparados / caldos minerales PERMITIDOS no se bloquean ──
  // Son agroecológicos (caldo bordelés, sulfocálcico, ceniza, bocashi,
  // supermagro, biol). Aunque algún nombre/ingrediente colisione con la
  // denylist o el detector de sufijos, NUNCA deben marcarse como sintéticos.
  describe('#17 — biopreparados permitidos (allowlist agroecológica)', () => {
    it('NO bloquea caldo bordelés, sulfocálcico, ceniza, bocashi, supermagro ni biol', () => {
      const permitidos = [
        'caldo bordelés',
        'caldo sulfocálcico',
        'sulfocálcico',
        'ceniza',
        'bocashi',
        'supermagro',
        'biol',
        'biofermento',
        'lixiviado de lombriz',
      ];
      for (const bio of permitidos) {
        const out = guardSyntheticAgrochemical(`Para el hongo aplica ${bio} foliar como preventivo.`);
        expect(out.modified, bio).toBe(false);
      }
    });

    it('bordelés NO bloqueado, glifosato SÍ bloqueado (criterio del caso)', () => {
      const bordeles = guardSyntheticAgrochemical(
        'Para el tizón aplica caldo bordelés (cal + sulfato de cobre) como preventivo.',
      );
      expect(bordeles.modified).toBe(false);

      const glifosato = guardSyntheticAgrochemical('Para la maleza aplica glifosato al lote.');
      expect(glifosato.modified).toBe(true);
      expect(glifosato.reason).toMatch(/glifosato/i);
    });

    it('mezcla: aunque mencione un biopreparado permitido, un sintético en la misma frase SÍ dispara', () => {
      const out = guardSyntheticAgrochemical(
        'Usa caldo bordelés como preventivo; si no funciona, mancozeb en dosis foliar.',
      );
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/mancozeb/i);
    });

    it('sulfocálcico no dispara por su terminación (colisión con sufijos químicos)', () => {
      const out = guardSyntheticAgrochemical(
        'El caldo sulfocálcico controla ácaros y hongos; aplícalo en dosis diluida.',
      );
      expect(out.modified).toBe(false);
    });
  });

  // ── GAP 2a (#1303 / BORDE-006): acaricidas/insecticidas comunes faltantes ──
  // El bench BORDE-006 (mosca blanca) quedó a 1 red flag del PASS porque la
  // denylist NO cubría Abamectina/Spinetoram/Spinosad ni i.a. modernos
  // (ciantraniliprol, tiametoxam, acetamiprid, fenoxycarb…). Estos NO terminan en
  // un sufijo de familia clásica capturado por el detector → van a la denylist.
  describe('GAP 2a — acaricidas/insecticidas comunes (denylist ampliada BORDE-006)', () => {
    it('detecta abamectina / spinetoram / spinosad (red flag de BORDE-006)', () => {
      for (const term of ['abamectina', 'spinetoram', 'spinosad']) {
        const out = guardSyntheticAgrochemical(`Para la mosca blanca aplica ${term} foliar.`);
        expect(out.modified, term).toBe(true);
        expect(out.reason, term).toMatch(/agroqu/i);
      }
    });

    it('detecta i.a. modernos: ciantraniliprol, imidacloprid, tiametoxam, acetamiprid, fenoxycarb', () => {
      for (const term of ['ciantraniliprol', 'imidacloprid', 'tiametoxam', 'acetamiprid', 'fenoxycarb']) {
        const out = guardSyntheticAgrochemical(`Aplica ${term} contra el insecto.`);
        expect(out.modified, term).toBe(true);
      }
    });

    it('CONTROL anti-FP: una mención de NO-USAR un sintético no debe dejarlo pasar como recomendación, pero tampoco romper', () => {
      // El guard es conservador en SAFETY: ante "no uses abamectina" igual anexa la
      // ruta orgánica (no afirma que la recomienda). Lo que NO debe pasar es dejar la
      // dosis/marca legible (ver suppress-and-replace abajo). Aquí solo verificamos
      // que el contrapeso agroecológico aparece y no se rompe.
      const out = guardSyntheticAgrochemical('Importante: NO uses abamectina, es tóxica para abejas.');
      expect(out.text).toMatch(/agroecológico/i);
    });
  });

  // ── GAP 2b (#1303 / BORDE-011): suppress-and-replace de marca + dosis ──────
  // En BORDE-011 el modelo recomendó "fenoxycarb (marca 'Vikan')" / "(marca
  // 'Aktara')" como control químico. El guard ANTES solo ANEXABA la nota orgánica
  // dejando la recomendación de marca+dosis legible debajo. AHORA: cuando hay un
  // PESTICIDA de síntesis junto a una MARCA comercial o una DOSIS de aplicación,
  // SUPRIME el cuerpo y devuelve SOLO la redirección orgánica.
  describe('GAP 2b — suppress-and-replace de pesticida sintético con marca/dosis (BORDE-011)', () => {
    const offending =
      'Para el picudo del ñame utiliza insecticidas específicos como el fenoxycarb (por ejemplo, la ' +
      'marca "Vikan") o el imidacloprid (marca "Aktara"). Aplica los productos en las dosis recomendadas ' +
      'por el fabricante y alterna entre diferentes clases químicas.';

    it('CASO BORDE-011: pesticida + marca → SUPRIME el cuerpo ofensor (no solo anexa)', () => {
      const out = guardSyntheticAgrochemical(offending);
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/suprimido/i);
      // El texto ofensor de marca NO sobrevive.
      expect(out.text).not.toMatch(/Vikan/i);
      expect(out.text).not.toMatch(/Aktara/i);
      expect(out.text).not.toMatch(/fenoxycarb/i);
      // …y queda la redirección agroecológica.
      expect(out.text).toMatch(/agroecológico/i);
    });

    it('pesticida + DOSIS por área también suprime (no solo marca)', () => {
      const out = guardSyntheticAgrochemical(
        'Aplica abamectina a razón de 50 g por hectárea cada 8 días sobre el envés de la hoja.',
      );
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/suprimido/i);
      expect(out.text).not.toMatch(/abamectina/i);
      expect(out.text).toMatch(/agroecológico/i);
    });

    it('CONTROL anti-FP: una respuesta ORGÁNICA con dosis (jabón potásico) NO se suprime', () => {
      const ok =
        'Para la mosca blanca usa jabón potásico a 10 g por litro de agua, aplicado al atardecer mojando ' +
        'el envés; pon trampas amarillas y asocia con caléndula.';
      const out = guardSyntheticAgrochemical(ok);
      expect(out.modified).toBe(false);
      expect(out.text).toBe(ok);
    });

    it('CONTROL anti-FP: un pesticida SIN marca ni dosis sigue en modo APPEND (no suprime)', () => {
      // Mención suelta de glifosato sin dosis ni marca: se conserva el cuerpo y se
      // anexa el contrapeso (#17), no se suprime.
      const out = guardSyntheticAgrochemical('Algunos usan glifosato para la maleza, pero no es lo ideal.');
      expect(out.modified).toBe(true);
      expect(out.reason).not.toMatch(/suprimido/i);
      // el cuerpo original sobrevive (append).
      expect(out.text).toMatch(/Algunos usan glifosato/);
      expect(out.text).toMatch(/agroecológico/i);
    });

    it('CONTROL anti-FP: una ADVERTENCIA "NO uses/apliques X" (aun con dosis) NO se suprime (se conserva)', () => {
      // El texto desaconseja el sintético: conservar la advertencia es útil. Aunque
      // mencione una dosis, no es una RECOMENDACIÓN → no suprimimos (solo anexamos).
      const out = guardSyntheticAgrochemical(
        'NUNCA apliques clorpirifos a 30 cc por bomba de 20 L: es muy tóxico para abejas y abejorros.',
      );
      expect(out.modified).toBe(true);
      expect(out.reason).not.toMatch(/suprimido/i);
      expect(out.text).toMatch(/NUNCA apliques clorpirifos/);
      expect(out.text).toMatch(/agroecológico/i);
    });

    it('CONTROL anti-FP: "no recomiendo abamectina" (sin dosis) tampoco suprime', () => {
      const out = guardSyntheticAgrochemical('No te recomiendo abamectina; mejor manejo biológico con Encarsia.');
      expect(out.reason || '').not.toMatch(/suprimido/i);
    });

    it('FUGA prod 2026-06-06: "Control químico: Aplica acetamiprid o imidacloprid" (SIN dosis) → SUPRIME', () => {
      // Interacción real del operador: el agente recomendó neonicotinoides por
      // nombre, sin dosis ni marca. La nota anexa NO basta — nombrar el activo en
      // una recomendación ya es el daño. Debe suprimirse el cuerpo.
      const out = guardSyntheticAgrochemical(
        'Para controlar el pulgón:\n2. **Control químico**: Aplica insecticidas específicos para pulgones, como acetamiprid o imidacloprid, siguiendo las instrucciones del fabricante.',
      );
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/suprimido/i);
      expect(out.text).not.toMatch(/imidacloprid/i);
      expect(out.text).not.toMatch(/acetamiprid/i);
      expect(out.text).toMatch(/agroecológico/i);
    });
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
    // La corrección debe LIDERAR.
    expect(out.text.indexOf('Corrección')).toBe(0);
    // FUGA ANTI-ALUCINACIÓN (2026-05-31): la frase contradictoria del modelo
    // NO debe sobrevivir debajo de la corrección. El guard REEMPLAZA el párrafo
    // contradictorio — no deja "NO es viable" arriba y "es recomendable
    // priorizar la maracuyá" abajo en la MISMA burbuja (autocontradicción
    // visible al usuario). El veredicto del modelo invertido se borra.
    expect(out.text).not.toMatch(/es recomendable priorizar la maracuy/i);
  });

  it('FUGA: la respuesta final NO contiene a la vez "NO es viable" y un fomento de siembra de la MISMA especie (sin autocontradicción)', () => {
    // Reproduce la fuga viva: el modelo manda a sembrar la inviable en una
    // oración y el guard, al solo prepender, dejaba ambas afirmaciones
    // opuestas en la misma burbuja. La salida corregida debe ser COHERENTE.
    const llmFail =
      'En tu finca de Sibundoy a 2100 metros, es recomendable priorizar la maracuyá ' +
      'porque pagan bien. Puedes sembrarla cerca de la casa para tenerla a mano.';
    const out = guardInvertedViability(llmFail, [maracuyaInviable], 2100);
    expect(out.modified).toBe(true);
    // Veredicto correcto presente.
    expect(out.text).toMatch(/NO es viable/i);
    // Ninguna frase de fomento de la maracuyá sobrevive.
    expect(out.text).not.toMatch(/es recomendable priorizar la maracuy/i);
    expect(out.text).not.toMatch(/puedes sembrarla/i);
    // Coherencia: el texto final no debe presentar la maracuyá como sembrable.
    // (la única mención de "maracuyá" sembrable que sobrevive es la negada).
    const normalized = out.text.toLowerCase();
    expect(normalized).not.toMatch(/recomendable priorizar|puedes sembrarla|conviene sembrar/);
  });

  it('FUGA: preserva oraciones legítimas alrededor del párrafo contradictorio', () => {
    // El reemplazo debe ser quirúrgico: solo borra lo que afirma viabilidad de
    // la inviable, conservando contexto útil no contradictorio.
    const llmFail =
      'El maracuyá es una passiflora trepadora de fruto ácido. ' +
      'A 2100 metros es recomendable priorizar la maracuyá porque pagan bien. ' +
      'En general las passifloras necesitan tutorado.';
    const out = guardInvertedViability(llmFail, [maracuyaInviable], 2100);
    expect(out.modified).toBe(true);
    // La oración contradictoria desaparece.
    expect(out.text).not.toMatch(/es recomendable priorizar la maracuy/i);
    // El contexto botánico legítimo se conserva.
    expect(out.text).toMatch(/passiflora trepadora|necesitan tutorado/i);
    // Y el veredicto correcto lidera.
    expect(out.text.indexOf('Corrección')).toBe(0);
  });

  it('CPX-009 (bench): corrige "puede prosperar sin problemas" / "se cultiva ampliamente" en Chocó', () => {
    const llmFail =
      'La oca (Oxalis tuberosa) se cultiva ampliamente en regiones montañosas como el Chocó y puede ' +
      'prosperar sin problemas en tu clima cálido.';
    const out = guardInvertedViability(llmFail, [ocaInviable], 50);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/NO es viable/i);
    expect(out.text).toMatch(/chontaduro|plátano/);
    // El reemplazo borra la frase contradictoria del modelo.
    expect(out.text).not.toMatch(/se cultiva ampliamente/i);
    expect(out.text).not.toMatch(/puede prosperar sin problemas/i);
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
    // El fraseo invertido del modelo se reemplaza, no se prepende debajo.
    expect(out.text).not.toMatch(/podría tener éxito/i);
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
    // La afirmación falsa del modelo ("adecuada para zonas tropicales") se borra.
    expect(out.text).not.toMatch(/adecuada para zonas tropicales/i);
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
      // El consejo invertido ("te conviene sembrar la curuba") se reemplaza.
      expect(out.text).not.toMatch(/te conviene sembrar la curuba/i);
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
      // La invitación a cultivar la especie inviable se reemplaza.
      expect(out.text).not.toMatch(/puedes cultivar la chugua/i);
    });

    it('dispara con "buena para sembrar acá" (fraseo coloquial fuera de la lista)', () => {
      const maracuya = { ...maracuyaInviable };
      const llmFail = 'La maracuyá es buena para sembrar acá, ponla cerca de tu casa.';
      const out = guardInvertedViability(llmFail, [maracuya], 2100);
      expect(out.modified).toBe(true);
      expect(out.text).toMatch(/gulupa/);
      // El fraseo coloquial invertido se reemplaza, no queda debajo.
      expect(out.text).not.toMatch(/es buena para sembrar acá/i);
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

  // Test para verify que una cita fabricada NO suprime el caveat (fix #guardrail-contacts)
  it('AÑADE caveat incluso si el modelo inventa una cita genérica de fuente', () => {
    // El modelo inventa "según una recomendación de la entidad" sin especificar cuál
    const txt = 'Según una recomendación de la entidad, aplica 30 ml/L de la solución.';
    const out = guardDoseWithoutSource(txt);
    // Debe añadir caveat porque "de la entidad" NO es una fuente verificada
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/confirma la dosis/i);
  });

  it('AÑADE caveat si cita un decreto inventado', () => {
    // El modelo inventa "Decreto 1234 de 2020" que no existe
    const txt = 'Según el Decreto 1234 de 2020, aplica 5 g por planta.';
    const out = guardDoseWithoutSource(txt);
    // Debe añadir caveat porque el decreto no está verificado
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/confirma la dosis/i);
  });

  it('NO suaviza si cita ICA (fuente verificada)', () => {
    const txt = 'Según el ICA, aplica 30 ml/L de caldo bordelés.';
    const out = guardDoseWithoutSource(txt);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
  });

  it('NO suaviza si cita Agrosavia (fuente verificada)', () => {
    const txt = 'De acuerdo con Agrosavia, diluye 2 cc en agua.';
    const out = guardDoseWithoutSource(txt);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GUARD 5 — contacto inventado (teléfonos, correos, URLs, decretos)
// ──────────────────────────────────────────────────────────────────────────
describe('guardInventedContact', () => {
  it('detecta y reemplaza teléfono inventado', () => {
    // El modelo inventa un teléfono institucional
    const txt = 'Para reportar la plaga cuarentenaria, llama al 300 123 4567.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/teléfono/);
    expect(out.text).toMatch(/VERIFICAR CONTACTO OFICIAL/);
    expect(out.text).not.toMatch(/300 123 4567/);
  });

  it('detecta y reemplaza correo inventado', () => {
    const txt = 'Envía tu reporte a reportes@ica-inventado.gov.co para revisión.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/correo/);
    expect(out.text).toMatch(/VERIFICAR CONTACTO OFICIAL/);
    expect(out.text).not.toMatch(/reportes@ica-inventado\.gov\.co/);
  });

  it('detecta y reemplaza URL inventada', () => {
    const txt = 'Visita www.minagricultura-falso.gov.co para más información.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/URL/);
    expect(out.text).toMatch(/VERIFICAR CONTACTO OFICIAL/);
    expect(out.text).not.toContain('www.minagricultura-falso.gov.co');
  });

  it('detecta y reemplaza decreto/resolución inventado', () => {
    const txt = 'Según el Decreto 9999 de 2025, debes aplicar esta dosis.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/normativa/);
    expect(out.text).toMatch(/VERIFICAR NORMATIVA OFICIAL/);
  });

  it('NO toca Ley 1930 (decreto verificado conocido)', () => {
    const txt = 'La Ley 1930 de 2018 prohíbe la quema en páramo.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
  });

  it('detecta múltiples contactos inventados en un solo texto', () => {
    const txt =
      'Llama al 320 987 6543 o escribe a contacto@umata-inventado.gov.co. ' +
      'También visita www.agricultura-falsa.co para más info.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/VERIFICAR CONTACTO OFICIAL/);
    expect(out.text).not.toMatch(/320 987 6543|contacto@umata-inventado\.gov\.co|www\.agricultura-falsa\.co/);
  });

  it('NO dispara si no hay contactos', () => {
    const txt = 'Aplica caldo bordelés como preventivo.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
  });

  it('detecta teléfono con formato (+57)', () => {
    const txt = 'Contacta al +57 300 123 4567 para ayuda.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/VERIFICAR CONTACTO OFICIAL/);
  });

  it('detecta teléfono con paréntesis', () => {
    const txt = 'Llama al (300) 123-4567 para reportar.';
    const out = guardInventedContact(txt);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/VERIFICAR CONTACTO OFICIAL/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GUARD 5B - contacto institucional con número, correo o dirección inventados
// ──────────────────────────────────────────────────────────────────────────
describe('guardHallucinatedContact', () => {
  it('suprime un telefono institucional del ICA y remite al canal oficial genérico', () => {
    const txt = 'El ICA atiende al 601-3323700 para reportes fitosanitarios.';
    const out = guardHallucinatedContact(txt, { userMessage: 'cual es el telefono del ICA?' });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/contacto_institucional_hallucinado/);
    expect(out.text).toMatch(/canal oficial de la entidad/i);
    expect(out.text).toMatch(/ica\.gov\.co/i);
    expect(out.text).not.toMatch(/601-3323700/);
  });

  it('no toca una mención legitima sin dato de contacto', () => {
    const txt = 'Puede consultar al ICA si necesita orientacion tecnica.';
    const out = guardHallucinatedContact(txt, { userMessage: 'cual es el contacto del ICA?' });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
  });

  it('suprime un correo institucional afirmado como contacto', () => {
    const txt = 'Escriba a contacto@ica.gov.co para validar el tramite.';
    const out = guardHallucinatedContact(txt, { userMessage: 'cual es el correo del ICA?' });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/canal oficial de la entidad/i);
    expect(out.text).not.toMatch(/contacto@ica\.gov\.co/);
  });

  it('cableado en applyOutputGuards', () => {
    const txt = 'La UMATA atiende en 320 987 6543 para orientar el cultivo.';
    const out = applyOutputGuards(txt, { userMessage: 'cual es el contacto de la UMATA?' });
    expect(out.modified).toBe(true);
    expect(out.reasons.join(' ')).toMatch(/contacto_institucional_hallucinado/);
    expect(out.text).toMatch(/canal oficial de la entidad/i);
    expect(out.text).not.toMatch(/320 987 6543/);
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
  // A10 (2026-06-02): el culprit debe ser un binomio REAL del catálogo. La curuba
  // (Passiflora tripartita) entra al universo del grounding como entidad resuelta
  // de otra especie → el guard puede confirmar que "Passiflora tripartita" es una
  // especie real mal atribuida al lulo (no prosa/alucinación). Sin esto, un par
  // latino que no exista en el catálogo NO dispara (conservador).
  const luloResolved = [
    {
      mentioned: 'lulo',
      kind: 'species',
      nombre_comun: 'Lulo / Naranjilla / Chuva',
      nombre_cientifico: 'Solanum quitoense Lam.',
      canonical_id: 'solanum_quitoense',
      confidence: 0.95,
    },
    {
      mentioned: 'curuba',
      kind: 'species',
      nombre_comun: 'Curuba',
      nombre_cientifico: 'Passiflora tripartita var. mollissima (Kunth) Holm-Niels.',
      canonical_id: 'passiflora_tripartita',
      confidence: 0.9,
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

  it('CASO PILOTO 2026-06-04: NO atribuye binomio de "tomate de árbol" a un homónimo ("tomate arandano")', () => {
    // El resolver fuzzy-matcheó "tomate arandano" → los cultivares "tomate de árbol"
    // (comparten el token genérico "tomate") y los inyectó al grounding. El guard NO
    // debe "corregir" que «tomate de árbol es Solanum betaceum, no Solanum lycopersicum»
    // sobre un texto que habla de OTRO cultivo. Antes disparaba DOS correcciones falsas
    // (cultivar naranja + morado) porque anclaba solo en "tomate".
    const resolved = [
      {
        mentioned: 'tomate de árbol naranja',
        kind: 'species',
        nombre_comun: 'Tomate de árbol naranja',
        nombre_cientifico: 'Solanum betaceum Cav.',
        canonical_id: 'solanum_betaceum_naranja',
        confidence: 0.6,
      },
      {
        mentioned: 'tomate de árbol morado',
        kind: 'species',
        nombre_comun: 'Tomate de árbol morado',
        nombre_cientifico: 'Solanum betaceum Cav.',
        canonical_id: 'solanum_betaceum_morado',
        confidence: 0.6,
      },
      {
        mentioned: 'tomate',
        kind: 'species',
        nombre_comun: 'Tomate',
        nombre_cientifico: 'Solanum lycopersicum L.',
        canonical_id: 'solanum_lycopersicum',
        confidence: 0.7,
      },
    ];
    const txt =
      'El tomate arandano (Solanum lycopersicum) es una variedad de tomate cereza. ' +
      'Prefiere suelos bien drenados y clima templado.';
    const out = guardSpeciesSubstitution(txt, resolved);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(txt);
    expect(out.text).not.toMatch(/tomate de [aá]rbol[^.]*es Solanum betaceum/i);
  });

  it('SÍ sigue corrigiendo "tomate de árbol" cuando el TEXTO sí habla de tomate de árbol', () => {
    // Anti-regresión del fix de ancla: el caso legítimo (el texto menciona el cultivo
    // multi-palabra real) debe seguir disparando. El modelo le puso un binomio errado
    // y real del grounding a un cultivo que sí es tomate de árbol.
    const resolved = [
      {
        mentioned: 'tomate de árbol',
        kind: 'species',
        nombre_comun: 'Tomate de árbol',
        nombre_cientifico: 'Solanum betaceum Cav.',
        canonical_id: 'solanum_betaceum',
        confidence: 0.9,
      },
      {
        mentioned: 'lulo',
        kind: 'species',
        nombre_comun: 'Lulo',
        nombre_cientifico: 'Solanum quitoense Lam.',
        canonical_id: 'solanum_quitoense',
        confidence: 0.9,
      },
    ];
    const txt =
      'El tomate de árbol (Solanum quitoense) es una fruta andina de clima frío que ' +
      'se da entre 1800 y 2600 msnm.';
    const out = guardSpeciesSubstitution(txt, resolved);
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/Solanum betaceum/);
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
  // A10 (2026-06-02): el culprit debe ser un binomio REAL del catálogo. Los
  // binomios que el modelo sustituye en el bench (Quercus molinae, Calendula
  // officinalis) entran al universo del grounding como especies reales (otros
  // companions del catálogo), para que el guard confirme que SON reales y solo
  // están mal atribuidos — no prosa/alucinación. Un binomio que no exista en el
  // catálogo NO dispara (conservador).
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
        // Roble andino real del catálogo: su binomio (Quercus molinae) es el que
        // el modelo le endilga por error al Nogal andino en el caso del bench.
        {
          canonical_id: 'quercus_molinae',
          nombre_comun: 'Roble andino',
          nombre_cientifico: 'Quercus molinae',
        },
      ],
      companions: [
        {
          canonical_id: 'tagetes_erecta',
          nombre_comun: 'Caléndula',
          nombre_cientifico: 'Tagetes erecta L.',
        },
        // Caléndula europea real del catálogo: su binomio (Calendula officinalis)
        // es el que el modelo confunde con la Caléndula=Tagetes erecta.
        {
          canonical_id: 'calendula_officinalis',
          nombre_comun: 'Caléndula europea',
          nombre_cientifico: 'Calendula officinalis L.',
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
    expect(filterNoiseEntities(/** @type {any} */ ('x'))).toEqual([]);
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
// R2 — siglas institucionales y meta-pregunta (fallo real canario 2026-07-20)
// El canario preguntó "¿de dónde sale esa recomendación? Dame la fuente o la
// entidad (ICA / SENA)..." y el resolver mapeó "ICA" → col rizada (Brassica
// oleracea, cuya prosa cita "Fuentes Tier A: ICA Resolución 3168/2015...") y
// "Fuente" → Pennisetum setaceum (nombre_comun "Pasto fuente"). El agente
// construyó toda la respuesta sobre esas especies fantasma.
// ──────────────────────────────────────────────────────────────────────────
describe('filterNoiseEntities — siglas institucionales y meta-pregunta (canario 2026-07-20)', () => {
  it('descarta "ICA" aunque haya resuelto a col rizada (Brassica oleracea)', () => {
    const entities = [
      { mentioned: 'ICA', kind: 'species', nombre_comun: 'col rizada', nombre_cientifico: 'Brassica oleracea' },
    ];
    expect(filterNoiseEntities(entities)).toHaveLength(0);
  });

  it('descarta "SENA" igual que "ICA"', () => {
    const entities = [
      { mentioned: 'SENA', kind: 'species', nombre_comun: 'algo', nombre_cientifico: 'Algo sp.' },
    ];
    expect(filterNoiseEntities(entities)).toHaveLength(0);
  });

  it('descarta "Fuente" aunque haya resuelto a Pennisetum setaceum ("pasto fuente")', () => {
    const entities = [
      { mentioned: 'Fuente', kind: 'species', nombre_comun: 'pasto fuente', nombre_cientifico: 'Pennisetum setaceum' },
    ];
    expect(filterNoiseEntities(entities)).toHaveLength(0);
  });

  it('descarta el resto de siglas institucionales y vocabulario de meta-pregunta', () => {
    const ruido = [
      'agrosavia', 'corpoica', 'mads', 'ideam', 'icontec', 'dane', 'cenicafe',
      'fao', 'minagricultura', 'umata', 'car', 'cvc', 'invima', 'upra',
      'fuentes', 'entidad', 'entidades', 'norma', 'normativa', 'resolucion',
      'decreto', 'ley', 'cartilla', 'referencia', 'recomendacion',
    ].map((m) => ({ mentioned: m, kind: 'species' }));
    expect(filterNoiseEntities(ruido)).toHaveLength(0);
  });

  it('NO-REGRESIÓN: "pasto fuente" (mención completa de una especie real) se CONSERVA', () => {
    const entities = [
      { mentioned: 'pasto fuente', kind: 'species', nombre_comun: 'pasto fuente', nombre_cientifico: 'Pennisetum setaceum' },
    ];
    const out = filterNoiseEntities(entities);
    expect(out).toHaveLength(1);
    expect(out[0].mentioned).toBe('pasto fuente');
  });

  it('NO-REGRESIÓN: una especie legítima cualquiera (papa → Solanum tuberosum) se CONSERVA', () => {
    const entities = [
      { mentioned: 'papa', kind: 'species', nombre_comun: 'papa', nombre_cientifico: 'Solanum tuberosum' },
    ];
    const out = filterNoiseEntities(entities);
    expect(out).toHaveLength(1);
    expect(out[0].mentioned).toBe('papa');
  });

  it('en la cadena: "ICA"→col rizada NO dispara guards sobre la especie fantasma', () => {
    const resolved = [
      { mentioned: 'ICA', kind: 'species', nombre_comun: 'col rizada', nombre_cientifico: 'Brassica oleracea' },
    ];
    const txt = 'El ICA (Brassica oleracea) se cultiva bien en climas fríos.';
    const out = applyOutputGuards(txt, { resolvedEntities: resolved });
    expect(out.modified).toBe(false);
  });

  it('el cotejo es EXACTO y normalizado: "ICA" (mayúsculas) se filtra igual que "ica"', () => {
    const entities = [
      { mentioned: 'ICA', kind: 'species', nombre_comun: 'col rizada', nombre_cientifico: 'Brassica oleracea' },
      { mentioned: 'ica', kind: 'species', nombre_comun: 'col rizada', nombre_cientifico: 'Brassica oleracea' },
      { mentioned: 'IcA', kind: 'species', nombre_comun: 'col rizada', nombre_cientifico: 'Brassica oleracea' },
    ];
    expect(filterNoiseEntities(entities)).toHaveLength(0);
  });

  it('LIMITACIÓN CONOCIDA (no es un defecto a esconder): "ICA / SENA" como span largo NO se filtra', () => {
    // El cotejo de filterNoiseEntities es sobre `mentioned` COMPLETO y
    // normalizado contra la lista cerrada (NLU_NOISE_MENTIONS.has(...)), no
    // substring ni tokenización interna. Si el sidecar devuelve un span largo
    // ("ICA / SENA", la frase completa que el usuario tecleó) en vez del
    // token institucional suelto ("ICA"), ese span NO es un elemento literal
    // del Set → el filtro NO lo descarta. Esto es una limitación conocida y
    // documentada del alcance de este fix, no una regresión: el fix de raíz
    // (turno 4 del canario 2026-07-20) resolvía tokens sueltos ("ICA",
    // "Fuente"), que sí quedan cubiertos. Si el resolver empieza a devolver
    // spans largos con instituciones embebidas, hará falta un guard aparte
    // (fuera de alcance de este PR).
    const entities = [
      { mentioned: 'ICA / SENA', kind: 'species', nombre_comun: 'col rizada', nombre_cientifico: 'Brassica oleracea' },
    ];
    const out = filterNoiseEntities(entities);
    expect(out).toHaveLength(1);
    expect(out[0].mentioned).toBe('ICA / SENA');
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

// ──────────────────────────────────────────────────────────────────────────
// HARDENING 2 (audit #23) — viabilidad TÉRMICA (helada / golpe de calor)
// ──────────────────────────────────────────────────────────────────────────
describe('guardThermalViability', () => {
  // Cultivo de clima cálido: muere con frío (temp_min alta). Si el pronóstico
  // baja por debajo de su temp_min → riesgo de helada.
  const tomateEntity = {
    kind: 'species',
    mentioned: 'tomate',
    nombre_comun: 'Tomate',
    nombre_cientifico: 'Solanum lycopersicum',
    temp_min: 12,
    temp_max: 30,
  };
  // Cultivo de clima frío: se estresa con calor (temp_max baja).
  const papaEntity = {
    kind: 'species',
    mentioned: 'papa',
    nombre_comun: 'Papa',
    nombre_cientifico: 'Solanum tuberosum',
    temp_min: 5,
    temp_max: 20,
  };

  it('detecta riesgo de HELADA: el pronóstico baja por debajo de temp_min del cultivo recomendado', () => {
    const txt = 'El tomate va muy bien en tu finca, siémbralo ahora que está la temporada.';
    const out = guardThermalViability(txt, [tomateEntity], null, {
      forecastTempMin: 4,
      forecastTempMax: 18,
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/helada|frio|t[eé]rmic/i);
    expect(out.text).toMatch(/helada|frío|protec/i);
  });

  it('detecta riesgo de GOLPE DE CALOR: el pronóstico sube por encima de temp_max del cultivo', () => {
    const txt = 'La papa es buena opción, plántala en este lote.';
    const out = guardThermalViability(txt, [papaEntity], null, {
      forecastTempMin: 10,
      forecastTempMax: 28,
    });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/calor|t[eé]rmic/i);
    expect(out.text).toMatch(/calor|sombra|protec/i);
  });

  it('tono HUMILDE / zona gris: ADVIERTE, no bloquea ni borra el texto del modelo', () => {
    const txt = 'El tomate va muy bien, siémbralo ahora.';
    const out = guardThermalViability(txt, [tomateEntity], null, {
      forecastTempMin: 4,
      forecastTempMax: 18,
    });
    // El texto original se conserva; solo se ANEXA la advertencia.
    expect(out.text).toContain('El tomate va muy bien');
    expect(out.text).toMatch(/ojo|riesgo/i);
  });

  it('NO dispara si el cultivo NO se está recomendando sembrar (solo se menciona)', () => {
    const txt = 'El tomate es una solanácea originaria de los Andes; tiene muchas variedades.';
    const out = guardThermalViability(txt, [tomateEntity], null, {
      forecastTempMin: 4,
      forecastTempMax: 18,
    });
    expect(out.modified).toBe(false);
  });

  it('NO dispara si el pronóstico está dentro del rango térmico del cultivo (margen OK)', () => {
    const txt = 'Siembra el tomate, va perfecto en tu clima.';
    const out = guardThermalViability(txt, [tomateEntity], null, {
      forecastTempMin: 16,
      forecastTempMax: 26,
    });
    expect(out.modified).toBe(false);
  });

  it('NO-OP graceful sin temperatura de pronóstico en el contexto', () => {
    const txt = 'Siembra el tomate, va perfecto.';
    expect(guardThermalViability(txt, [tomateEntity], null, {}).modified).toBe(false);
    expect(guardThermalViability(txt, [tomateEntity], null).modified).toBe(false);
    expect(
      guardThermalViability(txt, [tomateEntity], null, { forecastTempMin: null, forecastTempMax: null })
        .modified,
    ).toBe(false);
  });

  it('NO-OP sin entidades resueltas', () => {
    const out = guardThermalViability('Siembra el tomate.', [], null, {
      forecastTempMin: 4,
      forecastTempMax: 18,
    });
    expect(out.modified).toBe(false);
  });

  it('NO-OP si la entidad no trae temp_min/temp_max (grounding incompleto)', () => {
    const sinTemp = { kind: 'species', mentioned: 'yuca', nombre_comun: 'Yuca' };
    const out = guardThermalViability('Siembra la yuca, va muy bien.', [sinTemp], null, {
      forecastTempMin: 4,
      forecastTempMax: 40,
    });
    expect(out.modified).toBe(false);
  });

  it('maneja entrada vacía / no-string', () => {
    expect(guardThermalViability('', [tomateEntity], null, { forecastTempMin: 4 }).modified).toBe(false);
    expect(guardThermalViability(null, [tomateEntity], null, { forecastTempMin: 4 }).text).toBe('');
  });

  it('idempotente: no re-anexa la advertencia si ya está aplicada', () => {
    const txt = 'El tomate va muy bien, siémbralo ahora.';
    const once = guardThermalViability(txt, [tomateEntity], null, {
      forecastTempMin: 4,
      forecastTempMax: 18,
    });
    const twice = guardThermalViability(once.text, [tomateEntity], null, {
      forecastTempMin: 4,
      forecastTempMax: 18,
    });
    expect(twice.modified).toBe(false);
  });
});

describe('applyOutputGuards (cadena)', () => {
  it('cablea forecastTempMin/Max: advierte helada para cultivo recomendado vía applyOutputGuards', () => {
    const resolved = [
      {
        kind: 'species',
        mentioned: 'tomate',
        nombre_comun: 'Tomate',
        nombre_cientifico: 'Solanum lycopersicum',
        temp_min: 12,
        temp_max: 30,
      },
    ];
    const llmFail = 'El tomate va muy bien en tu finca, siémbralo ahora.';
    const out = applyOutputGuards(llmFail, {
      resolvedEntities: resolved,
      forecastTempMin: 3,
      forecastTempMax: 17,
    });
    expect(out.modified).toBe(true);
    expect(out.reasons.some((r) => /helada|t[eé]rmic|calor/i.test(r))).toBe(true);
    expect(out.text).toMatch(/helada|protec/i);
  });

  it('cadena: sin forecastTemp el guard térmico es no-op (no rompe la cadena)', () => {
    const resolved = [
      { kind: 'species', mentioned: 'tomate', nombre_comun: 'Tomate', temp_min: 12, temp_max: 30 },
    ];
    const ok = 'El tomate es una buena opción para tu clima templado.';
    const out = applyOutputGuards(ok, { resolvedEntities: resolved });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

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
      // A10: la curuba (Passiflora tripartita) entra al universo como especie
      // real del catálogo → el guard confirma que el binomio mal atribuido al
      // lulo es de una especie real (no prosa) y corrige.
      {
        mentioned: 'curuba',
        kind: 'species',
        nombre_comun: 'Curuba',
        nombre_cientifico: 'Passiflora tripartita var. mollissima (Kunth) Holm-Niels.',
        canonical_id: 'passiflora_tripartita',
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

  // ── guardConciseResponse ─────────────────────────────────────────────────
  describe('guardConciseResponse', () => {
    it('NO toca respuestas cortas (<250 palabras)', () => {
      const ok = 'Para la roya del café recomiendo podar las ramas afectadas y aplicar caldo bordelés.';
      const out = guardConciseResponse(ok);
      expect(out.modified).toBe(false);
      expect(out.text).toBe(ok);
    });

    it('recorta respuestas verborrea (>700 palabras) conservando ~10 oraciones + oferta', () => {
      // 2026-07-12: umbral subido a 700 (antes 250 mutilaba respuestas técnicas).
      const long = Array.from({ length: 120 }, (_, i) =>
        `Recomendacion ${i + 1} para tu cultivo de tomate en clima frio de montaña.`
      ).join(' ');
      expect(long.split(/\s+/).filter(Boolean).length).toBeGreaterThan(700);
      const out = guardConciseResponse(long);
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/verbose|concise|hard/i);
      expect(out.text).toMatch(/¿Quieres que profundice/i);
    });

    it('NO recorta respuestas técnicas de 250-700 palabras (intelligence-first)', () => {
      // Regresión del bug reportado 2026-07-12: respuestas técnicas se cortaban
      // a 1/3. Una respuesta detallada de ~450 palabras debe quedar INTACTA.
      const tecnica = Array.from({ length: 55 }, (_, i) =>
        `Detalle tecnico ${i + 1} sobre el manejo de la fresa en clima frio.`
      ).join(' ');
      const w = tecnica.split(/\s+/).filter(Boolean).length;
      expect(w).toBeGreaterThan(250);
      expect(w).toBeLessThan(700);
      const out = guardConciseResponse(tecnica);
      expect(out.modified).toBe(false);
      expect(out.text).toBe(tecnica);
    });

    it('fuerza recorte duro si >400 palabras', () => {
      const veryLong = Array.from({ length: 80 }, (_, i) =>
        `Este es el párrafo extenso número ${i + 1} con detalles sobre la fresa en cultivo de clima frío.`
      ).join('. ');
      expect(veryLong.split(/\s+/).filter(Boolean).length).toBeGreaterThan(400);
      const out = guardConciseResponse(veryLong);
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/hard_limit/i);
    });

    it('deduplica si misma recomendación aparece 3+ veces', () => {
      const redundant = 'Recomiendo regar cada 3 días. '.repeat(60) +
        'También recomiendo podar en seco una vez al mes.';
      const out = guardConciseResponse(redundant);
      expect(out.modified).toBe(true);
      expect(out.reason).toMatch(/redundant/i);
    });

    it('safety-led: preserva el plan del cuerpo, no solo el preámbulo (bug gota→stub 2026-06-23)', () => {
      // Regresión: con un preámbulo de seguridad al frente, la truncación naíf
      // "primeras N oraciones" se quedaba SOLO con el aviso y botaba el plan →
      // respuesta stub repetitiva. El fix preserva aviso + N oraciones del cuerpo.
      const prefix =
        '⚠️ Ojo de seguridad: Phytophthora infestans (tizón tardío) en papa/tomate. ' +
        'Gota es patógeno letal, no es problema de riego. ';
      const body = Array.from({ length: 60 }, (_, i) =>
        `Paso de manejo número ${i + 1}: aplica caldo bordelés preventivo y mejora el drenaje del cultivo.`
      ).join(' ');
      const out = guardConciseResponse(prefix + body);
      expect(out.modified).toBe(true);
      // El aviso de seguridad sobrevive…
      expect(out.text).toMatch(/Ojo de seguridad/);
      // …Y TAMBIÉN contenido sustantivo del cuerpo (no solo el preámbulo + oferta).
      expect(out.text).toMatch(/caldo bordel|manejo|drenaje/i);
    });

    it('no-op para string vacío', () => {
      expect(guardConciseResponse('').modified).toBe(false);
    });

    it('no-op para no-string', () => {
      expect(guardConciseResponse(null).modified).toBe(false);
      expect(guardConciseResponse(undefined).modified).toBe(false);
    });

    it('se integra en la cadena applyOutputGuards: recorta respuesta larga', () => {
      const veryLong = Array.from({ length: 110 }, (_, i) =>
        `Paso importante número ${i + 1} que debes seguir en tu cultivo de tomate en clima frío.`
      ).join(' ');
      const out = applyOutputGuards(veryLong, {});
      expect(out.modified).toBe(true);
      const hasConcise = out.reasons.some(r => /concise/i.test(r));
      expect(hasConcise).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// TESTS MERGED from tests/unit/outputGuards.test.js (dedup TAREA 121)
// Funciones unicas no cubiertas por la version de servicios.
// ──────────────────────────────────────────────────────────────────────────

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
    const ocurrencias = (res.text.match(/Corrección importante/g) || []).length;
    expect(ocurrencias).toBe(1);
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

describe('guardReforestacionNativasRol — sugerencia POSITIVA de nativas con rol', () => {
  it('query genérica de reforestación → anexa nativas con rol', () => {
    const userMessage = '¿Qué siembro para reforestar mi finca quemada?';
    const respuesta = 'Buena idea recuperar el bosque. Prepara el terreno y siembra al inicio de lluvias.';
    const res = guardReforestacionNativasRol(respuesta, { userMessage });
    expect(res.modified).toBe(true);
    expect(res.reason).toBe('reforestacion_nativas_rol');
    const lower = res.text.toLowerCase();
    expect(lower).toContain('pioner');
    expect(lower).toContain('fijador');
    expect(lower).toContain('cortafuego');
    expect(lower).toContain('rebrote');
    expect(res.text).toContain('Alnus acuminata');
    expect(res.text).toContain('Quercus humboldtii');
    expect(res.text).toContain('Clusia multiflora');
    expect(res.text).toContain('280');
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

  it.skip('nombre inventado mencionado (hueco conocido)', () => {
    // TODO-Opus: Implementar detección de nombres comunes inventados que no
    // están en el catálogo de especies conocidas.
  });
});

describe('guardParamoNormativa — Ley 1930 (suppress-and-replace)', () => {
  it('siembra en páramo → SUPRIME y REEMPLAZA con restricción legal', () => {
    const texto = 'Puedes sembrar papa en el páramo sin problema. El clima es ideal.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).toContain('prohíbe actividades agropecuarias');
    expect(res.text).toContain('Páramo');
    expect(res.text).not.toContain('sembrar papa en el páramo');
    expect(res.text).not.toContain('clima es ideal');
    expect(res.reason).toBe('paramo_normativa_suprimido: siembra/fumigación_recomendada_en_paramo');
  });

  it('fumigación en páramo → SUPRIME y REEMPLAZA con restricción legal', () => {
    const texto = 'Aplica este fungicida en tu cultivo del páramo para controlar la plaga.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).toContain('prohíbe');
    expect(res.text).toContain('agroquímicos');
    expect(res.text).not.toContain('Aplica este fungicida');
    expect(res.reason).toBe('paramo_normativa_suprimido: siembra/fumigación_recomendada_en_paramo');
  });

  it('frailejón + sembrar → dispara (frailejón es keyword de páramo)', () => {
    const texto = 'Planta frailejones para recuperar la zona y siembra papa al lado.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('siembra papa al lado');
  });

  it('páramo sin verbo de siembra/fumigación → NO dispara', () => {
    const texto = 'Los páramos son ecosistemas de importancia hídrica para Colombia.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('siembra/fumigación sin páramo → NO dispara', () => {
    const texto = 'Puedes sembrar papa en tu finca. El clima es ideal.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('string vacío → NO dispara', () => {
    const res = guardParamoNormativa('');
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('null → NO dispara (graceful degradation)', () => {
    const res = guardParamoNormativa(null);
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('subpáramo + rociado → dispara (subpáramo es keyword)', () => {
    const texto = 'Rocia fungicida en el subpáramo para proteger las plantas.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('Rocia fungicida');
  });

  it('cultivo en zona de páramo → dispara', () => {
    const texto = 'Cultiva cebolla en la zona de páramo con riego constante.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('Cultiva cebolla');
  });

  it('aspersión de pesticida en páramo → dispara', () => {
    const texto = 'Realiza aspersión de pesticida en el páramo para controlar plagas.';
    const res = guardParamoNormativa(texto);
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Ley 1930 de 2018');
    expect(res.text).not.toContain('aspersión de pesticida');
  });
});

describe('guardClimaConsejo — consejo general de clima (aditivo)', () => {
  it('helada mencionada → adiciona consejo climático', () => {
    const texto = 'Protégete de las heladas nocturnas con cubiertas.';
    const res = guardClimaConsejo(texto, { forecastTempMin: 2 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    expect(res.text).toContain('plan de contingencia');
    expect(res.text).toContain('Protégete de las heladas');
    expect(res.text).toContain('cubiertas');
    expect(res.reason).toBe('clima_consejo_aditivo: condiciones_extremas_detectadas');
  });

  it('sequía mencionada → adiciona consejo climático', () => {
    const texto = 'La sequía está afectando el cultivo. Riega más frecuente.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    expect(res.text).toContain('La sequía está afectando');
    expect(res.text).toContain('Riega más frecuente');
  });

  it('forecastTempMin < 5°C → adiciona consejo específico', () => {
    const texto = 'Las heladas pueden dañar las plantas jóvenes.';
    const res = guardClimaConsejo(texto, { forecastTempMin: 3 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Pronóstico: se esperan temperaturas bajas');
    expect(res.text).toContain('3.0°C');
    expect(res.text).toContain('proteger cultivos sensibles');
  });

  it('forecastTempMax > 32°C → adiciona consejo específico', () => {
    const texto = 'El calor extremo puede estrés hídrico.';
    const res = guardClimaConsejo(texto, { forecastTempMax: 34 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Pronóstico: se esperan temperaturas altas');
    expect(res.text).toContain('34.0°C');
    expect(res.text).toContain('Asegura riego suficiente');
    expect(res.text).toContain('sombreado temporal');
  });

  it('fenómeno del Niño mencionado → adiciona consejo', () => {
    const texto = 'El fenómeno del Niño reduce las lluvias en la región.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    expect(res.text).toContain('El fenómeno del Niño reduce');
  });

  it('texto sin clima extremo → NO dispara', () => {
    const texto = 'El cultivo de papa se da bien en clima frío.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('string vacío → NO dispara', () => {
    const res = guardClimaConsejo('', {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('null → NO dispara (graceful degradation)', () => {
    const res = guardClimaConsejo(null, {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe('');
    expect(res.reason).toBeNull();
  });

  it('texto con consejo ya aplicado → NO re-dispara (idempotencia)', () => {
    const texto =
      'Las heladas pueden dañar las plantas.\n\n💡 Consejo climático\n\nMonitorear los pronósticos locales (IDEAM o meteoblue) regularmente.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(false);
    expect(res.text).toBe(texto);
    expect(res.reason).toBeNull();
  });

  it('ola de calor mencionada → adiciona consejo', () => {
    const texto = 'La ola de calor está provocando estrés en los cultivos.';
    const res = guardClimaConsejo(texto, { forecastTempMax: 35 });
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Pronóstico: se esperan temperaturas altas');
    expect(res.text).toContain('35.0°C');
    expect(res.text).toContain('La ola de calor está provocando');
  });

  it('variabilidad climática mencionada → adiciona consejo', () => {
    const texto = 'La variabilidad climática afecta los ciclos de cosecha.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
    expect(res.text).toContain('plan de contingencia');
  });

  it('inundación mencionada → adiciona consejo', () => {
    const texto = 'La inundación dañó el cultivo en la zona baja.';
    const res = guardClimaConsejo(texto, {});
    expect(res.modified).toBe(true);
    expect(res.text).toContain('Consejo climático');
    expect(res.text).toContain('Monitorear los pronósticos');
  });
});

describe('Integration — combinados anti-alucinación (merged dedup)', () => {
  it('applyOutputGuards: respuesta con dosis sin fuente + especie inventada', () => {
    const userMessage = '¿qué le echo al quirubanto andino?';
    const respuesta = 'Aplica 5 ml/L de fungicida al quirubanto andino cada 8 días.';
    const entities = [];
    const out = applyOutputGuards(respuesta, {
      resolvedEntities: entities,
      fincaAltitud: 2000,
      userMessage,
    });
    expect(out.text).toContain('confirma la dosis');
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
    expect(out.text).toContain('NO es viable');
    expect(out.text).toContain('cacao');
    expect(out.text).toContain('confirma la dosis');
    expect(out.reasons).toHaveLength(2);
  });
});

describe('applyOutputGuards — agroquímico sintético (guardSyntheticAgrochemical)', () => {
  it('detecta y anexa redirección orgánica cuando el modelo recomienda glifosato', () => {
    const respuesta = 'Aplica glifosato 2 L/ha para malezas.';
    const out = applyOutputGuards(respuesta, { userMessage: '¿cómo controlo las malezas?' });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/Chagra es agroecológico/i);
    expect(out.reasons.some(r => /agroquímico/i.test(r))).toBe(true);
  });

  it('detecta y anexa redirección orgánica cuando el modelo recomienda mancozeb', () => {
    const respuesta = 'Usa Mancozeb 80 WP 2.5 g/L para prevenir la roya.';
    const out = applyOutputGuards(respuesta, { userMessage: '¿cómo controlo la roya?' });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/Chagra es agroecológico/i);
    expect(out.reasons.some(r => /agroquímico/i.test(r))).toBe(true);
  });

  it('NO dispara para un biopreparado permitido como caldo bordelés', () => {
    const respuesta = 'Aplica caldo bordelés 10 g/L de sulfato de cobre como preventivo.';
    const out = applyOutputGuards(respuesta, { userMessage: '¿cómo prevenir hongos?' });
    expect(out.text).not.toMatch(/Chagra es agroecológico/i);
  });
});

describe('applyOutputGuards — veneno genérico (guardDisguisedGenericAgrochem)', () => {
  it('detecta "fungicida natural que sirve para todo" + dosis por bomba → suprime', () => {
    const respuesta =
      'Para la sigatoka usa un fungicida natural orgánico certificado que sirve para todo: echa 50 ml por ' +
      'bomba de 20 litros y repite cada 8 días.';
    const out = applyOutputGuards(respuesta, { userMessage: '¿cómo controlo la sigatoka?' });
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/50\s*ml por bomba/i);
    expect(out.text.toLowerCase()).toMatch(/no existe|ningún producto|sirve para todo/i);
  });

  it('NO suprime respuesta con biopreparado real y dosis', () => {
    const respuesta = 'Aplica caldo bordelés 10 g/L como preventivo.';
    const out = applyOutputGuards(respuesta, { userMessage: '¿cómo controlo hongos?' });
    expect(out.text).toContain('caldo bordelés');
  });
});

describe('applyOutputGuards — binomio benéfico no confirmado (guardFabricatedBeneficialBinomial)', () => {
  it('anexa caveat para Oligamus pectoralis en contexto de enemigos naturales', () => {
    const respuesta =
      'Para el pulgón puedes usar enemigos naturales como las hormigas cazadoras ' +
      '(Oligamus pectoralis) y la avispita parasitoide Aphidius colemani.';
    const out = applyOutputGuards(respuesta, {
      userMessage: '¿cómo controlo el pulgón?',
    });
    expect(out.modified).toBe(true);
    expect(out.text).toContain('Oligamus pectoralis');
    expect(out.text).toMatch(/verifica este nombre con tu t[eé]cnico|no pude confirmar/i);
  });

  it('NO anexa caveat para benéficos reales como Aphidius colemani', () => {
    const respuesta =
      'Contra el pulgón libera Aphidius colemani y atrae crisopas (Chrysoperla carnea).';
    const out = applyOutputGuards(respuesta, {
      userMessage: '¿qué enemigos naturales hay para el pulgón?',
    });
    expect(out.text).not.toMatch(/Aphidius colemani[^.]*no pude confirmar/i);
    expect(out.text).not.toMatch(/Chrysoperla carnea[^.]*no pude confirmar/i);
  });
});
