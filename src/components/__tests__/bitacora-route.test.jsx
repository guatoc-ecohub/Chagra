/**
 * bitacora-route.test.jsx — Tarea #22, fix de la ruta rota de la Bitácora.
 *
 * BUG: AnalisisProactivoIA navegaba a 'bitacora' pero App.jsx solo tenía
 * `case 'historial'` (+ 'bitacora_detail'), así que la entrada caía en
 * "Vista no disponible". Este test ancla el contrato: 'bitacora' debe estar
 * ruteada (alias de 'historial' → WorkerHistory) para que TODA entrada a la
 * bitácora llegue a una pantalla viva.
 *
 * Es un test estático sobre la fuente (App.jsx es demasiado pesado para montar
 * con todos sus providers en jsdom), suficiente para prevenir la regresión.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.resolve(here, '../../App.jsx'), 'utf8');

describe('Ruta de la Bitácora', () => {
  it("App.jsx tiene case 'bitacora' (no solo 'historial')", () => {
    expect(appSrc).toMatch(/case 'bitacora':/);
  });

  it("'historial' y 'bitacora' caen ambos en WorkerHistory", () => {
    // Bloque contiguo: case 'historial': case 'bitacora': ... <WorkerHistory
    const block = appSrc.slice(appSrc.indexOf("case 'historial':"));
    const head = block.slice(0, 400);
    expect(head).toMatch(/case 'bitacora':/);
    expect(head).toMatch(/<WorkerHistory/);
  });

  it("'bitacora' está registrada en MODULE_VIEWS para analítica", () => {
    const moduleViews = appSrc.slice(
      appSrc.indexOf('const MODULE_VIEWS'),
      appSrc.indexOf('const MODULE_VIEWS') + 900,
    );
    expect(moduleViews).toMatch(/'bitacora'/);
  });
});
