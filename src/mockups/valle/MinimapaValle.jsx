/*
 * MinimapaValle — el minimapa RTS del valle ("Age of Empires del campo").
 *
 * Un overlay 2D de esquina, autocontenido (SVG+CSS, cero assets remotos),
 * que muestra el valle EN PLANTA como el minimapa de un RTS clásico:
 *   · el terreno por pisos térmicos (páramo arriba → tierra caliente abajo,
 *     la MISMA orientación de la escena 3D: -z al fondo, +z al frente);
 *   · la quebrada bajando la ladera y los senderos del trajín;
 *   · la casa-ancla (el hogar, no navegable) y la cordillera del fondo;
 *   · un BLIP por lugar navegable (color del tinte + emoji del mundo);
 *   · el CONO DE CÁMARA: desde la esquina de la cámara de reposo
 *     ([10.5, 13.5] en planta) apunta hacia el foco vigente — se lee
 *     "hacia dónde estoy mirando" como en AoE;
 *   · TAP-PARA-SALTAR: tocar un blip llama onSaltar(id) — la escena decide
 *     el viaje. Este componente NO toca la escena: es un mapa, no un mando.
 *   · LABELS dinámicos: hover o foco de teclado sobre un blip muestran su
 *     NOMBRE en un chip; en táctil (sin hover) el 1er toque muestra el
 *     nombre y arma el blip, el 2º toque salta. El label del foco vigente
 *     queda visible siempre.
 *
 * Geografía por DATOS, no a mano: pisos de valleData.PISOS_TERMICOS, casa y
 * senderos de direccion/composicionValle — el minimapa es EL MISMO lugar que
 * el valle 3D. (La quebrada se duplica: la escena la define inline.)
 *
 * Colapsable: en teléfono ocupa ~124-148px de esquina y se pliega a un botón.
 */
import { useMemo, useRef, useState } from 'react';
import { PISOS_TERMICOS } from './valleData';
import { CASA_VALLE, SENDEROS_VALLE } from '../../visual/mundo3d/direccion/composicionValle';
import './minimapaValle.css';

/* ── Proyección mundo→mapa ────────────────────────────────────────────────
   El valle vive en x∈[-9,9], z∈[-11,9]. Escala UNIFORME (sin deformar la
   planta): 18 u de ancho → 100 unidades SVG; el fondo (z) da el alto. */
const X_MIN = -9;
const Z_MIN = -11;
const Z_MAX = 9;
const ESCALA = 100 / 18;
const ANCHO = 100;
const ALTO = (Z_MAX - Z_MIN) * ESCALA; // ≈ 111.1

const sx = (x) => (x - X_MIN) * ESCALA;
const sy = (z) => (z - Z_MIN) * ESCALA;

/* La quebrada: los MISMOS waypoints del tubo 3D (Valle3D.Quebrada los define
   inline en la escena — si se mueven allá, moverlos acá). Nace en el páramo
   y baja a la tierra caliente. */
const QUEBRADA_PTS = [
  [-3.4, -7.2],
  [-1.2, -4.2],
  [0.8, -1.4],
  [1.6, 1.8],
  [2.6, 5.4],
  [3.6, 8],
];

/* La cámara de reposo de la escena ([10.5, 9, 13.5] mirando a [0, 1.6, 1.4]):
   en planta cae por fuera de la esquina inferior-derecha del mapa — el cono
   entra al cuadro desde ahí, como el viewport de un RTS. */
const CAMARA_PLANTA = [10.5, 13.5];
const MIRA_REPOSO = [0, 1.4];
/* Largo del cono: alcanza el punto de mira de reposo desde la cámara. */
const CONO_LARGO = 95;
/* Medio-ángulo del cono en el mapa (~fov 40 de la escena, achatado a planta). */
const CONO_MEDIO_TAN = 0.24;

