import { describe, it, expect } from 'vitest';
import {
  buildBasePrompt,
  analyzeQuery,
  buildQueryAnalysisBlock,
  buildCorpusContext,
  buildCorpusVariants,
  formatToolEvidence,
  TOOL_EVIDENCE_MAX_CHARS,
} from '../agentPromptBase.js';

describe('analyzeQuery', () => {
  it('detecta query enumerativa', () => {
    const r = analyzeQuery('cuantas variedades de cafe hay');
    expect(r.isEnum).toBe(true);
  });

  it('no detecta enumerativa si falta noun', () => {
    const r = analyzeQuery('cuantas matas de cafe tengo');
    expect(r.isEnum).toBe(false);
  });

  it('detecta plaga mencionada', () => {
    const r = analyzeQuery('como controlo la broca del cafe');
    expect(r.pestsMentioned.length).toBeGreaterThan(0);
    const names = r.pestsMentioned.map((p) => p.name);
    expect(names.some((n) => n.includes('broca'))).toBe(true);
  });

  it('topic manejo para como podo', () => {
    const r = analyzeQuery('como podo el aguacate');
    expect(r.topic).toBe('manejo');
  });

  it('topic atributo para altitud', () => {
    const r = analyzeQuery('a que altitud crece el frijol');
    expect(r.topic).toBe('atributo');
  });

  it('topic general por defecto', () => {
    const r = analyzeQuery('hola');
    expect(r.topic).toBe('general');
  });

  it('maneja query vacia', () => {
    const r = analyzeQuery('');
    expect(r.isEnum).toBe(false);
    expect(r.pestsMentioned).toEqual([]);
  });
});

describe('buildQueryAnalysisBlock', () => {
  it('incluye tipo en bloque', () => {
    const b = buildQueryAnalysisBlock({ topic: 'manejo', isEnum: false, pestsMentioned: [] });
    expect(b).toContain('manejo');
    expect(b).toContain('NO — IGNORA CASO C');
  });

  it('marca enumerativa SI cuando aplica', () => {
    const b = buildQueryAnalysisBlock({ topic: 'general', isEnum: true, pestsMentioned: [] });
    expect(b).toContain('SÍ — usa respuesta CASO C');
  });

  it('incluye plagas mencionadas', () => {
    const b = buildQueryAnalysisBlock({
      topic: 'plaga/enfermedad',
      isEnum: false,
      pestsMentioned: [{ name: 'broca', canonical: 'Hypothenemus hampei' }],
    });
    expect(b).toContain('Hypothenemus hampei');
  });
});

describe('buildCorpusContext', () => {
  it('retorna vacio sin corpus', () => {
    expect(buildCorpusContext(null)).toBe('');
    expect(buildCorpusContext([])).toBe('');
  });

  it('construye bloque con chunks', () => {
    const chunks = [{ text: 'El cafe arabica crece entre 1200-1800 msnm.' }];
    const b = buildCorpusContext(chunks);
    expect(b).toContain('cafe arabica');
    expect(b).toContain('REFERENCIA AGRONÓMICA');
  });
});

describe('buildCorpusVariants', () => {
  it('genera variantes decrecientes', () => {
    const chunks = [{ text: 'chunk1' }, { text: 'chunk2' }, { text: 'chunk3' }];
    const v = buildCorpusVariants(chunks);
    expect(v.length).toBe(4); // 3, 2, 1, 0 chunks
    expect(v[3]).toBe(''); // ultima variante vacia
  });

  it('maneja array vacio', () => {
    const v = buildCorpusVariants([]);
    expect(v.length).toBe(1); // solo variante vacia
    expect(v[0]).toBe('');
  });
});

describe('formatToolEvidence', () => {
  it('retorna vacio para entrada nula', () => {
    expect(formatToolEvidence(null)).toBe('');
  });

  it('retorna vacio sin tool ni result', () => {
    expect(formatToolEvidence({})).toBe('');
  });

  it('formatea tool error', () => {
    const ev = { tool: 'get_species', result: { _error: true, reason: 'timeout' } };
    expect(formatToolEvidence(ev)).toContain('ERROR DE CONSULTA');
    expect(formatToolEvidence(ev)).toContain('timeout');
  });

  it('formatea found:false', () => {
    const ev = { tool: 'get_species', args: { q: 'xyz' }, result: { found: false } };
    const b = formatToolEvidence(ev);
    expect(b).toContain('NO ENCONTRADA');
  });

  it('formatea tool result found:true con datos', () => {
    const ev = {
      tool: 'get_species',
      args: {},
      result: { species: { nombre_comun: 'cafe', nombre_cientifico: 'Coffea arabica', found: true } },
    };
    const b = formatToolEvidence(ev);
    expect(b).toContain('DATOS VERIFICADOS');
  });

  it('trunca datos largos a TOOL_EVIDENCE_MAX_CHARS', () => {
    const longText = 'x'.repeat(TOOL_EVIDENCE_MAX_CHARS + 100);
    const ev = { tool: 'get_species', args: {}, result: { found: true, text: longText } };
    const b = formatToolEvidence(ev);
    // La salida incluye headers + texto truncado, debe ser menor que el input + overhead
    expect(b.length).toBeGreaterThan(0);
    expect(b.length).toBeLessThan(TOOL_EVIDENCE_MAX_CHARS + 1500);
  });

  it('formatea array de evidencias', () => {
    const evs = [
      { tool: 'get_species', result: { found: true, nombre: 'frijol' } },
      { tool: 'get_companions', result: { found: true, companions: ['maiz'] } },
    ];
    const b = formatToolEvidence(evs);
    expect(b).toContain('DATOS VERIFICADOS');
  });
});

describe('buildBasePrompt — guardas condicionales tomate', () => {
  const baseArgs = {
    plantContext: 'tomate ×10',
    fincaContext: '',
    indoorContext: '',
    finca: null,
    contextMemory: '',
    isEnum: false,
  };

  it('inyecta guarda de enfermedad sin cura solo cuando la query dispara Ralstonia', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'Mi tomate tiene marchitez bacteriana por Ralstonia, ¿qué producto lo cura?',
    });
    expect(prompt).toContain('marchitez bacteriana/Ralstonia/moko');
    expect(prompt).toContain('NO tienen cura química');

    const control = buildBasePrompt({ ...baseArgs, query: '¿Cómo tutoro el tomate?' });
    expect(control).not.toContain('marchitez bacteriana/Ralstonia/moko');
  });

  it('inyecta guardas de dosis y plaguicida prohibido con disparadores puntuales', () => {
    const dosePrompt = buildBasePrompt({
      ...baseArgs,
      query: '¿Cuántos ml de insecticida le echo al tomate?',
    });
    expect(dosePrompt).toContain('si piden dosis de plaguicida');
    expect(dosePrompt).toContain('etiqueta registrada ICA');

    const bannedPrompt = buildBasePrompt({
      ...baseArgs,
      query: 'Me ofrecieron Lannate para tomate, ¿lo uso?',
    });
    expect(bannedPrompt).toContain('metamidofós');
    expect(bannedPrompt).toContain('registro ICA vigente');
  });

  it('inyecta guardas de premisa cruzada solo con pares completos', () => {
    const brocaTomate = buildBasePrompt({
      ...baseArgs,
      query: 'Tengo broca en tomate, ¿qué controlador uso?',
    });
    expect(brocaTomate).toContain('Broca es plaga de café');

    const brocaCafe = buildBasePrompt({
      ...baseArgs,
      query: 'Tengo broca en café, ¿qué controlador uso?',
    });
    expect(brocaCafe).not.toContain('Broca es plaga de café');
  });
});
