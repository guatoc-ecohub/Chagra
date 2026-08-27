import { describe, it, expect } from 'vitest';
import { buildProactiveGreeting } from '../proactiveGreeting';

describe('proactiveGreeting - voz USTED', () => {
  it('usa "usted" en lugar de "tú" para pendientes', () => {
    const greeting = buildProactiveGreeting({
      activeAlerts: [{ type: 'helada', severity: 'danger', title: 'Helada今晚' }],
      pendingTasks: [],
      date: new Date('2026-08-27T10:00:00'),
    });

    expect(greeting.lead).toContain('Se lo dejo');
    expect(greeting.lead).not.toContain('Te lo dejo');
  });

  it('usa "su" en lugar de "tu" en el lead de idea', () => {
    const greeting = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      cultivos: [{ name: 'Maíz', count: 5 }],
      date: new Date('2026-08-27T10:00:00'),
    });

    expect(greeting.lead).toContain('su');
    expect(greeting.lead).not.toContain('tu');
  });

  it('usa "su finca" en lugar de "tu finca"', () => {
    const greeting = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      altitud: 1800,
      date: new Date('2026-08-27T10:00:00'),
    });

    expect(greeting.lead).toContain('Su finca');
    expect(greeting.lead).not.toContain('Tu finca');
  });

  it('usa "le" en lugar de "te" en las preguntas', () => {
    const greeting = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      cultivos: [{ name: 'Maíz', count: 5 }],
      date: new Date('2026-08-27T10:00:00'),
    });

    expect(greeting.lead).toMatch(/Le armo|Le muestro|Quiere que/);
    expect(greeting.lead).not.toMatch(/Te armo|te muestro|Quieres que/);
  });

  it('usa "cuénteme" en lugar de "cuéntame"', () => {
    const greeting = buildProactiveGreeting({
      activeAlerts: [],
      pendingTasks: [],
      date: new Date('2026-08-27T10:00:00'),
    });

    expect(greeting.lead).toContain('cuénteme');
    expect(greeting.lead).not.toContain('cuéntame');
  });
});
