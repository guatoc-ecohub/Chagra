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

/**
 * Todas las props son opcionales en runtime (cada arquetipo 2D trae sus
 * defaults); solo `escena` decide qué se monta — sin match, no renderiza.
 * @param {Object} props
 * @param {string} [props.escena]  clave de MAPA_2D ('mirror'|'infografia'|'ficha'|'lamina'|'valle2d').
 * @param {Object} [props.entrada]  manifiesto del mundo (params/hotspots/titulo…).
 * @param {string} [props.motivo]  por qué se degradó a 2D (solo 'mirror').
 * @param {string[]} [props.tinte]  paleta [fuerte, suave] del mundo.
 * @param {boolean} [props.reducedMotion]
 * @param {Function} [props.onHotspot]
 * @param {string} [props.animo]
 * @param {number} [props.energia]
 */
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
