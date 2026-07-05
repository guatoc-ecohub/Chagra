/**
 * scripts/__tests__/bench-contaminacion.test.mjs
 *
 * Cobertura unitaria del bench de contaminación cross-dominio:
 *   - generadores de sondas DINÁMICAS (puros, con catálogos sintéticos
 *     pequeños — no dependen del catálogo real de 530 especies, así el test
 *     es rápido y estable aunque el catálogo cambie).
 *   - clasificador léxico plaga/enfermedad.
 *   - orquestación (runProbeAgainstAgent / runAllProbes / judgeResults /
 *     runOnAlpha) con TODAS las dependencias de red/proceso INYECTADAS — no
 *     toca ollama, el sidecar, ssh/scp ni claude-code real.
 *
 * Un smoke test aparte corre los generadores contra el catálogo REAL
 * (catalog/chagra-catalog-oss-subset-v3.2.json) para confirmar que producen
 * al menos algunas sondas de cada tipo hoy — sin fijar cifras exactas
 * (el catálogo crece).
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyPestOrDisease,
  extractShortLabel,
  slug,
  pickForeignThermalZone,
  genCrossCropPestProbes,
  genCrossThermalProbes,
  genConfusionProbes,
  genPestDiseaseClassificationProbes,
  generateProbeSet,
  FIXED_PROBES,
  loadCatalog,
  CATALOG_CANDIDATES,
  runProbeAgainstAgent,
  runAllProbes,
  judgeResults,
  summarizeContamination,
  runOnAlpha,
  sidecarReachableLocally,
  generateMarkdownReport,
  buildEnrichedSystemPrompt,
} from '../bench-contaminacion.mjs';

/** Stub por defecto del guard piso térmico: sin desajuste, no-op — evita que
 * los tests que no lo ejercitan explícitamente peguen a la red real. */
const noMismatchPisoTermicoFn = async () => ({ has_mismatch: false, system_prompt_block: '' });

/** Stubs por defecto de los guards confusión-especie (#292) y
 * pest-vs-disease (#293): sin disparo, no-op — mismo criterio que
 * `noMismatchPisoTermicoFn`, evita red real en tests que no los ejercitan. */
