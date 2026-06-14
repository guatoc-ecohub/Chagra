/**
 * sw-telemetry-db-version.test.js — regresión del bug de versión hardcodeada
 * en el Service Worker (Tarea #8).
 *
 * Bug: `getPendingTelemetryEvents` abría `indexedDB.open('ChagraDB', 10)` con
 * una versión HARDCODEADA (10) menor a la actual de `dbCore` (DB_VERSION = 23).
 * `indexedDB.open(name, N)` con N < versión-vigente lanza `VersionError`, así
 * que la función SIEMPRE fallaba y el background-sync de voice-telemetry nunca
 * podía drenar eventos.
 *
 * El SW no puede importar `dbCore` (corre en el scope del worker, sin el
 * bundle), así que el fix es abrir la DB SIN versión: `indexedDB.open(name)`
 * devuelve la DB en su versión vigente sin disparar un upgrade.
 *
 * Este test es a nivel de fuente (no instancia IndexedDB): verifica el
 * contrato de que el SW NUNCA vuelva a hardcodear una versión al abrir
 * ChagraDB para leer telemetría.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.resolve(__dirnameLocal, '../../public/sw.js');
const SW_SRC = fs.readFileSync(SW_PATH, 'utf-8');

describe('sw.js — apertura de ChagraDB para telemetría (Tarea #8)', () => {
  it('NO abre ChagraDB con una versión numérica hardcodeada', () => {
    // Cualquier `indexedDB.open('ChagraDB', <número>)` reintroduce el bug.
    const hardcodedVersion = /indexedDB\.open\(\s*['"]ChagraDB['"]\s*,\s*\d+\s*\)/;
    expect(SW_SRC).not.toMatch(hardcodedVersion);
  });

  it('abre ChagraDB SIN versión (versión vigente, sin upgrade)', () => {
    const noVersion = /indexedDB\.open\(\s*['"]ChagraDB['"]\s*\)/;
    expect(SW_SRC).toMatch(noVersion);
  });

  it('en particular ya NO contiene la versión-10 del bug original', () => {
    expect(SW_SRC).not.toContain("indexedDB.open('ChagraDB', 10)");
  });
});
