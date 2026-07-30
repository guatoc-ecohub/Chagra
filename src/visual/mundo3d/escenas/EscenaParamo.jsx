/*
 * EscenaParamo — ARQUETIPO `paramo`: EL PÁRAMO, la fábrica de agua de la finca.
 *
 * Igual que `EscenaValle` es un ADAPTADOR de `Valle3D` (el mapa ya existía como
 * escena completa), este arquetipo ADAPTA el PÁRAMO DEFINITIVO ya aprobado por el
 * operador —`EscenaBosqueVivo` (bosque/), armado con la inmensidad de `FondoParamo`
 * (bóveda, cordillera, mar de nubes, falda que se despeña por la abra), el
 * frailejonal por edades de `FloraParamo` (bioma "paramo": el frailejón
 * caulirrósula con su enagua de necromasa y la roseta afelpada plateada,
 * `geomFrailejon`), el pajonal/sotobosque, la marea de niebla en capas y la
 * cámara de llegada— para que sea "un mundo más" del registro data-driven.
 *
 * Dirección de arte (huesos reales, piel dibujada): la referencia PRINCIPAL es
 * la LÁMINA NATURALISTA DE HUMBOLDT —el tableau físico de los Andes (Essai sur
 * la géographie des plantes / Chimborazo): botánicamente EXACTA, pintada a mano,
 * las plantas ubicadas por ALTITUD— sumada a la atmósfera Ghibli para la niebla y
 * la luz. Resultado: científicamente preciso y bello, PINTADO, NO fotorrealista,
 * NO caricatura, NO rubber-hose. La estructura y la escala son EXACTAS del DR
 * (frailejón caulirrósula sobre 3.000+ m, colonia dispersa por altitud, escala de
 * montaña); lo elástico/rubber-hose vive SOLO en los bichos de FaunaBosque, jamás
 * en el terreno ni la vegetación. El arte reusado ya nace de esa lente (ver
 * floraParamo.geom "veracidad Humboldt" y la perspectiva aérea de fondoParamo).
 * Aquí no se redibuja nada del páramo aprobado: se reusa byte-fiel y se le añade
 * la capa de NAVEGACIÓN del framework.
 *
 * Presupuesto GPU: NO suma dibujos al páramo. Todo lo caro (frailejones y pajonal
 * por InstancedMesh, niebla por planos/fog, cordillera por capas) ya es tier-safe
 * dentro de EscenaBosqueVivo. Esta capa solo agrega botones DOM (cero WebGL).
 *
 * HOTSPOTS: como EscenaBosqueVivo es dueño de su propio <Canvas> (no se toca —
 * es arte aprobado), los hotspots viven en una capa DOM SOBRE el lienzo (como
 * los botones del cielo de EscenaValle), no anclados en 3D. Son botones
 * accesibles (≥44px, foco visible) que re-rutean a vistas 2D reales vía
 * `onHotspot(view, data)`. Opus afina luego el anclaje 3D fino; aquí quedan
 * legibles, tocables y capturables. El "‹ El valle" y el título los pinta el
 * host `<Mundo>` (MigaVolver) — esta capa no los duplica.
 *
 * Contrato uniforme del framework (mismas props que las demás escenas; las que
 * no usa se ignoran sin ruido): { params, hotspots, entrada, tier, reducedMotion,
 * onHotspot, animo, energia, estadoFinca, hayAlerta, ... }.
 */
import EscenaBosqueVivo from '../bosque/EscenaBosqueVivo.jsx';

/* Los hotspots del páramo, por DATOS (mundoData los pisa si los declara). Cada
   `view` es una vista REAL de App.jsx. El páramo NO se ara: sus puertas hablan
   de agua, cuidado y vida —no de cultivo—. `pos` queda para cuando Opus ancle
   el hotspot en 3D; esta capa DOM usa emoji + label + view + data. */
const HOTSPOTS_PARAMO = [
  {
    id: 'agua', emoji: '💧', label: 'La fábrica de agua',
    view: 'agua', data: { tema: 'nacimiento' }, pos: [-1.6, 3.4, 0.6],
  },
  {
    id: 'cuidar', emoji: '🏔️', label: 'El páramo se cuida, no se ara',
    view: 'restauracion', pos: [4.1, 3.0, -3.9],
  },
  {
    id: 'vida', emoji: '🦅', label: 'La vida del páramo',
    view: 'biodiversidad', pos: [1.9, 2.6, 1.7],
  },
];

