/**
 * scripts/__tests__/bench-pool-gen.test.mjs
 *
 * Runbook nocturno 2026-06-02/03 (P1/T1) — el generador del pool de capacidades
 * del bench A-vs-C tenía DOS defectos:
 *
 *   1) Conexión al grafo vía `sudo podman exec postgres-farm psql …`, ROTA en
 *      alpha (passwd del container corrupto, INFRA_FACTS 2026-06-02). Debe ser
 *      TCP 127.0.0.1:5432, envuelto en nix-shell en NixOS, con la password por
 *      PGPASSWORD en el ENTORNO (no en la línea de comando).
 *
 *   2) `must_include` pedía la FUENTE institucional ("FAO"/"Agrosavia"/"Restrepo
 *      Rivera") VERBATIM como token obligatorio → hundía falsamente a config A y
 *      no mide alucinación. El must_include graph-faithful debe exigir SOLO
 *      hechos cuantitativos (nombre canónico + fragmento de la dosis verificada).
 *
 * Esta cobertura prueba las funciones puras sin GPU ni grafo.
 */
import { describe, it, expect } from 'vitest';
import {
  buildPsqlCommand,
  psqlOptsFromEnv,
  buildCypherSql,
  parsePsqlRows,
  doseFact,
  sourceHint,
  doseMustInclude,
  doseRedFlags,
} from '../lib/bench-pool-gen.mjs';

describe('buildPsqlCommand — conexión TCP (NO podman exec)', () => {
  it('usa TCP 127.0.0.1:5432 por defecto y NUNCA podman exec', () => {
    const { cmd } = buildPsqlCommand();
    expect(cmd).toContain('-h 127.0.0.1');
    expect(cmd).toContain('-p 5432');
    expect(cmd).toContain('-U farmos');
    expect(cmd).toContain('-d chagra_kg');
    expect(cmd).not.toMatch(/podman\s+exec/);
  });

  it('lee SQL por STDIN (-f -) para no romper el dollar-quoting de Cypher', () => {
    const { cmd } = buildPsqlCommand();
    expect(cmd).toContain('-f -');
  });

  it('envuelve psql en nix-shell por defecto (host NixOS sin psql en PATH)', () => {
    const { cmd } = buildPsqlCommand();
    expect(cmd).toContain('nix-shell -p postgresql --run');
  });

  it('permite desactivar el wrapper con wrapper:"" (CI con psql instalado)', () => {
    const { cmd } = buildPsqlCommand({ wrapper: '' });
    expect(cmd).not.toContain('nix-shell');
    expect(cmd.startsWith('psql ')).toBe(true);
  });

  it('inyecta la password por PGPASSWORD en el ENTORNO, no en la línea de comando', () => {
    const { cmd, env } = buildPsqlCommand({ password: 'changeme' });
    expect(env.PGPASSWORD).toBe('changeme');
    expect(cmd).not.toContain('changeme');
  });

  it('respeta overrides de host/port/user/db', () => {
    const { cmd } = buildPsqlCommand({ host: 'db.local', port: 6543, user: 'u', db: 'g' });
    expect(cmd).toContain('-h db.local');
    expect(cmd).toContain('-p 6543');
    expect(cmd).toContain('-U u');
    expect(cmd).toContain('-d g');
  });
});

describe('psqlOptsFromEnv', () => {
  it('mapea las env *_KG cuando están presentes', () => {
    const opts = psqlOptsFromEnv({
      PGHOST_KG: 'h',
      PGPORT_KG: '999',
      PGUSER_KG: 'usr',
      PGDATABASE_KG: 'dbx',
      PGPASSWORD_KG: 'pw',
    });
    expect(opts).toMatchObject({ host: 'h', port: '999', user: 'usr', db: 'dbx', password: 'pw' });
  });

  it('PSQL_WRAPPER="" se propaga (desactiva el wrapper) pero ausente NO', () => {
    expect(psqlOptsFromEnv({ PSQL_WRAPPER: '' })).toHaveProperty('wrapper', '');
    expect(psqlOptsFromEnv({})).not.toHaveProperty('wrapper');
  });

  it('devuelve {} cuando no hay env relevante', () => {
    expect(psqlOptsFromEnv({ FOO: 'bar' })).toEqual({});
  });
});

