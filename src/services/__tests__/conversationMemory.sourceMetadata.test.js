/**
 * conversationMemory.sourceMetadata.test.js
 *
 * Tests del helper puro `computeSourceMetadata`, que determina si un
 * turno del assistant debe quedar persistido como:
 *   - tool_used + grounded=true  (catálogo verificado)
 *   - tool_used + grounded=false (tool corrió pero no hubo match)
 *   - tool_used=null             (LLM puro, sin tool MCP)
 *
 * El ChatBubble renderiza el badge a partir de este metadata.
 */
import { describe, test, expect } from 'vitest';
import {
  computeSourceMetadata,
  mergePostValidateMetadata,
  extractGroundingBadges,
  deriveEvidenceSourceLink,
} from '../conversationMemory';

describe('computeSourceMetadata', () => {
  test('null / undefined toolEvidence → no tool, no grounded', () => {
    expect(computeSourceMetadata(null)).toEqual({ tool_used: null, grounded: false });
    expect(computeSourceMetadata(undefined)).toEqual({ tool_used: null, grounded: false });
  });

  test('toolEvidence sin tool field → no tool, no grounded', () => {
    expect(computeSourceMetadata(/** @type {any} */ ({ tool: null, args: {}, result: {} }))).toEqual({
      tool_used: null,
      grounded: false,
    });
  });

  test('found:true → grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: { name: 'aguacate' },
      result: { found: true, species: { name: 'Persea americana' } },
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: true });
  });

  test('found:false → tool_used pero no grounded (catálogo no tiene la especie)', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: { name: 'mareñongoño' },
      result: { found: false, hint: 'no en catálogo' },
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: false });
  });

  test('available:true → grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_biopreparados',
      args: { species: 'tomate' },
      result: { available: true, biopreparados: [{ name: 'caldo bordelés' }] },
    });
    expect(md.grounded).toBe(true);
  });

  test('available:false → no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_biopreparados',
      args: { species: 'X inexistente' },
      result: { available: false },
    });
    expect(md.grounded).toBe(false);
  });

  test('matches_count > 0 → grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_multihop_companions',
      args: { species: 'maíz' },
      result: { matches_count: 5, matches: [{ name: 'frijol' }] },
    });
    expect(md.grounded).toBe(true);
  });

  test('matches_count === 0 → no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_multihop_companions',
      args: { species: 'X' },
      result: { matches_count: 0, matches: [] },
    });
    expect(md.grounded).toBe(false);
  });

  test('result con array no vacío y sin flags explícitos → grounded (heurística)', () => {
    const md = computeSourceMetadata({
      tool: 'get_companions',
      args: { species: 'maíz' },
      result: { companions: [{ name: 'frijol' }, { name: 'auyama' }] },
    });
    expect(md).toEqual({ tool_used: 'get_companions', grounded: true });
  });

  test('result no-object (string) → tool_used pero no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: {},
      result: 'string raro',
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: false });
  });

  test('result null → tool_used pero no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: {},
      result: null,
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: false });
  });

  describe('chain #246: array de evidences', () => {
    test('array vacío → no tool, no grounded', () => {
      expect(computeSourceMetadata(/** @type {any} */ ([]))).toEqual({ tool_used: null, grounded: false });
    });

    test('array con todos null → no tool, no grounded', () => {
      expect(computeSourceMetadata(/** @type {any} */ ([null, null, null]))).toEqual({
        tool_used: null,
        grounded: false,
      });
    });

    test('array con mix de null y evidences válidas → ignora nulls, grounded si alguno útil', () => {
      const md = computeSourceMetadata(/** @type {any} */ ([
        null,
        {
          tool: 'get_species',
          args: { name: 'aguacate' },
          result: { found: true, species: { name: 'Persea americana' } },
        },
        undefined,
      ]));
      expect(md).toEqual({ tool_used: 'get_species', grounded: true });
    });

    test('array con múltiples tools → tool_used concatenados con +', () => {
      const md = computeSourceMetadata(/** @type {any} */ ([
        {
          tool: 'get_species',
          args: { name: 'maíz' },
          result: { found: true, species: { name: 'Zea mays' } },
        },
        {
          tool: 'get_companions',
          args: { species: 'maíz' },
          result: { companions: [{ name: 'frijol' }] },
        },
      ]));
      expect(md).toEqual({
        tool_used: 'get_species+get_companions',
        grounded: true,
      });
    });

    test('array chain: grounded=true si CUALQUIERA tool devuelve payload útil', () => {
      const md = computeSourceMetadata(/** @type {any} */ ([
        {
          tool: 'get_species',
          args: { name: 'inexistente' },
          result: { found: false },
        },
        {
          tool: 'get_companions',
          args: { species: 'maíz' },
          result: { companions: [{ name: 'frijol' }] },
        },
      ]));
      expect(md.grounded).toBe(true);
      expect(md.tool_used).toBe('get_species+get_companions');
    });

    test('array chain: grounded=false si NINGUNO tool devuelve payload útil', () => {
      const md = computeSourceMetadata(/** @type {any} */ ([
        {
          tool: 'get_species',
          args: { name: 'inexistente' },
          result: { found: false },
        },
        {
          tool: 'get_companions',
          args: { species: 'inexistente' },
          result: { matches_count: 0 },
        },
      ]));
      expect(md.grounded).toBe(false);
      expect(md.tool_used).toBe('get_species+get_companions');
    });

    test('array chain: un tool con matches_count >0 hace grounded=true', () => {
      const md = computeSourceMetadata(/** @type {any} */ ([
        {
          tool: 'get_species',
          args: { name: 'inexistente' },
          result: { found: false },
        },
        {
          tool: 'get_multihop_companions',
          args: { species: 'maíz' },
          result: { matches_count: 3, matches: [{ name: 'frijol' }] },
        },
      ]));
      expect(md.grounded).toBe(true);
    });

    test('array chain: un tool con available:true hace grounded=true', () => {
      const md = computeSourceMetadata(/** @type {any} */ ([
        {
          tool: 'get_biopreparados',
          args: { species: 'inexistente' },
          result: { available: false },
        },
        {
          tool: 'get_species',
          args: { name: 'aguacate' },
          result: { available: true, species: { name: 'Persea americana' } },
        },
      ]));
      expect(md.grounded).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// FIX 2 (2026-05-31): mergePostValidateMetadata — surfacea suspect[] Y
// hallucinated[] del post-validate. El bug vivo: el PWA solo leía suspect, así
// que un binomio 100% inventado por el modelo se detectaba y se tiraba en
// silencio. Ahora ambos quedan en metadata para que el ChatBubble los muestre.
// ──────────────────────────────────────────────────────────────────────────
describe('mergePostValidateMetadata (FIX 2 — surfacea hallucinated)', () => {
  const base = { tool_used: 'get_pest_controllers', grounded: true };

  test('pv null → devuelve base sin tocar (no advierte si no se pudo verificar)', () => {
    expect(mergePostValidateMetadata(base, null)).toEqual(base);
    expect(mergePostValidateMetadata(base, /** @type {any} */ (undefined))).toEqual(base);
  });

  test('age_available !== true → no confía en el veredicto, devuelve base intacto', () => {
    const pv = { hallucinated: ['Neolepidopteron daquila'], suspect: [], age_available: false };
    expect(mergePostValidateMetadata(base, pv)).toEqual(base);
  });

  test('FUGA CERRADA: hallucinated[] con un binomio inventado → hallucinated_names en metadata', () => {
    const pv = {
      hallucinated: ['Neolepidopteron daquila'],
      suspect: [],
      validated: [],
      age_available: true,
      detected_count: 1,
    };
    const md = /** @type {any} */ (mergePostValidateMetadata(base, /** @type {any} */ (pv)));
    expect(md.hallucinated_names).toEqual(['Neolepidopteron daquila']);
    // No pierde el metadata de fuente original.
    expect(md.tool_used).toBe('get_pest_controllers');
    expect(md.grounded).toBe(true);
  });

  test('suspect[] sigue surfaceándose (no regresión del badge previo)', () => {
    const pv = { hallucinated: [], suspect: ['Solanum lycopersicum'], age_available: true };
    const md = /** @type {any} */ (mergePostValidateMetadata(base, pv));
    expect(md.suspect_names).toEqual(['Solanum lycopersicum']);
    expect(md.hallucinated_names).toBeUndefined();
  });

  test('hallucinated Y suspect a la vez → ambos campos presentes', () => {
    const pv = {
      hallucinated: ['Neolepidopteron daquila'],
      suspect: ['Solanum lycopersicum'],
      age_available: true,
    };
    const md = /** @type {any} */ (mergePostValidateMetadata(base, pv));
    expect(md.hallucinated_names).toEqual(['Neolepidopteron daquila']);
    expect(md.suspect_names).toEqual(['Solanum lycopersicum']);
  });

  test('arrays vacíos → no añade campos (sin badge espurio)', () => {
    const pv = { hallucinated: [], suspect: [], age_available: true };
    const md = /** @type {any} */ (mergePostValidateMetadata(base, pv));
    expect(md.hallucinated_names).toBeUndefined();
    expect(md.suspect_names).toBeUndefined();
    expect(md).toEqual(base);
  });

  test('filtra entradas no-string / vacías del reporte del sidecar', () => {
    const pv = {
      hallucinated: ['Neolepidopteron daquila', '', '   ', null, 42],
      suspect: [],
      age_available: true,
    };
    const md = /** @type {any} */ (mergePostValidateMetadata(base, /** @type {any} */ (pv)));
    expect(md.hallucinated_names).toEqual(['Neolepidopteron daquila']);
  });

  test('no muta el objeto base recibido (puro)', () => {
    const original = { tool_used: 'get_species', grounded: true };
    const snapshot = { ...original };
    mergePostValidateMetadata(original, {
      hallucinated: ['X inventado'],
      suspect: [],
      age_available: true,
    });
    expect(original).toEqual(snapshot);
  });
});


describe('extractGroundingBadges (#18 fuente_url + #20 confianza)', () => {
  test('entrada no-array / vacía → {}', () => {
    expect(extractGroundingBadges(null)).toEqual({});
    expect(extractGroundingBadges(undefined)).toEqual({});
    expect(extractGroundingBadges([])).toEqual({});
    expect(extractGroundingBadges(/** @type {any} */ ('x'))).toEqual({});
  });

  test('biopreparado con fuente_url + fuente + confianza → surfacéa los tres', () => {
    const ents = [
      {
        mentioned: 'caldo bordelés',
        kind: 'biopreparado',
        nombre_comun: 'Caldo bordelés',
        fuente: 'Agrosavia / FAO',
        fuente_url: 'https://repository.agrosavia.co/bitstreams/abc/download',
        confianza: 'alta',
      },
    ];
    const out = extractGroundingBadges(ents);
    expect(out.fuente_url).toContain('agrosavia.co');
    expect(out.fuente).toBe('Agrosavia / FAO');
    expect(out.confianza).toBe('alta');
  });

  test('normaliza confianza con tildes/case y sinónimos', () => {
    expect(extractGroundingBadges([{ confianza: 'Alta' }]).confianza).toBe('alta');
    expect(extractGroundingBadges([{ confianza: 'MEDIA' }]).confianza).toBe('media');
    expect(extractGroundingBadges([{ confianza: 'baja' }]).confianza).toBe('baja');
    expect(extractGroundingBadges([{ confianza: 'verificada' }]).confianza).toBe('alta');
    expect(extractGroundingBadges([{ confianza: 'desconocida' }]).confianza).toBeUndefined();
  });

  test('elige la confianza MÁS ALTA del turno', () => {
    const ents = [
      { kind: 'species', confianza: 'baja' },
      { kind: 'biopreparado', confianza: 'alta' },
      { kind: 'biopreparado', confianza: 'media' },
    ];
    expect(extractGroundingBadges(ents).confianza).toBe('alta');
  });

  test('ignora fuente_url no http(s) (no inyecta link inseguro)', () => {
    const out = extractGroundingBadges([
      { fuente: 'X', fuente_url: 'javascript:alert(1)', confianza: 'media' },
    ]);
    expect(out.fuente_url).toBeUndefined();
    expect(out.fuente).toBeUndefined();
    expect(out.confianza).toBe('media');
  });

  test('prioriza la fuente_url del biopreparado sobre la de otra entidad', () => {
    const ents = [
      { kind: 'species', fuente: 'Wiki', fuente_url: 'https://es.wikipedia.org/x' },
      { kind: 'biopreparado', fuente: 'Agrosavia', fuente_url: 'https://agrosavia.co/y' },
    ];
    const out = extractGroundingBadges(ents);
    expect(out.fuente_url).toContain('agrosavia.co');
    expect(out.fuente).toBe('Agrosavia');
  });

  test('sin fuente_url ni confianza → {} (graceful, sin badge)', () => {
    expect(extractGroundingBadges([{ kind: 'species', nombre_comun: 'Lulo' }])).toEqual({});
  });

  // ──────────────────────────────────────────────────────────────────────
  // #356 + refinamiento 2026-06-03 — FUENTE → RECURSO CITADO, NUNCA homepage.
  // Una fuente con buscador (Agrosavia/ICA/Cenicafé/FAO/INVIMA) linkea a la
  // BÚSQUEDA del concepto de la entidad. Una fuente sin sección/buscador
  // (IDEAM/Open-Meteo/DANE) queda como TEXTO PLANO (fuente_texto:true), nunca
  // un link a la portada. El deep-link http(s) de la entidad siempre gana.
  // ──────────────────────────────────────────────────────────────────────
  describe('#356-refino — link al recurso citado o texto plano, nunca homepage', () => {
    test('biopreparado "Agrosavia" sin URL → búsqueda del concepto (NO la home del repo)', () => {
      const out = extractGroundingBadges([
        { kind: 'biopreparado', nombre_comun: 'Caldo bordelés', fuente: 'Agrosavia', confianza: 'alta' },
      ]);
      expect(out.fuente).toBe('Agrosavia');
      expect(out.fuente_url).toContain('agrosavia.co/search');
      expect(out.fuente_url).toContain('query=');
      expect(out.fuente_texto).toBeUndefined();
      expect(out.confianza).toBe('alta');
    });

    test('species citando ICA con nombre → búsqueda en ICA (no su home)', () => {
      const out = extractGroundingBadges([
        { kind: 'species', nombre_comun: 'Aguacate', fuente: 'ICA' },
      ]);
      expect(out.fuente).toBe('ICA');
      expect(out.fuente_url).toContain('ica.gov.co/buscador');
      expect(out.fuente_url).toContain('Aguacate');
    });

    test('prefiere el nombre CIENTÍFICO como término de búsqueda (más preciso)', () => {
      const out = extractGroundingBadges([
        { kind: 'species', nombre_comun: 'Lulo', nombre_cientifico: 'Solanum quitoense', fuente: 'Agrosavia' },
      ]);
      expect(out.fuente_url).toContain('Solanum');
    });

    test('fuente institucional sin sección/buscador (IDEAM) → TEXTO PLANO, sin URL', () => {
      const out = extractGroundingBadges([
        { kind: 'species', nombre_comun: 'Maíz', fuente: 'IDEAM' },
      ]);
      expect(out.fuente).toBe('IDEAM');
      expect(out.fuente_texto).toBe(true);
      expect(out.fuente_url).toBeUndefined();
    });

    test('fuente con buscador pero entidad SIN concepto → texto plano (no buscador vacío)', () => {
      const out = extractGroundingBadges([{ kind: 'biopreparado', fuente: 'Cenicafé' }]);
      expect(out.fuente).toBe('Cenicafé');
      expect(out.fuente_texto).toBe(true);
      expect(out.fuente_url).toBeUndefined();
    });

    test('un LINK de un turno posterior mejora el texto-plano provisional', () => {
      const out = extractGroundingBadges([
        { kind: 'species', fuente: 'IDEAM' }, // texto plano
        { kind: 'biopreparado', nombre_comun: 'Caldo bordelés', fuente: 'Agrosavia' }, // link
      ]);
      expect(out.fuente).toBe('Agrosavia');
      expect(out.fuente_url).toContain('agrosavia.co/search');
      expect(out.fuente_texto).toBeUndefined();
    });

    test('el deep-link http(s) de la entidad gana sobre la búsqueda', () => {
      const out = extractGroundingBadges([
        {
          kind: 'biopreparado',
          nombre_comun: 'Caldo bordelés',
          fuente: 'Agrosavia',
          fuente_url: 'https://repository.agrosavia.co/handle/123/ficha-real',
        },
      ]);
      expect(out.fuente_url).toBe('https://repository.agrosavia.co/handle/123/ficha-real');
    });

    test('fuente NO institucional sin URL → NO inventa link ni texto', () => {
      const out = extractGroundingBadges([
        { kind: 'species', nombre_comun: 'Lulo', fuente: 'apuntes de un taller' },
      ]);
      expect(out.fuente_url).toBeUndefined();
      expect(out.fuente_texto).toBeUndefined();
      expect(out.fuente).toBeUndefined();
    });

    test('fuente_url inseguro pero fuente institucional con buscador → cae a la búsqueda', () => {
      const out = extractGroundingBadges([
        { kind: 'biopreparado', nombre_comun: 'Caldo bordelés', fuente: 'Agrosavia', fuente_url: 'javascript:alert(1)' },
      ]);
      expect(out.fuente_url).toContain('agrosavia.co/search');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────
// #356 + refinamiento 2026-06-03 — fuente de un TOOL (no entidad). El clima
// viene de get_clima_ideam: IDEAM no expone un deep-link al pronóstico, así
// que la cita se presenta como TEXTO PLANO. Las fuentes con buscador linkean a
// la búsqueda del concepto del tool. NUNCA se linkea a una homepage.
// ────────────────────────────────────────────────────────────────────────
describe('deriveEvidenceSourceLink (#356-refino — recurso citado o texto plano)', () => {
  test('get_clima_ideam → TEXTO PLANO "Fuente: IDEAM" (no link a la home)', () => {
    const out = deriveEvidenceSourceLink({
      tool: 'get_clima_ideam',
      args: { municipio: 'Choachí' },
      result: { available: true, monthly_avg: 120 },
    });
    expect(out.fuente).toBe('IDEAM');
    expect(out.fuente_texto).toBe(true);
    expect(out.fuente_url).toBeUndefined();
  });

  test('result con sources[] institucional con buscador + concepto en args → búsqueda', () => {
    const out = deriveEvidenceSourceLink({
      tool: 'get_species',
      args: { name: 'lulo' },
      result: { found: true, sources: ['Agrosavia', 'Wikipedia'] },
    });
    expect(out.fuente).toBe('Agrosavia');
    expect(out.fuente_url).toContain('agrosavia.co/search');
    expect(out.fuente_url).toContain('lulo');
  });

  test('result.fuente_url deep-link válido gana', () => {
    const out = deriveEvidenceSourceLink({
      tool: 'get_species',
      result: { found: true, fuente: 'Agrosavia', fuente_url: 'https://repository.agrosavia.co/handle/x' },
    });
    expect(out.fuente_url).toBe('https://repository.agrosavia.co/handle/x');
  });

  test('tool sin fuente institucional ni sources → {}', () => {
    expect(deriveEvidenceSourceLink({ tool: 'get_companions', result: { companions: [] } })).toEqual({});
    expect(deriveEvidenceSourceLink(null)).toEqual({});
    expect(deriveEvidenceSourceLink({ tool: 'get_clima_ideam', result: { found: false } })).toEqual({});
  });

  test('array de evidences (tool_chain): un LINK gana sobre un texto-plano', () => {
    const out = deriveEvidenceSourceLink([
      { tool: 'get_clima_ideam', result: { available: true } }, // texto plano
      { tool: 'get_species', args: { name: 'lulo' }, result: { found: true, sources: ['Agrosavia'] } }, // link
    ]);
    expect(out.fuente_url).toContain('agrosavia.co');
  });

  test('array de evidences: si ninguna linkea pero hay institución de texto → texto plano', () => {
    const out = deriveEvidenceSourceLink([
      { tool: 'get_companions', result: { companions: [{ id: 'a' }] } },
      { tool: 'get_clima_ideam', result: { available: true } },
    ]);
    expect(out.fuente).toBe('IDEAM');
    expect(out.fuente_texto).toBe(true);
    expect(out.fuente_url).toBeUndefined();
  });
});
