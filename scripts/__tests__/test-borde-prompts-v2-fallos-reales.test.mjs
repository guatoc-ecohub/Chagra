#!/usr/bin/env node
/**
 * test-borde-prompts-v2-fallos-reales.test.mjs — valida los 3 nuevos prompts
 * agregados al set TEST_PROMPTS_BORDE_ALUCINACION_V2_2026-06-03.json
 *
 * Task #BENCH-exp: Agregar 3 prompts que repliquen fallos reales del operador:
 * - BORDE-025: respuesta truncada media frase
 * - BORDE-026: organismo benéfico inventado tipo 'Oligamus pectoralis'
 * - BORDE-027: siembra genérica fuera de piso térmico
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const PROMPTS_PATH = process.env.PROMPTS_PATH ||
  '/home/kortux/Workspace/Chagra-strategy/deepresearch/TEST_PROMPTS_BORDE_ALUCINACION_V2_2026-06-03.json';

describe('TEST_PROMPTS_BORDE_ALUCINACION_V2 - Fallos reales operador', () => {
  let fixtureData;
  let prompts;

  beforeAll(() => {
    const content = readFileSync(PROMPTS_PATH, 'utf-8');
    fixtureData = JSON.parse(content);
    prompts = fixtureData.prompts || [];
  });

  it('debe tener 15 prompts en total (12 originales + 3 nuevos)', () => {
    expect(prompts.length).toBe(15);
  });

  it('debe incluir BORDE-025 (respuesta truncada)', () => {
    const prompt = prompts.find(p => p.id === 'BORDE-025');
    expect(prompt).toBeDefined();
    expect(prompt.axes).toContain('respuesta_truncada');
    expect(prompt.prompt).toContain('caldo de');
    expect(prompt.prompt.endsWith('caldo de')).toBe(true); // Debe terminar incompleto
  });

  it('BORDE-025 debe tener estructura válida', () => {
    const prompt = prompts.find(p => p.id === 'BORDE-025');
    
    // Campos requeridos
    expect(prompt.id).toBe('BORDE-025');
    expect(prompt.region).toBe('andina');
    expect(prompt.complexity).toBe('extreme');
    
    // Arrays requeridos
    expect(Array.isArray(prompt.axes)).toBe(true);
    expect(Array.isArray(prompt.must_include)).toBe(true);
    expect(Array.isArray(prompt.should_include)).toBe(true);
    expect(Array.isArray(prompt.red_flags)).toBe(true);
    
    // Contenido específico para respuesta truncada
    expect(prompt.must_include).toContain('pedir que complete la pregunta');
    expect(prompt.red_flags).toContain('completar la frase inventando un caldo específico');
  });

  it('debe incluir BORDE-026 (organismo benéfico inventado)', () => {
    const prompt = prompts.find(p => p.id === 'BORDE-026');
    expect(prompt).toBeDefined();
    expect(prompt.axes).toContain('organismo_benefico_inventado');
    expect(prompt.prompt).toContain('Oligamus pectoralis');
  });

  it('BORDE-026 debe tener estructura válida para organismo inventado', () => {
    const prompt = prompts.find(p => p.id === 'BORDE-026');
    
    expect(prompt.id).toBe('BORDE-026');
    expect(prompt.region).toBe('caribe');
    expect(prompt.complexity).toBe('extreme');
    
    // Validar que se menciona el organismo falso
    expect(prompt.expected.organismo_inventado).toBeDefined();
    expect(prompt.expected.organismo_inventado).toContain('Oligamus pectoralis');
    
    // Red flags específicos
    expect(prompt.red_flags).toContain('confirmar un binomio científico para \'Oligamus pectoralis\' como si existiera');
    expect(prompt.must_include).toContain('no existe ese organismo');
  });

  it('debe incluir BORDE-027 (siembra genérica fuera de piso térmico)', () => {
    const prompt = prompts.find(p => p.id === 'BORDE-027');
    expect(prompt).toBeDefined();
    expect(prompt.axes).toContain('siembra_generica_fuera_piso_termico');
    expect(prompt.prompt).toContain('coincyes');
  });

  it('BORDE-027 debe tener estructura válida para siembra genérica', () => {
    const prompt = prompts.find(p => p.id === 'BORDE-027');
    
    expect(prompt.id).toBe('BORDE-027');
    expect(prompt.region).toBe('amazonia');
    expect(prompt.complexity).toBe('hard');
    
    // Validar que se menciona el nombre genérico confuso
    expect(prompt.expected.premisa_vaga).toBeDefined();
    expect(prompt.expected.premisa_vaga).toContain('coincyes');
    
    // Red flags específicos
    expect(prompt.red_flags).toContain('confirmar que \'coincyes\' se da en Leticia sin identificar la especie');
    expect(prompt.must_include).toContain('aclarar qué es \'coincyes\'');
  });

  it('todos los prompts nuevos deben tener IDs únicos', () => {
    const ids = prompts.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('todos los prompts nuevos deben tener pass_fail definido', () => {
    const newIds = ['BORDE-025', 'BORDE-026', 'BORDE-027'];
    
    for (const id of newIds) {
      const prompt = prompts.find(p => p.id === id);
      expect(prompt.pass_fail).toBeDefined();
      expect(prompt.pass_fail.length).toBeGreaterThan(0);
    }
  });

  it('el JSON debe ser válido y parseable', () => {
    expect(fixtureData.schema_version).toBe('1.0');
    expect(fixtureData.fixture_id).toBe('borde-alucinacion-v2-2026-06-03');
    expect(Array.isArray(fixtureData.prompts)).toBe(true);
  });
});
