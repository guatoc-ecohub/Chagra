import React from 'react';
import './confianza.css';
import { PESO_ADVERTENCIA, INK, HUESO } from './confianzaTokens.js';

/*
 * AdvertenciaPeso — CUANDO HAY RIESGO REAL, LA SEÑAL PESA.
 *
 * Un veneno mal dosificado, una zoonosis, agua contaminada, botulismo en una
 * conserva: eso no se avisa con un iconito ni con un banner que parpadea.
 * Se avisa con PESO:
 *
 *   - la línea de tinta más gruesa de todo el lenguaje (3px);
 *   - la banda cochinilla — el rojo textil de la casa, que casi nunca se
 *     usa, puesto en serio por una vez;
 *   - la mano abierta rubber-hose que dice "pare ahí" — el guante de la
 *     familia, no un octágono de tránsito;
 *   - y una sombra-repisa sólida debajo: la advertencia está ASENTADA como
 *     una piedra. Entra acomodándose de un solo golpe sordo y se queda
 *     quieta — el peso no necesita moverse para sentirse.
 *
 * role="alert": el lector de pantalla la anuncia de una, porque para eso es.
 *
 * @param {object} props
 * @param {string} [props.titulo='Ojo, esto es serio']
 * @param {React.ReactNode} props.children  el porqué y el qué hacer, en llano
 * @param {boolean} [props.animated=true]
 * @param {string} [props.className]
 */
export default function AdvertenciaPeso({
  titulo = 'Ojo, esto es serio',
  children,
  animated = true,
  className,
}) {
  const cls = className ? `cfz-peso ${className}` : 'cfz-peso';
  return (
    <section
      className={cls}
      data-cfz-vivo={animated ? '1' : '0'}
      role="alert"
      aria-label={PESO_ADVERTENCIA.aria}
    >
      <div className="cfz-peso-marca">
        <ManoPare />
      </div>
      <div className="cfz-peso-cuerpo">
        <strong className="cfz-peso-titulo">{titulo}</strong>
        {children}
      </div>
    </section>
  );
}

/* La mano abierta que dice "pare ahí": el guante rubber-hose de la casa
   (palma maciza, cuatro dedos de goma, puño con doblez), en hueso sobre la
   banda cochinilla. Firme y quieta: una mano que pesa, no que saluda. */
function ManoPare() {
  return (
    <svg viewBox="0 0 26 30" width="30" height="34" aria-hidden="true">
      <g stroke={INK} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        {/* la palma y los cuatro dedos, de una sola pieza de goma */}
        <path
          d={[
            'M6.5,16.5',
            'C 6,11.5 6.2,7.5 7.6,7.3 C 8.9,7.1 9.4,10.5 9.6,13',
            'C 9.5,8.5 9.8,4.8 11.3,4.7 C 12.8,4.6 13.2,8.6 13.2,12.6',
            'C 13.4,8.2 13.9,4.1 15.4,4.2 C 16.9,4.3 17,8.8 16.8,13',
            'C 17.2,9.4 17.9,6.3 19.2,6.6 C 20.6,6.9 20.4,10.9 20,14.5',
            'C 19.8,19 18.8,22.5 15.5,23.5 L 10.5,23.5 C 8.2,22.3 6.9,19.8 6.5,16.5 Z',
          ].join(' ')}
          fill={HUESO}
        />
        {/* el pulgar recogido sobre la palma */}
        <path d="M6.6,17 C 4.8,15.6 3.9,13.9 4.6,12.9 C 5.3,11.9 7,12.8 8.4,14.4" fill={HUESO} />
        {/* el puño de la manga, con su doblez */}
        <path d="M9.8,23.5 L16.2,23.5 L15.9,27 L10.1,27 Z" fill={HUESO} />
        <path d="M9.9,25.1 L16.05,25.1" fill="none" strokeWidth="0.9" />
        {/* la línea de la palma: un solo trazo de tinta, como en el guante */}
        <path d="M9.2,17.5 C 11.5,19.3 15,19.3 17.4,17.2" fill="none" strokeWidth="0.9" />
      </g>
    </svg>
  );
}
