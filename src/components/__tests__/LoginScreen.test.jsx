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
  // Camino PKCE (task URGENTE-login-se-apaga-25sep): default = rollout NO
  // activado y password grant vivo, igual que un build sin el flag. Los
  // tests del camino PKCE lo sobreescriben por caso.
  resolverCaminoLogin: vi.fn(() => ({ camino: 'password', passwordGrantVivo: true })),
  iniciarLoginPKCE: vi.fn(() => Promise.resolve({ success: true })),
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
vi.mock('../../visual/effects', () => ({
  CirculoRotoMilpa: ({ trigger: _trigger, onRupturaCompleta: _onRupturaCompleta, className, children }) => (
    <div data-testid="circulo-roto-milpa" data-fase="quieta" className={className}>
      {children}
    </div>
  ),
}));
vi.mock('../../visual/agente/AngelitaSalida.jsx', () => ({
  default: ({ activa, onIdo: _onIdo, size: _size, title }) => (
    <div data-agente="angelita" data-activa={activa}>{title}</div>
  ),
}));

import LoginScreen from '../LoginScreen';
import { authenticateUser, iniciarLoginPKCE, resolverCaminoLogin } from '../../services/authService';
import { setCurrentOperator } from '../../services/operatorIdentityService';

function setup() {
  const onLoginSuccess = vi.fn();
  const onSave = vi.fn();
  const { container } = render(<LoginScreen onLoginSuccess={onLoginSuccess} onSave={onSave} />);
  return { onLoginSuccess, onSave, container };
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

  it('monta el círculo de la milpa con una sola Angelita en la ranura', () => {
    const { container } = setup();
    const circulo = screen.getByTestId('circulo-roto-milpa');
    expect(circulo).toHaveAttribute('data-fase', 'quieta');
    expect(circulo.querySelectorAll('[data-agente="angelita"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-compai-draggable]')).toHaveLength(0);
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
    vi.mocked(authenticateUser).mockResolvedValue({ success: true });
    const { onLoginSuccess } = setup();
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'juanita' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-buena' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledTimes(1));
    expect(authenticateUser).toHaveBeenCalledWith('juanita', 'clave-buena');
    expect(setCurrentOperator).toHaveBeenCalledWith('juanita');
  });

  it('credenciales inválidas avisan por onSave con isError y no navegan', async () => {
    vi.mocked(authenticateUser).mockResolvedValue({ success: false });
    const { onSave, onLoginSuccess } = setup();
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'juanita' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-mala' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.stringMatching(/incorrect/i), true));
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});

describe('LoginScreen — camino PKCE cableado y fallback (bomba 2026-09-25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default del mock tras clearAllMocks (limpia implementaciones prestadas):
    // rollout sin activar y password grant vivo, como un build sin el flag.
    vi.mocked(resolverCaminoLogin).mockReturnValue({ camino: 'password', passwordGrantVivo: true });
  });

  const llenarFormulario = () => {
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'juanita' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-buena' } });
  };

  it('con el rollout PKCE activo, Ingresar dispara el redirect PKCE y NO toca el password grant', async () => {
    vi.mocked(resolverCaminoLogin).mockReturnValue({ camino: 'pkce', passwordGrantVivo: true });
    vi.mocked(iniciarLoginPKCE).mockResolvedValue({ success: true });
    const { onLoginSuccess } = setup();
    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(iniciarLoginPKCE).toHaveBeenCalledTimes(1));
    // El grant retirado NO se toca y NO hay sesión local: el navegador se va
    // a farmOS (/oauth/authorize); el regreso lo maneja OAuthCallback.
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('si el redirect PKCE falla y la fecha no llegó, cae al password grant sin matar la sesión', async () => {
    vi.mocked(resolverCaminoLogin).mockReturnValue({ camino: 'pkce', passwordGrantVivo: true });
    vi.mocked(iniciarLoginPKCE).mockResolvedValue({ success: false, error: 'PKCE no configurado' });
    vi.mocked(authenticateUser).mockResolvedValue({ success: true });
    const { onLoginSuccess } = setup();
    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledTimes(1));
    expect(iniciarLoginPKCE).toHaveBeenCalledTimes(1);
    expect(authenticateUser).toHaveBeenCalledWith('juanita', 'clave-buena');
  });

  it('CENTINELA: password grant muerto + arranque PKCE roto NO deja el login mudo', async () => {
    // Escenario bomba (después de 2026-09-25): el grant clásico ya no existe
    // y el camino seguro falla al arrancar. El botón debe avisar con error
    // claro. Si alguien desconecta de nuevo el camino PKCE del login,
    // iniciarLoginPKCE deja de llamarse y este test falla — es el guardia de
    // "el login no puede volver a quedarse sin camino alternativo".
    vi.mocked(resolverCaminoLogin).mockReturnValue({ camino: 'pkce', passwordGrantVivo: false });
    vi.mocked(iniciarLoginPKCE).mockResolvedValue({ success: false, error: 'PKCE no configurado' });
    const { onSave, onLoginSuccess } = setup();
    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(iniciarLoginPKCE).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(expect.stringMatching(/PKCE no configurado/), true);
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('CENTINELA: fecha vencida sin PKCE operativo → aviso claro de instalación bloqueada', async () => {
    // resolverCaminoLogin devolviendo 'bloqueado' = fecha vencida y sin config
    // PKCE. La UI debe mostrar el motivo (no un botón que no hace nada).
    vi.mocked(resolverCaminoLogin).mockReturnValue({
      camino: 'bloqueado',
      passwordGrantVivo: false,
      motivo: 'El acceso clásico fue retirado y esta instalación no tiene configurado el acceso seguro (PKCE).',
    });
    const { onSave, onLoginSuccess } = setup();
    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.stringMatching(/retirado/), true));
    expect(iniciarLoginPKCE).not.toHaveBeenCalled();
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
