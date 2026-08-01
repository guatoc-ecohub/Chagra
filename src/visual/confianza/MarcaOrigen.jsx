import React from 'react';
import './confianza.css';
import { ORIGENES_SABER, origenDelSaber, INK } from './confianzaTokens.js';
import { VERDES, TIERRAS, ACENTOS, PALETA } from '../mundo3d/paleta/index.js';

/*
 * MarcaOrigen — DE DÓNDE SALE lo que Chagra dice, de un vistazo.
 *
 * La diferencia entre "esto sale de SU finca" y "esto es saber general" es
 * enorme, y hoy no se ve. Esta marca la vuelve visible sin explicar nada:
 *
 *   finca     → un brote con la RAÍZ HONDA que se sale del aro hacia abajo:
 *               agarrado a su tierra, a su altura, a su registro.
 *   fuente    → la etiqueta de herbario con su ojal y su cordel: espécimen
 *               citado, se puede ir a ver.
 *   general   → el horizonte lejano de la sierra: saber del mundo, útil,
 *               pero no aterrizado en su lote.
 *   tradicion → el rombo tejido (maíz sobre índigo): saber de la gente —
 *               ni verdad ni mentira: otra cosa, con su propio respeto.
 *
 * Rubber-hose de la casa: tinta cálida INK, formas macizas, cero iconito
 * de librería. El color NUNCA va solo: cada origen tiene FORMA propia.
 *
 * @param {object} props
 * @param {string}  [props.origen='general']  id o alias (ver origenDelSaber)
 * @param {boolean} [props.soloMarca=false]   true = sin texto (el aria queda)
 * @param {boolean} [props.animated=true]
 * @param {string}  [props.className]
 */
export default function MarcaOrigen({
  origen = 'general',
  soloMarca = false,
  animated = true,
  className = '',
}) {
  const id = origenDelSaber(origen) || 'general';
  const o = ORIGENES_SABER[id];
  const cls = className ? `cfz-origen ${className}` : 'cfz-origen';

  return (
    <span
      className={cls}
      data-origen={id}
      data-cfz-vivo={animated ? '1' : '0'}
      role="img"
      aria-label={o.aria}
      title={o.aria}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" className="cfz-origen-marca" aria-hidden="true">
        {id === 'finca' && (
          <g>
            {/* La tierra de SU lote… */}
            <path d="M2,10.5 H14" stroke={TIERRAS.siembra} strokeWidth="2" strokeLinecap="round" />
            {/* …el brote encima… */}
            <g stroke={INK} strokeWidth="0.9" strokeLinecap="round">
              <path d="M8,10.3 V6.2" fill="none" />
              <path d="M8,7.6 C 6,7.4 4.9,5.9 5.1,3.9 C 7.1,4.1 8.2,5.6 8,7.6 Z" fill={VERDES.brote} />
              <path d="M8,6.6 C 9.8,6.4 10.8,5.1 10.6,3.3 C 8.8,3.5 7.9,4.8 8,6.6 Z" fill={VERDES.trabajo} />
            </g>
            {/* …y la raíz HONDA: baja por fuera de la marca. Eso es grounding. */}
            <path
              className="cfz-raiz"
              d="M8,11 C 7.4,12.2 8.6,12.8 8,14 C 7.6,14.9 8.2,15.4 8,15.8 M8,12 C 6.9,12.6 6.6,13.6 6.9,14.4 M8,12.4 C 9.1,13 9.3,13.8 9.1,14.6"
              fill="none"
              stroke={TIERRAS.cacao}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        )}

        {id === 'fuente' && (
          <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
            {/* La etiqueta de herbario: tarjetita con ojal y cordel. */}
            <path d="M4.6,3.4 L12.6,2.6 L13.2,11.4 L5.2,12.2 Z" fill="#fffaf0" />
            <circle cx="6.6" cy="4.8" r="0.9" fill="none" />
            <path d="M6.1,5.5 C 4.6,7 3.4,9.4 3.2,11.8" fill="none" strokeWidth="0.8" />
            {/* Los renglones de la cita, en madera de sello. */}
            <g stroke={PALETA.madera} strokeWidth="1" strokeLinecap="round">
              <path d="M7.6,6 L11.4,5.7" />
              <path d="M7.8,8 L11.6,7.7" />
              <path d="M8,10 L10.4,9.8" />
            </g>
          </g>
        )}

        {id === 'general' && (
          <g strokeLinejoin="round" strokeLinecap="round">
            {/* El horizonte: dos cerros lejanos y el sol bajo de la casa. */}
            <circle cx="11.6" cy="5.4" r="1.8" fill={ACENTOS.guayacan} stroke={INK} strokeWidth="0.8" />
            <path d="M1.5,12.5 C 3.5,8.2 5.5,8.2 7.5,11 L9,12.5 Z" fill={VERDES.altoAndino} stroke={INK} strokeWidth="0.9" />
            <path d="M6.5,12.5 C 8.8,7 11.4,7 14.5,12.5 Z" fill={VERDES.frio} stroke={INK} strokeWidth="0.9" />
            <path d="M1.5,12.5 H14.5" stroke={INK} strokeWidth="0.9" />
          </g>
        )}

        {id === 'tradicion' && (
          <g strokeLinejoin="round">
            {/* El rombo de la guarda: maíz sobre índigo, tejido a mano. */}
            <path d="M8,1.6 L14.4,8 L8,14.4 L1.6,8 Z" fill={ACENTOS.indigo} stroke={INK} strokeWidth="0.9" />
            <path d="M8,4.6 L11.4,8 L8,11.4 L4.6,8 Z" fill={ACENTOS.maizTextil} stroke={INK} strokeWidth="0.8" />
            <circle cx="8" cy="8" r="1.1" fill={ACENTOS.cochinilla} />
          </g>
        )}
      </svg>
      {!soloMarca && <span aria-hidden="true">{o.etiqueta}</span>}
    </span>
  );
}
