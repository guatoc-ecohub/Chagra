/*
 * Mundo2D — el HOST de los arquetipos 2D (SVG/DOM, three-free).
 *
 * Monta el arquetipo 2D resuelto por `resolverMundo`: sea un arquetipo de primera
 * clase (mercado→`infografia`, cultivo→`lamina`, especie→`ficha`) o el ESPEJO de
 * un diorama 3D degradado (`mirror` con su `motivo`, o `valle2d`). Es el "piso
 * digno" garantizado: sin WebGL, sin three, siempre renderiza.
 *
 * NO importa nada de `three`/`@react-three` — por eso el 2D es fiable y liviano.
 */
import LaminaMundo from './laminas2d/LaminaMundo.jsx';
import Infografia from './laminas2d/Infografia.jsx';
import Ficha from './laminas2d/Ficha.jsx';
import LaminaCultivo from './laminas2d/LaminaCultivo.jsx';
import { GemeloValleEscena } from './GemeloValle2D.jsx';

const MAPA_2D = {
  mirror: LaminaMundo,
  infografia: Infografia,
  ficha: Ficha,
  lamina: LaminaCultivo,
  valle2d: GemeloValleEscena,
};

export default function Mundo2D({
  escena, entrada, motivo, tinte, reducedMotion, onHotspot, animo, energia,
}) {
  const Comp = MAPA_2D[escena];
  if (!Comp) return null;
  return (
    <Comp
      params={entrada?.params}
      hotspots={entrada?.hotspots}
      entrada={entrada}
      tinte={tinte}
      motivo={motivo}
      reducedMotion={reducedMotion}
      onHotspot={onHotspot}
      animo={animo}
      energia={energia}
      titulo={entrada?.titulo}
    />
  );
}
