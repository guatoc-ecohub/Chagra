/**
 * ThemeLivePreview — render vivo real del tema en la galería del selector.
 *
 * Cubre el contrato anti-drift:
 *   - el escenario vive DENTRO de un contenedor con data-theme="<tema>"
 *     (la indirección CSS-var re-teje los tokens reales del tema).
 *   - los temas de piel base (biopunk/biopunk2) TAMBIÉN llevan data-theme en
 *     el contenedor (los selectores base de index.css/themes.css los re-anclan).
 *   - decorativo puro: aria-hidden y CERO elementos interactivos (el nombre
 *     accesible vive en el botón padre de la galería).
 *   - usa las clases REALES de la app (v3-card, v3-bubble-user, sello,
 *     agent-send-accent) y NO colores hard-codeados por tema.
 *   - inyecta el CSS real del cuaderno (AGENT_V3_CSS) una sola vez.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ThemeLivePreview from '../ThemeLivePreview';
import { THEME_IDS } from '../../../hooks/useTheme';

afterEach(cleanup);

describe('ThemeLivePreview — miniatura viva del tema', () => {
  it('renderiza el escenario dentro de data-theme="<tema>" para CADA tema seleccionable', () => {
    for (const id of THEME_IDS.filter((t) => t !== 'auto')) {
      const { container, unmount } = render(<ThemeLivePreview themeId={id} />);
      const stage = container.querySelector(`[data-theme="${id}"]`);
      expect(stage, `escenario con data-theme=${id}`).toBeTruthy();
      unmount();
    }
  });

  it('biopunk (piel base) también lleva data-theme en el contenedor (re-ancla la base)', () => {
    const { container } = render(<ThemeLivePreview themeId="biopunk2" />);
    expect(container.querySelector('[data-theme="biopunk2"]')).toBeTruthy();
  });

  it('es decorativo: aria-hidden, pointer-events off y sin elementos interactivos', () => {
    const { container } = render(<ThemeLivePreview themeId="nature" />);
    const root = container.firstElementChild;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.className).toContain('pointer-events-none');
    expect(container.querySelectorAll('button, a, input, select, textarea').length).toBe(0);
  });

  it('usa las superficies y burbujas REALES de la app (clases, no hex propios)', () => {
    const { container } = render(<ThemeLivePreview themeId="minimalista" />);
    expect(container.querySelector('.v3-card[data-grounded="true"]')).toBeTruthy();
    expect(container.querySelector('.v3-bubble-user')).toBeTruthy();
    expect(container.querySelector('.sello[data-nivel="verde"]')).toBeTruthy();
    expect(container.querySelector('.agent-send-accent')).toBeTruthy();
    expect(container.querySelector('.bg-surface')).toBeTruthy();
  });

  it('inyecta el CSS real del cuaderno (AGENT_V3_CSS) UNA sola vez', () => {
    render(<ThemeLivePreview themeId="nature" />);
    render(<ThemeLivePreview themeId="biopunk" />);
    const styles = document.querySelectorAll('#theme-live-preview-v3-css');
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toContain('.v3-card');
    expect(styles[0].textContent).toContain('.v3-bubble-user');
  });

  it('escala el escenario con transform: scale() (mecánica de miniatura)', () => {
    const { container } = render(<ThemeLivePreview themeId="verde-vivo" />);
    const stage = /** @type {HTMLElement} */ (
      container.querySelector('[data-live-stage="verde-vivo"]')
    );
    expect(stage.style.transform).toMatch(/^scale\(/);
  });
});