/** Polyline [x,z] → path SVG suavizado (cuadráticas por punto medio). */
function pathSuave(puntos) {
  const p = puntos.map(([x, z]) => [sx(x), sy(z)]);
  if (p.length < 2) return '';
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 1; i += 1) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    d += ` Q ${p[i][0].toFixed(1)} ${p[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const fin = p[p.length - 1];
  return `${d} L ${fin[0].toFixed(1)} ${fin[1].toFixed(1)}`;
}

/** Borde ondulado de una franja de piso (4 ondas suaves a lo ancho). */
function ondaEn(zTop) {
  const y = sy(zTop);
  const amp = 1.5;
  const n = 4;
  const w = ANCHO / n;
  let d = `M 0 ${y.toFixed(1)}`;
  for (let i = 0; i < n; i += 1) {
    const cy = y + (i % 2 === 0 ? -amp : amp);
    d += ` Q ${(w * i + w / 2).toFixed(1)} ${cy.toFixed(1)} ${(w * (i + 1)).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/* ── Capas estáticas precalculadas (cero costo por render) ──────────────── */
/* Pisos de atrás (páramo, arriba) hacia delante (cálido, abajo): cada franja
   pinta de su borde ondulado hasta el fondo del mapa y la siguiente la tapa. */
const CAPAS_PISOS = [...PISOS_TERMICOS].reverse().map((p, i) => ({
  id: p.id,
  color: p.color,
  cresta: p.cresta,
  dTop: i === 0 ? null : ondaEn(p.z0),
  dFill: i === 0
    ? `M 0 0 H ${ANCHO} V ${(ALTO + 2).toFixed(1)} H 0 Z`
    : `${ondaEn(p.z0)} L ${ANCHO} ${(ALTO + 2).toFixed(1)} L 0 ${(ALTO + 2).toFixed(1)} Z`,
}));

const D_QUEBRADA = pathSuave(QUEBRADA_PTS);

/* Solo los senderos frugales (los del uso diario): el minimapa respira. */
const D_SENDEROS = SENDEROS_VALLE
  .filter((s) => s.frugal)
  .map((s) => ({ id: s.id, d: pathSuave(s.puntos) }));

const CASA_XY = [sx(CASA_VALLE.pos[0]), sy(CASA_VALLE.pos[1])];
const CAM_XY = [sx(CAMARA_PLANTA[0]), sy(CAMARA_PLANTA[1])];

/**
 * Nombre visible de un lugar: `nombre` del contrato de datos si viene, o un
 * fallback legible derivado del `id` (guiones/underscores → espacios, inicial
 * mayúscula). El nombre REAL debe llegar en `lugares[].nombre` desde quien
 * compone los mundos — este fallback es solo red de seguridad.
 */
function nombreDe(l) {
  if (l.nombre) return l.nombre;
  const s = String(l.id).replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* La cordillera del fondo (los picos viven en z≤-15, fuera del mapa): unos
   chevrones en la franja del páramo la sugieren. */
const CHEVRONES = [
  'M 10 11 l 4.5 -4.5 l 4.5 4.5',
  'M 40 8 l 5 -5 l 5 5',
  'M 74 12 l 4.5 -4.5 l 4.5 4.5',
];

/**
 * El minimapa del valle, estilo RTS. Overlay de esquina, colapsable.
 *
 * @param {object} props
 * @param {Array<{id: string, nombre?: string, x: number, z: number, emoji: string, tinte: string[]|string}>} props.lugares
 *   Los lugares navegables del valle en planta. `tinte` acepta el par del
 *   manifiesto (['#a', '#b'] — usa el primero) o un color suelto. `nombre`
 *   es el nombre visible del lugar (label); si falta, se deriva del `id`.
 * @param {string|{id: string}|null} [props.foco] El lugar en foco (id o el
 *   objeto del mundo): su blip pulsa y el cono de cámara lo apunta. null =
 *   reposo (el cono mira al centro del valle).
 * @param {(id: string) => void} [props.onSaltar] Tap en un blip → saltar ahí.
 * @param {'alto'|'medio'|'bajo'} [props.tier] Presupuesto visual del equipo
 *   (deviceTier): en 'bajo' se apagan pulso, brillos y transiciones.
 * @param {boolean} [props.reducedMotion] Respeto a "menos movimiento".
 */
export default function MinimapaValle({
  lugares = [],
  foco = null,
  onSaltar,
  tier = 'alto',
  reducedMotion = false,
}) {
  const [abierto, setAbierto] = useState(true);
  /* Estados de label: hover (mouse), foco de teclado, y "armado" (táctil:
     1er toque muestra el nombre, el 2º salta). */
  const [hoverId, setHoverId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [armadoId, setArmadoId] = useState(null);
  /* Con qué se tocó por última vez: decide tap-directo (mouse/teclado/AT)
     vs dos-toques (touch). 'mouse' de arranque para que activaciones sin
     pointerdown (lectores de pantalla) salten directo. */
  const ultimoPuntero = useRef('mouse');
  const quieto = reducedMotion || tier === 'bajo';
  const focoId = typeof foco === 'string' ? foco : (foco && foco.id) || null;

  /* Hacia dónde apunta el cono: el lugar en foco, o la mira de reposo. */
  const anguloCono = useMemo(() => {
    const enFoco = focoId && lugares.find((l) => l.id === focoId);
    const tx = enFoco ? sx(enFoco.x) : sx(MIRA_REPOSO[0]);
    const ty = enFoco ? sy(enFoco.z) : sy(MIRA_REPOSO[1]);
    return (Math.atan2(ty - CAM_XY[1], tx - CAM_XY[0]) * 180) / Math.PI;
  }, [focoId, lugares]);

  const saltar = (id) => {
    if (onSaltar) onSaltar(id);
  };

  /* Click/tap en un blip. Mouse/teclado/AT: salta directo. Táctil: el 1er
     toque arma el blip (muestra el nombre), el 2º sobre el MISMO salta;
     tocar otro blip re-arma; tocar el fondo del mapa desarma. */
  const clickBlip = (e, id) => {
    e.stopPropagation();
    if (ultimoPuntero.current === 'touch' && armadoId !== id) {
      setArmadoId(id);
      return;
    }
    setArmadoId(null);
    saltar(id);
  };

  const cerrarMapa = () => {
    setAbierto(false);
    setArmadoId(null);
    setHoverId(null);
    setFocusId(null);
  };

  if (!abierto) {
    return (
      <div className="mmv mmv--cerrado">
        <button
          type="button"
          className="mmv-toggle mmv-toggle--abrir"
          aria-label="Mostrar el minimapa del valle"
          onClick={() => setAbierto(true)}
        >
          <span aria-hidden="true">🗺️</span>
        </button>
      </div>
    );
  }

  const lado = CONO_LARGO * CONO_MEDIO_TAN;

  return (
    <div
      className={`mmv${quieto ? ' mmv--quieto' : ''}`}
      role="group"
      aria-label="Minimapa del valle"
    >
      <div className="mmv-marco">
        <span className="mmv-tachuela mmv-tachuela--tl" aria-hidden="true" />
        <span className="mmv-tachuela mmv-tachuela--tr" aria-hidden="true" />
        <span className="mmv-tachuela mmv-tachuela--bl" aria-hidden="true" />
        <span className="mmv-tachuela mmv-tachuela--br" aria-hidden="true" />
        <button
          type="button"
          className="mmv-toggle"
          aria-label="Ocultar el minimapa"
          onClick={cerrarMapa}
        >
          <span aria-hidden="true">▾</span>
        </button>
        <svg
          className="mmv-mapa"
          viewBox={`0 0 ${ANCHO} ${ALTO.toFixed(1)}`}
          role="presentation"
          focusable="false"
          onClick={() => setArmadoId(null)}
        >
          <defs>
            <radialGradient id="mmv-vineta" cx="50%" cy="46%" r="72%">
              <stop offset="62%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.38" />
            </radialGradient>
          </defs>

          {/* el terreno: las franjas de los pisos térmicos */}
          <g className="mmv-terreno">
            {CAPAS_PISOS.map((p) => (
              <g key={p.id}>
                <path d={p.dFill} fill={p.color} />
                {p.dTop && <path className="mmv-cresta" d={p.dTop} stroke={p.cresta} />}
              </g>
            ))}
          </g>

          {/* la cordillera sugerida en el páramo */}
          <g className="mmv-cordillera">
            {CHEVRONES.map((d) => <path key={d} d={d} />)}
          </g>

          {/* los senderos del trajín */}
          <g className="mmv-senderos">
            {D_SENDEROS.map((s) => <path key={s.id} d={s.d} />)}
          </g>

          {/* la quebrada: brillo + hilo de agua */}
          <path className="mmv-quebrada-brillo" d={D_QUEBRADA} />
          <path className="mmv-quebrada" d={D_QUEBRADA} />

          {/* la casa-ancla (el hogar; no navegable, no es blip) */}
          <g
            className="mmv-casa"
            transform={`translate(${CASA_XY[0].toFixed(1)} ${CASA_XY[1].toFixed(1)})`}
            aria-hidden="true"
          >
            <rect x="-2.3" y="-1.3" width="4.6" height="3.2" rx="0.5" />
            <path className="mmv-casa-techo" d="M -3 -1.1 L 0 -3.6 L 3 -1.1 Z" />
          </g>

          {/* viñeta de profundidad: bajo el cono y los blips (ellos brillan) */}
          <rect
            className="mmv-vineta"
            x="0"
            y="0"
            width={ANCHO}
            height={ALTO.toFixed(1)}
            fill="url(#mmv-vineta)"
          />

          {/* el cono de cámara: desde la esquina de la cámara de reposo hacia
              el foco — "hacia dónde estoy mirando" (viewport RTS) */}
          <g
            className="mmv-cam"
            style={{ transform: `translate(${CAM_XY[0]}px, ${CAM_XY[1]}px) rotate(${anguloCono.toFixed(1)}deg)` }}
          >
            <path
              className="mmv-cam-cono"
              d={`M 0 0 L ${(CONO_LARGO - 3).toFixed(1)} ${(-lado).toFixed(1)} A ${CONO_LARGO} ${CONO_LARGO} 0 0 1 ${(CONO_LARGO - 3).toFixed(1)} ${lado.toFixed(1)} Z`}
            />
          </g>

          {/* los blips: un lugar navegable por punto, tap para saltar */}
          <g className="mmv-blips">
            {lugares.map((l) => {
              const esFoco = focoId === l.id;
              const esArmado = armadoId === l.id;
              const tinte = Array.isArray(l.tinte) ? l.tinte[0] : (l.tinte || '#3f8f4e');
              return (
                <g
                  key={l.id}
                  className={`mmv-blip${esFoco ? ' mmv-blip--foco' : ''}${esArmado ? ' mmv-blip--armado' : ''}`}
                  transform={`translate(${sx(l.x).toFixed(1)} ${sy(l.z).toFixed(1)})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ir a ${nombreDe(l)}`}
                  onPointerDown={(e) => { ultimoPuntero.current = e.pointerType || 'mouse'; }}
                  onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHoverId(l.id); }}
                  onPointerLeave={() => setHoverId((v) => (v === l.id ? null : v))}
                  onFocus={() => setFocusId(l.id)}
                  onBlur={() => setFocusId((v) => (v === l.id ? null : v))}
                  onClick={(e) => clickBlip(e, l.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setArmadoId(null);
                      saltar(l.id);
                    } else if (e.key === 'Escape') {
                      setArmadoId(null);
                      e.currentTarget.blur();
                    }
                  }}
                >
                  {esFoco && <circle className="mmv-blip-aro" r="7.4" />}
                  <circle className="mmv-blip-tap" r="8.2" />
                  <circle className="mmv-blip-punto" r="5.9" fill={tinte} />
                  <text className="mmv-blip-emoji" y="1.9" textAnchor="middle">
                    {l.emoji}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Los labels: chips HTML sobre el mapa (texto nítido, no escala con
            el viewBox del SVG). aria-hidden: el nombre ya viaja en el
            aria-label del blip. Se renderizan todos para que la salida
            también transicione; --on los enciende. */}
        <div className="mmv-labels" aria-hidden="true">
          {lugares.map((l) => {
            const px = sx(l.x) / ANCHO;
            const py = sy(l.z) / ALTO;
            const esArmado = armadoId === l.id;
            const visible = esArmado || hoverId === l.id || focusId === l.id || focoId === l.id;
            const clases = [
              'mmv-label',
              py < 0.22 && 'mmv-label--abajo',
              px < 0.24 && 'mmv-label--izq',
              px > 0.72 && 'mmv-label--der',
              focoId === l.id && 'mmv-label--foco',
              esArmado && 'mmv-label--armado',
              visible && 'mmv-label--on',
            ].filter(Boolean).join(' ');
            return (
              <span
                key={l.id}
                className={clases}
                style={{ left: `${(px * 100).toFixed(1)}%`, top: `${(py * 100).toFixed(1)}%` }}
              >
                {nombreDe(l)}
                {esArmado && <em className="mmv-label-pista">toque de nuevo para ir</em>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
