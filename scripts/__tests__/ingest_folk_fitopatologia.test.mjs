/**
 * scripts/__tests__/ingest_folk_fitopatologia.test.mjs
 *
 * Guarda de la ingesta folk fitopatología → AGE.
 * No toca Postgres real; valida que el SQL idempotente mantenga:
 *   - un nodo FolkSymptom por término folk,
 *   - una arista FOLK_NAME_OF por mapeo,
 *   - ids únicos y mapeos explícitos para los términos documentados.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

// El SQL fuente es contenido curado que vive FUERA de este repo público.
// En CI (sin CHAGRA_AGE_ETNO_SQL) la suite hace skip; localmente, con el env
// apuntando al SQL curado, valida la estructura idempotente real.
const SQL_PATH = process.env.CHAGRA_AGE_ETNO_SQL || '';
const hasSql = Boolean(SQL_PATH) && existsSync(SQL_PATH);

function loadSql() {
  return readFileSync(SQL_PATH, 'utf8');
}

function extractIds(sql) {
  return [...sql.matchAll(/MERGE \(f:FolkSymptom \{id: '([^']+)'\}\)/g)].map((m) => m[1]);
}

function extractLabels(sql) {
  return [...sql.matchAll(/SET f\.label = '([^']+)'/g)].map((m) => m[1]);
}

function extractPestIds(sql) {
  return [...sql.matchAll(/MATCH \(p:Pest \{id: '([^']+)'\}\)/g)].map((m) => m[1]);
}

describe.skipIf(!hasSql)('ingest_folk_fitopatologia.sql — guarda estructural', () => {
  // Lazy: el cuerpo del describe corre en colección aunque los it() se salten.
  const sql = hasSql ? loadSql() : '';
  const ids = hasSql ? extractIds(sql) : [];
  const labels = hasSql ? extractLabels(sql) : [];
  const pestIds = hasSql ? extractPestIds(sql) : [];

  it('existe y tiene contenido útil', () => {
    expect(sql).toContain('FOLK_NAME_OF');
    expect(sql).toContain('FolkSymptom');
    expect(sql.length).toBeGreaterThan(1000);
  });

  it('mantiene ids únicos de FolkSymptom', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(9);
  });

  it('cubre los términos folk documentados en el SQL', () => {
    const labelSet = new Set(labels);
    for (const label of [
      'gota',
      'ojo de gallo',
      'candelilla',
      'monilia',
      'tizón',
      'tizón tardío',
      'mancha de hierro',
      'escoba de bruja',
      'se pudre la raíz',
      'mata triste-mustia',
    ]) {
      expect(labelSet.has(label), `falta el término ${label}`).toBe(true);
    }
  });

  it('cada bloque FolkSymptom tiene su arista FOLK_NAME_OF correspondiente', () => {
    const relationCount = (sql.match(/FOLK_NAME_OF/g) || []).length;
    expect(relationCount).toBeGreaterThanOrEqual(ids.length);
  });

  it('ancla a Pest canónicos existentes, no a aliases arbitrarios', () => {
    for (const pestId of [
      'phytophthora_infestans',
      'mycena_citricolor',
      'moniliophthora_roreri',
      'alternaria_solani',
      'cercospora_coffeicola',
      'moniliophthora_perniciosa',
      'rhizoctonia_solani',
      'ralstonia_solanacearum',
    ]) {
      expect(pestIds).toContain(pestId);
    }
  });
});
