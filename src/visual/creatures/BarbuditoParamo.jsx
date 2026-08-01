import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, RH_INK } from './_rubberhose.jsx';

/*
 * BarbuditoParamo — el CHIVITO DE PÁRAMO (Oxypogon, "barbudito"), en registro
 * RUBBER-HOSE: el hermano de páramo del colibrí de Chagra. Adapta el vocabulario
 * rubber-hose de `Colibri.jsx` (ojos de goma, cachetes, contorno con glow, el
 * borrón de las alas cerniendo) a la especie REAL del páramo, fiel a las
 * referencias del video del operador (barbudito-ventana.mp4) y a los DRs:
 *
 *   - NO es el turquesa del imaginario: es PARDO cálido jaspeado (Oxypogon
 *     guerinii es café, no esmeralda).
 *   - PICO CORTO Y RECTO — su adaptación al páramo (come tanto insecto como
 *     néctar): jamás el pico-espada del colibrí de tierra caliente.
 *   - CRESTA eréctil buff/blanca barrida hacia arriba-atrás (la seña insignia).
 *   - BARBA blanca moteada con una raya VERDE IRIDISCENTE al centro (el
 *     "barbudito" del nombre — la gorguera del macho).
 *   - Cola larga parda; alas en punta que, al cernir/libar, se vuelven BORRÓN
 *     (el ala de un colibrí nunca se ve: se ve el arco que barre — más honesto).
 *
 * Va como BILLBOARD en los mundos 3D (igual que la danta rubber-hose), NUNCA
 * geometría procedural. Registro creatures/ (rubber-hose), no el realista de
 * mundo3d/fauna/ — reusa el MISMO kit compartido (`_rubberhose`, `_filters`,
 * `creatures.css`), cero geometría duplicada.
 *
 * Poses de VIDA:
 *   - 'posa' (base) : posado en el frailejón, alas plegadas, respira, cresta
 *      arriba. El único momento quieto — como en el video real.
 *   - 'liba'        : se inclina a la corola, mete el pico, saca la lengua y las
 *      alas pasan a BORRÓN (se sostiene cerniendo mientras liba).
 *
 * Español colombiano. Decorativo → aria-hidden salvo que se le dé `title`.
 */

const VIEWBOX = '0 0 120 104';

/* La paleta parda del páramo (misma que el barbudito ilustrado de la PWA, para
   que sea EL MISMO bicho en toda Chagra): pardo cálido, ala oscura, cresta buff,
   barba blanca, raya verde iridiscente. Nada de turquesa/violeta. */
const PAL = {
  cuerpo: '#8c6238',
  cuerpoClaro: '#a87a4e',
  cuerpoHondo: '#6e4a28',
  ala: '#5a3d22',
  alaBorde: '#3a2614',
  cola: '#4f351d',
  cresta: '#d8c199',
  crestaBorde: '#9a7c4e',
  barba: '#f4efe4',
  barbaMota: '#9aa78f',
  iris0: '#4bd6b4',
  iris1: '#1c7a44',
  pico: '#241811',
  vientre: '#c8a86e',
};