const noConfusionEspecieFn = async () => ({ has_confusion: false, system_prompt_block: '' });
const noPestVsDiseaseFn = async () => ({ has_classification: false, system_prompt_block: '' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

// ── fixtures sintéticos (NO el catálogo real — deterministas y chicos) ────────

const CAFE = {
  id: 'coffea_arabica_test',
  nombre_comun: 'Café de prueba',
  nombre_cientifico: 'Coffea arabica L.',
  familia_botanica: 'Rubiaceae',
  thermal_zones: ['templado'],
  plagas_criticas: ['Hypothenemus hampei (broca)'],
  enfermedades_criticas: ['Hemileia vastatrix (roya)'],
  companions: [],
};

const MAIZ = {
  id: 'zea_mays_test',
  nombre_comun: 'Maíz de prueba',
  nombre_cientifico: 'Zea mays L.',
  familia_botanica: 'Poaceae',
  thermal_zones: ['calido'],
  plagas_criticas: ['Spodoptera frugiperda (cogollero)'],
  enfermedades_criticas: ['Puccinia sorghi (roya del maíz)'],
  companions: ['frijol_test'],
};

const FRIJOL = {
  id: 'frijol_test',
  nombre_comun: 'Frijol de prueba',
  nombre_cientifico: 'Phaseolus vulgaris L.',
  familia_botanica: 'Fabaceae',
  thermal_zones: ['calido', 'templado'],
  companions: [],
};

const CEBOLLA = {
  id: 'allium_cepa_test',
  nombre_comun: 'Cebolla de prueba',
  nombre_cientifico: 'Allium cepa L.',
  familia_botanica: 'Amaryllidaceae',
  thermal_zones: ['frio', 'templado'],
  companions: [],
};

const PINO_CONFUSO = {
  id: 'pinus_test',
  nombre_comun: 'Pino de prueba',
  nombre_cientifico: 'Pinus patula',
  familia_botanica: 'Pinaceae',
  thermal_zones: ['paramo', 'frio'],
  _anti_confusion: 'NO confundir con eucalipto (Eucalyptus globulus, Myrtaceae).',
  companions: [],
};

const SYNTH_SPECIES = [CAFE, MAIZ, FRIJOL, CEBOLLA, PINO_CONFUSO];

// ── classifyPestOrDisease ──────────────────────────────────────────────────

describe('classifyPestOrDisease', () => {
  it('clasifica un insecto por cue léxico en español', () => {
    expect(classifyPestOrDisease('Hypothenemus hampei (broca)')).toBe('plaga');
  });

  it('clasifica una enfermedad por cue léxico en español', () => {
    expect(classifyPestOrDisease('Hemileia vastatrix (roya)')).toBe('enfermedad');
  });

  it('clasifica por GÉNERO latino aunque no haya cue en español (Mycena = hongo)', () => {
    expect(classifyPestOrDisease('Mycena citricolor')).toBe('enfermedad');
  });

  it('clasifica por GÉNERO latino de insecto (Agrotis = plaga)', () => {
    expect(classifyPestOrDisease('Agrotis ipsilon')).toBe('plaga');
  });

  it('término ambiguo/desconocido → "ambiguo" (no inventa)', () => {
    expect(classifyPestOrDisease('Xyz completamente desconocido')).toBe('ambiguo');
  });

  it('es insensible a mayúsculas', () => {
    expect(classifyPestOrDisease('BROCA DEL CAFÉ')).toBe('plaga');
  });
});

// ── extractShortLabel / slug ───────────────────────────────────────────────

describe('extractShortLabel', () => {
  it('extrae el alias entre paréntesis', () => {
    expect(extractShortLabel('Hypothenemus hampei (broca)')).toBe('broca');
  });
  it('sin paréntesis devuelve el término completo', () => {
    expect(extractShortLabel('Mycena citricolor')).toBe('Mycena citricolor');
  });
  it('input vacío/null no revienta', () => {
    expect(extractShortLabel('')).toBe('');
    expect(extractShortLabel(null)).toBe('');
  });
});

describe('slug', () => {
  it('normaliza tildes/espacios a un id estable', () => {
    expect(slug('Roya del café (Hemileia vastatrix)')).toMatch(/^[a-z0-9_]+$/);
  });
  it('es determinístico (mismo input → mismo output)', () => {
    expect(slug('Broca del café')).toBe(slug('Broca del café'));
  });
});

// ── pickForeignThermalZone ─────────────────────────────────────────────────

describe('pickForeignThermalZone', () => {
  it('especie solo-calido → elige un piso lejano (paramo o frio)', () => {
    const z = pickForeignThermalZone(['calido']);
    expect(['paramo', 'frio']).toContain(z);
  });

  it('especie que cubre los 4 pisos → null (no hay "ajeno")', () => {
    expect(pickForeignThermalZone(['paramo', 'frio', 'templado', 'calido'])).toBeNull();
  });

  it('sin thermal_zones → devuelve el primero del orden canónico', () => {
    expect(pickForeignThermalZone([])).toBe('paramo');
    expect(pickForeignThermalZone(undefined)).toBe('paramo');
  });
});

// ── genCrossCropPestProbes ─────────────────────────────────────────────────

describe('genCrossCropPestProbes (dinámico, catálogo sintético)', () => {
  it('genera una sonda por especie con plagas/enfermedades estructuradas', () => {
    const probes = genCrossCropPestProbes(SYNTH_SPECIES, { max: 10 });
    expect(probes.length).toBeGreaterThan(0);
    expect(probes.every((p) => p.type === 'cross_crop')).toBe(true);
  });

  it('la trampa es de una familia botánica DISTINTA a la del sujeto', () => {
    const probes = genCrossCropPestProbes(SYNTH_SPECIES, { max: 10 });
    const cafeProbe = probes.find((p) => p.id === 'cross_crop__coffea_arabica_test');
    expect(cafeProbe).toBeTruthy();
    expect(cafeProbe.notes).toMatch(/Rubiaceae/);
    expect(cafeProbe.trapFacts[0]).not.toMatch(/Rubiaceae/); // la trampa NO es de la propia familia
  });

  it('respeta el cap `max`', () => {
    const probes = genCrossCropPestProbes(SYNTH_SPECIES, { max: 1 });
    expect(probes).toHaveLength(1);
  });

  it('catálogo sin especies con plagas/enfermedades → sin sondas (no revienta)', () => {
    expect(genCrossCropPestProbes([CEBOLLA], { max: 10 })).toHaveLength(0);
  });
});

// ── genCrossThermalProbes ──────────────────────────────────────────────────

describe('genCrossThermalProbes (dinámico, catálogo sintético)', () => {
  it('genera sonda solo si hay una especie-trampa de otra familia con companions en el piso ajeno', () => {
    const probes = genCrossThermalProbes([MAIZ, FRIJOL], { max: 10 });
    // MAIZ (calido, familia Poaceae) tiene companions -> pero necesita trapSpecies EN
    // el piso ajeno con familia distinta y companions propios; FRIJOL no tiene companions.
    // El test valida que no revienta y produce a lo sumo probes coherentes.
    for (const p of probes) {
      expect(p.type).toBe('cross_thermal');
      expect(p.trapFacts[0]).toMatch(/Compañeros reales de/);
    }
  });

  it('especie sin piso ajeno posible (cubre 4 pisos) no genera sonda para sí misma', () => {
    const cubreTodos = { ...CAFE, id: 'cubre_todos_test', thermal_zones: ['paramo', 'frio', 'templado', 'calido'] };
    const probes = genCrossThermalProbes([cubreTodos, MAIZ], { max: 10 });
    expect(probes.find((p) => p.id === 'cross_thermal__cubre_todos_test')).toBeUndefined();
  });

  it('respeta el cap `max`', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      ...MAIZ,
      id: `maiz_${i}`,
      companions: ['frijol_test'],
    }));
    const probes = genCrossThermalProbes([...many, FRIJOL], { max: 2 });
    expect(probes.length).toBeLessThanOrEqual(2);
  });
});

