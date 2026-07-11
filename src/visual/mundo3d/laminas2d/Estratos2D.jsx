/*
 * Estratos2D — GEMELO 2D del arquetipo 3D `estratos` (la verticalidad del bosque
 * comestible).
 *
 * Los 7 estratos comestibles son verticales POR DEFINICIÓN, y una lista plana los
 * mata. Aquí es un CORTE vertical: siete franjas de arriba (emergente) abajo
 * (raíz), cada una con la SILUETA de su cultivo y su nombre. La luz baja con la
 * altura (grade): más dorada arriba, más fresca al ras del suelo. Se dibuja al
 * entrar (`vfx-draw`). Reusa `params.estratos` (mismos colores que el diorama 3D).
 *
 * Se activa cuando: el equipo no aguanta 3D o el mundo se pide en 2D. Lo elige
 * `resolverMundo` vía `estratos.espejo`.
 */
import { useId } from 'react';
import { ESTRATOS, TINTA, PAPEL, acentoDe } from '../../palette/chagra.js';
import HotspotsGemelo from './HotspotsGemelo.jsx';
import './gemelos2d.css';

const Y0 = 10;
const Y1 = 210;
const SIL = '#22331f'; // tinta de las siluetas (alto contraste sobre las franjas)

/* Silueta del cultivo típico de cada estrato, centrada en (cx, base). */
function Silueta({ forma, cx, base }) {
  switch (forma) {
    case 'arbol':
      return (
        <g fill={SIL}>
          <rect x={cx - 2} y={base - 14} width="4" height="14" />
          <path d={`M${cx},${base - 30} L${cx + 13},${base - 12} L${cx - 13},${base - 12} Z`} />
          <path d={`M${cx},${base - 22} L${cx + 10},${base - 8} L${cx - 10},${base - 8} Z`} />
        </g>
      );
    case 'arbolito':
      return (
        <g fill={SIL}>
          <rect x={cx - 1.6} y={base - 10} width="3.2" height="10" />
          <ellipse cx={cx} cy={base - 14} rx="11" ry="9" />
        </g>
      );
    case 'arbusto':
      return (
        <g fill={SIL}>
          <ellipse cx={cx - 6} cy={base - 6} rx="7" ry="7" />
          <ellipse cx={cx + 6} cy={base - 6} rx="7" ry="7" />
          <ellipse cx={cx} cy={base - 11} rx="8" ry="8" />
        </g>
      );
    case 'mata':
      return (
        <g fill="none" stroke={SIL} strokeWidth="2.4" strokeLinecap="round">
          <path d={`M${cx},${base} L${cx - 7},${base - 14}`} />
          <path d={`M${cx},${base} L${cx},${base - 16}`} />
          <path d={`M${cx},${base} L${cx + 7},${base - 14}`} />
        </g>
      );
    case 'rastrera':
      return (
        <g fill="none" stroke={SIL} strokeWidth="2.4" strokeLinecap="round">
          <path d={`M${cx - 16},${base - 3} q8,-9 16,0 q8,9 16,0`} />
          <circle cx={cx - 12} cy={base - 5} r="2.4" fill={SIL} />
          <circle cx={cx + 4} cy={base - 5} r="2.4" fill={SIL} />
        </g>
      );
    case 'raiz':
    default:
      return (
        <g fill="none" stroke={SIL} strokeWidth="2.2" strokeLinecap="round">
          <path d={`M${cx},${base - 12} L${cx},${base + 4}`} />
          <path d={`M${cx},${base - 4} l-9,10`} />
          <path d={`M${cx},${base - 2} l9,9`} />
          <path d={`M${cx},${base + 2} l-5,7`} />
        </g>
      );
  }
}

export default function Estratos2D({
  params, hotspots = [], tinte, onHotspot, titulo,
}) {
  const acento = acentoDe(tinte);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = `gem-grade-${uid}`;
  const estratos = (params?.estratos?.length ? params.estratos : ESTRATOS.def);
  const n = estratos.length;
  const bandH = (Y1 - Y0) / n;

  return (
    <div className="mundo2d gemelo2d" style={{ '--m2d-tinte': acento }}>
      <div className="mundo2d__lienzo">
        <svg viewBox="0 0 320 220" className="mundo2d__svg gemelo2d__svg" role="img"
          aria-label={titulo ? `${titulo}: corte de los siete estratos del bosque` : 'Corte vertical de los siete estratos comestibles, del emergente a la raíz'}>
          <defs>
            {/* grade por altura: más luz (dorada) arriba, más fresca abajo */}
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff0c8" stopOpacity="0.34" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#2a4a58" stopOpacity="0.24" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="320" height="220" fill={ESTRATOS.cielo} />

          {/* las siete franjas, cada una con su color del diorama 3D */}
          {estratos.map((e, i) => {
            const top = Y0 + i * bandH;
            const esRaiz = (e.forma || (i === n - 1 ? 'raiz' : 'mata')) === 'raiz';
            return (
              <g key={i}>
                <rect x="0" y={top} width="320" height={bandH}
                  fill={esRaiz ? ESTRATOS.suelo : e.color} opacity={esRaiz ? 1 : 0.92} />
                {/* repetición de la silueta a lo ancho para leer "estrato", no "planta" */}
                {[210, 250, 288].map((cx, k) => (
                  <Silueta key={k} forma={e.forma || (esRaiz ? 'raiz' : 'mata')} cx={cx} base={top + bandH - 4} />
                ))}
              </g>
            );
          })}

          {/* línea del suelo (separa lo aéreo de la raíz), se dibuja al entrar
              con vfx-draw + pathLength (auto-dibujado §13.11 de effects.css) */}
          <line className="vfx-draw vfx-t1" pathLength={1}
            x1="0" y1={Y0 + (n - 1) * bandH} x2="320" y2={Y0 + (n - 1) * bandH}
            stroke={TINTA} strokeWidth="2" />

          {/* grade de luz por altura (encima de las franjas, bajo las etiquetas) */}
          <rect x="0" y="0" width="320" height="220" fill={`url(#${gid})`} />

          {/* eje de altura + flecha "más alto" (auto-dibujado) */}
          <g fill="none" stroke={TINTA} strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
            <path className="vfx-draw vfx-t2" pathLength={1} d={`M14,${Y1 - 6} L14,${Y0 + 6}`} />
            <path className="vfx-draw vfx-t3" pathLength={1} d={`M14,${Y0 + 6} l-4,7 m4,-7 l4,7`} />
          </g>

          {/* etiquetas de cada estrato (papel + texto oscuro AA) */}
          {estratos.map((e, i) => {
            const cy = Y0 + i * bandH + bandH / 2;
            const nombre = e.nombre || `Estrato ${i + 1}`;
            const w = Math.min(150, nombre.length * 6.6 + 22);
            return (
              <g key={`t${i}`} className="gemelo2d__etq">
                <rect x="24" y={cy - 10} width={w} height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
                <text x={24 + w / 2} y={cy + 4} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>{nombre}</text>
              </g>
            );
          })}
        </svg>

        <HotspotsGemelo hotspots={hotspots} acento={acento} onHotspot={onHotspot} />
      </div>
    </div>
  );
}
