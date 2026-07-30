/*
 * agentePlano — contrato del CRUCE DEL AGENTE 3D → PLANO (three-free).
 *
 * Congela:
 *   · el reloj se DERIVA del reloj del túnel: la abeja es tragada exactamente
 *     en `momentoCubiertoTunel` y todo instante posterior queda ordenado
 *     (cubierto < salida < posada < total); tier 'bajo' acorta; RM colapsa;
 *   · la geometría (varsDeCruce) apunta a la boca del túnel (FUGA_Y) y cae
 *     con dignidad sin rects (percha por defecto, esquina del compAI);
 *   · `onPosada`/`onFin` disparan UNA vez, cronometrados por timers JS;
 *   · reduced-motion: no monta nada, pero el contrato se honra de inmediato;
 *   · la señal (senalAgentePlano) cruza el swap: el puente monta el overlay
 *     al recibirla y la limpia al terminar.
 */
import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';

import AgentePlanoTransicion, { AgentePlanoPuente } from '../AgentePlanoTransicion.jsx';
import {
  relojAgentePlano,
  varsDeCruce,
  destinoFabPorDefecto,
  FAB_LADO,
  EMPALME_MS,
} from '../agentePlanoData.js';
import {
  posarAgente,
  alzarAgente,
  limpiarCruceAgente,
} from '../senalAgentePlano.js';
import {
  duracionTunel,
  momentoCubiertoTunel,
  FUGA_Y,
} from '../../mundo3d/transiciones/tunelLaminaData.js';

afterEach(() => {
  cleanup();
  limpiarCruceAgente();
  vi.useRealTimers();
});

describe('relojAgentePlano — derivado del reloj del túnel', () => {
  it('posar: la ida muere exactamente en el cubierto del túnel "saliendo"', () => {
    const r = relojAgentePlano('posar', 'alto', false);
    expect(r.ida).toBe(momentoCubiertoTunel('saliendo', 'alto', false));
  });

  it('alzar: monta sobre el túnel "entrando"', () => {
    const r = relojAgentePlano('alzar', 'alto', false);
    expect(r.ida).toBe(momentoCubiertoTunel('entrando', 'alto', false));
  });

  it('los instantes quedan ordenados: cubierto < salida < posada < total', () => {
    for (const sentido of /** @type {('posar'|'alzar')[]} */ (['posar', 'alzar'])) {
      for (const tier of /** @type {('alto'|'medio'|'bajo')[]} */ (['alto', 'medio', 'bajo'])) {
        const r = relojAgentePlano(sentido, tier, false);
        expect(r.ida).toBeLessThan(r.salida);
        expect(r.salida).toBeLessThan(r.posada);
        expect(r.posada).toBeLessThan(r.total);
        // La llegada arranca cuando el túnel ya está revelando (tras la meseta).
        expect(r.salida).toBeGreaterThan(r.ida);
        expect(r.salida).toBeLessThan(duracionTunel(sentido === 'posar' ? 'saliendo' : 'entrando', tier, false) + 1);
      }
    }
  });

  it('posar aplana (aplaneMs > 0); alzar no (el volumen regresa, no se rinde)', () => {
    expect(relojAgentePlano('posar', 'alto', false).aplaneMs).toBeGreaterThan(0);
    expect(relojAgentePlano('alzar', 'alto', false).aplaneMs).toBe(0);
  });

  it('tier bajo acorta el cruce completo', () => {
    expect(relojAgentePlano('posar', 'bajo', false).total).toBeLessThan(
      relojAgentePlano('posar', 'alto', false).total,
    );
  });

  it('reduced-motion colapsa todo a 0 (corte digno)', () => {
    const r = relojAgentePlano('posar', 'alto', true);
    expect(r.posada).toBe(0);
    expect(r.total).toBe(0);
  });

  it('el empalme final solapa encima del avatar real (total = posada + empalme)', () => {
    const r = relojAgentePlano('posar', 'alto', false);
    expect(r.total - r.posada).toBe(EMPALME_MS);
  });
});

