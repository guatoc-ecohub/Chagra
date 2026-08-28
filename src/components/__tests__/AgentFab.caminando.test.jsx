import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useComportamientoCompai.js', () => ({
  default: () => ({
    caminando: true,
    direccion: 'derecha',
    notificacionVisible: false,
    handlers: {
      onPointerEnter: () => {},
      onPointerLeave: () => {},
      onPointerDown: () => {},
      onPointerMove: () => {},
      onPointerUp: () => {},
      onPointerCancel: () => {},
    },
  }),
}));

import AgentFab from '../AgentFab.jsx';
import useAngelitaStore from '../../store/useAngelitaStore.js';
import useAgentNotificationStore from '../../store/useAgentNotificationStore.js';

const POSE_DE_LOCOMOCION = {
  angelita: 'vuela',
  jaguar: 'camina',
  'oso-baston': 'camina',
  zariguya: 'camina',
  luciernaga: 'vuela',
  'chivito-punk': 'vuela',
  guacamaya: 'vuela',
};

beforeEach(() => {
  useAngelitaStore.setState({
    silenciado: false,
    estado: 'calma',
    visualEstado: 'acompana',
    mensaje: null,
    tipo: null,
  });
  useAgentNotificationStore.setState({ responseReady: false, lastAssistantMessage: null });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('AgentFab — locomoción del roster-7', () => {
  for (const [especie, pose] of Object.entries(POSE_DE_LOCOMOCION)) {
    it(`${especie} recibe caminando con pose ${pose}`, () => {
      localStorage.setItem('compai:companero', especie);
      const { container } = render(<AgentFab onNavigate={() => {}} />);
      const rig = container.querySelector('[data-agt-estado="caminando"][data-pose]');
      expect(rig).toBeInTheDocument();
      expect(rig).toHaveAttribute('data-pose', pose);
    });
  }
});
