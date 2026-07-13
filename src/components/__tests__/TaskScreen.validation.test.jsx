/**
 * TaskScreen — validacion de campos requeridos (prioridad/estado).
 *
 * Tarea 76: al crear/editar tareas, el nombre es obligatorio.
 * Prioridad y estado siempre tienen defaults validos (never empty).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import TaskScreen from '../TaskScreen';

vi.mock('../../store/useAssetStore', () => ({
  default: vi.fn((selector) =>
    selector({
      plants: [],
      structures: [],
      lands: [],
      addTaskLog: vi.fn().mockResolvedValue(undefined),
      updateTaskLog: vi.fn().mockResolvedValue(undefined),
    })
  ),
}));

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('TaskScreen — validacion de formulario', () => {
  it('nombre vacio produce error en onSave', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(<TaskScreen onBack={onBack} onSave={onSave} />);

    const saveBtn = screen.getByRole('button', { name: /programar tarea/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        'El nombre de la tarea es obligatorio',
        true
      );
    });
  });

  it('prioridad tiene default "media" sin input del usuario', () => {
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(<TaskScreen onBack={onBack} onSave={onSave} />);

    const select = screen.getByRole('combobox', { name: /prioridad/i });
    expect(/** @type {HTMLSelectElement} */ (select).value).toBe('medium');
  });

  it('estado tiene default "pending" sin input del usuario', () => {
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(<TaskScreen onBack={onBack} onSave={onSave} />);

    const pendingBadges = screen.getAllByText(/pendiente/i);
    expect(pendingBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('con nombre valido: llama al store addTaskLog', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(<TaskScreen onBack={onBack} onSave={onSave} />);

    const nameInput = screen.getByPlaceholderText(/riego fertiorgánico/i);
    fireEvent.change(nameInput, { target: { value: 'Riego manana' } });

    const saveBtn = screen.getByRole('button', { name: /programar tarea/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        'Tarea agendada exitosamente (Offline-First)',
        false
      );
    });
  });

  it('modo edicion: nombre vacio tambien produce error', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();
    const initialData = {
      id: 'task-1',
      name: '',
      attributes: { status: 'pending' },
    };

    render(
      <TaskScreen onBack={onBack} onSave={onSave} initialData={initialData} />
    );

    const saveBtn = screen.getByRole('button', { name: /guardar cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        'El nombre de la tarea es obligatorio',
        true
      );
    });
  });
});
