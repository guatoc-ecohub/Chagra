/*
 * Flujo2D — GEMELO 2D del arquetipo 3D `flujo` (el camino del agua).
 *
 * La lección es la GRAVEDAD: el agua baja por la pendiente, del nacimiento a la
 * toma. Aquí la ladera se ve de perfil (la pendiente ES el dibujo), el cauce se
 * dibuja solo y el agua CORRE por él: gotas que bajan por `offset-path` (motion
 * path CSS) + el cauce animado con `vfx-flow`. En equipos sin motion-path las
 * gotas quedan quietas sobre el cauce (fotograma digno), y el cauce sigue leyendo.
 *
 * Se activa cuando: el equipo no aguanta 3D o el mundo se pide en 2D. Lo elige
 * `resolverMundo` vía `flujo.espejo`.
 */
import { AGUA, TINTA, PAPEL, acentoDe } from '../../palette/chagra.js';
import HotspotsGemelo from './HotspotsGemelo.jsx';
import './gemelos2d.css';

/* El cauce, del nacimiento (arriba-izquierda) a la toma (abajo-derecha).
   Se usa DOS veces: para dibujar el cauce y como `offset-path` de las gotas. */
const CAUCE_D = 'M44,56 C74,76 80,98 118,114 C158,132 198,148 240,166';

/* Gotas que bajan por el cauce, con arranque escalonado. */
const GOTAS = [0, 1, 2, 3, 4];

export default function Flujo2D({
  hotspots = [], tinte, onHotspot, titulo,
}) {
  const acento = acentoDe(tinte);
  return (
    <div className="mundo2d gemelo2d" style={{ '--m2d-tinte': acento }}>
      <div className="mundo2d__lienzo">
        <svg viewBox="0 0 320 220" className="mundo2d__svg gemelo2d__svg" role="img"
          aria-label={titulo ? `${titulo}: el agua baja por la pendiente` : 'El agua baja por la pendiente, del nacimiento a la toma'}>
          {/* cielo del valle húmedo (mismo tono que el diorama 3D) */}
          <rect x="0" y="0" width="320" height="220" fill={AGUA.cielo} />

          {/* la ladera de perfil: la PENDIENTE es la lección */}
          <polygon points="0,64 196,120 320,152 320,220 0,220" fill={AGUA.ladera} />
          <polygon points="0,64 196,120 320,152 320,168 196,138 0,86" fill={AGUA.laderaSombra} opacity="0.55" />

          {/* nacimiento: roca + pozo arriba-izquierda */}
          <path d="M28,58 q10,-16 26,-8 q12,6 6,16 Z" fill="#9a8b74" />
          <ellipse cx="44" cy="58" rx="12" ry="4.5" fill={AGUA.agua} opacity="0.9" />

          {/* cauce: base ancha translúcida + trazo que se DIBUJA al entrar */}
          <path d={CAUCE_D} fill="none" stroke={AGUA.aguaClara} strokeWidth="12" strokeLinecap="round" opacity="0.55" />
          <path className="vfx-draw vfx-t2" pathLength={1} d={CAUCE_D} fill="none" stroke={AGUA.agua} strokeWidth="5" strokeLinecap="round" />
          {/* el agua CORRE: dash animado sobre el cauce (vfx-flow) */}
          <path className="vfx-flow" d={CAUCE_D} fill="none" stroke={PAPEL} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />

          {/* la toma / el tanque que recibe el agua abajo-derecha */}
          <path d="M226,168 L280,168 L274,196 L232,196 Z" fill={AGUA.tanque} />
          <rect x="230" y="166" width="52" height="7" rx="3" fill={AGUA.agua} opacity="0.9" />

          {/* gotas que BAJAN por el cauce (offset-path); quietas si no hay soporte */}
          {GOTAS.map((i) => (
            <g key={i} className="gemelo2d__gota" style={{ offsetPath: `path("${CAUCE_D}")`, animationDelay: `${i * 0.9}s` }}>
              <path d="M0,-5 C3,-1 3,3 0,5 C-3,3 -3,-1 0,-5 Z" fill={AGUA.agua} stroke={PAPEL} strokeWidth="0.6" />
            </g>
          ))}

          {/* contorno del cauce sobre la ladera, para el volumen (auto-dibujado) */}
          <path className="vfx-draw vfx-t3" pathLength={1} d="M196,120 L320,152" fill="none" stroke={TINTA} strokeWidth="1.4" opacity="0.5" />

          {/* etiquetas: nacimiento · pendiente · toma (papel + texto oscuro AA) */}
          <g className="gemelo2d__etq">
            <rect x="8" y="30" width="104" height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
            <text x="60" y="44" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>El nacimiento</text>

            <rect x="106" y="86" width="118" height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
            <text x="165" y="100" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>El agua baja sola</text>

            <rect x="206" y="198" width="78" height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
            <text x="245" y="212" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>La toma</text>
          </g>
        </svg>

        <HotspotsGemelo hotspots={hotspots} acento={acento} onHotspot={onHotspot} />
      </div>
    </div>
  );
}
