/**
 * ChagraAgentAvatar — task #122.
 *
 * Cubre las extensiones añadidas para el sistema global de notificaciones:
 *   - `glow` prop agrega la clase `chagra-glow` al SVG raíz.
 *   - `onDoubleClick` se invoca al doble-click del wrapper button.
 *   - a11y: aria-label custom + role="img" + tooltip title presente cuando
 *     hay onDoubleClick.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import ChagraAgentAvatar from '../ChagraAgentAvatar';

describe('ChagraAgentAvatar — task #122 glow + double-click', () => {
  test('por defecto NO incluye clase chagra-glow', () => {
    const { container } = render(<ChagraAgentAvatar state="idle" />);
    const svg = container.querySelector('svg.chagra-agent-avatar');
    expect(svg).toBeInTheDocument();
    expect(svg.classList.contains('chagra-glow')).toBe(false);
  });

  test('con prop glow={true} agrega clase chagra-glow al SVG', () => {
    const { container } = render(<ChagraAgentAvatar state="idle" glow />);
    const svg = container.querySelector('svg.chagra-agent-avatar');
    expect(svg).toBeInTheDocument();
    expect(svg.classList.contains('chagra-glow')).toBe(true);
  });

  test('sin onClick ni onDoubleClick renderiza solo el SVG (no button)', () => {
    const { container } = render(<ChagraAgentAvatar state="idle" />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('con onDoubleClick envuelve en button y dispara el handler', () => {
    const onDoubleClick = vi.fn();
    render(<ChagraAgentAvatar state="idle" onDoubleClick={onDoubleClick} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    fireEvent.doubleClick(btn);
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
  });

  test('con onClick y onDoubleClick juntos cada uno dispara independiente', () => {
    const onClick = vi.fn();
    const onDoubleClick = vi.fn();
    render(<ChagraAgentAvatar state="idle" onClick={onClick} onDoubleClick={onDoubleClick} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.doubleClick(btn);
    expect(onClick).toHaveBeenCalled();
    expect(onDoubleClick).toHaveBeenCalled();
  });

  test('a11y: aria-label custom se respeta', () => {
    render(
      <ChagraAgentAvatar
        state="idle"
        onDoubleClick={() => {}}
        ariaLabel="Avatar Chagra IA, doble click para silenciar la voz"
      />,
    );
    expect(
      screen.getByRole('button', { name: /silenciar la voz/i }),
    ).toBeInTheDocument();
  });

  test('a11y: tooltip title aparece cuando hay onDoubleClick', () => {
    render(<ChagraAgentAvatar state="idle" onDoubleClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('title', expect.stringMatching(/doble click/i));
  });

  test('SVG aplica la clase de estado correspondiente', () => {
    const { container, rerender } = render(<ChagraAgentAvatar state="thinking" />);
    expect(
      container.querySelector('svg.chagra-state-thinking'),
    ).toBeInTheDocument();
    rerender(<ChagraAgentAvatar state="listening" />);
    expect(
      container.querySelector('svg.chagra-state-listening'),
    ).toBeInTheDocument();
  });

  test('glow + state coexisten sin conflicto', () => {
    const { container } = render(<ChagraAgentAvatar state="speaking" glow />);
    const svg = container.querySelector('svg.chagra-agent-avatar');
    expect(svg.classList.contains('chagra-state-speaking')).toBe(true);
    expect(svg.classList.contains('chagra-glow')).toBe(true);
  });
});
