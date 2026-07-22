/**
 * swUpdateAck.test.js — cobertura del fix QA #18.
 *
 * Bug: el banner "nueva versión disponible" se mostraba cada reload aunque
 * el usuario ya hubiera clickeado "Actualizar". Persistimos el ack en
 * localStorage clave `sw:last-acked-version` y suprimimos el banner si la
 * versión actual del SW coincide con la ya aceptada.
 *
 * Casos cubiertos (3 mínimos pedidos en el ticket #128):
 *   1. First install (no ack previo) → NO mostrar banner.
 *   2. Ack persistido y misma versión → NO mostrar banner.
 *   3. Versión cambió (incluido rollback) → SÍ mostrar banner.
 *
 * Refs: QA #18, task #128.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldShowUpdateBanner,
  readAckedVersion,
  writeAckedVersion,
  seedFirstInstallAck,
  ACK_STORAGE_KEY,
} from '../services/swUpdateAck';

beforeEach(() => {
  // jsdom expone localStorage real — limpiar entre tests para no leak ack.
  globalThis.localStorage.clear();
});

describe('shouldShowUpdateBanner', () => {
  it('NO muestra banner en first install (lastAcked null)', () => {
    expect(shouldShowUpdateBanner('chagra-v210', null)).toBe(false);
  });

  it('NO muestra banner cuando lastAcked === currentVersion (ack persistido)', () => {
    expect(shouldShowUpdateBanner('chagra-v210', 'chagra-v210')).toBe(false);
  });

  it('SÍ muestra banner cuando la versión cambió (upgrade)', () => {
    expect(shouldShowUpdateBanner('chagra-v211', 'chagra-v210')).toBe(true);
  });

  it('SÍ muestra banner en rollback (currentVersion distinta aunque numericamente menor)', () => {
    // Rollback: prod hizo revert y el CACHE_NAME bajó. Es una version nueva
    // legitima desde la perspectiva del usuario aunque el número sea menor.
    expect(shouldShowUpdateBanner('chagra-v209', 'chagra-v210')).toBe(true);
  });

  it('NO muestra banner si currentVersion es falsy (SW aún no respondió)', () => {
    expect(shouldShowUpdateBanner(null, 'chagra-v210')).toBe(false);
    expect(shouldShowUpdateBanner('', 'chagra-v210')).toBe(false);
    expect(shouldShowUpdateBanner(undefined, 'chagra-v210')).toBe(false);
  });

  it('trata empty-string lastAcked como first install', () => {
    expect(shouldShowUpdateBanner('chagra-v210', '')).toBe(false);
  });
});

describe('localStorage helpers (read/write/seed)', () => {
  it('readAckedVersion devuelve null cuando no hay ack', () => {
    expect(readAckedVersion()).toBeNull();
  });

  it('writeAckedVersion persiste y readAckedVersion lo recupera', () => {
    writeAckedVersion('chagra-v210');
    expect(readAckedVersion()).toBe('chagra-v210');
    expect(globalThis.localStorage.getItem(ACK_STORAGE_KEY)).toBe('chagra-v210');
  });

  it('writeAckedVersion no escribe si version es falsy', () => {
    writeAckedVersion('');
    expect(readAckedVersion()).toBeNull();
    writeAckedVersion(null);
    expect(readAckedVersion()).toBeNull();
  });

  it('seedFirstInstallAck escribe cuando no hay ack previo', () => {
    expect(seedFirstInstallAck('chagra-v210')).toBe(true);
    expect(readAckedVersion()).toBe('chagra-v210');
  });

  it('seedFirstInstallAck NO sobrescribe ack existente', () => {
    writeAckedVersion('chagra-v210');
    expect(seedFirstInstallAck('chagra-v211')).toBe(false);
    expect(readAckedVersion()).toBe('chagra-v210');
  });
});

describe('flujo end-to-end del ack (3 casos del ticket #128)', () => {
  it('caso 1 (first install): suprime banner + seed ack', () => {
    const currentVersion = 'chagra-v210';
    const lastAcked = readAckedVersion();
    expect(lastAcked).toBeNull();
    // Lógica del main.jsx: first install → seed + suprimir.
    expect(shouldShowUpdateBanner(currentVersion, lastAcked)).toBe(false);
    seedFirstInstallAck(currentVersion);
    expect(readAckedVersion()).toBe(currentVersion);
  });

  it('caso 2 (ack persistido, misma version): suprime banner', () => {
    writeAckedVersion('chagra-v210');
    const currentVersion = 'chagra-v210';
    const lastAcked = readAckedVersion();
    expect(shouldShowUpdateBanner(currentVersion, lastAcked)).toBe(false);
  });

  it('caso 3 (version cambió): muestra banner; ack persiste tras click', () => {
    writeAckedVersion('chagra-v210');
    const currentVersion = 'chagra-v211';
    const lastAcked = readAckedVersion();
    expect(shouldShowUpdateBanner(currentVersion, lastAcked)).toBe(true);
    // Simular click "Actualizar": persistir ack ANTES del reload.
    writeAckedVersion(currentVersion);
    // Tras reload, el toast no debería volver a aparecer:
    expect(shouldShowUpdateBanner(currentVersion, readAckedVersion())).toBe(false);
  });
});
