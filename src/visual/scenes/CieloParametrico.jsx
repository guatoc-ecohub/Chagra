/*
 * CapaCielo — la CAPA DE CIELO PARAMÉTRICA, compartida por las escenas de finca.
 * Extraída fiel del subcomponente `Sky` de FincaVivaHero (la "capa de cielo
 * compartida por las 3 escenas"): sol que respira de día (bajo y ámbar al
 * amanecer/atardecer), luna con halo + estrellas + estrella fugaz de noche,
 * nubes/niebla/lluvia según el clima real. rsvg-safe (sin filtros: halos por
 * círculos concéntricos, lluvia por trazos), cero JS por frame.
 *
 * El cielo NO lee atributos del DOM: recibe un objeto `cielo` con la atmósfera
 * ya resuelta (`{ luz, condicion, tema }`, misma forma que produce
 * atmosphereService + useTheme). El shell del hero sigue publicando
 * `data-luz`/`data-clima` para su gradiente CSS; esta capa es el arte SVG.
 *
 * Se monta como hijos de un `<svg>` que la escena ya define (con su viewBox):
 * emite su `<defs>` (gradientes del sol, ids únicos por instancia) + el grupo
 * del cielo. Importá `./scenes.css` una vez donde la uses.
 */
import { useId } from 'react';
import { esNoche, esCubierto, tonoLuz } from './_cielo.js';
import './scenes.css';

/**
 * Gradientes del sol — el dorado de mediodía, el ámbar del sol bajo (amanecer/
 * atardecer) y la veladura cálida. Ids parametrizables para repetir sin colisión.
 */
