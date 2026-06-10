/**
 * CicloFotos — cablea photoCycleService (antes huérfano): adjunta una foto a un
 * ciclo. Contrato: al elegir una foto, la guarda y llama attachPhotoToCycle con
 * el processId y el hash de la foto. (Análisis de visión en vivo off por VRAM.)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { captureAndCompress, savePhoto, getPhotoById, attachPhotoToCycle, getFarmEvents } = vi.hoisted(() => ({
  captureAndCompress: vi.fn(),
  savePhoto: vi.fn(),
  getPhotoById: vi.fn(),
  attachPhotoToCycle: vi.fn(),
  getFarmEvents: vi.fn(),
}));

vi.mock('../../services/photoService', () => ({ captureAndCompress, savePhoto, getPhotoById }));
vi.mock('../../services/photoCycleService', () => ({ attachPhotoToCycle }));
vi.mock('../../db/farmProcessCache', () => ({ getFarmEvents }));
vi.mock('../PhotoViewer', () => ({ default: () => null }));

import CicloFotos from '../CicloFotos';

beforeEach(() => {
  captureAndCompress.mockReset().mockResolvedValue({ blob: new Blob(['x'], { type: 'image/jpeg' }) });
  savePhoto.mockReset().mockResolvedValue(42);
  getPhotoById.mockReset().mockResolvedValue(null);
  attachPhotoToCycle.mockReset().mockResolvedValue({});
  getFarmEvents.mockReset().mockResolvedValue([]);
});
afterEach(() => cleanup());

describe('CicloFotos', () => {
  it('agregar una foto guarda y la adjunta al ciclo (attachPhotoToCycle)', async () => {
    const { container } = render(<CicloFotos processId="p1" />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(attachPhotoToCycle).toHaveBeenCalledTimes(1));
    expect(savePhoto).toHaveBeenCalledTimes(1);
    expect(attachPhotoToCycle.mock.calls[0][0]).toMatchObject({ processId: 'p1', imageHash: '42' });
  });

  it('muestra estado vacío sin fotos', async () => {
    render(<CicloFotos processId="p1" />);
    expect(await screen.findByText(/Aún no hay fotos/i)).toBeTruthy();
  });
});
