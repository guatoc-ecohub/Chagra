/*
 * ArtesaniaAndina.jsx — PRIMITIVAS VISUALES del lenguaje "artesanía andina"
 * (SVG, three-free, montables por props). La data/paleta/generadores viven en
 * `artesaniaAndina.js`; aquí solo componentes (regla react-refresh).
 *
 * CABLEO (para quien integra; nada de esto está montado aún):
 *
 *   · Dentro de una lámina/espejo SVG existente (laminas2d/*): las primitivas
 *     de banda son `<g>` — se posicionan con props x/y y viven dentro del
 *     `<svg>` anfitrión. `<PatronesArtesania>` va UNA vez en el `<defs>` del
 *     anfitrión y habilita fills `url(#artesania-rombos)` etc.
 *
 *   · Standalone (storybook / pantalla de estilo): montar `<ShowcaseArtesania>`
 *     directo — es un `<svg>` completo y autocontenido.
 *
 *   · 3D: este archivo NO importa three. Las escenas consumen los perfiles
 *     (`PERFILES_VASIJA` + `SEGMENTOS_VASIJA`) desde artesaniaAndina.js.
 *
 * Sin apropiación: solo geometría de telar (rombo/escalón/zigzag/franja) y
 * paleta de tintes — ver el límite ético en artesaniaAndina.js.
 */
import {
  ROLES_ANDINOS,
  TRAZO_ANDINO,
  MODULO_TELAR,
  acentoAndino,
  pathRombo,
  pathsRomboAnidado,
  pathZigzag,
  pathGrecaEscalonada,
  lineaQueRespira,
  secuenciaFranjas,
  pathVasija,
  VASIJA_TIPOS,
  PALETA_ANDINA,
} from './artesaniaAndina.js';
import './artesaniaAndina.css';

/** @type {any} */
const trazo = {
  stroke: ROLES_ANDINOS.linea,
  strokeLinecap: TRAZO_ANDINO.cap,
  strokeLinejoin: TRAZO_ANDINO.join,
};

/**
 * <PatronesArtesania> — los `<pattern>` reutilizables (rombos / zigzag /
 * escalonado). Montar UNA vez dentro del `<defs>` del svg anfitrión; después
 * cualquier figura se "teje" con fill={`url(#${prefijo}-rombos)`}.
 * `prefijo` evita colisiones si hay varios svg en pantalla.
 */
export function PatronesArtesania({ prefijo = 'artesania', acento = 0 }) {
  const m = MODULO_TELAR;
  const color = acentoAndino(acento);
  return (
    <>
      <pattern id={`${prefijo}-rombos`} width={m} height={m} patternUnits="userSpaceOnUse">
        <path d={pathRombo(m / 2, m / 2, m * 0.32, m * 0.45)} fill={color} />
        <path d={pathRombo(m / 2, m / 2, m * 0.14, m * 0.2)} fill={ROLES_ANDINOS.fondo} />
      </pattern>
      <pattern id={`${prefijo}-zigzag`} width={m} height={m / 2} patternUnits="userSpaceOnUse">
        <path
          d={pathZigzag({ x: 0, y: m * 0.36, ancho: m, alto: m * 0.22, dientes: 2 })}
          fill="none"
          strokeWidth={TRAZO_ANDINO.fino}
          {...trazo}
          stroke={color}
        />
      </pattern>
      <pattern id={`${prefijo}-escalonado`} width={m * 1.5} height={m} patternUnits="userSpaceOnUse">
        <path d={pathGrecaEscalonada({ x: m * 0.15, y: m * 0.85, paso: m * 0.2, niveles: 3 })} fill={color} />
      </pattern>
    </>
  );
}

/**
 * <BandaChumbe> — banda tejida de rombos anidados (la cinta que remata un
 * marco, un borde de mundo, el cinturón de una criatura). `<g>` posicionable.
 */
export function BandaChumbe({ x = 0, y = 0, ancho = MODULO_TELAR * 8, alto = MODULO_TELAR, acento = 0, conBorde = true }) {
  const n = Math.max(1, Math.round(ancho / (alto * 1.6)));
  const paso = ancho / n;
  const rombos = [];
  for (let i = 0; i < n; i += 1) {
    const cx = paso * (i + 0.5);
    pathsRomboAnidado(cx, alto / 2, paso * 0.44, alto * 0.42, 3).forEach((d, nivel) => {
      rombos.push(
        <path
          key={`${i}-${nivel}`}
          d={d}
          fill={nivel % 2 === 0 ? acentoAndino(acento + nivel + i) : ROLES_ANDINOS.papel}
        />,
      );
    });
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={ancho} height={alto} fill={ROLES_ANDINOS.fondo} />
      {rombos}
      {conBorde && (
        <>
          <path d={lineaQueRespira(0, 0, ancho, 0, { seed: 11 })} fill="none" strokeWidth={TRAZO_ANDINO.grosor} {...trazo} />
          <path d={lineaQueRespira(0, alto, ancho, alto, { seed: 23 })} fill="none" strokeWidth={TRAZO_ANDINO.grosor} {...trazo} />
        </>
      )}
    </g>
  );
}

