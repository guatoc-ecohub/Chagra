import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EscuchaOverlay from '../../components/escucha/EscuchaOverlay.jsx';
import useCompaiHold, { COMPAI_HOLD_MS } from '../useCompaiHold.js';

const startMock = vi.fn(async () => {});

vi.mock('../useVoiceRecorder', () => ({
  default: () => ({
    isRecording: true,
    audioLevel: 0.3,
    amplitudeHistory: [0.1, 0.4, 0.2],
    durationMs: 1200,
    error: null,
    start: startMock,
    stop: vi.fn(async () => ({ blob: new Blob(['audio']), durationMs: 2100, mimeType: 'audio/webm' })),
    reset: vi.fn(),
    hardLimitMs: 30000,
  }),
}));

vi.mock('../../services/voiceService', () => ({
  transcribe: vi.fn(),
  queueForRetry: vi.fn(async () => {}),
}));

function Surface({ className = 'mundo-abeja' }) {
  const handlers = useCompaiHold();
  return (
    <>
      <div data-testid="host" {...handlers}>
        <div className={className} data-testid="compai">Compai</div>
        <div data-testid="otro">Otro</div>
      </div>
      <EscuchaOverlay />
    </>
  );
}

describe('useCompaiHold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['mundo-abeja', 'valle-abeja', 'vcalma-abeja', 'vv-abeja'])(
    'activa escucha para la superficie 3D %s tras 1600 ms', (className) => {
      render(<Surface className={className} />);
      const evento = vi.fn();
      window.addEventListener('chagra:escucha', evento);

      fireEvent.pointerDown(screen.getByTestId('compai'), { pointerId: 7, isPrimary: true });
      act(() => vi.advanceTimersByTime(COMPAI_HOLD_MS - 1));
      expect(evento).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));

      expect(evento).toHaveBeenCalledTimes(1);
      expect(evento.mock.calls[0][0].detail.fuente).toBe('hold');
      expect(screen.getByTestId('escucha-overlay')).toBeInTheDocument();
      expect(startMock).toHaveBeenCalledTimes(1);
      window.removeEventListener('chagra:escucha', evento);
    },
  );

  it('no convierte un gesto del resto de la escena en escucha', () => {
    render(<Surface />);
    const evento = vi.fn();
    window.addEventListener('chagra:escucha', evento);

    fireEvent.pointerDown(screen.getByTestId('otro'), { pointerId: 3, isPrimary: true });
    act(() => vi.advanceTimersByTime(COMPAI_HOLD_MS));

    expect(evento).not.toHaveBeenCalled();
    window.removeEventListener('chagra:escucha', evento);
  });

  it('cancela si se suelta antes del umbral', () => {
    render(<Surface />);
    const evento = vi.fn();
    window.addEventListener('chagra:escucha', evento);

    fireEvent.pointerDown(screen.getByTestId('compai'), { pointerId: 3, isPrimary: true });
    act(() => vi.advanceTimersByTime(COMPAI_HOLD_MS - 1));
    fireEvent.pointerUp(screen.getByTestId('compai'), { pointerId: 3 });
    act(() => vi.advanceTimersByTime(1));

    expect(evento).not.toHaveBeenCalled();
    window.removeEventListener('chagra:escucha', evento);
  });
});
