/*
 * Mundo2D — el enrutador de LÁMINAS 2D del framework (DR §4.4).
 *
 * Cuando un mundo cae al 2D (tier bajo / sin WebGL / reduced-motion), lee su
 * `fallback2d` del registro y monta la lámina SVG espejo con los MISMOS
 * hotspots. Un mundo sin lámina cae a su pantalla 2D real (`ruta2d`) — de eso se
 * encarga el host; aquí, sin lámina → null (nunca un error).
 */
import { LaminaCutaway } from './laminas/LaminaCutaway.jsx';
import { MUNDO_3D, metaMundo } from './mundo3dData';

/* Registro de láminas espejo. Sumar una = una entrada aquí (como los arquetipos). */
const LAMINAS = {
  'lamina-cutaway': LaminaCutaway,
};

export default function Mundo2D({ mundoId, vida01 = 0.5, onHotspot }) {
  const d = MUNDO_3D[mundoId];
  const Lamina = d && d.fallback2d ? LAMINAS[d.fallback2d] : null;
  if (!Lamina) return null;
  const meta = metaMundo(mundoId);
  return <Lamina hotspots={d.hotspots} tinte={meta.tinte} vida01={vida01} onHotspot={onHotspot} />;
}
