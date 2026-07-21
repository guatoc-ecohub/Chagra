import { describe, it, expect } from 'vitest';
import { getTasksForStage, getTasksForCycle, getUrgentTasks } from '../cycleTaskService';

describe('getTasksForStage', () => {
  it('retorna tareas para vegetative', () => {
    const tasks = getTasksForStage('vegetative');
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some((t) => t.task.includes('Riego'))).toBe(true);
  });

  it('retorna array vacio para etapa desconocida', () => {
    expect(getTasksForStage('unknown_stage')).toEqual([]);
  });
});

describe('getTasksForCycle', () => {
  it('retorna tareas desde etapa actual hasta closed', () => {
    const stageOrder = [
      { code: 'sowing', label: 'Siembra' },
      { code: 'vegetative', label: 'Vegetativo' },
      { code: 'flowering', label: 'Floración' },
      { code: 'closed', label: 'Cerrado' },
    ];
    const process = { attributes: { current_stage: 'vegetative' } };
    const tasks = getTasksForCycle(process, stageOrder);
    expect(tasks.length).toBeGreaterThan(0);
    const stages = [...new Set(tasks.map((t) => /** @type {any} */ (t).stage))];
    expect(stages).toContain('vegetative');
    expect(stages).toContain('flowering');
    expect(stages).not.toContain('sowing');
  });
});

describe('getUrgentTasks', () => {
  it('filtra solo prioridad alta', () => {
    const tasks = [
      { task: 'A', priority: 'alta' },
      { task: 'B', priority: 'media' },
      { task: 'C', priority: 'alta' },
    ];
    const urgent = getUrgentTasks(/** @type {any} */ (tasks));
    expect(urgent).toHaveLength(2);
  });
});
