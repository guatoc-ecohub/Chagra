/**
 * operatorPhotoService.test.js — foto de perfil del operador.
 *
 * Cubre: persistencia local (localStorage) + evento same-tab, redimensionado
 * a data-URL (con Image/FileReader/canvas mockeados — jsdom no los implementa
 * fielmente), y la sincronización a FarmOS (subida file--file + carga
 * cross-device) con apiService/authService mockeados.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import localforage from 'localforage';

// Mocks de red: apiService (POST/GET FarmOS + descarga con auth-retry).
const sendToFarmOS = vi.fn();
const fetchFromFarmOS = vi.fn();
const fetchWithAuthRetry = vi.fn();
const uploadBinaryToFarmOS = vi.fn();
vi.mock('../apiService.js', () => ({
  sendToFarmOS: (...a) => sendToFarmOS(...a),
  fetchFromFarmOS: (...a) => fetchFromFarmOS(...a),
  fetchWithAuthRetry: (...a) => fetchWithAuthRetry(...a),
  uploadBinaryToFarmOS: (...a) => uploadBinaryToFarmOS(...a),
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
  hydrateOperatorPhoto,
  _resetForTests as _resetPhotoForTests,
  __test,
} from '../operatorPhotoService.js';
import { setActiveTenantId, _resetForTests } from '../tenantContext.js';

const SAMPLE_DATA_URL = 'data:image/jpeg;base64,/9j/AAAQ'; // bytes irrelevantes

// Instala mocks de Image + FileReader + canvas.toDataURL para que
// resizePhotoToDataUrl corra bajo jsdom devolviendo un data-URL controlado.
function installCanvasMocks({ width = 1024, height = 768 } = {}) {
  globalThis.FileReader = /** @type {any} */ (class {
    onload = null;
    result = null;
    readAsDataURL() {
      queueMicrotask(() => {
        this.result = SAMPLE_DATA_URL;
        this.onload && this.onload();
      });
    }
  });
  globalThis.Image = /** @type {any} */ (class {
    onload = null;
    set src(_v) {
      this.width = width;
      this.height = height;
      queueMicrotask(() => this.onload && this.onload());
    }
  });
  // @ts-expect-error — test mock, not strictly a full HTMLElement
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
  beforeEach(async () => {
    localStorage.clear();
    await localforage.clear(); // el store DURABLE (IndexedDB) también persiste entre tests
    _resetForTests();
    _resetPhotoForTests(); // limpia el cache en memoria del módulo de foto
    sendToFarmOS.mockReset();
    fetchFromFarmOS.mockReset();
    fetchWithAuthRetry.mockReset();
    uploadBinaryToFarmOS.mockReset();
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

  // ── BUG FIX 2026-07-05: durabilidad en IndexedDB (localforage) ────────────
  // La foto YA NO depende del cubo frágil de localStorage (~5 MB, síncrono, se
  // llena y revienta en silencio con QuotaExceededError → la foto "desaparecía"
  // al recargar). La fuente de verdad pasó a localforage/IndexedDB; el espejo de
  // localStorage es best-effort. Estos tests prueban que la foto SOBREVIVE una
  // recarga aunque el espejo síncrono se pierda, y que migra fotos legadas.
  describe('durabilidad en IndexedDB (localforage)', () => {
    it('setOperatorPhotoLocal persiste en el store durable (localforage)', async () => {
      setOperatorPhotoLocal(SAMPLE_DATA_URL);
      // La escritura durable es fire-and-forget: esperamos a que asiente.
      await vi.waitFor(async () =>
        expect(await localforage.getItem(PHOTO_STORAGE_KEY)).toBe(SAMPLE_DATA_URL),
      );
    });

    it('la foto sobrevive una "recarga" aunque el espejo de localStorage se pierda', async () => {
      setOperatorPhotoLocal(SAMPLE_DATA_URL);
      await vi.waitFor(async () =>
        expect(await localforage.getItem(PHOTO_STORAGE_KEY)).toBe(SAMPLE_DATA_URL),
      );

      // Simula recarga con el espejo síncrono VACÍO (cuota llena la sesión
      // pasada, o el usuario limpió localStorage): SOLO IndexedDB tiene la foto.
      _resetPhotoForTests();
      localStorage.removeItem(PHOTO_STORAGE_KEY);

      // El primer render pinta '' (espejo vacío) pero dispara la hidratación…
      expect(getOperatorPhoto()).toBe('');
      // …y al hidratar desde IndexedDB, la foto vuelve (antes se perdía).
      expect(await hydrateOperatorPhoto()).toBe(SAMPLE_DATA_URL);
      expect(getOperatorPhoto()).toBe(SAMPLE_DATA_URL);
    });

    it('hidratar emite chagra:operator-update para que TopBar/ProfileScreen re-lean', async () => {
      await localforage.setItem(PHOTO_STORAGE_KEY, SAMPLE_DATA_URL);
      _resetPhotoForTests();
      const handler = vi.fn();
      window.addEventListener('chagra:operator-update', handler);

      await hydrateOperatorPhoto();

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls.at(-1)[0].detail).toEqual({
        key: PHOTO_STORAGE_KEY, value: SAMPLE_DATA_URL,
      });
      window.removeEventListener('chagra:operator-update', handler);
    });

    it('MIGRA una foto legada que vivía SOLO en localStorage al store durable', async () => {
      // Usuario de una versión previa: la foto está solo en localStorage.
      localStorage.setItem(PHOTO_STORAGE_KEY, SAMPLE_DATA_URL);
      _resetPhotoForTests();
      expect(await localforage.getItem(PHOTO_STORAGE_KEY)).toBeNull();

      const hydrated = await hydrateOperatorPhoto();

      expect(hydrated).toBe(SAMPLE_DATA_URL);
      // Quedó copiada a IndexedDB (durable de ahí en más).
      expect(await localforage.getItem(PHOTO_STORAGE_KEY)).toBe(SAMPLE_DATA_URL);
    });

    it('si el espejo localStorage revienta por cuota, la foto igual persiste en IndexedDB', async () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const e = new Error('QuotaExceededError');
        e.name = 'QuotaExceededError';
        throw e;
      });

      // NO revienta la UI (el bug original se tragaba el error y perdía la foto)…
      expect(() => setOperatorPhotoLocal(SAMPLE_DATA_URL)).not.toThrow();
      // …y el cache en memoria refleja la foto de inmediato (render sin flash).
      expect(getOperatorPhoto()).toBe(SAMPLE_DATA_URL);

      spy.mockRestore();

      // Durabilidad: aunque el espejo falló, IndexedDB SÍ guardó la foto.
      await vi.waitFor(async () =>
        expect(await localforage.getItem(PHOTO_STORAGE_KEY)).toBe(SAMPLE_DATA_URL),
      );
      // Y tras "recargar", se restaura desde IndexedDB.
      _resetPhotoForTests();
      expect(await hydrateOperatorPhoto()).toBe(SAMPLE_DATA_URL);
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
      expect(uploadBinaryToFarmOS).not.toHaveBeenCalled();
    });

    it('no sube en offline', async () => {
      setActiveTenantId('alice');
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      const r = await uploadToFarmOS(SAMPLE_DATA_URL);
      expect(r.reason).toBe('offline');
      expect(uploadBinaryToFarmOS).not.toHaveBeenCalled();
    });

    it('sube por el flujo Drupal (upload por campo), adjunta a un log y guarda meta', async () => {
      setActiveTenantId('alice');
      uploadBinaryToFarmOS.mockResolvedValue({ data: { id: 'uuid-123', type: 'file--file' } });
      sendToFarmOS.mockResolvedValue({ data: { id: 'log-uuid-1', type: 'log--observation' } });

      const r = await uploadToFarmOS(SAMPLE_DATA_URL);

      expect(r.ok).toBe(true);
      expect(r.fileUuid).toBe('uuid-123');
      // Paso A: binario por upload-por-campo (la ruta /api/file/upload NO
      // existe en farmOS 4.x — bug 2026-07-08).
      expect(uploadBinaryToFarmOS).toHaveBeenCalledTimes(1);
      const [blob, filename, target] = uploadBinaryToFarmOS.mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(filename).toMatch(/^chagra-operator-photo-alice-\d+\.jpg$/);
      expect(target).toEqual({ entity: 'log', bundle: 'observation', field: 'file' });
      // Paso B: se adjunta a un log--observation para volver el file permanente.
      expect(sendToFarmOS).toHaveBeenCalledTimes(1);
      const [logEndpoint, logPayload, logMethod] = sendToFarmOS.mock.calls[0];
      expect(logEndpoint).toBe('/api/log/observation');
      expect(logMethod).toBe('POST');
      expect(logPayload.data.attributes.name).toBe('chagra-operator-photo-alice');
      expect(logPayload.data.relationships.file.data).toEqual([
        { type: 'file--file', id: 'uuid-123' },
      ]);
      // meta persistida para evitar re-descargas redundantes + reusar el log.
      expect(__test.readSyncMeta().fileUuid).toBe('uuid-123');
      expect(__test.readSyncMeta().logUuid).toBe('log-uuid-1');
    });

    it('reusa el log existente (PATCH) al cambiar la foto', async () => {
      setActiveTenantId('alice');
      __test.writeSyncMeta({ fileUuid: 'old', logUuid: 'log-uuid-1', tenantId: 'alice' });
      uploadBinaryToFarmOS.mockResolvedValue({ data: { id: 'uuid-456' } });
      sendToFarmOS.mockResolvedValue({ data: { id: 'log-uuid-1' } });

      const r = await uploadToFarmOS(SAMPLE_DATA_URL);

      expect(r.ok).toBe(true);
      const [logEndpoint, logPayload, logMethod] = sendToFarmOS.mock.calls[0];
      expect(logEndpoint).toBe('/api/log/observation/log-uuid-1');
      expect(logMethod).toBe('PATCH');
      expect(logPayload.data.id).toBe('log-uuid-1');
      expect(__test.readSyncMeta().logUuid).toBe('log-uuid-1');
    });

    it('si el PATCH al log guardado falla (borrado remoto), crea uno nuevo', async () => {
      setActiveTenantId('alice');
      __test.writeSyncMeta({ fileUuid: 'old', logUuid: 'log-muerto', tenantId: 'alice' });
      uploadBinaryToFarmOS.mockResolvedValue({ data: { id: 'uuid-789' } });
      sendToFarmOS
        .mockRejectedValueOnce(new Error('404')) // PATCH al log muerto
        .mockResolvedValueOnce({ data: { id: 'log-nuevo' } }); // POST nuevo

      const r = await uploadToFarmOS(SAMPLE_DATA_URL);

      expect(r.ok).toBe(true);
      expect(__test.readSyncMeta().logUuid).toBe('log-nuevo');
    });

    it('sigue ok aunque el attach al log falle (el file quedó subido)', async () => {
      setActiveTenantId('alice');
      uploadBinaryToFarmOS.mockResolvedValue({ data: { id: 'uuid-999' } });
      sendToFarmOS.mockRejectedValue(new Error('403'));

      const r = await uploadToFarmOS(SAMPLE_DATA_URL);

      expect(r.ok).toBe(true);
      expect(r.fileUuid).toBe('uuid-999');
      expect(__test.readSyncMeta().logUuid).toBe(null);
    });

    it('no-throw si la red falla', async () => {
      setActiveTenantId('alice');
      uploadBinaryToFarmOS.mockRejectedValue(new Error('500'));
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
      fetchWithAuthRetry.mockResolvedValue({
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
      expect(fetchWithAuthRetry).toHaveBeenCalledWith(expect.stringContaining('/sites/default/files/x.jpg'));
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
      fetchWithAuthRetry.mockReset();

      const r = await loadFromFarmOS();

      expect(r.updated).toBe(false);
      expect(r.reason).toBe('already-current');
      expect(fetchWithAuthRetry).not.toHaveBeenCalled();
    });
  });

  describe('setOperatorPhotoFromFile', () => {
    it('redimensiona, persiste local y devuelve el data-URL (sync dispara en background)', async () => {
      installCanvasMocks();
      setActiveTenantId('alice');
      uploadBinaryToFarmOS.mockResolvedValue({ data: { id: 'bg-uuid' } });
      sendToFarmOS.mockResolvedValue({ data: { id: 'bg-log' } });
      const file = new File([new Uint8Array(10)], 'foto.jpg', { type: 'image/jpeg' });

      const out = await setOperatorPhotoFromFile(file);

      expect(out).toBe(SAMPLE_DATA_URL);
      expect(getOperatorPhoto()).toBe(SAMPLE_DATA_URL);
      // El upload corre en background (fire-and-forget); esperamos a que llegue.
      await vi.waitFor(() =>
        expect(uploadBinaryToFarmOS).toHaveBeenCalledWith(
          expect.any(Blob),
          expect.stringMatching(/^chagra-operator-photo-alice-\d+\.jpg$/),
          { entity: 'log', bundle: 'observation', field: 'file' },
        ),
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
