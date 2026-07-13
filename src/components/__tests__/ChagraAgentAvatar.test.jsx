/**
 * ChagraAgentAvatar — task #122.
 *
 * Cubre las extensiones añadidas para el sistema global de notificaciones:
 *   - `glow` prop agrega la clase `chagra-glow` al SVG raíz.
 *   - `onDoubleClick` se invoca al doble-click del wrapper button.
 *   - a11y: aria-label custom + role="img" + tooltip title presente cuando
 *     hay onDoubleClick.
 *
 * 2026-05-28: el avatar default del wrapper cambió a la foto-realista
 * (ChagraAgentAvatarColibriPhoto). Estos tests verifican la rama SVG, así
 * que el beforeEach fuerza `colibri_svg` en localStorage. La rama foto
 * tiene su propio smoke test (ChagraAgentAvatarColibriPhoto si se añade).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import ChagraAgentAvatarMaiz from '../ChagraAgentAvatarMaiz';

describe('ChagraAgentAvatar — task #122 glow + double-click', () => {
  beforeEach(() => {
    localStorage.setItem('chagra:agent-avatar-type', 'colibri_svg');
  });
  afterEach(() => {
    localStorage.clear();
  });
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

describe('ChagraAgentAvatarMaiz — prefers-reduced-motion (task #6240)', () => {
  test('maíz tiene media query prefers-reduced-motion en CSS inline', () => {
    const { container } = render(<ChagraAgentAvatarMaiz state="idle" onClick={() => {}} onDoubleClick={() => {}} ariaLabel="test" />);
    const styleTag = container.querySelector('style');
    expect(styleTag).toBeInTheDocument();

    const cssContent = styleTag.textContent;
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssContent).toContain('animation: none !important');
  });

  test('maíz respeta prefers-reduced-motion: desactiva animaciones', () => {
    // Mock window.matchMedia para simular prefers-reduced-motion: reduce
    const mockMatchMedia = vi.fn();
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    // Guardar el matchMedia original
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = mockMatchMedia;

    const { container } = render(<ChagraAgentAvatarMaiz state="thinking" glow onClick={() => {}} onDoubleClick={() => {}} ariaLabel="test" />);
    const styleTag = container.querySelector('style');
    const cssContent = styleTag.textContent;

    // Verificar que la media query esté presente
    expect(cssContent).toMatch(/@media \(prefers-reduced-motion: reduce\)/);

    // Verificar que dentro de la media query se desactiven las animaciones
    const reducedMotionBlock = cssContent.match(/@media \(prefers-reduced-motion: reduce\) \{([^}]+)\}/);
    expect(reducedMotionBlock).toBeTruthy();

    const reducedMotionCSS = reducedMotionBlock[1];
    expect(reducedMotionCSS).toContain('animation: none !important');

    // Restaurar el matchMedia original
    window.matchMedia = originalMatchMedia;
  });

  test('maíz con glow + prefers-reduced-motion usa filtro estático', () => {
    const { container } = render(<ChagraAgentAvatarMaiz state="idle" glow onClick={() => {}} onDoubleClick={() => {}} ariaLabel="test" />);
    const styleTag = container.querySelector('style');
    const cssContent = styleTag.textContent;

    // Verificar que la media query esté presente
    expect(cssContent).toMatch(/@media \(prefers-reduced-motion: reduce\)/);

    // El glow con reduced motion debe tener filter estático (drop-shadow)
    // Buscar específicamente la regla de glow dentro de la media query
    expect(cssContent).toMatch(/\.chagra-maiz\.chagra-glow.*filter:\s*drop-shadow\(.*\)/s);
  });

  test('maíz: todos los keyframes tienen nombres descriptivos', () => {
    const { container } = render(<ChagraAgentAvatarMaiz state="idle" onClick={() => {}} onDoubleClick={() => {}} ariaLabel="test" />);
    const styleTag = container.querySelector('style');
    const cssContent = styleTag.textContent;

    // Verificar que los keyframes principales existan
    expect(cssContent).toContain('@keyframes chagra-halo-pulse');
    expect(cssContent).toContain('@keyframes chagra-hoja-sway-l');
    expect(cssContent).toContain('@keyframes chagra-hoja-sway-r');
    expect(cssContent).toContain('@keyframes chagra-barbas-wiggle');
    expect(cssContent).toContain('@keyframes chagra-hoja-think');
    expect(cssContent).toContain('@keyframes chagra-panocha-vibrate');
    expect(cssContent).toContain('@keyframes chagra-planta-lean');
    expect(cssContent).toContain('@keyframes chagra-glow-amber');
  });
});
