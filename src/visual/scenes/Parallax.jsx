/*
 * Parallax — el MOTOR de cámara multicapa, distilado de `MontanaMundosCine`
 * (la "Montaña de los Mundos", pasada cinematográfica). Apila capas SVG/DOM que
 * viajan a distinta velocidad respecto a la cámara base: las lejanas amortiguadas
 * (f < 1), las cercanas adelantadas (f > 1). Composición GPU pura (solo
 * `transform`), reduced-motion-safe.
 *
 * Reparto de responsabilidades (a propósito): este motor NO decide la geometría
 * de la escena (pisos térmicos, encuadre, gestos) — eso es del consumidor, que
 * calcula la cámara base `{ tx, ty, s }` con su propio dominio y se la pasa. Aquí
 * vive lo REUTILIZABLE: los factores por capa, la fórmula del transform, el hook
 * de viewport y el apilado de capas con su inercia base (`.scn-capa`).
 *
 * Importá `./scenes.css` una vez donde lo uses.
 */
import { transformCapa } from './_parallax.js';
import './scenes.css';

/**
 * Parallax — apila las capas (de lejos a cerca). Cada capa:
 *   { id?, f, contenido, clase?, interactiva?, style? }
 * `f` es su factor (use `CAPAS_PARALLAX.*` o el propio). `interactiva:true` deja
 * pasar el toque (la capa con los mundos tocables); el resto es decorativo.
 *
 * @param {Object}  props
 * @param {{tx:number, ty:number, s:number}} props.camara  cámara base (la calcula la escena).
 * @param {Array}   props.capas        capas a apilar (orden = z-order, de fondo a frente).
 * @param {number}  [props.alturaCapa] alto en px de cada capa (= alto de la escena escalada).
 * @param {string}  [props.className]  clases extra del contenedor.
 * @param {import('react').ReactNode} [props.children] contenido extra sobre las capas (HUD, controles).
 */
export default function Parallax({ camara, capas = [], alturaCapa, className = '', children, ...rest }) {
  return (
    <div className={`scn-parallax ${className}`.trim()} {...rest}>
      {capas.map((c, i) => (
        <div
          key={c.id ?? i}
          className={`scn-capa ${c.interactiva ? 'scn-capa--interactiva' : ''} ${c.clase || ''}`.trim()}
          style={{
            ...(alturaCapa ? { height: `${alturaCapa}px` } : null),
            transform: transformCapa(camara, c.f),
            ...c.style,
          }}
        >
          {c.contenido}
        </div>
      ))}
      {children}
    </div>
  );
}
