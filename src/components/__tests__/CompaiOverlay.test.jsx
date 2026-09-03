import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import CompaiOverlay from '../CompaiOverlay.jsx';
import useAngelitaStore from '../../store/useAngelitaStore.js';

/**
 * Tests de CompaiOverlay — el compai que CAMINA en la portada campesina B.
 *
 * MIGRACIÓN A PIZARRA ÚNICA (2026-09-03, feedback_pizarra_unico_aviso_compai):
 * este overlay tenía SU PROPIA burbuja de parada (auto-pop al llegar a un
 * punto del paseo, testid `compai-burbuja`) y SU PROPIO panel a medida — un
 * segundo formato de aviso distinto del de AgentFab. Los dos se retiraron;
 * tocar el compai ahora asoma LA MISMA pizarra (`BurbujaPizarraPeek`,
 * testid `compai-fab-peek`) que el resto de la app, y su "Ver" abre el
 * detalle grande (el panel de siempre, mismo testid `compai-panel`, mismo
 * contenido). Nada de información se perdió — solo cambió CÓMO se llega a
 * ella: antes un tap abría el panel directo; ahora un tap asoma la pizarra y
 * "Ver" abre el panel. `compai-burbuja` ya no existe (se prueba su ausencia
 * permanente, no solo "antes de la primera parada").
 *
 * Escenarios:
 *   - Mount: el overlay se monta sin romper nada
 *   - Visibility: burbuja siempre visible; ni la pizarra ni el panel se
 *     auto-pintan solos
 *   - Hint routing: hint cambia según currentView
 *   - Interactions: tocar asoma la pizarra; "Ver" abre el panel; ambos cierran
 *   - Route changes: pizarra/panel cierran al cambiar currentView
 */

const abrirPanelDetalle = async () => {
  fireEvent.click(screen.getByTestId('compai-bubble'));
  await waitFor(() => {
    expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('button', { name: /Ver el mensaje completo/i }));
  await waitFor(() => {
    expect(screen.getByTestId('compai-panel')).toBeInTheDocument();
  });
};

describe('CompaiOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAngelitaStore.setState({ silenciado: false });
  });
  afterEach(cleanup);

  it('debe montarse sin errores', () => {
    const { container } = render(<CompaiOverlay currentView="dashboard" />);
    expect(container).toBeTruthy();
  });

  it('debe renderizar la burbuja flotante por defecto', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');
    expect(bubble).toBeInTheDocument();
  });

  it('no debe renderizar la pizarra ni el panel sin que el usuario toque nada', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    expect(screen.queryByTestId('compai-fab-peek')).not.toBeInTheDocument();
    expect(screen.queryByTestId('compai-panel')).not.toBeInTheDocument();
  });

  it('tocar la burbuja asoma la PIZARRA (no el panel directo)', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    fireEvent.click(screen.getByTestId('compai-bubble'));
    await waitFor(() => {
      expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('compai-panel')).not.toBeInTheDocument();
  });

  it('"Ver" en la pizarra abre el panel de detalle', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    await abrirPanelDetalle();
    expect(screen.getByTestId('compai-panel')).toBeInTheDocument();
  });

  it('debe cerrar el panel al tocar el botón cerrar', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    await abrirPanelDetalle();

    fireEvent.click(screen.getByTestId('compai-close-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('compai-panel')).not.toBeInTheDocument();
    });
  });

  it('"Callar" en la pizarra silencia GLOBAL (antes este overlay no tenía interruptor)', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    fireEvent.click(screen.getByTestId('compai-bubble'));
    await waitFor(() => {
      expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Que se quede callado/i }));
    expect(useAngelitaStore.getState().silenciado).toBe(true);
    expect(screen.queryByTestId('compai-fab-peek')).not.toBeInTheDocument();
  });

  it('debe mostrar el hint de dashboard por defecto', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Bienvenido a su finca')).toBeInTheDocument();
  });

  it('debe cambiar el hint según currentView (perfil)', async () => {
    const { rerender } = render(<CompaiOverlay currentView="dashboard" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Bienvenido a su finca')).toBeInTheDocument();

    // Cambiar a perfil (pizarra/panel se cierran automáticamente)
    rerender(<CompaiOverlay currentView="perfil" />);

    await abrirPanelDetalle();
    expect(screen.getByText('Su perfil de la finca')).toBeInTheDocument();
  });

  it('debe cambiar el hint según currentView (mapa)', async () => {
    render(<CompaiOverlay currentView="mapa" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Su finca en el mapa')).toBeInTheDocument();
  });

  it('debe cambiar el hint según currentView (historial)', async () => {
    render(<CompaiOverlay currentView="historial" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Registro de su finca')).toBeInTheDocument();
  });

  it('debe traer hints enriquecidos de rutas 2D principales (agente, hoy_finca)', async () => {
    render(<CompaiOverlay currentView="agente" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Pregúntele a su compai')).toBeInTheDocument();
  });

  it('debe resolver el catálogo por alias del manifiesto (directorio/especies/plagas)', async () => {
    const { rerender } = render(<CompaiOverlay currentView="especies" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Catálogo de especies')).toBeInTheDocument();

    rerender(<CompaiOverlay currentView="directorio" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Catálogo de especies')).toBeInTheDocument();
  });

  it('debe resolver subrutas por prefijo (animales_gallinas → animales)', async () => {
    render(<CompaiOverlay currentView="animales_gallinas" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Sus animales')).toBeInTheDocument();
  });

  it('la burbuja de parada auto-pop YA NO EXISTE (retirada, la pizarra la reemplazó)', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    // Ni recién montado ni tras tocar el compai aparece el viejo testid.
    expect(screen.queryByTestId('compai-burbuja')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('compai-bubble'));
    await waitFor(() => {
      expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('compai-burbuja')).not.toBeInTheDocument();
  });

  it('debe usar el hint default para rutas desconocidas', async () => {
    render(<CompaiOverlay currentView="ruta-desconocida" />);
    await abrirPanelDetalle();
    expect(screen.getByText('Angelita está aquí')).toBeInTheDocument();
  });

  it('debe cerrar la pizarra y el panel al cambiar de ruta', async () => {
    const { rerender } = render(<CompaiOverlay currentView="dashboard" />);
    await abrirPanelDetalle();

    // Cambiar de ruta
    rerender(<CompaiOverlay currentView="perfil" />);

    await waitFor(() => {
      expect(screen.queryByTestId('compai-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('compai-fab-peek')).not.toBeInTheDocument();
    });
  });

  it('debe tener aria-expanded sincronizado con la pizarra asomada', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    const bubble = screen.getByTestId('compai-bubble');

    expect(bubble).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(bubble);
    await waitFor(() => {
      expect(bubble).toHaveAttribute('aria-expanded', 'true');
    });

    // Descartar la pizarra con su propia ×.
    fireEvent.click(screen.getByRole('button', { name: /Descartar este aviso/i }));

    await waitFor(() => {
      expect(bubble).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('debe renderizar el botón Escuchar en el panel', async () => {
    render(<CompaiOverlay currentView="dashboard" />);
    await abrirPanelDetalle();
    expect(screen.getByTestId('compai-listen-btn')).toBeInTheDocument();
  });

  it('debe tener data-testid en elementos clave para debug', () => {
    render(<CompaiOverlay currentView="dashboard" />);
    expect(screen.getByTestId('compai-overlay-container')).toBeInTheDocument();
    expect(screen.getByTestId('compai-bubble')).toBeInTheDocument();
  });
});
