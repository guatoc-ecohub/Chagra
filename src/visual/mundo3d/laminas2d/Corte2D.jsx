/*
 * Corte2D — GEMELO 2D del arquetipo 3D `cutaway` (el suelo vivo / la pila de abono).
 *
 * NO es un fallback pobre: es el MISMO mundo dibujado en otro lenguaje. Un CORTE
 * isométrico (2.5D) del subsuelo, con las capas ETIQUETADAS y la vida del suelo
 * (lombriz de la librería + raíces + micorriza) que aparece TANTA como diga
 * `params.vida`. El corte se auto-dibuja al entrar (`AutoDibujo`/`vfx-draw`), en
 * alto contraste. Lee los MISMOS `params.capas`/`params.vida` que el diorama 3D,
 * así que sumar el gemelo de un mundo no cuesta datos nuevos.
 *
 * Se activa cuando: el equipo no aguanta 3D (tier bajo/sin-WebGL/ahorro/calma) o
 * el mundo se pide en 2D. Lo elige `resolverMundo` vía `cutaway.espejo`.
 */
import { Lombriz } from '../../creatures/index.js';
import { AutoDibujo } from '../../effects/index.js';
import { SUELO, TINTA, PAPEL, acentoDe } from '../../palette/chagra.js';
import HotspotsGemelo from './HotspotsGemelo.jsx';
import './gemelos2d.css';

/* Geometría del bloque 2.5D (unidades del viewBox 0 0 320 220). */
const X0 = 44;   // borde frontal izquierdo
const X1 = 196;  // borde frontal derecho
const T = 66;    // techo del corte (bajo el pasto)
const B = 192;   // piso del corte
const DX = 40;   // vector de profundidad (a la derecha)
const DY = -22;  // vector de profundidad (hacia arriba)
const FRONT_H = B - T;

function clamp01(n) {
  return Math.max(0, Math.min(1, typeof n === 'number' ? n : 0.6));
}

/* Reparte la altura frontal entre las capas según su `alto` declarado. */
function repartirCapas(capas) {
  const total = capas.reduce((s, c) => s + (c.alto || 0.6), 0) || 1;
  let top = T;
  return capas.map((c, i) => {
    const h = ((c.alto || 0.6) / total) * FRONT_H;
    const band = { key: i, nombre: c.nombre || `capa ${i + 1}`, color: c.color || '#5a3d28', bichos: c.bichos || [], top, h };
    top += h;
    return band;
  });
}

