/**
 * scripts/__tests__/snapshot-grafo-crecimiento.test.mjs
 *
 * Cobertura unitaria del paso de cierre del timeline HYTA. NO toca la red ni
 * postgres: verifica las funciones PURAS y deterministas (mergeSnapshot,
 * sanitizeForPublic, embedData, buildPsqlInvocation, resolveDate). La parte que
 * consulta AGE (snapshotGrafo/runSql) se prueba en vivo via --dry-run, no aca.
 */
import { describe, it, expect } from 'vitest';

import {
  mergeSnapshot,
  sanitizeForPublic,
  embedData,
  buildPsqlInvocation,
  resolveDate,
} from '../snapshot-grafo-crecimiento.mjs';

const LIVE = {
  especies: 637,
  pisos: { calido: 260, templado: 326, frio: 288, paramo: 66 },
  biopreparados: 74,
  dosis_verificadas: 57,
  fermentos: 24,
  plagas: 118,
  clima_extendido: 142,
  conexiones: 940,
  used_as_biopreparado: 203,
};

function basePrev() {
  return {
    _meta: {
      titulo: 'T',
      nota_pisos: 'una especie puede crecer en varios pisos',
      generado: '2026-06-02',
      commits_catalogo: [{ commit: 'abc', fecha: '2026-05-20', pr: '#43', titulo: 'base' }],
    },
    totales_actuales: {
      especies: 564,
      pisos: { calido: 221, templado: 281, frio: 259, paramo: 57 },
      biopreparados: 32,
      dosis_verificadas: 15,
      fermentos: 24,
      plagas: 88,
      conexiones: 800,
      used_as_biopreparado: 66,
      clima_extendido: 20,
      prs: 110,
      horas: 82,
      punto_partida_especies: 564,
    },
    crecimiento_nocturno: {
      fecha: '2026-06-03',
      deltas: [
        { id: 'especies', nombre: 'Especies', antes: 564, ahora: 637 },
        { id: 'used', nombre: 'Usos como biopreparado', antes: 66, ahora: 203 },
      ],
    },
    pisos: [{ id: 'calido', nombre: 'Calido' }],
    capas: [{ id: 'especies', nombre: 'Especies' }],
    serie: [{ fecha: '2026-05-20', commit: 'abc', pr: '#43', especies: 488 }],
    hitos: [
      { fecha: '2026-05-20', titulo: 'inicio', detalle: 'Catalogo base. PR #43.' },
    ],
  };
}

describe('mergeSnapshot', () => {
  it('refresca totales_actuales con los conteos vivos', () => {
    const out = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    expect(out.totales_actuales.especies).toBe(637);
    expect(out.totales_actuales.pisos).toEqual(LIVE.pisos);
    expect(out.totales_actuales.biopreparados).toBe(74);
    expect(out.totales_actuales.dosis_verificadas).toBe(57);
    expect(out.totales_actuales.clima_extendido).toBe(142);
    expect(out.totales_actuales.conexiones).toBe(940);
    expect(out.totales_actuales.used_as_biopreparado).toBe(203);
  });

  it('preserva campos no derivables del grafo (prs/horas/punto_partida)', () => {
    const out = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    expect(out.totales_actuales.prs).toBe(110);
    expect(out.totales_actuales.horas).toBe(82);
    expect(out.totales_actuales.punto_partida_especies).toBe(564);
  });

  it('appendea snapshot fechado en snapshots[]', () => {
    const out = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    expect(out.snapshots).toHaveLength(1);
    expect(out.snapshots[0].fecha).toBe('2026-06-03');
    expect(out.snapshots[0].especies).toBe(637);
  });

  it('es idempotente por fecha (re-correr el mismo dia no duplica)', () => {
    const once = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    const twice = mergeSnapshot(once, LIVE, '2026-06-03');
    expect(twice.snapshots).toHaveLength(1);
  });

  it('acumula dias distintos y los ordena por fecha', () => {
    const d1 = mergeSnapshot(basePrev(), { ...LIVE, especies: 600 }, '2026-06-02');
    const d2 = mergeSnapshot(d1, LIVE, '2026-06-03');
    expect(d2.snapshots.map((s) => s.fecha)).toEqual(['2026-06-02', '2026-06-03']);
    expect(d2.snapshots[0].especies).toBe(600);
    expect(d2.snapshots[1].especies).toBe(637);
  });

  it('preserva serie, hitos y commits_catalogo sin tocarlos', () => {
    const prev = basePrev();
    const out = mergeSnapshot(prev, LIVE, '2026-06-03');
    expect(out.serie).toEqual(prev.serie);
    expect(out.hitos).toEqual(prev.hitos);
    expect(out._meta.commits_catalogo).toEqual(prev._meta.commits_catalogo);
  });

  it('sella _meta.generado y _meta.snapshot_grafo con la fecha dada', () => {
    const out = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    expect(out._meta.generado).toBe('2026-06-03');
    expect(out._meta.snapshot_grafo).toBe('2026-06-03');
  });

  it('no muta el objeto previo', () => {
    const prev = basePrev();
    const snapshot = JSON.stringify(prev);
    mergeSnapshot(prev, LIVE, '2026-06-03');
    expect(JSON.stringify(prev)).toBe(snapshot);
  });
});

