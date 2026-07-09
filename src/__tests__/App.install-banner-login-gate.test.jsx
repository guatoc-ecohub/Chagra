import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de REGRESIÓN VISUAL (bug prod 2026-06-25): el prompt de instalación PWA
// (IosInstallBanner / AndroidInstallBanner) es un overlay `fixed bottom-20
// left-1/2 z-50` y se renderizaba en TODAS las vistas, incluida la de login.
// Sobre el formulario de login (campos Usuario/Contraseña/Ingresar) se encimaba:
// en desktop tapaba e interceptaba el clic del campo "Usuario"; en móvil empujaba
// el login bajo el fold. El fix gatea ambos banners con `!isPreAuthView`, igual
// que los demás flotantes (DataLossBanner, CriticalAlertBanner, etc.).
//
// Acá montamos App SIN sesión (→ navega a 'login') y verificamos que NINGÚN
// banner de instalación se monta. Stubeamos los banners para que SIEMPRE
// rendericen un marcador (ignorando su lógica interna de beforeinstallprompt):
// así el test mide el GUARD DE VISTA de App, no el estado del evento PWA.
// Los efectos pesados de boot (catálogo, RAG, alertas, warm-up) se mockean.

vi.mock('../services/authService', () => ({
  isAuthenticated: () => Promise.resolve(false), // sin sesión → vista 'login'
  logoutUser: () => Promise.resolve(),
}));
vi.mock('../db/catalogDB', () => ({ initCatalog: () => Promise.resolve() }));
vi.mock('../services/ragRetriever', () => ({
  prewarmCorpus: () => {},
  retrieve: () => Promise.resolve([]),
}));
vi.mock('../services/alertEngine', () => ({ alertEngine: { start: () => Promise.resolve() } }));
vi.mock('../services/cropAlertEngine', () => ({ cropAlertEngine: { start: () => Promise.resolve() } }));
vi.mock('../services/apiService', () => ({
  fetchFromFarmOS: () => Promise.resolve(null),
  fetchWithAuthRetry: () => Promise.resolve({ ok: true }),
}));
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

// Banners de instalación: stubs que SIEMPRE rinden un marcador. Si App los
// gatea bien en login, estos marcadores NO deben aparecer en el DOM.
vi.mock('../components/IosInstallBanner', () => ({
  default: () => <div data-testid="ios-install-banner">ios install stub</div>,
}));
vi.mock('../components/AndroidInstallBanner', () => ({
  default: () => <div data-testid="android-install-banner">android install stub</div>,
}));

// LoginScreen es lazy + pesado (OAuth/PKCE, stores). Stub liviano que delata la
// vista de login para anclar el waitFor.
vi.mock('../components/LoginScreen', () => ({
  default: () => <div data-testid="login-screen">login stub</div>,
}));

import App from '../App';

describe('App — banners de instalación PWA en la vista de login', () => {
  beforeEach(() => {
    window.location.hash = '';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('sin sesión, monta LoginScreen y NO monta ningún banner de instalación', async () => {
    render(<App />);
    // La vista de login montó.
    await waitFor(
      () => expect(screen.getByTestId('login-screen')).toBeTruthy(),
      { timeout: 4000 },
    );
    // El bug: estos overlays `fixed z-50` se encimaban sobre el formulario.
    expect(screen.queryByTestId('ios-install-banner')).toBeNull();
    expect(screen.queryByTestId('android-install-banner')).toBeNull();
  });
});
