/**
 * @vitest-environment jsdom
 *
 * Tests del puente OAuthCallback (flujo Authorization Code + PKCE).
 * Verifica el handling del callback: éxito → onSuccess + persistencia de
 * identidad/tenant; error → onError. farmOS se mockea vía authService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import OAuthCallback from '../OAuthCallback';
import * as authService from '../../services/authService';
import * as operatorIdentity from '../../services/operatorIdentityService';
import * as tenantContext from '../../services/tenantContext';

vi.mock('../../services/authService', () => ({
  handleOAuthCallback: vi.fn(),
}));
vi.mock('../../services/operatorIdentityService', () => ({
  setCurrentOperator: vi.fn(),
}));
vi.mock('../../services/tenantContext', () => ({
  setActiveTenantId: vi.fn(),
}));

// useOllamaWarmStore es un store zustand; mockeamos getState().startWarmup.
const startWarmup = vi.fn();
vi.mock('../../store/useOllamaWarmStore', () => ({
  default: { getState: () => ({ startWarmup }) },
}));

// ChagraGrowLoader hace cosas de animación que no nos interesan acá.
vi.mock('../ChagraGrowLoader', () => ({
  default: () => null,
}));

describe('OAuthCallback (PKCE bridge)', () => {
  const setLocation = (search = '', hash = '') => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search, hash, origin: 'https://chagra.guatoc.co', href: '' },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setLocation('?code=abc123&state=state_xyz');
    // history.replaceState existe en jsdom; lo espiamos.
    window.history.replaceState = vi.fn();
  });

  it('intercambia code→token y llama onSuccess al éxito', async () => {
    vi.mocked(authService.handleOAuthCallback).mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(<OAuthCallback onSuccess={onSuccess} onError={onError} />);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onError).not.toHaveBeenCalled();

    // Se pasó un URLSearchParams con el code correcto al handler.
    const passedParams = vi.mocked(authService.handleOAuthCallback).mock.calls[0][0];
    expect(passedParams.get('code')).toBe('abc123');
    expect(passedParams.get('state')).toBe('state_xyz');

    // Persistencia de identidad/tenant + warm-up disparados.
    expect(operatorIdentity.setCurrentOperator).toHaveBeenCalledWith('state_xyz');
    expect(tenantContext.setActiveTenantId).toHaveBeenCalledWith('state_xyz');
    expect(startWarmup).toHaveBeenCalled();
    // Limpia los params OAuth de la URL (evita reintento con code consumido).
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('llama onError con el mensaje cuando el intercambio falla', async () => {
    vi.mocked(authService.handleOAuthCallback).mockResolvedValue({
      success: false,
      error: 'State inválido. Posible ataque CSRF.',
    });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(<OAuthCallback onSuccess={onSuccess} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('State inválido. Posible ataque CSRF.');
  });

  it('lee code/state desde el hash si la PWA enruta por fragmento', async () => {
    setLocation('', '#callback?code=hashcode&state=hashstate');
    vi.mocked(authService.handleOAuthCallback).mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(<OAuthCallback onSuccess={onSuccess} onError={onError} />);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const passedParams = vi.mocked(authService.handleOAuthCallback).mock.calls[0][0];
    expect(passedParams.get('code')).toBe('hashcode');
    expect(passedParams.get('state')).toBe('hashstate');
  });

  it('llama onError si handleOAuthCallback lanza una excepción', async () => {
    vi.mocked(authService.handleOAuthCallback).mockRejectedValue(new Error('boom'));
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(<OAuthCallback onSuccess={onSuccess} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('boom');
  });
});