describe('varsDeCruce — geometría de los dos tramos', () => {
  const viewport = { ancho: 1000, alto: 800 };

  it('la boca del túnel es el punto de fuga del lenguaje (centro, FUGA_Y)', () => {
    const g = varsDeCruce(null, null, viewport);
    expect(g.bx).toBe(500);
    expect(g.by).toBe(800 * FUGA_Y);
  });

  it('con rects reales, los tramos van centro a centro', () => {
    const desde = { x: 100, y: 200, width: 80, height: 80 };
    const hasta = { x: 900, y: 700, width: 56, height: 56 };
    const g = varsDeCruce(desde, hasta, viewport);
    expect(g.x0).toBe(140);
    expect(g.y0).toBe(240);
    expect(g.dxIda).toBe(g.bx - 140);
    expect(g.dxLleg).toBe(928 - g.bx);
    expect(g.dyLleg).toBe(728 - g.by);
  });

  it('sin `hasta` aterriza en la esquina del compAI (destinoFabPorDefecto)', () => {
    const g = varsDeCruce(null, null, viewport);
    const fab = destinoFabPorDefecto(viewport);
    expect(g.x1).toBe(fab.x + FAB_LADO / 2);
    expect(g.y1).toBe(fab.y + FAB_LADO / 2);
  });

  it('la escala del posado queda acotada (avatar chico digno, nunca gigante)', () => {
    const enorme = { x: 0, y: 0, width: 900, height: 900 };
    const minusculo = { x: 0, y: 0, width: 8, height: 8 };
    expect(varsDeCruce(null, enorme, viewport).ladoPosada).toBeLessThanOrEqual(64);
    expect(varsDeCruce(null, minusculo, viewport).ladoPosada).toBeGreaterThanOrEqual(40);
  });
});

describe('<AgentePlanoTransicion> — contrato temporal', () => {
  it('onPosada y onFin disparan UNA vez, en su instante', () => {
    vi.useFakeTimers();
    const onPosada = vi.fn();
    const onFin = vi.fn();
    const r = relojAgentePlano('posar', 'alto', false);
    const { container } = render(
      <AgentePlanoTransicion sentido="posar" tier="alto" onPosada={onPosada} onFin={onFin} />,
    );
    expect(container.querySelector('.apt--posar')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(r.posada - 1));
    expect(onPosada).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2));
    expect(onPosada).toHaveBeenCalledTimes(1);
    expect(onFin).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(r.total));
    expect(onFin).toHaveBeenCalledTimes(1);
    expect(onPosada).toHaveBeenCalledTimes(1);
  });

  it('desmontar a mitad de cruce cancela los timers (ni posada ni fin fantasma)', () => {
    vi.useFakeTimers();
    const onPosada = vi.fn();
    const onFin = vi.fn();
    const { unmount } = render(
      <AgentePlanoTransicion sentido="posar" tier="alto" onPosada={onPosada} onFin={onFin} />,
    );
    unmount();
    act(() => vi.advanceTimersByTime(10000));
    expect(onPosada).not.toHaveBeenCalled();
    expect(onFin).not.toHaveBeenCalled();
  });

  it('reduced-motion: no monta nada y el contrato dispara de inmediato', () => {
    vi.useFakeTimers();
    const onPosada = vi.fn();
    const onFin = vi.fn();
    const { container } = render(
      <AgentePlanoTransicion sentido="posar" reducedMotion onPosada={onPosada} onFin={onFin} />,
    );
    expect(container.firstChild).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(onPosada).toHaveBeenCalledTimes(1);
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('tier bajo no monta el cometa; alto sí', () => {
    const bajo = render(<AgentePlanoTransicion sentido="posar" tier="bajo" />);
    expect(bajo.container.querySelector('.apt__cometa')).toBeNull();
    bajo.unmount();
    const alto = render(<AgentePlanoTransicion sentido="posar" tier="alto" />);
    expect(alto.container.querySelector('.apt__cometa')).toBeInTheDocument();
  });
});

describe('<AgentePlanoPuente> + señal — el cruce sobrevive al swap', () => {
  it('sin señal no monta nada; con posarAgente monta el overlay "posar"', () => {
    const { container } = render(<AgentePlanoPuente tier="alto" />);
    expect(container.firstChild).toBeNull();
    act(() => posarAgente({ desde: { x: 10, y: 10, width: 76, height: 76 } }));
    expect(container.querySelector('.apt--posar')).toBeInTheDocument();
  });

  it('al terminar limpia la señal y desmonta (listo para el próximo cruce)', () => {
    vi.useFakeTimers();
    const onFin = vi.fn();
    const { container } = render(<AgentePlanoPuente tier="alto" onFin={onFin} />);
    act(() => alzarAgente({}));
    expect(container.querySelector('.apt--alzar')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(relojAgentePlano('alzar', 'alto', false).total + 1));
    expect(onFin).toHaveBeenCalledWith('alzar');
    expect(container.firstChild).toBeNull();
  });

  it('reduced-motion: honra posada y fin al instante y limpia la señal', () => {
    const onPosada = vi.fn();
    const onFin = vi.fn();
    const { container } = render(
      <AgentePlanoPuente reducedMotion onPosada={onPosada} onFin={onFin} />,
    );
    act(() => posarAgente({}));
    expect(container.firstChild).toBeNull();
    expect(onPosada).toHaveBeenCalledWith('posar');
    expect(onFin).toHaveBeenCalledWith('posar');
  });
});
