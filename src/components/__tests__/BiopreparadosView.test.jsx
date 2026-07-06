import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Tests — BiopreparadosView (fichas ilustradas de biopreparados).
 *
 * Mockea el catálogo (getAllBiopreparados) y el grafo (loadGrafoRelations) para
 * verificar el render de la ficha: nombre, propósito, confianza, dosis,
 * cada-cuánto, cultivos del grafo, banda de seguridad y preparación paso a paso.
 * Usa ids REALES del seed para que el overlay de diagramas (tieneDiagrama /
 * BiopreparadoDiagrama) tenga contenido curado y no se rompa.
 */

vi.mock('../../db/catalogDB', () => ({
  getAllBiopreparados: vi.fn(() =>
    Promise.resolve([
      {
        id: 'caldo_bordeles',
        nombre: 'Caldo bordelés',
        tipo: 'caldo',
        proposito: ['fitosanitario_preventivo'],
        ingredientes: ['sulfato de cobre', 'cal hidratada', 'agua'],
        proceso_resumen: '100g sulfato + 100g cal en 10L agua.',
        tiempo_elaboracion_dias: 1,
        vida_util_dias: 1,
        dosis: 'Concentración estándar 1% (10 g sulfato + 10 g cal por L).',
        frecuencia: 'Foliar preventivo cada 8 a 15 días.',
        metodo: 'foliar (aspersión cubriendo haz y envés)',
        target: ['phytophthora_infestans', 'mildeo_velloso', 'roya_cafe'],
        valor_pedagogico: 'El cobre neutralizado con cal forma un depósito que impide germinar a las esporas del hongo.',
        precaucion_seguridad: 'TOXICOLOGÍA COBRE: metal pesado, fitotóxico en exceso.',
        fuente: 'Restrepo Rivera, J. — ABC de la agricultura orgánica.',
        confianza: 'alta',
        safety_class: 'alto',
        ppe_required: ['guantes', 'careta', 'gafas'],
        do_not_use_when: ['floracion'],
        reentry_interval_dias: 21,
      },
      {
        id: 'bocashi',
        nombre: 'Bocashi',
        tipo: 'fermentado',
        proposito: ['fertilizacion', 'estimulante_microbiano'],
        ingredientes: ['gallinaza', 'melaza', 'agua'],
        proceso_resumen: 'Fermentación aeróbica 15-21 días.',
        tiempo_elaboracion_dias: 18,
        vida_util_dias: 180,
        dosis: '1-2 kg/m² al voleo en cama de siembra.',
        uso: 'Incorporado al suelo pre-siembra, cada ciclo de cultivo.',
        target: ['fertilizante_general', 'inoculacion_microbiana_suelo'],
        valor_pedagogico: 'Fermento sólido que multiplica la microbiota y libera nutrientes lentamente.',
        source_ids: ['restrepo-1996-bocashi', 'agrosavia-manual-biopreparados-2015'],
        confianza: 'media',
        safety_class: 'bajo',
        ppe_required: ['tapabocas'],
        _curation_status: 'BORRADOR_IA',
      },
    ]),
  ),
}));

vi.mock('../../services/grafoRelations', () => ({
  loadGrafoRelations: vi.fn(() =>
    Promise.resolve({
      solanum_lycopersicum: {
        nombre_comun: 'Tomate San Marzano',
        biopreparados: [{ id: 'caldo_bordeles' }, { id: 'bocashi' }],
      },
      coffea_arabica: {
        nombre_comun: 'Café caturra',
        biopreparados: [{ id: 'caldo_bordeles' }],
      },
    }),
  ),
}));

