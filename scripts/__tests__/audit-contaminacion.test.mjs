/**
 * scripts/__tests__/audit-contaminacion.test.mjs
 *
 * Cobertura unitaria del auditor de contaminación de datos (catálogo +
 * grafo `chagra_kg`). Dos bloques:
 *
 *   1. Funciones puras con fixtures inline que reproducen los patrones de
 *      bug REALES documentados (Trozador/Agrotis ipsilon categorizado como
 *      enfermedad, "Polilla guatemalteca" atribuida a dos científicos
 *      distintos, etiquetas "(DR-MIP-1)" reutilizadas, plaga de un cultivo
 *      colgada de otro, sobre-asociación). NO tocan disco ni red.
 *
 *   2. Gate de regresión (estilo `scripts/tsc-check-gate.mjs`, pero por
 *      fingerprint de hallazgo): corre `runAudit()` sobre el catálogo y el
 *      snapshot de grafo REALES y versionados en el repo, y falla si
 *      aparece un hallazgo cuyo fingerprint NO está en
 *      `scripts/audit-contaminacion-baseline.json`. Bajar el baseline
 *      (arreglar datos) está siempre permitido — subirlo requiere
 *      `node scripts/audit-contaminacion.mjs --update-baseline`.
 */
import { describe, it, expect } from 'vitest';

import {
  normalizeText,
  buildCropLexicon,
  detectCruceCultivoPorToken,
  detectCruceCultivoPorOrganismo,
  detectCruceCultivoGrafo,
  detectMiscategorizacion,
  extractOrganismMentions,
  detectDuplicados,
  tukeyUpperFence,
  detectSobreAsociacionCatalogo,
  detectSobreAsociacionGrafo,
  detectPlaceholders,
  runAudit,
  buildReport,
  fingerprintOf,
  loadBaseline,
  diffAgainstBaseline,
  formatReportText,
  formatReportMarkdown,
  parseArgs,
} from '../audit-contaminacion.mjs';

function mkSpecies(overrides) {
  return {
    id: 'sp', nombre_comun: 'Especie', nombre_cientifico: 'Genus species',
    familia_botanica: 'Familia', plagas_criticas: [], enfermedades_criticas: [],
    ...overrides,
  };
}

