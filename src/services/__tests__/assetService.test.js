import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiService.js', () => ({
  fetchFromFarmOS: vi.fn(),
  sendToFarmOS: vi.fn(),
}));

import { fetchFromFarmOS, sendToFarmOS } from '../apiService.js';
import { findPersonByName, renameWorker } from '../assetService.js';

describe('assetService', () => {
  describe('findPersonByName', () => {
    it('retorna null si no hay matches exactos', async () => {
      vi.mocked(fetchFromFarmOS).mockResolvedValue({
        data: [
          { id: '1', attributes: { name: 'Juan Perez' } },
        ],
      });
      const r = await findPersonByName('Pedro');
      expect(r).toBeNull();
    });

    it('retorna persona con nombre exacto', async () => {
      const person = { id: 'p-1', attributes: { name: 'Maria Lopez' } };
      vi.mocked(fetchFromFarmOS).mockResolvedValue({
        data: [person, { id: 'p-2', attributes: { name: 'Maria' } }],
      });
      const r = await findPersonByName('Maria Lopez');
      expect(r).not.toBeNull();
      expect(r.id).toBe('p-1');
      expect(r.attributes.name).toBe('Maria Lopez');
    });
  });

  describe('renameWorker', () => {
    it('retorna success:true al renombrar', async () => {
      const person = { id: 'p-3', attributes: { name: 'Carlos' } };
      vi.mocked(fetchFromFarmOS).mockResolvedValue({
        data: [person],
      });
      vi.mocked(sendToFarmOS).mockResolvedValue({ data: { id: 'p-3' } });

      const r = await renameWorker('Carlos', 'Carlos Actualizado');
      expect(r.success).toBe(true);
      expect(r.id).toBe('p-3');
    });

    it('retorna success:false si persona no encontrada', async () => {
      vi.mocked(fetchFromFarmOS).mockResolvedValue({ data: [] });
      const r = await renameWorker('Inexistente', 'Nuevo');
      expect(r.success).toBe(false);
      expect(r.error).toBe('not_found');
    });

    it('retorna success:false si sendToFarmOS falla', async () => {
      const person = { id: 'p-4', attributes: { name: 'ErrorCase' } };
      vi.mocked(fetchFromFarmOS).mockResolvedValue({ data: [person] });
      vi.mocked(sendToFarmOS).mockRejectedValue(new Error('Network failure'));

      const r = await renameWorker('ErrorCase', 'Nuevo');
      expect(r.success).toBe(false);
      expect(r.error).toBe('Network failure');
    });
  });
});
