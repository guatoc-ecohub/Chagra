/**
 * imageProcessor.test.js — Tests unitarios para optimizacion de imagenes (TAREA 56).
 *
 * Cubre optimizeImage (redimension + compresion WebP) y blobToDataUrl
 * (conversion a data URL para previews). Usa canvas mock porque jsdom
 * no implementa HTMLCanvasElement.toBlob ni drawImage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock canvas antes de importar el modulo ──────────────────────────────────

const mockToBlob = vi.fn();
const mockDrawImage = vi.fn();
const mockGetContext = vi.fn(() => ({
  drawImage: mockDrawImage,
}));

const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  vi.clearAllMocks();

  // Mock canvas
  document.createElement = vi.fn((tag) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: mockGetContext,
        toBlob: mockToBlob,
      };
    }
    return originalCreateElement(tag);
  });

  // Mock URL.createObjectURL / revokeObjectURL
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  globalThis.URL.revokeObjectURL = vi.fn();

  // Mock Image constructor
  globalThis.Image = class {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.src = '';
      // Simular carga exitosa con dimensiones conocidas
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  };
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('imageProcessor', () => {
  describe('optimizeImage', () => {
    it('redimensiona imagen cuando el ancho excede maxWidth', async () => {
      const { optimizeImage } = await import('../imageProcessor.js');

      // Mock toBlob exitoso
      mockToBlob.mockImplementation((cb) => {
        cb(new Blob(['fake-webp'], { type: 'image/webp' }));
      });

      const file = new Blob(['fake-image-data'], { type: 'image/png' });

      const blob = await optimizeImage(file, 1280, 0.8);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/webp');
      expect(mockGetContext).toHaveBeenCalledWith('2d');
      expect(mockToBlob).toHaveBeenCalled();
      // verify que se paso calidad 0.8 y formato webp
      expect(mockToBlob.mock.calls[0][1]).toBe('image/webp');
      expect(mockToBlob.mock.calls[0][2]).toBe(0.8);
    });

    it('NO redimensiona si el ancho es menor que maxWidth', async () => {
      const { optimizeImage } = await import('../imageProcessor.js');

      mockToBlob.mockImplementation((cb) => cb(new Blob(['small'], { type: 'image/webp' })));

      const file = new Blob(['small-image'], { type: 'image/png' });
      const blob = await optimizeImage(file, 4096, 0.9);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockToBlob).toHaveBeenCalled();
      expect(mockToBlob.mock.calls[0][2]).toBe(0.9);
    });

    it('usa valores por defecto (maxWidth=1280, quality=0.8)', async () => {
      const { optimizeImage } = await import('../imageProcessor.js');

      mockToBlob.mockImplementation((cb) => cb(new Blob(['data'], { type: 'image/webp' })));

      await optimizeImage(new Blob(['data'], { type: 'image/jpeg' }));

      expect(mockToBlob.mock.calls[0][2]).toBe(0.8);
    });

    it('rechaza si toBlob retorna null', async () => {
      const { optimizeImage } = await import('../imageProcessor.js');

      mockToBlob.mockImplementation((cb) => cb(null)); // simula fallo

      const badFile = new Blob(['bad'], { type: 'image/png' });
      await expect(optimizeImage(badFile)).rejects.toThrow('Canvas.toBlob retornó null');
    });

    it('rechaza si la imagen falla al cargar', async () => {
      const { optimizeImage } = await import('../imageProcessor.js');

      // Sobrescribir Image para que falle
      const SavedImage = globalThis.Image;
      globalThis.Image = class {
        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('load error'));
          }, 0);
        }
      };

      const corruptFile = new Blob(['corrupt'], { type: 'image/png' });
      await expect(optimizeImage(corruptFile)).rejects.toThrow('Error cargando imagen');

      globalThis.Image = SavedImage;
    });
  });

  describe('blobToDataUrl', () => {
    it('convierte blob a data URL string', async () => {
      const { blobToDataUrl } = await import('../imageProcessor.js');

      const originalFileReader = globalThis.FileReader;
      const fakeFileReader = class {
        constructor() {
          this.result = 'data:image/webp;base64,abc123';
          setTimeout(() => {
            if (this.onloadend) this.onloadend();
          }, 0);
        }
      };
      fakeFileReader.prototype.readAsDataURL = vi.fn();
      globalThis.FileReader = fakeFileReader;

      const blob = new Blob(['test'], { type: 'image/webp' });
      const result = await blobToDataUrl(blob);

      expect(result).toBe('data:image/webp;base64,abc123');

      globalThis.FileReader = originalFileReader;
    });

    it('rechaza si FileReader devuelve tipo inesperado', async () => {
      const { blobToDataUrl } = await import('../imageProcessor.js');

      const originalFileReader = globalThis.FileReader;
      const fakeFileReader = class {
        constructor() {
          this.result = null;
          setTimeout(() => {
            if (this.onloadend) this.onloadend();
          }, 0);
        }
      };
      fakeFileReader.prototype.readAsDataURL = vi.fn();
      globalThis.FileReader = fakeFileReader;

      const blob = new Blob(['test'], { type: 'image/webp' });
      await expect(blobToDataUrl(blob)).rejects.toThrow('tipo inesperado');

      globalThis.FileReader = originalFileReader;
    });

    it('rechaza si FileReader.onerror se dispara', async () => {
      const { blobToDataUrl } = await import('../imageProcessor.js');

      const readerError = new Error('read failed');

      const originalFileReader = globalThis.FileReader;
      const fakeFileReader = class {
        constructor() {
          this.error = readerError;
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      };
      fakeFileReader.prototype.readAsDataURL = vi.fn();
      globalThis.FileReader = fakeFileReader;

      const blob = new Blob(['test'], { type: 'image/webp' });
      await expect(blobToDataUrl(blob)).rejects.toBe(readerError);

      globalThis.FileReader = originalFileReader;
    });
  });
});
