/**
 * scripts/__tests__/fix-age-establishment-means-nativas-2026-07-09.test.mjs
 *
 * Cobertura del delta que corrige establishment_means para 3 nativas
 * neotropicales mal marcadas 'introducido' en chagra_kg (audit
 * AUDIT-RESTAURACION-GROUNDING-2026-07-09.md, hallazgo #3). Verifica que el
 * delta solo toca las 3 especies esperadas, usa MERGE...SET (nunca
 * CREATE/ON CREATE) y es idempotente.
 */
import { describe, it, expect } from 'vitest';

import { FIXES, buildStatements } from '../fix-age-establishment-means-nativas-2026-07-09.mjs';

describe('FIXES — alcance exacto del delta', () => {
  it('corrige exactamente las 3 especies del hallazgo #3, todas a nativo', () => {
    expect(FIXES.map((f) => f.id).sort()).toEqual([
      'cordia_alliodora',
      'enterolobium_cyclocarpum',
      'tabebuia_rosea',
    ]);
    for (const f of FIXES) expect(f.establishment_means).toBe('nativo');
  });
});

describe('buildStatements', () => {
  const stmts = buildStatements();

  it('emite exactamente un statement por especie', () => {
    expect(stmts).toHaveLength(FIXES.length);
  });

  it('nunca usa CREATE ni ON CREATE SET (solo MERGE + SET idempotente)', () => {
    for (const s of stmts) {
      expect(s).not.toMatch(/\bCREATE\s*\(/i);
      expect(s).not.toMatch(/ON CREATE/i);
    }
  });

  it('cada statement hace MERGE por id y SET solo establishment_means (no toca otros campos)', () => {
    for (const f of FIXES) {
      const s = stmts.find((st) => st.includes(`MERGE (n:Species {id: '${f.id}'})`));
      expect(s, `falta statement para ${f.id}`).toBeTruthy();
      expect(s).toContain("establishment_means: 'nativo'");
      // El delta es de un solo campo: no debe traer otras props (threat_status,
      // conservation_status, compatible_with...) que pisen lo ya cargado.
      expect(s).not.toContain('threat_status');
      expect(s).not.toContain('conservation_status');
      expect(s).not.toContain('compatible_with');
    }
  });

  it('corre contra el grafo chagra_kg', () => {
    for (const s of stmts) {
      expect(s).toContain("cypher('chagra_kg'");
    }
  });

  it('es idempotente: correrlo dos veces produce el mismo output', () => {
    expect(buildStatements()).toEqual(stmts);
  });
});
