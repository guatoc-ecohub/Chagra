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
      seguridad: {
        nivel: 'precaucion',
        alertas: ['Use frascos limpios y manos limpias.'],
        descartar_si: ['Aparece moho en la superficie.'],
        poblacion_riesgo: 'Higiene reforzada para niños pequeños.',
      },
      fuentes: ['INVIMA — inocuidad de alimentos'],
    },
    {
      id: 'veto_conservas_anaerobias',
      nombre: 'VETO: Conservas anaerobias caseras',
      tipo: 'veto',
      descripcion: 'CONSERVAS EN FRASCOS SELLADOS.',
      razon_veto: 'Riesgo de botulismo.',
      riesgo_nivel: 'CRÍTICO',
      consecuencia_potencial: 'MUERTE',
      fuentes: ['FDA Food Safety — botulismo'],
    },
  ])),
}));

describe('FermentosView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar título de fermentos alimentarios', async () => {
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/Fermentos alimentarios/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar advertencias de seguridad en rojo', async () => {
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/ADVERTENCIAS DE SEGURIDAD CRÍTICAS/i)).toBeInTheDocument();
      // "botulismo" aparece tanto en el veto como en la sección de fuentes;
      // verificamos que esté presente (al menos una vez).
      expect(screen.getAllByText(/botulismo/i).length).toBeGreaterThan(0);
    });

    // Verificar que los vetos tengan clase de border rojo
    const vetoSection = screen.getByText(/ADVERTENCIAS DE SEGURIDAD CRÍTICAS/i).closest('section');
    expect(vetoSection).toHaveClass('border-red-700');
  });

  it('debería mostrar fermentos alimentarios con pasos', async () => {
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/Masato de maíz/i)).toBeInTheDocument();
      expect(screen.getByText(/Paso 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Paso 2/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar nivel de riesgo en vetos', async () => {
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/CRÍTICO/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar consecuencia potencial en vetos', async () => {
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/Consecuencia: MUERTE/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar el bloque de SEGURIDAD destacado por fermento', async () => {
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      // El bloque de seguridad por fermento existe y no está vacío.
      expect(screen.getByTestId('bloque-seguridad')).toBeInTheDocument();
      expect(screen.getByText(/manos limpias/i)).toBeInTheDocument();
      expect(screen.getByText(/no lo pruebe/i)).toBeInTheDocument();
      expect(screen.getByText(/Aparece moho/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar la sección de fuentes públicas de seguridad', async () => {
    const { default: FermentosView } = await import('../FermentosView');

    render(<FermentosView />);

    await waitFor(() => {
      expect(screen.getByText(/Fuentes de seguridad alimentaria/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /INVIMA/i })).toBeInTheDocument();
    });
  });
});