/**
 * <GrecaEscalonada> — fila de pirámides escalonadas (remate de horizonte,
 * borde inferior de un espejo 2D). `<g>` posicionable.
 */
export function GrecaEscalonada({ x = 0, y = 0, ancho = MODULO_TELAR * 8, paso = 8, niveles = 3, acento = 0 }) {
  const anchoGreca = paso * niveles * 2;
  const n = Math.max(1, Math.floor(ancho / (anchoGreca + paso)));
  const piezas = [];
  for (let i = 0; i < n; i += 1) {
    piezas.push(
      <path
        key={i}
        d={pathGrecaEscalonada({ x: i * (anchoGreca + paso), y: 0, paso, niveles })}
        fill={acentoAndino(acento + i)}
      />,
    );
  }
  return <g transform={`translate(${x} ${y})`}>{piezas}</g>;
}

/**
 * <FranjasMochila> — bloque de franjas rítmicas (fondos de tarjeta, cuerpos
 * de criatura, laderas). Determinista por `seed`. `<g>` posicionable.
 */
export function FranjasMochila({ x = 0, y = 0, ancho = MODULO_TELAR * 6, alto = MODULO_TELAR * 5, seed = 7 }) {
  const franjas = secuenciaFranjas({ alto, seed });
  return (
    <g transform={`translate(${x} ${y})`}>
      {franjas.map((f, i) => (
        <rect key={i} x={0} y={f.y} width={ancho} height={f.alto} fill={f.color} />
      ))}
    </g>
  );
}

/**
 * <MarcoTelar> — el marco de tarjeta/mundo: rectángulo de línea que respira
 * + banda chumbe arriba y greca abajo. Envuelve contenido ajeno (children se
 * pintan en el hueco interior, en coordenadas del marco).
 */
export function MarcoTelar({ x = 0, y = 0, ancho = 320, alto = 200, acento = 0, children }) {
  const banda = MODULO_TELAR * 0.75;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={ancho} height={alto} rx={10} fill={ROLES_ANDINOS.papel} />
      <BandaChumbe x={8} y={6} ancho={ancho - 16} alto={banda} acento={acento} conBorde={false} />
      <GrecaEscalonada x={12} y={alto - 8} ancho={ancho - 24} paso={5} niveles={2} acento={acento + 1} />
      <g transform={`translate(0 ${banda + 10})`}>{children}</g>
      {[0, 1].map((i) => (
        <path
          key={i}
          d={
            i === 0
              ? lineaQueRespira(4, 4, ancho - 4, 4, { seed: 31 }) + ` L ${ancho - 4} ${alto - 4}`
              : lineaQueRespira(ancho - 4, alto - 4, 4, alto - 4, { seed: 43 }) + ` L 4 4`
          }
          fill="none"
          strokeWidth={TRAZO_ANDINO.grosor}
          {...trazo}
        />
      ))}
    </g>
  );
}

/**
 * <VasijaSilueta> — cerámica low-poly en 2D desde el MISMO perfil que usa el
 * lathe 3D (la silueta no diverge entre dimensiones). Con cinturón chumbe
 * opcional en la panza. `tipo`: 'olla' | 'cantaro' | 'cuenco'.
 */
export function VasijaSilueta({ x = 0, y = 0, alto = 64, tipo = 'olla', acento = 0, conCinturon = true }) {
  const d = pathVasija(tipo, { cx: 0, cy: 0, alto });
  const cinturonY = -alto * 0.45;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={d} fill={acentoAndino(acento)} strokeWidth={TRAZO_ANDINO.grosor} {...trazo} />
      {conCinturon && (
        <path
          d={pathZigzag({ x: -alto * 0.36, y: cinturonY, ancho: alto * 0.72, alto: alto * 0.08, dientes: 5 })}
          fill="none"
          opacity={0.9}
          strokeWidth={TRAZO_ANDINO.fino}
          {...trazo}
          stroke={ROLES_ANDINOS.papel}
        />
      )}
    </g>
  );
}

