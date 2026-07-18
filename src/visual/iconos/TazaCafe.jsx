import { useId } from 'react';
import './iconos.css';

/*
 * TazaCafe — el ICONO propio del café de la casa: el POCILLO campesino de
 * peltre (blanco encalado con su borde de teja), lleno de tinto, sobre su
 * plato, con el vapor subiendo en volutas rubber-hose. Reemplaza al emoji ☕
 * en POIs/marcadores con una pieza coherente con la paleta madre del valle
 * (encalado #f3ecdc, teja #b0603f, tinta #2a1a0c, candela #ffd28a).
 *
 * Autocontenido: SVG puro, cero imágenes. El vapor anima por CSS (iconos.css)
 * y respeta `prefers-reduced-motion`; `animated={false}` lo deja quieto a
 * media tinta (presencia sin parpadeo).
 *
 * API (la misma familia que los bichos): size, className, title, animated.
 * `title` con texto → role img + accesible; title vacío → decorativo (aria-hidden).
 */

const INK = '#2a1a0c'; // la tinta rubber-hose de la casa
const PELTRE = '#f7f1e1'; // el blanco del pocillo de peltre
const PELTRE_SOMBRA = '#ded2b8'; // su cara en sombra
const TEJA = '#b0603f'; // el borde esmaltado (la teja del valle)
const TINTO = '#3d2314'; // el café servido
const TINTO_BRILLO = '#6b4226'; // el reflejo sobre el tinto
const VAPOR = '#efe6cf'; // el humo crema del recién colado

export default function TazaCafe({
  size = 24,
  className = '',
  title = 'Café',
  animated = true,
  ...rest
}) {
  const uid = useId();
  const titleId = `taza-t-${uid}`;
  const decorativa = !title;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`icono-taza${animated ? '' : ' icono-taza--quieta'}${className ? ` ${className}` : ''}`}
      role={decorativa ? undefined : 'img'}
      aria-hidden={decorativa || undefined}
      aria-labelledby={decorativa ? undefined : titleId}
      {...rest}
    >
      {!decorativa && <title id={titleId}>{title}</title>}

      {/* EL VAPOR: tres volutas de goma subiendo del tinto, en fases. */}
      <g
        fill="none"
        stroke={VAPOR}
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path className="icono-taza__vapor" d="M17.5,14.5 C16,12 18.5,10.5 17.2,7.8" />
        <path className="icono-taza__vapor icono-taza__vapor--2" d="M24,13.5 C22.2,10.6 25.6,9 24,5.4" />
        <path className="icono-taza__vapor icono-taza__vapor--3" d="M30.3,14.5 C29,12 31.4,10.5 30.2,8" />
      </g>

      {/* EL PLATO: el platico de peltre debajo, con su tinta. */}
      <ellipse cx="23.5" cy="39.4" rx="14.6" ry="4.1" fill={PELTRE_SOMBRA} stroke={INK} strokeWidth="1.7" />
      <ellipse cx="23.5" cy="38.4" rx="14.6" ry="4.1" fill={PELTRE} stroke={INK} strokeWidth="1.7" />

      {/* EL ASA: la oreja de goma del pocillo. */}
      <path
        d="M33.8,22.5 C39.6,21.2 41.6,26 38.6,29.4 C36.8,31.4 34.6,32 33,32"
        fill="none"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M33.8,22.5 C39.6,21.2 41.6,26 38.6,29.4 C36.8,31.4 34.6,32 33,32"
        fill="none"
        stroke={PELTRE}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* EL POCILLO: cuerpo de peltre con squash leve (más ancho arriba). */}
      <path
        d="M11.2,19.5 L36,19.5 C36,27.5 34.3,33.6 30.6,36.6 C28.6,38.2 18.6,38.2 16.6,36.6 C12.9,33.6 11.2,27.5 11.2,19.5 Z"
        fill={PELTRE}
        stroke={INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* la cara en sombra del pocillo */}
      <path
        d="M29.5,20 C29.5,28.5 28.2,33.8 25.4,37.6 C27.4,37.5 29.7,37.2 30.6,36.6 C34.3,33.6 36,27.5 36,19.5 Z"
        fill={PELTRE_SOMBRA}
        opacity="0.75"
      />

      {/* EL BORDE de teja esmaltada (la firma del pocillo campesino). */}
      <path
        d="M10.6,19.5 C10.6,17.4 16.5,15.7 23.6,15.7 C30.7,15.7 36.6,17.4 36.6,19.5 C36.6,21.6 30.7,23.3 23.6,23.3 C16.5,23.3 10.6,21.6 10.6,19.5 Z"
        fill={TEJA}
        stroke={INK}
        strokeWidth="1.8"
      />

      {/* EL TINTO servido, con su brillo de recién colado. */}
      <ellipse cx="23.6" cy="19.5" rx="10.6" ry="2.9" fill={TINTO} />
      <path
        d="M16.5,19.1 C18.2,18.2 21.4,17.8 24.4,18.1"
        fill="none"
        stroke={TINTO_BRILLO}
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* el brillo del peltre (la lucecita de la loza) */}
      <path
        d="M14.6,24.5 C14.9,28.6 15.8,31.6 17.3,33.8"
        fill="none"
        stroke="#fffdf4"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