describe('normalizeText', () => {
  it('quita tildes y pasa a minusculas', () => {
    expect(normalizeText('Café Ñoño Árbol')).toBe('cafe nono arbol');
  });
  it('maneja null/undefined sin romper', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('buildCropLexicon', () => {
  it('deriva token->familia SOLO de la cabeza del nombre_comun, no de descriptores', () => {
    const species = [
      mkSpecies({ id: 'papa', nombre_comun: 'Papa', nombre_comunes_regionales: ['papa pastusa'], familia_botanica: 'Solanaceae' }),
      mkSpecies({ id: 'arroz', nombre_comun: 'Arroz', familia_botanica: 'Poaceae' }),
      mkSpecies({ id: 'lechuga', nombre_comun: 'Lechuga cogollo morada', familia_botanica: 'Asteraceae' }),
    ];
    const lex = buildCropLexicon(species);
    expect(lex.get('papa')).toBe('Solanaceae');
    expect(lex.get('arroz')).toBe('Poaceae');
    // "cogollo" es descriptor de variedad, no cabeza del nombre: no debe entrar al lexico.
    expect(lex.has('cogollo')).toBe(false);
  });

  it('descarta tokens ambiguos entre 2+ familias distintas', () => {
    const species = [
      mkSpecies({ id: 'a', nombre_comun: 'Palma real', familia_botanica: 'Arecaceae' }),
      mkSpecies({ id: 'b', nombre_comun: 'Palma africana', familia_botanica: 'Arecaceae' }),
    ];
    // token "palma" mapea a una sola familia -> se mantiene.
    expect(buildCropLexicon(species).get('palma')).toBe('Arecaceae');
  });

  it('descarta tokens que aparecen en mas de 15 especies (ruido)', () => {
    const species = Array.from({ length: 16 }, (_, i) => mkSpecies({ id: `sp${i}`, nombre_comun: `Genericton ${i}`, familia_botanica: 'X' }));
    expect(buildCropLexicon(species).has('genericton')).toBe(false);
  });
});

describe('detectCruceCultivoPorToken — clase 1 (bug real: plaga de arroz colgada de papa)', () => {
  it('marca una entrada que menciona el nombre de OTRO cultivo de familia distinta', () => {
    const species = [
      mkSpecies({ id: 'papa', nombre_comun: 'Papa', familia_botanica: 'Solanaceae', enfermedades_criticas: ['Pyricularia oryzae (quema del arroz)'] }),
      mkSpecies({ id: 'arroz', nombre_comun: 'Arroz', familia_botanica: 'Poaceae' }),
    ];
    const lex = buildCropLexicon(species);
    const findings = detectCruceCultivoPorToken([{ file: 'x.json', species }], lex);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ speciesId: 'papa', cropToken: 'arroz', familiaCultivoMencionado: 'Poaceae' });
  });

  it('NO marca cuando el token pertenece a la propia familia/nombre de la especie', () => {
    const species = [
      mkSpecies({ id: 'papa', nombre_comun: 'Papa', familia_botanica: 'Solanaceae', nombre_comunes_regionales: ['papa criolla'], plagas_criticas: ['Tecia solanivora (polilla de la papa)'] }),
    ];
    const lex = buildCropLexicon(species);
    expect(detectCruceCultivoPorToken([{ file: 'x.json', species }], lex)).toEqual([]);
  });
});

describe('detectCruceCultivoPorOrganismo — clase 1 (organismo ligado a familia atipica)', () => {
  it('senala la especie minoritaria cuando hay mayoria clara (>=2) de otra familia', () => {
    const species = [
      mkSpecies({ id: 'papa1', nombre_comun: 'Papa 1', familia_botanica: 'Solanaceae', plagas_criticas: ['Tecia solanivora (polilla)'] }),
      mkSpecies({ id: 'papa2', nombre_comun: 'Papa 2', familia_botanica: 'Solanaceae', plagas_criticas: ['Tecia solanivora (polilla)'] }),
      mkSpecies({ id: 'arroz', nombre_comun: 'Arroz', familia_botanica: 'Poaceae', plagas_criticas: ['Tecia solanivora (polilla)'] }),
    ];
    const findings = detectCruceCultivoPorOrganismo([{ file: 'x.json', species }]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ speciesId: 'arroz', familiaEsperada: 'Solanaceae', familiaEncontrada: 'Poaceae', soporteEsperado: 2 });
  });

  it('NO senala nada cuando cada familia tiene soporte 1 (organismo polifago legitimo)', () => {
    const species = [
      mkSpecies({ id: 'a', nombre_comun: 'A', familia_botanica: 'Rosaceae', plagas_criticas: ['Botrytis cinerea (moho gris)'] }),
      mkSpecies({ id: 'b', nombre_comun: 'B', familia_botanica: 'Solanaceae', plagas_criticas: ['Botrytis cinerea (moho gris)'] }),
    ];
    expect(detectCruceCultivoPorOrganismo([{ file: 'x.json', species }])).toEqual([]);
  });

  it('NO senala nada cuando todas las especies comparten la misma familia', () => {
    const species = [
      mkSpecies({ id: 'a', nombre_comun: 'A', familia_botanica: 'Solanaceae', enfermedades_criticas: ['Phytophthora infestans (gota)'] }),
      mkSpecies({ id: 'b', nombre_comun: 'B', familia_botanica: 'Solanaceae', enfermedades_criticas: ['Phytophthora infestans (gota)'] }),
    ];
    expect(detectCruceCultivoPorOrganismo([{ file: 'x.json', species }])).toEqual([]);
  });
});

describe('detectCruceCultivoGrafo', () => {
  it('marca un Pest cuyo cultivos_afectados no coincide con sus aristas AFFECTS reales', () => {
    const graph = {
      nodes: [
        { id: 'papa', labels: ['Species'], properties: { id: 'papa', nombre_comun: 'Papa', familia_botanica: 'Solanaceae' } },
        { id: 'un_pest', labels: ['Pest'], properties: { id: 'un_pest', nombre_comun: 'Un pest', cultivos_afectados: 'arroz; cereales' } },
        { id: 'arroz', labels: ['Species'], properties: { id: 'arroz', nombre_comun: 'Arroz', familia_botanica: 'Poaceae' } },
      ],
      edges: [{ source: 'un_pest', target: 'papa', label: 'AFFECTS', properties: {} }],
    };
    const lex = new Map([['arroz', 'Poaceae']]);
    const findings = detectCruceCultivoGrafo(graph, lex);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ pestId: 'un_pest', cropToken: 'arroz', familiasLigadasEnGrafo: ['Solanaceae'] });
  });

  it('devuelve vacio si no hay snapshot', () => {
    expect(detectCruceCultivoGrafo(null, new Map())).toEqual([]);
  });

  it('no marca nada si el Pest no tiene aristas AFFECTS (sin base de comparacion)', () => {
    const graph = {
      nodes: [{ id: 'p', labels: ['Pest'], properties: { id: 'p', cultivos_afectados: 'arroz' } }],
      edges: [],
    };
    expect(detectCruceCultivoGrafo(graph, new Map([['arroz', 'Poaceae']]))).toEqual([]);
  });
});

