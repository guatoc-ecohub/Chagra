import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MiFincaVivaHomeCard from '../MiFincaVivaHomeCard';

// IDB de procesos mockeada (por defecto finca vacía → invita a sembrar).
const listFarmProcessesMock = vi.fn(() => Promise.resolve([]));
vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: (...args) => listFarmProcessesMock(...args),
}));

// Procesos en el shape REAL de producción (anidado en `attributes`).
const fincaConCultivos = () => [
  {
    process_id: 'p1',
    type: 'farm_process',
    attributes: {
      process_type: 'sowing',
      status: 'active',
      current_stage: 'flowering',
      subject_slug: 'coffea_arabica',
      subject_label: 'Café',
    },
  },
  {
    process_id: 'p2',
    type: 'farm_process',
    attributes: {
      process_type: 'sowing',
      status: 'active',
      current_stage: 'harvest',
      subject_slug: 'zea_mays',
      subject_label: 'Maíz',
    },
  },
];

describe('MiFincaVivaHomeCard', () => {
  beforeEach(() => {
    listFarmProcessesMock.mockReset();
    listFarmProcessesMock.mockResolvedValue([]);
  });

  it('finca vacía → invita a sembrar (estado acogedor)', async () => {
    render(<MiFincaVivaHomeCard />);
    expect(await screen.findByTestId('mi-finca-viva-home-card')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Siembra tu primera planta/i)).toBeInTheDocument();
    });
  });

  it('con cultivos → muestra escena y vitalidad real', async () => {
    listFarmProcessesMock.mockResolvedValue(fincaConCultivos());
    render(<MiFincaVivaHomeCard />);
    expect(await screen.findByTestId('finca-scene-2d')).toBeInTheDocument();
    await waitFor(() => {
      // Resumen del campesino: 2 cultivos activos, 1 listo para cosechar.
      expect(screen.getByText(/cultivos activos/i)).toBeInTheDocument();
    });
  });

  it('toca la escena → navega al juego completo', async () => {
    const onNavigate = vi.fn();
    render(<MiFincaVivaHomeCard onNavigate={onNavigate} />);
    const escena = await screen.findByLabelText(/Toca para empezar|Toca para ver tu finca viva/i);
    fireEvent.click(escena);
    expect(onNavigate).toHaveBeenCalledWith('juego');
  });

  it('si IDB falla, no rompe: muestra estado vacío honesto', async () => {
    listFarmProcessesMock.mockRejectedValue(new Error('IDB down'));
    render(<MiFincaVivaHomeCard />);
    expect(await screen.findByTestId('mi-finca-viva-home-card')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Siembra tu primera planta/i)).toBeInTheDocument();
    });
  });
});