export default function Corte2D({
  params, hotspots = [], tinte, onHotspot, titulo,
}) {
  const acento = acentoDe(tinte);
  const capas = (params?.capas?.length ? params.capas : SUELO.capas);
  const vida = clamp01(params?.vida ?? 0.6);
  const bandas = repartirCapas(capas);
  const nVida = Math.max(1, Math.round(vida * 3)); // cuánta vida por capa

  // Raíces: descienden desde la superficie cruzando las capas (más con más vida).
  const raices = Array.from({ length: 1 + Math.round(vida * 3) }, (_, i) => {
    const rx = X0 + 26 + i * 34;
    const largo = 34 + ((i * 17) % 40);
    return { key: `r${i}`, d: `M${rx},${T + 4} q${(i % 2 ? 8 : -8)},${largo * 0.5} ${(i % 2 ? 4 : -4)},${largo}`, stage: 3 + (i % 4) };
  });

  return (
    <div className="mundo2d gemelo2d" style={{ '--m2d-tinte': acento }}>
      <div className="mundo2d__lienzo">
        <svg viewBox="0 0 320 220" className="mundo2d__svg gemelo2d__svg" role="img"
          aria-label={titulo ? `${titulo}: corte del suelo en capas` : 'Corte del suelo en capas, con la vida del subsuelo'}>
          {/* fondo cálido, mismo tono que el cielo del diorama 3D */}
          <rect x="0" y="0" width="320" height="220" fill={SUELO.cielo} />

          {/* cara superior (pasto) — paralelogramo de profundidad */}
          <polygon
            points={`${X0},${T} ${X1},${T} ${X1 + DX},${T + DY} ${X0 + DX},${T + DY}`}
            fill={SUELO.pasto}
          />
          {/* fleco de pasto sobre el borde frontal */}
          <path
            d={`M${X0},${T} q6,-7 12,0 q6,7 12,0 q6,-7 12,0 q6,7 12,0 q6,-7 12,0 q6,7 12,0 q6,-7 12,0 q6,7 12,0 q6,-7 12,0 q6,7 12,0 q6,-7 12,0 q6,7 12,0 q6,-7 12,0`}
            fill="none" stroke={SUELO.pasto} strokeWidth="4" strokeLinecap="round"
          />

          {/* bandas: cara frontal + cara lateral (sombreada) por capa */}
          {bandas.map((b) => (
            <g key={b.key}>
              {/* cara lateral (profundidad) */}
              <polygon
                points={`${X1},${b.top} ${X1 + DX},${b.top + DY} ${X1 + DX},${b.top + b.h + DY} ${X1},${b.top + b.h}`}
                fill={b.color}
              />
              {/* cara frontal */}
              <rect x={X0} y={b.top} width={X1 - X0} height={b.h} fill={b.color} />
            </g>
          ))}
          {/* sombra uniforme sobre TODA la cara lateral (da volumen sin recolorear) */}
          <polygon
            points={`${X1},${T} ${X1 + DX},${T + DY} ${X1 + DX},${B + DY} ${X1},${B}`}
            fill="#000" opacity="0.18"
          />

          {/* micorriza (hifas) en la capa oscura — trazos finos que se dibujan */}
          {vida > 0.25 && bandas.length > 1 && (
            <g stroke={SUELO.hifa} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.9">
              {Array.from({ length: nVida + 1 }, (_, i) => {
                const hx = X0 + 30 + i * 26;
                const hy = bandas[1].top + 10 + (i % 2) * 14;
                return (
                  <AutoDibujo key={`h${i}`} as="path" stage={4 + (i % 3)}
                    d={`M${hx},${hy} l10,8 m-10,-8 l-8,10 m8,-10 l2,14`} />
                );
              })}
            </g>
          )}

          {/* raíces que descienden desde la superficie (auto-dibujadas) */}
          <g stroke={SUELO.raiz} strokeWidth="2.4" fill="none" strokeLinecap="round">
            {raices.map((r) => (
              <AutoDibujo key={r.key} as="path" stage={r.stage} d={r.d} />
            ))}
          </g>

          {/* lombrices de la LIBRERÍA en la capa de suelo negro (tantas como vida) */}
          {Array.from({ length: nVida }, (_, i) => {
            const band = bandas[Math.min(1, bandas.length - 1)];
            const lx = X0 + 40 + i * 46;
            const ly = band.top + band.h * 0.5 + (i % 2 ? 6 : -4);
            return (
              <g key={`l${i}`} transform={`translate(${lx},${ly}) scale(0.7) rotate(${i % 2 ? 18 : -12})`}>
                <Lombriz inline title="Lombriz de tierra" />
              </g>
            );
          })}

          {/* contorno del corte: se DIBUJA solo al entrar (alto contraste) */}
          <g fill="none" stroke={TINTA} strokeWidth="2" strokeLinejoin="round">
            <AutoDibujo as="path" stage={1} d={`M${X0},${T} L${X1},${T} L${X1},${B} L${X0},${B} Z`} />
            <AutoDibujo as="path" stage={1} d={`M${X0},${T} L${X0 + DX},${T + DY} L${X1 + DX},${T + DY} L${X1},${T}`} />
            <AutoDibujo as="path" stage={2} d={`M${X1},${T} L${X1 + DX},${T + DY} L${X1 + DX},${B + DY} L${X1},${B}`} />
          </g>

          {/* etiquetas de cada capa — pastilla de papel, texto oscuro (AA) */}
          {bandas.map((b) => {
            const w = Math.min(148, b.nombre.length * 6.6 + 20);
            const ly = b.top + b.h / 2;
            return (
              <g key={`t${b.key}`} className="gemelo2d__etq">
                <rect x={X0 + 8} y={ly - 10} width={w} height="20" rx="10" fill={PAPEL} stroke={TINTA} strokeWidth="0.75" opacity="0.96" />
                <text x={X0 + 8 + w / 2} y={ly + 4} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={TINTA}>{b.nombre}</text>
              </g>
            );
          })}
        </svg>

        {/* leyenda de la vida del suelo (para leer los íconos) */}
        <ul className="gemelo2d__leyenda" aria-label="La vida que hay en el corte">
          <li><span className="gemelo2d__punto" style={{ background: SUELO.lombrizCuerpo }} /> Lombriz</li>
          <li><span className="gemelo2d__punto" style={{ background: SUELO.raiz }} /> Raíz</li>
          <li><span className="gemelo2d__punto" style={{ background: '#cfc6b4' }} /> Micorriza</li>
        </ul>

        <HotspotsGemelo hotspots={hotspots} acento={acento} onHotspot={onHotspot} />
      </div>
    </div>
  );
}
