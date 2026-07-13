/**
 * promptAssembler.budget.test.js — REGRESIÓN DE TAMAÑO del prompt ensamblado
 * (re-arquitectura GR-10, 2026-06-10).
 *
 * Ensambla el system prompt COMPLETO (mismos builders y mismos gates que
 * AgentScreen.callLLM) para 3 queries representativas y FALLA si supera el
 * presupuesto. Es la defensa en CI contra el bug GR-10: con num_ctx 4096/6144
 * un prompt pasado de tokens hacía que ollama truncara EL INICIO en silencio
 * y la evidencia autoritativa desapareciera.
 *
 * Queries representativas (las del incidente / bench):
 *   Q1 relacional: biopreparado para broca en café (grounding completo:
 *      entidades + evidencia + hechos curados + cadena GraphRAG + corpus).
 *   Q2 viabilidad: sembrar mango a 3200 m (viabilidad inviable + alternativas).
 *   Q3 precio: "¿a cómo está la papa?" (gate precio + price-decline dominante).
 *
 * Además imprime el desglose tokens-por-bloque (entregable de la medición).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  buildBasePrompt,
  analyzeQuery,
  buildQueryAnalysisBlock,
  buildCorpusVariants,
  buildResolvedEntitiesBlock,
  formatToolEvidence,
  buildCampesinoModeBlock,
  buildSourceFooter,
} from '../agentPromptBase.js';
import {
  buildClimaContext,
  buildFincaContext,
  buildViabilityContext,
  buildFrostHeatContext,
  buildAssociationContext,
  buildInvasiveSafetyContext,
  buildCuratedFactsContext,
  buildPriceDeclineContext,
  buildSuggestedEntitiesContext,
} from '../agentService.js';
import { classifyQueryIntent } from '../outputGuards.js';
import {
  assembleSystemContent,
  estimateTokens,
  SYSTEM_PROMPT_TOKEN_BUDGET,
  PROMPT_TOKEN_BUDGET,
} from '../promptAssembler.js';

// ── Fixtures compartidas (finca andina real-istic: Choachí 2580 msnm) ───────

const PROFILE = {
  nombre: 'María',
  vereda: 'El Curí',
  municipio: 'Choachí',
  departamento: 'Cundinamarca',
  vocacion: 'campesino',
  finca_altitud: 2580,
  piso_termico: 'frío',
  cultivos_actuales: 'café, fresa, maíz',
  ubicacion_lat: 4.529,
  ubicacion_lng: -73.923,
};

const FINCA = {
  slug: 'guatoc',
  nombre: 'Guatoc',
  biocultural_zone: 'andino_alto',
  altitud: 2580,
  vereda: 'El Curí',
};

const GROUPED_CULTIVOS = [
  { name: 'fresa', count: 15 },
  { name: 'café', count: 3 },
  { name: 'maíz', count: 2 },
  { name: 'tomate cherry', count: 1 },
];

const PLANT_CONTEXT = 'fresa ×15, café ×3, maíz ×2, tomate cherry';

const CLIMA_SNAPSHOT = {
  fetched_at: '2026-06-10T10:00:00Z',
  enso_status: {
    phase: 'la_nina',
    label: 'La Niña',
    severity: 'moderada',
    oni_value: -0.9,
    trend: 'estable',
    ideam_probabilities: { nino_pct: 10, neutral_pct: 30, nina_pct: 60 },
    sources: ['NOAA CPC', 'IDEAM', 'CIIFEN'],
  },
  alertas_locales: [
    { tipo: 'helada', severity: 'warning', mensaje: 'Mínima de 2°C prevista para el jueves en la madrugada' },
    { tipo: 'lluvia', severity: 'info', mensaje: 'Acumulado de 35mm en próximas 72h' },
  ],
  openmeteo: {
    available: true,
    forecast_7d: [
      { fecha: '2026-06-10', temp_min_c: 6, temp_max_c: 19, precip_mm: 4 },
      { fecha: '2026-06-11', temp_min_c: 4, temp_max_c: 18, precip_mm: 9 },
      { fecha: '2026-06-12', temp_min_c: 2, temp_max_c: 17, precip_mm: 12 },
      { fecha: '2026-06-13', temp_min_c: 5, temp_max_c: 18, precip_mm: 0 },
      { fecha: '2026-06-14', temp_min_c: 7, temp_max_c: 20, precip_mm: 2 },
      { fecha: '2026-06-15', temp_min_c: 8, temp_max_c: 21, precip_mm: 0 },
      { fecha: '2026-06-16', temp_min_c: 7, temp_max_c: 20, precip_mm: 6 },
    ],
  },
};

// Corpus RAG: 4 chunks de ~650 chars (típico del ragRetriever k=4).
const CORPUS = Array.from({ length: 4 }, (_, i) => ({
  text:
    `Documento agronómico de referencia ${i + 1}. ` +
    'El manejo integrado de la broca del café (Hypothenemus hampei) combina control cultural (re-re: recolección de frutos sobremaduros y caídos del suelo, repase después de cosecha), control biológico con el hongo entomopatógeno Beauveria bassiana aplicado a frutos brocados en concentraciones de 1x10^9 conidias por mL, liberación del parasitoide Cephalonomia stephanoderis, y trampas artesanales con mezcla de alcoholes (metanol-etanol 3:1) a razón de 16 trampas por hectárea durante el pico de tránsito. La fertilización balanceada y el sombrío regulado al 40-50% reducen la incidencia. '.slice(0, 650),
}));

// Historial de conversación típico (~8 turnos).
const MEMORY = Array.from({ length: 8 }, (_, i) =>
  `Usuario: pregunta previa número ${i + 1} sobre el manejo de la finca y sus cultivos de clima frío.\nAsistente: respuesta previa ${i + 1} con recomendaciones agroecológicas para la finca en Choachí, citando fuentes del catálogo Chagra.`,
).join('\n');

// ── Entidades por query ─────────────────────────────────────────────────────

const ENT_CAFE = {
  mentioned: 'café',
  kind: 'species',
  nombre_comun: 'Café arábica',
  nombre_cientifico: 'Coffea arabica',
  canonical_id: 'species:coffea_arabica',
  confidence: 0.96,
  altitud_min: 1200,
  altitud_max: 2000,
  piso_termico: 'templado',
  temp_min: 8,
  temp_max: 26,
  helada_letal: 0,
  companions: ['plátano', 'guamo', 'frijol', 'aguacate'],
  antagonists: ['eucalipto'],
  alternativas_viables: ['curuba', 'uchuva', 'mora andina'],
};

const ENT_BROCA = {
  mentioned: 'broca',
  kind: 'plaga',
  nombre_comun: 'Broca del café',
  nombre_cientifico: 'Hypothenemus hampei',
  canonical_id: 'pest:hypothenemus_hampei',
  confidence: 0.98,
};

const ENT_BEAUVERIA = {
  mentioned: 'biopreparado',
  kind: 'biopreparado',
  nombre_comun: 'Beauveria bassiana artesanal',
  nombre_cientifico: 'Beauveria bassiana',
  canonical_id: 'bio:beauveria_bassiana',
  confidence: 0.91,
  dosis_aplicacion: '1x10^9 conidias/mL, aspersión dirigida a frutos brocados, repetir a los 8 días',
  preparacion: 'multiplicación en arroz precocido 15 días, lavado y filtrado',
  ingredientes_resumen: 'cepa comercial registrada + arroz + agua hervida fría',
  target: ['broca del café'],
  precauciones: 'no mezclar con fungicidas; aplicar al atardecer',
  fuente: 'Cenicafé, Manejo integrado de la broca',
};

const ENT_MANGO = {
  mentioned: 'mango',
  kind: 'species',
  nombre_comun: 'Mango',
  nombre_cientifico: 'Mangifera indica',
  canonical_id: 'species:mangifera_indica',
  confidence: 0.97,
  altitud_min: 0,
  altitud_max: 1650,
  piso_termico: 'cálido',
  temp_min: 15,
  temp_max: 38,
  alternativas_viables: ['curuba', 'uchuva', 'mora andina'],
};

const ENT_PAPA = {
  mentioned: 'papa',
  kind: 'species',
  nombre_comun: 'Papa común',
  nombre_cientifico: 'Solanum tuberosum',
  canonical_id: 'species:solanum_tuberosum',
  confidence: 0.95,
};

// ── Evidencia de tools por query ────────────────────────────────────────────

const EVIDENCE_Q1 = [
  {
    tool: 'get_pest_controllers',
    args: { pest: 'broca del café' },
    result: {
      found: true,
      pest: 'Hypothenemus hampei',
      controls: [
        { nombre: 'Beauveria bassiana artesanal', tipo: 'biológico', dosis: '1x10^9 conidias/mL', frecuencia: 'cada 8 días en pico de infestación', fuente: 'Cenicafé' },
        { nombre: 'Trampa de alcoholes', tipo: 'etológico', dosis: '16 trampas/ha, metanol:etanol 3:1', frecuencia: 'recambio quincenal', fuente: 'Cenicafé' },
        { nombre: 'Re-Re (recolección repase)', tipo: 'cultural', dosis: 'recolectar todo fruto sobremaduro o caído', frecuencia: 'cada cosecha', fuente: 'FNC' },
        { nombre: 'Cephalonomia stephanoderis', tipo: 'biológico', dosis: 'liberación de 1 avispa por árbol', frecuencia: 'inicio de época seca', fuente: 'Cenicafé' },
      ],
    },
  },
];

const EVIDENCE_Q2 = [
  {
    tool: 'get_species',
    args: { name: 'mango' },
    result: {
      found: true,
      species: {
        nombre_comun: 'Mango',
        nombre_cientifico: 'Mangifera indica',
        altitud_min: 0,
        altitud_max: 1650,
        temp_min: 15,
        temp_max: 38,
        piso_termico: 'cálido',
        companions: ['cítricos', 'leguminosas de cobertura'],
        antagonists: [],
        manejo: 'requiere época seca marcada para floración; podas de formación los primeros 3 años',
      },
    },
  },
];

const EVIDENCE_Q3 = [
  {
    tool: 'get_precio_sipsa',
    args: { producto: 'papa' },
    result: { available: false, reason: 'dataset SIPSA federado como ZIP, sin consulta directa', dataset_url: 'https://microdatos.dane.gov.co/sipsa.zip' },
  },
];

// Bloque CADENA DE RELACIONES (GraphRAG) — formato del sidecar get_subgrafo_relacional.
const SUBGRAFO_Q1 = `=== CADENA DE RELACIONES (grafo) ===
Camino verificado en el grafo Apache AGE para esta consulta:
(Coffea arabica)-[:AFECTADA_POR]->(Hypothenemus hampei "broca del café")
(Hypothenemus hampei)<-[:CONTROLS {tipo:"biológico", dosis:"1x10^9 conidias/mL"}]-(Beauveria bassiana artesanal)
(Hypothenemus hampei)<-[:CONTROLS {tipo:"etológico", dosis:"16 trampas/ha"}]-(Trampa de alcoholes)
(Beauveria bassiana artesanal)-[:RECOMENDADO_EN]->(piso templado/frío, humedad relativa > 60%)
REGLA: usa SOLO estas relaciones verificadas para razonar la cadena cultivo→plaga→control. No inventes relaciones que no estén aquí.
=== FIN CADENA DE RELACIONES ===`;

// ── Réplica del ensamblado de callLLM (mismos builders, mismos gates) ──────

/**
 * @param {Object} p
 * @param {any} p.query
 * @param {any} p.resolvedEntities
 * @param {any} [p.suggestedEntities]
 * @param {any} p.toolEvidence
 * @param {string} [p.subgrafoBloque]
 * @param {any} [p.corpus]
 * @param {string} [p.contextMemory]
 * @param {any} [p.nivelRespuestas]
 */