// ── genConfusionProbes ─────────────────────────────────────────────────────

describe('genConfusionProbes (usa _anti_confusion del catálogo)', () => {
  it('genera una sonda por especie con _anti_confusion poblado', () => {
    const probes = genConfusionProbes(SYNTH_SPECIES, { max: 10 });
    expect(probes).toHaveLength(1);
    expect(probes[0].id).toBe('confusion_especie__pinus_test');
    expect(probes[0].trapFacts[0]).toMatch(/eucalipto/);
  });

  it('la pregunta NO menciona la confusión explícitamente (simula usuario neutral)', () => {
    const probes = genConfusionProbes(SYNTH_SPECIES, { max: 10 });
    expect(probes[0].query).not.toMatch(/eucalipto|confundir/i);
  });

  it('sin _anti_confusion en ninguna especie → sin sondas', () => {
    expect(genConfusionProbes([CAFE, MAIZ], { max: 10 })).toHaveLength(0);
  });
});

// ── genPestDiseaseClassificationProbes ─────────────────────────────────────

describe('genPestDiseaseClassificationProbes (con detección de desacuerdo catálogo↔heurística)', () => {
  it('genera sondas plaga/enfermedad cuando catálogo y heurística coinciden', () => {
    const { probes } = genPestDiseaseClassificationProbes([CAFE, MAIZ], { max: 20 });
    expect(probes.length).toBeGreaterThan(0);
    expect(probes.every((p) => p.type === 'pest_vs_disease')).toBe(true);
  });

  it('un término mal categorizado en el catálogo (plaga que es hongo) queda como FLAG, no como sonda', () => {
    const cafeSoloMycena = { ...CAFE, id: 'cafe_solo_hongo_test', plagas_criticas: ['Mycena citricolor'], enfermedades_criticas: [] };
    const { probes, flags } = genPestDiseaseClassificationProbes([cafeSoloMycena], { max: 20 });
    expect(probes.find((p) => p.subject.includes('Mycena'))).toBeUndefined();
    expect(flags).toHaveLength(1);
    expect(flags[0].catalog_dice).toMatch(/plaga/);
    expect(flags[0].heuristica_dice).toBe('enfermedad');
  });

  it('respeta el cap `max`', () => {
    const { probes } = genPestDiseaseClassificationProbes([CAFE, MAIZ], { max: 1 });
    expect(probes).toHaveLength(1);
  });
});

// ── FIXED_PROBES ────────────────────────────────────────────────────────────

describe('FIXED_PROBES (sondas curadas, no dependen del catálogo)', () => {
  it('tiene exactamente los 3 casos pedidos: fresa, contacto inventado, trozador', () => {
    expect(FIXED_PROBES).toHaveLength(3);
    const ids = FIXED_PROBES.map((p) => p.id);
    expect(ids).toContain('fixed__fresa_no_es_guisante');
    expect(ids).toContain('fixed__contacto_inventado_plaga_cuarentenaria');
    expect(ids).toContain('fixed__trozador_es_plaga_no_enfermedad');
  });

  it('fresa: la trampa incluye guisante/arveja/Pisum/Fabaceae', () => {
    const p = FIXED_PROBES.find((x) => x.id === 'fixed__fresa_no_es_guisante');
    expect(p.trapFacts.join(' ')).toMatch(/[Gg]uisante/);
    expect(p.trapFacts.join(' ')).toMatch(/Fabaceae/);
  });

  it('trozador: el hecho correcto es "plaga", la trampa es "enfermedad"', () => {
    const p = FIXED_PROBES.find((x) => x.id === 'fixed__trozador_es_plaga_no_enfermedad');
    expect(p.expectedFacts.join(' ')).toMatch(/plaga/);
    expect(p.trapFacts.join(' ')).toMatch(/enfermedad/);
  });

  it('contacto: pide un número específico verificable — la trampa es CUALQUIER número inventado', () => {
    const p = FIXED_PROBES.find((x) => x.id === 'fixed__contacto_inventado_plaga_cuarentenaria');
    expect(p.type).toBe('contacto_inventado');
    expect(p.trapFacts.join(' ')).toMatch(/teléfono/);
  });
});

// ── generateProbeSet (combinador) ──────────────────────────────────────────

