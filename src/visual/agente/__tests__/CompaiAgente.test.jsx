import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CompaiAgente } from '../CompaiAgente.jsx';

afterEach(cleanup);

function RigEspia({
  estado,
  pose,
  especie,
  creatureSlug,
  visema,
  animated,
  reducedMotion,
  tier,
  ...rest
}) {
  return (
    <div
      data-testid="rig"
      data-rig-estado={estado}
      data-rig-pose={pose}
      data-rig-especie={especie}
      data-rig-creature={creatureSlug}
      data-rig-visema={visema || undefined}
      data-rig-animated={animated ? '1' : '0'}
      data-rig-reduced-motion={reducedMotion ? '1' : '0'}
      data-rig-tier={tier || undefined}
      {...rest}
    />
  );
}

describe('CompaiAgente', () => {
  it('resuelve el perfil y entrega estado rico, pose y props al adaptador', () => {
    const { container, getByTestId } = render(
      <CompaiAgente
        especie="jaguar"
        estado="preocupada"
        visema="V3"
        confianza="baja"
        clima="lluvia"
        enso="nino"
        direccion="izquierda"
        tier="medio"
        adaptador={RigEspia}
      />,
    );

    const shell = container.querySelector('.compai-agente');
    expect(shell).toHaveAttribute('data-agt-especie', 'jaguar');
    expect(shell).toHaveAttribute('data-agt-creature', 'jaguar');
    expect(shell).toHaveAttribute('data-agt-estado', 'preocupada');
    expect(shell).toHaveAttribute('data-agt-pose', 'anda');
    expect(shell).toHaveAttribute('data-agt-visema', 'V3');
    expect(shell).toHaveAttribute('data-agt-clima', 'lluvia');
    expect(shell).toHaveAttribute('data-agt-capacidad-marcha', 'camina');
    expect(getByTestId('rig')).toHaveAttribute('data-agt-estado', 'preocupada');
    expect(getByTestId('rig')).toHaveAttribute('data-pose', 'anda');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-estado', 'preocupada');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-pose', 'anda');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-especie', 'jaguar');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-creature', 'jaguar');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-visema', 'V3');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-animated', '1');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-reduced-motion', '0');
    expect(getByTestId('rig')).toHaveAttribute('data-rig-tier', 'medio');
  });

  it('conserva caminando y resuelve la locomoción del suelo', () => {
    const { container } = render(
      <CompaiAgente especie="oso-baston" estado="caminando" adaptador={RigEspia} />,
    );

    expect(container.querySelector('.compai-agente')).toHaveAttribute('data-agt-estado', 'caminando');
    expect(container.querySelector('.compai-agente')).toHaveAttribute('data-agt-pose', 'camina');
    expect(container.querySelector('[data-testid="rig"]')).toHaveAttribute('data-rig-estado', 'caminando');
    expect(container.querySelector('[data-testid="rig"]')).toHaveAttribute('data-rig-pose', 'camina');
  });

  it('apaga loops con animated=false, reduced motion y tier bajo sin quitar feedback', () => {
    const { container, rerender } = render(
      <CompaiAgente especie="angelita" estado="respondiendo" animated={false} adaptador={RigEspia} />,
    );
    let shell = container.querySelector('.compai-agente');
    expect(shell).toHaveAttribute('data-agt-animado', '0');
    expect(shell).toHaveAttribute('data-agt-loop', '0');
    expect(container.querySelector('[data-agt-chrome="respuesta"]')).toBeInTheDocument();

    rerender(
      <CompaiAgente especie="angelita" estado="respondiendo" reducedMotion adaptador={RigEspia} />,
    );
    shell = container.querySelector('.compai-agente');
    expect(shell).toHaveAttribute('data-agt-reduced-motion', '1');
    expect(shell).toHaveAttribute('data-agt-animado', '0');
    expect(container.querySelector('[data-testid="rig"]')).toHaveAttribute('data-rig-reduced-motion', '1');

    rerender(
      <CompaiAgente especie="angelita" estado="respondiendo" tier="bajo" adaptador={RigEspia} />,
    );
    shell = container.querySelector('.compai-agente');
    expect(shell).toHaveAttribute('data-agt-loop', '0');
    expect(container.querySelector('[data-agt-chrome="respuesta"]')).toBeInTheDocument();
  });
});
