import { describe, it, expect } from 'vitest';
import { getCompletedTaskIds } from '../taskCompletionParser.js';

describe('getCompletedTaskIds', () => {
  it('extrae ids de logs con TASK_COMPLETION', () => {
    const logs = [
      { attributes: { notes: { value: '[TASK_COMPLETION] target_task_id: task-123 verdict: completed' } } },
    ];
    const ids = getCompletedTaskIds(logs);
    expect(ids.has('task-123')).toBe(true);
  });

  it('ignora logs sin TASK_COMPLETION marker', () => {
    const logs = [
      { attributes: { notes: { value: 'Tarea normal terminada' } } },
    ];
    const ids = getCompletedTaskIds(logs);
    expect(ids.size).toBe(0);
  });

  it('maneja array vacio', () => {
    expect(getCompletedTaskIds([]).size).toBe(0);
  });

  it('extrae multiples ids', () => {
    const logs = [
      { attributes: { notes: { value: '[TASK_COMPLETION] target_task_id: a1 verdict: done' } } },
      { attributes: { notes: { value: '[TASK_COMPLETION] target_task_id: b2 verdict: done' } } },
    ];
    const ids = getCompletedTaskIds(logs);
    expect(ids.size).toBe(2);
    expect(ids.has('a1')).toBe(true);
    expect(ids.has('b2')).toBe(true);
  });

  it('ignora logs sin target_task_id', () => {
    const logs = [
      { attributes: { notes: { value: '[TASK_COMPLETION] sin id valido' } } },
    ];
    expect(getCompletedTaskIds(logs).size).toBe(0);
  });
});

// parseVerdict removido del source en dead-code sweep — funcion eliminada
// porque no tenia referencias internas ni externas. Tests de parseVerdict
// removidos para mantener consistencia con el source.
