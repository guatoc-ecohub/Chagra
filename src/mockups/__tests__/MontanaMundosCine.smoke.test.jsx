import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MontanaMundosCine from '../MontanaMundosCine';

// Smoke de la PASADA 3 CINEMATOGRÁFICA (#/mockups/montana-mundos-cine).
// Cubre lo que el operador va a revisar en vivo: (1) las 3 direcciones
// conmutan, (2) el zoom finca ↔ montaña funciona, (3) los mundos tocables
// existen, (4) los atajos permanentes están, (5) el grade de luz sigue al
// piso activo, (6) las 6 capas parallax montan, (7) la rueda camina pisos,
// (8) el momento de llegada a la finca dispara, (9) el estado de viaje se
// marca al mover la cámara, (10) la vida ambiental de la pasada 3 monta.

describe('MontanaMundosCine (mockup pasada 3)', () => {
  it('abre centrado en la finca (piso templado) con los atajos permanentes visibles', () => {
    render(<MontanaMundosCine />);
    expect(screen.getByText('La Montaña de los Mundos')).toBeTruthy();
    expect(screen.getByTestId('mm2-brujula').textContent).toContain('templado');
    expect(screen.getByTestId('mm2-brujula').textContent).toContain('su finca');
    expect(screen.getByTestId('mm2-atajo-agente')).toBeTruthy();
    expect(screen.getByTestId('mm2-atajo-anotar')).toBeTruthy();
  });

  it('monta las 6 capas de cámara del parallax', () => {
    const { container } = render(<MontanaMundosCine />);
    ['cielo', 'lejos', 'medio', 'principal', 'niebla', 'cerca'].forEach((capa) => {
      expect(container.querySelector(`.mm2-capa-${capa}`)).toBeTruthy();
    });
    // Cada capa lleva su propio transform (velocidades distintas de cámara).
    const cielo = container.querySelector('.mm2-capa-cielo');
    const principal = container.querySelector('.mm2-capa-principal');
    expect(cielo.style.transform).not.toBe(principal.style.transform);
  });

  it('conmuta las 3 direcciones artísticas (data-dir en la raíz)', () => {
    const { container } = render(<MontanaMundosCine />);
    const raiz = container.querySelector('.mm2');
    expect(raiz.getAttribute('data-dir')).toBe('naturalista');
    fireEvent.click(screen.getByTestId('mm2-dir-biopunk'));
    expect(raiz.getAttribute('data-dir')).toBe('biopunk');
    expect(screen.getByTestId('mm2-dir-lema').textContent).toContain('Biopunk');
    fireEvent.click(screen.getByTestId('mm2-dir-verde'));
    expect(raiz.getAttribute('data-dir')).toBe('verde');
    fireEvent.click(screen.getByTestId('mm2-dir-naturalista'));
    expect(raiz.getAttribute('data-dir')).toBe('naturalista');
  });

  it('hace zoom-out a la montaña completa y vuelve a la finca', () => {
    const { container } = render(<MontanaMundosCine />);
    const raiz = container.querySelector('.mm2');
    expect(raiz.getAttribute('data-modo')).toBe('finca');
    const toggle = screen.getByTestId('mm2-zoom-toggle');
    expect(toggle.textContent).toContain('Ver toda la montaña');
    fireEvent.click(toggle);
    expect(raiz.getAttribute('data-modo')).toBe('montana');
    expect(toggle.textContent).toContain('Volver a mi finca');
    fireEvent.click(screen.getByTestId('mm2-franja-paramo'));
    expect(raiz.getAttribute('data-modo')).toBe('finca');
    expect(screen.getByTestId('mm2-brujula').textContent).toContain('Páramo');
  });

  it('el grade de luz atmosférica sigue al piso activo', () => {
    const { container } = render(<MontanaMundosCine />);
    // Abre en la finca: hora dorada del templado encendida.
    expect(container.querySelector('.mm2-grade-templado.es-activo')).toBeTruthy();
    expect(container.querySelector('.mm2-grade-nevado.es-activo')).toBeFalsy();
    fireEvent.click(screen.getByTestId('mm2-paso-arriba'));
    expect(container.querySelector('.mm2-grade-frio.es-activo')).toBeTruthy();
    expect(container.querySelector('.mm2-grade-templado.es-activo')).toBeFalsy();
  });

  it('sube y baja de piso con los pasos y con la rueda', () => {
    render(<MontanaMundosCine />);
    fireEvent.click(screen.getByTestId('mm2-paso-arriba'));
    expect(screen.getByTestId('mm2-brujula').textContent).toContain('frío');
    fireEvent.click(screen.getByTestId('mm2-paso-abajo'));
    expect(screen.getByTestId('mm2-brujula').textContent).toContain('templado');
    // La rueda del mouse también camina la montaña (scroll suave por pisos).
    fireEvent.wheel(screen.getByTestId('mm2-viewport'), { deltaY: 200 });
    expect(screen.getByTestId('mm2-brujula').textContent).toContain('cálido');
  });

  it('cada mundo tocable muestra el aviso honesto de qué abriría', () => {
    render(<MontanaMundosCine />);
    ['calendario', 'glaciar', 'restauracion', 'papa', 'animales', 'agente',
      'cosecha', 'cafe', 'vender', 'mango', 'platano', 'rio'].forEach((id) => {
      expect(screen.getByTestId(`mm2-mundo-${id}`)).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mm2-mundo-agente'));
    expect(screen.getByTestId('mm2-aviso').textContent).toContain('agente');
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<MontanaMundosCine onBack={onBack} />);
    fireEvent.click(screen.getByText('← Volver'));
    expect(onBack).toHaveBeenCalled();
  });

  // ── Pasada 3 ──

  it('dispara el momento de llegada a la finca al abrir (bloom + anillos + chispas)', () => {
    const { container } = render(<MontanaMundosCine />);
    // Abre en la finca: la app lo recibe en casa con el momento "wow".
    expect(container.querySelector('.mm2').getAttribute('data-llegada')).toBe('true');
    const llegada = screen.getByTestId('mm2-llegada');
    expect(llegada.querySelector('.mm2-llegada-bloom')).toBeTruthy();
    expect(llegada.querySelectorAll('.mm2-llegada-anillo').length).toBe(2);
    expect(llegada.querySelectorAll('.mm2-chispa').length).toBe(6);
  });

  it('marca el estado de viaje cuando la cámara se mueve de piso', () => {
    const { container } = render(<MontanaMundosCine />);
    const raiz = container.querySelector('.mm2');
    expect(raiz.getAttribute('data-viaje')).toBeNull();
    fireEvent.click(screen.getByTestId('mm2-paso-arriba'));
    expect(raiz.getAttribute('data-viaje')).toBe('true');
  });

  it('vuelve a disparar la llegada al regresar a la finca desde otro piso', () => {
    const { container } = render(<MontanaMundosCine />);
    const raiz = container.querySelector('.mm2');
    fireEvent.click(screen.getByTestId('mm2-paso-arriba')); // sale de la finca
    fireEvent.click(screen.getByTestId('mm2-paso-abajo')); // regresa
    expect(raiz.getAttribute('data-llegada')).toBe('true');
    expect(screen.getByTestId('mm2-llegada')).toBeTruthy();
  });

  it('monta la vida ambiental y la textura de la pasada 3', () => {
    const { container } = render(<MontanaMundosCine />);
    ['mm2-bandada', 'mm2-colibri', 'mm2-luciernagas', 'mm2-hojas-caen',
      'mm2-rocas', 'mm2-pedrisco', 'mm2-destellos', 'mm2-jirones', 'mm2-pasta'].forEach((clase) => {
      expect(container.querySelector(`.${clase}`), clase).toBeTruthy();
    });
  });
});
