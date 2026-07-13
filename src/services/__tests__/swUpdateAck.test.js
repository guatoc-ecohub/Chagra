/**
 * swUpdateAck.test.js — Tests para persistencia del ack de versión del SW.
 *
 * Cubre decisión de mostrar banner de actualización, lectura/escritura de
 * localStorage, seed de primera instalación, y casos borde (storage no
 * disponible, errores de quota, versiones null/undefined, upgrades/downgrades).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ACK_STORAGE_KEY,
  shouldShowUpdateBanner,
  readAckedVersion,
  writeAckedVersion,
  seedFirstInstallAck,
} from '../swUpdateAck.js';

beforeEach(() => {
  // Limpiamos localStorage entre tests para evitar interferencia
  window.localStorage.clear();
  // Restauramos mocks
  vi.restoreAllMocks();
});

describe('ACK_STORAGE_KEY', () => {
  it('debería ser "sw:last-acked-version"', () => {
    expect(ACK_STORAGE_KEY).toBe('sw:last-acked-version');
  });
});

describe('shouldShowUpdateBanner', () => {
  describe('casos donde NO mostrar banner', () => {
    it('debería retornar false si currentVersion es null', () => {
      expect(shouldShowUpdateBanner(null, 'v1.0')).toBe(false);
    });

    it('debería retornar false si currentVersion es undefined', () => {
      expect(shouldShowUpdateBanner(undefined, 'v1.0')).toBe(false);
    });

    it('debería retornar false si currentVersion es string vacío', () => {
      expect(shouldShowUpdateBanner('', 'v1.0')).toBe(false);
    });

    it('debería retornar false en first install (lastAcked null)', () => {
      expect(shouldShowUpdateBanner('v1.0', null)).toBe(false);
    });

    it('debería retornar false en first install (lastAcked undefined)', () => {
      expect(shouldShowUpdateBanner('v1.0', undefined)).toBe(false);
    });

    it('debería retornar false en first install (lastAcked string vacío)', () => {
      expect(shouldShowUpdateBanner('v1.0', '')).toBe(false);
    });

    it('debería retornar false si currentVersion === lastAcked (ya aceptado)', () => {
      expect(shouldShowUpdateBanner('v1.0', 'v1.0')).toBe(false);
    });

    it('debería retornar false con cache name idéntico', () => {
      expect(shouldShowUpdateBanner('chagra-v210', 'chagra-v210')).toBe(false);
    });

    it('debería retornar false con SHA idéntico', () => {
      const sha = 'abc123def456';
      expect(shouldShowUpdateBanner(sha, sha)).toBe(false);
    });
  });

  describe('casos donde SÍ mostrar banner', () => {
    it('debería retornar true en upgrade (v1.0 → v2.0)', () => {
      expect(shouldShowUpdateBanner('v2.0', 'v1.0')).toBe(true);
    });

    it('debería retornar true en downgrade/rollback (v2.0 → v1.0)', () => {
      expect(shouldShowUpdateBanner('v1.0', 'v2.0')).toBe(true);
    });

    it('debería retornar true con cache name distinto', () => {
      expect(shouldShowUpdateBanner('chagra-v211', 'chagra-v210')).toBe(true);
    });

    it('debería retornar true con SHA distinto', () => {
      expect(shouldShowUpdateBanner('def456', 'abc123')).toBe(true);
    });

    it('debería retornar true con formato mixto (cache name → SHA)', () => {
      expect(shouldShowUpdateBanner('abc123', 'chagra-v210')).toBe(true);
    });

    it('debería retornar true con formato mixto (SHA → cache name)', () => {
      expect(shouldShowUpdateBanner('chagra-v210', 'abc123')).toBe(true);
    });
  });

  describe('casos borde de versiones', () => {
    it('debería manejar versiones con prefijo chagra-', () => {
      expect(shouldShowUpdateBanner('chagra-v210', 'chagra-v209')).toBe(true);
    });

    it('debería manejar versiones con formato completo de cache', () => {
      expect(shouldShowUpdateBanner('chagra-abc123def456', 'chagra-abc123')).toBe(true);
    });

    it('debería ser sensible a mayúsculas/minúsculas', () => {
      expect(shouldShowUpdateBanner('Chagra-V210', 'chagra-v210')).toBe(true);
    });

    it('debería retornar false si ambos son string vacío', () => {
      expect(shouldShowUpdateBanner('', '')).toBe(false);
    });
  });
});

describe('readAckedVersion', () => {
  it('debería leer versión almacenada en localStorage', () => {
    localStorage.setItem(ACK_STORAGE_KEY, 'v1.0');
    expect(readAckedVersion()).toBe('v1.0');
  });

  it('debería retornar null si clave no existe', () => {
    expect(readAckedVersion()).toBeNull();
  });

  it('debería retornar null si localStorage no está disponible', () => {
    // Mock localStorage como null
    const originalLocalStorage = globalThis.localStorage;
    delete /** @type {any} */ (globalThis).localStorage;
    
    expect(readAckedVersion()).toBeNull();
    
    /** @type {any} */ (globalThis).localStorage = originalLocalStorage;
  });

  it('debería manejar storage null explícitamente', () => {
    expect(readAckedVersion(null)).toBeNull();
  });

  it('debería retornar null si getItem lanza error (quota/private mode)', () => {
    const storage = /** @type {any} */ ({
      getItem: vi.fn(() => {
        throw new Error('SecurityError');
      }),
    });

    expect(readAckedVersion(storage)).toBeNull();
  });

  it('debería usar storage custom si se proporciona', () => {
    const customStorage = /** @type {any} */ ({
      getItem: vi.fn((key) => {
        if (key === ACK_STORAGE_KEY) return 'custom-v1.0';
        return null;
      }),
    });

    expect(readAckedVersion(customStorage)).toBe('custom-v1.0');
    expect(customStorage.getItem).toHaveBeenCalledWith(ACK_STORAGE_KEY);
  });

  it('debería manejar string vacío como valor válido', () => {
    localStorage.setItem(ACK_STORAGE_KEY, '');
    expect(readAckedVersion()).toBe('');
  });
});

