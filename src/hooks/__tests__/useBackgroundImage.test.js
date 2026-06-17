import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

var createObjectURLSpy = vi.fn(function () { return 'blob:test-url-1'; });
var revokeObjectURLSpy = vi.fn();
URL.createObjectURL = createObjectURLSpy;
URL.revokeObjectURL = revokeObjectURLSpy;

var mockStoreGet = vi.fn();
var txOnCompleteFn = null;

function createTx() {
  var tx = {};
  var os = { get: mockStoreGet, put: vi.fn() };
  Object.defineProperty(tx, 'objectStore', { value: vi.fn(function () { return os; }) });
  Object.defineProperty(tx, 'oncomplete', {
    get: function () { return txOnCompleteFn; },
    set: function (v) { txOnCompleteFn = v; },
    configurable: true,
  });
  Object.defineProperty(tx, 'onerror', {
    get: function () { return null; },
    set: function () {},
    configurable: true,
  });
  return tx;
}

var mockDB = { transaction: vi.fn(function () { return createTx(); }) };

vi.mock('../../db/dbCore', function () {
  return {
    __esModule: true,
    default: undefined,
    openDB: vi.fn(function () { return Promise.resolve(mockDB); }),
    STORES: { SYNC_META: 'sync_meta' },
  };
});

var fetchFromFarmOSMock = vi.fn();
vi.mock('../../services/apiService', function () {
  return { fetchFromFarmOS: function () { return fetchFromFarmOSMock.apply(null, arguments); } };
});

var getAccessTokenMock = vi.fn().mockResolvedValue('mock-token');
vi.mock('../../services/authService', function () {
  return { getAccessToken: function () { return getAccessTokenMock.apply(null, arguments); } };
});

globalThis.fetch = vi.fn();
Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });

var mod = await import('../useBackgroundImage');
var useBackgroundImage = mod.useBackgroundImage;

describe('useBackgroundImage', function () {
  beforeEach(function () {
    vi.clearAllMocks();
    vi.useRealTimers();
    var nav = globalThis.navigator;
    Object.defineProperty(nav, 'onLine', { writable: true, configurable: true, value: true });
    fetchFromFarmOSMock = vi.fn();
    getAccessTokenMock.mockResolvedValue('mock-token');
    globalThis.fetch.mockResolvedValue({ ok: true, blob: function () { return Promise.resolve(new Blob(['x'], { type: 'image/jpeg' })); } });
    mockStoreGet.mockImplementation(function () {
      var self = this;
      return {
        set onsuccess(fn) { self._result = null; setTimeout(fn, 0); },
        set onerror(fn) {},
        get result() { return self._result || null; },
      };
    });
    txOnCompleteFn = vi.fn();
    createObjectURLSpy.mockReturnValue('blob:test-url-1');
    revokeObjectURLSpy.mockClear();
  });

  afterEach(function () {
    vi.useRealTimers();
  });

  it('arranca con loading=true y url=null', function () {
    var r = renderHook(function () { return useBackgroundImage('chagra-bg-test'); }).result;
    expect(r.current.loading).toBe(true);
    expect(r.current.url).toBe(null);
  });

  it('sin prefix null loading queda true', function () {
    var r = renderHook(function () { return useBackgroundImage(null); }).result;
    expect(r.current.loading).toBe(true);
  });

  it('sin prefix vacio loading queda true', function () {
    var r = renderHook(function () { return useBackgroundImage(''); }).result;
    expect(r.current.loading).toBe(true);
  });

  it('sirve desde cache IndexedDB si existe blob y estamos offline', async function () {
    var cachedBlob = new Blob(['cached'], { type: 'image/png' });
    createObjectURLSpy.mockReturnValue('blob:cached-url');
    mockStoreGet.mockImplementation(function () {
      var self = this;
      return {
        set onsuccess(fn) {
          self._result = { blob: cachedBlob, fileUuid: 'abc', cachedAt: Date.now() - 60000 };
          fn();
        },
        set onerror(fn) {},
        get result() { return self._result || null; },
      };
    });
    var nav = globalThis.navigator;
    Object.defineProperty(nav, 'onLine', { writable: true, configurable: true, value: false });

    var r = renderHook(function () { return useBackgroundImage('chagra-bg-test'); }).result;
    await vi.waitFor(function () { return expect(r.current.loading).toBe(false); });
    expect(r.current.url).toBe('blob:cached-url');
  });

  it('sin cache y remoto vacio no explota', async function () {
    fetchFromFarmOSMock.mockResolvedValue({ data: [] });
    renderHook(function () { return useBackgroundImage('chagra-bg-nonexist'); });
  });
});