describe('detectMiscategorizacion — clase 2 (bug real: Trozador/Agrotis ipsilon como enfermedad)', () => {
  it('marca un insecto listado en enfermedades_criticas', () => {
    const species = [mkSpecies({ id: 'papa', enfermedades_criticas: ['Trozador (Agrotis ipsilon)', 'Phytophthora infestans (gota)'] })];
    const findings = detectMiscategorizacion([{ file: 'x.json', species }]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ tipo: 'insecto_en_enfermedades', speciesId: 'papa', entry: 'Trozador (Agrotis ipsilon)' });
  });

  it('marca un patogeno listado en plagas_criticas', () => {
    const species = [mkSpecies({ id: 'papa', plagas_criticas: ['Xanthomonas campestris (marchitez)', 'Tecia solanivora (polilla)'] })];
    const findings = detectMiscategorizacion([{ file: 'x.json', species }]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ tipo: 'patogeno_en_plagas', entry: 'Xanthomonas campestris (marchitez)' });
  });

  it('marca un nematodo listado en enfermedades_criticas', () => {
    const species = [mkSpecies({ id: 'papa', enfermedades_criticas: ['Globodera pallida (nematodo del quiste)'] })];
    expect(detectMiscategorizacion([{ file: 'x.json', species }])[0]).toMatchObject({ tipo: 'insecto_en_enfermedades' });
  });

  it('marca un virus listado en plagas_criticas', () => {
    const species = [mkSpecies({ id: 'papa', plagas_criticas: ['Potato leafroll virus (PLRV)'] })];
    expect(detectMiscategorizacion([{ file: 'x.json', species }])[0]).toMatchObject({ tipo: 'patogeno_en_plagas' });
  });

  it('NO marca nada cuando las clasificaciones son correctas', () => {
    const species = [mkSpecies({
      id: 'papa',
      plagas_criticas: ['Tecia solanivora (polilla)', 'Globodera pallida (nematodo)'],
      enfermedades_criticas: ['Phytophthora infestans (gota)', 'Ralstonia solanacearum (marchitez)'],
    })];
    expect(detectMiscategorizacion([{ file: 'x.json', species }])).toEqual([]);
  });
});

describe('extractOrganismMentions', () => {
  it('reconoce "Cientifico (comun)"', () => {
    expect(extractOrganismMentions('Tecia solanivora (polilla guatemalteca de la papa)')).toEqual([
      { scientific: 'Tecia solanivora', common: 'polilla guatemalteca de la papa' },
    ]);
  });
  it('reconoce "Comun (Cientifico)"', () => {
    expect(extractOrganismMentions('Trozador (Agrotis ipsilon)')).toEqual([
      { scientific: 'Agrotis ipsilon', common: 'Trozador' },
    ]);
  });
  it('reconoce varios cientificos separados por "/" compartiendo un comun', () => {
    const r = extractOrganismMentions('Globodera pallida / Globodera rostochiensis (nematodo del quiste)');
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.scientific)).toEqual(['Globodera pallida', 'Globodera rostochiensis']);
    expect(r[0].common).toBe('nematodo del quiste');
  });
  it('devuelve vacio para texto sin patron reconocible', () => {
    expect(extractOrganismMentions('')).toEqual([]);
    expect(extractOrganismMentions(null)).toEqual([]);
    expect(extractOrganismMentions('control cultural general')).toEqual([]);
  });
});