export function CieloDefs({ solId, solWarmId, washId }) {
  return (
    <>
      <radialGradient id={solId} cx="50%" cy="45%" r="60%">
        <stop offset="0" stopColor="#fff3c4" />
        <stop offset="70%" stopColor="#ffe08a" />
        <stop offset="100%" stopColor="#ffd24d" />
      </radialGradient>
      <radialGradient id={solWarmId} cx="50%" cy="45%" r="60%">
        <stop offset="0" stopColor="#fff0c0" />
        <stop offset="60%" stopColor="#ffc266" />
        <stop offset="100%" stopColor="#ff9a4d" />
      </radialGradient>
      {/* veladura cálida del sol bajo — baña la escena al amanecer/atardecer */}
      <linearGradient id={washId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff9a4d" stopOpacity="0.30" />
        <stop offset="55%" stopColor="#ffb35c" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#ffb35c" stopOpacity="0" />
      </linearGradient>
    </>
  );
}

/**
 * Sky — el grupo del cielo (astro + clima). Recibe la geometría del astro
 * (cx, cy, r) para encajar en cada escena, y los ids de los gradientes del sol
 * (los emite `CieloDefs`).
 */
export function Sky({ cielo, cx, cy, r, lluviaY = 150, solId, solWarmId }) {
  const noche = esNoche(cielo);
  const cubierto = esCubierto(cielo);
  const lluvia = cielo?.condicion === 'lluvia';
  const niebla = cielo?.condicion === 'niebla';
  const tono = tonoLuz(cielo);
  const solBajo = tono === 'amanecer' || tono === 'atardecer';
  // Al amanecer/atardecer el sol cuelga más bajo y se enciende en ámbar.
  const cyEf = solBajo ? cy + r * 1.5 : cy;
  const gradSol = solBajo ? `url(#${solWarmId})` : `url(#${solId})`;
  const halo = solBajo ? '#ffb35c' : '#ffe08a';
  return (
    <g aria-hidden="true">
      {noche ? (
        <g className="scn-sky-noche">
          {/* estrellas — constelación generosa, con titileo escalonado */}
          <g fill="#fdf6d8" className="scn-estrellas">
            <circle cx={cx - 120} cy={cy - 14} r="1.4" />
            <circle cx={cx - 88} cy={cy + 22} r="1" />
            <circle cx={cx - 150} cy={cy + 36} r="1.2" />
            <circle cx={cx - 40} cy={cy - 26} r="1" />
            <circle cx={cx + 18} cy={cy + 30} r="1.3" />
            <circle cx={cx - 196} cy={cy + 6} r="1" />
            <circle cx={cx + 30} cy={cy - 10} r="0.9" />
            <circle cx={cx - 244} cy={cy - 22} r="1.1" />
            <circle cx={cx - 270} cy={cy + 30} r="0.9" />
            <circle cx={cx - 172} cy={cy - 30} r="0.8" />
            <circle cx={cx - 64} cy={cy + 44} r="1" />
            <circle cx={cx - 220} cy={cy + 52} r="1.2" />
          </g>
          {/* estrella fugaz ocasional (trazo que cruza y se apaga) */}
          <line
            className="scn-fugaz"
            x1={cx - 210} y1={cy - 28} x2={cx - 174} y2={cy - 12}
            stroke="#fdf6d8" strokeWidth="1.4" strokeLinecap="round"
          />
          {/* luna creciente con halo doble */}
          <g transform={`translate(${cx} ${cy})`}>
            <circle r={r * 1.5} fill="#e8edf7" opacity="0.1" />
            <circle r={r * 0.92} fill="#e8edf7" opacity="0.25" />
            <circle r={r * 0.7} fill="#f4f1e0" />
            <circle cx={r * 0.32} cy={-r * 0.12} r={r * 0.6} fill="#1d2b4a" />
            <circle cx={-r * 0.18} cy={r * 0.14} r={r * 0.07} fill="#dcd6bc" opacity="0.6" />
            <circle cx={-r * 0.3} cy={-r * 0.18} r={r * 0.05} fill="#dcd6bc" opacity="0.5" />
          </g>
        </g>
      ) : (
        <g transform={`translate(${cx} ${cyEf})`}>
          {/* halo exterior suave (respira) + anillo de calor con el sol bajo */}
          <circle r={r * 1.4} fill={halo} opacity={cubierto ? 0.18 : (solBajo ? 0.42 : 0.35)}>
            <animate attributeName="r" values={`${r * 1.4};${r * 1.6};${r * 1.4}`} dur="6s" repeatCount="indefinite" />
          </circle>
          {solBajo && !cubierto && (
            <circle r={r * 2.1} fill="none" stroke={halo} strokeWidth="1.5" opacity="0.3" />
          )}
          <circle r={r} fill={gradSol} opacity={cubierto ? 0.7 : 1} />
        </g>
      )}

      {/* NUBES densas cuando está cubierto — dos masas con brillo superior */}
      {cubierto && (
        <g fill={noche ? '#9aa6bb' : '#f3f6f4'} opacity={noche ? 0.7 : 0.92}>
          <g className="scn-nube-a">
            <ellipse cx={cx - 30} cy={cy + 4} rx="30" ry="14" />
            <ellipse cx={cx - 4} cy={cy} rx="22" ry="14" />
            <ellipse cx={cx - 52} cy={cy} rx="18" ry="12" />
            <ellipse cx={cx - 30} cy={cy - 8} rx="16" ry="10" opacity=".9" />
          </g>
          <g className="scn-nube-b" opacity=".8">
            <ellipse cx={cx - 168} cy={cy + 26} rx="24" ry="11" />
            <ellipse cx={cx - 146} cy={cy + 22} rx="16" ry="10" />
            <ellipse cx={cx - 188} cy={cy + 23} rx="13" ry="9" />
          </g>
        </g>
      )}

      {/* NIEBLA — bancos horizontales que derivan despacio (rsvg-safe). Tres
          alturas: horizonte, media ladera y un velo bajo sobre la escena. */}
      {niebla && (
        <g fill={noche ? '#8b9bb3' : '#ffffff'}>
          <ellipse className="scn-neblina-a" cx={cx - 120} cy={lluviaY + 2} rx="190" ry="22" opacity={noche ? 0.4 : 0.62} />
          <ellipse className="scn-neblina-b" cx={cx - 30} cy={lluviaY + 30} rx="220" ry="18" opacity={noche ? 0.3 : 0.5} />
          <ellipse className="scn-neblina-a" cx={cx - 190} cy={lluviaY + 74} rx="200" ry="20" opacity={noche ? 0.22 : 0.36} />
        </g>
      )}

      {/* LLUVIA — cortina ancha de trazos diagonales en dos alturas
          (rsvg-safe, sin filtros) */}
      {lluvia && (
        <g className="scn-lluvia" stroke={noche ? '#aebfe0' : '#4e7d9a'} strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
          <line x1={cx - 90} y1={lluviaY} x2={cx - 97} y2={lluviaY + 22} />
          <line x1={cx - 50} y1={lluviaY + 8} x2={cx - 57} y2={lluviaY + 30} />
          <line x1={cx - 10} y1={lluviaY} x2={cx - 17} y2={lluviaY + 22} />
          <line x1={cx + 28} y1={lluviaY + 6} x2={cx + 21} y2={lluviaY + 28} />
          <line x1={cx + 64} y1={lluviaY} x2={cx + 57} y2={lluviaY + 22} />
          <line x1={cx - 130} y1={lluviaY + 4} x2={cx - 137} y2={lluviaY + 26} />
          <line x1={cx - 170} y1={lluviaY + 10} x2={cx - 177} y2={lluviaY + 32} />
          <line x1={cx - 210} y1={lluviaY + 2} x2={cx - 217} y2={lluviaY + 24} />
          <line x1={cx - 250} y1={lluviaY + 8} x2={cx - 257} y2={lluviaY + 30} />
          <line x1={cx - 286} y1={lluviaY + 2} x2={cx - 293} y2={lluviaY + 24} />
          <line x1={cx - 70} y1={lluviaY + 34} x2={cx - 77} y2={lluviaY + 56} />
          <line x1={cx - 150} y1={lluviaY + 40} x2={cx - 157} y2={lluviaY + 62} />
          <line x1={cx - 230} y1={lluviaY + 36} x2={cx - 237} y2={lluviaY + 58} />
          <line x1={cx + 10} y1={lluviaY + 42} x2={cx + 3} y2={lluviaY + 64} />
          <line x1={cx + 46} y1={lluviaY + 34} x2={cx + 39} y2={lluviaY + 56} />
        </g>
      )}
    </g>
  );
}

/**
 * Veladura cálida de sol bajo — rect a pantalla completa de la escena que tiñe
 * TODO (cielo, lomas, plantas) de ámbar al amanecer/atardecer, como la luz
 * rasante real. De día/noche no pinta nada.
 */
export function WashSolBajo({ cielo, w = 390, h = 360, washId }) {
  const tono = tonoLuz(cielo);
  if (tono !== 'amanecer' && tono !== 'atardecer') return null;
  return (
    <rect
      x="0" y="0" width={w} height={h}
      fill={`url(#${washId})`}
      opacity={tono === 'atardecer' ? 0.9 : 0.7}
      pointerEvents="none"
    />
  );
}

/**
 * CapaCielo — compone `<defs>` (gradientes del sol, ids únicos por instancia) +
 * el grupo del cielo + la veladura de sol bajo. Se monta como hijos de un `<svg>`
 * que la escena ya define con su viewBox.
 *
 * @param {Object}  props
 * @param {{luz?:string, condicion?:string, tema?:string}} props.cielo  atmósfera resuelta.
 * @param {number}  props.cx        centro X del astro (en coords del viewBox).
 * @param {number}  props.cy        centro Y del astro.
 * @param {number}  props.r         radio del astro.
 * @param {number}  [props.lluviaY] altura desde donde cae la lluvia/niebla (150).
 * @param {number}  [props.w]       ancho de la veladura de sol bajo (390).
 * @param {number}  [props.h]       alto de la veladura de sol bajo (360).
 * @param {boolean} [props.wash]    montar la veladura cálida de sol bajo (true).
 */
export default function CapaCielo({ cielo, cx, cy, r, lluviaY = 150, w = 390, h = 360, wash = true }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const solId = `scn-sol-${uid}`;
  const solWarmId = `scn-sol-warm-${uid}`;
  const washId = `scn-wash-${uid}`;
  return (
    <>
      <defs>
        <CieloDefs solId={solId} solWarmId={solWarmId} washId={washId} />
      </defs>
      <Sky cielo={cielo} cx={cx} cy={cy} r={r} lluviaY={lluviaY} solId={solId} solWarmId={solWarmId} />
      {wash && <WashSolBajo cielo={cielo} w={w} h={h} washId={washId} />}
    </>
  );
}