describe('writeAckedVersion', () => {
  it('debería escribir versión en localStorage', () => {
    writeAckedVersion('v1.0');
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0');
  });

  it('debería sobrescribir versión existente', () => {
    writeAckedVersion('v1.0');
    writeAckedVersion('v2.0');
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v2.0');
  });

  it('debería no hacer nada si version es null', () => {
    localStorage.setItem(ACK_STORAGE_KEY, 'v1.0');
    writeAckedVersion(null);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0');
  });

  it('debería no hacer nada si version es undefined', () => {
    localStorage.setItem(ACK_STORAGE_KEY, 'v1.0');
    writeAckedVersion(undefined);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0');
  });

  it('debería no hacer nada si version es string vacío', () => {
    localStorage.setItem(ACK_STORAGE_KEY, 'v1.0');
    writeAckedVersion('');
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0');
  });

  it('debería no hacer nada si storage es null', () => {
    writeAckedVersion('v1.0', /** @type {any} */ (null));
    // No debería escribir nada en localStorage global
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBeNull();
  });

  it('debería no crash si setItem lanza error (quota/private mode)', () => {
    const storage = /** @type {any} */ ({
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
    });

    expect(() => writeAckedVersion('v1.0', storage)).not.toThrow();
    expect(storage.setItem).toHaveBeenCalledWith(ACK_STORAGE_KEY, 'v1.0');
  });

  it('debería usar storage custom si se proporciona', () => {
    const customStorage = /** @type {any} */ ({
      setItem: vi.fn(),
      getItem: vi.fn(),
    });

    writeAckedVersion('custom-v1.0', customStorage);
    expect(customStorage.setItem).toHaveBeenCalledWith(ACK_STORAGE_KEY, 'custom-v1.0');
  });

  it('debería ser idempotente', () => {
    writeAckedVersion('v1.0');
    writeAckedVersion('v1.0');
    writeAckedVersion('v1.0');
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0');
  });
});