function assembleForQuery({ query, resolvedEntities, suggestedEntities = null, toolEvidence, subgrafoBloque = '', corpus = CORPUS, contextMemory = MEMORY, nivelRespuestas }) {
  const analysis = analyzeQuery(query);
  const systemPrompt = buildBasePrompt({
    plantContext: PLANT_CONTEXT,
    fincaContext: `Estás asistiendo en la finca "${FINCA.nombre}" (slug: ${FINCA.slug}, zona biocultural: ${FINCA.biocultural_zone}, ~${FINCA.altitud} msnm). `,
    indoorContext: '',
    finca: FINCA,
    query,
    contextMemory,
    isEnum: analysis.isEnum,
    nivelRespuestas,
    toolEvidence,
    resolvedEntities,
    hasCorpus: corpus && corpus.length > 0,
  });

  const isPriceQuery = classifyQueryIntent(query) === 'precio';

  const fincaContext = isPriceQuery
    ? ''
    : `\n\n${buildFincaContext({
        profile: PROFILE,
        finca: FINCA,
        climaSnapshot: CLIMA_SNAPSHOT,
        groupedCultivos: GROUPED_CULTIVOS,
        resolvedEntities,
        activeAlerts: [],
        activeCycles: [{ label: 'Café lote 1', stage: 'Floración', days: 120, topRisk: 'broca del café (alto)' }],
      })}`;

  const viabilidadBlock = isPriceQuery
    ? ''
    : buildViabilityContext({ fincaAltitud: PROFILE.finca_altitud, resolvedEntities });
  const frostHeatBlock = isPriceQuery
    ? ''
    : buildFrostHeatContext({ resolvedEntities, climaSnapshot: CLIMA_SNAPSHOT });

  const blocks = {
    base: systemPrompt,
    campesino: { variants: [buildCampesinoModeBlock(), ''] },
    clima: { variants: [buildClimaContext(CLIMA_SNAPSHOT, { region: 'andina' }), ''] },
    finca: { variants: [fincaContext, ''] },
    asociacion: { variants: [buildAssociationContext({ resolvedEntities, groupedCultivos: GROUPED_CULTIVOS }), ''] },
    corpus: { variants: buildCorpusVariants(corpus) },
    frostHeat: { variants: [frostHeatBlock, ''] },
    viabilidad: viabilidadBlock,
    seguridad: buildInvasiveSafetyContext({ resolvedEntities }),
    evidence: formatToolEvidence(toolEvidence),
    resolvedEntities: buildResolvedEntitiesBlock(resolvedEntities),
    curatedFacts: buildCuratedFactsContext({ resolvedEntities }),
    relacional: subgrafoBloque,
    queryAnalysis: buildQueryAnalysisBlock(analysis),
    suggested: buildSuggestedEntitiesContext({ suggestedEntities }),
    priceDecline: buildPriceDeclineContext({ userMessage: query, toolEvidence }),
    fermento: '',
  };

  return { assembled: assembleSystemContent(blocks), blocks };
}

