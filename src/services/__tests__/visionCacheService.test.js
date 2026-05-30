/**
 * visionCacheService.test.js — TDD para V-11 (#231): cache de respuestas de
 * visión por hash de imagen.
 *
 * Cubre el contrato público del módulo:
 *   - hashImage: determinístico (mismo blob → mismo hash, distinto → distinto).
 *   - getCached / setCached: miss → set → hit.
 *   - NO cachear null/undefined (resultados de error del modelo).
 *   - Eviction LRU cuando se supera MAX_ENTRIES.
 *   - Expiración TTL.
 *   - clearCache helper.
 *
 * Aislamiento: usa `crypto.subtle` (presente en jsdom) y un store en memoria.
 * No requiere IndexedDB ni red. Cada test parte de cache limpio.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashImage,
  getCached,
  setCached,
  clearCache,
  __TEST__,
} from '../visionCacheService.js';

const blobOf = (bytes, type = 'image/jpeg') => new Blob([bytes], { type });

describe('visionCacheService', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('hashImage', () => {
    it('es determinístico: mismos bytes → mismo hash', async () => {
      const a = blobOf('contenido-foto-A');
      const b = blobOf('contenido-foto-A');
      const ha = await hashImage(a);
      const hb = await hashImage(b);
      expect(ha).toBe(hb);
    });

    it('distintos bytes → distinto hash', async () => {
      const ha = await hashImage(blobOf('foto-A'));
      const hb = await hashImage(blobOf('foto-B'));
      expect(ha).not.toBe(hb);
    });

    it('devuelve un hex SHA-256 de 64 chars', async () => {
      const h = await hashImage(blobOf('cualquier-cosa'));
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it('hashea solo por bytes, no por el mime type del Blob', async () => {
      // El contenido es lo que importa; mismo array de bytes con distinto
      // type debe colisionar (el modelo ve los mismos píxeles decodificados).
      const ha = await hashImage(blobOf('pixels', 'image/jpeg'));
      const hb = await hashImage(blobOf('pixels', 'image/webp'));
      expect(ha).toBe(hb);
    });
  });

  describe('getCached / setCached', () => {
    it('miss → null antes de setear', async () => {
      const hit = await getCached('hash-inexistente');
      expect(hit).toBeNull();
    });

    it('miss → set → hit devuelve el mismo valor', async () => {
      const hash = 'abc123';
      const result = { score: 85, issues: ['mancha foliar'], treatment_suggestion: 'caldo bordelés' };
      expect(await getCached(hash)).toBeNull();
      await setCached(hash, result);
      const hit = await getCached(hash);
      expect(hit).toEqual(result);
    });

    it('NO cachea null', async () => {
      await setCached('hash-null', null);
      expect(await getCached('hash-null')).toBeNull();
    });

    it('NO cachea undefined', async () => {
      await setCached('hash-undef', undefined);
      expect(await getCached('hash-undef')).toBeNull();
    });

    it('devuelve una copia (no la misma referencia) para evitar mutación accidental', async () => {
      const result = { score: 50, issues: [] };
      await setCached('h', result);
      const hit = await getCached('h');
      expect(hit).toEqual(result);
      expect(hit).not.toBe(result);
    });
  });

  describe('eviction LRU', () => {
    it('expulsa la entrada menos recientemente usada al superar MAX_ENTRIES', async () => {
      const max = __TEST__.MAX_ENTRIES;
      // Llenar el cache exactamente al límite.
      for (let i = 0; i < max; i += 1) {
        await setCached(`k${i}`, { score: i });
      }
      // k0 es la más vieja. Insertar una nueva entrada → debe expulsar k0.
      await setCached('k-new', { score: 999 });
      expect(await getCached('k0')).toBeNull();
      expect(await getCached('k-new')).toEqual({ score: 999 });
      // k1 sigue presente.
      expect(await getCached('k1')).toEqual({ score: 1 });
    });

    it('un get refresca el recency (LRU real, no FIFO)', async () => {
      const max = __TEST__.MAX_ENTRIES;
      for (let i = 0; i < max; i += 1) {
        await setCached(`k${i}`, { score: i });
      }
      // Tocar k0 → deja de ser el LRU. Ahora k1 es el LRU.
      await getCached('k0');
      await setCached('k-new', { score: 999 });
      expect(await getCached('k0')).toEqual({ score: 0 }); // sobrevivió
      expect(await getCached('k1')).toBeNull(); // expulsado
    });

    it('nunca supera MAX_ENTRIES entradas', async () => {
      const max = __TEST__.MAX_ENTRIES;
      for (let i = 0; i < max + 25; i += 1) {
        await setCached(`k${i}`, { score: i });
      }
      expect(__TEST__.size()).toBeLessThanOrEqual(max);
    });
  });

  describe('expiración TTL', () => {
    it('una entrada más vieja que TTL_MS se considera miss', async () => {
      const hash = 'expira';
      await setCached(hash, { score: 1 });
      // Forzar timestamp viejo manipulando el reloj interno via __TEST__.
      __TEST__.expireEntry(hash);
      expect(await getCached(hash)).toBeNull();
    });

    it('una entrada dentro de TTL sigue siendo hit', async () => {
      await setCached('fresca', { score: 1 });
      expect(await getCached('fresca')).toEqual({ score: 1 });
    });
  });

  describe('clearCache', () => {
    it('vacía todo el store', async () => {
      await setCached('a', { score: 1 });
      await setCached('b', { score: 2 });
      clearCache();
      expect(await getCached('a')).toBeNull();
      expect(await getCached('b')).toBeNull();
      expect(__TEST__.size()).toBe(0);
    });
  });
});
