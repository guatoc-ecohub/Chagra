/*
 * i18n (ADR-050): copy del home en español Colombia, pendiente de migrar a
 * src/config/messages.js — mismo criterio que MundosDeMiFinca / DashboardLive.
 */
 
/**
 * RelojFrailejon — el RELOJ DEL FRAILEJÓN del pie del árbol de mundos
 * (pieza del mockup aprobado #/mockups/avatar-biopunk, dirección ganadora):
 * una línea de tiempo de la finca donde CADA ANILLO ES UN AÑO — el frailejón
 * crece un anillo al año.
 *
 * GROUNDED (fincaClockService): los años salen de los REGISTROS REALES de la
 * finca en Chagra (primer FarmProcess / primera planta registrada). Si la
 * finca es nueva, muestra el año actual como primer anillo. NUNCA inventa
 * historia.
 *
 * No es decoración huérfana: tocarlo abre "El año de la finca" (`ano_finca`),
 * la línea de tiempo real del año del usuario (vista existente de App.jsx).
 *
 * Accesibilidad: botón real (Enter/Espacio), target grande, texto alterno
 * completo; animaciones en CSS con prefers-reduced-motion (arbol-de-mundos.css).
 *
 * @param {Object} props
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
import { useEffect, useState } from 'react';
import { getAniosFinca } from '../../services/fincaClockService';

/** Radio del anillo i (0 = el primer año, el de adentro). */
const R_BASE = 9;
const R_PASO = 6.5;
/** Tope visual: más de 12 anillos se comprimen (paso más corto). */
const MAX_ANILLOS_COMODOS = 12;

export default function RelojFrailejon({ onNavigate }) {
  // undefined = leyendo los registros · null = sin datos (no se dibuja nada
  // inventado) · objeto = los años reales de la finca.
  const [reloj, setReloj] = useState(undefined);

  useEffect(() => {
    let alive = true;
    getAniosFinca()
      .then((r) => { if (alive) setReloj(r || null); })
      .catch(() => { if (alive) setReloj(null); /* honesto: nada inventado */ });
    return () => { alive = false; };
  }, []);

  // Sin datos reales el reloj no existe: mejor ausencia que historia inventada.
  if (reloj === null) return null;

  // LEYENDO: el frailejón germina mientras llegan los registros reales — un
  // esqueleto vivo (semilla que late + anillos punteados girando), no un hueco.
  if (reloj === undefined) {
    return (
      <div
        className="adm-reloj adm-reloj-espera"
        data-testid="reloj-frailejon-cargando"
        role="status"
        aria-label="Leyendo los anillos de su finca en los registros"
      >
        <svg className="adm-reloj-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <circle cx="60" cy="60" r="44" fill="#2dffc4" opacity="0.05" />
          <circle
            className="adm-reloj-espera-anillo"
            cx="60" cy="60" r="20" fill="none"
            stroke="#57a453" strokeWidth="1.5" strokeDasharray="4 8"
            strokeLinecap="round" opacity="0.55"
          />
          <circle
            className="adm-reloj-espera-anillo adm-reloj-espera-r2"
            cx="60" cy="60" r="33" fill="none"
            stroke="#9dff3f" strokeWidth="1.2" strokeDasharray="3 10"
            strokeLinecap="round" opacity="0.3"
          />
          <circle className="adm-reloj-corazon" cx="60" cy="60" r="4" fill="#ffb54f" />
          <circle cx="60" cy="60" r="1.6" fill="#fff3c9" />
        </svg>
        <span className="adm-reloj-texto">
          <span className="adm-reloj-cab">EL RELOJ DEL FRAILEJÓN</span>
          <strong className="adm-reloj-anios">Contando sus anillos…</strong>
          <span className="adm-reloj-nota">
            Leyendo los años reales de su finca en los registros.
          </span>
        </span>
      </div>
    );
  }

  const { anios, primerAnio, anioActual, fincaNueva } = reloj;
  const n = anios.length;
  const paso = n > MAX_ANILLOS_COMODOS ? (R_PASO * MAX_ANILLOS_COMODOS) / n : R_PASO;
  const rMax = R_BASE + (n - 1) * paso;
  const etiquetarCada = n <= 6 ? 1 : n <= 12 ? 2 : Math.ceil(n / 5);

  const abrir = () => onNavigate?.('ano_finca');

  const resumen = fincaNueva
    ? `${anioActual}: su primer anillo. El frailejón de su finca apenas brota.`
    : n === 1
      ? `Un anillo: su finca vive en Chagra desde este año ${anioActual}.`
      : `${n} anillos: su finca vive en Chagra desde ${primerAnio}.`;

  return (
    <button
      type="button"
      className="adm-reloj"
      data-testid="reloj-frailejon"
      onClick={abrir}
      aria-label={`Reloj del frailejón — un anillo por año. ${resumen} Toque para ver la línea de tiempo de su finca.`}
    >
      <svg
        className="adm-reloj-svg"
        viewBox="0 0 120 120"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="admr-nucleo" cx="0.5" cy="0.42" r="0.7">
            <stop offset="0" stopColor="#ffd76a" />
            <stop offset="0.6" stopColor="#ffb54f" />
            <stop offset="1" stopColor="#ffb54f" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* halo de vida */}
        <circle cx="60" cy="60" r={Math.min(rMax + 10, 56)} fill="#2dffc4" opacity="0.06" />
        {/* un anillo por año — el de adentro es el primer año */}
        {anios.map((anio, i) => {
          const r = R_BASE + i * paso;
          const esActual = anio === anioActual;
          return (
            <g key={anio}>
              <circle
                className={`adm-reloj-anillo${esActual ? ' adm-reloj-anillo-actual' : ''}`}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={esActual ? '#2dffc4' : i % 2 ? '#9dff3f' : '#57a453'}
                strokeWidth={esActual ? 2 : 1.5}
                opacity={esActual ? 0.95 : Math.max(0.35, 0.85 - i * 0.05)}
                style={{ animationDelay: `${i * 0.18}s` }}
              />
              {/* marcador del año: una yema en lo alto del anillo */}
              {(i % etiquetarCada === 0 || esActual) && (
                <g style={{ animationDelay: `${i * 0.18}s` }} className="adm-reloj-marca">
                  <circle cx="60" cy={60 - r} r={esActual ? 2 : 1.4} fill={esActual ? '#eafff6' : '#d8ff6a'} />
                  <text
                    x={i % 2 ? 60 + r + 3 : 60 - r - 3}
                    y="62.2"
                    textAnchor={i % 2 ? 'start' : 'end'}
                    fontFamily="ui-monospace,monospace"
                    fontSize="6"
                    letterSpacing="0.5"
                    fill={esActual ? '#eafff6' : '#bfffe9'}
                    opacity={esActual ? 1 : 0.75}
                  >
                    {anio}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* el corazón del frailejón */}
        <circle className="adm-reloj-corazon" cx="60" cy="60" r="4" fill="url(#admr-nucleo)" />
        <circle cx="60" cy="60" r="1.6" fill="#fff3c9" />
      </svg>

      <span className="adm-reloj-texto">
        <span className="adm-reloj-cab">EL RELOJ DEL FRAILEJÓN</span>
        <strong className="adm-reloj-anios" data-testid="reloj-frailejon-anios">
          {n === 1 ? 'Su primer anillo' : `${n} anillos`} · un anillo por año
        </strong>
        <span className="adm-reloj-nota">{resumen}</span>
        <span className="adm-reloj-ir" aria-hidden="true">Ver el año de su finca →</span>
      </span>
    </button>
  );
}
