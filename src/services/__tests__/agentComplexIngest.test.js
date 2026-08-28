import { describe, expect, it, vi } from 'vitest';
import {
  decomposeComplexIngest,
  executeComplexIngest,
  scheduleAgroecologicalSuggestion,
} from '../agentComplexIngest.js';

const CASO_1 = 'Hola chagra, sembre 10 tomate cherry en el surco 12 hace 3 meses, ya entregue tres cosechas del surco, se abono cada 15 dias y se trato un problema de trozador y de gota.';
const HOY = new Date('2026-08-28T12:00:00.000Z');

describe('agentComplexIngest — Caso 1 multi-entidad', () => {
  it('descompone determinísticamente todas las operaciones sin llamar un LLM', () => {
    const result = decomposeComplexIngest(CASO_1, { now: HOY });

    expect(result).toMatchObject({ detected: true, requiresConfirmation: true });
    expect(result.operations.map((operation) => operation.kind)).toEqual([
      'ensure_land',
      'create_seeding',
      'register_harvest',
      'register_harvest',
      'register_harvest',
      'register_fertilizer_cadence',
      'register_problem',
      'register_problem',
    ]);

    expect(result.operations[0]).toMatchObject({
      kind: 'ensure_land',
      parameters: { name: 'Surco 12', land_type: 'bed', reference: '12' },
    });
    expect(result.operations[1]).toMatchObject({
      kind: 'create_seeding',
      parameters: {
        crop: 'tomate cherry',
        quantity: 10,
        land_reference: '12',
        timestamp: '2026-05-28T12:00:00.000Z',
      },
    });
    expect(result.operations.slice(2, 5)).toHaveLength(3);
    expect(result.operations.slice(2, 5).every((operation) => operation.parameters.land_reference === '12')).toBe(true);
    expect(result.operations[5]).toMatchObject({
      kind: 'register_fertilizer_cadence',
      parameters: { interval_days: 15, land_reference: '12' },
    });
    expect(result.operations.slice(6)).toMatchObject([
      { kind: 'register_problem', parameters: { name: 'trozador', problem_type: 'plaga', treatment_status: 'incomplete' } },
      { kind: 'register_problem', parameters: { name: 'gota', problem_type: 'enfermedad', treatment_status: 'incomplete' } },
    ]);
    expect(result.followUpQuestion).toBe('¿quieres contarme qué tratamiento seguiste para trozador y gota?');
    expect(result.agroecologicalSuggestion).toMatchObject({
      crop: 'tomate cherry',
      problems: [
        { name: 'trozador', problem_type: 'plaga' },
        { name: 'gota', problem_type: 'enfermedad' },
      ],
    });
  });

  it('solo se activa cuando detecta varias acciones del caso complejo', () => {
    expect(decomposeComplexIngest('Ayer aboné el tomate.', { now: HOY })).toEqual({ detected: false });
  });

  it('entrega las operaciones al executor existente en orden y solo tras confirmación', async () => {
    const plan = decomposeComplexIngest(CASO_1, { now: HOY });
    const executor = vi.fn().mockResolvedValue({ status: 'executed', result: { success: true } });

    const execution = await executeComplexIngest(plan, {
      operatorId: 'operator-1',
      execute: executor,
    });

    expect(executor).toHaveBeenCalledTimes(8);
    expect(executor.mock.calls.map(([proposal]) => proposal.operation_kind)).toEqual(plan.operations.map((operation) => operation.kind));
    expect(executor.mock.calls.every(([, operatorId]) => operatorId === 'operator-1')).toBe(true);
    expect(execution).toMatchObject({ status: 'executed', executed: 8, failed: 0 });
  });

  it('agenda la sugerencia agroecológica fuera de la ingesta confirmada', async () => {
    const plan = decomposeComplexIngest(CASO_1, { now: HOY });
    const suggest = vi.fn().mockResolvedValue({ text: 'Manejo agroecológico listo.' });

    const suggestion = await scheduleAgroecologicalSuggestion(plan, suggest);

    expect(suggest).toHaveBeenCalledWith(plan.agroecologicalSuggestion);
    expect(suggestion).toEqual({ text: 'Manejo agroecológico listo.' });
  });
});
