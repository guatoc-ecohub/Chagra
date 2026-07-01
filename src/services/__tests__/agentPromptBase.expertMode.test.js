/**
 * agentPromptBase.expertMode.test.js — tests del MODO EXPERTO estructurado
 *
 * Verifica que buildModoExpertoBlock y buildSourceFooter funcionen
 * correctamente en el contexto combinado (selector 3-modos + experto
 * estructurado).
 */

import { describe, it, expect } from 'vitest';
import {
  buildModoExpertoBlock,
  buildSourceFooter,
  buildResponseModeBlock,
} from '../agentPromptBase.js';

describe('buildModoExpertoBlock', () => {
  it('retorna string vacío cuando nivelRespuestas NO es "detallado"', () => {
    const block = buildModoExpertoBlock({ nivelRespuestas: 'simple', hasGrounding: false });
    expect(block).toBe('');
  });

  it('retorna string vacío cuando nivelRespuestas es null/undefined', () => {
    expect(buildModoExpertoBlock({ nivelRespuestas: null, hasGrounding: false })).toBe('');
    expect(buildModoExpertoBlock({ nivelRespuestas: undefined, hasGrounding: false })).toBe('');
    expect(buildModoExpertoBlock({ hasGrounding: false })).toBe('');
  });

  it('INYECTA bloque completo con nivel "detallado" CON grounding', () => {
    const block = buildModoExpertoBlock({ nivelRespuestas: 'detallado', hasGrounding: true });

    expect(block).toContain('=== MODO EXPERTO ===');
    expect(block).toContain('=== FIN ===');
    expect(block).toContain('CONTRATO CITA:');
    expect(block).toContain('científico exacto');
    expect(block).toContain('dosis con unidad');
    expect(block).toContain('mecanismo de acción');
    expect(block).toContain('piso térmico');
    expect(block).toContain('ENTIDADES RESUELTAS');
    expect(block).toContain('DATOS VERIFICADOS');
  });

  it('INYECTA bloque SIN grounding cuando nivel es "detallado" pero hasGrounding es false', () => {
    const block = buildModoExpertoBlock({ nivelRespuestas: 'detallado', hasGrounding: false });

    expect(block).toContain('=== MODO EXPERTO ===');
    expect(block).toContain('CONTRATO TÉCNICO:');
    expect(block).toContain('profundiza');
    expect(block).not.toContain('CONTRATO CITA:');
  });

  it('incluye prohibiciones de modo experto', () => {
    const block = buildModoExpertoBlock({ nivelRespuestas: 'detallado', hasGrounding: true });

    expect(block).toContain('PROHIBICIONES:');
    expect(block).toContain('NO uses técnica para disimular incertidumbre');
    expect(block).toContain('NO inventes dosis');
    expect(block).toContain('NO mezcles datos de especies');
  });

  it('incluye instrucción de respuesta honesta', () => {
    const block = buildModoExpertoBlock({ nivelRespuestas: 'detallado', hasGrounding: true });

    expect(block).toContain('RESPUESTA:');
    expect(block).toContain('preciso, citado');
    expect(block).toContain('honesto cuando no la haya');
  });
});

