import { describe, it, expect } from 'vitest';
import { getTasksForStage } from '../cycleTaskService';

// #4 Daniel: el ciclo de restauración ahora tiene tareas por etapa propia
// (establecimiento → prendimiento → mantenimiento → monitoreo_sucesion → cierre),
// no la fenología de cultivo.
describe('cycleTaskService — tareas de etapas de restauración', () => {
  const stages = ['establecimiento', 'prendimiento', 'mantenimiento', 'monitoreo_sucesion', 'cierre'];

  it('cada etapa de restauración tiene tareas con la forma correcta', () => {
    for (const s of stages) {
      const tasks = getTasksForStage(s);
      expect(tasks.length).toBeGreaterThan(0);
      for (const t of tasks) {
        expect(typeof t.task).toBe('string');
        expect(t.task.length).toBeGreaterThan(0);
        expect(typeof t.description).toBe('string');
        expect(['alta', 'media', 'baja']).toContain(t.priority);
      }
    }
  });

  it('prendimiento incluye revisar cuáles pegaron (prioridad alta)', () => {
    const t = getTasksForStage('prendimiento');
    expect(t.some((x) => /pegaron|prend/i.test(x.task) && x.priority === 'alta')).toBe(true);
  });

  it('mantenimiento pide replante y prohíbe quemar (anti-invasoras)', () => {
    const t = getTasksForStage('mantenimiento');
    expect(t.some((x) => /replant/i.test(x.task))).toBe(true);
    expect(t.some((x) => /quemar/i.test(x.description))).toBe(true);
  });

  it('establecimiento protege la ronda hídrica antes de sembrar', () => {
    const t = getTasksForStage('establecimiento');
    expect(t.some((x) => /ronda|hidric/i.test(x.task))).toBe(true);
  });

  it('las etapas de cultivo siguen intactas', () => {
    expect(getTasksForStage('sowing').length).toBeGreaterThan(0);
    expect(getTasksForStage('harvest_window').length).toBeGreaterThan(0);
  });
});
