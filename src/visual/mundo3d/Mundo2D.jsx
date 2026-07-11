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
import MundoValle2D from './laminas2d/MundoValle2D.jsx';
import Corte2D from './laminas2d/Corte2D.jsx';
import Flujo2D from './laminas2d/Flujo2D.jsx';
import Recinto2D from './laminas2d/Recinto2D.jsx';
import Estratos2D from './laminas2d/Estratos2D.jsx';

const MAPA_2D = {
  // gemelos 2D de primera clase de cada diorama 3D (reemplazo, no fallback pobre)
  corte2d: Corte2D,
  flujo2d: Flujo2D,
  recinto2d: Recinto2D,
  estratos2d: Estratos2D,
  // arquetipos 2D nativos + el espejo genérico de respaldo
  mirror: LaminaMundo,
  infografia: Infografia,
  ficha: Ficha,
  lamina: LaminaCultivo,
  valle2d: MundoValle2D,
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
