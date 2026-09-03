import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Este contrato cuenta la presencia visual, no los detalles internos de cada
// personaje. Los stubs mantienen el test en jsdom y evitan cargar WebGL, audio
// o datos de finca para validar solo el cableado del shell 2D.
vi.mock('../../services/authService', () => ({
  authenticateUser: vi.fn(),
  isAuthenticated: vi.fn(),
  logoutUser: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../db/catalogDB', () => ({ initCatalog: vi.fn(() => Promise.resolve()) }));
vi.mock('../../services/ragRetriever', () => ({
  prewarmCorpus: vi.fn(),
  retrieve: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../../services/alertEngine', () => ({ alertEngine: { start: vi.fn(() => Promise.resolve()) } }));
vi.mock('../../services/cropAlertEngine', () => ({ cropAlertEngine: { start: vi.fn(() => Promise.resolve()) } }));
vi.mock('../../services/apiService', () => ({
  fetchFromFarmOS: vi.fn(() => Promise.resolve({ data: [] })),
  fetchWithAuthRetry: vi.fn(() => Promise.resolve({ ok: true })),
}));
vi.mock('../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(() => Promise.resolve([])) }));

// Una sola marca común permite detectar un segundo compai aunque cambie el
// componente que lo aloja (AgentFab o el caminante de la portada B).
vi.mock('../../components/AgentFab', () => ({
  default: () => <span data-testid="compai-animado" data-compai-origen="AgentFab" />,
}));
vi.mock('../../components/CompaiOverlay', () => ({
  default: () => <span data-testid="compai-animado" data-compai-origen="CompaiOverlay" />,
}));
vi.mock('../../visual/agente/AngelitaVueloLogin.jsx', () => ({
  default: () => <span data-testid="compai-animado" data-compai-origen="Login" />,
}));

// Las vistas de finca son stubs de contenido: el test sí monta el App real y
// sus guards de ruta, pero no necesita renderizar sus árboles completos.
vi.mock('../../components/dashboard/DashboardLive', () => ({
  default: () => <div data-testid="dashboard-2d-view">dashboard</div>,
}));
vi.mock('../../components/dashboard/HomeCampesinoB', () => ({
  default: () => <div data-testid="home-campesino-2d-view">home campesino</div>,
}));
vi.mock('../../components/LegalLinks', () => ({ default: () => <div /> }));
vi.mock('../../components/WelcomeStatsHero', () => ({ default: () => <div /> }));
vi.mock('../../components/ChagraGrowLoader', () => ({ default: () => <span /> }));
vi.mock('../../visual/effects', () => ({
  CirculoRotoMilpa: ({ children }) => <div>{children}</div>,
}));

import App from '../../App';
import { isAuthenticated } from '../../services/authService';

const VISTAS_2D = [
  {
    nombre: 'login',
    hash: '#login',
    autenticada: false,
    flagHomeB: 'false',
    marcadorVista: 'login-2d-view',
  },
  {
    nombre: 'dashboard estándar',
    hash: '#dashboard',
    autenticada: true,
    flagHomeB: 'false',
    marcadorVista: 'dashboard-2d-view',
  },
  {
    nombre: 'dashboard campesino',
    hash: '#dashboard',
    autenticada: true,
    flagHomeB: 'true',
    marcadorVista: 'home-campesino-2d-view',
  },
];

describe('App 2D: exactamente una presencia animada de Compai', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '';
    vi.unstubAllEnvs();
  });

  it.each(VISTAS_2D)('mantiene un solo Compai en $nombre', async ({
    hash,
    autenticada,
    flagHomeB,
    marcadorVista,
  }) => {
    vi.stubEnv('VITE_HOME_CAMPESINO_B', flagHomeB);
    vi.stubEnv('VITE_FINCA_VIVA_HOME_PERFIL', 'false');
    isAuthenticated.mockResolvedValue(autenticada);
    window.location.hash = hash;

    render(<App />);

    if (marcadorVista === 'login-2d-view') {
      await waitFor(() => expect(screen.getByLabelText('Usuario')).toBeInTheDocument());
    } else {
      await waitFor(() => expect(screen.getByTestId(marcadorVista)).toBeInTheDocument());
    }

    // La aserción consulta el DOM final de la vista representativa. Si se
    // inyecta un segundo montaje, getAllByTestId devuelve 2 y el test falla.
    await waitFor(() => {
      expect(screen.getAllByTestId('compai-animado')).toHaveLength(1);
    });
  });
});
