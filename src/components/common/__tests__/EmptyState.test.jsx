/**
 * EmptyState.test.jsx — estados vacío / error / offline reutilizables.
 *
 * Contrato visual: role="status", tono usted, CTA conectado al callback
 * del caller (no lógica propia), variante offline con mensaje calmado.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import { Leaf } from 'lucide-react';
import EmptyState, { OfflineNotice } from '../EmptyState';

describe('EmptyState', () => {
  test('renderiza título, descripción y hint con role="status"', () => {
    render(
      <EmptyState
        title="Aún no ha registrado plantas"
        description="Registre su primera siembra."
        secondaryHint="También puede crear lugares primero."
      />
    );
    const el = screen.getByTestId('empty-state');
    expect(el).toHaveAttribute('role', 'status');
    expect(screen.getByText('Aún no ha registrado plantas')).toBeInTheDocument();
    expect(screen.getByText('Registre su primera siembra.')).toBeInTheDocument();
    expect(screen.getByText('También puede crear lugares primero.')).toBeInTheDocument();
  });

  test('CTA dispara onAction al tocar', () => {
    const onAction = vi.fn();
    render(
      <EmptyState title="Vacío" actionLabel="Registrar siembra" onAction={onAction} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Registrar siembra/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  test('sin onAction NO renderiza botón (estado informativo puro)', () => {
    render(<EmptyState title="Vacío" actionLabel="Registrar" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('acepta icono custom sin romper', () => {
    render(<EmptyState icon={Leaf} title="Sin eventos" data-testid="timeline-empty" />);
    expect(screen.getByTestId('timeline-empty')).toBeInTheDocument();
  });

  test('variante error usa acento ámbar (tono tranquilo, no rojo pánico)', () => {
    render(<EmptyState variant="error" title="Algo falló" data-testid="err" />);
    const el = screen.getByTestId('err');
    expect(el.innerHTML).toMatch(/amber/);
    expect(el.innerHTML).not.toMatch(/red-500/);
  });

  test('fondo oscuro: no usa bg-white ni escala light', () => {
    const { container } = render(<EmptyState title="Vacío" />);
    expect(container.innerHTML).not.toMatch(/bg-white|bg-slate-100|bg-gray-/);
  });
});

describe('OfflineNotice', () => {
  test('mensaje offline-first calmado por defecto', () => {
    render(<OfflineNotice />);
    expect(screen.getByTestId('offline-notice')).toHaveAttribute('role', 'status');
    expect(
      screen.getByText(/Trabajando sin conexión — sus datos están a salvo/)
    ).toBeInTheDocument();
  });

  test('acepta mensaje custom', () => {
    render(<OfflineNotice message="Sin señal en la vereda." />);
    expect(screen.getByText('Sin señal en la vereda.')).toBeInTheDocument();
  });
});
