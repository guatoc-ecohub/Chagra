// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * ContextTip — coach-mark de primera vez, descartable y que NO se repite.
 *
 * Contrato:
 *   - Se muestra solo si el tip no se ha visto (contextTips).
 *   - "Entendido" lo cierra y lo marca visto → no vuelve a aparecer.
 *   - Theme-aware vía clases slate/emerald (indirección CSS-var).
 *   - Lenguaje llano + emoji grande (baja alfabetización).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ContextTip from '../ContextTip';
import { hasSeenTip } from '../../services/contextTips';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('ContextTip', () => {
  it('se muestra la primera vez con emoji, título y texto', () => {
    render(
      <ContextTip id="voz-hablar-natural" emoji="🎤" title="Hable natural">
        Diga lo que hizo como a un amigo.
      </ContextTip>,
    );
    expect(screen.getByTestId('context-tip-voz-hablar-natural')).toBeTruthy();
    expect(screen.getByText('Hable natural')).toBeTruthy();
    expect(screen.getByText(/como a un amigo/i)).toBeTruthy();
    expect(screen.getByText('🎤')).toBeTruthy();
  });

  it('"Entendido" lo descarta y lo marca como visto', () => {
    render(
      <ContextTip id="foto-diagnostico" emoji="📷" title="Foto cerquita">
        Tome la foto cerca de la hoja.
      </ContextTip>,
    );
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }));
    expect(screen.queryByTestId('context-tip-foto-diagnostico')).toBeNull();
    expect(hasSeenTip('foto-diagnostico')).toBe(true);
  });

  it('NO se vuelve a mostrar si ya fue visto (no molesta)', () => {
    const { unmount } = render(
      <ContextTip id="tip-x" emoji="💡" title="Tip">
        Texto.
      </ContextTip>,
    );
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }));
    unmount();
    render(
      <ContextTip id="tip-x" emoji="💡" title="Tip">
        Texto.
      </ContextTip>,
    );
    expect(screen.queryByTestId('context-tip-tip-x')).toBeNull();
  });

  it('acción opcional "Ver más" dispara onMore', () => {
    const onMore = vi.fn();
    render(
      <ContextTip id="tip-mas" emoji="💡" title="Tip" moreLabel="Ver el manual" onMore={onMore}>
        Texto.
      </ContextTip>,
    );
    fireEvent.click(screen.getByRole('button', { name: /ver el manual/i }));
    expect(onMore).toHaveBeenCalled();
  });

  it('variant="subtle" es una línea discreta: sin tarjeta ni botón Entendido, "x" descarta y marca visto', () => {
    render(
      <ContextTip id="foto-diagnostico" variant="subtle" emoji="📷" title="¿Una mata enferma? Mándeme una foto">
        ¿Una mata enferma? Toque la cámara aquí abajo y mándeme la foto.
      </ContextTip>,
    );
    const tip = screen.getByTestId('context-tip-foto-diagnostico');
    expect(tip.className).not.toMatch(/bg-emerald-950/); // sin fondo de tarjeta
    expect(screen.queryByRole('button', { name: /^entendido$/i })).toBeNull();
    expect(screen.getByRole('note')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /entendido, ocultar/i }));
    expect(screen.queryByTestId('context-tip-foto-diagnostico')).toBeNull();
    expect(hasSeenTip('foto-diagnostico')).toBe(true);
  });

  it('es no intrusivo: role=note, no dialog modal', () => {
    render(
      <ContextTip id="tip-a11y" emoji="💡" title="Tip">
        Texto.
      </ContextTip>,
    );
    expect(screen.getByRole('note')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
