/**
 * AgentOfflineGuard.test.jsx — el aviso claro de offline del agente.
 *
 * Bug offline-first 2026-06-13: abrir el agente OFFLINE con su chunk lazy no
 * cacheado caía en el ErrorBoundary genérico ("Algo falló") en vez de avisar
 * que el asistente necesita internet. El guard ahora se renderiza ANTES del
 * dynamic import. Este test verifica que el mensaje es claro y específico.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentOfflineGuard from '../AgentOfflineGuard';

describe('AgentOfflineGuard', () => {
  it('muestra aviso CLARO de que el asistente necesita internet', () => {
    render(<AgentOfflineGuard onBack={() => {}} />);
    expect(screen.getByText(/sin conexión a internet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/necesita.*internet/i).length).toBeGreaterThan(0);
  });

  it('aclara que los datos de la finca SÍ funcionan sin conexión', () => {
    render(<AgentOfflineGuard onBack={() => {}} />);
    expect(screen.getByText(/sí funcionan sin conexión/i)).toBeInTheDocument();
  });

  it('NO muestra el error técnico genérico del ErrorBoundary', () => {
    render(<AgentOfflineGuard onBack={() => {}} />);
    expect(screen.queryByText(/algo falló/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/módulo tuvo un error/i)).not.toBeInTheDocument();
  });

  it('el botón "Volver a la finca" invoca onBack', () => {
    const onBack = vi.fn();
    render(<AgentOfflineGuard onBack={onBack} />);
    fireEvent.click(screen.getByText(/volver a la finca/i));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