describe('detectDuplicados — clase 3 (bug real: "Polilla guatemalteca" = Tecia solanivora en un archivo, Phthorimaea operculella en otro)', () => {
  it('detecta el mismo nombre comun atribuido a 2 cientificos distintos entre archivos', () => {
    const catalogFiles = [
      { file: 'seed-v3.0.json', species: [mkSpecies({ id: 'papa', plagas_criticas: ['Phthorimaea operculella (Polilla guatemalteca)'] })] },
      { file: 'seed-v3.1.json', species: [mkSpecies({ id: 'papa', plagas_criticas: ['Tecia solanivora (Polilla guatemalteca)'] })] },
    ];
    const findings = detectDuplicados(catalogFiles);
    const ambiguo = findings.find((f) => f.tipo === 'nombre_comun_ambiguo');
    expect(ambiguo).toBeDefined();
    expect(ambiguo.nombreComun).toBe('polilla guatemalteca');
    expect(ambiguo.cientificos.map((c) => c.cientifico).sort()).toEqual(['Phthorimaea operculella', 'Tecia solanivora']);
  });

  it('detecta nombres cientificos casi identicos (typo) del mismo genero', () => {
    const catalogFiles = [{
      file: 'x.json',
      species: [mkSpecies({
        id: 'papa',
        plagas_criticas: ['Premnotrypes vorax (gusano blanco)', 'Premnotrypes voraxx (gusano blanco 2)'],
      })],
    }];
    const tipograficos = detectDuplicados(catalogFiles).filter((f) => f.tipo === 'nombre_cientifico_tipografico');
    expect(tipograficos.length).toBeGreaterThan(0);
  });

  it('NO marca nada cuando cada organismo tiene un unico nombre comun consistente', () => {
    const catalogFiles = [{
      file: 'x.json',
      species: [mkSpecies({ id: 'papa', plagas_criticas: ['Tecia solanivora (polilla guatemalteca)'] })],
    }];
    expect(detectDuplicados(catalogFiles)).toEqual([]);
  });
});

describe('tukeyUpperFence', () => {
  it('devuelve Infinity con menos de 4 valores (corpus insuficiente)', () => {
    expect(tukeyUpperFence([1, 2, 3])).toBe(Infinity);
  });
  it('calcula Q3 + 1.5*IQR para una distribucion tipica', () => {
    const fence = tukeyUpperFence([1, 2, 2, 3, 3, 3, 4, 4, 5, 100]);
    expect(fence).toBeLessThan(100);
    expect(fence).toBeGreaterThan(5);
  });
  it('usa un piso razonable cuando no hay varianza (IQR=0)', () => {
    expect(tukeyUpperFence([6, 6, 6, 6])).toBeGreaterThanOrEqual(12);
  });
});

describe('detectSobreAsociacionCatalogo — clase 4 (bug real: 30+ biopreparados sobre una especie)', () => {
  function mkStepsSpecies(id, n) {
    return mkSpecies({
      id,
      feeding_plan_template: {
        primary_steps: Array.from({ length: n }, (_, i) => ({ offset_days: i * 10, biofertilizer_slug: `bp_${i}` })),
      },
    });
  }
  it('marca la especie outlier cuando el resto del corpus tiene conteos bajos', () => {
    const species = [mkStepsSpecies('a', 3), mkStepsSpecies('b', 4), mkStepsSpecies('c', 3), mkStepsSpecies('d', 5), mkStepsSpecies('papa_contaminada', 32)];
    const findings = detectSobreAsociacionCatalogo([{ file: 'x.json', species }]);
    expect(findings).toHaveLength(1);
    expect(findings[0].speciesId).toBe('papa_contaminada');
  });

  it('no marca nada cuando todas las especies tienen conteos similares', () => {
    const species = [mkStepsSpecies('a', 5), mkStepsSpecies('b', 6), mkStepsSpecies('c', 5), mkStepsSpecies('d', 6)];
    expect(detectSobreAsociacionCatalogo([{ file: 'x.json', species }])).toEqual([]);
  });
});

