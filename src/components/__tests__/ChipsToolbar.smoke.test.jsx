import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import ChipsToolbar from '../ChipsToolbar';
import { CHIP_DEFS } from '../../services/chipIntentRouter';

/**
 * Smoke tests A4/B4 — la barra de CHIPS DE MODO sobre el input del chat.
 *   - renderiza los 7 chips con su emoji + label,
 *   - clickear un chip llama onSelectIntent con el intent enum,
 *   - el chip activo se marca aria-pressed,
 *   - el chip 📷 foto solo aparece/activa si hay imagen adjunta,
 *   - retorna null si falta el handler (defensa contra mounts incompletos).
 *   - tier gate A1: chip 🔬 Deep Research deshabilitado para free, activo para pro.
 */

describe('ChipsToolbar — barra de chips de modo', () => {
  test('renderiza los 7 chips de modo (usuario free — deep chip bloqueado)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    const chips = screen.getAllByTestId('mode-chip');
    expect(chips).toHaveLength(7);
    // El emoji + label del primero (siembro) debe estar presente
    expect(screen.getByText('¿Qué siembro?')).toBeInTheDocument();
    expect(screen.getByText('Plaga')).toBeInTheDocument();
    // Free users ven el chip con sufijo "(Pro)"
    expect(screen.getByText('Investigación profunda (Pro)')).toBeInTheDocument();
  });

  test('renderiza el chip 🔬 sin sufijo cuando isPro=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro />);
    expect(screen.getByText('Investigación profunda')).toBeInTheDocument();
    expect(screen.queryByText('Investigación profunda (Pro)')).not.toBeInTheDocument();
  });

  test('clickear un chip llama onSelectIntent con el intent enum', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} />);
    fireEvent.click(screen.getByText('Plaga'));
    expect(onSelectIntent).toHaveBeenCalledTimes(1);
    expect(onSelectIntent).toHaveBeenCalledWith('plaga');
  });

  test('el chip activo se marca aria-pressed=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} activeIntent="clima" />);
    const climaChip = screen.getByRole('button', { name: /clima/i });
    expect(climaChip).toHaveAttribute('aria-pressed', 'true');
    // Otro chip cualquiera no debe estar pressed
    const siembroChip = screen.getByRole('button', { name: /siembro/i });
    expect(siembroChip).toHaveAttribute('aria-pressed', 'false');
  });

  test('cada chip de modo expone un accessible name no vacío', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    for (const def of CHIP_DEFS) {
      const chip = screen.getByRole('button', { name: new RegExp(def.label, 'i') });
      expect(chip).toBeInTheDocument();
    }
  });

  test('el chip 📷 foto NO aparece sin imagen adjunta', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} hasAttachment={false} />);
    expect(screen.queryByTestId('mode-chip-foto')).not.toBeInTheDocument();
  });

  test('el chip 📷 foto aparece y es clickable cuando hay imagen adjunta', () => {
    const onSelectIntent = vi.fn();
    render(
      <ChipsToolbar
        onSelectIntent={onSelectIntent}
        hasAttachment
      />,
    );
    const fotoChip = screen.getByTestId('mode-chip-foto');
    expect(fotoChip).toBeInTheDocument();
    expect(fotoChip).not.toBeDisabled();
    fireEvent.click(fotoChip);
    expect(onSelectIntent).toHaveBeenCalledWith('foto');
  });

  test('retorna null si no hay handler onSelectIntent (defensa)', () => {
    const { container } = render(<ChipsToolbar />);
    expect(container.firstChild).toBeNull();
  });

  test('ningún label de chip usa voseo argentino', () => {
    const { container } = render(<ChipsToolbar onSelectIntent={() => {}} hasAttachment />);
    const VOSEO = /\b(escrib[íi]|tom[áa]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|sab[ée]s)\b/i;
    expect(container.textContent).not.toMatch(VOSEO);
  });

  // ──── Tier gate A1 ────────────────────────────────────────────────────────

  test('chip 🔬 está deshabilitado (disabled) para usuario free (isPro=false)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).toBeDisabled();
  });

  test('chip 🔬 está habilitado para usuario pro (isPro=true)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro />);
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).not.toBeDisabled();
  });

  test('click en chip 🔬 llama onSelectIntent para usuario pro', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} isPro />);
    fireEvent.click(screen.getByRole('button', { name: /investigación profunda/i }));
    expect(onSelectIntent).toHaveBeenCalledWith('deep');
  });

  test('click en chip 🔬 NO llama onSelectIntent para usuario free', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} isPro={false} />);
    // El botón está disabled — fireEvent.click no dispara el handler
    fireEvent.click(screen.getByRole('button', { name: /investigación profunda/i }));
    expect(onSelectIntent).not.toHaveBeenCalledWith('deep');
  });

  test('chip 🔬 tiene data-pro-locked cuando usuario es free', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).toHaveAttribute('data-pro-locked', 'true');
  });

  test('chip 🔬 NO tiene data-pro-locked cuando usuario es pro', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro />);
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).not.toHaveAttribute('data-pro-locked');
  });

  test('chip 🔬 tiene title explicativo de función Pro cuando free', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} isPro={false} />);
    const deepChip = screen.getByRole('button', { name: /investigación profunda/i });
    expect(deepChip).toHaveAttribute('title', expect.stringContaining('Pro'));
  });

  test('chips no-Pro (siembro, plaga, etc.) siguen activos para usuario free', () => {
    const onSelectIntent = vi.fn();
    render(<ChipsToolbar onSelectIntent={onSelectIntent} isPro={false} />);
    fireEvent.click(screen.getByText('¿Qué siembro?'));
    expect(onSelectIntent).toHaveBeenCalledWith('siembro');
    onSelectIntent.mockClear();
    fireEvent.click(screen.getByText('Plaga'));
    expect(onSelectIntent).toHaveBeenCalledWith('plaga');
  });
});
