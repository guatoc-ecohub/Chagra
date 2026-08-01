import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks de dependencias antes del import del módulo bajo test.
vi.mock('../ollamaStream', () => ({
  streamOllama: vi.fn(),
}));
vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn(),
}));

import { streamOllama } from '../ollamaStream';
import { retrieve } from '../ragRetriever';
import { summarizeLessons, buildRagQuery, __TEST__ } from '../caseStudyLessonsSummarizer';

const {
  buildCaseSummaryInput,
  buildRagBlock,
  SYSTEM_PROMPT,
  PROMPT_VERSION,
  RAG_CONTEXT_HEADER,
} = __TEST__;

beforeEach(() => {
  vi.mocked(streamOllama).mockReset();
  vi.mocked(retrieve).mockReset();
});

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

describe('caseStudyLessonsSummarizer — buildRagQuery', () => {
  it('combina problema + treatments + species_id en una query', () => {
    const q = buildRagQuery({
      problem: { name_freetext: 'Trozador', pest_scientific_candidate: 'Agrotis ipsilon' },
      subject: { species_id: 'solanum_lycopersicum_cherry' },
      treatments_applied: [
        { biopreparado_id: 'bacillus_thuringiensis' },
        { biopreparado_id: 'extracto_neem' },
      ],
    });
    expect(q).toContain('Trozador');
    expect(q).toContain('Agrotis ipsilon');
    expect(q).toContain('solanum lycopersicum cherry');
    expect(q).toContain('bacillus thuringiensis');
    expect(q).toContain('extracto neem');
  });

  it('caso null → string vacío', () => {
    expect(buildRagQuery(null)).toBe('');
    expect(buildRagQuery(undefined)).toBe('');
  });

  it('omite partes faltantes sin romper', () => {
    const q = buildRagQuery({ problem: { name_freetext: 'oídio' } });
    expect(q).toBe('oídio');
  });
});

describe('caseStudyLessonsSummarizer — buildRagBlock', () => {
  it('passages vacíos → string vacío', () => {
    expect(buildRagBlock([])).toBe('');
    expect(buildRagBlock(null)).toBe('');
  });

  it('inserta header y datos del passage', () => {
    const out = buildRagBlock([
      { species: 'fragaria_ananassa', text: 'BT específico Lepidoptera.', score: 1.2 },
    ]);
    expect(out).toContain(RAG_CONTEXT_HEADER);
    expect(out).toContain('NO viene del usuario');
    expect(out).toContain('fragaria_ananassa');
    expect(out).toContain('BT específico Lepidoptera.');
  });
});

describe('caseStudyLessonsSummarizer — summarizeLessons integración RAG', () => {
  const caseObj = {
    problem: { name_freetext: 'Trozador (Agrotis ipsilon)', severity: 'high', pest_scientific_candidate: 'Agrotis ipsilon' },
    subject: { count_total: 100, count_affected: 5, species_id: 'solanum_lycopersicum_cherry' },
    state_history: [
      { at: '2026-05-17T08:00:00Z', state: 'open' },
      { at: '2026-05-17T10:00:00Z', state: 'in_treatment', notes: 'BT aplicado' },
    ],
    treatments_applied: [
      { applied_at: '2026-05-17T10:00:00Z', biopreparado_id: 'bacillus_thuringiensis', dose: '1g/L' },
    ],
    outcome: { closed_at: '2026-05-30T00:00:00Z', final_count_affected: 0 },
  };

  it('hace retrieve con query construida desde el caso y prepende bloque RAG', async () => {
    vi.mocked(retrieve).mockResolvedValue([
      { species: 'solanum_lycopersicum_cherry', text: 'Bacillus thuringiensis es bioinsecticida específico para Lepidoptera.', score: 1.4, key: 'biopreparados[0].nombre' },
    ]);
    vi.mocked(streamOllama).mockResolvedValue('Funcionó BT 1g/L al primer signo. Próxima vez aplicar preventivo cada 7 días en cohorte joven.');

    const result = await summarizeLessons(caseObj);

    expect(retrieve).toHaveBeenCalledTimes(1);
    const [calledQuery] = vi.mocked(retrieve).mock.calls[0];
    expect(calledQuery).toContain('Trozador');
    expect(calledQuery).toContain('bacillus thuringiensis');

    // streamOllama recibió user content con el bloque RAG prependeado
    const body = vi.mocked(streamOllama).mock.calls[0][1];
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).toContain(RAG_CONTEXT_HEADER);
    expect(userMsg).toContain('Bacillus thuringiensis es bioinsecticida');
    expect(userMsg).toContain('--- HISTORIAL DEL CASO ---');
    expect(userMsg).toContain('Trozador');

    expect(result).not.toBeNull();
    expect(result.text).toMatch(/BT|Bacillus|preventivo/i);
    expect(result._audit.rag_used).toBe(true);
    expect(result._audit.rag_passages).toHaveLength(1);
    expect(result._audit.rag_passages[0].species).toBe('solanum_lycopersicum_cherry');
    expect(result._audit.prompt_version).toBe(PROMPT_VERSION);
  });

  it('si retrieve falla → degrade gracefully, sigue llamando streamOllama sin bloque RAG', async () => {
    vi.mocked(retrieve).mockRejectedValue(new Error('corpus down'));
    vi.mocked(streamOllama).mockResolvedValue('Resumen sin contexto RAG pero suficientemente largo para no ser descartado.');

    const result = await summarizeLessons(caseObj);

    const body = vi.mocked(streamOllama).mock.calls[0][1];
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).not.toContain(RAG_CONTEXT_HEADER);
    expect(userMsg).toContain('Trozador');

    expect(result).not.toBeNull();
    expect(result._audit.rag_used).toBe(false);
    expect(result._audit.rag_passages).toEqual([]);
  });

  it('si retrieve devuelve [] → no agrega bloque RAG pero llama Ollama', async () => {
    vi.mocked(retrieve).mockResolvedValue([]);
    vi.mocked(streamOllama).mockResolvedValue('Resumen plano sin contexto agronómico de referencia adicional.');

    const result = await summarizeLessons(caseObj);

    const body = vi.mocked(streamOllama).mock.calls[0][1];
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).not.toContain(RAG_CONTEXT_HEADER);

    expect(result._audit.rag_used).toBe(false);
  });

  it('caseObj null → devuelve null y no llama nada', async () => {
    const result = await summarizeLessons(null);
    expect(result).toBeNull();
    expect(retrieve).not.toHaveBeenCalled();
    expect(streamOllama).not.toHaveBeenCalled();
  });

  it('streamOllama devuelve texto muy corto → null', async () => {
    vi.mocked(retrieve).mockResolvedValue([]);
    vi.mocked(streamOllama).mockResolvedValue('corto');
    const result = await summarizeLessons(caseObj);
    expect(result).toBeNull();
  });

  it('streamOllama throw → null y graceful', async () => {
    vi.mocked(retrieve).mockResolvedValue([]);
    vi.mocked(streamOllama).mockRejectedValue(new Error('ollama down'));
    const result = await summarizeLessons(caseObj);
    expect(result).toBeNull();
  });
});
