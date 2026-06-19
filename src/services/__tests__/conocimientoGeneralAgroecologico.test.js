import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const KNOWLEDGE_JSON_PATH = join(__dirname, '../../../public/cycle-content/conocimiento_general_agroecologico.json');

describe('conocimiento_general_agroecologico.json', () => {
  it('debe ser un JSON válido con estructura correcta', () => {
    const json = JSON.parse(readFileSync(KNOWLEDGE_JSON_PATH, 'utf-8'));

    expect(json).toBeTruthy();
    expect(json.species_slug).toBe('conocimiento_general_agroecologico');
    expect(json.scientific_name).toBe('Conocimiento General Agroecológico');
    expect(json.category).toBe('conocimiento_general');
  });

  it('debe contener los 3 campos markdown requeridos', () => {
    const json = JSON.parse(readFileSync(KNOWLEDGE_JSON_PATH, 'utf-8'));

    expect(json.seguridad_biopreparados_markdown).toBeTruthy();
    expect(json.asociaciones_policultivos_markdown).toBeTruthy();
    expect(json.fenologia_ventanas_plaga_markdown).toBeTruthy();
  });

  it('los campos markdown deben tener contenido sustancial', () => {
    const json = JSON.parse(readFileSync(KNOWLEDGE_JSON_PATH, 'utf-8'));

    // Seguridad de biopreparados debe tener al menos 500 caracteres
    expect(json.seguridad_biopreparados_markdown.length).toBeGreaterThan(500);

    // Asociaciones de policultivos debe tener al menos 500 caracteres
    expect(json.asociaciones_policultivos_markdown.length).toBeGreaterThan(500);

    // Fenología y ventanas de plaga debe tener al menos 500 caracteres
    expect(json.fenologia_ventanas_plaga_markdown.length).toBeGreaterThan(500);
  });

  it('seguridad_biopreparados_markdown debe mencionar conceptos clave', () => {
    const json = JSON.parse(readFileSync(KNOWLEDGE_JSON_PATH, 'utf-8'));
    const content = json.seguridad_biopreparados_markdown.toLowerCase();

    // Debe mencionar conceptos clave de seguridad
    expect(content).toContain('bocashi');
    expect(content).toContain('carencia');
    expect(content).toContain('ica');
  });

  it('asociaciones_policultivos_markdown debe mencionar sistemas clave', () => {
    const json = JSON.parse(readFileSync(KNOWLEDGE_JSON_PATH, 'utf-8'));
    const content = json.asociaciones_policultivos_markdown.toLowerCase();

    // Debe mencionar los sistemas principales
    expect(content).toContain('milpa');
    expect(content).toContain('café');
    expect(content).toContain('cacao');
  });

  it('fenologia_ventanas_plaga_markdown debe mencionar cultivos clave', () => {
    const json = JSON.parse(readFileSync(KNOWLEDGE_JSON_PATH, 'utf-8'));
    const content = json.fenologia_ventanas_plaga_markdown.toLowerCase();

    // Debe mencionar los cultivos principales
    expect(content).toContain('tomate');
    expect(content).toContain('papa');
    expect(content).toContain('café');
    expect(content).toContain('fríjol');
    expect(content).toContain('bbch');
  });
});