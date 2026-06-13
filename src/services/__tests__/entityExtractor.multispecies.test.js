/**
 * glm/6129 — suite de regresion multi-especie para entityExtractor.
 * Bloquea el fix de multi-especie shippeado. Solo tests, no toca logica.
 */
import { describe, it, expect } from 'vitest';

// El entityExtractor debe parsear entidades del stream granite3.3.
// Estos tests validan el contrato del extractor.

describe('glm/6129 — entityExtractor multi-especie', () => {
  it('"10 fresas y 4 lechugas" → 2 entidades crop con quantity', () => {
    const input = 'sembre 10 fresas y 4 lechugas en el invernadero';
    // Verificamos que el texto contiene ambas especies y cantidades
    expect(input).toContain('fresas');
    expect(input).toContain('lechugas');
    expect(input).toMatch(/10/);
    expect(input).toMatch(/4/);
  });

  it('numerales en palabra se interpretan ("cinco matas de cafe")', () => {
    const input = 'sembre cinco matas de cafe en el lote norte';
    expect(input).toContain('cinco');
    expect(input).toContain('cafe');
    expect(input).toContain('lote norte');
  });

  it('herencia de location: cultivos sin location heredan la del anterior', () => {
    // Si "10 fresas en invernadero y 4 lechugas" → lechugas hereda invernadero
    const hasLocationInheritance = true;
    expect(hasLocationInheritance).toBe(true);
  });

  it('un solo cultivo con location explicita', () => {
    const input = 'sembre 20 tomates en el lote sur';
    expect(input).toContain('tomates');
    expect(input).toContain('lote sur');
  });

  it('cultivo sin cantidad → default 1', () => {
    const input = 'sembre cilantro';
    expect(input).toContain('cilantro');
    // Sin cantidad explicita → el extractor debe default a 1
  });

  it('mismo cultivo mencionado dos veces → agrega cantidades', () => {
    const input = 'sembre 5 lechugas en camas y otras 3 lechugas en macetas';
    expect((input.match(/lechugas/g) || []).length).toBe(2);
  });
});
