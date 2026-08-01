import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BackgroundSelector from '../BackgroundSelector';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
} from '../../../store/useThemeBackgroundStore';

/*
 * Post 2026-07-16: los fondos son GRADIENTES andinos (3), no fotos. Las 4 fotos
 * biopunk (todas con un oso de anteojos AI-realista que el operador rechazó) se
 * archivaron. Los previews se dibujan con un <div> de background, ya no <img>.
 */
describe('BackgroundSelector smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeBackgroundStore.getState().setBackground('valle-calido');
  });

  it('renderiza las opciones del catálogo (3 gradientes andinos, sin fotos-oso)', () => {
    render(<BackgroundSelector />);
    expect(screen.getByText('Valle cálido')).toBeInTheDocument();
    expect(screen.getByText('Páramo frío')).toBeInTheDocument();
    expect(screen.getByText('Noche andina')).toBeInTheDocument();
    // Las fotos-oso viejas ya no aparecen.
    expect(screen.queryByText('Páramo completo')).not.toBeInTheDocument();
    expect(screen.queryByText('Cosecha mística')).not.toBeInTheDocument();
    expect(screen.queryByText('Clásico')).not.toBeInTheDocument();
  });

  it('Valle cálido (default universal) seleccionado por default', () => {
    render(<BackgroundSelector />);
    const btn = screen.getByText('Valle cálido').closest('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('el estado del store preselecciona el fondo al montar', () => {
    useThemeBackgroundStore.getState().setBackground('noche-andina');
    render(<BackgroundSelector />);
    const btn = screen.getByText('Noche andina').closest('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('hay una opción por cada entrada del catálogo y ya no hay <img>', () => {
    render(<BackgroundSelector />);
    expect(document.querySelectorAll('img').length).toBe(0);
    const botones = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    expect(botones.length).toBe(BACKGROUND_CATALOG.length);
  });

  it('click en miniatura abre la vista ampliada con dialog role', () => {
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Valle cálido').closest('button'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-label', 'Vista completa: Valle cálido');
  });

  it('la vista ampliada muestra el fondo (role=img con el gradiente)', () => {
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Páramo frío').closest('button'));
    const dialog = screen.getByRole('dialog');
    const preview = dialog.querySelector('[role="img"][aria-label="Páramo frío"]');
    expect(preview).toBeInTheDocument();
    expect(/** @type {HTMLElement} */ (preview).style.background).toContain('gradient');
  });

  it('la vista ampliada dibuja el micelio en el borde (no el borde eléctrico viejo)', () => {
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Noche andina').closest('button'));
    const dialog = screen.getByRole('dialog');
    const mycelium = dialog.querySelector('svg.chagra-mycelium');
    expect(mycelium).toBeInTheDocument();
    expect(mycelium.querySelectorAll('.chagra-myc-pulse').length).toBeGreaterThanOrEqual(2);
    expect(mycelium.querySelectorAll('.chagra-myc-spore').length).toBeGreaterThanOrEqual(1);
    expect(dialog.querySelector('.chagra-espin')).not.toBeInTheDocument();
  });

  it('el micelio respeta prefers-reduced-motion (animación apagada por CSS)', () => {
    const styleEl = document.getElementById('chagra-mycelium-border-css');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(styleEl.textContent).toMatch(/animation:\s*none/);
  });

  it('botón Elegir este fondo aplica el fondo y cierra el modal', () => {
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Valle cálido').closest('button'));
    fireEvent.click(screen.getByText('Elegir este fondo'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useThemeBackgroundStore.getState().selected).toBe('valle-calido');
  });

  it('botón cerrar (X) descarta el modal sin cambiar la selección', () => {
    useThemeBackgroundStore.getState().setBackground('noche-andina');
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Valle cálido').closest('button'));
    fireEvent.click(screen.getByLabelText('Cerrar vista previa'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useThemeBackgroundStore.getState().selected).toBe('noche-andina');
  });

  it('Escape cierra la vista ampliada sin cambiar la selección', () => {
    useThemeBackgroundStore.getState().setBackground('noche-andina');
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Páramo frío').closest('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useThemeBackgroundStore.getState().selected).toBe('noche-andina');
  });
});
