/**
 * outputGuards.fabricatedParamoNatives.test.js — guard de TRÍO DE NATIVAS DE
 * PÁRAMO FABRICADO (bench de contaminación, 2026-07-09).
 *
 * BUG REAL (bench de contaminación 10 prompts, granite3.3:8b + grounding): al
 * preguntar si una especie de piso cálido/templado (café, limonaria) se puede
 * sembrar en PÁRAMO, el agente acierta la inviabilidad ("no, el clima no sirve")
 * pero INVENTA un trío fijo de "nativas del páramo" — "Romero blanco", "Árnica de
 * páramo", "Hipérico de páramo" — con binomios latinos FABRICADOS e inconsistentes
 * entre corridas:
 *   - "Romero blanco (Rosmarinus officinalis)" — romero mediterráneo real, pero NO
 *     es la especie de páramo (real: Diplostephium rosmarinifolium).
 *   - "Árnica de páramo (Leucasinaria scabra)" — género `Leucasinaria` NO EXISTE
 *     (real: Senecio formosus).
 *   - "Hipérico de páramo (Hieracium sp.)" — confunde el género Hypericum con
 *     Hieracium (real: Hypericum juniperinum).
 * Es una plantilla memorizada que rellena binomios ad-hoc, no grounding real.
 *
 * Sinergia con el grafo: el guard usa un catálogo curado de especies REALES de
 * páramo (`catalog/chagra-catalog-oss-subset-v3.2.json`, thermal_zones=paramo, 62
 * especies + añadido IAvH 2011/2015 vía `scripts/load-age-paramo-species-
 * 2026-07-09.mjs`) para (a) reconocer cuándo un binomio es fabricado/mal atribuido
 * y (b) ofrecer la especie REAL en su lugar cuando reconoce el nombre común.
 *
 * DOCTRINA (suprimir-y-reemplazar, NO caveat — igual que cross_thermal/
 * confusion_especie/pest_vs_disease): el binomio fabricado se REEMPLAZA en el
 * sitio por el real (si se reconoce el nombre común) o se elimina el paréntesis
 * (si no se reconoce ni el nombre ni el binomio), y se antepone un resumen de la
 * corrección. Nunca un simple aviso sobre el binomio inventado sin tocarlo.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardFabricatedParamoNatives,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => resetOutputGuardTelemetry());

const cafeEntities = () => [
  { kind: 'species', mentioned: 'café', nombre_comun: 'Café', nombre_cientifico: 'Coffea arabica', confidence: 0.95 },
];

/**
 * El guard antepone una nota de transparencia ("Corregí estos binomios mal
 * atribuidos: X → Y") que CITA el binomio fabricado a propósito (mismo patrón que
 * `guardSpeciesSubstitution`: "es Solanum quitoense, no Passiflora tripartita").
 * Para verificar que el CUERPO de la respuesta (lo que sigue tras la nota) ya no
 * afirma el binomio fabricado como si fuera cierto, los tests comparan solo esa
 * porción — no el texto completo, que incluye la nota transparente.
 */
const bodyAfterNote = (text) => text.slice(text.indexOf('\n\n') + 2);