describe('generateProbeSet', () => {
  it('combina fijas + dinámicas y reporta counts + catálogo usado', () => {
    const set = generateProbeSet({ relPath: 'fixture', species: SYNTH_SPECIES });
    expect(set.counts.fixed).toBe(3);
    expect(set.counts.total).toBe(set.probes.length);
    expect(set.probes.length).toBeGreaterThanOrEqual(3);
    expect(set.catalog_path).toBe('fixture');
  });

  it('reporta catalog_data_quality_flags cuando hay desacuerdo', () => {
    const cafeConMycena = { ...CAFE, id: 'cafe_mycena_test2', plagas_criticas: ['Mycena citricolor'] };
    const set = generateProbeSet({ relPath: 'fixture', species: [cafeConMycena, MAIZ] });
    expect(set.catalog_data_quality_flags.length).toBeGreaterThan(0);
  });

  it('catálogo vacío → solo quedan las 3 fijas (no revienta)', () => {
    const set = generateProbeSet({ relPath: 'fixture-vacio', species: [] });
    expect(set.probes).toHaveLength(3);
  });
});

// ── loadCatalog (candidatos configurables) ─────────────────────────────────

describe('loadCatalog', () => {
  it('lanza un error claro si ningún candidato existe', () => {
    expect(() => loadCatalog({ rootDir: '/no/existe/en/serio', candidates: ['catalog/nope.json'] })).toThrow(/No se encontró/);
  });

  it('CATALOG_CANDIDATES prioriza el subset OSS v3.2 canónico primero', () => {
    expect(CATALOG_CANDIDATES[0]).toMatch(/oss-subset-v3\.2/);
  });
});

describe('buildEnrichedSystemPrompt (guard piso térmico chagra-pro #288)', () => {
  it('sin pisoTermicoBlock: prompt idéntico al comportamiento previo (retrocompatible)', () => {
    const prompt = buildEnrichedSystemPrompt([{ kind: 'species', mentioned: 'x', nombre_cientifico: 'Y', nombre_comun: 'y' }]);
    expect(prompt).not.toContain('GUARD PISO TÉRMICO');
    expect(prompt).toContain('ENTIDADES DEL CATÁLOGO');
  });

  it('pisoTermicoBlock no vacío se agrega AL FINAL (recency máxima, mismo criterio que AgentScreen.jsx)', () => {
    const prompt = buildEnrichedSystemPrompt([], '[GUARD PISO TÉRMICO — DESAJUSTE DETECTADO · innegociable]\nNo siembres esto acá.');
    expect(prompt.endsWith('No siembres esto acá.')).toBe(true);
    expect(prompt.indexOf('GUARD PISO TÉRMICO')).toBeGreaterThan(-1);
  });

  it('pisoTermicoBlock vacío/no-string es no-op', () => {
    const base = buildEnrichedSystemPrompt([]);
    expect(buildEnrichedSystemPrompt([], '')).toBe(base);
    expect(buildEnrichedSystemPrompt([], undefined)).toBe(base);
  });

  it('confusionEspecieBlock y pestVsDiseaseBlock se agregan AL FINAL, después de pisoTermico', () => {
    const prompt = buildEnrichedSystemPrompt(
      [],
      '[GUARD PISO TÉRMICO — DESAJUSTE DETECTADO · innegociable]',
      '[GUARD CONFUSIÓN DE ESPECIE — RIESGO DE FAMILIA/TAXONOMÍA EQUIVOCADA · innegociable]',
      '[GUARD PLAGA VS ENFERMEDAD — CLASIFICACIÓN VERIFICADA · innegociable]',
    );
    expect(prompt.indexOf('CONFUSIÓN DE ESPECIE')).toBeGreaterThan(prompt.indexOf('PISO TÉRMICO'));
    expect(prompt.indexOf('PLAGA VS ENFERMEDAD')).toBeGreaterThan(prompt.indexOf('CONFUSIÓN DE ESPECIE'));
    expect(prompt.endsWith('[GUARD PLAGA VS ENFERMEDAD — CLASIFICACIÓN VERIFICADA · innegociable]')).toBe(true);
  });

  it('confusionEspecieBlock/pestVsDiseaseBlock vacíos/no-string son no-op', () => {
    const base = buildEnrichedSystemPrompt([]);
    expect(buildEnrichedSystemPrompt([], '', '', '')).toBe(base);
    expect(buildEnrichedSystemPrompt([], undefined, undefined, undefined)).toBe(base);
  });
});

// ── orquestación: resolveFn/callFn/validateFn INYECTADOS (sin red real) ────

