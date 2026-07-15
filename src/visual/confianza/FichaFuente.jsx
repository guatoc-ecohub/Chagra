import React, { useState } from 'react';
import './confianza.css';
import { TIPOS_FUENTE, INK } from './confianzaTokens.js';
import { VERDES, PALETA } from '../mundo3d/paleta/index.js';

/*
 * FichaFuente — LA CITA COMO OBJETO: una etiqueta de herbario que se toca.
 *
 * Cuando la respuesta viene de una fuente real (un DOI, Agrosavia, IDEAM,
 * el registro de la propia finca), la fuente no es una nota al pie gris:
 * es un ESPÉCIMEN etiquetado — la tarjetita de papel crema con su ojal y
 * su cordel, apenas torcida porque la pegó una mano. Al toque se despliega
 * el pliego: qué es la fuente en palabras llanas y, si tiene enlace, el
 * caminito para ir a verla. Trazable y seria, sin parecer un paper.
 *
 * Presentacional puro: recibe los datos ya resueltos, no consulta nada.
 * (El cómputo de procedencia vive en services/semaforoConfianza.js — esta
 * ficha es la ROPA para vestir cada item de ese panel, o cualquier cita.)
 *
 * @param {object} props
 * @param {string} props.titulo          lo citado ("Manejo de roya", "Su lote La Loma")
 * @param {string} [props.tipo='catalogo'] llave de TIPOS_FUENTE (doi|agrosavia|ideam|ica|catalogo|libro|finca|gente)
 * @param {string} [props.detalle]       qué dice / por qué respalda, en llano
 * @param {string} [props.url]           enlace a la fuente (CSP-safe, <a> nativo)
 * @param {boolean} [props.animated=true]
 * @param {string} [props.className]
 */
export default function FichaFuente({
  titulo,
  tipo = 'catalogo',
  detalle,
  url,
  animated = true,
  className,
}) {
  const [abierta, setAbierta] = useState(false);
  const t = TIPOS_FUENTE[tipo] || TIPOS_FUENTE.catalogo;
  const cls = className ? `cfz-ficha ${className}` : 'cfz-ficha';
  const hayPliego = Boolean(detalle || url);

  return (
    <div className={cls} data-tipo={tipo} data-cfz-vivo={animated ? '1' : '0'}>
      <button
        type="button"
        className="cfz-ficha-cara"
        aria-expanded={hayPliego ? abierta : undefined}
        aria-label={`Fuente: ${titulo} (${t.etiqueta})${hayPliego ? '. Toque para ver de dónde sale' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (hayPliego) setAbierta((v) => !v);
        }}
      >
        {/* El ojal con su cordel: lo que vuelve tarjeta de herbario a la cita. */}
        <svg viewBox="0 0 14 18" width="14" height="18" className="cfz-ficha-ojal" aria-hidden="true">
          <circle cx="7" cy="5" r="2.1" fill="none" stroke={INK} strokeWidth="1.1" />
          <path
            d="M6.2,6.9 C 4.6,9.4 4.2,12.2 5,15.4 M7.8,6.9 C 9.2,9.6 9.4,12.4 8.6,15.4"
            fill="none"
            stroke={PALETA.madera}
            strokeWidth="1"
            strokeLinecap="round"
          />
          {/* La hojita prensada del espécimen, asomada tras el cordel. */}
          <path
            d="M7,10.4 C 9.2,10.2 10.4,11.6 10.2,13.8 C 8,14 6.9,12.6 7,10.4 Z"
            fill={VERDES.paramoSage}
            stroke={INK}
            strokeWidth="0.7"
            opacity="0.85"
          />
        </svg>
        <span className="cfz-ficha-titulo">{titulo}</span>
        <span className="cfz-ficha-tipo">{t.etiqueta}</span>
      </button>

      {hayPliego && abierta && (
        <div className="cfz-ficha-pliego">
          <div>
            {detalle && <p className="cfz-ficha-detalle">{detalle}</p>}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="cfz-ficha-enlace"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Flechita de mano, no ícono de librería. */}
                Ir a ver la fuente
                <svg viewBox="0 0 12 10" width="12" height="10" aria-hidden="true">
                  <path
                    d="M1,5 C 4,4.4 7,5.4 9,5 M9.4,5 L6.8,2.6 M9.4,5 L6.8,7.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
