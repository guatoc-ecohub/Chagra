import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BackgroundSelector from '../BackgroundSelector';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
} from '../../../store/useThemeBackgroundStore';

describe('BackgroundSelector smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeBackgroundStore.getState().setBackground('default');
  });

  it('renderiza las 4 opciones de fondo', () => {
    render(<BackgroundSelector />);
    expect(screen.getByText('Clásico')).toBeInTheDocument();
    expect(screen.getByText('Páramo completo')).toBeInTheDocument();
    expect(screen.getByText('Colibrí tech')).toBeInTheDocument();
    expect(screen.getByText('Bosque ilustrado')).toBeInTheDocument();
  });

  it('Clásico (default) seleccionado por default', () => {
    render(<BackgroundSelector />);
    const clasicoBtn = screen.getByText('Clásico').closest('button');
    expect(clasicoBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('click en otro fondo cambia la selección y persiste', () => {
    render(<BackgroundSelector />);
    const paramoBtn = screen.getByText('Páramo completo').closest('button');
    fireEvent.click(paramoBtn);

    expect(paramoBtn).toHaveAttribute('aria-pressed', 'true');
    expect(useThemeBackgroundStore.getState().selected).toBe('biopunk-1');
    expect(JSON.parse(localStorage.getItem('chagra:background:v1')).state.selected)
      .toBe('biopunk-1');

    const clasicoBtn = screen.getByText('Clásico').closest('button');
    expect(clasicoBtn).toHaveAttribute('aria-pressed', 'false');
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
});