describe('runProbeAgainstAgent (dependencias inyectadas, sin red)', () => {
  const probe = { id: 'p1', type: 'cross_crop', query: '¿Qué plagas tiene X?' };

  it('feliz camino: arma la respuesta con entities_grounded + halluc_detected_count', async () => {
    const resolveFn = async () => ({ entities: [{ kind: 'species', mentioned: 'x' }] });
    const callFn = async () => ({ response: 'respuesta de prueba', error: null });
    const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
    const out = await runProbeAgainstAgent(probe, { resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn });
    expect(out.id).toBe('p1');
    expect(out.response).toBe('respuesta de prueba');
    expect(out.entities_grounded).toBe(1);
    expect(out.error).toBeNull();
    expect(out.piso_termico_guard_fired).toBe(false);
  });

  it('si callFn devuelve error, no llama a validateFn (evita gastar red en vano)', async () => {
    let validateCalled = false;
    const resolveFn = async () => ({ entities: [] });
    const callFn = async () => ({ response: '', error: 'timeout' });
    const validateFn = async () => { validateCalled = true; return { hallucinated: [], detected_count: 0 }; };
    const out = await runProbeAgainstAgent(probe, { resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn });
    expect(out.error).toBe('timeout');
    expect(validateCalled).toBe(false);
  });

  // ── GUARD piso térmico (chagra-pro #288) — el bench debe reflejar el MISMO
  // pipeline que producción (AgentScreen.jsx): inyecta el system_prompt_block
  // del guard cuando hay desajuste, degrada limpio cuando no.
  describe('wiring /piso-termico-guard (bench honesto, mismo pipeline que prod)', () => {
    it('has_mismatch:true → el system_prompt_block del guard llega al systemPrompt que ve callFn', async () => {
      const resolveFn = async () => ({ entities: [] });
      let seenSystemPrompt = null;
      const callFn = async (_model, systemPrompt) => {
        seenSystemPrompt = systemPrompt;
        return { response: 'r', error: null };
      };
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const pisoTermicoFn = async () => ({
        has_mismatch: true,
        system_prompt_block: '[GUARD PISO TÉRMICO — DESAJUSTE DETECTADO · innegociable]',
      });
      const out = await runProbeAgainstAgent(probe, { resolveFn, callFn, validateFn, pisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn });
      expect(seenSystemPrompt).toContain('GUARD PISO TÉRMICO');
      expect(out.piso_termico_guard_fired).toBe(true);
    });

    it('has_mismatch:false → NO inyecta nada (no-op, prompt idéntico al de antes del guard)', async () => {
      const resolveFn = async () => ({ entities: [] });
      let seenSystemPrompt = null;
      const callFn = async (_model, systemPrompt) => {
        seenSystemPrompt = systemPrompt;
        return { response: 'r', error: null };
      };
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const pisoTermicoFn = async () => ({ has_mismatch: false, system_prompt_block: '' });
      const out = await runProbeAgainstAgent(probe, { resolveFn, callFn, validateFn, pisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn });
      expect(seenSystemPrompt).not.toContain('GUARD PISO TÉRMICO');
      expect(out.piso_termico_guard_fired).toBe(false);
    });

    it('pisoTermicoFn caído/lanza error de red → degrada limpio, no rompe la sonda', async () => {
      const resolveFn = async () => ({ entities: [] });
      const callFn = async () => ({ response: 'r', error: null });
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const pisoTermicoFn = async () => ({ has_mismatch: false, system_prompt_block: '', error: 'ECONNREFUSED' });
      const out = await runProbeAgainstAgent(probe, { resolveFn, callFn, validateFn, pisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn });
      expect(out.error).toBeNull();
      expect(out.piso_termico_guard_fired).toBe(false);
    });
  });

  // ── GUARD confusión de especie (chagra-pro #292) — mismo criterio honesto
  // que piso térmico: el bench debe medir el pipeline REAL de prod.
  describe('wiring /confusion-especie-guard (bench honesto, mismo pipeline que prod)', () => {
    it('has_confusion:true → el system_prompt_block del guard llega al systemPrompt que ve callFn', async () => {
      const resolveFn = async () => ({ entities: [] });
      let seenSystemPrompt = null;
      const callFn = async (_model, systemPrompt) => {
        seenSystemPrompt = systemPrompt;
        return { response: 'r', error: null };
      };
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const confusionEspecieFn = async () => ({
        has_confusion: true,
        system_prompt_block: '[GUARD CONFUSIÓN DE ESPECIE — RIESGO DE FAMILIA/TAXONOMÍA EQUIVOCADA · innegociable]',
      });
      const out = await runProbeAgainstAgent(probe, {
        resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn,
      });
      expect(seenSystemPrompt).toContain('CONFUSIÓN DE ESPECIE');
      expect(out.confusion_especie_guard_fired).toBe(true);
    });

    it('has_confusion:false → NO inyecta nada (no-op, prompt idéntico al de antes del guard)', async () => {
      const resolveFn = async () => ({ entities: [] });
      let seenSystemPrompt = null;
      const callFn = async (_model, systemPrompt) => {
        seenSystemPrompt = systemPrompt;
        return { response: 'r', error: null };
      };
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const confusionEspecieFn = async () => ({ has_confusion: false, system_prompt_block: '' });
      const out = await runProbeAgainstAgent(probe, {
        resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn,
      });
      expect(seenSystemPrompt).not.toContain('CONFUSIÓN DE ESPECIE');
      expect(out.confusion_especie_guard_fired).toBe(false);
    });

    it('confusionEspecieFn caído/lanza error de red → degrada limpio, no rompe la sonda', async () => {
      const resolveFn = async () => ({ entities: [] });
      const callFn = async () => ({ response: 'r', error: null });
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const confusionEspecieFn = async () => ({ has_confusion: false, system_prompt_block: '', error: 'ECONNREFUSED' });
      const out = await runProbeAgainstAgent(probe, {
        resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn,
      });
      expect(out.error).toBeNull();
      expect(out.confusion_especie_guard_fired).toBe(false);
    });
  });

  // ── GUARD plaga vs enfermedad (chagra-pro #293) — mismo criterio honesto.
  describe('wiring /pest-vs-disease-guard (bench honesto, mismo pipeline que prod)', () => {
    it('has_classification:true → el system_prompt_block del guard llega al systemPrompt que ve callFn', async () => {
      const resolveFn = async () => ({ entities: [] });
      let seenSystemPrompt = null;
      const callFn = async (_model, systemPrompt) => {
        seenSystemPrompt = systemPrompt;
        return { response: 'r', error: null };
      };
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const pestVsDiseaseFn = async () => ({
        has_classification: true,
        system_prompt_block: '[GUARD PLAGA VS ENFERMEDAD — CLASIFICACIÓN VERIFICADA · innegociable]',
      });
      const out = await runProbeAgainstAgent(probe, {
        resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn,
      });
      expect(seenSystemPrompt).toContain('PLAGA VS ENFERMEDAD');
      expect(out.pest_vs_disease_guard_fired).toBe(true);
    });

    it('has_classification:false (incluye desacuerdo catálogo↔heurística) → NO inyecta nada', async () => {
      const resolveFn = async () => ({ entities: [] });
      let seenSystemPrompt = null;
      const callFn = async (_model, systemPrompt) => {
        seenSystemPrompt = systemPrompt;
        return { response: 'r', error: null };
      };
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const pestVsDiseaseFn = async () => ({ has_classification: false, system_prompt_block: '' });
      const out = await runProbeAgainstAgent(probe, {
        resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn,
      });
      expect(seenSystemPrompt).not.toContain('PLAGA VS ENFERMEDAD');
      expect(out.pest_vs_disease_guard_fired).toBe(false);
    });

    it('pestVsDiseaseFn caído/lanza error de red → degrada limpio, no rompe la sonda', async () => {
      const resolveFn = async () => ({ entities: [] });
      const callFn = async () => ({ response: 'r', error: null });
      const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
      const pestVsDiseaseFn = async () => ({ has_classification: false, system_prompt_block: '', error: 'ECONNREFUSED' });
      const out = await runProbeAgainstAgent(probe, {
        resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn,
      });
      expect(out.error).toBeNull();
      expect(out.pest_vs_disease_guard_fired).toBe(false);
    });
  });
});

