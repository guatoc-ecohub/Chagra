/**
 * OsoBastonCompaiEscena.test.jsx — el OSO DEL BASTÓN compañero dentro de un
 * mundo 3D. Lo que este test certifica (el sujeto tiene nombre): el avatar
 * 'oso-baston' monta EL CUERPO DEL CAMINANTE con su bastón florecido (no la
 * abeja recoloreada), es DE SUELO a ras de trocha, y su reacción-firma es
 * FLORECER al toque.
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

import { OsoBastonCompaiEscena } from '../OsoBastonCompaiEscena.jsx';
import { OSO_BASTON_PRESENCIA } from '../../../creatures/osoBastonIdentidad.js';
import { IDLE_PERFILES } from '../../../creatures/creatureIdle.js';

afterEach(cleanup);

const foco = new THREE.Vector3(0, 0, 0);

describe('OsoBastonCompaiEscena — el oso del bastón deja de ser la abeja', () => {
  it('monta el CUERPO del caminante (svg data-creature="oso-baston"), no el de Angelita', () => {
    const { container } = render(<OsoBastonCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('svg[data-creature="oso-baston"]')).toBeTruthy();
    expect(container.querySelector('svg[data-creature="abeja-angelita"]')).toBeNull();
    expect(container.querySelector('div[data-creature="oso-baston"]')).toBeTruthy();
  });

  it('EL BASTÓN — su firma — está en escena (grupo .osb-baston del cuerpo)', () => {
    const { container } = render(<OsoBastonCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('.osb-baston')).toBeTruthy();
  });

  it('vive en el billboard GENÉRICO del compañero (clases .mundo-abeja*, contrato del molde)', () => {
    const { container } = render(<OsoBastonCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('.mundo-abeja')).toBeTruthy();
    expect(container.querySelector('.mundo-abeja__rebote')).toBeTruthy();
  });

  it('su presencia es DE SUELO a ras de trocha: rondaAltura 0 y sombra FIRME (el caminante pesa)', () => {
    expect(OSO_BASTON_PRESENCIA.rondaAltura).toBe(0);
    expect(OSO_BASTON_PRESENCIA.sombra.opacidadBase).toBeGreaterThanOrEqual(0.3);
  });

  it('tiene perfil idle PROPIO de suelo, más calmo que el trote de la zarigüeya', () => {
    expect(IDLE_PERFILES['oso-baston']).toBeTruthy();
    expect(IDLE_PERFILES['oso-baston'].medio).toBe('suelo');
    // Anda erguido y LENTO: respira más hondo y despacio que la chucha.
    expect(IDLE_PERFILES['oso-baston'].respira.freq).toBeLessThan(IDLE_PERFILES.zariguya.respira.freq);
  });

  it('su reacción-firma: el toque de hotspot hace FLORECER el bastón (data-florece)', () => {
    const { container, rerender } = render(<OsoBastonCompaiEscena foco={foco} rebote={0} />);
    expect(container.querySelector('svg[data-florece="1"]')).toBeNull();
    rerender(<OsoBastonCompaiEscena foco={foco} rebote={1} />);
    expect(container.querySelector('svg[data-florece="1"]')).toBeTruthy();
  });

  it('habla cuando el agente narra (data-hablando en el billboard)', () => {
    const { container } = render(<OsoBastonCompaiEscena foco={foco} hablando />);
    expect(container.querySelector('.mundo-abeja[data-hablando="1"]')).toBeTruthy();
  });

  it('reduced motion: aparece ya plantado, sin cruce ni florecer automático', () => {
    const { container } = render(<OsoBastonCompaiEscena foco={foco} reducedMotion />);
    const billboard = container.querySelector('.mundo-abeja');
    expect(billboard.getAttribute('style') || '').not.toMatch(/visibility:\s*hidden/);
    expect(container.querySelector('svg[data-florece="1"]')).toBeNull();
  });
});