describe('BiopreparadosView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la intro y las fichas por biopreparado', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    await waitFor(() => {
      expect(screen.getByText(/Las recetas de la finca/i)).toBeInTheDocument();
      expect(screen.getByTestId('ficha-caldo_bordeles')).toBeInTheDocument();
      expect(screen.getByTestId('ficha-bocashi')).toBeInTheDocument();
    });
  });

  it('muestra la confianza del catálogo por ficha', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    await waitFor(() => {
      expect(screen.getByTestId('confianza-caldo_bordeles')).toHaveTextContent(/alta/i);
      expect(screen.getByTestId('confianza-bocashi')).toHaveTextContent(/media/i);
    });
  });

  it('muestra dosis y cada-cuánto desde el catálogo', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    await waitFor(() => {
      const ficha = screen.getByTestId('ficha-caldo_bordeles');
      expect(within(ficha).getByText(/Concentración estándar 1%/i)).toBeInTheDocument();
      expect(within(ficha).getByText(/cada 8 a 15 días/i)).toBeInTheDocument();
    });
  });

  it('muestra los objetivos del catálogo (target) humanizados', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    await waitFor(() => {
      const ficha = screen.getByTestId('ficha-caldo_bordeles');
      expect(within(ficha).getByText(/Para qué sirve/i)).toBeInTheDocument();
      expect(within(ficha).getByText(/phytophthora infestans/i)).toBeInTheDocument();
      expect(within(ficha).getByText(/mildeo velloso/i)).toBeInTheDocument();
    });
  });

  it('muestra el uso, el valor pedagógico y la marca de borrador IA', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    const toggle = await screen.findByTestId('toggle-porque-bocashi');
    const ficha = screen.getByTestId('ficha-bocashi');
    expect(within(ficha).getByText(/Incorporado al suelo pre-siembra/i)).toBeInTheDocument();
    expect(within(ficha).getByText(/Borrador IA/i)).toBeInTheDocument();
    // Fuente resuelta desde source_ids (sin campo `fuente`).
    expect(within(ficha).getByText(/restrepo 1996 bocashi/i)).toBeInTheDocument();
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(within(ficha).getByText(/multiplica la microbiota/i)).toBeInTheDocument();
    });
  });

  it('muestra los cultivos asociados del grafo (se usa en)', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    await waitFor(() => {
      const ficha = screen.getByTestId('ficha-caldo_bordeles');
      expect(within(ficha).getByText(/Se usa en/i)).toBeInTheDocument();
      expect(within(ficha).getByText(/Tomate San Marzano/i)).toBeInTheDocument();
      expect(within(ficha).getByText(/Café caturra/i)).toBeInTheDocument();
    });
  });

  it('muestra la banda de seguridad con EPI y "no usar en"', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    await waitFor(() => {
      const ficha = screen.getByTestId('ficha-caldo_bordeles');
      expect(within(ficha).getByTestId('banda-seguridad')).toBeInTheDocument();
      expect(within(ficha).getByText(/guantes/i)).toBeInTheDocument();
      expect(within(ficha).getByText(/No en floracion/i)).toBeInTheDocument();
      expect(within(ficha).getByText(/Reingreso 21 d/i)).toBeInTheDocument();
    });
  });

  it('despliega la preparación paso a paso al pulsar el toggle', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    const toggle = await screen.findByTestId('toggle-preparacion-caldo_bordeles');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const ficha = screen.getByTestId('ficha-caldo_bordeles');
      // BiopreparadoDiagrama renderiza el stepper "Paso a paso".
      expect(within(ficha).getByTestId('biopreparado-diagrama')).toBeInTheDocument();
    });
  });

  it('filtra por grupo práctico (Caldos)', async () => {
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    const filtro = await screen.findByTestId('filtro-Caldos');
    fireEvent.click(filtro);
    await waitFor(() => {
      expect(screen.getByTestId('ficha-caldo_bordeles')).toBeInTheDocument();
      expect(screen.queryByTestId('ficha-bocashi')).not.toBeInTheDocument();
    });
  });

  it('no se cae si el grafo falla (oculta cultivos)', async () => {
    const grafo = await import('../../services/grafoRelations');
    grafo.loadGrafoRelations.mockResolvedValueOnce(null);
    const { default: BiopreparadosView } = await import('../BiopreparadosView');
    render(<BiopreparadosView />);
    await waitFor(() => {
      expect(screen.getByTestId('ficha-bocashi')).toBeInTheDocument();
    });
  });
});
