import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { buildPreflightSummary, extractFolkMappings } from '../age-etno-preflight.mjs';

// El SQL fuente es contenido curado que vive FUERA de este repo público.
// En CI (sin CHAGRA_AGE_ETNO_SQL) estos casos hacen skip; localmente, con el env
// apuntando al SQL curado, validan el paquete real.
const SQL_PATH = process.env.CHAGRA_AGE_ETNO_SQL || '';
const hasSql = Boolean(SQL_PATH) && existsSync(SQL_PATH);

describe.skipIf(!hasSql)('age-etno-preflight', () => {
  // Lazy: el cuerpo del describe corre en colección aunque los it() se salten;
  // sin este guard, el readFileSync eager rompería la colección en CI sin env.
  const sql = hasSql ? readFileSync(SQL_PATH, 'utf8') : '';
  const mappings = hasSql ? extractFolkMappings(sql) : [];
  const summary = hasSql ? buildPreflightSummary() : {};

  it('extrae los 9 mapeos folk↔Pest del SQL fuente', () => {
    expect(mappings).toHaveLength(10);
    expect(mappings.map((m) => m.label)).toContain('gota');
    expect(mappings.map((m) => m.pestId)).toContain('ralstonia_solanacearum');
  });

  it('resume el preflight con léxico listo y mapeos cerrados', () => {
    expect(summary.lexicoKind).toBe('chagra-lexico-campesino');
    expect(summary.lexicoEntries).toBe(39);
    expect(summary.mappingCount).toBe(10);
    expect(summary.missingLabels).toEqual([]);
    expect(summary.missingPests).toEqual([]);
    expect(summary.ready).toBe(true);
  });
});
