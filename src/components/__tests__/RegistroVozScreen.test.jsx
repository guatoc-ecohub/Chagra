// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Smoke de render del botón único de voz (#23): el árbol de componentes monta
 * sin errores de import y el estado IDLE muestra el material didáctico (frases
 * de ejemplo + categorías que entiende). El mic arranca la grabación.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const start = vi.fn().mockResolvedValue(undefined);
vi.mock('../../hooks/useVoiceRecorder', () => ({
  default: () => ({
    audioLevel: 0, amplitudeHistory: [], durationMs: 0,
    start, stop: vi.fn(), reset: vi.fn(), error: null, hardLimitMs: 30000,
  }),
}));
vi.mock('../../services/voiceService', () => ({ transcribe: vi.fn(), queueForRetry: vi.fn() }));
vi.mock('../../services/voiceRouter', () => ({ classifyAndExtract: vi.fn() }));
vi.mock('../../services/voiceRecordPayload', () => ({ buildVoicePayload: vi.fn() }));
vi.mock('../../services/payloadService', () => ({ savePayload: vi.fn() }));
vi.mock('../RegistroVozConfirm', () => ({ default: () => <div data-testid="confirm-stub" /> }));
vi.mock('../common/Sparkline', () => ({ default: () => <div /> }));
vi.mock('../common/AIStreamPanel', () => ({ default: () => <div /> }));
vi.mock('../ChagraGrowLoader', () => ({ default: () => <div /> }));
vi.mock('../ContextTip', () => ({ default: ({ children }) => <div>{children}</div> }));

import RegistroVozScreen from '../RegistroVozScreen';

describe('RegistroVozScreen — IDLE didáctico', () => {
  it('muestra frases-ejemplo y categorías, y el mic arranca la grabación', () => {
    render(<RegistroVozScreen onBack={vi.fn()} onSave={vi.fn()} />);

    // Título del flujo unificado.
    expect(screen.getByText(/Registrar hablando/i)).toBeInTheDocument();
    // Frase de ejemplo (ancla la intención registrar_planta).
    expect(screen.getByText(/durazno de dos metros/i)).toBeInTheDocument();
    // Categorías que entiende (didáctico): al menos cosecha y plaga.
    expect(screen.getByText(/Cosecha/)).toBeInTheDocument();
    expect(screen.getByText(/Plaga/)).toBeInTheDocument();

    // El mic arranca la grabación.
    fireEvent.click(screen.getByLabelText(/Iniciar grabación/i));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
