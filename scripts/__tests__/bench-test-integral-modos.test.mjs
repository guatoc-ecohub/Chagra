import { describe, expect, it } from 'vitest';
import {
  MODE_ORDER,
  QUERY_SUITE,
  parseArgs,
  loadQuerySuite,
  buildPromptForMode,
  extractModeBlock,
  extractFooter,
  countScientificBinomials,
  evaluateQueryForMode,
  summarizeModeRows,
  buildVerdict,
  renderSummaryMarkdown,
  runBench,
} from '../bench-test-integral-modos.mjs';

const plain = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

describe('parseArgs', () => {
  it('lee limit, output dir y banderas', () => {
    const args = parseArgs(['node', 'script', '--limit', '7', '--output-dir', '/tmp/out', '--no-write', '--judge', 'qwen2.5:14b']);
    expect(args.limit).toBe(7);
    expect(args.outputDir).toBe('/tmp/out');
    expect(args.writeOutput).toBe(false);
    expect(args.judgeModel).toBe('qwen2.5:14b');
  });
});

describe('suite de consultas', () => {
  it('expone un set representativo de 10 a 15 consultas', () => {
    expect(QUERY_SUITE.length).toBeGreaterThanOrEqual(10);
    expect(QUERY_SUITE.length).toBeLessThanOrEqual(15);
  });

  it('recorta por limit', () => {
    expect(loadQuerySuite(3)).toHaveLength(3);
  });
});

describe('pipeline de prompts', () => {
  const fixture = QUERY_SUITE.find((item) => item.id === 'q02');

  it('construye el modo campesino real', () => {
    const prompt = buildPromptForMode(fixture, 'campesino');
    const block = extractModeBlock(prompt, 'campesino');

    expect(prompt).toContain('=== MODO CAMPESINO');
    expect(plain(block)).toContain('frases cortas y directas');
    expect(plain(block)).toContain('nombres comunes');
    expect(plain(block)).toContain('no uses binomios cientificos');
    expect(extractFooter(prompt)).toBe('');
  });

  it('construye el modo experto real con footer cuando hay grounding', () => {
    const prompt = buildPromptForMode(fixture, 'experto');
    const block = extractModeBlock(prompt, 'experto');
    const footer = extractFooter(prompt);

    expect(prompt).toContain('=== MODO EXPERTO ===');
    expect(block).toContain('CONTRATO CITA');
    expect(block).toContain('dosis con unidad');
    expect(block).toContain('mecanismo de acción');
    expect(footer).toContain('Grafo AGE');
    expect(footer).toContain('Catálogo Chagra');
  });

  it('construye el modo maestro real', () => {
    const prompt = buildPromptForMode(fixture, 'maestro');
    const block = extractModeBlock(prompt, 'maestro');

    expect(prompt).toContain('=== MODO MAESTRO');
    expect(plain(block)).toContain('resume la decision principal');
    expect(plain(block)).toContain('checklist breve');
    expect(plain(block)).toContain('errores comunes');
  });

  it('cuenta binomios cientificos en un fragmento simple', () => {
    expect(countScientificBinomials('Coffea arabica y Solanum tuberosum')).toBe(2);
  });
});

describe('evaluacion deterministica', () => {
  it('marca el modo campesino como corto y sin binomios', async () => {
    const row = await evaluateQueryForMode(QUERY_SUITE[0], 'campesino');
    expect(row.deterministic.markerHits).toBeGreaterThanOrEqual(3);
    expect(row.deterministic.binomials).toBe(0);
    expect(row.deterministic.shortEnough).toBe(true);
  });

  it('marca el modo experto como grounded cuando aplica', async () => {
    const row = await evaluateQueryForMode(QUERY_SUITE[1], 'experto');
    expect(row.deterministic.groundedHits).toBeGreaterThanOrEqual(4);
    expect(row.deterministic.hasFooter).toBe(true);
    expect(row.deterministic.footerSources).toBeGreaterThan(0);
  });

  it('marca el modo maestro con andamiaje pedagogico', async () => {
    const row = await evaluateQueryForMode(QUERY_SUITE[2], 'maestro');
    expect(row.deterministic.markerHits).toBeGreaterThanOrEqual(4);
  });
});

describe('agregacion y veredicto', () => {
  it('resume por modo y produce veredicto de diferenciacion', async () => {
    const rowsByMode = Object.fromEntries(MODE_ORDER.map((mode) => [mode, []]));
    for (const query of loadQuerySuite(6)) {
      // Reutiliza el mismo subconjunto para los 3 modos.
      rowsByMode.campesino.push(await evaluateQueryForMode(query, 'campesino'));
      rowsByMode.experto.push(await evaluateQueryForMode(query, 'experto'));
      rowsByMode.maestro.push(await evaluateQueryForMode(query, 'maestro'));
    }

    const summaryByMode = Object.fromEntries(
      MODE_ORDER.map((mode) => [mode, summarizeModeRows(mode, rowsByMode[mode])]),
    );
    const verdict = buildVerdict(summaryByMode);

    expect(summaryByMode.campesino.pass).toBe(true);
    expect(summaryByMode.experto.pass).toBe(true);
    expect(summaryByMode.maestro.pass).toBe(true);
    expect(verdict.passed).toBe(true);
    expect(verdict.label).toBe('DIFERENCIACION_OK');
  });

  it('renderiza tabla y veredicto', () => {
    const summaryByMode = {
      campesino: { label: 'Campesino', total: 2, ownCoverageRate: 100, leakRate: 0, avgBlockChars: 10, avgScore: 100, pass: true },
      experto: { label: 'Experto', total: 2, groundedCoverageRate: 100, technicalCoverageRate: 100, leakRate: 0, avgBlockChars: 20, avgScore: 100, avgSources: 2, pass: true },
      maestro: { label: 'Maestro', total: 2, ownCoverageRate: 100, leakRate: 0, avgBlockChars: 30, avgScore: 100, pass: true },
    };
    const rowsByMode = {
      campesino: [{ id: 'q', query: 'q', grounded: false, blockChars: 10, deterministic: { score: 100, markerHits: 4, binomials: 0, shortEnough: true } }],
      experto: [{ id: 'q', query: 'q', grounded: true, blockChars: 20, deterministic: { score: 100, hasFooter: true } }],
      maestro: [{ id: 'q', query: 'q', grounded: false, blockChars: 30, deterministic: { score: 100, markerHits: 5 } }],
    };
    const md = renderSummaryMarkdown({
      rowsByMode,
      summaryByMode,
      verdict: { passed: true, label: 'DIFERENCIACION_OK', reasons: [] },
      startedAt: '2026-07-01T00:00:00.000Z',
      totalMs: 1234,
    });

    expect(md).toContain('Veredicto: DIFERENCIACION_OK');
    expect(md).toContain('| Modo | Consultas | Cobertura propia | Fugas | Promedio de bloques | Promedio score | Estado |');
    expect(md).toContain('Campesino');
    expect(md).toContain('Experto');
    expect(md).toContain('Maestro');
  });
});

describe('runBench', () => {
  it('ejecuta sin escribir y retorna un reporte coherente', async () => {
    const report = await runBench({
      queries: loadQuerySuite(6),
      writeOutput: false,
    });

    expect(report.verdict.passed).toBe(true);
    expect(report.summaryByMode.campesino.pass).toBe(true);
    expect(report.summaryByMode.experto.pass).toBe(true);
    expect(report.summaryByMode.maestro.pass).toBe(true);
  });
});