/* Un rótulo pequeño del showcase (estilo compartido). */
function Rotulo({ x, y, children }) {
  return (
    <text x={x} y={y} className="artesania-rotulo">
      {children}
    </text>
  );
}

/**
 * <ShowcaseArtesania> — el muestrario autocontenido del lenguaje de forma:
 * paleta, trazo, patrones, bandas, marco y vasijas. Montable tal cual en un
 * storybook o pantalla de estilo (`<svg>` completo, responsive por viewBox).
 */
export default function ShowcaseArtesania({ ancho = 720 }) {
  const W = 720;
  const H = 560;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={ancho}
      className="artesania-showcase"
      role="img"
      aria-label="Muestrario del lenguaje de forma de la artesania andina"
    >
      <defs>
        <PatronesArtesania prefijo="artesania" />
      </defs>
      <rect width={W} height={H} fill={ROLES_ANDINOS.fondo} rx={16} />

      {/* título con línea que respira */}
      <Rotulo x={24} y={36}>lenguaje de forma — telar andino ✕ rubber-hose</Rotulo>
      <path d={lineaQueRespira(24, 46, W - 24, 46, { ondas: 8, seed: 5 })} fill="none" strokeWidth={TRAZO_ANDINO.grosor} stroke={ROLES_ANDINOS.linea} strokeLinecap="round" />

      {/* fila 1: paleta */}
      {Object.entries(PALETA_ANDINA).map(([nombre, color], i) => (
        <g key={nombre} transform={`translate(${24 + i * 76} 62)`}>
          <rect width={64} height={30} rx={8} fill={color} strokeWidth={TRAZO_ANDINO.fino} stroke={ROLES_ANDINOS.linea} />
          <Rotulo x={0} y={44}>{nombre}</Rotulo>
        </g>
      ))}

      {/* fila 2: bandas tejidas */}
      <Rotulo x={24} y={132}>chumbe (rombos anidados)</Rotulo>
      <BandaChumbe x={24} y={140} ancho={320} alto={30} />
      <Rotulo x={376} y={132}>greca escalonada</Rotulo>
      <GrecaEscalonada x={376} y={170} ancho={320} paso={9} niveles={3} acento={2} />
      <Rotulo x={24} y={204}>zigzag / rombos / escalonado como fill de patron</Rotulo>
      <rect x={24} y={212} width={100} height={56} rx={8} fill="url(#artesania-zigzag)" strokeWidth={TRAZO_ANDINO.fino} stroke={ROLES_ANDINOS.linea} />
      <rect x={134} y={212} width={100} height={56} rx={8} fill="url(#artesania-rombos)" strokeWidth={TRAZO_ANDINO.fino} stroke={ROLES_ANDINOS.linea} />
      <rect x={244} y={212} width={100} height={56} rx={8} fill="url(#artesania-escalonado)" strokeWidth={TRAZO_ANDINO.fino} stroke={ROLES_ANDINOS.linea} />

      {/* fila 2b: franjas */}
      <Rotulo x={376} y={204}>franjas ritmicas (deterministas por seed)</Rotulo>
      <FranjasMochila x={376} y={212} ancho={150} alto={56} seed={7} />
      <FranjasMochila x={546} y={212} ancho={150} alto={56} seed={19} />

      {/* fila 3: marco de tarjeta + medallón que respira */}
      <MarcoTelar x={24} y={292} ancho={320} alto={180} acento={1}>
        <Rotulo x={16} y={30}>marco telar para tarjetas y espejos 2d</Rotulo>
        <g transform="translate(160 92)" className="artesania-respira">
          {pathsRomboAnidado(0, 0, 74, 48, 4).map((d, i) => (
            <path key={i} d={d} fill={i % 2 === 0 ? acentoAndino(i) : ROLES_ANDINOS.papel} strokeWidth={i === 0 ? TRAZO_ANDINO.grosor : 0} stroke={ROLES_ANDINOS.linea} strokeLinejoin="round" />
          ))}
        </g>
      </MarcoTelar>

      {/* fila 3b: vasijas — mismo perfil que el lathe 3D */}
      <Rotulo x={376} y={302}>ceramica low-poly (perfil compartido 2d ↔ 3d)</Rotulo>
      {VASIJA_TIPOS.map((tipo, i) => (
        <g key={tipo}>
          <VasijaSilueta x={430 + i * 110} y={430} alto={96} tipo={tipo} acento={i} />
          <Rotulo x={402 + i * 110} y={452}>{tipo}</Rotulo>
        </g>
      ))}

      {/* pie: greca de cierre */}
      <GrecaEscalonada x={24} y={H - 24} ancho={W - 48} paso={7} niveles={3} acento={3} />
    </svg>
  );
}