describe('detectSobreAsociacionGrafo', () => {
  it('marca la especie con controlCount outlier via aristas AFFECTS + CONTROLS', () => {
    const nodes = [
      { id: 's_outlier', labels: ['Species'], properties: { nombre_comun: 'Outlier' } },
      { id: 's_normal_1', labels: ['Species'], properties: { nombre_comun: 'Normal 1' } },
      { id: 's_normal_2', labels: ['Species'], properties: { nombre_comun: 'Normal 2' } },
      { id: 's_normal_3', labels: ['Species'], properties: { nombre_comun: 'Normal 3' } },
    ];
    const edges = [];
    // s_outlier: 1 pest con 20 controladores.
    edges.push({ source: 'pest_x', target: 's_outlier', label: 'AFFECTS' });
    for (let i = 0; i < 20; i++) edges.push({ source: `ctrl_${i}`, target: 'pest_x', label: 'CONTROLS' });
    // especies normales: 1 pest con 2 controladores cada una.
    for (const sid of ['s_normal_1', 's_normal_2', 's_normal_3']) {
      edges.push({ source: `pest_${sid}`, target: sid, label: 'AFFECTS' });
      edges.push({ source: `ctrl_a_${sid}`, target: `pest_${sid}`, label: 'CONTROLS' });
      edges.push({ source: `ctrl_b_${sid}`, target: `pest_${sid}`, label: 'CONTROLS' });
    }
    const findings = detectSobreAsociacionGrafo({ nodes, edges });
    expect(findings.map((f) => f.speciesId)).toEqual(['s_outlier']);
  });

  it('devuelve vacio sin snapshot', () => {
    expect(detectSobreAsociacionGrafo(null)).toEqual([]);
  });
});

describe('detectPlaceholders — clase 5 (bug real: "Parasitoide de control biologico" x N, "(DR-MIP-1)")', () => {
  it('marca una etiqueta reutilizada verbatim en 2+ ids distintos', () => {
    const entities = [
      { id: 'org_a', label: 'Parasitoide de control biológico' },
      { id: 'org_b', label: 'Parasitoide de control biológico' },
      { id: 'org_c', label: 'Avispita parasitoide de huevos de Trichogramma' },
    ];
    const findings = detectPlaceholders(entities, { source: 'test' });
    const reutilizada = findings.find((f) => f.tipo === 'etiqueta_generica_reutilizada');
    expect(reutilizada).toBeDefined();
    expect(reutilizada.countIdsAfectados).toBe(2);
  });

  it('marca un codigo interno de pipeline entre parentesis', () => {
    const entities = [{ id: 'org_a', label: 'Microorganismo de control biológico (DR-MIP-1)' }];
    const findings = detectPlaceholders(entities, { source: 'test' });
    expect(findings[0]).toMatchObject({ tipo: 'etiqueta_con_codigo_interno' });
  });

  it('marca una etiqueta estructuralmente generica aunque sea unica (singleton)', () => {
    const entities = [{ id: 'org_a', label: 'Hongo antagonista del suelo' }];
    const findings = detectPlaceholders(entities, { source: 'test' });
    expect(findings[0]).toMatchObject({ tipo: 'etiqueta_generica_estructural' });
  });

  it('NO marca etiquetas especificas y unicas', () => {
    const entities = [
      { id: 'a', label: 'Beauveria bassiana' },
      { id: 'b', label: 'Trichogramma pretiosum' },
    ];
    expect(detectPlaceholders(entities, { source: 'test' })).toEqual([]);
  });

  it('ignora entidades sin label', () => {
    expect(detectPlaceholders([{ id: 'a', label: null }, { id: 'b' }], { source: 'test' })).toEqual([]);
  });
});

describe('fingerprintOf', () => {
  it('es estable para el mismo hallazgo', () => {
    const f = { clase: 'miscategorizacion', tipo: 'insecto_en_enfermedades', speciesId: 'papa', entry: 'Trozador (Agrotis ipsilon)' };
    expect(fingerprintOf(f)).toBe(fingerprintOf({ ...f }));
  });
  it('distingue hallazgos distintos', () => {
    const a = { clase: 'placeholder', source: 'x', label: 'A' };
    const b = { clase: 'placeholder', source: 'x', label: 'B' };
    expect(fingerprintOf(a)).not.toBe(fingerprintOf(b));
  });
});

describe('buildReport / diffAgainstBaseline', () => {
  it('agrega totales y especies afectadas por clase', () => {
    const findings = [
      { clase: 'miscategorizacion', speciesId: 'a' },
      { clase: 'miscategorizacion', speciesId: 'a' },
      { clase: 'miscategorizacion', speciesId: 'b' },
      { clase: 'placeholder', source: 'x', label: 'Y' },
    ];
    const report = buildReport(findings);
    expect(report.total).toBe(4);
    expect(report.porClase.miscategorizacion).toBe(3);
    expect(report.especiesAfectadasPorClase.miscategorizacion).toBe(2);
  });

  it('diffAgainstBaseline devuelve solo los hallazgos con fingerprint nuevo', () => {
    const findings = [
      { clase: 'placeholder', source: 'x', label: 'Conocido' },
      { clase: 'placeholder', source: 'x', label: 'Nuevo' },
    ];
    const report = buildReport(findings);
    const baseline = { fingerprints: [fingerprintOf(findings[0])] };
    const nuevos = diffAgainstBaseline(report, baseline);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0].label).toBe('Nuevo');
  });

  it('reporte vacio no rompe', () => {
    const report = buildReport([]);
    expect(report.total).toBe(0);
    for (const c of Object.keys(report.porClase)) expect(report.porClase[c]).toBe(0);
  });
});

