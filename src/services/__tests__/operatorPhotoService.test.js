/**
 * operatorPhotoService.test.js — foto de perfil del operador.
 *
 * Cubre: persistencia local (localStorage) + evento same-tab, redimensionado
 * a data-URL (con Image/FileReader/canvas mockeados — jsdom no los implementa
 * fielmente), y la sincronización a FarmOS (subida file--file + carga
 * cross-device) con apiService/authService mockeados.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mocks de red: apiService (POST/GET FarmOS) + authService (Bearer token).
const sendToFarmOS = vi.fn();
const fetchFromFarmOS = vi.fn();
const getAccessToken = vi.fn();
vi.mock('../apiService.js', () => ({
  sendToFarmOS: (...a) => sendToFarmOS(...a),
  fetchFromFarmOS: (...a) => fetchFromFarmOS(...a),
}));
vi.mock('../authService.js', () => ({
  getAccessToken: (...a) => getAccessToken(...a),
}));

import {
  PHOTO_STORAGE_KEY,
  PHOTO_SYNC_META_KEY,
  getOperatorPhoto,
  setOperatorPhotoLocal,
  removeOperatorPhotoLocal,
  resizePhotoToDataUrl,
  uploadToFarmOS,
  loadFromFarmOS,
  setOperatorPhotoFromFile,
  __test,
} from '../operatorPhotoService.js';
import { setActiveTenantId, _resetForTests } from '../tenantContext.js';

const SAMPLE_DATA_URL = 'data:image/jpeg;base64,/9j/AAAQ'; // bytes irrelevantes

// Instala mocks de Image + FileReader + canvas.toDataURL para que
// resizePhotoToDataUrl corra bajo jsdom devolviendo un data-URL controlado.
function installCanvasMocks({ width = 1024, height = 768 } = {}) {
  globalThis.FileReader = class {
    readAsDataURL() {
      queueMicrotask(() => {
        this.result = SAMPLE_DATA_URL;
        this.onload && this.onload();
      });
    }
  };
  globalThis.Image = class {
    set src(_v) {
      this.width = width;
      this.height = height;
      queueMicrotask(() => this.onload && this.onload());
    }
  };
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: () => SAMPLE_DATA_URL,
      };
    }
    // Cualquier otro tag: delega al real (evita romper testing-library).
    return Reflect.apply(
      HTMLDocument.prototype.createElement,
      document,
      [tag],
    );
  });
}

describe('operatorPhotoService', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTests();
    sendToFarmOS.mockReset();
    fetchFromFarmOS.mockReset();
    getAccessToken.mockReset();
    // onLine = true por defecto (jsdom navigator es read-only → defineProperty).
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('persistencia local + evento', () => {
    it('getOperatorPhoto devuelve "" cuando no hay foto', () => {
      expect(getOperatorPhoto()).toBe('');
    });

    it('setOperatorPhotoLocal persiste y getOperatorPhoto la relee', () => {
      setOperatorPhotoLocal(SAMPLE_DATA_URL);
      expect(getOperatorPhoto()).toBe(SAMPLE_DATA_URL);
      expect(localStorage.getItem(PHOTO_STORAGE_KEY)).toBe(SAMPLE_DATA_URL);
    });

    it('setOperatorPhotoLocal emite chagra:operator-update con la key de foto', () => {
      const handler = vi.fn();
      window.addEventListener('chagra:operator-update', handler);
      setOperatorPhotoLocal(SAMPLE_DATA_URL);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        key: PHOTO_STORAGE_KEY,
        value: SAMPLE_DATA_URL,
      });
      window.removeEventListener('chagra:operator-update', handler);
    });

    it('removeOperatorPhotoLocal limpia foto y meta de sync, y emite evento vacío', () => {
      setOperatorPhotoLocal(SAMPLE_DATA_URL);
      __test.writeSyncMeta({ fileUuid: 'abc' });
      const handler = vi.fn();
      window.addEventListener('chagra:operator-update', handler);

      removeOperatorPhotoLocal();

      expect(getOperatorPhoto()).toBe('');
      expect(localStorage.getItem(PHOTO_SYNC_META_KEY)).toBeNull();
      expect(handler.mock.calls.at(-1)[0].detail).toEqual({ key: PHOTO_STORAGE_KEY, value: '' });
      window.removeEventListener('chagra:operator-update', handler);
    });
  });

  describe('resizePhotoToDataUrl', () => {
    it('redimensiona un File de imagen a data-URL JPEG', async () => {
      installCanvasMocks();
      const file = new File([new Uint8Array(10)], 'foto.jpg', { type: 'image/jpeg' });
      const out = await resizePhotoToDataUrl(file);
      expect(out).toBe(SAMPLE_DATA_URL);
    });

    it('rechaza archivos que no son imagen', async () => {
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
      await expect(resizePhotoToDataUrl(file)).rejects.toThrow(/no parece una imagen/i);
    });
  });

  describe('uploadToFarmOS', () => {
    it('no sube si no hay sesión (tenant)', async () => {
      const r = await uploadToFarmOS(SAMPLE_DATA_URL);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('no-session');
      expect(sendToFarmOS).not.toHaveBeenCalled();
    });

    it('no sube en offline', async () => {
      setActiveTenantId('alice');
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      const r = await uploadToFarmOS(SAMPLE_DATA_URL);
      expect(r.reason).toBe('offline');
      expect(sendToFarmOS).not.toHaveBeenCalled();
    });

    it('POST /api/file/upload con filename scopeado por usuario y guarda meta', async () => {
      setActiveTenantId('alice');
      sendToFarmOS.mockResolvedValue({ data: { id: 'uuid-123', type: 'file--file' } });

      const r = await uploadToFarmOS(SAMPLE_DATA_URL);

      expect(r.ok).toBe(true);
      expect(r.fileUuid).toBe('uuid-123');
      expect(sendToFarmOS).toHaveBeenCalledTimes(1);
      const [endpoint, formData, method] = sendToFarmOS.mock.calls[0];
      expect(endpoint).toBe('/api/file/upload');
      expect(method).toBe('POST');
      expect(formData).toBeInstanceOf(FormData);
      const uploaded = formData.get('file');
      expect(uploaded).toBeInstanceOf(Blob);
      expect(uploaded.name).toMatch(/^chagra-operator-photo-alice-\d+\.jpg$/);
      // meta persistida para evitar re-descargas redundantes.
      expect(__test.readSyncMeta().fileUuid).toBe('uuid-123');
    });

    it('no-throw si la red falla', async () => {
      setActiveTenantId('alice');
      sendToFarmOS.mockRejectedValue(new Error('500'));
      const r = await uploadToFarmOS(SAMPLE_DATA_URL);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('error');
    });
  });

  describe('loadFromFarmOS (cross-device)', () => {
    it('no carga sin sesión', async () => {
      const r = await loadFromFarmOS();
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('no-session');
      expect(fetchFromFarmOS).not.toHaveBeenCalled();
    });

    it('consulta el file más reciente del usuario, lo descarga y lo persiste local', async () => {
      installCanvasMocks();
      setActiveTenantId('bob');
      fetchFromFarmOS.mockResolvedValue({
        data: [{
          id: 'remote-uuid-9',
          attributes: { filename: 'chagra-operator-photo-bob-1.jpg', uri: { url: '/sites/default/files/x.jpg' } },
        }],
      });
      getAccessToken.mockResolvedValue('tok');
      // fetch del blob binario:
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob([new Uint8Array(20)], { type: 'image/jpeg' }),
      });

      const r = await loadFromFarmOS();

      expect(r.ok).toBe(true);
      expect(r.updated).toBe(true);
      // El endpoint filtra por el prefijo scopeado a 'bob'.
      const endpoint = fetchFromFarmOS.mock.calls[0][0];
      expect(endpoint).toContain('/api/file/file');
      expect(endpoint).toContain('CONTAINS');
      expect(endpoint).toContain(encodeURIComponent('chagra-operator-photo-bob-'));
      // Quedó persistida local + meta con el uuid remoto.
      expect(getOperatorPhoto()).toBe(SAMPLE_DATA_URL);
      expect(__test.readSyncMeta().fileUuid).toBe('remote-uuid-9');
    });

    it('no hace nada si el servidor no tiene foto del usuario', async () => {
      setActiveTenantId('bob');
      fetchFromFarmOS.mockResolvedValue({ data: [] });
      const r = await loadFromFarmOS();
      expect(r.ok).toBe(true);
      expect(r.updated).toBe(false);
      expect(getOperatorPhoto()).toBe('');
    });

    it('no re-descarga si el uuid remoto coincide con la última sync local', async () => {
      setActiveTenantId('bob');
      setOperatorPhotoLocal(SAMPLE_DATA_URL);
      __test.writeSyncMeta({ fileUuid: 'same-uuid' });
      fetchFromFarmOS.mockResolvedValue({
        data: [{ id: 'same-uuid', attributes: { filename: 'x', uri: { url: '/x' } } }],
      });
      globalThis.fetch = vi.fn();

      const r = await loadFromFarmOS();

      expect(r.updated).toBe(false);
      expect(r.reason).toBe('already-current');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('setOperatorPhotoFromFile', () => {
    it('redimensiona, persiste local y devuelve el data-URL (sync dispara en background)', async () => {
      installCanvasMocks();
      setActiveTenantId('alice');
      sendToFarmOS.mockResolvedValue({ data: { id: 'bg-uuid' } });
      const file = new File([new Uint8Array(10)], 'foto.jpg', { type: 'image/jpeg' });

      const out = await setOperatorPhotoFromFile(file);

      expect(out).toBe(SAMPLE_DATA_URL);
      expect(getOperatorPhoto()).toBe(SAMPLE_DATA_URL);
      // El upload corre en background (fire-and-forget); esperamos a que llegue.
      await vi.waitFor(() =>
        expect(sendToFarmOS).toHaveBeenCalledWith('/api/file/upload', expect.any(FormData), 'POST'),
      );
    });
  });

  describe('latestPhotoEndpoint helper', () => {
    it('arma el filtro CONTAINS con el prefijo por usuario', () => {
      const ep = __test.latestPhotoEndpoint('carlos');
      expect(ep).toContain('filter[filename][operator]=CONTAINS');
      expect(ep).toContain(encodeURIComponent('chagra-operator-photo-carlos-'));
      expect(ep).toContain('sort=-created');
      expect(ep).toContain('page[limit]=1');
    });
  });
});
