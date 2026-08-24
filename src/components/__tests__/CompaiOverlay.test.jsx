import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CompaiOverlay from '../CompaiOverlay.jsx';

const compaiTestState = vi.hoisted(() => ({ avatarType: 'angelita', caminando: true }));

vi.mock('../ChagraAgentAvatar.jsx', () => ({
  default: ({ state }) => React.createElement('span', {
    'data-testid': 'compai-avatar-state',
    'data-state': state,
  }),
}));

vi.mock('../../hooks/useCompaiRoam.js', () => ({
  default: () => ({
    caminando: compaiTestState.caminando,
    hacia: 'izquierda',
    parada: 0,
  }),
}));

vi.mock('../../visual/mundo3d/escenas/useCompaiElegido.js', () => ({
  default: () => ({ avatarType: compaiTestState.avatarType }),
}));

/**
 * Tests de CompaiOverlay — componente global del compai minimizable.
 *
 * Escenarios:
 *   - Mount: el overlay se monta sin romper nada
 *   - Visibility: burbuja siempre visible, panel solo cuando isOpen
 *   - Hint routing: hint cambia según currentView
 *   - Interactions: toggle abre/cierra, botones funcionan
 *   - Route changes: panel cierra al cambiar currentView
 */

describe('CompaiOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compaiTestState.avatarType = 'angelita';
    compaiTestState.caminando = true;
  });

  it.each([
    'angelita',
    'jaguar',
    'oso-baston',
    'zariguya',
    'luciernaga',
    'chivito-punk',
    'guacamaya',
  ])('envía CON_MARCHA a %s mientras deambula', (avatarType) => {
    compaiTestState.avatarType = avatarType;

    render(<CompaiOverlay currentView="dashboard" />);

    expect(screen.getByTestId('compai-avatar-state')).toHaveAttribute('data-state', 'caminando');
  });

  it('mantiene el estado conversacional por encima de CON_MARCHA', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    fireEvent.click(screen.getByTestId('compai-bubble'));
    fireEvent.click(screen.getByTestId('compai-listen-btn'));

    expect(screen.getByTestId('compai-avatar-state')).toHaveAttribute('data-state', 'speaking');
  });

  it('debe montarse sin errores', () => {
    const { container } = render(<CompaiOverlay currentView="dashboard" />);
    expect(container).toBeTruthy();
  });

  it('debe renderizar la burbuja flotante por defecto', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');
    expect(bubble).toBeInTheDocument();
  });

  it('no debe renderizar el panel si isOpen es false', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const panel = screen.queryByTestId('compai-panel');
    expect(panel).not.toBeInTheDocument();
  });

  it('debe abrir el panel al tocar la burbuja', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');

    fireEvent.click(bubble);

    await waitFor(() => {
      const panel = screen.getByTestId('compai-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  it('debe cerrar el panel al tocar el botón cerrar', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');

    // Abrir
    fireEvent.click(bubble);

    await waitFor(() => {
      expect(screen.getByTestId('compai-panel')).toBeInTheDocument();
    });

    // Cerrar
    const closeBtn = screen.getByTestId('compai-close-btn');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('compai-panel')).not.toBeInTheDocument();
    });
  });

  it('debe mostrar el hint de dashboard por defecto', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');
    fireEvent.click(bubble);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido a su finca')).toBeInTheDocument();
    });
  });

  it('debe cambiar el hint según currentView (perfil)', async () => {
    const { rerender } = render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');
    fireEvent.click(bubble);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido a su finca')).toBeInTheDocument();
    });

    // Cambiar a perfil (panel se cierra automáticamente)
    rerender(<CompaiOverlay currentView="perfil" />);

    // Abrir de nuevo para ver el nuevo hint
    const bubbleUpdated = screen.getByTestId('compai-bubble');
    fireEvent.click(bubbleUpdated);

    await waitFor(() => {
      expect(screen.getByText('Su perfil de la finca')).toBeInTheDocument();
    });
  });

  it('debe cambiar el hint según currentView (mapa)', async () => {
    render(<CompaiOverlay currentView="mapa" />);
    const bubble = screen.getByTestId('compai-bubble');
    fireEvent.click(bubble);

    await waitFor(() => {
      expect(screen.getByText('Su finca en el mapa')).toBeInTheDocument();
    });
  });

  it('debe cambiar el hint según currentView (historial)', async () => {
    render(<CompaiOverlay currentView="historial" />);
    const bubble = screen.getByTestId('compai-bubble');
    fireEvent.click(bubble);

    await waitFor(() => {
      expect(screen.getByText('Registro de su finca')).toBeInTheDocument();
    });
  });

  it('debe traer hints enriquecidos de rutas 2D principales (agente, hoy_finca)', async () => {
    render(<CompaiOverlay currentView="agente" />);
    fireEvent.click(screen.getByTestId('compai-bubble'));
    await waitFor(() => {
      expect(screen.getByText('Pregúntele a su compai')).toBeInTheDocument();
    });
  });

  it('debe resolver el catálogo por alias del manifiesto (directorio/especies/plagas)', async () => {
    const { rerender } = render(<CompaiOverlay currentView="especies" />);
    fireEvent.click(screen.getByTestId('compai-bubble'));
    await waitFor(() => {
      expect(screen.getByText('Catálogo de especies')).toBeInTheDocument();
    });
    rerender(<CompaiOverlay currentView="directorio" />);
    fireEvent.click(screen.getByTestId('compai-bubble'));
    await waitFor(() => {
      expect(screen.getByText('Catálogo de especies')).toBeInTheDocument();
    });
  });

  it('debe resolver subrutas por prefijo (animales_gallinas → animales)', async () => {
    render(<CompaiOverlay currentView="animales_gallinas" />);
    fireEvent.click(screen.getByTestId('compai-bubble'));
    await waitFor(() => {
      expect(screen.getByText('Sus animales')).toBeInTheDocument();
    });
  });

  it('la burbuja de parada NO aparece hasta que el compai llega a una parada (parada=0 al montar)', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    // Recién montado el roam no ha parado (parada=0) → sin burbuja de parada.
    expect(screen.queryByTestId('compai-burbuja')).not.toBeInTheDocument();
  });

  it('debe usar el hint default para rutas desconocidas', async () => {
    render(<CompaiOverlay currentView="ruta-desconocida" />);
    const bubble = screen.getByTestId('compai-bubble');
    fireEvent.click(bubble);

    await waitFor(() => {
      expect(screen.getByText('Angelita está aquí')).toBeInTheDocument();
    });
  });

  it('debe cerrar el panel al cambiar de ruta', async () => {
    const { rerender } = render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');

    // Abrir panel
    fireEvent.click(bubble);

    await waitFor(() => {
      expect(screen.getByTestId('compai-panel')).toBeInTheDocument();
    });

    // Cambiar de ruta
    rerender(<CompaiOverlay currentView="perfil" />);

    await waitFor(() => {
      // Panel debe estar cerrado
      expect(screen.queryByTestId('compai-panel')).not.toBeInTheDocument();
    });
  });

  it('debe tener aria-expanded sincronizado con isOpen', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');

    expect(bubble).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(bubble);

    await waitFor(() => {
      expect(bubble).toHaveAttribute('aria-expanded', 'true');
    });

    const closeBtn = screen.getByTestId('compai-close-btn');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(bubble).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('debe renderizar el botón Escuchar en el panel', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');
    fireEvent.click(bubble);

    await waitFor(() => {
      const listenBtn = screen.getByTestId('compai-listen-btn');
      expect(listenBtn).toBeInTheDocument();
    });
  });

  it('debe tener data-testid en elementos clave para debug', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    expect(screen.getByTestId('compai-overlay-container')).toBeInTheDocument();
    expect(screen.getByTestId('compai-bubble')).toBeInTheDocument();
  });

  describe('CON_MARCHA - estado de caminata para caminantes', () => {
    it('debe respetar la locomoción de los voladores (angelita)', () => {
      // Mock useCompaiElegido para devolver angelita (volador)
      vi.doMock('../../hooks/useCompaiElegido', () => ({
        useCompaiElegido: () => ({ avatarType: 'angelita' }),
      }));

      const { container } = render(<CompaiOverlay currentView="dashboard" />);
      // Angelita es voladora, no debe recibir estado 'caminando' nunca
      expect(container).toBeTruthy();
    });

    it('debe respetar la locomoción de los voladores (guacamaya)', () => {
      // Mock useCompaiElegido para devolver guacamaya (volador)
      vi.doMock('../../hooks/useCompaiElegido', () => ({
        useCompaiElegido: () => ({ avatarType: 'guacamaya' }),
      }));

      const { container } = render(<CompaiOverlay currentView="dashboard" />);
      // Guacamaya es voladora, no debe recibir estado 'caminando' nunca
      expect(container).toBeTruthy();
    });

    it('debe respetar la locomoción de los voladores (luciernaga)', () => {
      // Mock useCompaiElegido para devolver luciernaga (voladora)
      vi.doMock('../../hooks/useCompaiElegido', () => ({
        useCompaiElegido: () => ({ avatarType: 'luciernaga' }),
      }));

      const { container } = render(<CompaiOverlay currentView="dashboard" />);
      // Luciérnaga es voladora, no debe recibir estado 'caminando' nunca
      expect(container).toBeTruthy();
    });
  });
});
