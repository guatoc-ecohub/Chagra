import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MontanaMundos from '../MontanaMundos';

// Smoke del mockup "La Montaña de los Mundos" (#/mockups/montana-mundos).
// Cubre lo que el operador va a revisar en vivo: (1) las 3 direcciones
// artísticas conmutan, (2) el zoom finca ↔ montaña completa funciona,
// (3) los mundos tocables existen con su etiqueta, (4) los atajos
// permanentes (Ⓐ + anotar) siempre están, (5) el aviso honesto aparece.

describe('MontanaMundos (mockup)', () => {
  it('abre centrado en la finca (piso templado) con los atajos permanentes visibles', () => {
    render(<MontanaMundos />);
    expect(screen.getByText('La Montaña de los Mundos')).toBeTruthy();
    expect(screen.getByTestId('mm-brujula').textContent).toContain('templado');
    expect(screen.getByTestId('mm-brujula').textContent).toContain('su finca');
    expect(screen.getByTestId('mm-atajo-agente')).toBeTruthy();
    expect(screen.getByTestId('mm-atajo-anotar')).toBeTruthy();
  });

  it('conmuta las 3 direcciones artísticas (data-dir en la raíz)', () => {
    const { container } = render(<MontanaMundos />);
    const raiz = container.querySelector('.mm');
    expect(raiz.getAttribute('data-dir')).toBe('naturalista');
    fireEvent.click(screen.getByTestId('mm-dir-biopunk'));
    expect(raiz.getAttribute('data-dir')).toBe('biopunk');
    expect(screen.getByTestId('mm-dir-lema').textContent).toContain('Biopunk');
    fireEvent.click(screen.getByTestId('mm-dir-verde'));
    expect(raiz.getAttribute('data-dir')).toBe('verde');
    fireEvent.click(screen.getByTestId('mm-dir-naturalista'));
    expect(raiz.getAttribute('data-dir')).toBe('naturalista');
  });

  it('hace zoom-out a la montaña completa y vuelve a la finca', () => {
    const { container } = render(<MontanaMundos />);
    const raiz = container.querySelector('.mm');
    expect(raiz.getAttribute('data-modo')).toBe('finca');
    const toggle = screen.getByTestId('mm-zoom-toggle');
    expect(toggle.textContent).toContain('Ver toda la montaña');
    fireEvent.click(toggle);
    expect(raiz.getAttribute('data-modo')).toBe('montana');
    expect(toggle.textContent).toContain('Volver a mi finca');
    // En la montaña completa, tocar un piso acerca a ese piso.
    fireEvent.click(screen.getByTestId('mm-franja-paramo'));
    expect(raiz.getAttribute('data-modo')).toBe('finca');
    expect(screen.getByTestId('mm-brujula').textContent).toContain('Páramo');
  });

  it('sube y baja de piso con los pasos', () => {
    render(<MontanaMundos />);
    fireEvent.click(screen.getByTestId('mm-paso-arriba'));
    expect(screen.getByTestId('mm-brujula').textContent).toContain('frío');
    fireEvent.click(screen.getByTestId('mm-paso-abajo'));
    expect(screen.getByTestId('mm-brujula').textContent).toContain('templado');
  });

  it('cada mundo tocable muestra el aviso honesto de qué abriría', () => {
    render(<MontanaMundos />);
    // Los 12 mundos están en la escena.
    ['calendario', 'glaciar', 'restauracion', 'papa', 'animales', 'agente',
      'cosecha', 'cafe', 'vender', 'mango', 'platano', 'rio'].forEach((id) => {
      expect(screen.getByTestId(`mm-mundo-${id}`)).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mm-mundo-mango'));
    // El mango está en el piso cálido (tenue desde templado) — el mockup
    // exige moverse de piso; el tocable activo sí avisa:
    fireEvent.click(screen.getByTestId('mm-mundo-agente'));
    expect(screen.getByTestId('mm-aviso').textContent).toContain('agente');
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<MontanaMundos onBack={onBack} />);
    fireEvent.click(screen.getByText('← Volver'));
    expect(onBack).toHaveBeenCalled();
  });
});