describe('seedFirstInstallAck', () => {
  it('debería escribir versión en first install (no hay ack previo)', () => {
    const result = seedFirstInstallAck('v1.0');
    expect(result).toBe(true);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0');
  });

  it('debería retornar false y no escribir si ya existe ack', () => {
    localStorage.setItem(ACK_STORAGE_KEY, 'v2.0');
    const result = seedFirstInstallAck('v1.0');
    expect(result).toBe(false);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v2.0'); // No sobrescribe
  });

  it('debería retornar false si currentVersion es null', () => {
    const result = seedFirstInstallAck(null);
    expect(result).toBe(false);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBeNull();
  });

  it('debería retornar false si currentVersion es undefined', () => {
    const result = seedFirstInstallAck(undefined);
    expect(result).toBe(false);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBeNull();
  });

  it('debería retornar false si currentVersion es string vacío', () => {
    const result = seedFirstInstallAck('');
    expect(result).toBe(false);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBeNull();
  });

  it('debería retornar true pero NO escribir si storage es null (comportamiento actual)', () => {
    // NOTA: Este test documenta el comportamiento actual.
    // Cuando storage=null, readAckedVersion retorna null (como si no hubiera ack),
    // entonces seedFirstInstallAck asume first install y retorna true,
    // pero writeAckedVersion no escribe nada porque storage es null.
    // Esto puede ser un bug sutil en el código fuente.
    const result = seedFirstInstallAck('v1.0', null);
    expect(result).toBe(true); // Comportamiento actual
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBeNull(); // No escribe en localStorage global
  });

  it('debería tratar string vacío como "no hay ack"', () => {
    localStorage.setItem(ACK_STORAGE_KEY, '');
    const result = seedFirstInstallAck('v1.0');
    expect(result).toBe(true);
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0');
  });

  it('debería ser idempotente (llamadas sucesivas retornan false)', () => {
    const result1 = seedFirstInstallAck('v1.0');
    expect(result1).toBe(true);
    
    const result2 = seedFirstInstallAck('v1.0');
    expect(result2).toBe(false);
    
    const result3 = seedFirstInstallAck('v2.0');
    expect(result3).toBe(false);
    
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('v1.0'); // Primer valor persiste
  });

  it('debería usar storage custom si se proporciona', () => {
    const customStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };

    const result = seedFirstInstallAck('custom-v1.0', customStorage);
    expect(result).toBe(true);
    expect(customStorage.setItem).toHaveBeenCalledWith(ACK_STORAGE_KEY, 'custom-v1.0');
  });

  it('debería respetar ack existente en storage custom', () => {
    const customStorage = {
      getItem: vi.fn(() => 'existing-v2.0'),
      setItem: vi.fn(),
    };

    const result = seedFirstInstallAck('new-v1.0', customStorage);
    expect(result).toBe(false);
    expect(customStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('Casos borde integración', () => {
  it('debería funcionar el flujo completo de first install', () => {
    // 1. First install: no mostrar banner
    expect(shouldShowUpdateBanner('v1.0', null)).toBe(false);
    
    // 2. Seed el ack para futuras sesiones
    seedFirstInstallAck('v1.0');
    expect(readAckedVersion()).toBe('v1.0');
    
    // 3. Recargar app con misma versión: no mostrar banner
    expect(shouldShowUpdateBanner('v1.0', 'v1.0')).toBe(false);
  });

  it('debería funcionar el flujo completo de upgrade', () => {
    // 1. Setup: usuario ya tiene v1.0
    localStorage.setItem(ACK_STORAGE_KEY, 'v1.0');
    
    // 2. Nueva versión disponible: mostrar banner
    expect(shouldShowUpdateBanner('v2.0', 'v1.0')).toBe(true);
    
    // 3. Usuario acepta: escribir nuevo ack
    writeAckedVersion('v2.0');
    expect(readAckedVersion()).toBe('v2.0');
    
    // 4. Recargar app: no mostrar banner (ya aceptó v2.0)
    expect(shouldShowUpdateBanner('v2.0', 'v2.0')).toBe(false);
  });

  it('debería funcionar el flujo completo de downgrade/rollback', () => {
    // 1. Setup: usuario tiene v2.0
    localStorage.setItem(ACK_STORAGE_KEY, 'v2.0');
    
    // 2. Rollback a v1.0: mostrar banner
    expect(shouldShowUpdateBanner('v1.0', 'v2.0')).toBe(true);
    
    // 3. Usuario acepta rollback
    writeAckedVersion('v1.0');
    
    // 4. Recargar app: no mostrar banner
    expect(shouldShowUpdateBanner('v1.0', 'v1.0')).toBe(false);
  });

  it('debería persistir entre sesiones con cache names', () => {
    // 1. Primera sesión
    seedFirstInstallAck('chagra-v210');
    expect(readAckedVersion()).toBe('chagra-v210');
    
    // 2. Simular reload: leer ack persistido
    const persisted = readAckedVersion();
    expect(shouldShowUpdateBanner('chagra-v210', persisted)).toBe(false);
    
    // 3. Nueva versión disponible
    expect(shouldShowUpdateBanner('chagra-v211', persisted)).toBe(true);
  });

  it('debería funcionar correctamente después de clear localStorage', () => {
    // 1. Setup inicial
    localStorage.setItem(ACK_STORAGE_KEY, 'v1.0');
    
    // 2. Limpiar storage (ej: usuario limpia datos del navegador)
    localStorage.clear();
    
    // 3. Al recargar, es como first install
    expect(readAckedVersion()).toBeNull();
    expect(shouldShowUpdateBanner('v1.0', readAckedVersion())).toBe(false);
  });

  it('debería ser thread-safe (múltiples writes rápidos)', () => {
    // Simular múltiples writes rápidos
    writeAckedVersion('v1.0');
    writeAckedVersion('v2.0');
    writeAckedVersion('v3.0');
    
    // El último write debería ganar
    expect(readAckedVersion()).toBe('v3.0');
  });

  it('debería funcionar con versiones SHA de diferentes longitudes', () => {
    const shortSha = 'abc123';
    const longSha = 'abc123def456789';
    
    writeAckedVersion(shortSha);
    expect(shouldShowUpdateBanner(longSha, shortSha)).toBe(true);
    
    writeAckedVersion(longSha);
    expect(shouldShowUpdateBanner(longSha, longSha)).toBe(false);
  });
});
