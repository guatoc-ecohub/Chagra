/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Los textos de UI de esta tarjeta (título "Mi finca viva", aria-labels,
 * resúmenes) son strings de interfaz. Su migración a src/config/messages.js es
 * la TAREA i18n de ADR-050 (transversal a toda la app), fuera del alcance de
 * esta feature visual. Se silencia el warning soft acá para no arrastrar ese
 * refactor i18n — mismo criterio que FincaCards.jsx en este mismo directorio. */
import { useEffect, useMemo, useState } from 'react';
import { Sprout, ChevronRight } from 'lucide-react';
import { listFarmProcesses } from '../../db/farmProcessCache';
import { buildFincaScene } from '../../services/fincaSceneService';
import { selectSceneVariant } from '../../services/fincaSceneProfileSelector';
import { getProfile } from '../../services/userProfileService';
import { tieneAccesoGlaciarActual } from '../../config/glaciarAccess';
import { WORLD_STAGES } from '../../services/fincaGameService';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
import FincaWorldScene from '../juego/FincaWorldScene';
import '../juego/juego-finca.css';

/**
 * Mapea la vitalidad (0-100) de la finca a un nivel WORLD_STAGES (0-4) para el
 * BACKDROP por perfil (flag ON). No inventa progreso: la vitalidad ya sale de
 * datos reales (fincaSceneService.calcularVitalidad). Vacía → nivel 0.
 * @param {{ vacia?: boolean, vitalidad?: number }} scene
 * @returns {number} nivel 0..4
 */
function nivelDesdeVitalidad(scene) {
  if (!scene || scene.vacia) return 0;
  const v = Number(scene.vitalidad) || 0;
  if (v >= 75) return 4;
  if (v >= 50) return 3;
  if (v >= 25) return 2;
  if (v > 0) return 1;
  return 0;
}

/**
 * MiFincaVivaHomeCard — la finca REAL del usuario como ESCENA 2D viva en el home.
 *
 * Una granjita tipo Nintendo (SVG inline, offline-first) que dibuja CADA cultivo
 * según su ETAPA FENOLÓGICA real (semilla → brote → hoja → flor → fruto →
 * cosecha) y los animales si los hay. Crece a medida que la finca avanza. Doble
 * lectura: para una niña es lindo y vivo; para el campesino es un vistazo claro
 * del estado de SU finca (cultivos activos, cuántos en cosecha, vitalidad).
 *
 * Cero fabricación: lee los procesos reales de farmProcessCache (offline-first).
 * Sin datos → escena "por sembrar" acogedora que invita a empezar. Toca la
 * escena para abrir el juego completo "Mi Finca Viva".
 *
 * Mobile-first y liviana (gama baja): SVG estático con animaciones CSS suaves
 * que respetan prefers-reduced-motion (juego-finca.css). No usa red en runtime.
 *
 * @param {Object} props
 * @param {Function} [props.onNavigate]  navegación de la app (abre 'juego')
 */