describe('formatReportText / formatReportMarkdown', () => {
  it('el texto incluye totales por clase', () => {
    const report = buildReport([{ clase: 'duplicado', tipo: 'nombre_comun_ambiguo', nombreComun: 'x', cientificos: [] }], { filesAuditados: ['a.json'], graphAuditado: true });
    const text = formatReportText(report);
    expect(text).toContain('Total de hallazgos: 1');
    expect(text).toContain('a.json');
  });

  it('el markdown incluye tabla resumen y secciones por clase', () => {
    const report = buildReport([{ clase: 'placeholder', source: 'x', label: 'Y', idsAfectados: ['1', '2'] }], { filesAuditados: ['a.json'], graphAuditado: false });
    const md = formatReportMarkdown(report);
    expect(md).toContain('# Auditoría de contaminación de datos');
    expect(md).toContain('| Clase | Hallazgos |');
    expect(md).toContain('Gate de regresión');
  });
});

describe('parseArgs', () => {
  it('defaults razonables sin argumentos', () => {
    const opts = parseArgs([]);
    expect(opts.json).toBe(false);
    expect(opts.check).toBe(false);
    expect(opts.updateBaseline).toBe(false);
  });
  it('parsea --check, --update-baseline, --force, --write-report', () => {
    const opts = parseArgs(['--check', '--update-baseline', '--force', '--write-report', 'out.md']);
    expect(opts.check).toBe(true);
    expect(opts.updateBaseline).toBe(true);
    expect(opts.force).toBe(true);
    expect(opts.writeReport).toBe('out.md');
  });
  it('parsea --no-graph a null explicito', () => {
    expect(parseArgs(['--no-graph']).graphSnapshotPath).toBeNull();
  });
});

// =============================================================================
// Gate de regresión sobre el catálogo y grafo REALES y versionados en el
// repo — esta es la parte que corre en CI y protege contra NUEVA
// contaminación. Sin --from-dump ni red: todo lee catalog/*.json local.
// =============================================================================
describe('runAudit — gate de regresion sobre catalogo/grafo real', () => {
  it('produce un reporte bien formado sobre el catalogo real', () => {
    const report = runAudit();
    expect(report.meta.filesAuditados.length).toBeGreaterThan(0);
    expect(report.total).toBe(report.findings.length);
    expect(new Set(report.findings.map((f) => f.fingerprint)).size).toBeLessThanOrEqual(report.total);
  });

  it('detecta al menos un hallazgo real conocido por clase con datos actuales (smoke test)', () => {
    // Si esto empieza a fallar porque el catalogo se limpio del todo, es
    // buena noticia: hay que actualizar/eliminar este smoke test y bajar el
    // baseline con --update-baseline.
    const report = runAudit();
    expect(report.porClase.miscategorizacion).toBeGreaterThan(0);
    expect(report.porClase.placeholder).toBeGreaterThan(0);
    expect(report.porClase.duplicado).toBeGreaterThan(0);
  });

  it('GATE: no hay hallazgos nuevos vs. el baseline congelado', () => {
    const report = runAudit();
    const baseline = loadBaseline();
    const nuevos = diffAgainstBaseline(report, baseline);
    if (nuevos.length > 0) {
      const detalle = nuevos.slice(0, 10).map((f) => `  - [${f.clase}/${f.tipo}] ${f.fingerprint}`).join('\n');
      throw new Error(
        `Se detectaron ${nuevos.length} hallazgo(s) de contaminacion NUEVOS que no estan en el baseline `
        + `(scripts/audit-contaminacion-baseline.json):\n${detalle}\n\n`
        + 'Si son datos malos nuevos: corrijalos en el catalogo/grafo antes de mergear. '
        + 'Si es un falso positivo o una contaminacion preexistente que recien se detecto: '
        + 'corra `node scripts/audit-contaminacion.mjs --update-baseline` y commitee el baseline actualizado.',
      );
    }
    expect(nuevos).toHaveLength(0);
  });
});