describe('buildSourceFooter', () => {
  const fixtures = {
    toolSpecies: { tool: 'get_species' },
    toolCompanions: { tool: 'get_companions' },
    toolPestControllers: { tool: 'get_pest_controllers' },
    toolBiopreparados: { tool: 'get_biopreparados' },
    toolNormativa: { tool: 'get_normativa_ica' },
    toolClima: { tool: 'get_clima_ideam' },
    toolPrecio: { tool: 'get_precio_sipsa' },
    toolMultihop: { tool: 'get_multihop_companions' },
    toolVisual: { tool: 'validate_visual_match' },
    toolTaxonomy: { tool: 'validate_taxonomy' },
    entityCafe: { mentioned: 'café', kind: 'species', nombre_comun: 'Café' },
  };

  it('retorna string vacío sin fuentes', () => {
    expect(buildSourceFooter({})).toBe('');
    expect(buildSourceFooter({ toolEvidence: null, resolvedEntities: null, hasCorpus: false })).toBe('');
  });

  it('mapea get_species al fuente correcta', () => {
    const footer = buildSourceFooter({ toolEvidence: [fixtures.toolSpecies] });
    expect(footer).toContain('Catálogo Chagra (Apache AGE)');
  });

  it('mapea get_pest_controllers al fuente correcta', () => {
    const footer = buildSourceFooter({ toolEvidence: [fixtures.toolPestControllers] });
    expect(footer).toContain('Grafo AGE (relaciones plagas-controles)');
  });

  it('mapea get_biopreparados al fuente correcta', () => {
    const footer = buildSourceFooter({ toolEvidence: [fixtures.toolBiopreparados] });
    expect(footer).toContain('Catálogo chagra-pro (biopreparados)');
  });

  it('mapea get_normativa_ica al fuente correcta', () => {
    const footer = buildSourceFooter({ toolEvidence: [fixtures.toolNormativa] });
    expect(footer).toContain('ICA (registro de agroquímicos)');
  });

  it('mapea get_clima_ideam al fuente correcta', () => {
    const footer = buildSourceFooter({ toolEvidence: [fixtures.toolClima] });
    expect(footer).toContain('IDEAM (estaciones climáticas)');
  });

  it('mapea get_precio_sipsa al fuente correcta', () => {
    const footer = buildSourceFooter({ toolEvidence: [fixtures.toolPrecio] });
    expect(footer).toContain('SIPSA/DANE (precios mayoristas)');
  });

  it('combina múltiples fuentes correctamente', () => {
    const footer = buildSourceFooter({
      toolEvidence: [fixtures.toolSpecies, fixtures.toolPestControllers, fixtures.toolClima],
    });

    expect(footer).toContain('Catálogo Chagra (Apache AGE)');
    expect(footer).toContain('Grafo AGE (relaciones plagas-controles)');
    expect(footer).toContain('IDEAM (estaciones climáticas)');
    expect(footer).toMatch(/ \+ /);
  });

  it('NO duplica fuentes que se mapean a la misma fuente', () => {
    const footer = buildSourceFooter({
      toolEvidence: [fixtures.toolSpecies, fixtures.toolCompanions],
    });

    const matches = footer.match(/Catálogo Chagra \(Apache AGE\)/g);
    expect(matches ? matches.length : 0).toBe(1);
  });

  it('incluye corpus RAG cuando hasCorpus es true', () => {
    const footer = buildSourceFooter({
      toolEvidence: [fixtures.toolSpecies],
      hasCorpus: true,
    });

    expect(footer).toContain('Corpus agronómico regional');
  });

  it('incluye fuente de entidades resueltas', () => {
    const footer = buildSourceFooter({
      resolvedEntities: [fixtures.entityCafe],
    });

    expect(footer).toContain('Catálogo Chagra (Apache AGE)');
  });

  it('incluye todas las fuentes (tools + entidades + corpus)', () => {
    const footer = buildSourceFooter({
      toolEvidence: [fixtures.toolPestControllers, fixtures.toolClima],
      resolvedEntities: [fixtures.entityCafe],
      hasCorpus: true,
    });

    expect(footer).toContain('Grafo AGE (relaciones plagas-controles)');
    expect(footer).toContain('IDEAM (estaciones climáticas)');
    expect(footer).toContain('Catálogo Chagra (Apache AGE)');
    expect(footer).toContain('Corpus agronómico regional');
  });

  it('tiene formato correcto con separador', () => {
    const footer = buildSourceFooter({
      toolEvidence: [fixtures.toolSpecies],
    });

    expect(footer).toMatch(/^\n\n---\n\nFuentes:/);
  });

  it('maneja tools desconocidos sin crash', () => {
    const footer = buildSourceFooter({
      toolEvidence: [{ tool: 'tool_desconocido_que_no_existe' }],
    });

    expect(footer).toBe('');
  });

  it('maneja array vacío de tools', () => {
    const footer = buildSourceFooter({
      toolEvidence: [],
    });

    expect(footer).toBe('');
  });

  it('maneja array vacío de entidades', () => {
    const footer = buildSourceFooter({
      resolvedEntities: [],
    });

    expect(footer).toBe('');
  });
});

describe('integración buildResponseModeBlock con experto estructurado', () => {
  it('buildResponseModeBlock("detallado") devuelve el bloque estructurado', () => {
    const block = buildResponseModeBlock('detallado');
    expect(block).toContain('MODO EXPERTO');
    expect(block).toContain('CONTRATO TÉCNICO');
  });

  it('buildResponseModeBlock("detallado", true) devuelve CONTRATO CITA', () => {
    const block = buildResponseModeBlock('detallado', true);
    expect(block).toContain('CONTRATO CITA:');
  });

  it('buildResponseModeBlock("simple") NO devuelve MODO EXPERTO', () => {
    const block = buildResponseModeBlock('simple');
    expect(block).not.toContain('MODO EXPERTO');
  });

  it('buildResponseModeBlock("maestro") NO devuelve MODO EXPERTO', () => {
    const block = buildResponseModeBlock('maestro');
    expect(block).not.toContain('MODO EXPERTO');
  });
});