export default function MiFincaVivaHomeCard({ onNavigate }) {
  const [processes, setProcesses] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let alive = true;
    listFarmProcesses({ status: 'active' })
      .then((list) => {
        if (alive) setProcesses(Array.isArray(list) ? list : []);
      })
      .catch(() => { /* IDB falló: escena "por sembrar" honesta, nunca datos inventados */ })
      .finally(() => { if (alive) setCargando(false); });
    return () => { alive = false; };
  }, []);

  const scene = useMemo(() => buildFincaScene({ processes }), [processes]);

  // VARIANTE POR PERFIL (#34 fase 2): la escena RICA distingue cada planta por
  // TIPO botánico × FASE fenológica real, agrupada en las ZONAS declaradas en el
  // onboarding (huerta / frutales / aromáticas / animales) y dibuja el INVERNADERO
  // según su forma (cuadrado / túnel). El selector es puro (sin red) y aporta el
  // ESQUELETO (zonas + forma del invernadero) que la escena rica necesita.
  //
  // El flag VITE_FINCA_VIVA_HOME_PERFIL controla solo el BACKDROP por perfil
  // (balcón / páramo / restauración) de la fase 1: cuando está OFF mantenemos la
  // finca rural por defecto, pero SIEMPRE pasamos zonas+invernadero para la escena
  // rica. El cálculo es barato y a prueba de fallos (cae a la escena clásica).
  const flagBackdrop = fincaVivaHomePerfilActivo();
  const variant = useMemo(() => {
    try {
      const v = selectSceneVariant(getProfile(), { esGuiaGlaciar: tieneAccesoGlaciarActual() });
      // Sin el flag de backdrop por perfil, forzamos finca rural como base (la
      // escena rica vive sobre el backdrop de finca), conservando zonas+invernadero.
      if (!flagBackdrop && v && v.kind !== 'invernadero') {
        return { ...v, kind: 'finca' };
      }
      return v;
    } catch (_) {
      return null; // Fail-safe: cae a la escena 2D clásica.
    }
  }, [flagBackdrop]);

  // Stage (nivel del mundo) para el backdrop por perfil, derivado de la
  // vitalidad real de la finca (no inventa progreso).
  const stageVariante = useMemo(
    () => WORLD_STAGES[nivelDesdeVitalidad(scene)] || WORLD_STAGES[0],
    [scene],
  );

  const abrirJuego = () => onNavigate?.('juego');

  return (
    <section
      data-testid="mi-finca-viva-home-card"
      className="bg-gradient-to-br from-emerald-950/70 to-teal-950/50 border border-emerald-800/40 rounded-2xl overflow-hidden"
    >
      {/* Encabezado compacto */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sprout size={18} className="text-emerald-300 shrink-0" aria-hidden="true" />
          <h3 className="text-base font-bold text-white truncate">Mi finca viva</h3>
        </div>
        <button
          type="button"
          onClick={abrirJuego}
          aria-label="Abrir Mi Finca Viva"
          className="flex items-center gap-1 text-xs font-semibold text-emerald-300/80 hover:text-emerald-200 active:scale-95 transition"
        >
          Abrir
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      {/* La ESCENA 2D — el corazón visual. Toda la escena es un botón. */}
      <button
        type="button"
        onClick={abrirJuego}
        aria-label={
          scene.vacia
            ? 'Tu finca está por sembrar. Toca para empezar.'
            : `${scene.resumen}. Toca para ver tu finca viva.`
        }
        className="block w-full text-left active:scale-[0.99] transition"
      >
        {variant ? (
          // Escena RICA (#34 fase 2): plantas por tipo×fase, zonas declaradas e
          // invernadero por forma. Pasa los lotes/animales REALES de la escena.
          <FincaWorldScene
            stage={stageVariante}
            criaturas={[]}
            vacia={scene.vacia}
            variant={variant}
            lotes={scene.lotes}
            animales={scene.animales}
          />
        ) : (
          <FincaScene2D scene={scene} cargando={cargando} />
        )}
      </button>

      {/* Vitalidad + resumen (vistazo útil para el campesino) */}
      <div className="px-4 pt-3 pb-4">
        {scene.vacia ? (
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Tu finca está esperando.{' '}
            <span className="font-semibold text-emerald-200">Siembra tu primera planta</span>{' '}
            y mira cómo cobra vida.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-200">{scene.vitalidadLabel}</span>
              <span className="text-xs font-black text-emerald-300">{scene.vitalidad}%</span>
            </div>
            <div className="h-2.5 bg-slate-800/60 rounded-full overflow-hidden border border-emerald-900/40">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(scene.vitalidad, 4)}%` }}
                role="progressbar"
                aria-valuenow={scene.vitalidad}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Vitalidad de la finca: ${scene.vitalidad} por ciento`}
              />
            </div>
            <p className="text-xs text-emerald-300/80 mt-2">{scene.resumen}</p>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * FincaScene2D — el dibujo SVG de la finca. Por cada lote pinta un cultivo según
 * su sprite/etapa; los animales van en un corral a la derecha. Posiciones
 * deterministas (estables entre renders → reconocible para la niña, sin
 * parpadeo). Reusa las animaciones de juego-finca.css (fv-grow, fv-sway, …).
 */
function FincaScene2D({ scene, cargando }) {
  const lluvia = scene.clima.includes('lluvia');

  // Distribuir los lotes en una rejilla suave sobre la tierra. Determinista.
  const slots = useMemo(() => {
    return scene.lotes.map((lote, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 48 + col * 88 + (row % 2) * 16; // leve offset por fila
      const y = 168 + row * 24;
      return { ...lote, x, y, key: lote.id || `l${i}` };
    });
  }, [scene.lotes]);

  return (
    <div
      className="fv-scene"
      data-testid="finca-scene-2d"
      role="img"
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="mfv-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9fd3e6" />
            <stop offset="100%" stopColor="#e6f4ec" />
          </linearGradient>
          <linearGradient id="mfv-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9c8a5a" />
            <stop offset="100%" stopColor="#7c6a3e" />
          </linearGradient>
        </defs>

        {/* Cielo */}
        <rect x="0" y="0" width="400" height="240" fill="url(#mfv-sky)" />

        {/* Sol cálido (siempre presente) */}
        <g className="fv-sun">
          <circle cx="338" cy="44" r="24" fill="#ffe08a" opacity="0.95" />
          <circle cx="338" cy="44" r="16" fill="#ffd24d" />
        </g>

        {/* Nubes */}
        <g className="fv-cloud" fill="#ffffff" opacity={lluvia ? 0.95 : 0.8}>
          <ellipse cx="82" cy="42" rx="26" ry="13" />
          <ellipse cx="102" cy="38" rx="20" ry="14" />
          <ellipse cx="64" cy="38" rx="16" ry="11" />
        </g>

        {/* Lluvia opcional (clima/ENSO real) */}
        {lluvia && (
          <g stroke="#7fb8d6" strokeWidth="2" strokeLinecap="round" opacity="0.7">
            <line x1="70" y1="56" x2="66" y2="68" />
            <line x1="86" y1="58" x2="82" y2="70" />
            <line x1="100" y1="56" x2="96" y2="68" />
          </g>
        )}

        {/* Colinas de fondo */}
        <path d="M0 174 Q100 138 200 168 T400 162 V240 H0 Z" fill="#86a85e" opacity="0.55" />

        {/* Compostera (elemento de finca) en la esquina */}
        <g transform="translate(18 196)">
          <rect x="-2" y="0" width="26" height="16" rx="3" fill="#6e5634" />
          <rect x="-2" y="-4" width="26" height="6" rx="2" fill="#8a6a3a" />
          <circle cx="6" cy="-2" r="2" fill="#a4c46a" />
          <circle cx="16" cy="-3" r="2" fill="#a4c46a" />
        </g>

        {/* Tierra / suelo */}
        <rect x="0" y="184" width="400" height="56" fill="url(#mfv-soil)" />
        <path d="M0 184 Q100 176 200 182 T400 180 V196 H0 Z" fill="#86a85e" opacity="0.4" />

        {/* Estanque de agua (elemento de finca) */}
        <ellipse cx="62" cy="222" rx="40" ry="10" fill="#67b6d6" opacity="0.85" />
        <ellipse cx="62" cy="220" rx="34" ry="7" fill="#8fcde6" opacity="0.7" />

        {/* Estado vacío: semillita esperando en la tierra */}
        {scene.vacia && !cargando && (
          <g transform="translate(200 198)" className="fv-grow">
            <ellipse cx="0" cy="6" rx="10" ry="6" fill="#8a6a3a" />
            <path d="M0 0 Q-5 -10 0 -18 Q5 -10 0 0" fill="#5bb06e" />
          </g>
        )}

        {/* Cultivos por etapa fenológica real */}
        {!cargando && slots.map((lote, i) => (
          <g
            key={lote.key}
            className={`fv-grow ${i % 2 === 0 ? 'fv-sway' : 'fv-sway-slow'}`}
            transform={`translate(${lote.x} ${lote.y})`}
            style={{ animationDelay: `${Math.min(i * 0.07, 1)}s` }}
          >
            <CropSprite sprite={lote.sprite} growth={lote.growth} />
          </g>
        ))}

        {/* Corral de animales (si los hay) */}
        {!cargando && scene.animales.length > 0 && (
          <g transform="translate(312 196)">
            {/* cerca */}
            <line x1="-6" y1="0" x2="-6" y2="-14" stroke="#8a6a3a" strokeWidth="3" strokeLinecap="round" />
            <line x1="60" y1="0" x2="60" y2="-14" stroke="#8a6a3a" strokeWidth="3" strokeLinecap="round" />
            <line x1="-8" y1="-8" x2="62" y2="-8" stroke="#8a6a3a" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/* Animales (emoji) sobre el corral — accesibles y livianos */}
      {!cargando && scene.animales.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {scene.animales.slice(0, 3).map((a, i) => (
            <span
              key={a.id || `a${i}`}
              className="fv-float absolute select-none"
              style={{ right: `${8 + i * 9}%`, bottom: '14%', fontSize: '1.4rem', animationDelay: `${i * 0.4}s` }}
            >
              {a.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CropSprite — dibuja UNA planta según su sprite (etapa) y crecimiento.
 * Todas las plantas comparten un tronco/tallo que escala con `growth`; el
 * remate (semilla/brote/hoja/flor/fruto/cosecha/árbol) cambia según la fase.
 *
 * @param {Object} props
 * @param {string} props.sprite  seed|sprout|leaf|flower|fruit|harvest|rest|tree
 * @param {number} props.growth  0..1
 */
function CropSprite({ sprite, growth }) {
  const h = 6 + growth * 22; // altura del tallo
  switch (sprite) {
    case 'seed':
      return (
        <>
          <ellipse cx="0" cy="0" rx="7" ry="4" fill="#7a5a32" />
          <path d="M-3 -1 Q0 -4 3 -1" stroke="#8a6a3a" strokeWidth="1" fill="none" />
        </>
      );
    case 'sprout':
      return (
        <>
          <rect x="-1.5" y={-h} width="3" height={h} rx="1.5" fill="#5b8a3c" />
          <path d={`M0 ${-h} Q-7 ${-h - 5} -3 ${-h - 12}`} stroke="#5bb06e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M0 ${-h} Q7 ${-h - 5} 3 ${-h - 12}`} stroke="#5bb06e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case 'rest':
      return (
        <>
          <ellipse cx="0" cy="0" rx="9" ry="4" fill="#6e5634" />
          <path d="M-5 -1 Q0 -6 5 -1" stroke="#8a7" strokeWidth="2" fill="none" opacity="0.6" />
        </>
      );
    case 'tree':
      return (
        <>
          <rect x="-3" y={-h} width="6" height={h} rx="2" fill="#7a5230" />
          <circle cx="0" cy={-h - 10} r="13" fill="#3f8f4e" />
          <circle cx="-8" cy={-h - 4} r="9" fill="#4ca35c" />
          <circle cx="8" cy={-h - 4} r="9" fill="#4ca35c" />
        </>
      );
    case 'leaf':
      return (
        <>
          <rect x="-2" y={-h} width="4" height={h} rx="2" fill="#46985a" />
          <ellipse cx="-6" cy={-h + 6} rx="7" ry="4" fill="#5bb06e" transform={`rotate(-25 -6 ${-h + 6})`} />
          <ellipse cx="6" cy={-h + 10} rx="7" ry="4" fill="#5bb06e" transform={`rotate(25 6 ${-h + 10})`} />
          <ellipse cx="0" cy={-h - 2} rx="6" ry="4" fill="#6cc07e" />
        </>
      );
    case 'flower':
      return (
        <>
          <rect x="-2" y={-h} width="4" height={h} rx="2" fill="#46985a" />
          <ellipse cx="-6" cy={-h + 8} rx="6" ry="4" fill="#5bb06e" transform={`rotate(-25 -6 ${-h + 8})`} />
          <ellipse cx="6" cy={-h + 12} rx="6" ry="4" fill="#5bb06e" transform={`rotate(25 6 ${-h + 12})`} />
          {/* flor */}
          <g transform={`translate(0 ${-h - 2})`}>
            <circle cx="0" cy="-5" r="3.5" fill="#ff9ec4" />
            <circle cx="-4" cy="0" r="3.5" fill="#ff9ec4" />
            <circle cx="4" cy="0" r="3.5" fill="#ff9ec4" />
            <circle cx="0" cy="3" r="3.5" fill="#ff9ec4" />
            <circle cx="0" cy="-1" r="2.5" fill="#ffd24d" />
          </g>
        </>
      );
    case 'fruit':
      return (
        <>
          <rect x="-2" y={-h} width="4" height={h} rx="2" fill="#46985a" />
          <circle cx="0" cy={-h - 4} r="10" fill="#4ca35c" />
          <circle cx="-7" cy={-h + 4} r="7" fill="#5bb06e" />
          <circle cx="7" cy={-h + 4} r="7" fill="#5bb06e" />
          <circle cx="-3" cy={-h - 2} r="3" fill="#ff7a59" />
          <circle cx="4" cy={-h + 2} r="3" fill="#ffb74d" />
        </>
      );
    case 'harvest':
      return (
        <>
          <rect x="-2" y={-h} width="4" height={h} rx="2" fill="#9a8a4a" />
          <circle cx="0" cy={-h - 4} r="11" fill="#5fa84e" />
          <circle cx="-6" cy={-h} r="4" fill="#ff7a59" />
          <circle cx="6" cy={-h - 6} r="4" fill="#ff7a59" />
          <circle cx="0" cy={-h - 10} r="4" fill="#ffb74d" />
          <circle cx="2" cy={-h + 2} r="4" fill="#ff7a59" />
        </>
      );
    default:
      return (
        <>
          <rect x="-1.5" y={-h} width="3" height={h} rx="1.5" fill="#5b8a3c" />
          <circle cx="0" cy={-h - 2} r="5" fill="#5bb06e" />
        </>
      );
  }
}
