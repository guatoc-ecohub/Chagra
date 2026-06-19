import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock de getAllFermentos
vi.mock('../../db/catalogDB', () => ({
  getAllFermentos: vi.fn(() => Promise.resolve([
    {
      id: 'masato_maiz',
      nombre: 'Masato de maíz',
      tipo: 'alimentario',
      descripcion: 'Bebida tradicional fermentada de maíz.',
      pasos: ['Paso 1', 'Paso 2'],
      tiempo_elaboracion_horas: 48,
      vida_util_dias: 3,
    },
    {
      id: 'veto_conservas_anaerobias',
      nombre: 'VETO: Conservas anaerobias caseras',
      tipo: 'veto',
      descripcion: 'CONSERVAS EN FRASCOS SELLADOS.',
      razon_veto: 'Riesgo de botulismo.',
      riesgo_nivel: 'CRÍTICO',
      consecuencia_potencial: 'MUERTE',
    },
  ])),
}));

describe('FermentosView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar título de fermentos alimentarios', async () => {
    const { getAllFermentos } = await import('../../db/catalogDB');
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/Fermentos alimentarios/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar advertencias de seguridad en rojo', async () => {
    const { getAllFermentos } = await import('../../db/catalogDB');
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/ADVERTENCIAS DE SEGURIDAD CRÍTICAS/i)).toBeInTheDocument();
      expect(screen.getByText(/botulismo/i)).toBeInTheDocument();
    });

    // Verificar que los vetos tengan clase de border rojo
    const vetoSection = screen.getByText(/ADVERTENCIAS DE SEGURIDAD CRÍTICAS/i).closest('section');
    expect(vetoSection).toHaveClass('border-red-700');
  });

  it('debería mostrar fermentos alimentarios con pasos', async () => {
    const { getAllFermentos } = await import('../../db/catalogDB');
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/Masato de maíz/i)).toBeInTheDocument();
      expect(screen.getByText(/Paso 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Paso 2/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar nivel de riesgo en vetos', async () => {
    const { getAllFermentos } = await import('../../db/catalogDB');
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/CRÍTICO/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar consecuencia potencial en vetos', async () => {
    const { getAllFermentos } = await import('../../db/catalogDB');
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/Consecuencia: MUERTE/i)).toBeInTheDocument();
    });
  });
});
