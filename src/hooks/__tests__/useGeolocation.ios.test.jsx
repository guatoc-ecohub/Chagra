import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

/**
 * Tests para UX-23 (#286): bug operador iPhone 2026-05-27 — "cuando doy
 * clic en una propiedad caminar para registrarla el botón no funciona ni
 * el de mi ubicación me devuelve".
 *
 * Verifica:
 *   1. Timeout default es 30s (no 15s) — iOS A-GPS cold-start realista.
 *   2. Si el primer intento high-accuracy timeoutea, reintentamos con
 *      enableHighAccuracy=false automáticamente.
 *   3. Si el caller override enableHighAccuracy=false, NO reintenta.
 *   4. Error code 1 (denied) → errorType 'denied' (mapping correcto).
 *   5. Error code 3 (timeout) tras retry → errorType 'timeout' propaga.
 */

function Probe({ requestArgs = {} }) {
  const { position, error, loading, request } = useGeolocation();
  return (
    <>
      <button data-testid="trigger" onClick={() => request(requestArgs)}>req</button>
      <span data-testid="loading">{loading ? 'loading' : 'idle'}</span>
      <span data-testid="error">{error || 'noerror'}</span>
      <span data-testid="lat">{position?.lat ?? 'nolat'}</span>
    </>
  );
}

let attempts = [];
const mockSuccess = (lat, lng) => ({
  coords: {
    latitude: lat, longitude: lng, accuracy: 20,
    altitude: null, altitudeAccuracy: null,
  },
  timestamp: Date.now(),
});

beforeEach(() => {
  attempts = [];
  // @ts-ignore
  navigator.geolocation = {
    getCurrentPosition: vi.fn((success, error, config) => {
      attempts.push({ ...config });
      // Mock behavior is set per-test via attempts[].behavior
    }),
  };
});

describe('UX-23 — useGeolocation iOS fixes', () => {
  it('timeout default es 30000ms (era 15000)', () => {
    render(<Probe />);
    fireEvent.click(screen.getByTestId('trigger'));
    expect(attempts[0].timeout).toBe(30000);
  });

  it('reintenta con enableHighAccuracy=false si primer intento timeoutea', () => {
    navigator.geolocation.getCurrentPosition = vi.fn((success, error, config) => {
      attempts.push({ ...config });
      if (attempts.length === 1) {
        // primer call: high-accuracy timeout
        error({ code: 3, message: 'Timeout' });
      } else {
        // segundo call: success low-accuracy
        success(mockSuccess(4.5, -73.9));
      }
    });

    render(<Probe />);
    fireEvent.click(screen.getByTestId('trigger'));

    expect(attempts).toHaveLength(2);
    expect(attempts[0].enableHighAccuracy).toBe(true);
    expect(attempts[1].enableHighAccuracy).toBe(false);
  });

  it('NO reintenta si el caller override enableHighAccuracy=false', () => {
    navigator.geolocation.getCurrentPosition = vi.fn((success, error, config) => {
      attempts.push({ ...config });
      error({ code: 3, message: 'Timeout' });
    });

    render(<Probe requestArgs={{ enableHighAccuracy: false }} />);
    fireEvent.click(screen.getByTestId('trigger'));

    expect(attempts).toHaveLength(1);
    expect(attempts[0].enableHighAccuracy).toBe(false);
  });

  it('mapea err.code=1 (PERMISSION_DENIED) a errorType "denied"', async () => {
    const onError = vi.fn();
    navigator.geolocation.getCurrentPosition = vi.fn((success, error) => {
      error({ code: 1, message: 'Denied' });
    });

    render(<Probe requestArgs={{ onError }} />);
    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('denied'));
    expect(screen.getByTestId('error').textContent).toBe('denied');
  });

  it('mapea err.code=3 (TIMEOUT) tras retry a errorType "timeout"', async () => {
    const onError = vi.fn();
    navigator.geolocation.getCurrentPosition = vi.fn((success, error, config) => {
      attempts.push({ ...config });
      error({ code: 3, message: 'Timeout' });
    });

    render(<Probe requestArgs={{ onError }} />);
    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('timeout'));
    // 2 intentos: high-accuracy + low-accuracy retry, ambos fallaron.
    expect(attempts).toHaveLength(2);
    expect(screen.getByTestId('error').textContent).toBe('timeout');
  });

  it('llama onSuccess y setea position cuando GPS resuelve', async () => {
    const onSuccess = vi.fn();
    navigator.geolocation.getCurrentPosition = vi.fn((success) => {
      success(mockSuccess(4.5, -73.9));
    });

    render(<Probe requestArgs={{ onSuccess }} />);
    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => expect(screen.getByTestId('lat').textContent).toBe('4.5'));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('NO reintenta para errores no-timeout (code=1 / code=2)', () => {
    navigator.geolocation.getCurrentPosition = vi.fn((success, error) => {
      attempts.push({});
      error({ code: 1, message: 'Denied' });
    });

    render(<Probe />);
    fireEvent.click(screen.getByTestId('trigger'));

    expect(attempts).toHaveLength(1);
  });
});