describe('runAllProbes (secuencial, dependencias inyectadas)', () => {
  it('corre todas las sondas EN ORDEN (nunca en paralelo)', async () => {
    const order = [];
    const probes = [{ id: 'a', query: 'a' }, { id: 'b', query: 'b' }, { id: 'c', query: 'c' }];
    const resolveFn = async () => ({ entities: [] });
    const callFn = async (_model, _sys, userPrompt) => {
      order.push(userPrompt);
      return { response: `resp-${userPrompt}`, error: null };
    };
    const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
    const out = await runAllProbes(probes, { resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn, confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn, sleepMs: 0 });
    expect(order).toEqual(['a', 'b', 'c']);
    expect(out).toHaveLength(3);
  });

  it('onProgress se llama por cada sonda con (result, index, total)', async () => {
    const calls = [];
    const probes = [{ id: 'a', query: 'a' }];
    const resolveFn = async () => ({ entities: [] });
    const callFn = async () => ({ response: 'r', error: null });
    const validateFn = async () => ({ hallucinated: [], detected_count: 0 });
    await runAllProbes(probes, {
      resolveFn, callFn, validateFn, pisoTermicoFn: noMismatchPisoTermicoFn,
      confusionEspecieFn: noConfusionEspecieFn, pestVsDiseaseFn: noPestVsDiseaseFn, sleepMs: 0,
      onProgress: (result, i, total) => calls.push([result.id, i, total]),
    });
    expect(calls).toEqual([['a', 0, 1]]);
  });
});

// ── judgeResults / summarizeContamination (judgeCall inyectado) ───────────

