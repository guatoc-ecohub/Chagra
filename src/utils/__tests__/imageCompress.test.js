// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * imageCompress.test.js — verifica la política de compresión cliente-lado
 * antes de mandar al sidecar / agente.
 *
 * jsdom no implementa Canvas/Image realmente — mockeamos las APIs mínimas
 * (createImageBitmap, OffscreenCanvas/canvas.toBlob) y devolvemos blobs de
 * tamaño controlado para verificar que la lógica del retry/fallback/reject
 * funciona como está escrito en la spec.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/** @type {any} */
let compressImage;
/** @type {any} */
let IMAGE_TOO_LARGE_MESSAGE;
/** @type {any} */
let __test;

/** @type {number[]} */
let blobSizesQueue = [];

beforeEach(async () => {
  blobSizesQueue = [];

  // 1) Mock createImageBitmap — devuelve un "bitmap" con dims conocidas.
  globalThis.createImageBitmap = vi.fn().mockImplementation(async () => ({
    width: 4000,
    height: 3000,
    close: vi.fn(),
  }));

  // 2) Mock OffscreenCanvas para que sea predictible (presente y funcional).
  class MockOffscreenCanvas {
    /**
     * @param {any} w
     * @param {any} h
     */
    constructor(w, h) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return { drawImage: vi.fn() };
    }
    async convertToBlob({ type } = { type: 'image/jpeg' }) {
      const size = blobSizesQueue.shift() ?? 100 * 1024; // default 100 KB
      // En entornos jsdom no podemos generar un JPEG real — fabricamos un Blob
      // con tamaño controlado vía un Uint8Array. El contenido es irrelevante:
      // los assertions miran .size, no los bytes.
      const buf = new Uint8Array(size);
      return new Blob([buf], { type });
    }
  }
  globalThis.OffscreenCanvas = /** @type {any} */ (MockOffscreenCanvas);

  // Reset del module registry para que el `typeof OffscreenCanvas === 'function'`
  // chequeado dentro de imageCompress.js refleje el mock recién instalado.
  vi.resetModules();
  const mod = await import('../imageCompress.js');
  compressImage = mod.compressImage;
  IMAGE_TOO_LARGE_MESSAGE = mod.IMAGE_TOO_LARGE_MESSAGE;
  __test = mod.__test;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('compressImage', () => {
  it('exporta una constante con el mensaje toast canónico', () => {
    expect(IMAGE_TOO_LARGE_MESSAGE).toMatch(/muy grande/i);
  });

  it('expone defaults verificables vía __test', () => {
    expect(__test.DEFAULT_MAX_DIMENSION).toBe(1600);
    expect(__test.DEFAULT_QUALITY_PRIMARY).toBeCloseTo(0.85, 5);
    expect(__test.DEFAULT_QUALITY_FALLBACK).toBeCloseTo(0.7, 5);
    expect(__test.DEFAULT_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(__test.DEFAULT_MIME).toBe('image/jpeg');
  });

  it('comprime un blob 4000x3000 a lado mayor 1600 manteniendo aspect ratio', async () => {
    blobSizesQueue.push(300 * 1024); // 300 KB en primer intento
    const input = new Blob([new Uint8Array(5 * 1024 * 1024)], { type: 'image/jpeg' });

    const result = await compressImage(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBe(1600);
      expect(result.height).toBe(1200); // 3000 * (1600/4000)
      expect(result.size).toBe(300 * 1024);
      expect(result.originalSize).toBe(5 * 1024 * 1024);
      expect(result.quality).toBeCloseTo(0.85, 5);
      expect(result.blob.type).toBe('image/jpeg');
    }
  });

  it('NO escala si la imagen ya es menor que maxDimension', async () => {
    // Tweak: bitmap más chico que el techo.
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: 800,
      height: 600,
      close: vi.fn(),
    });
    blobSizesQueue.push(150 * 1024);

    const input = new Blob([new Uint8Array(200 * 1024)], { type: 'image/jpeg' });
    const result = await compressImage(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    }
  });

  it('reintenta con quality 0.7 si la primera compresión queda > 2 MB', async () => {
    blobSizesQueue.push(3 * 1024 * 1024); // 3 MB primer intento → demasiado
    blobSizesQueue.push(1.5 * 1024 * 1024); // 1.5 MB con quality 0.7 → ok

    const input = new Blob([new Uint8Array(10 * 1024 * 1024)], { type: 'image/jpeg' });
    const result = await compressImage(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quality).toBeCloseTo(0.7, 5);
      expect(result.size).toBe(1.5 * 1024 * 1024);
    }
  });

  it('rechaza con reason="too_large" si NI el reintento entra en 2 MB', async () => {
    blobSizesQueue.push(3 * 1024 * 1024); // primer intento — demasiado
    blobSizesQueue.push(2.5 * 1024 * 1024); // segundo intento — todavía demasiado

    const input = new Blob([new Uint8Array(15 * 1024 * 1024)], { type: 'image/jpeg' });
    const result = await compressImage(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too_large');
      expect(result.size).toBe(2.5 * 1024 * 1024);
      expect(result.originalSize).toBe(15 * 1024 * 1024);
    }
  });

  it('rechaza con reason="decode_failed" si createImageBitmap tira', async () => {
    globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error('decode bug'));
    // El fallback decodeViaImg también va a fallar en jsdom porque <img> no
    // dispara onload sobre data URLs sintéticas — preempt eso mockeando Image.
    class BrokenImage {
      /**
       * @param {any} _v
       */
      set src(_v) {
        queueMicrotask(() => /** @type {any} */ (this).onerror && /** @type {any} */ (this).onerror());
      }
    }
    globalThis.Image = /** @type {any} */ (BrokenImage);

    const input = new Blob([new Uint8Array(1024)], { type: 'image/jpeg' });
    const result = await compressImage(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('decode_failed');
    }
  });

  it('rechaza con reason="decode_failed" si el blob es null', async () => {
    const result = await compressImage(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('decode_failed');
    }
  });

  it('permite override de opts.maxBytes y opts.maxDimension', async () => {
    // Si subimos maxBytes a 5 MB, un blob de 3 MB en el primer intento debería
    // pasar sin retry.
    blobSizesQueue.push(3 * 1024 * 1024);

    const input = new Blob([new Uint8Array(10 * 1024 * 1024)], { type: 'image/jpeg' });
    const result = await compressImage(input, { maxBytes: 5 * 1024 * 1024, maxDimension: 800 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.size).toBe(3 * 1024 * 1024);
      expect(result.quality).toBeCloseTo(0.85, 5);
    }
  });
});
