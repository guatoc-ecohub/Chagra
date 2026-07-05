import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentLivingScene from '../AgentLivingScene';

/**
 * AgentLivingScene — "El organismo que conversa".
 * Smoke + contrato: cada tema monta su escena propia y el estado del agente se
 * refleja en `data-state` (dirige la reactividad del CSS: respira / anillos que
 * contraen al escuchar / doble latido al pensar / ondas que emanan al hablar).
 */
describe('AgentLivingScene', () => {
  it('monta la escena con el testid y aria-hidden (capa decorativa)', () => {
    const { getByTestId } = render(<AgentLivingScene theme="biopunk2" />);
    const root = getByTestId('agent-living-scene');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-hidden', 'true');
    // idle por defecto.
    expect(root).toHaveAttribute('data-state', 'idle');
  });

  it('biopunk y biopunk2 comparten la MISMA escena nocturna (piel base)', () => {
    const a = render(<AgentLivingScene theme="biopunk2" />);
    expect(a.getByTestId('agent-living-scene')).toHaveAttribute('data-ag-theme', 'biopunk');
    a.unmount();
    const b = render(<AgentLivingScene theme="biopunk" />);
    expect(b.getByTestId('agent-living-scene')).toHaveAttribute('data-ag-theme', 'biopunk');
  });

  it.each([
    ['nature'],
    ['verde-vivo'],
    ['minimalista'],
  ])('cada tema claro monta su propio mundo (%s)', (theme) => {
    const { getByTestId, container } = render(<AgentLivingScene theme={theme} />);
    expect(getByTestId('agent-living-scene')).toHaveAttribute('data-ag-theme', theme);
    // Cada escena es un SVG a pantalla completa.
    expect(container.querySelector('svg.als-svg')).toBeInTheDocument();
  });

  it.each([
    ['idle'],
    ['listening'],
    ['thinking'],
    ['speaking'],
  ])('el estado del agente dirige la reactividad de la escena (%s)', (state) => {
    const { getByTestId } = render(<AgentLivingScene theme="biopunk2" state={state} />);
    expect(getByTestId('agent-living-scene')).toHaveAttribute('data-state', state);
  });

  it('tema desconocido cae a la escena nocturna (no rompe el render)', () => {
    const { getByTestId, container } = render(<AgentLivingScene theme="tema-legado-x" />);
    expect(getByTestId('agent-living-scene')).toBeInTheDocument();
    expect(container.querySelector('svg.als-svg')).toBeInTheDocument();
  });
});