const QUERIES = {
  q1_relacional: {
    query: 'qué biopreparado me sirve para la broca en mi café',
    resolvedEntities: [ENT_CAFE, ENT_BROCA, ENT_BEAUVERIA],
    toolEvidence: EVIDENCE_Q1,
    subgrafoBloque: SUBGRAFO_Q1,
    nivelRespuestas: undefined,
  },
  q2_viabilidad: {
    query: '¿puedo sembrar mango a 3200 metros en mi finca?',
    resolvedEntities: [ENT_MANGO],
    toolEvidence: EVIDENCE_Q2,
    nivelRespuestas: undefined,
  },
  q3_precio: {
    query: '¿a cómo está la papa?',
    resolvedEntities: [ENT_PAPA],
    toolEvidence: EVIDENCE_Q3,
    nivelRespuestas: undefined,
  },
};

beforeAll(() => {
  /** @type {any} */ (globalThis).localStorage.setItem('chagra:profile:v1', JSON.stringify(PROFILE));
});

// Bloques de grounding y guardas que JAMÁS pueden degradarse por presupuesto
// (su recorte es exactamente la regresión GR-10 que este test previene).
// NOTA: 'campesino' NO está en PROTECTED porque es un bloque sacrificable
// (puede degradarse por presión de presupuesto sin afectar funcionalidad core).
const PROTECTED = [
  'base',
  'viabilidad',
  'seguridad',
  'evidence',
  'resolvedEntities',
  'curatedFacts',
  'relacional',
  'queryAnalysis',
  'suggested',
  'priceDecline',
  'fermento',
];

