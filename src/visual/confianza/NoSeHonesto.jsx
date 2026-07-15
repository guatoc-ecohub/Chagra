import React from 'react';
import './confianza.css';
import TrazoConfianza from './TrazoConfianza.jsx';
import { INK } from './confianzaTokens.js';
import { PALETA, TIERRAS } from '../mundo3d/paleta/index.js';

/*
 * NoSeHonesto — EL "NO SÉ" DIGNO: honesto y útil, jamás un error.
 *
 * Chagra prefiere decir "no sé" antes que inventar un teléfono, una dosis o
 * un programa del gobierno que no existe. Este bloque viste esa honestidad
 * como lo que es — la marca de la casa:
 *
 *   - papel limpio, derecho, sin gris de error ni amarillo de warning;
 *   - la frase honesta, en la voz de siempre;
 *   - el hilo que se remata en nudo limpio (TrazoConfianza 'honesta'):
 *     sé hasta aquí, y lo digo bien dicho;
 *   - y los LETREROS DE CAMINO: postecitos de madera con su flecha, uno por
 *     cada lugar real a donde sí puede acudir (la UMATA, la alcaldía, el
 *     técnico). Se clavan derechos, uno tras otro — señalar el camino es
 *     un servicio, no una disculpa.
 *
 * Presentacional puro: el texto lo pone el host (idealmente el `chosen` del
 * modelo, que ya habla así: "No tengo ese número guardado y no se lo voy a
 * inventar. Lo más seguro es que llame a…").
 *
 * @param {object} props
 * @param {React.ReactNode} [props.children]  la frase honesta del modelo
 * @param {Array<{label: string, detalle?: string}>} [props.caminos]  a dónde ir
 * @param {boolean} [props.animated=true]
 * @param {string} [props.className]
 */
export default function NoSeHonesto({ children, caminos = [], animated = true, className = '' }) {
  const cls = className ? `cfz-nose ${className}` : 'cfz-nose';
  return (
    <aside
      className={cls}
      data-cfz-vivo={animated ? '1' : '0'}
      role="note"
      aria-label="Chagra no sabe esto y se lo dice de frente, con el camino para averiguarlo"
    >
      {children && <p className="cfz-nose-frase">{children}</p>}

      {/* El hilo se remata en nudo y sigue en caminito dorado hacia la señal. */}
      <TrazoConfianza nivel="honesta" animated={animated} decorativo />

      {caminos.length > 0 && (
        <ul className="cfz-nose-caminos">
          {caminos.map((c, i) => (
            <li key={c.label || i} className="cfz-nose-camino">
              <LetreroCamino />
              <span>
                <strong>{c.label}</strong>
                {c.detalle && (
                  <>
                    {' — '}
                    <span className="cfz-nose-detalle">{c.detalle}</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

/* El letrero de camino: poste de madera clavado en tierra + tabla con flecha.
   Macizo y derecho — quien señala bien, señala con confianza. */
function LetreroCamino() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" className="cfz-nose-letrero" aria-hidden="true">
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* el montoncito de tierra donde va clavado */}
        <path d="M4.5,17.5 C 6.5,15.8 11.5,15.8 13.5,17.5 Z" fill={TIERRAS.siembra} stroke={INK} strokeWidth="0.9" />
        {/* el poste */}
        <path d="M8.2,16.6 L8.4,5.4 L9.9,5.4 L10.1,16.6 Z" fill={PALETA.madera} stroke={INK} strokeWidth="0.9" />
        {/* la tabla-flecha, apuntando al camino */}
        <path
          d="M4,6.2 L14.6,5.6 L17.4,7.8 L14.9,10.2 L4.3,9.7 Z"
          fill={PALETA.maderaClara}
          stroke={INK}
          strokeWidth="1"
        />
        {/* la veta de la tabla, dos rayitas de tinta */}
        <path d="M6.2,7.4 L11.4,7.2 M6.3,8.4 L9.8,8.3" fill="none" stroke={INK} strokeWidth="0.6" opacity="0.55" />
      </g>
    </svg>
  );
}
