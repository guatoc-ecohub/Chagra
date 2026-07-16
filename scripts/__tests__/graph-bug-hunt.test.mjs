import { describe, it, expect } from 'vitest';
import {
  cypherLiteral,
  sanitizeGraphName,
  buildBug1Query,
  buildBug2Query,
  buildBug3Query,
  buildBug5Query,
  buildBug6Query,
  buildBug7Query,
  buildAllQueries,
  parseArgs,
  runGraphBugHunt
} from '../audit/graph-bug-hunt.mjs';

describe('cypherLiteral', function () {
  it('escapa strings correctamente', function () {
    expect(cypherLiteral('hola mundo')).toBe("'hola mundo'");
  });

  it('escapa comillas simples', function () {
    expect(cypherLiteral("O'malley")).toBe("'O\\'malley'");
  });

  it('escapa backslashes', function () {
    expect(cypherLiteral('path\\to\\file')).toBe("'path\\\\to\\\\file'");
  });

  it('devuelve null para null/undefined', function () {
    expect(cypherLiteral(null)).toBe('null');
    expect(cypherLiteral(undefined)).toBe('null');
  });

  it('devuelve booleanos', function () {
    expect(cypherLiteral(true)).toBe('true');
    expect(cypherLiteral(false)).toBe('false');
  });

  it('devuelve números', function () {
    expect(cypherLiteral(42)).toBe('42');
    expect(cypherLiteral(3.14)).toBe('3.14');
    expect(cypherLiteral(Infinity)).toBe('null');
  });
});

describe('sanitizeGraphName', function () {
  it('pasa nombres normales', function () {
    expect(sanitizeGraphName('chagra_kg')).toBe('chagra_kg');
  });

  it('escapa comillas simples', function () {
    expect(sanitizeGraphName("chagra'kg")).toBe("chagra''kg");
  });

  it('convierte a string', function () {
    expect(sanitizeGraphName(123)).toBe('123');
  });
});

describe('buildBug1Query', function () {
  it('genera query válida para BUG-1', function () {
    const query = buildBug1Query('test_graph');
    expect(query).toContain('cypher');
    expect(query).toContain('test_graph');
    expect(query).toContain('altitud_min');
    expect(query).toContain('altitud_msnm');
    // Verificar que contiene la comparación (ignorando espacios de línea)
    expect(query).toContain('s.altitud_min > s.altitud_msnm');
  });

  it('usa sanitizeGraphName correctamente', function () {
    const query = buildBug1Query("test'graph");
    expect(query).toContain("test''graph");
  });
});

describe('buildBug2Query', function () {
  it('genera query válida para BUG-2', function () {
    const query = buildBug2Query('test_graph');
    expect(query).toContain('cypher');
    expect(query).toContain('test_graph');
    expect(query).toContain('piso_termico_id');
    expect(query).toContain('altitud_msnm');
  });

  it('incluye todas las validaciones de piso térmico', function () {
    const query = buildBug2Query('test_graph');
    expect(query).toContain('calido');
    expect(query).toContain('templado');
    expect(query).toContain('frio');
    expect(query).toContain('paramo');
  });
});

describe('buildBug3Query', function () {
  it('genera query válida para BUG-3', function () {
    const query = buildBug3Query('test_graph');
    expect(query).toContain('cypher');
    expect(query).toContain('test_graph');
    expect(query).toContain('nombre_cientifico');
    expect(query).toContain('cnt > 1');
  });
});

describe('buildBug5Query', function () {
  it('genera query válida para BUG-5', function () {
    const query = buildBug5Query('test_graph');
    expect(query).toContain('cypher');
    expect(query).toContain('test_graph');
    expect(query).toContain('edge_count = 0');
    expect(query).toContain('LEFT MATCH');
  });
});