describe('guardFabricatedParamoNatives — casos del bench', () => {
  it('café → páramo: corrige el trío fabricado completo (Romero/Árnica/Hipérico)', () => {
    const text =
      'No, el café (Coffea arabica) no se puede sembrar en el páramo porque el clima frío extremo y las ' +
      'heladas nocturnas no son compatibles con este cultivo tropical.\n\n' +
      'En el páramo puedes encontrar especies nativas como:\n' +
      '- Romero blanco (Rosmarinus officinalis)\n' +
      '- Árnica de páramo (Leucasinaria scabra)\n' +
      '- Hipérico de páramo (Hieracium sp.)\n\n' +
      'Estas plantas están adaptadas al frío y la altura extrema.';
    const r = guardFabricatedParamoNatives(text, cafeEntities());

    expect(r.modified).toBe(true);
    const body = bodyAfterNote(r.text);
    // El CUERPO ya no afirma los 3 binomios FABRICADOS (la nota los cita para
    // transparencia, pero el cuerpo — lo que el usuario lee como dato — no).
    expect(body).not.toMatch(/Rosmarinus officinalis/);
    expect(body).not.toMatch(/Leucasinaria/);
    expect(body).not.toMatch(/Hieracium/);
    // Se reemplazan por los 3 binomios REALES documentados, en el cuerpo.
    expect(body).toMatch(/Diplostephium rosmarinifolium/);
    expect(body).toMatch(/Senecio formosus/);
    expect(body).toMatch(/Hypericum juniperinum/);
    // Los nombres comunes (reales) se conservan tal cual.
    expect(body).toMatch(/Romero blanco/);
    expect(body).toMatch(/Árnica de páramo/);
    expect(body).toMatch(/Hipérico de páramo/);
    // La explicación correcta de por qué el café no se da ahí sigue intacta.
    expect(body).toMatch(/no se puede sembrar en el páramo/);
    expect(body).toMatch(/Coffea arabica/);
    // La nota lidera (suprimir-y-reemplazar, no aviso tras el hecho) y cita
    // trazablemente qué binomio fabricado se corrigió por cuál.
    expect(r.text.startsWith('Corrección importante:')).toBe(true);
    expect(r.reason).toMatch(/especies_nativas_paramo_fabricadas/);
    expect(r.reason).toMatch(/Rosmarinus officinalis/);
    expect(r.reason).toMatch(/Leucasinaria scabra/);
    expect(getOutputGuardTelemetry().fabricated_paramo_natives).toBe(1);
  });

  it('limonaria → páramo: corrige binomios fabricados en prosa (no solo viñetas)', () => {
    const text =
      'La limonaria no se da en el páramo, es un cultivo de clima cálido y no resiste las heladas.\n\n' +
      'Como alternativa, en el páramo hay especies nativas y nativas típicas como el Frailejón mayor ' +
      '(Espeletia inventada) y el Chocho de páramo (Lupinus falsus).';
    const entities = [
      { kind: 'species', mentioned: 'limonaria', nombre_comun: 'Limonaria', nombre_cientifico: 'Cymbopogon citratus' },
    ];
    const r = guardFabricatedParamoNatives(text, entities);

    expect(r.modified).toBe(true);
    const body = bodyAfterNote(r.text);
    expect(body).not.toMatch(/Espeletia inventada/);
    expect(body).not.toMatch(/Lupinus falsus/);
    expect(body).toMatch(/Espeletia grandiflora/);
    expect(body).toMatch(/Lupinus alopecuroides/);
    // La conjunción "y" entre las dos correcciones no se pierde (backtracking del
    // regex de atribución no debe comerse la palabra de la atribución anterior).
    expect(body).toMatch(/Espeletia grandiflora\)\s+y\s+el\s+Chocho/);
    expect(body).toMatch(/no se da en el páramo/);
  });

  it('sp./spp. de género confundido (Hieracium por Hypericum) se corrige aunque sea el ÚNICO fabricado', () => {
    const text =
      'El café no crece en el páramo por el frío.\n\n' +
      'Ahí hay especies nativas como el Hipérico de páramo (Hieracium sp.).';
    const r = guardFabricatedParamoNatives(text, []);

    expect(r.modified).toBe(true);
    const body = bodyAfterNote(r.text);
    expect(body).not.toMatch(/Hieracium/);
    expect(body).toMatch(/Hypericum juniperinum/);
  });
});