describe('judgeResults (judgeCall inyectado, sin claude-code real)', () => {
  const results = [
    { id: 'c1', type: 'cross_crop', query: 'q1', response: 'r1', error: null },
    { id: 'c2', type: 'pest_vs_disease', query: 'q2', response: 'r2', error: null },
    { id: 'c3', type: 'cross_crop', query: 'q3', response: '', error: 'timeout' },
  ];
  const probesById = new Map([
    ['c1', { subject: 'S1', type: 'cross_crop', expectedFacts: [], trapFacts: ['trampa1'] }],
    ['c2', { subject: 'S2', type: 'pest_vs_disease', expectedFacts: [], trapFacts: ['trampa2'] }],
  ]);

  it('items con error se excluyen del juzgamiento (judge_source=skipped_error)', async () => {
    const judgeCall = async (items) => items.map((i) => ({ id: i.id, contaminated: false, category: 'ninguna', explanation: '', source: 'judge' }));
    const out = await judgeResults(results, probesById, { judgeCall, batchSize: 10 });
    const c3 = out.find((r) => r.id === 'c3');
    expect(c3.judge_source).toBe('skipped_error');
    expect(c3.contaminated).toBeNull();
  });

  it('anexa contaminated/category/explanation a cada resultado juzgado', async () => {
    const judgeCall = async (items) => items.map((i) => ({
      id: i.id,
      contaminated: i.id === 'c1',
      category: i.id === 'c1' ? 'cross_crop' : 'ninguna',
      explanation: i.id === 'c1' ? 'mezcla info de otro cultivo' : '',
      source: 'judge',
    }));
    const out = await judgeResults(results, probesById, { judgeCall, batchSize: 10 });
    const c1 = out.find((r) => r.id === 'c1');
    expect(c1.contaminated).toBe(true);
    expect(c1.contamination_category).toBe('cross_crop');
    expect(c1.judge_source).toBe('judge');
  });

  it('sin judgeCall inyectado y sin claude-code disponible → no revienta (unjudged)', async () => {
    // No inyectamos judgeCall: el import lazy de bench-scorer intentará
    // fabricar uno real, pero como no lo invocamos (batch vacío tras
    // filtrar errores) esto NO debe tocar la red/proceso.
    const onlyErrors = [{ id: 'x', type: 'cross_crop', query: 'q', response: '', error: 'boom' }];
    const out = await judgeResults(onlyErrors, new Map(), { batchSize: 10 });
    expect(out[0].judge_source).toBe('skipped_error');
  });
});

describe('summarizeContamination', () => {
  const judged = [
    { id: 'c1', type: 'cross_crop', error: null, judge_source: 'judge', contaminated: true, contamination_category: 'cross_crop', contamination_explanation: 'x', response: 'r1', query: 'q1', subject: 's1' },
    { id: 'c2', type: 'cross_crop', error: null, judge_source: 'judge', contaminated: false, contamination_category: 'ninguna', response: 'r2', query: 'q2', subject: 's2' },
    { id: 'c3', type: 'pest_vs_disease', error: null, judge_source: 'judge', contaminated: true, contamination_category: 'miscategorizacion', contamination_explanation: 'y', response: 'r3', query: 'q3', subject: 's3' },
    { id: 'c4', type: 'pest_vs_disease', error: 'timeout', judge_source: 'skipped_error', contaminated: null },
  ];

  it('calcula tasa global sobre juzgados (no sobre errores)', () => {
    const s = summarizeContamination(judged);
    expect(s.total_judged).toBe(3);
    expect(s.total_contaminated).toBe(2);
    expect(s.contamination_rate_pct).toBeCloseTo(66.7, 1);
    expect(s.total_errors).toBe(1);
  });

  it('agrega por tipo de sonda', () => {
    const s = summarizeContamination(judged);
    expect(s.by_type.cross_crop.total).toBe(2);
    expect(s.by_type.cross_crop.contaminated).toBe(1);
    expect(s.by_type.pest_vs_disease.total).toBe(1);
  });

  it('lista los peores casos (contaminated:true) con explicación', () => {
    const s = summarizeContamination(judged);
    expect(s.worst_cases).toHaveLength(2);
    expect(s.worst_cases.map((w) => w.id)).toEqual(expect.arrayContaining(['c1', 'c3']));
  });

  it('set vacío no revienta (0 juzgados → tasa 0)', () => {
    const s = summarizeContamination([]);
    expect(s.contamination_rate_pct).toBe(0);
    expect(s.worst_cases).toHaveLength(0);
  });
});

// ── runOnAlpha (execImpl inyectado — NUNCA lanza ssh/scp real) ────────────

