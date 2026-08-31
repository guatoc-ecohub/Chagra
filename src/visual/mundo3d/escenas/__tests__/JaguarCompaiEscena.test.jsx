/**
 * JaguarCompaiEscena.test.jsx — el JAGUAR compañero dentro de un mundo 3D.
 * Lo que este test certifica (el sujeto tiene nombre): el avatar 'jaguar'
 * monta EL CUERPO DEL JAGUAR sobre el billboard genérico del compañero, y su
 * presencia es DE SUELO — camina, jamás vuela.
 *
 * SKIN definitiva = JaguarTrazado (lámina auto-trazada a tinta, operador
 * 2026-08-24): renderiza un <div data-creature="jaguar"> (dangerouslySetInnerHTML
 * del SVG trazado), NO un <svg data-creature> como el cuerpo rubber-hose viejo.
 * Por eso el contrato se comprueba sobre el div `.jaguarTrazado`.
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
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

import { JaguarCompaiEscena } from '../JaguarCompaiEscena.jsx';
import { JAGUAR_PRESENCIA } from '../../../creatures/jaguarIdentidad.js';
import { LUCIERNAGA_PRESENCIA } from '../../../creatures/luciernagaIdentidad.js';
import { ABEJA_PRESENCIA } from '../../../creatures/abejaIdentidad.js';
import { IDLE_PERFILES } from '../../../creatures/creatureIdle.js';

afterEach(cleanup);

const foco = new THREE.Vector3(0, 0, 0);

describe('JaguarCompaiEscena — el jaguar deja de ser la abeja', () => {
  it('monta el CUERPO del jaguar (skin trazada, div data-creature="jaguar"), no el de Angelita', () => {
    const { container } = render(<JaguarCompaiEscena foco={foco} reducedMotion />);
    // La SKIN definitiva es JaguarTrazado → <div .jaguarTrazado data-creature>.
    expect(container.querySelector('.jaguarTrazado[data-creature="jaguar"]')).toBeTruthy();
    expect(container.querySelector('[data-creature="abeja-angelita"]')).toBeNull();
    // La capa del gesto queda rotulada con su especie (la captura del gate
    // puede nombrar al sujeto).
    expect(container.querySelector('div[data-creature="jaguar"]')).toBeTruthy();
  });

  it('vive en el billboard GENÉRICO del compañero (clases .mundo-abeja*, contrato del molde)', () => {
    const { container } = render(<JaguarCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('.mundo-abeja')).toBeTruthy();
    expect(container.querySelector('.mundo-abeja__rebote')).toBeTruthy();
    expect(container.querySelector('.mundo-abeja__cara')).toBeTruthy();
  });

  it('su presencia es DE SUELO: ronda a la altura del cuerpo (no vuela) y su sombra PESA', () => {
    // El felino camina: la ronda es la altura del cuerpo sobre el piso, no
    // una altura de vuelo (la abeja ronda a 1.6; la luciérnaga vuela a 0.6).
    expect(JAGUAR_PRESENCIA.rondaAltura).toBe(JAGUAR_PRESENCIA.percha.y);
    expect(JAGUAR_PRESENCIA.rondaAltura).toBeLessThan(LUCIERNAGA_PRESENCIA.rondaAltura);
    expect(JAGUAR_PRESENCIA.rondaAltura).toBeLessThan(ABEJA_PRESENCIA.rondaAltura);
    // Un felino grande pesa: sombra firme, la más honda del trío nuevo.
    expect(JAGUAR_PRESENCIA.sombra.opacidadBase).toBeGreaterThan(LUCIERNAGA_PRESENCIA.sombra.opacidadBase);
  });

  it('tiene perfil idle PROPIO de suelo (si no, se movería como la abeja)', () => {
    expect(IDLE_PERFILES.jaguar).toBeTruthy();
    expect(IDLE_PERFILES.jaguar.medio).toBe('suelo');
    // Poder contenido: respira más lento que la abeja inquieta.
    expect(IDLE_PERFILES.jaguar.respira.freq).toBeLessThan(IDLE_PERFILES['abeja-angelita'].respira.freq);
  });

  it('habla cuando el agente narra (data-hablando en el billboard)', () => {
    const { container } = render(<JaguarCompaiEscena foco={foco} hablando />);
    expect(container.querySelector('.mundo-abeja[data-hablando="1"]')).toBeTruthy();
  });

  it('reduced motion: aparece ya presente, sin cruce (fotograma digno)', () => {
    const { container } = render(<JaguarCompaiEscena foco={foco} reducedMotion />);
    const billboard = container.querySelector('.mundo-abeja');
    expect(billboard.getAttribute('style') || '').not.toMatch(/visibility:\s*hidden/);
    // Y el cuerpo (skin trazada) queda quieto pero digno (animated=false).
    expect(container.querySelector('.jaguarTrazado[data-creature="jaguar"]')).toBeTruthy();
  });
});