export function BarbuditoParamo({
  size = 96,
  className = '',
  animated = true,
  pose = 'posa',
  title,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `bp-glow-${uid}`;
  const blur = `bp-blur-${uid}`;
  const vivo = animated;
  const libando = pose === 'liba';

  // Animaciones propias, autocontenidas y con nombres únicos por instancia (no
  // dependen de clases externas): aleteo-borrón al libar, respiro al posar,
  // parpadeo lo aporta el kit (OjosRubber). reduced-motion (animated=false) las
  // apaga enteras.
  const css = `
    .bp-${uid} { transform-box: fill-box; }
    .bp-${uid} .bp-cuerpo { transform-origin: 60px 60px; }
    ${vivo ? `.bp-${uid}[data-pose='posa'] .bp-cuerpo { animation: bp-respira-${uid} 3.4s ease-in-out infinite; }` : ''}
    ${vivo ? `.bp-${uid}[data-pose='liba'] .bp-cuerpo { animation: bp-cierne-${uid} 0.9s ease-in-out infinite; }` : ''}
    .bp-${uid} .bp-ala-borron { opacity: 0; transform-origin: 60px 50px; }
    ${vivo ? `.bp-${uid}[data-pose='liba'] .bp-ala-borron { opacity: 1; animation: bp-bate-${uid} 0.14s linear infinite; }` : ''}
    .bp-${uid} .bp-ala-plegada { opacity: 1; }
    .bp-${uid}[data-pose='liba'] .bp-ala-plegada { opacity: 0.25; }
    .bp-${uid} .bp-lengua { opacity: 0; }
    ${vivo ? `.bp-${uid}[data-pose='liba'] .bp-lengua { opacity: 1; animation: bp-lame-${uid} 0.18s ease-in-out infinite; }` : `.bp-${uid}[data-pose='liba'] .bp-lengua { opacity: 1; }`}
    .bp-${uid} .bp-cresta { transform-origin: 84px 36px; }
    ${vivo ? `.bp-${uid} .bp-cresta { animation: bp-cresta-${uid} 4.7s ease-in-out infinite; }` : ''}
    @keyframes bp-respira-${uid} { 0%,100% { transform: scaleY(1) translateY(0); } 50% { transform: scaleY(1.035) translateY(-0.8px); } }
    @keyframes bp-cierne-${uid} { 0%,100% { transform: translateY(0) rotate(0.6deg); } 50% { transform: translateY(-1.4px) rotate(-0.4deg); } }
    @keyframes bp-bate-${uid} { 0% { transform: scaleX(1) scaleY(0.86); } 50% { transform: scaleX(0.72) scaleY(1.08); } 100% { transform: scaleX(1) scaleY(0.86); } }
    @keyframes bp-lame-${uid} { 0%,100% { transform: scaleX(0.4); } 50% { transform: scaleX(1); } }
    @keyframes bp-cresta-${uid} { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg); } }
    @media (prefers-reduced-motion: reduce) {
      .bp-${uid} .bp-cuerpo, .bp-${uid} .bp-ala-borron, .bp-${uid} .bp-lengua, .bp-${uid} .bp-cresta { animation: none !important; }
      .bp-${uid}[data-pose='liba'] .bp-ala-borron { opacity: 0.85; }
    }
  `;

  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={(size * 104) / 120}
      className={`bp-${uid} ${className}`.trim()}
      data-creature="barbudito"
      data-pose={vivo ? pose : 'posa'}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      {...rest}
    >
      {title && <title>{title}</title>}
      <style>{css}</style>
      <defs>
        <CreatureFilters glow={glow} blur={blur} />
        <linearGradient id={`bp-cuerpo-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PAL.cuerpoClaro} />
          <stop offset="55%" stopColor={PAL.cuerpo} />
          <stop offset="100%" stopColor={PAL.cuerpoHondo} />
        </linearGradient>
        <linearGradient id={`bp-ala-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PAL.ala} />
          <stop offset="100%" stopColor={PAL.alaBorde} />
        </linearGradient>
        <linearGradient id={`bp-iris-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PAL.iris0} />
          <stop offset="100%" stopColor={PAL.iris1} />
        </linearGradient>
      </defs>

      <g className="bp-cuerpo" filter={`url(#${glow})`}>
        {/* COLA larga parda en abanico, hacia atrás-abajo (izquierda) */}
        <path
          d="M40 66 L18 66 L28 72 L14 80 L30 78 L24 88 L46 74 Z"
          fill={PAL.cola}
          stroke={RH_INK}
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* ALA plegada sobre el lomo (pose posada) */}
        <g className="bp-ala-plegada">
          <path
            d="M50 52 Q34 46 22 56 Q36 62 56 58 Z"
            fill={`url(#bp-ala-${uid})`}
            stroke={RH_INK}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>

        {/* CUERPO pardo jaspeado (gota, contorno grueso rubber-hose) */}
        <ellipse
          cx="58"
          cy="58"
          rx="25"
          ry="15"
          fill={`url(#bp-cuerpo-${uid})`}
          stroke={RH_INK}
          strokeWidth="1.6"
          transform="rotate(-14 58 58)"
        />
        {/* vientre claro */}
        <path d="M40 62 Q56 70 76 62 Q60 74 42 66 Z" fill={PAL.vientre} opacity="0.6" />
        {/* jaspeado del pecho (pintitas claras) */}
        <g fill="#e8d8be" opacity="0.5">
          <circle cx="50" cy="60" r="1.4" /><circle cx="57" cy="63" r="1.2" />
          <circle cx="64" cy="60" r="1.3" /><circle cx="60" cy="56" r="1.1" />
          <circle cx="53" cy="55" r="1" /><circle cx="68" cy="63" r="1.1" />
        </g>

        {/* CABEZA parda, contorno rubber-hose */}
        <circle cx="86" cy="46" r="11.5" fill={`url(#bp-cuerpo-${uid})`} stroke={RH_INK} strokeWidth="1.4" />
        {/* antifaz más oscuro sobre el ojo (rasgo del barbudito) */}
        <path d="M80 42 Q88 38 96 44 Q90 49 82 48 Z" fill={PAL.cuerpoHondo} opacity="0.65" />

        {/* CRESTA eréctil buff barrida arriba-atrás (la seña insignia) */}
        <g className="bp-cresta" fill={PAL.cresta} stroke={PAL.crestaBorde} strokeWidth="0.6" strokeLinejoin="round">
          <path d="M81 38 Q78 25 75 15 Q83 23 85 37 Z" />
          <path d="M84 37 Q84 22 85 12 Q90 23 88 37 Z" />
          <path d="M88 37 Q90 23 95 16 Q95 26 92 38 Z" />
          <path d="M91 39 Q96 29 100 24 Q99 33 94 40 Z" />
        </g>

        {/* BARBA blanca moteada (la "barba" del nombre) colgando de la garganta */}
        <path d="M77 51 Q84 66 93 53 Q88 60 79 59 Z" fill={PAL.barba} stroke={PAL.barbaMota} strokeWidth="0.4" />
        <g fill={PAL.barbaMota} opacity="0.7">
          <circle cx="81" cy="54" r="0.9" /><circle cx="85" cy="56" r="0.9" />
          <circle cx="83" cy="52" r="0.8" /><circle cx="87" cy="54" r="0.8" />
        </g>
        {/* raya VERDE IRIDISCENTE al centro de la gorguera */}
        <path d="M82 52 Q85 59 89 53 Q86 58 83 57 Z" fill={`url(#bp-iris-${uid})`} opacity="0.95" />

        {/* PICO CORTO y RECTO (nada de pico-espada) */}
        <path d="M96 48 L110 50" fill="none" stroke={PAL.pico} strokeWidth="2.2" strokeLinecap="round" />
        {/* LENGUA que asoma más allá del pico al libar */}
        <g className="bp-lengua" style={{ transformOrigin: '110px 50px' }}>
          <path d="M110 50 L117 50.6" fill="none" stroke="#d98a8f" strokeWidth="1.1" strokeLinecap="round" />
        </g>

        {/* OJO de goma (kit rubber-hose): la mirada al frente-arriba (a la flor) */}
        <OjosRubber ojos={[{ cx: 87, cy: 44, r: 3.2 }]} mirar={[0.42, -0.1]} parpadea={vivo} />
        {/* chapeta cálida bajo el ojo */}
        <Cachetes puntos={[{ cx: 82, cy: 49, r: 1.5 }]} vivo={vivo} />

        {/* ALA-BORRÓN al cernir/libar: el arco que barre, translúcido (dos capas
            que baten en contrafase — el ala de un colibrí es un borrón, no un ala) */}
        <g className="bp-ala-borron" fill={`url(#bp-ala-${uid})`} opacity="0" filter={`url(#${blur})`}>
          <path d="M56 50 Q34 26 12 40 Q30 56 60 52 Z" opacity="0.55" />
          <path d="M56 52 Q36 66 16 74 Q34 62 60 56 Z" opacity="0.4" />
        </g>
      </g>
    </svg>
  );
}

export default BarbuditoParamo;
