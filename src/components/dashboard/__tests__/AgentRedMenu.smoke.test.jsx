/**
 * AgentRedMenu — smoke: el menú-red (la mano nueva) renderiza sin crashear en
 * jsdom (ResizeObserver stubbeado) y monta su raíz. La interacción fina
 * (despliegue de ramas, onPick) se valida en vivo con chromium.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// jsdom no trae ResizeObserver (lo usa el motor de geometría viva).
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import AgentRedMenu from '../AgentRedMenu';
import * as __geom from '../agentRedMenuGeom';

afterEach(() => cleanup());

describe('AgentRedMenu — geometría de continuidad (raíz↔red sin cortes)', () => {
  it('rimPoint nace EN el borde del botón Ⓐ (a distancia r del centro, hacia el destino)', () => {
    const c = { x: 100, y: 200 };
    const p = __geom.rimPoint(c, 20, { x: 100, y: 100 });
    // hacia arriba: mismo x, 20px más arriba — el trazo arranca dentro del disco
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(180, 5);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    expect(d).toBeCloseTo(20, 5);
  });

  it('rimPoint degenera al centro si el destino está más cerca que el radio (sin NaN)', () => {
    const c = { x: 50, y: 50 };
    const p = __geom.rimPoint(c, 30, { x: 52, y: 50 });
    // destino a 2px < radio 30 → no sobrepasa el destino
    expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeLessThanOrEqual(2 + 1e-6);
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
  });

  it('relax separa nodos a la distancia mínima (sin encimes) dentro del bound', () => {
    const pts = [
      { x: 100, y: 100 }, { x: 102, y: 101 }, { x: 104, y: 99 }, { x: 98, y: 103 },
    ];
    __geom.relax(pts, 60, { x0: 0, x1: 400, y0: 0, y1: 400 });
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        const d = Math.hypot(pts[b].x - pts[a].x, pts[b].y - pts[a].y);
        expect(d).toBeGreaterThanOrEqual(60 - 1);
      }
    }
  });

  it('relax anisotrópico (ky<1) exige MÁS separación vertical (etiquetas debajo del nodo)', () => {
    const pts = [{ x: 200, y: 100 }, { x: 200, y: 160 }];
    __geom.relax(pts, 80, { x0: 0, x1: 400, y0: 0, y1: 400 }, { ky: 0.8 });
    const dy = Math.abs(pts[1].y - pts[0].y);
    // métrica: hypot(dx, dy*0.8) >= 80 → con dx=0, dy >= 100
    expect(dy).toBeGreaterThanOrEqual(80 / 0.8 - 1);
  });

  it('relaxRects separa cajas nodo+etiqueta hasta CERO intersección (mandato no-choque)', () => {
    // dos nodos casi encimados, cajas 120x100 (orbe 72 + etiqueta debajo)
    const pts = [{ x: 200, y: 200 }, { x: 210, y: 215 }];
    const boxes = [
      { hw: 60, hh: 50, oy: 15 },
      { hw: 60, hh: 50, oy: 15 },
    ];
    __geom.relaxRects(pts, boxes, { x0: 0, x1: 600, y0: 0, y1: 600 }, { pad: 4 });
    const rect = (p, b) => ({
      x0: p.x - b.hw, x1: p.x + b.hw,
      y0: p.y + b.oy - b.hh, y1: p.y + b.oy + b.hh,
    });
    const A = rect(pts[0], boxes[0]), B = rect(pts[1], boxes[1]);
    const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
    const oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
    expect(ox <= 0 || oy <= 0).toBe(true); // rectángulos disjuntos
  });

  it('relaxRects respeta obstáculos fijos (hub) sin moverlos', () => {
    const pts = [{ x: 300, y: 300 }];
    const boxes = [{ hw: 50, hh: 45, oy: 10 }];
    const hub = { x: 305, y: 310, hw: 55, hh: 50 };
    __geom.relaxRects(pts, boxes, { x0: 0, x1: 600, y0: 0, y1: 600 }, { fixed: [hub], pad: 4 });
    expect(hub.x).toBe(305);
    const ox = Math.min(pts[0].x + 50, hub.x + 55) - Math.max(pts[0].x - 50, hub.x - 55);
    const oy = Math.min(pts[0].y + 10 + 45, hub.y + 50) - Math.max(pts[0].y + 10 - 45, hub.y - 50);
    expect(ox <= 0 || oy <= 0).toBe(true);
  });

  it('rectsOverlap detecta intersección caja-caja y caja-obstáculo (y su ausencia)', () => {
    const boxes = [{ hw: 50, hh: 40, oy: 10 }, { hw: 50, hh: 40, oy: 10 }];
    // encimadas
    expect(__geom.rectsOverlap(
      [{ x: 100, y: 100 }, { x: 120, y: 110 }], boxes, [], 2,
    )).toBe(true);
    // disjuntas
    expect(__geom.rectsOverlap(
      [{ x: 100, y: 100 }, { x: 300, y: 100 }], boxes, [], 2,
    )).toBe(false);
    // contra obstáculo fijo
    expect(__geom.rectsOverlap(
      [{ x: 100, y: 100 }], [boxes[0]], [{ x: 110, y: 115, hw: 40, hh: 40 }], 2,
    )).toBe(true);
  });

  it('placeLeavesNoClash entrega hojas SIN choque visible aun si el sistema con soft es infactible', () => {
    // hub grande centrado + 3 hojas anchas en banda angosta (caso nature
    // enfocado medido 2026-06-10) + soft obstacles que asfixian el espacio
    const hub = { x: 113, y: 306, hw: 58, hh: 58 };
    const boxes = [
      { hw: 64, hh: 54, oy: 15 }, { hw: 63, hh: 49, oy: 14 }, { hw: 55, hh: 49, oy: 14 },
    ];
    const soft = [
      { x: 240, y: 130, hw: 33, hh: 33 }, { x: 118, y: 200, hw: 33, hh: 33 },
      { x: 250, y: 280, hw: 33, hh: 33 }, { x: 120, y: 360, hw: 33, hh: 33 },
    ];
    const pts = __geom.placeLeavesNoClash(hub, boxes, {
      a0: -1.85, a1: 1.85, rx: 110, ry: 96,
      bd: { x0: 58, x1: 300, y0: 78, y1: 391 },
      pad: 6, hard: [hub], soft,
    });
    // CERO choque hoja-hoja y hoja-hub (lo VISIBLE) — el mandato del operador
    expect(__geom.rectsOverlap(pts, boxes, [hub], 2)).toBe(false);
    pts.forEach((p) => expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true));
  });

  it('relax con obstáculos fijos: los puntos huyen del hub, el hub NO se mueve', () => {
    const hub = { x: 200, y: 200 };
    const pts = [{ x: 202, y: 201 }, { x: 198, y: 199 }];
    __geom.relax(pts, 50, { x0: 0, x1: 400, y0: 0, y1: 400 }, { fixed: [hub], fixedD: 90 });
    expect(hub.x).toBe(200);
    expect(hub.y).toBe(200);
    pts.forEach((p) => {
      const d = Math.hypot(p.x - hub.x, p.y - hub.y);
      expect(d).toBeGreaterThanOrEqual(90 - 1);
    });
  });
});

describe('AgentRedMenu — smoke', () => {
  it('renderiza sin crashear y monta la raíz', () => {
    const { container } = render(<AgentRedMenu onPick={vi.fn()} />);
    expect(container.querySelector('.arm-root')).toBeTruthy();
  });

  it('NO duplica la Ⓐ: el menú no trae nodo raíz propio (la raíz es el botón Ⓐ del hero)', () => {
    const { container } = render(<AgentRedMenu onPick={vi.fn()} />);
    // Operador 2026-06-10: una SOLA Ⓐ — la del botón del agente (AgentHero).
    // El menú no renderiza su propio nodo Ⓐ; la red nace del ancla del padre.
    expect(container.querySelector('.arm-rootn')).toBeNull();
    // ningún nodo interactivo del menú pinta el glifo Ⓐ (el <style> no cuenta)
    expect(container.querySelector('.arm-nodes').textContent).not.toContain('Ⓐ');
  });

  it('acepta el ancla del botón Ⓐ del hero (anchorRef) sin crashear', () => {
    const anchorRef = { current: null };
    const { container } = render(<AgentRedMenu onPick={vi.fn()} anchorRef={anchorRef} />);
    expect(container.querySelector('.arm-root')).toBeTruthy();
  });
});