/* Estilos de la capa táctil (viven aquí: la capa es de ESTA escena, un archivo).
   Self-contained, cero imágenes. La escena aprobada usa la clase `bviva-canvas`
   para su lienzo, pero su CSS de relleno vive en un mockup archivado que el host
   `<Mundo>` no carga: aquí se re-declara el relleno (y opacidad 1, sin depender
   del fade de aquel CSS). Solo transform/opacity animados; reduced-motion los
   apaga. */
const CSS_PARAMO = `
.paramo-mundo { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; }
.paramo-mundo .bviva-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 1; }
.paramo-mundo__hs {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 max(0.7rem, env(safe-area-inset-left)) max(0.9rem, env(safe-area-inset-bottom));
}
.paramo-mundo__fila {
  display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;
  max-width: min(96%, 42rem);
}
.paramo-hot {
  pointer-events: auto; display: inline-flex; align-items: center; gap: 0.4rem;
  min-height: 44px; padding: 0.42rem 0.8rem; border: 0; border-radius: 999px;
  background: rgba(16, 24, 28, 0.72); color: #eef4f0;
  font: 600 0.86rem/1.15 system-ui, sans-serif; text-align: left; cursor: pointer;
  backdrop-filter: blur(5px);
  box-shadow: 0 3px 12px rgba(10, 20, 24, 0.4), inset 0 0 0 1px rgba(196, 206, 178, 0.28);
  -webkit-tap-highlight-color: transparent; transition: transform 0.18s ease, background 0.18s ease;
}
.paramo-hot:hover { background: rgba(24, 36, 42, 0.82); transform: translateY(-1px); }
.paramo-hot:focus-visible { outline: 3px solid rgba(120, 190, 214, 0.95); outline-offset: 3px; }
.paramo-hot__emoji { font-size: 1.05rem; line-height: 1; }
@media (prefers-reduced-motion: reduce) {
  .paramo-hot { transition: none; }
  .paramo-hot:hover { transform: none; }
}
`;

/**
 * El mundo del páramo: reusa el páramo definitivo aprobado y le añade la capa de
 * navegación del framework de mundos. Montar SOLO perezosa (importa three vía la
 * escena aprobada).
 * @param {{
 *   params?: object, hotspots?: Array, entrada?: object, tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean, onHotspot?: (view: string, data?: object) => void,
 *   animo?: string, energia?: number, estadoFinca?: object, hayAlerta?: boolean
 * }} props
 */
export default function EscenaParamo({
  hotspots,
  tier = 'alto',
  reducedMotion = false,
  onHotspot,
  // Props del contrato uniforme que este arquetipo no necesita (el páramo
  // aprobado maneja su propia atmósfera/cámara/vida); se aceptan y se ignoran
  // sin ruido para no romper la interfaz común de las escenas.
  params, entrada, animo, energia, estadoFinca, hayAlerta, ...resto // eslint-disable-line no-unused-vars
}) {
  const puertas = Array.isArray(hotspots) && hotspots.length ? hotspots : HOTSPOTS_PARAMO;
  return (
    <div className="paramo-mundo">
      <style>{CSS_PARAMO}</style>
      {/* EL PÁRAMO DEFINITIVO (arte aprobado, byte-fiel): inmensidad + frailejonal
          + niebla + cámara de llegada. Tier-safe y reduced-motion-safe adentro. */}
      <EscenaBosqueVivo tier={tier} reducedMotion={reducedMotion} />
      {/* La capa de NAVEGACIÓN: puntos de interés del páramo como botones DOM
          accesibles sobre el lienzo (no roban el orbit del canvas: la capa es
          pointer-events:none y solo los botones capturan el toque). */}
      <div className="paramo-mundo__hs">
        <div className="paramo-mundo__fila">
          {puertas.map((h) => (
            <button
              key={h.id}
              type="button"
              className="paramo-hot"
              onClick={() => onHotspot?.(h.view, h.data)}
              aria-label={h.label}
            >
              <span className="paramo-hot__emoji" aria-hidden="true">{h.emoji}</span>
              <span className="paramo-hot__txt">{h.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
