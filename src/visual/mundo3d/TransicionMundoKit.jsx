/*
 * TransicionMundoKit — kit de transiciones de entrada/salida de mundo.
 *
 * El pase del home al mundo 3D (y de vuelta) como VIAJE, no como cambio de
 * pantalla — norte: la transición 2D↔3D estilo túnel. Cuatro variantes
 * reutilizables, todas overlay DOM/CSS puro (CERO three, cero red, offline):
 *
 *   · 'wipe'  — barrido vertical con borde de ola orgánica (SVG inline);
 *   · 'iris'  — portal circular que se cierra al centro y reabre;
 *   · 'zoom'  — túnel: velo radial que escala hacia adentro + aros de viaje;
 *   · 'fade'  — cross-fade cálido por un gradiente amanecer.
 *
 * CONTRATO TEMPORAL (igual filosofía que TransicionMundo, el velo original):
 * los callbacks los disparan timers JS deterministas, NUNCA `animationend`.
 * El CSS anima con la misma duración via `--tmk-ms` pero es decorativo.
 *   · `onMitad` — pantalla 100% cubierta (meseta 45%–55% de las keyframes):
 *     AQUÍ el host intercambia la escena debajo del overlay;
 *   · `onFin`   — pantalla revelada, overlay inerte: desmonte con `activa=false`.
 * Cada uno se llama a lo sumo UNA vez por activación.
 *
 * PROPS
 *   variante      'wipe'|'iris'|'zoom'|'fade' (desconocida → 'fade')
 *   activa        bool — al pasar a true corre el ciclo cubrir→mitad→revelar;
 *                 en false no se monta nada y se cancelan los timers.
 *   direccion     'entrar' (home → mundo) | 'salir' (mundo → home): cambia el
 *                 sentido/easing del movimiento, no el contrato temporal.
 *   tier          'alto'|'medio'|'bajo' (deviceTier): bajo = más corto y sin
 *                 decoraciones (olas SVG, aros, halos); alto = extras baratos.
 *   reducedMotion bool — colapsa TODO a un corte simple: cubre instantáneo,
 *                 onMitad enseguida, desvanece corto (REDUCIDA_MS total).
 *   colorA/colorB tintes del destino (claro/profundo). Defaults cálidos.
 *   onMitad/onFin callbacks del contrato temporal (opcionales).
 *
 * CABLEO SUGERIDO (lo hace Opus — este archivo no toca nada existente):
 *   1. El host (p.ej. Mundo.jsx o quien orqueste useNavegacionMundos) monta
 *      `<TransicionMundoKit activa={viajando} …/>` como hermano del canvas;
 *   2. en `onMitad` hace el swap de escena (hoy: `completarViaje()` — que con
 *      este kit puede partirse en swap@mitad + limpieza@fin);
 *   3. en `onFin` apaga `activa`. Tintes: `tinteDeMundo(mundoId)` de
 *      resolverMundo.js → colorA/colorB. Tier/reducedMotion: deviceTier.js.
 *   Este kit puede convivir con el velo TransicionMundo (z-index 44 > 40) o
 *   reemplazarlo variante por variante.
 */
import { useEffect, useRef } from 'react';
import { duracionTransicion, mitadTransicion, VARIANTES } from './tiemposTransicion.js';
import './transicionMundoKit.css';

export default function TransicionMundoKit({
  variante = 'fade',
  activa = false,
  direccion = 'entrar',
  tier = 'medio',
  reducedMotion = false,
  colorA = '#f2c063',
  colorB = '#1d4030',
  onMitad,
  onFin,
}) {
  const mitadRef = useRef(onMitad);
  const finRef = useRef(onFin);
  // Refs "última versión": se actualizan en un effect (no en render) para que
  // los timers llamen siempre al callback más fresco sin re-armarse.
  useEffect(() => {
    mitadRef.current = onMitad;
    finRef.current = onFin;
  });

  useEffect(() => {
    if (!activa) return undefined;
    let hechoMitad = false;
    let hechoFin = false;
    const tMitad = setTimeout(() => {
      if (!hechoMitad) {
        hechoMitad = true;
        mitadRef.current?.();
      }
    }, mitadTransicion(variante, /** @type {'alto'|'medio'|'bajo'} */ (tier), reducedMotion));
    const tFin = setTimeout(() => {
      if (!hechoFin) {
        hechoFin = true;
        finRef.current?.();
      }
    }, duracionTransicion(variante, /** @type {'alto'|'medio'|'bajo'} */ (tier), reducedMotion));
    return () => {
      hechoMitad = true;
      hechoFin = true;
      clearTimeout(tMitad);
      clearTimeout(tFin);
    };
  }, [activa, variante, direccion, tier, reducedMotion]);

  if (!activa) return null;

  // reduced-motion = corte simple: siempre la rama 'fade' + cubierta al instante.
  const v = reducedMotion ? 'fade' : VARIANTES.includes(variante) ? variante : 'fade';
  const total = duracionTransicion(v, /** @type {'alto'|'medio'|'bajo'} */ (tier), reducedMotion);
  const conAdornos = tier !== 'bajo' && !reducedMotion;

  return (
    <div
      className="tmk"
      data-variante={v}
      data-direccion={direccion === 'salir' ? 'salir' : 'entrar'}
      data-tier={tier}
      data-reducida={reducedMotion ? '1' : '0'}
      style={{ '--tmk-a': colorA, '--tmk-b': colorB, '--tmk-ms': `${total}ms` }}
      aria-hidden="true"
      data-testid="tmk"
    >
      {(v === 'fade' || v === 'zoom') && <div className="tmk__velo" />}

      {v === 'zoom' && conAdornos && (
        <>
          <div className="tmk__aro tmk__aro--1" />
          <div className="tmk__aro tmk__aro--2" />
          <div className="tmk__aro tmk__aro--3" />
        </>
      )}

      {v === 'iris' && <div className="tmk__iris" />}

      {v === 'wipe' && (
        <div className="tmk__wipe">
          {conAdornos && (
            <svg
              className="tmk__ola tmk__ola--frente"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d="M0,10 C8,3 16,8 26,5 C36,2 44,9 56,6 C66,3 74,8 86,4 C92,2 96,6 100,5 L100,10 Z" />
            </svg>
          )}
          <div className="tmk__wipe-cuerpo" />
          {conAdornos && (
            <svg
              className="tmk__ola tmk__ola--cola"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d="M0,10 C8,3 16,8 26,5 C36,2 44,9 56,6 C66,3 74,8 86,4 C92,2 96,6 100,5 L100,10 Z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

/* Variantes como componentes con nombre — azúcar para montar declarativo. */
export const TransicionWipe = (props) => <TransicionMundoKit {...props} variante="wipe" />;
export const TransicionIris = (props) => <TransicionMundoKit {...props} variante="iris" />;
export const TransicionZoom = (props) => <TransicionMundoKit {...props} variante="zoom" />;
export const TransicionFade = (props) => <TransicionMundoKit {...props} variante="fade" />;
