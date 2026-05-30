import { describe, it, expect, beforeEach } from 'vitest';
import { aggregateNotifications, setDemoSeedHelada } from '../notificationsService.js';

/**
 * Tests del bloque de tareas de aggregateNotifications.
 *
 * Contrato: las tareas vencidas (due_date en el pasado) generan una
 * notificación `tasks_pending`. Los logs FarmOS de tipo `log--task` no traen
 * `due_date` sino `timestamp` (Unix en segundos), así que el agregador debe
 * aceptar ese campo como fallback para que las tareas atrasadas reales —las
 * que llegan desde useLogStore.getPendingTasks()— efectivamente se muestren.
 */

const DAY = 86400000;

beforeEach(() => {
  localStorage.clear();
  setDemoSeedHelada(false); // evita el seed demo de helada en el agregado
});

function taskNotifs(sources) {
  return aggregateNotifications(sources).filter((n) => n.type === 'tasks_pending');
}

describe('aggregateNotifications — tareas vencidas', () => {
  it('no genera notificación sin tareas', () => {
    expect(taskNotifs({ tasks: [] })).toHaveLength(0);
    expect(taskNotifs({})).toHaveLength(0);
  });

  it('una tarea con due_date en el pasado se reporta como vencida', () => {
    const past = new Date(Date.now() - DAY).toISOString();
    const out = taskNotifs({ tasks: [{ due_date: past, title: 'Podar tomate' }] });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('warning');
    expect(out[0].title).toMatch(/1 tarea vencida/);
  });

  it('NO reporta tareas con fecha futura', () => {
    const future = new Date(Date.now() + DAY).toISOString();
    expect(taskNotifs({ tasks: [{ due_date: future, title: 'Cosechar' }] })).toHaveLength(0);
  });

  it('FALLBACK: un log--task con timestamp Unix (segundos) en el pasado se reporta vencido', () => {
    const pastUnix = Math.floor((Date.now() - DAY) / 1000); // FarmOS usa segundos
    const out = taskNotifs({ tasks: [{ timestamp: pastUnix, name: 'Regar invernadero' }] });
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('tasks_pending');
  });

  it('FALLBACK: un log--task con timestamp Unix futuro NO se reporta', () => {
    const futureUnix = Math.floor((Date.now() + DAY) / 1000);
    expect(taskNotifs({ tasks: [{ timestamp: futureUnix, name: 'Sembrar' }] })).toHaveLength(0);
  });

  it('más de 3 tareas vencidas eleva la severidad a crítica', () => {
    const past = Math.floor((Date.now() - DAY) / 1000);
    const tasks = Array.from({ length: 4 }, (_, i) => ({ timestamp: past, name: `Tarea ${i}` }));
    const out = taskNotifs({ tasks });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('critical');
  });
});