describe('runOnAlpha (execImpl inyectado, sin red real)', () => {
  it('arma la secuencia mkdir → scp script → scp probes → ssh remote-run → scp results → cleanup', async () => {
    const calls = [];
    const execImpl = (cmd, args) => {
      calls.push([cmd, ...args]);
      // Simular la escritura del resultado remoto cuando se pide traerlo de vuelta.
      if (cmd === 'scp' && args[1] && args[1].endsWith('results.jsonl') === false && args[0].includes(':')) {
        // scp de vuelta: args = ['-q', 'host:remoteDir/results.jsonl', localResultsPath]
      }
    };
    // Para que el scp de "traer resultados" deje contenido leíble, escribimos
    // el jsonl nosotros mismos interceptando ese comando específico.
    const { writeFileSync } = await import('node:fs');
    const execImpl2 = (cmd, args) => {
      calls.push([cmd, ...args]);
      if (cmd === 'scp' && args.length === 3 && String(args[1]).includes(':') && String(args[1]).endsWith('results.jsonl')) {
        writeFileSync(args[2], JSON.stringify({ id: 'p1', response: 'ok' }) + '\n');
      }
    };
    const probes = [{ id: 'p1', query: 'q1' }];
    const out = await runOnAlpha(probes, { sshHost: 'alpha-test', execImpl: execImpl2 });
    expect(out).toEqual([{ id: 'p1', response: 'ok' }]);
    // primer comando: mkdir remoto
    expect(calls[0][0]).toBe('ssh');
    expect(calls[0]).toContain('mkdir');
    // el script se copia con scp (self-contained, self-scp)
    const scpScriptCall = calls.find((c) => c[0] === 'scp' && String(c[1]).includes('bench-contaminacion.mjs') === false && String(c[2]).endsWith('bench-contaminacion.mjs'));
    expect(scpScriptCall).toBeTruthy();
    // se invoca remote-run en el host correcto
    const remoteRunCall = calls.find((c) => c[0] === 'ssh' && c.includes('--phase=remote-run'));
    expect(remoteRunCall).toBeTruthy();
    expect(remoteRunCall[1]).toBe('alpha-test');
    // cleanup al final
    const cleanupCall = calls.find((c) => c[0] === 'ssh' && c.includes('rm'));
    expect(cleanupCall).toBeTruthy();
  });

  it('si el ssh remoto falla, igual intenta el cleanup (finally) y propaga el error', async () => {
    const execImpl = (cmd, args) => {
      if (cmd === 'ssh' && args.includes('--phase=remote-run')) {
        throw new Error('conexión perdida');
      }
    };
    await expect(runOnAlpha([{ id: 'p1', query: 'q1' }], { sshHost: 'alpha-test', execImpl })).rejects.toThrow(/conexión perdida/);
  });
});

describe('sidecarReachableLocally', () => {
  it('devuelve false si fetch falla (sin sidecar local — caso normal en stg)', async () => {
    const reachable = await sidecarReachableLocally({ url: 'http://127.0.0.1:1/healthz', timeoutMs: 300 });
    expect(reachable).toBe(false);
  });
});

// ── generateMarkdownReport ─────────────────────────────────────────────────

describe('generateMarkdownReport (reporte .md para ops/rebench-mensual.sh)', () => {
  const summary = {
    generated_at: '2026-07-02T00:00:00.000Z',
    model: 'granite3.3:8b',
    catalog: 'catalog/chagra-catalog-oss-subset-v3.2.json',
    total_probes: 10,
    total_run_ok: 10,
    total_errors: 0,
    total_judged: 10,
    total_unjudged: 0,
    total_contaminated: 3,
    contamination_rate_pct: 30,
    by_type: { cross_crop: { total: 5, contaminated: 2, rate_pct: 40 } },
    worst_cases: [
      { id: 'c1', type: 'cross_crop', category: 'cross_crop', subject: 'S1', query: 'q1', response: 'r1', explanation: 'mezcla info' },
    ],
  };

  it('incluye la tasa de contaminación y el modelo evaluado', () => {
    const md = generateMarkdownReport(summary);
    expect(md).toMatch(/30%/);
    expect(md).toMatch(/granite3\.3:8b/);
  });

  it('incluye la tabla por tipo de sonda', () => {
    const md = generateMarkdownReport(summary);
    expect(md).toMatch(/cross_crop/);
    expect(md).toMatch(/40%/);
  });

  it('incluye los peores casos con pregunta/respuesta/explicación', () => {
    const md = generateMarkdownReport(summary);
    expect(md).toMatch(/q1/);
    expect(md).toMatch(/r1/);
    expect(md).toMatch(/mezcla info/);
  });

  it('sin peores casos → dice explícitamente que no hubo contaminación (no revienta)', () => {
    const md = generateMarkdownReport({ ...summary, worst_cases: [] });
    expect(md).toMatch(/ninguno/i);
  });
});

// ── smoke test contra el catálogo REAL (sin cifras fijas) ─────────────────

describe('smoke test — generadores contra el catálogo real del repo', () => {
  const catalogPath = join(ROOT_DIR, 'catalog', 'chagra-catalog-oss-subset-v3.2.json');
  const skip = !existsSync(catalogPath);

  it.skipIf(skip)('produce al menos una sonda de cada tipo dinámico + las 3 fijas', () => {
    const catalog = loadCatalog({ rootDir: ROOT_DIR });
    const set = generateProbeSet(catalog);
    expect(set.counts.fixed).toBe(3);
    expect(set.counts.cross_crop).toBeGreaterThan(0);
    expect(set.counts.cross_thermal).toBeGreaterThan(0);
    expect(set.counts.confusion_especie).toBeGreaterThan(0);
    expect(set.counts.pest_vs_disease).toBeGreaterThan(0);
    // Todos los ids son únicos (sin colisiones entre generadores).
    const ids = set.probes.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
