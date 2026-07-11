/*
 * Recinto2D — GEMELO 2D del arquetipo 3D `recinto` (el corral y su ciclo cerrado).
 *
 * En 3D el corral es un LUGAR que se camina; en 2D es un MAPA visto en planta,
 * que se lee de un vistazo: la cerca, las zonas etiquetadas (comedero, bebedero,
 * sombra, compostera) y los animales (de `params.animales`, mismos tonos que el
 * diorama). El ciclo cerrado del abono se dibuja como una flecha que sale de la
 * compostera y VUELVE al pasto. Un velo suave (`vfx-vignette`, de la librería de
 * efectos) enfoca el centro.
 *
 * Se activa cuando: el equipo no aguanta 3D o el mundo se pide en 2D. Lo elige
 * `resolverMundo` vía `recinto.espejo`.
 */
import { AutoDibujo } from '../../effects/index.js';
import { CORRAL, TINTA, PAPEL, acentoDe } from '../../palette/chagra.js';
import HotspotsGemelo from './HotspotsGemelo.jsx';
import './gemelos2d.css';

const CX = 160;
const CY = 116;
const RX = 120;
const RY = 82;

/* Postes de la cerca, repartidos en el óvalo (guiño a los 12 postes del 3D). */
const POSTES = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * Math.PI * 2;
  return { key: i, x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY };
});

/* Un animal visto en planta: cuerpo + cabeza, con su tono propio. */
function AnimalPlanta({ x, y, color }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="0" rx="12" ry="8" fill={color} stroke={TINTA} strokeWidth="1" />
      <circle cx="11" cy="0" r="4.5" fill={color} stroke={TINTA} strokeWidth="1" />
    </g>
  );
}

export default function Recinto2D({
  params, hotspots = [], tinte, onHotspot, titulo,
}) {
  const acento = acentoDe(tinte);
  const animales = (params?.animales?.length ? params.animales : [
    { color: CORRAL.animales[0], pos: [-0.7, 0, 0.4] },
    { color: CORRAL.animales[1], pos: [0.6, 0, -0.3] },
    { color: CORRAL.animales[2], pos: [0.1, 0, 0.7] },
  ]).map((a, i) => {
    const p = a.pos || [0, 0, 0];
    return { key: i, x: CX + (p[0] || 0) * 46, y: CY + (p[2] || 0) * 46, color: a.color || CORRAL.animales[i % 3] };
  });

  return (
    <div className="mundo2d gemelo2d" style={{ '--m2d-tinte': acento }}>
      <div className="mundo2d__lienzo">
       <div className="gemelo2d__escena">
        <svg viewBox="0 0 320 220" className="mundo2d__svg gemelo2d__svg" role="img"
          aria-label={titulo ? `${titulo}: el corral visto en planta` : 'El corral visto en planta, desde arriba, con sus zonas y animales'}>
          {/* papel cálido del recinto */}
          <rect x="0" y="0" width="320" height="220" fill={CORRAL.cielo} />

          {/* piso del corral (óvalo en planta) */}
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill={CORRAL.piso} />
          <ellipse cx={CX} cy={CY} rx={RX - 10} ry={RY - 10} fill={CORRAL.pisoClaro} opacity="0.5" />

          {/* zonas etiquetadas (regiones semitransparentes) */}
          <ellipse cx="96" cy="80" rx="34" ry="22" fill="#7a9a3f" opacity="0.28" />
          <ellipse cx="228" cy="150" rx="26" ry="18" fill={CORRAL.aro} opacity="0.30" />
          <ellipse cx="228" cy="82" rx="30" ry="20" fill="#8a6a44" opacity="0.22" />

          {/* la cerca: postes en el óvalo, dibujados al entrar */}
          <g fill={CORRAL.poste}>
            {POSTES.map((p) => (
              <circle key={p.key} cx={p.x} cy={p.y} r="2.6" />
            ))}
          </g>
          <AutoDibujo as="ellipse" stage={1} cx={CX} cy={CY} rx={RX} ry={RY}
            fill="none" stroke={TINTA} strokeWidth="2" strokeDasharray="1 1" />

          {/* la compostera al centro-bajo + el CICLO que vuelve al pasto */}
          <g transform={`translate(${CX},${CY + 46})`}>
            <path d="M-16,8 L16,8 L10,-10 L-10,-10 Z" fill={CORRAL.abono} />
            <path d="M-10,-10 q10,-8 20,0" fill="none" stroke="#c8a24a" strokeWidth="2" />
          </g>
          {/* flecha del ciclo: de la compostera al pasto y de vuelta (auto-dibujada) */}
          <g fill="none" stroke={CORRAL.aro} strokeWidth="2.4" strokeLinecap="round">
            <AutoDibujo as="path" stage={3} d={`M${CX - 8},${CY + 40} C${CX - 90},${CY + 30} ${CX - 96},${CY - 40} ${CX - 40},${CY - 44}`} />
            <AutoDibujo as="path" stage={4} d={`M${CX - 40},${CY - 44} l-9,-3 m9,3 l-3,9`} />
          </g>

          {/* los animales, en planta, con su tono del diorama */}
          {animales.map((a) => (
            <AnimalPlanta key={a.key} x={a.x} y={a.y} color={a.color} />
          ))}

          {/* etiquetas de zona (papel + texto oscuro AA) */}
          <g className="gemelo2d__etq">
            <rect x="56" y="34" width="80" height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
            <text x="96" y="48" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>Comedero</text>

            <rect x="192" y="164" width="76" height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
            <text x="230" y="178" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>Bebedero</text>

            <rect x="198" y="34" width="64" height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
            <text x="230" y="48" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>Sombra</text>

            <rect x={CX - 52} y={CY + 62} width="104" height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
            <text x={CX} y={CY + 76} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>Del corral al abono</text>
          </g>
        </svg>

        {/* velo de enfoque (librería de efectos): centra la mirada sin tapar */}
        <div className="vfx-vignette gemelo2d__foco" aria-hidden="true" />
       </div>

        <HotspotsGemelo hotspots={hotspots} acento={acento} onHotspot={onHotspot} />
      </div>
    </div>
  );
}
