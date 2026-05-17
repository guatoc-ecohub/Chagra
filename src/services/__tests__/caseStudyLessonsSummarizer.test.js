import { describe, it, expect } from 'vitest';
import { __TEST__ } from '../caseStudyLessonsSummarizer';

const { buildCaseSummaryInput, SYSTEM_PROMPT, PROMPT_VERSION } = __TEST__;

describe('caseStudyLessonsSummarizer — buildCaseSummaryInput', () => {
  it('estructura un caso completo con tratamientos + outcome', () => {
    const c = {
      problem: { name_freetext: 'Trozador (Agrotis ipsilon)', severity: 'high' },
      subject: { count_total: 1000, count_affected: 10 },
      zone_freetext: 'invernadero-david',
      state_history: [
        { at: '2026-05-17T08:00:00Z', state: 'open', notes: 'Caso creado' },
        { at: '2026-05-17T10:00:00Z', state: 'in_treatment', notes: 'BT aplicado' },
        { at: '2026-05-24T08:00:00Z', state: 'monitoring', notes: 'Sin nuevas pérdidas en 7d' },
      ],
      treatments_applied: [
        { applied_at: '2026-05-17T10:00:00Z', biopreparado_id: 'bacillus_thuringiensis', dose: '1g/L', notes: 'foliar atardecer' },
      ],
      outcome: { closed_at: '2026-05-30T00:00:00Z', final_count_affected: 0 },
    };
    const input = buildCaseSummaryInput(c);
    expect(input).toContain('Trozador');
    expect(input).toContain('high');
    expect(input).toContain('10/1000');
    expect(input).toContain('invernadero-david');
    expect(input).toContain('bacillus_thuringiensis');
    expect(input).toContain('1g/L');
    expect(input).toContain('Afectadas finales: 0');
  });

  it('maneja caso sin tratamientos', () => {
    const c = {
      problem: { name_freetext: 'Manchas hojas', severity: 'low' },
      subject: {},
      state_history: [{ at: '2026-05-01', state: 'open', notes: '' }],
      treatments_applied: [],
    };
    const input = buildCaseSummaryInput(c);
    expect(input).toContain('Sin tratamientos registrados');
  });

  it('retorna null si caso es null/undefined', () => {
    expect(buildCaseSummaryInput(null)).toBeNull();
    expect(buildCaseSummaryInput(undefined)).toBeNull();
  });

  it('omite zone si está vacía', () => {
    const c = {
      problem: { name_freetext: 'x' },
      subject: {},
      zone_freetext: '',
      state_history: [{ at: '2026-05-01', state: 'open' }],
      treatments_applied: [],
    };
    const input = buildCaseSummaryInput(c);
    expect(input).not.toMatch(/^Zona:/m);
  });

  it('SYSTEM_PROMPT incluye reglas privacy ADR-020', () => {
    expect(SYSTEM_PROMPT).toMatch(/ADR-020|Ley 1581|privacy|personas/i);
  });

  it('PROMPT_VERSION está versionado', () => {
    expect(PROMPT_VERSION).toMatch(/^v\d/);
  });
});
