import { describe, it, expect } from 'vitest';
import { buildPsqlInvocation, buildVerificationSql, parseArgs, buildRunReport } from '../load-age-etno-folk-fitopatologia.mjs';

describe('load-age-etno-folk-fitopatologia', () => {
  it('parsea flags básicos', () => {
    const opts = parseArgs(['--sql', '/tmp/x.sql', '--dry-run', '--force', '--json']);
    expect(opts.sql).toBe('/tmp/x.sql');
    expect(opts.dryRun).toBe(true);
    expect(opts.force).toBe(true);
    expect(opts.json).toBe(true);
  });

  it('parsea --preflight-only', () => {
    const opts = parseArgs(['--preflight-only']);
    expect(opts.preflightOnly).toBe(true);
    expect(opts.dryRun).toBe(false);
  });

  it('parsea --no-verify', () => {
    const opts = parseArgs(['--no-verify']);
    expect(opts.verify).toBe(false);
  });

  it('usa podman exec por defecto cuando no hay override', () => {
    const prev = process.env.CHAGRA_AGE_PSQL_COMMAND;
    delete process.env.CHAGRA_AGE_PSQL_COMMAND;
    const inv = buildPsqlInvocation();
    if (prev !== undefined) process.env.CHAGRA_AGE_PSQL_COMMAND = prev;
    expect(inv.kind).toBe('podman');
    expect(inv.args).toContain('postgres-farm');
    expect(inv.args).toContain('psql');
  });

  it('respeta override shell explícito', () => {
    const prev = process.env.CHAGRA_AGE_PSQL_COMMAND;
    process.env.CHAGRA_AGE_PSQL_COMMAND = 'psql -h 127.0.0.1 -p 5432 -U farmos -d chagra_kg';
    const inv = buildPsqlInvocation();
    if (prev !== undefined) process.env.CHAGRA_AGE_PSQL_COMMAND = prev;
    else delete process.env.CHAGRA_AGE_PSQL_COMMAND;
    expect(inv.kind).toBe('shell');
    expect(inv.command).toContain('psql -h 127.0.0.1');
  });

  it('buildVerificationSql emite conteos de aristas y nodos FolkSymptom', () => {
    const sql = buildVerificationSql('chagra_kg');
    expect(sql).toContain('FOLK_NAME_OF');
    expect(sql).toContain('MATCH (f:FolkSymptom) RETURN f');
    expect(sql).toContain("LOAD 'age'");
  });
});

describe('buildRunReport', () => {
  const mockSummary = {
    ready: true,
    mappingCount: 10,
    uniqueLabelCount: 10,
    uniquePestCount: 8,
    missingLabels: [],
    missingPests: [],
  };

  it('reporta modo preflight-only', () => {
    const report = buildRunReport(mockSummary, { preflightOnly: true, dryRun: false, verify: true, sql: '/tmp/x.sql', force: false });
    expect(report.mode).toBe('preflight-only');
    expect(report.preflight.ready).toBe(true);
    expect(report.verify).toBe('on');
  });

  it('reporta modo dry-run', () => {
    const report = buildRunReport(mockSummary, { preflightOnly: false, dryRun: true, verify: true, sql: '/tmp/x.sql', force: false });
    expect(report.mode).toBe('dry-run');
    expect(report.verify).toBe('on');
  });

  it('reporta modo real-run', () => {
    const report = buildRunReport(mockSummary, { preflightOnly: false, dryRun: false, verify: true, sql: '/tmp/x.sql', force: false });
    expect(report.mode).toBe('real-run');
    expect(report.preflight.mappingCount).toBe(10);
  });

  it('reporta missing labels cuando hay', () => {
    const badSummary = { ...mockSummary, ready: false, missingLabels: ['gota'] };
    const report = buildRunReport(badSummary, { preflightOnly: true, dryRun: false, verify: true, sql: '/tmp/x.sql', force: false });
    expect(report.preflight.ready).toBe(false);
    expect(report.preflight.missingLabels).toEqual(['gota']);
  });

  it('incluye psql command en el reporte', () => {
    const report = buildRunReport(mockSummary, { preflightOnly: true, dryRun: false, verify: true, sql: '/tmp/x.sql', force: false });
    expect(report.psqlCommand).toBeTruthy();
    expect(typeof report.psqlCommand).toBe('string');
  });

  it('verificationSql es null cuando verify=off', () => {
    const report = buildRunReport(mockSummary, { preflightOnly: true, dryRun: false, verify: false, sql: '/tmp/x.sql', force: false });
    expect(report.verificationSql).toBeNull();
    expect(report.verify).toBe('off');
  });
});
