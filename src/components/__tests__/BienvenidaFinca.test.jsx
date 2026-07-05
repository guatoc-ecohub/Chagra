// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * BienvenidaFinca — secuencia de primera vez (3 momentos).
 *
 * Cubre la CAPA VISUAL y su contrato de gating:
 *   - Momento 1 (colibrí + "Esta chagra es suya") → Siguiente → momento 2
 *     (3 capacidades estrella, la verificada con borde cosido) → Siguiente →
 *     momento 3 (ubicación mágica).
 *   - "Ubicar mi finca" marca la flag persistente y delega en onUbicar (la
 *     navegación a 'ubicacion-detectada' vive en DashboardLive, sin lógica
 *     nueva de permisos).
 *   - "Saltar" / "Ahora no" marcan la flag y llaman onClose.
 *   - Helpers bienvenidaYaVista()/marcarBienvenidaVista() (una sola vez).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../services/ttsService', () => ({
  speakSentences: vi.fn(() => Promise.resolve()),
}));

import BienvenidaFinca, {
  bienvenidaYaVista,
  marcarBienvenidaVista,
} from '../BienvenidaFinca';
import { MSG } from '../../config/messages.js';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

const avanzarHastaUbicacion = () => {
  fireEvent.click(screen.getByTestId('bienvenida-siguiente')); // → capacidades
  fireEvent.click(screen.getByTestId('bienvenida-siguiente')); // → ubicación
};

describe('BienvenidaFinca — secuencia de 3 momentos', () => {
  it('arranca en la bienvenida y avanza por las capacidades hasta la ubicación', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);

    // Momento 1: identidad finca-viva.
    expect(screen.getByText(MSG.bienvenida.titulo1)).toBeTruthy();
    expect(screen.getByText(MSG.bienvenida.pasoDe(1, 3))).toBeTruthy();

    // Momento 2: las 3 capacidades estrella.
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    expect(screen.getByText(MSG.bienvenida.capVozTitulo)).toBeTruthy();
    expect(screen.getByText(MSG.bienvenida.capFotoTitulo)).toBeTruthy();
    expect(screen.getByText(MSG.bienvenida.capVerifTitulo)).toBeTruthy();

    // Momento 3: la ubicación como momento de magia.
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    expect(screen.getByText(MSG.bienvenida.titulo3)).toBeTruthy();
    expect(screen.getByTestId('bienvenida-ubicar')).toBeTruthy();
  });

  it('"Ubicar mi finca" marca la flag y delega en onUbicar', () => {
    const onUbicar = vi.fn();
    const onClose = vi.fn();
    render(<BienvenidaFinca onUbicar={onUbicar} onClose={onClose} />);

    avanzarHastaUbicacion();
    fireEvent.click(screen.getByTestId('bienvenida-ubicar'));

    expect(onUbicar).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(bienvenidaYaVista()).toBe(true);
  });

  it('"Ahora no" en la ubicación marca la flag y cierra sin navegar', () => {
    const onUbicar = vi.fn();
    const onClose = vi.fn();
    render(<BienvenidaFinca onUbicar={onUbicar} onClose={onClose} />);

    avanzarHastaUbicacion();
    fireEvent.click(screen.getByTestId('bienvenida-ahora-no'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUbicar).not.toHaveBeenCalled();
    expect(bienvenidaYaVista()).toBe(true);
  });

  it('"Saltar" desde el primer momento marca la flag y cierra', () => {
    const onClose = vi.fn();
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={onClose} />);

    fireEvent.click(
      screen.getByRole('button', { name: MSG.bienvenida.saltarAria }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(bienvenidaYaVista()).toBe(true);
  });

  it('Escape cierra la secuencia (misma vía que saltar)', () => {
    const onClose = vi.fn();
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(screen.getByTestId('bienvenida-finca'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(bienvenidaYaVista()).toBe(true);
  });

  it('la tarjeta de respuestas verificadas lleva el borde cosido (la costura)', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));

    const verificada = screen
      .getByText(MSG.bienvenida.capVerifTitulo)
      .closest('.bienvenida-verificada');
    expect(verificada).toBeTruthy();
  });

  it('helpers: bienvenidaYaVista refleja marcarBienvenidaVista', () => {
    expect(bienvenidaYaVista()).toBe(false);
    marcarBienvenidaVista();
    expect(bienvenidaYaVista()).toBe(true);
  });

  it('sin onExplorarEjemplo NO muestra el botón de finca de ejemplo', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
    avanzarHastaUbicacion();
    expect(screen.queryByTestId('bienvenida-explorar-ejemplo')).toBeNull();
  });

  it('"Explorar con finca de ejemplo" marca la flag y delega en onExplorarEjemplo', async () => {
    const onExplorarEjemplo = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    render(
      <BienvenidaFinca onUbicar={vi.fn()} onClose={onClose} onExplorarEjemplo={onExplorarEjemplo} />,
    );

    avanzarHastaUbicacion();
    fireEvent.click(screen.getByTestId('bienvenida-explorar-ejemplo'));

    expect(onExplorarEjemplo).toHaveBeenCalledTimes(1);
    expect(bienvenidaYaVista()).toBe(true);
  });

  it('el momento 2 muestra la capacidad de herramientas ("juguetes")', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    expect(screen.getByText(MSG.bienvenida.capHerramTitulo)).toBeTruthy();
  });
});
