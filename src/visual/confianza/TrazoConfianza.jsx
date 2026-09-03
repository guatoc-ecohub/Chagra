import React from 'react';
import './confianza.css';
import { NIVELES_CONFIANZA, nivelDelHilo } from './confianzaTokens.js';

/*
 * TrazoConfianza — LA PUNTADA: el hilo que cose una respuesta a su saber.
 *
 * Un subrayado cosido a mano que se lee de un vistazo, sin texto ni cifras:
 *
 *   alta    → costura firme, continua, con remates metidos en la tela.
 *   media   → hilván: puntadas largas y parejas que avanzan despacio.
 *   baja    → hilo suelto: puntadas desiguales que titilan, y en la punta
 *             una hebra que se sale de la tela y se riza.
 *   honesta → la costura llega hasta donde sabe, se REMATA en un nudo limpio
 *             (la honestidad no es hilo roto: es un remate bien hecho) y de
 *             ahí sigue un caminito punteado dorado con flecha: "por aquí,
 *             pregunte allá".
 *
 * Mismo idioma que el halo de Angelita (continuo / punteado / entrecortado):
 * quien vio a la abeja dudar reconoce este hilo sin que nadie le explique.
 *
 * Tier-safe: un solo SVG, trazos con vector-effect (estirable a lo ancho sin
 * engordar la línea), animaciones CSS de opacity/dashoffset con gate de
 * prefers-reduced-motion. Cero deps.
 *
 * @param {object} props
 * @param {number|string} [props.nivel='media']  score 0..1 o etiqueta (ver nivelDelHilo)
 * @param {boolean} [props.animated=true]  false = fotograma digno, quieto
 * @param {boolean} [props.decorativo=false]  true = aria-hidden (cuando el texto vecino ya lo dice)
 * @param {string}  [props.className]
 */
export default function TrazoConfianza({
  nivel = 'media',
  animated = true,
  decorativo = false,
  className = '',
}) {
  const id = nivelDelHilo(nivel) || 'media';
  const t = NIVELES_CONFIANZA[id];
  const vivo = animated ? '1' : '0';
  const cls = className ? `cfz-trazo ${className}` : 'cfz-trazo';

  /* La línea base ondula apenas: mano, no regla. Misma curva en los cuatro
     niveles para que la DIFERENCIA sea la puntada, no el camino. */
  const CAMINO = 'M3,7 C 32,6.2 58,7.9 88,6.9 S 138,7.4 157,7';
  const CAMINO_CORTO = 'M3,7 C 26,6.2 52,7.9 74,7 S 90,7.2 94,7.1'; // hasta el nudo

  const a11y = decorativo
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': t.aria };

  return (
    <svg
      viewBox="0 0 160 14"
      preserveAspectRatio="none"
      className={cls}
      data-puntada={t.puntada}
      data-cfz-vivo={vivo}
      {...a11y}
    >
      {id === 'alta' && (
        <g className="cfz-hilo-firme" stroke={t.color} fill="none" strokeLinecap="round">
          <path d={CAMINO} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {/* Remates: el hilo entra a la tela en las puntas — costura de verdad. */}
          <path d="M3,7 L5.5,3.8" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          <path d="M157,7 L154.5,3.8" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </g>
      )}

      {id === 'media' && (
        <path
          className="cfz-hilo-hilvan"
          d={CAMINO}
          fill="none"
          stroke={t.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="9 6"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {id === 'baja' && (
        <g stroke={t.color} fill="none" strokeLinecap="round">
          {/* Puntadas DESIGUALES: la mano insegura no cose parejo. */}
          <path
            className="cfz-hilo-suelto"
            d={CAMINO}
            strokeWidth="2"
            strokeDasharray="3 8 9 6 2 10 5 7"
            vectorEffect="non-scaling-stroke"
          />
          {/* La hebra que se salió de la tela y se riza, vacilando. */}
          <path
            className="cfz-hebra"
            d="M146,7 C 152,6.5 154,9.5 150.5,11.5 C 148,12.8 146.8,10.8 148.6,10"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}

      {id === 'honesta' && (
        <g fill="none" strokeLinecap="round">
          {/* Cose firme HASTA DONDE SABE… */}
          <path
            d={CAMINO_CORTO}
            stroke={t.color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* …y remata en nudo limpio: sé que no sé, y lo digo bien dicho. */}
          <g className="cfz-nudo" stroke={t.color}>
            <path
              d="M94,7.1 C 96.5,3.4 102.5,3.4 102.5,7 C 102.5,10.6 96.8,10.4 97.6,7.4"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="99.6" cy="7" r="1.5" fill={t.color} stroke="none" />
          </g>
          {/* El caminito dorado: "no me lo invento — pregunte por aquí". */}
          <g className="cfz-camino-dorado" stroke={t.colorSuave}>
            <path
              d="M108,7 C 120,6.4 134,7.5 145,7"
              strokeWidth="2"
              strokeDasharray="0.5 6.5"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M147,7 L152,7 M149.4,4.6 L152.6,7 L149.4,9.4" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
          </g>
        </g>
      )}
    </svg>
  );
}