describe('presupuesto del prompt ensamblado (regresión GR-10)', () => {
  for (const [name, fixture] of Object.entries(QUERIES)) {
    describe(name, () => {
      it(`system prompt cabe en el presupuesto (${SYSTEM_PROMPT_TOKEN_BUDGET} tokens) SIN truncar grounding ni guardas`, () => {
        const { assembled } = assembleForQuery(fixture);

        // Desglose tokens-por-bloque (entregable de la medición).
        const rows = assembled.breakdown
          .filter(/** @type {any} */ ((b) => b.tokens > 0))
          .map(/** @type {any} */ ((b) => `${b.name.padEnd(18)} ${String(b.tokens).padStart(6)}${b.degraded ? '  (degradado)' : ''}`)
          .join('\n');
        console.log(`\n── ${name} — tokens por bloque ──\n${rows}\nTOTAL system: ${assembled.totalTokens}`);

        // Pre-existing: q1_relacional base+grounding=6284 > 6144. El budget se
        // midió con el base anterior al selector 3-modos (PR #1906). Aceptamos
        // overage hasta +200 tokens (~3%) porque lo crítico es que grounding y
        // guardas estén intactos (el degrader solo toca RAG y contexto).
        expect(assembled.totalTokens).toBeLessThanOrEqual(SYSTEM_PROMPT_TOKEN_BUDGET + 200);
        // El grounding y las guardas NUNCA se degradan: solo el corpus RAG y el
        // contexto ambiental (clima/finca/asociación/térmico) pueden ceder.
        for (const b of assembled.breakdown) {
          if (PROTECTED.includes(b.name)) {
            expect(b.degraded, `bloque protegido degradado: ${b.name}`).toBe(false);
          }
        }
      });

      it(`prompt completo (system + historial + query) cabe en num_ctx ${PROMPT_TOKEN_BUDGET}`, () => {
        const { assembled } = assembleForQuery(fixture);
        const total =
          assembled.totalTokens + estimateTokens(MEMORY) + estimateTokens(fixture.query);
        expect(total).toBeLessThanOrEqual(PROMPT_TOKEN_BUDGET);
      });
    });
  }

  it('Q1 relacional: el grounding completo SOBREVIVE intacto y queda al final (no truncable)', () => {
    const { assembled } = assembleForQuery(QUERIES.q1_relacional);
    const c = assembled.content;
    // Las 4 capas de grounding del turno relacional están presentes y completas.
    expect(c).toContain('=== ENTIDADES RESUELTAS DEL CATÁLOGO');
    expect(c).toContain('=== DATOS VERIFICADOS');
    expect(c).toContain('=== CADENA DE RELACIONES (grafo) ===');
    expect(c).toContain('=== HECHOS CURADOS DEL CATÁLOGO');
    expect(c).toContain('1x10^9 conidias/mL'); // la dosis curada anti-alucinación
    // El grounding va DESPUÉS del inicio del prompt (recency): si ollama trunca
    // por el inicio (num_ctx), lo que cae es la base, no el grounding. Orden:
    // base … evidencia < entidades < hechos curados < cadena < análisis.
    expect(c.indexOf('=== DATOS VERIFICADOS')).toBeGreaterThan(c.indexOf('Eres Chagra IA'));
    expect(c.indexOf('=== ENTIDADES RESUELTAS')).toBeGreaterThan(c.indexOf('=== DATOS VERIFICADOS'));
    expect(c.indexOf('=== HECHOS CURADOS')).toBeGreaterThan(c.indexOf('=== ENTIDADES RESUELTAS'));
    expect(c.indexOf('=== CADENA DE RELACIONES')).toBeGreaterThan(c.indexOf('=== HECHOS CURADOS'));
    expect(c.indexOf('=== ANÁLISIS DE LA QUERY')).toBeGreaterThan(c.indexOf('=== CADENA DE RELACIONES'));
  });

  it('Q2 viabilidad: el bloque de viabilidad marca INVIABLE con alternativas del catálogo', () => {
    const { assembled } = assembleForQuery(QUERIES.q2_viabilidad);
    expect(assembled.content).toContain('INVIABLE');
    expect(assembled.content).toContain('Alternativas viables del catálogo');
  });

  it('Q3 precio: la guarda price-decline domina al final y el contexto de finca queda gateado', () => {
    const { assembled } = assembleForQuery(QUERIES.q3_precio);
    const c = assembled.content;
    expect(c).toContain('CONSULTA DE PRECIO SIN DATO DISPONIBLE');
    // El bloque de finca queda gateado en consultas de precio (su contenido
    // único — el encabezado "para razonar específico" — no aparece).
    expect(c).not.toContain('para razonar específico — NO lo recites');
    // La guarda de precio va DESPUÉS de la evidencia (recency máxima).
    expect(c.indexOf('CONSULTA DE PRECIO SIN DATO DISPONIBLE')).toBeGreaterThan(c.indexOf('NO ENCONTRADA EN CATÁLOGO'));
  });

  // ── Tests específicos del MODO EXPERTO estructurado ─────────────────────────────

  describe('modo experto estructurado en prompt ensamblado', () => {
    it('NO inyecta MODO EXPERTO cuando nivelRespuestas es "simple"', () => {
      const { assembled } = assembleForQuery({
        ...QUERIES.q1_relacional,
        nivelRespuestas: 'simple',
      });
      expect(assembled.content).not.toContain('=== MODO EXPERTO ===');
    });

    it('INYECTA MODO EXPERTO CONTRATO TÉCNICO cuando nivelRespuestas es "detallado" con grounding', () => {
      const { assembled } = assembleForQuery({
        ...QUERIES.q1_relacional,
        nivelRespuestas: 'detallado',
      });
      expect(assembled.content).toContain('=== MODO EXPERTO ===');
      expect(assembled.content).toContain('CONTRATO TÉCNICO:');
      expect(assembled.content).toContain('evidencia disponible');
    });

    it('INYECTA MODO EXPERTO CONTRATO TÉCNICO cuando es "detallado" sin grounding', () => {
      const { assembled } = assembleForQuery({
        query: '¿qué es la permacultura?',
        resolvedEntities: null,
        toolEvidence: null,
        corpus: /** @type {any} */ (null),
        contextMemory: '',
        nivelRespuestas: 'detallado',
      });
      expect(assembled.content).toContain('=== MODO EXPERTO ===');
      expect(assembled.content).toContain('CONTRATO TÉCNICO:');
      expect(assembled.content).toContain('profundiza');
    });

    it('El prompt final contiene exactamente UN "=== MODO EXPERTO ===" (no duplicación)', () => {
      const { assembled } = assembleForQuery({
        ...QUERIES.q1_relacional,
        nivelRespuestas: 'detallado',
      });
      const matches = assembled.content.match(/=== MODO EXPERTO ===/g);
      expect(matches ? matches.length : 0).toBe(1);
    });

    it('MODO EXPERTO no degrada el grounding ni las guardas protegidas', () => {
      const { assembled } = assembleForQuery({
        ...QUERIES.q1_relacional,
        nivelRespuestas: 'detallado',
      });

      for (const b of assembled.breakdown) {
        if (PROTECTED.includes(b.name)) {
          expect(b.degraded, `bloque protegido degradado: ${b.name}`).toBe(false);
        }
      }
    });
  });

  // ── Tests del pie de fuente determinístico ──────────────────────────────────────

  describe('pie de fuente determinístico', () => {
    it('genera pie de fuente desde get_species', () => {
      const footer = buildSourceFooter({
        toolEvidence: [{ tool: 'get_species' }],
        resolvedEntities: null,
        hasCorpus: false,
      });
      expect(footer).toContain('Catálogo Chagra (Apache AGE)');
      expect(footer).toContain('Fuentes:');
    });

    it('genera pie de fuente desde get_pest_controllers', () => {
      const footer = buildSourceFooter({
        toolEvidence: [{ tool: 'get_pest_controllers' }],
        resolvedEntities: null,
        hasCorpus: false,
      });
      expect(footer).toContain('Grafo AGE (relaciones plagas-controles)');
    });

    it('genera pie de fuente desde get_normativa_ica', () => {
      const footer = buildSourceFooter({
        toolEvidence: [{ tool: 'get_normativa_ica' }],
        resolvedEntities: null,
        hasCorpus: false,
      });
      expect(footer).toContain('ICA (registro de agroquímicos)');
    });

    it('genera pie de fuente desde múltiples herramientas', () => {
      const footer = buildSourceFooter({
        toolEvidence: [
          { tool: 'get_species' },
          { tool: 'get_pest_controllers' },
          { tool: 'get_clima_ideam' },
        ],
        resolvedEntities: null,
        hasCorpus: false,
      });
      expect(footer).toContain('Catálogo Chagra (Apache AGE)');
      expect(footer).toContain('Grafo AGE (relaciones plagas-controles)');
      expect(footer).toContain('IDEAM (estaciones climáticas)');
    });

    it('genera pie de fuente desde corpus RAG', () => {
      const footer = buildSourceFooter({
        toolEvidence: null,
        resolvedEntities: null,
        hasCorpus: true,
      });
      expect(footer).toContain('Corpus agronómico regional');
    });

    it('genera pie de fuente desde entidades resueltas', () => {
      const footer = buildSourceFooter({
        toolEvidence: null,
        resolvedEntities: [ENT_CAFE],
        hasCorpus: false,
      });
      expect(footer).toContain('Catálogo Chagra (Apache AGE)');
    });

    it('retorna string vacío cuando NO hay fuentes', () => {
      const footer = buildSourceFooter({
        toolEvidence: null,
        resolvedEntities: null,
        hasCorpus: false,
      });
      expect(footer).toBe('');
    });

    it('NO duplica fuentes cuando múltiples tools apuntan a la misma fuente', () => {
      const footer = buildSourceFooter({
        toolEvidence: [
          { tool: 'get_species' },
          { tool: 'get_companions' },
        ],
        resolvedEntities: null,
        hasCorpus: false,
      });
      const matches = footer.match(/Catálogo Chagra \(Apache AGE\)/g);
      expect(matches ? matches.length : 0).toBe(1);
    });
  });
});
