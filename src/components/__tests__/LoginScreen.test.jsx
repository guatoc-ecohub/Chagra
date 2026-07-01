/**
 * LoginScreen.test.jsx — contrato de render + interacción de la puerta de
 * entrada tras la lavada visual (feat/login-lavada-visual).
 *
 * Objetivo: garantizar que el rediseño NO rompió la lógica de auth ni la
 * accesibilidad de los campos/acciones. Los hijos pesados (WelcomeStatsHero,
 * LegalLinks) y los efectos colaterales del login exitoso (operador HMAC,
 * tenant, warm-up, corpus) se mockean para aislar el contrato del formulario.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../services/authService', () => ({
  authenticateUser: vi.fn(),
}));
vi.mock('../../services/operatorIdentityService', () => ({
  setCurrentOperator: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../services/tenantContext', () => ({
  setActiveTenantId: vi.fn(),
}));
vi.mock('../../services/ragRetriever', () => ({
  prewarmCorpus: vi.fn(),
}));
vi.mock('../../hooks/useTheme', () => ({
  applyTheme: vi.fn(),
  normalizeTheme: (t) => t,
  STORAGE_KEY: 'chagra:theme',
  DEFAULT_THEME: 'biopunk',
}));
vi.mock('../../store/useOllamaWarmStore', () => ({
  default: { getState: () => ({ startWarmup: vi.fn() }) },
}));
// Hijos pesados: stubs livianos (su render se prueba en sus propios tests).
vi.mock('../WelcomeStatsHero', () => ({
  default: () => <div data-testid="welcome-stats-hero">stats</div>,
}));
vi.mock('../LegalLinks', () => ({
  default: () => <div data-testid="legal-links">legal</div>,
}));

import LoginScreen from '../LoginScreen';
import { authenticateUser } from '../../services/authService';
import { setCurrentOperator } from '../../services/operatorIdentityService';

function setup() {
  const onLoginSuccess = vi.fn();
  const onSave = vi.fn();
  render(<LoginScreen onLoginSuccess={onLoginSuccess} onSave={onSave} />);
  return { onLoginSuccess, onSave };
}

describe('LoginScreen — render y accesibilidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('muestra los campos Usuario, Contraseña y el botón Ingresar', () => {
    setup();
    const usuario = screen.getByLabelText('Usuario');
    const password = screen.getByLabelText('Contraseña');
    expect(usuario).toBeInTheDocument();
    expect(usuario).toHaveAttribute('type', 'text');
    expect(usuario).toHaveAttribute('autocapitalize', 'none');
    expect(usuario).toHaveAttribute('autocorrect', 'off');
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeEnabled();
  });

  it('mantiene las señales de confianza y el impacto pre-login', () => {
    setup();
    expect(screen.getByText(/Funciona sin internet/i)).toBeInTheDocument();
    expect(screen.getByText(/Sus datos son suyos/i)).toBeInTheDocument();
    expect(screen.getByText(/Software libre/i)).toBeInTheDocument();
    expect(screen.getByTestId('welcome-stats-hero')).toBeInTheDocument();
    expect(screen.getByTestId('legal-links')).toBeInTheDocument();
  });

  it('el botón mostrar/ocultar contraseña alterna el tipo del campo (usted)', () => {
    setup();
    const password = screen.getByLabelText('Contraseña');
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('LoginScreen — submit y lógica de auth (intacta)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('con campos vacíos avisa por onSave y no llama a authenticateUser', () => {
    const { onSave, onLoginSuccess } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    expect(onSave).toHaveBeenCalledWith(expect.stringMatching(/usuario/i), true);
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('login exitoso llama a authenticateUser y a onLoginSuccess', async () => {
    authenticateUser.mockResolvedValue({ success: true });
    const { onLoginSuccess } = setup();
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'juanita' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-buena' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledTimes(1));
    expect(authenticateUser).toHaveBeenCalledWith('juanita', 'clave-buena');
    expect(setCurrentOperator).toHaveBeenCalledWith('juanita');
  });

  it('credenciales inválidas avisan por onSave con isError y no navegan', async () => {
    authenticateUser.mockResolvedValue({ success: false });
    const { onSave, onLoginSuccess } = setup();
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'juanita' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-mala' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.stringMatching(/incorrect/i), true));
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
