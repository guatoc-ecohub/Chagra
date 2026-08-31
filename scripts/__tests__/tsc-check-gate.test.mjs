import { describe, it, expect } from 'vitest';
import { parseTscOutput, outputFromTscDiagnostic, compareToBaseline, formatReport } from '../tsc-check-gate.mjs';

describe('parseTscOutput', function () {
  it('counts one error per opening diagnostic line', function () {
    var output = [
      'src/a.js(10,3): error TS2339: Property x does not exist.',
      'src/a.js(12,5): error TS2345: Argument not assignable.',
      'src/b.jsx(4,1): error TS2322: Type mismatch.',
    ].join('\n');
    var r = parseTscOutput(output);
    expect(r.total).toBe(3);
    expect(r.byFile).toEqual({ 'src/a.js': 2, 'src/b.jsx': 1 });
  });

  it('ignores continuation lines of multiline messages', function () {
    var output = [
      "src/a.js(1,1): error TS2322: Type '{ a: string }' is not assignable to type '{ a: number }'.",
      '  Types of property a are incompatible.',
      "    Type 'string' is not assignable to type 'number'.",
    ].join('\n');
    var r = parseTscOutput(output);
    expect(r.total).toBe(1);
    expect(r.byFile).toEqual({ 'src/a.js': 1 });
  });

  it('ignores npm banner / non-error lines', function () {
    var output = ['', '> chagra@1.0.55 tsc:check', '> tsc --noEmit -p jsconfig.json', ''].join('\n');
    var r = parseTscOutput(output);
    expect(r.total).toBe(0);
    expect(r.byFile).toEqual({});
  });

  it('empty output has zero errors', function () {
    expect(parseTscOutput('')).toEqual({ total: 0, byFile: {} });
  });

  it('normaliza paths de node_modules resueltos fuera del repo (symlink local vs CI)', function () {
    var output = [
      '../../home/alguien/Workspace/chagra/node_modules/fake-indexeddb/auto/index.mjs(3,1): error TS7016: no declaration file.',
      'node_modules/fake-indexeddb/auto/index.mjs(9,1): error TS7016: no declaration file.',
      'src/a.js(1,1): error TS2322: Type mismatch.',
    ].join('\n');
    var r = parseTscOutput(output);
    expect(r.total).toBe(3);
    // La forma local (path resuelto por symlink) y la de CI cuentan como el
    // MISMO archivo — sin esto el baseline no era portable entre máquinas.
    expect(r.byFile).toEqual({
      'node_modules/fake-indexeddb/auto/index.mjs': 2,
      'src/a.js': 1,
    });
  });
});

describe('outputFromTscDiagnostic', function () {
  it('returns diagnostics when tsc exits after reporting type errors', function () {
    var output = outputFromTscDiagnostic({ status: 2, stdout: 'src/a.js(1,1): error TS2322: Type mismatch.\n' });
    expect(output).toContain('TS2322');
  });

  it('fails instead of treating a terminated tsc process as zero errors', function () {
    expect(function () {
      outputFromTscDiagnostic({ status: null, signal: 'SIGKILL' });
    }).toThrow('tsc no terminó correctamente por señal SIGKILL');
  });
});

describe('compareToBaseline', function () {
  it('passes when current matches baseline exactly', function () {
    var current = { total: 3, byFile: { 'a.js': 2, 'b.js': 1 } };
    var baseline = { totalErrors: 3, byFile: { 'a.js': 2, 'b.js': 1 } };
    var r = compareToBaseline(current, baseline);
    expect(r.ok).toBe(true);
    expect(r.newFiles).toEqual([]);
    expect(r.regressions).toEqual([]);
  });

  it('passes and reports improvement when a file count drops', function () {
    var current = { total: 1, byFile: { 'a.js': 1 } };
    var baseline = { totalErrors: 3, byFile: { 'a.js': 3 } };
    var r = compareToBaseline(current, baseline);
    expect(r.ok).toBe(true);
    expect(r.improved).toEqual([{ file: 'a.js', baselineCount: 3, currentCount: 1, delta: 2 }]);
  });

  it('passes when a file disappears entirely (0 errors, not in current.byFile)', function () {
    var current = { total: 0, byFile: {} };
    var baseline = { totalErrors: 2, byFile: { 'a.js': 2 } };
    var r = compareToBaseline(current, baseline);
    expect(r.ok).toBe(true);
    expect(r.regressions).toEqual([]);
    expect(r.newFiles).toEqual([]);
  });

  it('fails when a file not in baseline now has errors', function () {
    var current = { total: 1, byFile: { 'new.js': 1 } };
    var baseline = { totalErrors: 0, byFile: {} };
    var r = compareToBaseline(current, baseline);
    expect(r.ok).toBe(false);
    expect(r.newFiles).toEqual([{ file: 'new.js', count: 1 }]);
  });

  it('fails when a file count increases past the baseline', function () {
    var current = { total: 5, byFile: { 'a.js': 5 } };
    var baseline = { totalErrors: 2, byFile: { 'a.js': 2 } };
    var r = compareToBaseline(current, baseline);
    expect(r.ok).toBe(false);
    expect(r.regressions).toEqual([{ file: 'a.js', baselineCount: 2, currentCount: 5, delta: 3 }]);
  });

  it('fails for a new 3D file with type errors', function () {
    var current = { total: 1, byFile: { 'src/visual/mundo3d/NuevoMundo.jsx': 1 } };
    var r = compareToBaseline(current, { totalErrors: 0, byFile: {} });
    expect(r.ok).toBe(false);
    expect(r.newFiles).toEqual([{ file: 'src/visual/mundo3d/NuevoMundo.jsx', count: 1 }]);
  });

  it('fails when a 3D file error count increases past the baseline', function () {
    var current = { total: 2, byFile: { 'src/mockups/Valle3D.jsx': 2 } };
    var baseline = { totalErrors: 1, byFile: { 'src/mockups/Valle3D.jsx': 1 } };
    var r = compareToBaseline(current, baseline);
    expect(r.ok).toBe(false);
    expect(r.regressions).toEqual([
      { file: 'src/mockups/Valle3D.jsx', baselineCount: 1, currentCount: 2, delta: 1 },
    ]);
  });

  it('handles a missing baseline (no byFile) as an all-new report', function () {
    var current = { total: 2, byFile: { 'a.js': 2 } };
    var r = compareToBaseline(current, {});
    expect(r.ok).toBe(false);
    expect(r.newFiles).toEqual([{ file: 'a.js', count: 2 }]);
  });
});

describe('formatReport', function () {
  it('includes FAIL marker when not ok', function () {
    var comparison = compareToBaseline({ total: 1, byFile: { 'new.js': 1 } }, { totalErrors: 0, byFile: {} });
    expect(formatReport(comparison)).toContain('FAIL');
  });

  it('includes OK marker when ok', function () {
    var comparison = compareToBaseline({ total: 0, byFile: {} }, { totalErrors: 0, byFile: {} });
    expect(formatReport(comparison)).toContain('OK');
  });
});