describe('guardFabricatedParamoNatives — anti-falsos-positivos', () => {
  it('respuesta que YA cita especies reales de páramo → NO se toca', () => {
    const text =
      'El café no se puede sembrar en el páramo por el frío.\n\n' +
      'Ahí encontrarás especies nativas como el Frailejón mayor (Espeletia grandiflora) y el Agraz de ' +
      'páramo (Vaccinium floribundum).';
    const r = guardFabricatedParamoNatives(text, cafeEntities());

    expect(r.modified).toBe(false);
    expect(r.text).toBe(text);
    expect(r.reason).toBeNull();
  });

  it('mención de páramo SIN encuadre de "especies nativas" → no dispara (guardParamoNormativa cubre siembra directa)', () => {
    const text = 'El páramo es un ecosistema de alta montaña muy importante para el agua de Colombia.';
    const r = guardFabricatedParamoNatives(text, []);
    expect(r.modified).toBe(false);
    expect(r.text).toBe(text);
  });

  it('encuadre de "especies nativas" SIN mención de páramo → no dispara', () => {
    const text = 'Estas son especies nativas de la región andina que puedes sembrar en tu finca: X, Y, Z.';
    const r = guardFabricatedParamoNatives(text, []);
    expect(r.modified).toBe(false);
  });

  it('el binomio del cultivo PREGUNTADO (grounding del turno) nunca se toca, aunque venga antes del encuadre nativo', () => {
    const text =
      'El café (Coffea arabica) es un cultivo tropical.\n\n' +
      'En el páramo hay especies nativas como el Frailejón mayor (Espeletia grandiflora).';
    const r = guardFabricatedParamoNatives(text, cafeEntities());
    expect(r.modified).toBe(false);
    expect(r.text).toContain('Coffea arabica');
  });

  it('texto vacío / no-string → no-op', () => {
    expect(guardFabricatedParamoNatives('', []).modified).toBe(false);
    expect(guardFabricatedParamoNatives(null, []).modified).toBe(false);
    expect(guardFabricatedParamoNatives(undefined, []).modified).toBe(false);
  });

  it('"Genero sp." sobre un nombre común NO reconocido es honesto (incertidumbre real) → no dispara', () => {
    const text =
      'El café no se da en el páramo.\n\n' +
      'Ahí hay especies nativas como una compuesta de altura (Senecio sp.) que aún no identifico con certeza.';
    const r = guardFabricatedParamoNatives(text, []);
    expect(r.modified).toBe(false);
  });

  it('es idempotente: segunda pasada no re-dispara', () => {
    const text =
      'No, el café no se puede sembrar en el páramo.\n\n' +
      'En el páramo puedes encontrar especies nativas como el Romero blanco (Rosmarinus officinalis).';
    const first = guardFabricatedParamoNatives(text, cafeEntities());
    expect(first.modified).toBe(true);

    const second = guardFabricatedParamoNatives(first.text, cafeEntities());
    expect(second.modified).toBe(false);
    expect(second.text).toBe(first.text);
  });
});

describe('applyOutputGuards — integración del guard de nativas de páramo fabricadas', () => {
  // NOTA: la denegación se frasea sin verbos de siembra/fumigación ("no es apto",
  // "no prospera") a propósito — `guardParamoNormativa` (Ley 1930) dispara con
  // CUALQUIER co-ocurrencia de páramo + siembr*/cultiv*/plant*/fumig* en el texto,
  // sin distinguir polaridad ("no puedes sembrar" también matchea), y REEMPLAZA
  // el cuerpo entero ANTES de que este guard corra. Ese guard cubre la siembra
  // directamente recomendada en páramo; este E2E ejercita el gap que SÍ le
  // corresponde a `guardFabricatedParamoNatives`: una respuesta que niega la
  // siembra con otro fraseo y aun así fabrica binomios de "nativas".
  it('E2E: el trío fabricado se corrige en la respuesta final del pipeline completo', () => {
    const text =
      'No, el café (Coffea arabica) no es apto para el páramo por el frío extremo.\n\n' +
      'En el páramo puedes encontrar especies nativas como:\n' +
      '- Romero blanco (Rosmarinus officinalis)\n' +
      '- Árnica de páramo (Leucasinaria scabra)\n' +
      '- Hipérico de páramo (Hieracium sp.)';
    const res = applyOutputGuards(text, {
      resolvedEntities: cafeEntities(),
      userMessage: '¿el café se da en el páramo?',
    });

    expect(res.modified).toBe(true);
    const body = bodyAfterNote(res.text);
    expect(body).not.toMatch(/Rosmarinus officinalis|Leucasinaria|Hieracium/);
    expect(body).toMatch(/Diplostephium rosmarinifolium/);
    expect(body).toMatch(/Senecio formosus/);
    expect(body).toMatch(/Hypericum juniperinum/);
    expect(res.reasons.join(' ')).toMatch(/especies_nativas_paramo_fabricadas/);
  });

  it('E2E: una respuesta correcta con especies reales de páramo sobrevive intacta', () => {
    const text =
      'El café no es apto para el páramo por el frío.\n\n' +
      'Ahí encontrarás especies nativas como el Frailejón mayor (Espeletia grandiflora).';
    const res = applyOutputGuards(text, {
      resolvedEntities: cafeEntities(),
      userMessage: '¿el café se da en el páramo?',
    });
    expect(res.text).toContain('Espeletia grandiflora');
    expect((res.reasons || []).join(' ')).not.toMatch(/especies_nativas_paramo_fabricadas/);
  });
});
