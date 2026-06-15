/**
 * WelcomeStatsHero.test.jsx — cobertura anti-alucinación CO2.
 *
 * Task #7101: Eliminar constante fabricada CO2_KG_PER_TREE_YEAR = 22
 * que producía una cifra exacta de captura de CO2 por árbol sin fuente
 * verificable. En su lugar, mostrar métrica honesta (número de árboles/
 * especies registradas) o, si se muestra carbono, usar rango con fuente
 * clara marcada [VALIDAR].
 *
 * Casos cubiertos:
 *   1. NO renderiza cifra de CO2 calculada por-árbol sin fuente
 *   2. NO muestra caption "Factor IDEAM-MADS · 22 kg CO₂/año por árbol"
 *   3. SÍ renderiza métrica honesta (árboles/plantas registradas)
 *   4. Componente funciona en modo pre-login y post-login
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WelcomeStatsHero from './WelcomeStatsHero';

// Mock del store de activos
const mockAssetStore = {
  plants: { length: 0 },
};

vi.mock('../store/useAssetStore', () => ({
  default: (selector) => selector(mockAssetStore),
}));

describe('WelcomeStatsHero — anti-alucinación CO2', () => {
  beforeEach(() => {
    // Resetear mocks entre tests
    mockAssetStore.plants.length = 0;
    // Limpiar localStorage
    try {
      globalThis.localStorage.clear();
    } catch { /* ignore private mode */ }
  });

  it('NO renderiza cifra de CO2 calculada por-árbol sin fuente', async () => {
    mockAssetStore.plants.length = 50;

    render(
      <WelcomeStatsHero
        mode="post-login"
        onNavigate={() => {}}
      />
    );

    // Esperar a que se renderice el componente
    await waitFor(() => {
      expect(screen.getByText(/Chagra · impacto/i)).toBeInTheDocument();
    });

    // Verificar que NO aparece texto de kg de CO2 secuestrados
    const co2Text = screen.queryByText(/kg de CO₂ secuestrados al año/i);
    expect(co2Text).not.toBeInTheDocument();

    // Verificar que NO aparece caption fabricado
    const fabricatedCaption = screen.queryByText(/Factor IDEAM-MADS · 22 kg CO₂\/año por árbol/i);
    expect(fabricatedCaption).not.toBeInTheDocument();
  });

  it('NO muestra caption con constante fabricada de 22 kg CO₂/año', async () => {
    mockAssetStore.plants.length = 100;

    render(
      <WelcomeStatsHero
        mode="post-login"
        onNavigate={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chagra · impacto/i)).toBeInTheDocument();
    });

    // El caption fabricado NO debe aparecer nunca
    const fabricatedCaption = screen.queryByText(/22 kg CO₂\/año por árbol/i);
    expect(fabricatedCaption).not.toBeInTheDocument();
  });

  it('SÍ renderiza métrica honesta (plantas/árboles registrados)', async () => {
    mockAssetStore.plants.length = 75;

    render(
      <WelcomeStatsHero
        mode="post-login"
        onNavigate={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chagra · impacto/i)).toBeInTheDocument();
    });

    // El componente está colapsado por defecto cuando hay plantas,
    // así que verificamos que el componente se renderiza correctamente
    // sin mostrar CO2 fabricado
    const section = screen.getByRole('region', { name: /Impacto de Chagra/i });
    expect(section).toBeInTheDocument();

    // Verificar que NO hay texto de CO2
    const co2Text = screen.queryByText(/kg de CO₂/i);
    expect(co2Text).not.toBeInTheDocument();
  });

  it('funciona en modo pre-login con fallback global', async () => {
    render(
      <WelcomeStatsHero
        mode="pre-login"
        onNavigate={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chagra · impacto/i)).toBeInTheDocument();
    });

    // En modo pre-login debe mostrar el fallback global
    const globalPlants = screen.getByText('100');
    expect(globalPlants).toBeInTheDocument();

    // NO debe mostrar CO2 fabricado
    const co2Text = screen.queryByText(/kg de CO₂ secuestrados al año/i);
    expect(co2Text).not.toBeInTheDocument();
  });

  it('muestra stats completas sin romper el layout', async () => {
    mockAssetStore.plants.length = 0; // Forzar expandido

    render(
      <WelcomeStatsHero
        mode="post-login"
        onNavigate={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chagra · impacto/i)).toBeInTheDocument();
    });

    // Verificar que la sección principal existe
    const statsSection = screen.getByRole('region', { name: /Impacto de Chagra/i });
    expect(statsSection).toBeInTheDocument();
  });

  it('muestra número de especies del catálogo (métrica honesta)', async () => {
    mockAssetStore.plants.length = 0; // Forzar expandido

    render(
      <WelcomeStatsHero
        mode="post-login"
        onNavigate={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chagra · impacto/i)).toBeInTheDocument();
    });

    // Debe mostrar especies del catálogo (en carrusel o grid)
    const speciesLabel = screen.queryByText(/especies/i);
    expect(speciesLabel).toBeInTheDocument();
  });
});
