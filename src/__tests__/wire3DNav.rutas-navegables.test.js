/*
 * CONTRATO DE CLIC 3D→2D — ningún token navegable del valle 3D nace muerto.
 *
 * Nace de las auditorías de clic 2026-08-23 (AUDITORIA-CLIC-2D / -VALLE3D): los
 * mundos/hotspots del valle R3F rutean a pantallas 2D vía `wire3DNav` y los
 * `hotspots[].view` de `mundoData`. En prod (ProdChagraApp) esos valores son
 * `path` del manifiesto `rutasProdChagraApp`; si uno no resuelve, el clic
 * REBOTA al valle (fallback) o cae al no-op del guard. Este test cruza CADA
 * destino contra el conjunto real de tokens navegables de prod, para que un
 * mundo nuevo (o un recableo) no vuelva a nacer con "Abrir" muerto.
 *
 * También blinda que el hub de juegos (SalaJuegosBanner → #juegos) y cada uno
 * de sus 9 carteles tengan case real en el shell clásico App.jsx.
 */
import { describe, expect, it } from 'vitest';

import appSource from '../App.jsx?raw';
import { RUTA_2D_DESDE_3D } from '../prodApp/wire3DNav.js';
import { MUNDO } from '../visual/mundo3d/mundoData.js';
import { JUEGOS_CHAGRA } from '../components/juego/hubJuegosData.js';
import {
  NUCLEO_3D,
  NUCLEO_APP,
  PENDIENTE_DECISION,
  EXCLUIDO,
} from '../config/rutasProdChagraApp.js';

/**
 * Reconstruye el conjunto de tokens navegables de prod tal como lo hace
 * ProdChagraApp: registra path + alias de NUCLEO_3D, NUCLEO_APP y
 * PENDIENTE_DECISION, saltando lo EXCLUIDO. El manifiesto es la fuente de verdad
 * del router de prod.
 */
function tokensNavegablesProd() {
  const excluidas = new Set(EXCLUIDO.map((e) => e.path));
  const tokens = new Set();
  for (const arr of [NUCLEO_3D, NUCLEO_APP, PENDIENTE_DECISION]) {
    for (const e of arr) {
      if (excluidas.has(e.path)) continue;
      tokens.add(e.path);
      if (Array.isArray(e.alias)) for (const a of e.alias) tokens.add(a);
    }
  }
  return tokens;
}

const switchCases = new Set(
  [...appSource.matchAll(/case '([^']+)'/g)].map(([, view]) => view),
);

describe('contrato de clic 3D→2D (prod)', () => {
  const tokens = tokensNavegablesProd();

  it('cada destino de wire3DNav resuelve a una ruta navegable de prod', () => {
    const destinos = [...new Set(Object.values(RUTA_2D_DESDE_3D))];
    const muertos = destinos.filter((v) => !tokens.has(v));
    expect(muertos).toEqual([]);
  });

  it('cada hotspot view de mundoData resuelve a una ruta navegable de prod', () => {
    const views = [
      ...new Set(
        Object.values(MUNDO)
          .flatMap((m) => (Array.isArray(m.hotspots) ? m.hotspots : []))
          .map((h) => h.view)
          .filter(Boolean),
      ),
    ];
    const muertos = views.filter((v) => !tokens.has(v));
    expect(muertos).toEqual([]);
  });

  it('la puerta de la casa y el portal Aprender tienen destino real (fix #1/#3)', () => {
    // Regresión de las auditorías de clic Valle3D: casa rebotaba, Aprender era
    // dead-end "abre pronto".
    expect(tokens.has(RUTA_2D_DESDE_3D.casa)).toBe(true);
    expect(RUTA_2D_DESDE_3D.casa).toBe('casa_adentro');
    expect(tokens.has(RUTA_2D_DESDE_3D.aprender)).toBe(true);
    expect(RUTA_2D_DESDE_3D.aprender).toBe('aprende');
  });
});

describe('la sala de juegos es alcanzable en el shell clásico (App.jsx, fix #1)', () => {
  it('el hub y sus alias tienen case', () => {
    expect(switchCases.has('juegos')).toBe(true);
    expect(switchCases.has('sala_juegos')).toBe(true);
    expect(switchCases.has('hub_juegos')).toBe(true);
  });

  it('hay deep-link #juegos hacia el hub', () => {
    expect(appSource).toMatch(/\bjuegos: 'juegos'/);
  });

  it('cada cartel del hub (9 juegos) tiene case real — ningún cartel muerto', () => {
    const views = [...new Set(JUEGOS_CHAGRA.map((j) => j.view))];
    expect(views.length).toBeGreaterThanOrEqual(9);
    const muertos = views.filter((v) => !switchCases.has(v));
    expect(muertos).toEqual([]);
  });
});
