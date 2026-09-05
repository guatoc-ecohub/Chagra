import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('@react-three/fiber', () => ({ useFrame: () => {} }));
vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <div data-testid="billboard">{children}</div>,
}));

import { ChivitoCompaiEscena, GuacamayaCompaiEscena } from '../AvesCompaiEscena.jsx';
import { IDLE_PERFILES } from '../../../creatures/creatureIdle.js';

const foco = new THREE.Vector3(0, 0, 0);

afterEach(cleanup);

describe('AvesCompaiEscena — idle por especie', () => {
  it('guacamaya monta su rig y su perfil idle propio', () => {
    const { container } = render(<GuacamayaCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('svg[data-creature="guacamaya"]')).toBeInTheDocument();
    expect(container.querySelector('[data-creature="guacamaya"] > [data-pose]'))
      .toHaveAttribute('data-pose', IDLE_PERFILES.guacamaya.poseBase);
  });

  it('chivito monta su rig y usa el slug canónico del perfil', () => {
    const { container } = render(<ChivitoCompaiEscena foco={foco} reducedMotion />);
    expect(container.querySelector('svg[data-creature="chivito-punk"]')).toBeInTheDocument();
    expect(container.querySelector('[data-creature="chivito-punk"] > [data-pose]'))
      .toHaveAttribute('data-pose', IDLE_PERFILES['chivito-punk'].poseBase);
  });
});
