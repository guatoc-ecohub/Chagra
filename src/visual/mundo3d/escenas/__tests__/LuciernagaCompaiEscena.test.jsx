/**
 * LuciernagaCompaiEscena.test.jsx — la LUCIÉRNAGA compañera dentro de un
 * mundo 3D. Lo que este test certifica (el sujeto tiene nombre): el avatar
 * 'luciernaga' monta EL CUERPO DEL COCUYO con su linterna (no la abeja
 * recoloreada); sí vuela, pero BAJO y de LUZ (sombra casi nula), y su
 * linterna DIAGNOSTICA: lee la noche cada tanto y titila 'degradado' cuando
 * la finca tiene alerta real.
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import * as THREE from 'three';

vi.mock('@react-three/fiber', () => ({
  useFrame: () => {},
}));
vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <div data-testid="billboard">{children}</div>,
}));
vi.mock('../SombraContacto.jsx', () => ({
  SombraContacto: () => null,
}));

import { LuciernagaCompaiEscena } from '../LuciernagaCompaiEscena.jsx';
import { LUCIERNAGA_PRESENCIA } from '../../../creatures/luciernagaIdentidad.js';
import { ABEJA_PRESENCIA } from '../../../creatures/abejaIdentidad.js';
import { IDLE_PERFILES } from '../../../creatures/creatureIdle.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const foco = new THREE.Vector3(0, 0, 0);

describe('LuciernagaCompaiEscena — la luciérnaga deja de ser la abeja', () => {
  it('monta el CUERPO del cocuyo (svg data-creature="luciernaga"), no el de Angelita', () => {
    const { container } = render(<LuciernagaCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toBeTruthy();
    expect(container.querySelector('svg[data-creature="abeja-angelita"]')).toBeNull();
    expect(container.querySelector('div[data-creature="luciernaga"]')).toBeTruthy();
  });

  it('vive en el billboard GENÉRICO del compañero (clases .mundo-abeja*, contrato del molde)', () => {
    const { container } = render(<LuciernagaCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('.mundo-abeja')).toBeTruthy();
    expect(container.querySelector('.mundo-abeja__rebote')).toBeTruthy();
  });

  it('SÍ vuela — pero BAJO y de LUZ, no como la abeja: ronda a 0.6 (la abeja a 1.6) y casi sin sombra', () => {
    expect(LUCIERNAGA_PRESENCIA.rondaAltura).toBeGreaterThan(0);
    expect(LUCIERNAGA_PRESENCIA.rondaAltura).toBeLessThan(ABEJA_PRESENCIA.rondaAltura);
    // Es de luz, no de peso: su sombra es un susurro (menos de la mitad de la
    // de la abeja).
    expect(LUCIERNAGA_PRESENCIA.sombra.opacidadBase).toBeLessThan(ABEJA_PRESENCIA.sombra.opacidadBase / 2);
  });

  it('tiene perfil idle PROPIO de aire, más calmo que la abeja (flota, no dardea)', () => {
    expect(IDLE_PERFILES.luciernaga).toBeTruthy();
    expect(IDLE_PERFILES.luciernaga.medio).toBe('aire');
    expect(IDLE_PERFILES.luciernaga.respira.freq).toBeLessThan(IDLE_PERFILES['abeja-angelita'].respira.freq);
  });

  it('con ALERTA real de la finca la linterna titila degradado (la bioindicadora diagnostica)', () => {
    const { container } = render(<LuciernagaCompaiEscena foco={foco} hayAlerta />);
    expect(container.querySelector('svg[data-eco="degradado"]')).toBeTruthy();
  });

  it('cada tanto se detiene a LEER LA NOCHE (data-eco="leer") y después vuelve al reposo', () => {
    vi.useFakeTimers();
    // Jitter fijado a 0 → el ciclo dispara exacto a los 9.2s (determinista).
    const azar = vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container } = render(<LuciernagaCompaiEscena foco={foco} />);
    expect(container.querySelector('svg[data-eco="leer"]')).toBeNull();
    act(() => { vi.advanceTimersByTime(9250); });
    expect(container.querySelector('svg[data-eco="leer"]')).toBeTruthy();
    // Y la lectura dura 1.7s: pasada la ventana, la linterna vuelve al latido.
    act(() => { vi.advanceTimersByTime(1750); });
    expect(container.querySelector('svg[data-eco="leer"]')).toBeNull();
    azar.mockRestore();
  });

  it('el toque de hotspot también la pone a leer (su reacción-firma)', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<LuciernagaCompaiEscena foco={foco} rebote={0} />);
    expect(container.querySelector('svg[data-eco="leer"]')).toBeNull();
    rerender(<LuciernagaCompaiEscena foco={foco} rebote={1} />);
    expect(container.querySelector('svg[data-eco="leer"]')).toBeTruthy();
  });

  it('habla cuando el agente narra (data-hablando en el billboard)', () => {
    const { container } = render(<LuciernagaCompaiEscena foco={foco} hablando />);
    expect(container.querySelector('.mundo-abeja[data-hablando="1"]')).toBeTruthy();
  });

  it('reduced motion: aparece ya encendida y quieta (la linterna no se negocia)', () => {
    const { container } = render(<LuciernagaCompaiEscena foco={foco} reducedMotion />);
    const billboard = container.querySelector('.mundo-abeja');
    expect(billboard.getAttribute('style') || '').not.toMatch(/visibility:\s*hidden/);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toBeTruthy();
  });
});
