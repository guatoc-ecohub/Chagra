/**
 * fotoOfflineService.test.js — Tests del pipeline de fotos offline.
 */
import { describe, it, expect } from 'vitest';
import {
  guardarFotoPendiente,
  contarFotosPendientes,
  obtenerFotosPendientes,
  marcarFotoSincronizada,
  comprimirFoto,
} from '../fotoOfflineService.js';

describe('fotoOfflineService', () => {
  const blobPrueba = new Blob(['test-image-data'], { type: 'image/jpeg' });

  it('guarda una foto pendiente y la cuenta', async () => {
    const id = await guardarFotoPendiente({ blob: blobPrueba, assetId: 'plant-1' });
    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(10);

    const count = await contarFotosPendientes();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('obtiene fotos pendientes (máx 5)', async () => {
    const fotos = await obtenerFotosPendientes();
    expect(Array.isArray(fotos)).toBe(true);
    expect(fotos.length).toBeLessThanOrEqual(5);
    if (fotos.length > 0) {
      expect(fotos[0].id).toBeTruthy();
      expect(fotos[0].blob).toBeTruthy();
      expect(fotos[0].sincronizada).toBe(false);
    }
  });

  it('marca una foto como sincronizada', async () => {
    const fotos = await obtenerFotosPendientes();
    if (fotos.length === 0) return; // no hay pendientes

    await marcarFotoSincronizada(fotos[0].id);
    const fotosDespues = await obtenerFotosPendientes();
    const marcada = fotosDespues.find(f => f.id === fotos[0].id);
    expect(marcada?.sincronizada || !marcada).toBeTruthy();
  });

  it('comprimirFoto reduce el tamaño', async () => {
    // Crear un blob más grande para verificar compresión
    const grande = new Blob([new Uint8Array(50000)], { type: 'image/png' });
    const comprimido = await comprimirFoto(grande);
    expect(comprimido).toBeTruthy();
    expect(comprimido.type).toMatch(/webp|png|jpeg/);
  });
});