describe('sanitizeForPublic', () => {
  it('quita aristas internas y procedencia de totales', () => {
    const full = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    const pub = sanitizeForPublic(full);
    expect(pub.totales_actuales.used_as_biopreparado).toBeUndefined();
    expect(pub.totales_actuales.prs).toBeUndefined();
    expect(pub.totales_actuales.horas).toBeUndefined();
    expect(pub.totales_actuales.especies).toBe(637);
  });

  it('quita el delta de aristas internas (used) del crecimiento nocturno', () => {
    const full = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    const pub = sanitizeForPublic(full);
    expect(pub.crecimiento_nocturno.deltas.some((d) => d.id === 'used')).toBe(false);
    expect(pub.crecimiento_nocturno.deltas.some((d) => d.id === 'especies')).toBe(true);
  });

  it('quita commit/pr de la serie y used_as_* de los snapshots', () => {
    const full = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    const pub = sanitizeForPublic(full);
    expect(pub.serie[0].commit).toBeUndefined();
    expect(pub.serie[0].pr).toBeUndefined();
    expect(pub.serie[0].especies).toBe(488);
    expect(pub.snapshots[0].used_as_biopreparado).toBeUndefined();
    expect(pub.snapshots[0].especies).toBe(637);
  });

  it('limpia menciones de PR del texto de los hitos', () => {
    const full = mergeSnapshot(basePrev(), LIVE, '2026-06-03');
    const pub = sanitizeForPublic(full);
    expect(pub.hitos[0].detalle).not.toMatch(/PR\s*#/);
  });
});

describe('embedData', () => {
  it('reemplaza el contenido del bloque chagra-data', () => {
    const html =
      '<html><script id="chagra-data" type="application/json">\nOLD\n</script></html>';
    const out = embedData(html, '{"x":1}');
    expect(out).toContain('{"x":1}');
    expect(out).not.toContain('OLD');
    expect(out).toContain('<script id="chagra-data" type="application/json">');
  });

  it('devuelve null si no encuentra el bloque', () => {
    expect(embedData('<html>no data</html>', '{}')).toBeNull();
  });
});

describe('buildPsqlInvocation', () => {
  it('envuelve en nix-shell por defecto (NixOS sin psql en PATH)', () => {
    const inv = buildPsqlInvocation({});
    expect(inv.file).toBe('nix-shell');
    expect(inv.args).toContain('postgresql');
    const run = inv.args[inv.args.length - 1];
    expect(run).toMatch(/^psql /);
    expect(run).toContain("-h 127.0.0.1");
    expect(run).toContain('-d chagra_kg');
    expect(run).toContain('-f -');
  });

  it('respeta overrides de host/db por env', () => {
    const inv = buildPsqlInvocation({ PGHOST: '10.0.0.1', PGDATABASE: 'otra' });
    const run = inv.args[inv.args.length - 1];
    expect(run).toContain('-h 10.0.0.1');
    expect(run).toContain('-d otra');
  });

  it('PSQL_WRAP=none usa psql directo', () => {
    const inv = buildPsqlInvocation({ PSQL_WRAP: 'none' });
    expect(inv.file).toBe('psql');
    expect(inv.args).toContain('chagra_kg');
  });
});

describe('resolveDate', () => {
  it('prioriza --date', () => {
    expect(resolveDate(['--date', '2026-01-02'], {})).toBe('2026-01-02');
  });
  it('cae a SNAPSHOT_DATE si no hay flag', () => {
    expect(resolveDate([], { SNAPSHOT_DATE: '2026-03-04' })).toBe('2026-03-04');
  });
  it('default a fecha de sistema (YYYY-MM-DD) sin flag ni env', () => {
    expect(resolveDate([], {})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