describe('buildCypherSql + parsePsqlRows', () => {
  it('envuelve el MATCH/RETURN con LOAD age + search_path + cypher()', () => {
    const sql = buildCypherSql('chagra_kg', 'MATCH (b:Biopreparado) RETURN properties(b)');
    expect(sql).toContain("LOAD 'age'");
    expect(sql).toContain('SET search_path = ag_catalog, public');
    expect(sql).toContain("cypher('chagra_kg'");
    expect(sql).toContain('$$ MATCH (b:Biopreparado) RETURN properties(b) $$');
  });

  it('parsea solo las filas JSON e ignora ruido (LOAD/SET/blank)', () => {
    const out = ['LOAD', 'SET', '', '{"id":"caldo_bordeles","nombre":"Caldo bordelés"}', 'garbage'].join('\n');
    const rows = parsePsqlRows(out);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'caldo_bordeles', nombre: 'Caldo bordelés' });
  });

  it('no crashea con entrada vacía/no-string', () => {
    expect(parsePsqlRows('')).toEqual([]);
    expect(parsePsqlRows(null)).toEqual([]);
  });
});

describe('doseFact — fragmento atómico de la dosis verificada', () => {
  it('toma el primer segmento antes del primer ";"', () => {
    const bio = { dosis_aplicacion: '1-1,5 cc/L de agua, foliar en horas frescas; cada 7 dias' };
    expect(doseFact(bio)).toBe('1-1,5 cc/L de agua, foliar en horas frescas');
  });

  it('trunca segmentos largos en frontera de palabra (≤70)', () => {
    const long = { dosis_aplicacion: 'a'.repeat(40) + ' palabra ' + 'b'.repeat(50) };
    const f = doseFact(long);
    expect(f.length).toBeLessThanOrEqual(70);
  });

  it('devuelve "" si no hay dosis', () => {
    expect(doseFact({})).toBe('');
  });
});

describe('sourceHint — la fuente es METADATO, no token obligatorio', () => {
  it('extrae el primer tramo de la fuente para trazabilidad', () => {
    expect(sourceHint({ fuente: 'Agrosavia / SENA / Ingham (2000)' })).toBe('Agrosavia');
    expect(sourceHint({ fuente: 'Restrepo Rivera, J. — ABC de la agricultura organica' })).toBe(
      'Restrepo Rivera, J.',
    );
  });

  it('devuelve "" si no hay fuente', () => {
    expect(sourceHint({})).toBe('');
  });
});

describe('doseMustInclude — calibración graph-faithful (NO fuente verbatim)', () => {
  const caldo = {
    nombre: 'Caldo bordelés',
    dosis_aplicacion: 'Caldo madre al 1% para 10 L: 100 g de sulfato de cobre + 100 g de cal; aforar a 10 L',
    fuente: 'Restrepo Rivera, J. — ABC de la agricultura organica; Agrosavia/ICA',
  };

  it('incluye el nombre canónico y un fragmento de la dosis verificada', () => {
    const { must_include } = doseMustInclude(caldo);
    expect(must_include).toContain('Caldo bordelés');
    expect(must_include.some((m) => m.includes('100 g de sulfato de cobre'))).toBe(true);
  });

  it('NO incluye el nombre de la fuente como token obligatorio (anti-mis-calibración)', () => {
    const { must_include } = doseMustInclude(caldo);
    const joined = must_include.join(' | ');
    expect(joined).not.toMatch(/Restrepo|Agrosavia|FAO|ICA|SENA|Ingham/i);
  });

  it('expone la fuente como source_hint (metadato), no en must_include', () => {
    const { source_hint } = doseMustInclude(caldo);
    expect(source_hint).toContain('Restrepo Rivera');
  });

  it('degrada con gracia si faltan campos', () => {
    expect(doseMustInclude({}).must_include).toEqual([]);
    expect(doseMustInclude({ nombre: 'X' }).must_include).toEqual(['X']);
  });
});

describe('doseRedFlags', () => {
  it('caza dosis inventada y agroquímico de marca, sin referenciar la fuente', () => {
    const rf = doseRedFlags();
    expect(rf.some((r) => /distinta a la verificada/.test(r))).toBe(true);
    expect(rf.some((r) => /agroquímico de marca/.test(r))).toBe(true);
    expect(rf.join(' ')).not.toMatch(/fuente/i);
  });
});
