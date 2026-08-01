/*
 * MundoValle2D — el ESPEJO 2D del arquetipo `valle` (dim '2d').
 *
 * Cuando el mapa se pide en 2D (tier bajo/sin-WebGL), cae al `Valle2DFallback`
 * traído byte-fiel del mockup del valle: proyección isométrica SVG con los
 * mismos mundos tocables, la alerta, la abeja y el clima que tiñe. Este adaptador
 * traduce el contrato del framework a sus props (igual que `EscenaValle` con el
 * 3D). El componente físico vive en `src/mockups/valle`; aquí solo se adapta.
 */
import Valle2DFallback from '../../../mockups/valle/Valle2DFallback.jsx';

export default function MundoValle2D({ params, entrada, reducedMotion = false, onHotspot, animo = 'sereno', energia = 1 }) {
  const clima = params?.clima || entrada?.clima || 'soleado';
  return (
    <Valle2DFallback
      clima={clima}
      focoId={null}
      animo={animo}
      energia={energia}
      reducedMotion={reducedMotion}
      onEntrar={(id) => onHotspot?.('mundo', { mundoId: id })}
      onAlerta={() => onHotspot?.(entrada?.alertaView || 'hoy_finca')}
    />
  );
}
