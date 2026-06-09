import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DailyTasksView from '../DailyTasksView';

const stageOrder = [
  { code: 'sowing', label: 'Siembra' },
  { code: 'vegetative', label: 'Vegetativo' },
  { code: 'flowering', label: 'Floración' },
  { code: 'harvest_window', label: 'Cosecha' },
  { code: 'closed', label: 'Cerrado' },
];

describe('DailyTasksView', () => {
  it('muestra vacio si no hay procesos', () => {
    render(<DailyTasksView processes={[]} stageOrder={stageOrder} />);
    expect(screen.getByText(/No hay tareas pendientes/)).toBeDefined();
  });

  it('genera tareas para proceso activo', () => {
    const processes = [{
      process_id: 'p1',
      attributes: {
        subject_label: 'Tomate',
        current_stage: 'vegetative',
      },
    }];
    render(<DailyTasksView processes={processes} stageOrder={stageOrder} />);
    expect(screen.getByText('Tomate')).toBeDefined();
    expect(screen.getAllByText(/Riego/).length).toBeGreaterThanOrEqual(1);
  });

  it('muestra contador de tareas urgentes', () => {
    const processes = [{
      process_id: 'p1',
      attributes: { subject_label: 'Café', current_stage: 'sowing' },
    }];
    render(<DailyTasksView processes={processes} stageOrder={stageOrder} />);
    expect(screen.getByText(/urgente/)).toBeDefined();
  });

  it('muestra contador urgente si la etapa closed todavía tiene tareas altas', () => {
    const processes = [{
      process_id: 'p1',
      attributes: { subject_label: 'Test', current_stage: 'closed' },
    }];
    render(<DailyTasksView processes={processes} stageOrder={stageOrder} />);
    expect(screen.getByText(/tarea[s]? urgente[s]?/i)).toBeDefined();
  });
});
