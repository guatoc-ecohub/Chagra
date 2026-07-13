import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BackgroundSelector from '../BackgroundSelector';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
} from '../../../store/useThemeBackgroundStore';

describe('BackgroundSelector smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default universal: "Cosecha mística" (biopunk-4). El fondo "Clásico"
    // fue eliminado del catálogo (operador 2026-06-02).
    useThemeBackgroundStore.getState().setBackground('biopunk-4');
  });

  it('renderiza las opciones de fondo del catálogo (4 biopunk, sin Clásico)', () => {
    render(<BackgroundSelector />);
    expect(screen.queryByText('Clásico')).not.toBeInTheDocument();
    expect(screen.getByText('Páramo completo')).toBeInTheDocument();
    expect(screen.getByText('Colibrí tech')).toBeInTheDocument();
    expect(screen.getByText('Bosque ilustrado')).toBeInTheDocument();
    expect(screen.getByText('Cosecha mística')).toBeInTheDocument();
  });

  it('Cosecha mística (default universal) seleccionado por default', () => {
    render(<BackgroundSelector />);
    const misticaBtn = screen.getByText('Cosecha mística').closest('button');
    expect(misticaBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('estado del store preselecciona el fondo al montar', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-3');
    render(<BackgroundSelector />);
    const bosqueBtn = screen.getByText('Bosque ilustrado').closest('button');
    expect(bosqueBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('cada opción muestra un thumbnail img', () => {
    render(<BackgroundSelector />);
    const imgs = document.querySelectorAll('img');
    expect(imgs.length).toBe(BACKGROUND_CATALOG.length);
    imgs.forEach((img) => expect(img).toHaveAttribute('loading', 'lazy'));
  });

  // ── Vista ampliada (modal de preview) ──────────────────────────────────────

  it('click en miniatura abre la vista ampliada con dialog role', () => {
    render(<BackgroundSelector />);
    const paramoBtn = screen.getByText('Páramo completo').closest('button');
    fireEvent.click(paramoBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute(
      'aria-label',
      'Vista completa: Páramo completo'
    );
  });

  it('la vista ampliada muestra la imagen COMPLETA (contain, src no vacío)', () => {
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Colibrí tech').closest('button'));

    const dialog = screen.getByRole('dialog');
    // La imagen principal de la vista ampliada tiene alt = opt.label
    const previewImg = dialog.querySelector('img[alt="Colibrí tech"]');
    expect(previewImg).toBeInTheDocument();
    expect(/** @type {HTMLImageElement} */ (previewImg).src).toBeTruthy();
    expect(/** @type {HTMLImageElement} */ (previewImg).src).not.toBe('');
    // imagen COMPLETA, sin recorte: object-fit:contain (rediseño aprobado,
    // reemplaza el borde eléctrico cónico que la tapaba — #1261).
    expect(/** @type {HTMLElement} */ (previewImg).style.objectFit).toBe('contain');
  });

  it('la vista ampliada dibuja el micelio en el borde (no el borde eléctrico viejo)', () => {
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Cosecha mística').closest('button'));

    const dialog = screen.getByRole('dialog');
    // El micelio aprobado: SVG con contorno-madre + rayos pulse + esporas.
    const mycelium = dialog.querySelector('svg.chagra-mycelium');
    expect(mycelium).toBeInTheDocument();
    // rayo que recorre el perímetro (stroke-dashoffset) + esporas que laten
    expect(mycelium.querySelectorAll('.chagra-myc-pulse').length).toBeGreaterThanOrEqual(2);
    expect(mycelium.querySelectorAll('.chagra-myc-spore').length).toBeGreaterThanOrEqual(1);
    // pathLength normalizado → el rayo recorre el borde idéntico en cualquier
    // aspect-ratio real (no fijo 3/4 como el prototipo).
    const pulse = mycelium.querySelector('.chagra-myc-pulse');
    expect(pulse.getAttribute('pathLength')).toBe('1360');

    // El borde eléctrico cónico rechazado (#1261) NO debe existir.
    expect(dialog.querySelector('.chagra-espin')).not.toBeInTheDocument();
    expect(dialog.querySelector('.chagra-etrace')).not.toBeInTheDocument();
  });

  it('el micelio respeta prefers-reduced-motion (animación apagada por CSS)', () => {
    // El CSS global del micelio incluye la regla reduce → animation:none.
    const styleEl = document.getElementById('chagra-mycelium-border-css');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(styleEl.textContent).toMatch(/animation:\s*none/);
  });

  it('botón Elegir este fondo aplica el fondo y cierra el modal', () => {
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Páramo completo').closest('button'));
    fireEvent.click(screen.getByText('Elegir este fondo'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-1');
    expect(JSON.parse(localStorage.getItem('chagra:background:v1')).state.selected).toBe('biopunk-1');
  });

  it('botón cerrar (X) descarta el modal sin cambiar la selección', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-4');
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Páramo completo').closest('button'));

    const closeBtn = screen.getByLabelText('Cerrar vista previa');
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // la selección NO cambió
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-4');
  });

  it('Escape cierra la vista ampliada sin cambiar la selección', () => {
    useThemeBackgroundStore.getState().setBackground('biopunk-4');
    render(<BackgroundSelector />);
    fireEvent.click(screen.getByText('Colibrí tech').closest('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-4');
  });
});
