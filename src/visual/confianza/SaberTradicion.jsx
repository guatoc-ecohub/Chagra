import React, { useId } from 'react';
import './confianza.css';
import { INK } from './confianzaTokens.js';
import { ACENTOS } from '../mundo3d/paleta/index.js';

/*
 * SaberTradicion — EL SABER DE LA GENTE, envuelto en su guarda tejida.
 *
 * Chagra respeta el saber campesino. Cuando algo es tradición sin respaldo
 * científico, no se pinta ni de verde (verdad) ni de ámbar (ojo) ni de gris
 * (duda): se envuelve en TEXTIL — la guarda de rombos de maíz sobre índigo,
 * el marco que las manos de la casa le tejen a lo que la gente sabe. Ni
 * verdad ni mentira: otra cosa, con su propia dignidad.
 *
 * La nota al pie lo dice sin descalificar: "mucha gente lo usa; la ciencia
 * aún no lo tiene bien estudiado". Eso es todo — el que decide es usted.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children  el saber, contado como se cuenta
 * @param {string} [props.nota]  la aclaración respetuosa (tiene default digno)
 * @param {string} [props.voz='Saber de la gente']  el rotulito de la envoltura
 * @param {string} [props.className]
 */
export default function SaberTradicion({
  children,
  nota = 'Mucha gente lo usa; la ciencia aún no lo tiene bien estudiado.',
  voz = 'Saber de la gente',
  className = '',
}) {
  const cls = className ? `cfz-tradicion ${className}` : 'cfz-tradicion';
  return (
    <section className={cls} aria-label={`${voz}: tradición campesina, contada con respeto`}>
      <GuardaTejida />
      <div className="cfz-tradicion-cuerpo">
        <span className="cfz-tradicion-voz">{voz}</span>
        {children}
        {nota && <p className="cfz-tradicion-nota">{nota}</p>}
      </div>
      <GuardaTejida invertida />
    </section>
  );
}

/* La guarda: banda índigo con la fila de rombos de maíz y sus puntitos de
   cochinilla — el patrón de las fajas andinas, tejido en SVG con <pattern>
   (se repite solo, a cualquier ancho, sin estirarse). */
function GuardaTejida({ invertida = false }) {
  const uid = useId();
  const pid = `cfz-guarda-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      className="cfz-tradicion-guarda"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={invertida ? { transform: 'scaleY(-1)' } : undefined}
    >
      <defs>
        <pattern id={pid} width="22" height="11" patternUnits="userSpaceOnUse">
          <rect width="22" height="11" fill={ACENTOS.indigo} />
          {/* el rombo de maíz, con su tinta */}
          <path d="M11,1.6 L17,5.5 L11,9.4 L5,5.5 Z" fill={ACENTOS.maizTextil} stroke={INK} strokeWidth="0.7" />
          {/* el punto de cochinilla en el corazón del rombo */}
          <circle cx="11" cy="5.5" r="0.9" fill={ACENTOS.cochinilla} />
          {/* los medios rombos de las orillas, para que el tejido no tenga costura */}
          <path d="M0,1.6 L6,5.5 L0,9.4 L-6,5.5 Z" fill={ACENTOS.maizTextil} stroke={INK} strokeWidth="0.7" />
          <path d="M22,1.6 L28,5.5 L22,9.4 L16,5.5 Z" fill={ACENTOS.maizTextil} stroke={INK} strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
      {/* el orillo: la línea de tinta que remata la banda contra el papel */}
      <rect x="0" y="0" width="100%" height="1" fill={INK} opacity="0.5" />
    </svg>
  );
}
