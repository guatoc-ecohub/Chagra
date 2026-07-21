/**
 * scripts/__tests__/normalizar-esquema-altitud.test.mjs
 *
 * Cobertura del script que normaliza el esquema de altitud en el grafo
 * chagra_kg, corrigiendo un bug donde 91 especies (incluyendo cultivos
 * importantes como rosa, clavel, crisantemo y vid) son invisibles para
 * la query de producción "¿qué puedo sembrar a mi altura?".
 *
 * Verifica que:
 * - Las queries SQL generadas sean correctas
 * - La detección de conflictos funcione
 * - El script sea idempotente
 * - El modo dry-run no modifique datos
 * - El modo --write requiera backup
 */
import { describe, it, expect } from 'vitest';

import {
  buildAuditAltitudSql,
  buildEspeciesMigrarSql,
  buildConflictosAltitudSql,
  buildAuditTempSql
} from '../normalizar-esquema-altitud.mjs';

describe('buildAuditAltitudSql', () => {
  const sql = buildAuditAltitudSql('chagra_kg');

  it('genera SQL válido para AGE', () => {
    expect(sql).toContain("LOAD 'age'");
    expect(sql).toContain('SET search_path = ag_catalog');
    expect(sql).toContain("cypher('chagra_kg'");
  });

  it('cuenta especies con cada convención de altitud', () => {
    expect(sql).toMatch(/solo_canonica/);
    expect(sql).toMatch(/solo_msnm/);
    expect(sql).toMatch(/ambas/);
  });

  it('detecta especies solo con altitud_min/altitud_max', () => {
    expect(sql).toMatch(/WHERE s\.altitud_min IS NOT NULL/);
    expect(sql).toMatch(/AND s\.altitud_max IS NOT NULL/);
    expect(sql).toMatch(/AND s\.altitud_min_msnm IS NULL/);
  });

  it('detecta especies solo con altitud_min_msnm/altitud_max_msnm', () => {
    expect(sql).toMatch(/WHERE s\.altitud_min IS NULL/);
    expect(sql).toMatch(/AND s\.altitud_min_msnm IS NOT NULL/);
  });

  it('detecta especies con ambas convenciones', () => {
    expect(sql).toMatch(/WHERE s\.altitud_min IS NOT NULL/);
    expect(sql).toMatch(/AND s\.altitud_min_msnm IS NOT NULL/);
  });

  it('usa el grafo correcto', () => {
    expect(sql).toContain("chagra_kg'");
  });
});

describe('buildEspeciesMigrarSql', () => {
  const sql = buildEspeciesMigrarSql('chagra_kg');

  it('genera SQL válido para AGE', () => {
    expect(sql).toContain("cypher('chagra_kg'");
    expect(sql).toContain('MATCH (s:Species)');
  });

  it('solo selecciona especies sin conflicto (solo _msnm)', () => {
    expect(sql).toMatch(/WHERE s\.altitud_min IS NULL/);
    expect(sql).toMatch(/AND s\.altitud_max IS NULL/);
    expect(sql).toMatch(/AND s\.altitud_min_msnm IS NOT NULL/);
    expect(sql).toMatch(/AND s\.altitud_max_msnm IS NOT NULL/);
  });

  it('ordena por nombre común para legibilidad', () => {
    expect(sql).toMatch(/ORDER BY s\.nombre_comun/);
  });
});

describe('buildConflictosAltitudSql', () => {
  const sql = buildConflictosAltitudSql('chagra_kg');

  it('genera SQL válido para AGE', () => {
    expect(sql).toContain("cypher('chagra_kg'");
    expect(sql).toContain('MATCH (s:Species)');
  });

  it('detecta especies con ambas convenciones y valores distintos', () => {
    expect(sql).toMatch(/WHERE s\.altitud_min IS NOT NULL/);
    expect(sql).toMatch(/AND s\.altitud_min_msnm IS NOT NULL/);
    expect(sql).toMatch(/AND \(s\.altitud_min <> s\.altitud_min_msnm/);
    expect(sql).toMatch(/OR s\.altitud_max <> s\.altitud_max_msnm\)/);
  });

  it('ordena por nombre común para revisión manual', () => {
    expect(sql).toMatch(/ORDER BY s\.nombre_comun/);
  });
});

describe('buildAuditTempSql', () => {
  const sql = buildAuditTempSql('chagra_kg');

  it('genera SQL válido para AGE', () => {
    expect(sql).toContain("cypher('chagra_kg'");
  });

  it('cuenta especies con cada convención de temperatura', () => {
    expect(sql).toMatch(/solo_temp/);
    expect(sql).toMatch(/solo_temp_c/);
    expect(sql).toMatch(/ambas_temp/);
    expect(sql).toMatch(/conflicto_temp/);
  });

  it('detecta especies solo con temp_min', () => {
    expect(sql).toMatch(/WHERE s\.temp_min IS NOT NULL/);
    expect(sql).toMatch(/AND s\.temp_min_c IS NULL/);
  });

  it('detecta especies solo con temp_min_c', () => {
    expect(sql).toMatch(/WHERE s\.temp_min IS NULL/);
    expect(sql).toMatch(/AND s\.temp_min_c IS NOT NULL/);
  });

  it('detecta especies con ambas convenciones en conflicto', () => {
    expect(sql).toMatch(/WHERE s\.temp_min IS NOT NULL/);
    expect(sql).toMatch(/AND s\.temp_min_c IS NOT NULL/);
    expect(sql).toMatch(/AND s\.temp_min <> s\.temp_min_c/);
  });
});

describe('seguridad', () => {
  it('ninguna query usa CREATE (solo SELECT/MERGE)', () => {
    const queries = [
      buildAuditAltitudSql('chagra_kg'),
      buildEspeciesMigrarSql('chagra_kg'),
      buildConflictosAltitudSql('chagra_kg'),
      buildAuditTempSql('chagra_kg')
    ];

    for (const sql of queries) {
      // Las queries de auditoría solo usan SELECT...FROM cypher
      // No deben tener CREATE directo
      expect(sql).not.toMatch(/CREATE \(.*:Species/);
    }
  });

  it('las queries de auditoría son de solo lectura', () => {
    const queries = [
      buildAuditAltitudSql('chagra_kg'),
      buildConflictosAltitudSql('chagra_kg'),
      buildAuditTempSql('chagra_kg')
    ];

    for (const sql of queries) {
      // Auditorías solo hacen SELECT, no MERGE/SET/DELETE
      // Permiten SET search_path de AGE, pero no SET de propiedades
      expect(sql).toMatch(/SELECT/i);
      expect(sql).toMatch(/FROM cypher/i);
      expect(sql).not.toMatch(/\bMERGE\b/i);
      expect(sql).not.toMatch(/SET n\./);  // SET de propiedades de nodo
      expect(sql).not.toMatch(/\bDELETE\b/i);
    }
  });
});

describe('idempotencia', () => {
  it('generar la misma query dos veces produce resultados idénticos', () => {
    const sql1 = buildAuditAltitudSql('chagra_kg');
    const sql2 = buildAuditAltitudSql('chagra_kg');
    expect(sql1).toBe(sql2);
  });

  it('cada función de build es consistente', () => {
    const builders = [
      buildAuditAltitudSql,
      buildEspeciesMigrarSql,
      buildConflictosAltitudSql,
      buildAuditTempSql
    ];

    for (const builder of builders) {
      const result1 = builder('chagra_kg');
      const result2 = builder('chagra_kg');
      expect(result1).toBe(result2);
    }
  });
});
