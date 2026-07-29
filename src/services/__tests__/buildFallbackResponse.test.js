import { describe, it, expect } from 'vitest';
import { buildFallbackResponse } from '../agentService';

// Shapes de tools VERIFICADAS contra el sidecar 2026-07-18. Antes buildFallbackResponse
// chequeaba species_name/controls/recipes (stale) → nunca hacía match y todo caía en
// el genérico "obtuve información útil". Estos tests fijan las shapes reales.
const ev = (tool, result) => ({ tool, result });

describe('buildFallbackResponse', () => {
  it('passthrough: si el LLM respondió, devuelve su texto tal cual', () => {
    expect(buildFallbackResponse('respuesta real del LLM', null)).toBe('respuesta real del LLM');
  });

  it('get_species: extrae el nombre desde result.species (no species_name)', () => {
    const out = buildFallbackResponse('', ev('get_species', { found: true, species: { nombre_comun: 'Papa parda', viabilidad: 'viable' } }));
    expect(out).toContain('Papa parda');
    expect(out).toContain('viable');
  });

  it('get_pest_controllers: cuenta desde matches_count (no controls)', () => {
    const out = buildFallbackResponse('', ev('get_pest_controllers', { matches_count: 3, matches: [1, 2, 3] }));
    expect(out).toContain('3 control');
  });

  it('get_biopreparados: cuenta desde matches_count (no recipes)', () => {
    const out = buildFallbackResponse('', ev('get_biopreparados', { matches_count: 2, matches: [1, 2] }));
    expect(out).toContain('2 receta');
  });

  it('get_folk_sintoma: mapea el síntoma folk a su plaga', () => {
    const out = buildFallbackResponse('', ev('get_folk_sintoma', { query: 'gota', resultados: [{ sintoma_folk: 'gota', mapea_a: 'Phytophthora infestans' }] }));
    expect(out).toContain('gota');
    expect(out).toContain('Phytophthora infestans');
  });

  it('get_aporte_nutricional: arma la línea de nutrientes', () => {
    const out = buildFallbackResponse('', ev('get_aporte_nutricional', { nombre_comun: 'Papa', unidad: '100 g', nutrientes: { energia_kcal: 93, proteina_g: 1.9, hierro_mg: 1.1 } }));
    expect(out).toContain('93 kcal');
    expect(out).toContain('1.9 g proteína');
    expect(out).toContain('1.1 mg hierro');
  });

  it('get_suelo: reporta pH óptimo y corrección', () => {
    const out = buildFallbackResponse('', ev('get_suelo', { nombre_comun: 'Aguacate', ph_optimo: '5.5-6.5', correccion_suelo: 'encalado' }));
    expect(out).toContain('5.5-6.5');
    expect(out).toContain('encalado');
  });

  it('genérico: un tool sin caso propio igual reporta el conteo (no "información útil")', () => {
    const out = buildFallbackResponse('', ev('get_practicas_agua', { resultados_count: 5, resultados: [1, 2, 3, 4, 5] }));
    expect(out).toContain('5 resultado');
    expect(out).not.toContain('obtuve información útil');
  });

  it('tool no disponible: lo marca como fallo, no como dato', () => {
    const out = buildFallbackResponse('', ev('get_precio_sipsa', { available: false }));
    expect(out).toContain('No pude obtener datos');
  });

  it('sin toolEvidence pero con entidades: al menos dice qué mencionó', () => {
    const out = buildFallbackResponse('', null, [{ nombre_comun: 'lulo' }]);
    expect(out).toContain('lulo');
  });

  it('nada de nada: mensaje honesto sin inventar', () => {
    const out = buildFallbackResponse('', null, null);
    expect(out).toContain('No pude completar la consulta');
    expect(out).toContain('¿Quieres preguntar otra cosa?');
  });
});
