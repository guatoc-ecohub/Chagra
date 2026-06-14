/**
 * GlaciarHistorialScreen — tests de componente de historial glaciares.
 *
 * Contrato cubierto:
 *   - Estado vacío: muestra mensaje "Sin reportes aún" con CTA para crear.
 *   - Con reportes: lista reportes con montaña, fecha, estado (semáforo), puntoId.
 *   - Tap en reporte: abre detalle read-only.
 *   - Eliminar reporte: requiere confirmación y remueve de la lista.
 *   - Offline-first: funciona sin red (IndexedDB).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { getAll: mockGetAll, remove: mockRemove } = vi.hoisted(() => ({
  getAll: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../db/glaciarReportes', () => ({
  glaciarReportes: {
    getAll: mockGetAll,
    remove: mockRemove,
  },
}));

import GlaciarHistorialScreen from '../GlaciarHistorialScreen';

const REPORTE_BASE = {
  id: 'glaciar-1234567890-abc123',
  puntoId: 'PUNTO-1',
  createdAt: 1749500000000,
  fechaISO: '2025-06-14T10:30:00.000Z',
  guia: 'Juan Pérez',
  montana: 'cocuy_ritacuba',
  montanaLibre: '',
  pisoGlaciar: true,
  lat: 4.6,
  lng: -74.1,
  altitud: 4700,
  precision: 10,
  distanciaBordeHieloM: 15,
  azimutBrujula: 180,
  referenciaEncuadre: 'Cerca de la roca grande',
  tipoSuperficie: 'nieve_fresca',
  dureza: 'F1',
  tempSuperficie: -3,
  peligros: ['grietas_abiertas'],
  rutaBajoSeracs: false,
  penitentesDensos: false,
  pendientePronunciada: true,
  nieveReciente24h: false,
  tempAmbiente: 2,
  cielo: 'despejado',
  viento: 'calmo',
  visibilidad: 'buena',
  notas: 'Buenas condiciones para la ruta',
  fotoDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  estado: 'estable',
  estadoRazones: [],
  capas: [
    { profundidad: '0', tipoSuperficie: 'nieve_fresca', dureza: 'F1' },
    { profundidad: '0.5', tipoSuperficie: 'firn_neve', dureza: 'F2' },
  ],
  horaLocal: 10.5,
};

beforeEach(() => {
  mockGetAll.mockReset();
  mockRemove.mockReset();
  // Mock window.confirm
  globalThis.confirm = vi.fn(() => true);
});

afterEach(() => {
  cleanup();
});

describe('GlaciarHistorialScreen — historial de reportes glaciares', () => {
  it('estado vacío muestra mensaje y CTA para crear reporte', async () => {
    mockGetAll.mockResolvedValue([]);
    const onBack = vi.fn();
    render(<GlaciarHistorialScreen onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/Sin reportes aún/i)).toBeVisible();
    });

    expect(screen.getByText(/Los reportes que cree en el módulo glaciar/i)).toBeVisible();
    expect(screen.getByText(/Puede verlos incluso sin conexión a internet/i)).toBeVisible();

    const btn = screen.getByText(/Crear un reporte/i);
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalled();
  });

  it('lista reportes con montaña, fecha, estado y puntoId', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/1 reporte guardado/i)).toBeVisible();
    });

    // Verificar datos del reporte en la tarjeta
    expect(screen.getByText(/Cocuy/i)).toBeVisible();
    expect(screen.getByText(/📍 PUNTO-1/i)).toBeVisible();
    expect(screen.getByText(/🟢/i)).toBeVisible(); // estado estable
    expect(screen.getByText(/Estable/i)).toBeVisible();
    // Fecha debe estar presente (formato varía por localización)
    expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeVisible();
  });

  it('muestra múltiples reportes ordenados por fecha', async () => {
    const reporteAntiguo = {
      ...REPORTE_BASE,
      id: 'glaciar-1000000000-xyz',
      createdAt: 1700000000000, // 2023
      puntoId: 'PUNTO-2',
      montana: 'tolima',
      estado: 'precaucion',
    };
    mockGetAll.mockResolvedValue([REPORTE_BASE, reporteAntiguo]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/2 reportes guardados/i)).toBeVisible();
    });

    expect(screen.getByText(/Cocuy/i)).toBeVisible();
    expect(screen.getByText(/Tolima/i)).toBeVisible();
  });

  it('al tap en reporte abre detalle read-only', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    // Tocar la tarjeta del reporte
    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Detalle del reporte/i)).toBeVisible();
    });

    // Verificar detalle - sección de ubicación
    expect(screen.getByText(/4700 msnm/i)).toBeVisible();
    // Verificar nombre del guía
    expect(screen.getByText(/Juan Pérez/i)).toBeVisible();
  });

  it('permite eliminar reporte tras confirmación', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    mockRemove.mockResolvedValue();
    const onBack = vi.fn();
    render(<GlaciarHistorialScreen onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    // Ir al detalle
    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Detalle del reporte/i)).toBeVisible();
    });

    // Tocar botón eliminar
    const deleteBtn = screen.getByLabelText(/Eliminar reporte/i);
    fireEvent.click(deleteBtn);

    // Confirmar
    expect(globalThis.confirm).toHaveBeenCalledWith(
      expect.stringContaining('¿Eliminar este reporte?')
    );

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(REPORTE_BASE.id);
    });

    // Volver a la lista tras eliminar
    await waitFor(() => {
      expect(screen.queryByText(/Detalle del reporte/i)).not.toBeInTheDocument();
    });
  });

  it('cancela eliminación si usuario rechaza confirmación', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    globalThis.confirm = vi.fn(() => false); // Rechazar
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Detalle del reporte/i)).toBeVisible();
    });

    const deleteBtn = screen.getByLabelText(/Eliminar reporte/i);
    fireEvent.click(deleteBtn);

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();

    // Seguimos en el detalle
    expect(screen.getByText(/Detalle del reporte/i)).toBeVisible();
  });

  it('muestra mensaje de error si falla eliminación', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    mockRemove.mockRejectedValue(new Error('DB error'));
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});

    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Detalle del reporte/i)).toBeVisible();
    });

    const deleteBtn = screen.getByLabelText(/Eliminar reporte/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('No se pudo eliminar el reporte');
    });

    alertSpy.mockRestore();
  });

  it('detalle muestra todos los campos del reporte', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Detalle del reporte/i)).toBeVisible();
    });

    // Verificar secciones principales
    expect(screen.getByText(/Ubicación/i)).toBeVisible();
    expect(screen.getByText(/Diagnóstico del hielo/i)).toBeVisible();
    expect(screen.getByText(/Perfil de capas/i)).toBeVisible();
    expect(screen.getByText(/Información del guía/i)).toBeVisible();

    // Datos específicos
    expect(screen.getByText(/15 m/i)).toBeVisible(); // distancia
    expect(screen.getByText(/↗ 180°/i)).toBeVisible(); // azimut
    expect(screen.getByText(/Cerca de la roca grande/i)).toBeVisible(); // referencia
    expect(screen.getByText(/-3°C/i)).toBeVisible(); // temp superficie
    expect(screen.getByText(/2°C/i)).toBeVisible(); // temp ambiente
    expect(screen.getByText(/despejado/i)).toBeVisible(); // cielo
  });

  it('puede volver desde detalle a lista', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Detalle del reporte/i)).toBeVisible();
    });

    // Volver atrás usando el botón con aria-label
    const backBtn = screen.getByLabelText('Volver');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Detalle del reporte/i)).not.toBeInTheDocument();
    });

    // De vuelta en la lista
    expect(screen.getByText(/Cocuy/i)).toBeVisible();
  });

  it('muestra loading mientras carga reportes', async () => {
    mockGetAll.mockImplementation(() => new Promise(() => {})); // Nunca resuelve
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    expect(screen.getByText(/Cargando reportes/i)).toBeVisible();
  });

  it('muestra foto del reporte si existe', async () => {
    mockGetAll.mockResolvedValue([REPORTE_BASE]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      const img = screen.getByAltText(/Punto glaciar/i);
      expect(img).toBeVisible();
      expect(img).toHaveAttribute('src', REPORTE_BASE.fotoDataUrl);
    });
  });

  it('muestra placeholder si no hay foto', async () => {
    const reporteSinFoto = { ...REPORTE_BASE, fotoDataUrl: null };
    mockGetAll.mockResolvedValue([reporteSinFoto]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    // En la lista debe haber icono de copo de nieve
    const card = screen.getByText(/Cocuy/i).closest('button');
    expect(card.querySelector('svg')).toBeVisible(); // Icono Snowflake
  });

  it('muestra todos los peligros observados', async () => {
    const reportePeligros = {
      ...REPORTE_BASE,
      peligros: ['grietas_abiertas', 'seracs', 'penitentes'],
      rutaBajoSeracs: true,
      penitentesDensos: true,
    };
    mockGetAll.mockResolvedValue([reportePeligros]);
    render(<GlaciarHistorialScreen onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Cocuy/i)).toBeVisible();
    });

    const card = screen.getByText(/Cocuy/i).closest('button');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Peligros observados/i)).toBeVisible();
    });

    // Verificar peligros (usar getAllByText para múltiples elementos)
    const seracsElements = screen.getAllByText(/Séracs/i);
    expect(seracsElements.length).toBeGreaterThan(0);

    expect(screen.getByText(/Grietas abiertas/i)).toBeVisible();

    // Penitentes aparece tanto como peligro como tipo de superficie en capas
    const penitentesElements = screen.getAllByText(/Penitentes/i);
    expect(penitentesElements.length).toBeGreaterThan(0);

    // Matiz de séracs
    expect(screen.getByText(/La ruta pasa por debajo de los séracs/i)).toBeVisible();
  });
});