describe('buildBug6Query', function () {
  it('genera query válida para BUG-6', function () {
    const query = buildBug6Query('test_graph');
    expect(query).toContain('cypher');
    expect(query).toContain('test_graph');
    expect(query).toContain('GROWS_IN');
    expect(query).toContain('PisoTermico');
  });
});

describe('buildBug7Query', function () {
  it('genera query válida para BUG-7', function () {
    const query = buildBug7Query('test_graph');
    expect(query).toContain('cypher');
    expect(query).toContain('test_graph');
    expect(query).toContain('nombre_cientifico');
    expect(query).toContain('nombre_cientifico =~');
  });

  it('incluye regex para validación binomial', function () {
    const query = buildBug7Query('test_graph');
    expect(query).toContain('^[A-Z]');
  });
});

describe('buildAllQueries', function () {
  it('genera todas las queries por defecto', function () {
    const queries = buildAllQueries('test_graph');
    expect(queries.length).toBe(7);
    expect(queries[0].name).toContain('BUG-1');
    expect(queries[1].name).toContain('BUG-2');
    expect(queries[6].name).toContain('BUG-7');
  });

  it('filtra queries cuando se especifican checks', function () {
    const queries = buildAllQueries('test_graph', [1, 3, 5]);
    expect(queries.length).toBe(3);
    expect(queries[0].name).toContain('BUG-1');
    expect(queries[1].name).toContain('BUG-3');
    expect(queries[2].name).toContain('BUG-5');
  });

  it('devuelve array vacío si checks está vacío', function () {
    const queries = buildAllQueries('test_graph', []);
    expect(queries.length).toBe(0);
  });

  it('cada query tiene name, query y description', function () {
    const queries = buildAllQueries('test_graph');
    for (const q of queries) {
      expect(q.name).toBeTruthy();
      expect(q.query).toBeTruthy();
      expect(q.description).toBeTruthy();
      expect(q.query).toContain('cypher');
    }
  });
});

describe('parseArgs', function () {
  it('parsea argumentos vacíos con defaults', function () {
    const opts = parseArgs([]);
    expect(opts.graph).toBe('chagra_kg');
    expect(opts.format).toBe('text');
    expect(opts.checks).toBeNull();
    expect(opts.dryRun).toBe(false);
  });

  it('parsea --graph', function () {
    const opts = parseArgs(['--graph', 'test_graph']);
    expect(opts.graph).toBe('test_graph');
  });

  it('parsea --format json', function () {
    const opts = parseArgs(['--format', 'json']);
    expect(opts.format).toBe('json');
  });

  it('parsea --check-only', function () {
    const opts = parseArgs(['--check-only', '1,3,5']);
    expect(opts.checks).toEqual([1, 3, 5]);
  });

  it('parsea --dry-run', function () {
    const opts = parseArgs(['--dry-run']);
    expect(opts.dryRun).toBe(true);
  });

  it('parsea --help', function () {
    const opts = parseArgs(['--help']);
    expect(opts.help).toBe(true);
  });

  it('parsea múltiples argumentos', function () {
    const opts = parseArgs(['--graph', 'test', '--format', 'json', '--dry-run']);
    expect(opts.graph).toBe('test');
    expect(opts.format).toBe('json');
    expect(opts.dryRun).toBe(true);
  });

  it('ignora checks inválidos', function () {
    const opts = parseArgs(['--check-only', '1,abc,3']);
    expect(opts.checks).toEqual([1, 3]);
  });
});

describe('runGraphBugHunt modo dry-run', function () {
  it('ejecuta en modo dry-run sin conectar a base de datos', async function () {
    const exitCode = await runGraphBugHunt({
      graph: 'test_graph',
      dryRun: true
    });
    expect(exitCode).toBe(0);
  });

  it('filtra checks en modo dry-run', async function () {
    const exitCode = await runGraphBugHunt({
      graph: 'test_graph',
      checks: [1, 2],
      dryRun: true
    });
    expect(exitCode).toBe(0);
  });
});
