// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * BienvenidaFinca — recorrido de primera vez (5 momentos).
 *
 * Cubre la CAPA VISUAL y su contrato de gating:
 *   - Momento 1 (colibrí + "Esta chagra es suya") → momento 2 (capacidades
 *     estrella, la verificada con borde cosido) → momento 3 ("Hola Chagra":
 *     hablarle con las manos ocupadas) → momento 4 (instalar la PWA: prompt
 *     nativo Android / pasos iOS / pista de menú) → momento 5 (ubicación
 *     mágica).
 *   - "Ubicar mi finca" marca la flag persistente y delega en onUbicar (la
 *     navegación a 'ubicacion-detectada' vive en DashboardLive, sin lógica
 *     nueva de permisos).
 *   - "Saltar" / "Ahora no" marcan la flag y llaman onClose.
 *   - Helpers bienvenidaYaVista()/marcarBienvenidaVista() (una sola vez).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

vi.mock('../../services/ttsService', () => ({
  speakSentences: vi.fn(() => Promise.resolve()),
}));

import BienvenidaFinca, {
  bienvenidaYaVista,
  marcarBienvenidaVista,
} from '../_archivo/BienvenidaFinca';
import { MSG } from '../../config/messages.js';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

const avanzarHastaUbicacion = () => {
  fireEvent.click(screen.getByTestId('bienvenida-siguiente')); // → capacidades
  fireEvent.click(screen.getByTestId('bienvenida-siguiente')); // → hola chagra
  fireEvent.click(screen.getByTestId('bienvenida-siguiente')); // → instalar app
  fireEvent.click(screen.getByTestId('bienvenida-siguiente')); // → ubicación
};

/**
 * Evento beforeinstallprompt simulado (mismo helper que AndroidInstallBanner).
 * @typedef {Event & { prompt: import('vitest').Mock, userChoice: Promise<{ outcome: string }> }} BipEvent
 * @returns {BipEvent}
 */
function makeBipEvent(outcome = 'accepted') {
  const event = /** @type {BipEvent} */ (new Event('beforeinstallprompt'));
  event.preventDefault = vi.fn();
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('BienvenidaFinca — recorrido de 5 momentos', () => {
  it('arranca en la bienvenida y recorre voz + instalación hasta la ubicación', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);

    // Momento 1: identidad finca-viva.
    expect(screen.getByText(MSG.bienvenida.titulo1)).toBeTruthy();
    expect(screen.getByText(MSG.bienvenida.pasoDe(1, 5))).toBeTruthy();

    // Momento 2: las capacidades estrella.
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    expect(screen.getByText(MSG.bienvenida.capVozTitulo)).toBeTruthy();
    expect(screen.getByText(MSG.bienvenida.capFotoTitulo)).toBeTruthy();
    expect(screen.getByText(MSG.bienvenida.capVerifTitulo)).toBeTruthy();

    // Momento 3: "Hola Chagra" — hablarle con las manos ocupadas.
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    expect(screen.getByText(MSG.bienvenida.vozTitulo)).toBeTruthy();

    // Momento 4: instalar la app.
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    expect(screen.getByText(MSG.bienvenida.instalarTitulo)).toBeTruthy();

    // Momento 5: la ubicación como momento de magia.
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    expect(screen.getByText(MSG.bienvenida.titulo3)).toBeTruthy();
    expect(screen.getByTestId('bienvenida-ubicar')).toBeTruthy();
  });

  it('momento "Hola Chagra": chip de voz con el saludo de ejemplo y foto con crédito CC', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));

    expect(screen.getByTestId('bienvenida-chip-voz')).toBeTruthy();
    expect(screen.getByText(MSG.bienvenida.vozEjemplo)).toBeTruthy();
    // El copy enseña CÓMO: tocar el micrófono y hablar (honesto, push-to-talk).
    expect(screen.getByText(MSG.bienvenida.vozCopy)).toBeTruthy();
    // Foto real con crédito visible (requisito CC BY-SA).
    expect(screen.getByAltText(MSG.bienvenida.vozFotoAlt)).toBeTruthy();
    expect(screen.getByText(/Robbieross123/)).toBeTruthy();
  });

  it('momento instalar (Android/Chromium): el botón dispara el prompt NATIVO', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
    const event = makeBipEvent('accepted');
    act(() => { window.dispatchEvent(event); });
    expect(event.preventDefault).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));

    fireEvent.click(screen.getByTestId('bienvenida-instalar-cta'));
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it('momento instalar (iOS): muestra los pasos Compartir → Añadir a inicio', () => {
    const uaSpy = vi
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    try {
      render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
      fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
      fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
      fireEvent.click(screen.getByTestId('bienvenida-siguiente'));

      expect(screen.getByTestId('bienvenida-instalar-ios')).toBeTruthy();
      expect(screen.getByText(new RegExp(MSG.instalarApp.iosPaso1))).toBeTruthy();
    } finally {
      uaSpy.mockRestore();
    }
  });

  it('momento instalar (sin prompt ni iOS): explica la vía del menú del navegador', () => {
    render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));
    fireEvent.click(screen.getByTestId('bienvenida-siguiente'));

    expect(screen.getByTestId('bienvenida-instalar-menu')).toBeTruthy();
    // El PORQUÉ campesino siempre visible: funciona sin señal en el lote.
    expect(screen.getByText(MSG.bienvenida.instalarPorque1)).toBeTruthy();
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

  it('mientras está abierta marca body.bienvenida-abierta (oculta banners PWA) y la quita al cerrar', () => {
    const { unmount } = render(<BienvenidaFinca onUbicar={vi.fn()} onClose={vi.fn()} />);
    expect(document.body.classList.contains('bienvenida-abierta')).toBe(true);
    unmount();
    expect(document.body.classList.contains('bienvenida-abierta')).toBe(false);
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
