/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/*
 * VistaGlobalPisos — el zoom GRANDE de la navegación por pisos térmicos.
 *
 * LA LÁMINA: adaptación ilustrada (estilo lámina de Humboldt, nunca
 * fotorrealista) del paisaje de referencia del operador — montañas en CAPAS
 * con perspectiva aérea (oscuro adelante, azul-niebla atrás) y el NEVADO
 * nítido al fondo. Sobre ese paisaje, los CUATRO pisos térmicos como bandas
 * de altitud (cálido en el valle → páramo en la cima) con su eje de altitud
 * al margen, como el Tableau Physique del Chimborazo.
 *
 * EL APORTE AL PAISAJE (palabras del operador): el PÁRAMO y la vista de LA
 * CHORRERA van ARRIBA, cerca del nevado — la cascada cae del páramo, los
 * frailejones peinan la niebla. Es nuestro pedazo dentro de esa foto.
 *
 * Cada mundo de Chagra es una ESTAMPA (medallón) ubicada en su banda; tocarla
 * navega a su pantalla real. El dato mundo→piso NO vive aquí: lo comparten
 * los tres zooms desde `pisosNavegacion.js` (coherencia total).
 *
 * Todo es SVG dibujado (cero assets externos, offline-first). El paisaje se
 * genera con un RNG sembrado (mulberry32) → determinista, misma lámina en
 * cada carga. Animación sutil (niebla que respira, agua que cae) apagada con
 * prefers-reduced-motion.
 */
import { useEffect, useMemo } from 'react';
import { BANDAS_NAVEGACION, mundosPorBanda } from './pisosNavegacion.js';
import { GlifoEnt, Frailejon } from './glifosNavegacion.jsx';

/* ── RNG sembrado (mulberry32): paisaje determinista, sin Math.random ────── */
function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function siguiente() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANCHO = 1600;
const ALTO = 1000;

/* Eje de altitud: 0 m en el valle (y=940) → 4200 m en la cima (y=310). */
const Y_BASE = 940;
const Y_CIMA = 310;
function yDeAltitud(metros) {
  const cima = BANDAS_NAVEGACION[BANDAS_NAVEGACION.length - 1].altMax;
  return Y_BASE - (metros / cima) * (Y_BASE - Y_CIMA);
}

/* Una cresta de montaña suave: puntos con jitter sembrado + curvas Q. */
function crestaSuave(rng, yCresta, amplitud, nPuntos = 9) {
  const puntos = [];
  for (let i = 0; i <= nPuntos; i += 1) {
    const x = (i / nPuntos) * ANCHO;
    const y = yCresta + (rng() - 0.5) * 2 * amplitud;
    puntos.push([x, y]);
  }
  let d = `M ${-40} ${puntos[0][1].toFixed(1)}`;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const [x1, y1] = puntos[i];
    const [x2, y2] = puntos[i + 1];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    d += ` Q ${x1.toFixed(1)} ${y1.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const ultimo = puntos[puntos.length - 1];
  d += ` L ${ANCHO + 40} ${ultimo[1].toFixed(1)} L ${ANCHO + 40} ${ALTO + 40} L ${-40} ${ALTO + 40} Z`;
  return d;
}

/* La cordillera nevada del fondo: picos AGUDOS (L, no Q) + manto de nieve. */
function nevado(rng) {
  const nPicos = 16;
  const cresta = [];
  for (let i = 0; i <= nPicos; i += 1) {
    const x = (i / nPicos) * ANCHO;
    const pico = i % 2 === 0;
    const y = (pico ? 210 : 292) + (rng() - 0.5) * 58;
    cresta.push([x, y]);
  }
  const linea = cresta.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ');
  const roca = `M -40 ${cresta[0][1]} L ${linea} L ${ANCHO + 40} ${cresta[nPicos][1]} L ${ANCHO + 40} 430 L -40 430 Z`;
  // El manto de nieve: la misma cresta, cerrada contra una línea de nieve dentada.
  const nieveBajo = [];
  for (let i = nPicos; i >= 0; i -= 1) {
    const [x, y] = cresta[i];
    nieveBajo.push(`${x.toFixed(1)} ${(y + 34 + rng() * 30).toFixed(1)}`);
  }
  const nieve = `M -40 ${cresta[0][1]} L ${linea} L ${ANCHO + 40} ${cresta[nPicos][1]} L ${nieveBajo.join(' L ')} Z`;
  return { roca, nieve };
}

/*
 * Las CAPAS del paisaje, de atrás (alto, pálido por la niebla) hacia adelante
 * (bajo, oscuro): la perspectiva aérea de la foto, en paleta de lámina.
 * Cada cresta cae dentro de la banda térmica que le corresponde.
 */
const CAPAS = [
  { seed: 11, y: 356, amp: 26, color: '#8fa9b8' }, // páramo alto, contra el nevado
  { seed: 23, y: 432, amp: 30, color: '#7e9aa4' }, // páramo bajo (aquí cae la Chorrera)
  { seed: 37, y: 516, amp: 30, color: '#65897b' }, // frío alto
  { seed: 41, y: 592, amp: 32, color: '#527a62' }, // frío bajo
  { seed: 53, y: 668, amp: 30, color: '#4d7141' }, // templado alto
  { seed: 67, y: 744, amp: 30, color: '#3f5e31' }, // templado bajo
  { seed: 79, y: 822, amp: 26, color: '#37502a' }, // cálido: la loma del valle
];

/* Ajuste fino ARTÍSTICO por mundo (dx, dy) sobre la posición calculada de su
   banda — solo estética; si un mundo no está, cae en la posición automática. */
const AJUSTE_ESTAMPA = {
  clima: [-170, -46],
  agua: [150, 8],
  suelo: [-60, 26],
  cafe: [30, -20],
  micorrizas: [40, 30],
  valle: [-30, 22],
  mercado: [20, -14],
  milpa: [30, 18],
};

/* Una estampa de mundo: medallón clicable de lámina, con su etiqueta. */
function EstampaMundo({ mundo, x, y, color, actual, onNavigate }) {
  const activar = () => onNavigate?.(mundo);
  return (
    <g
      className="navg-estampa"
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`Ir a ${mundo.titulo}`}
      onClick={activar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activar();
        }
      }}
    >
      {actual && <circle r="42" fill="none" stroke="#e5b54a" strokeWidth="3" className="navg-aqui" />}
      <circle r="31" fill="#f7f0dd" stroke={color} strokeWidth="3" />
      <circle r="26" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
      <text y="9" textAnchor="middle" fontSize="26" aria-hidden="true">
        {mundo.emoji}
      </text>
      <text
        y="52"
        textAnchor="middle"
        fontSize="15"
        fontStyle="italic"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill="#20261c"
        stroke="#f2ead4"
        strokeWidth="4"
        paintOrder="stroke"
      >
        {mundo.titulo}
      </text>
      {actual && (
        <text
          y="70"
          textAnchor="middle"
          fontSize="12.5"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#8a6a1f"
          stroke="#f7f0dd"
          strokeWidth="4"
          paintOrder="stroke"
        >
          ★ Usted está aquí
        </text>
      )}
    </g>
  );
}

/**
 * @param {object} props
 * @param {string|null} [props.mundoActual] id del mundo donde está el usuario
 * @param {(mundo: {id:string, destino:{view:string, data?:object}}) => void} [props.onNavigate]
 * @param {() => void} [props.onCerrar]  volver al minimapa
 * @param {() => void} [props.onMapa]    saltar al zoom medio (mapa estratégico)
 */
export default function VistaGlobalPisos({ mundoActual = null, onNavigate, onCerrar, onMapa }) {
  // Paisaje determinista: crestas, nevado y frailejones se calculan una vez.
  const paisaje = useMemo(() => {
    const capas = CAPAS.map((c) => ({ ...c, d: crestaSuave(mulberry32(c.seed), c.y, c.amp) }));
    const cordillera = nevado(mulberry32(101));
    const rngF = mulberry32(202);
    const frailejones = Array.from({ length: 9 }, (_, i) => ({
      x: 150 + i * 150 + rngF() * 80,
      y: 396 + rngF() * 66,
      escala: 0.8 + rngF() * 0.5,
    }));
    return { capas, cordillera, frailejones };
  }, []);

  // Estampas: posición por banda (reparto horizontal determinista + ajuste fino).
  const estampas = useMemo(() => {
    const grupos = mundosPorBanda();
    const out = [];
    grupos.forEach(({ banda, mundos }) => {
      const yCentro = (yDeAltitud(banda.altMin) + yDeAltitud(banda.altMax)) / 2;
      const n = mundos.length;
      mundos.forEach((mundo, i) => {
        const x = 210 + ((i + 0.5) / n) * (ANCHO - 420);
        const y = yCentro + (i % 2 === 0 ? -18 : 22);
        const [dx, dy] = AJUSTE_ESTAMPA[mundo.id] || [0, 0];
        out.push({ mundo, banda, x: x + dx, y: y + dy });
      });
    });
    return out;
  }, []);

  // ESC vuelve al minimapa.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCerrar?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  return (
    <div className="navg-global" role="dialog" aria-label="Vista global de la finca por pisos térmicos">
      <style>{`
        .navg-global { position: fixed; inset: 0; z-index: 1200; background: #0d1522; }
        .navg-global svg { display: block; width: 100%; height: 100%; }
        .navg-estampa { cursor: pointer; }
        .navg-estampa:hover circle:nth-of-type(2), .navg-estampa:focus-visible circle:nth-of-type(2) { stroke-width: 5; }
        .navg-estampa:focus-visible { outline: none; }
        .navg-aqui { animation: navg-pulso 2.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .navg-niebla { animation: navg-respira 9s ease-in-out infinite; }
        .navg-agua-caida { stroke-dasharray: 10 7; animation: navg-cae 1.6s linear infinite; }
        .navg-botones { position: absolute; top: 14px; right: 14px; display: flex; gap: 8px; }
        .navg-boton { border: 1.5px solid #cdbf9b; background: rgba(26, 32, 27, 0.82); color: #f2ead4;
          font: 600 14px 'Baloo 2', Georgia, serif; padding: 8px 14px; border-radius: 999px; cursor: pointer; }
        .navg-boton:hover { background: rgba(58, 66, 52, 0.92); }
        @keyframes navg-pulso { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.55; } }
        @keyframes navg-respira { 0%, 100% { opacity: 0.34; } 50% { opacity: 0.16; } }
        @keyframes navg-cae { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -34; } }
        @media (prefers-reduced-motion: reduce) {
          .navg-aqui, .navg-niebla, .navg-agua-caida { animation: none; }
        }
      `}</style>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="navg-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bcd6e6" />
            <stop offset="0.65" stopColor="#dbe4dd" />
            <stop offset="1" stopColor="#e8dfc8" />
          </linearGradient>
          <linearGradient id="navg-niebla-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef3f2" stopOpacity="0.9" />
            <stop offset="1" stopColor="#eef3f2" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="navg-agua-valle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9db8a8" />
            <stop offset="1" stopColor="#5d7f74" />
          </linearGradient>
          <filter id="navg-borroso" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* ── EL CIELO y la cordillera nevada, nítida al fondo (la foto) ── */}
        <rect width={ANCHO} height={ALTO} fill="url(#navg-cielo)" />
        <ellipse cx="360" cy="118" rx="200" ry="26" fill="#f4f7f8" opacity="0.75" filter="url(#navg-borroso)" />
        <ellipse cx="1220" cy="86" rx="260" ry="30" fill="#f4f7f8" opacity="0.65" filter="url(#navg-borroso)" />
        <path d={paisaje.cordillera.roca} fill="#7d93a2" />
        <path d={paisaje.cordillera.nieve} fill="#f6fafc" />

        {/* ── LAS CAPAS: perspectiva aérea, pálido atrás → oscuro adelante ── */}
        {paisaje.capas.map((capa, i) => (
          <g key={capa.seed}>
            <path d={capa.d} fill={capa.color} />
            {i < paisaje.capas.length - 1 && (
              <rect
                className="navg-niebla"
                x="0"
                y={capa.y + 16}
                width={ANCHO}
                height="72"
                fill="url(#navg-niebla-grad)"
                opacity={0.32 - i * 0.03}
                style={{ animationDelay: `${i * 1.3}s` }}
              />
            )}
          </g>
        ))}

        {/* Rayos de luz entre crestas (la niebla iluminada de la foto). */}
        <polygon points="180,150 320,150 700,1000 380,1000" fill="#f2ead4" opacity="0.07" />
        <polygon points="900,120 1010,120 1420,1000 1180,1000" fill="#f2ead4" opacity="0.06" />

        {/* ── EL VALLE CÁLIDO al pie: campos dorados y el agua que llega ── */}
        <path
          d={`M -40 ${ALTO} L -40 905 Q 300 872 640 900 Q 1000 926 1640 892 L 1640 ${ALTO} Z`}
          fill="#8c7a3d"
        />
        <path d="M -40 968 Q 400 934 820 958 Q 1200 978 1640 950 L 1640 1000 L -40 1000 Z" fill="url(#navg-agua-valle)" opacity="0.9" />
        <path d="M 240 918 q 60 -14 130 -4 q -50 22 -130 4 Z" fill="#cba04a" opacity="0.8" />
        <path d="M 980 924 q 74 -16 150 -2 q -64 24 -150 2 Z" fill="#cba04a" opacity="0.75" />
        <path d="M 1330 900 q 60 -12 120 -2 q -48 20 -120 2 Z" fill="#b5913f" opacity="0.7" />

        {/* ── NUESTRO APORTE, arriba junto al nevado: el páramo y LA CHORRERA ── */}
        <g aria-hidden="true">
          {/* La peña de la cascada: un tajo de roca en la capa del páramo bajo. */}
          <path d="M 985 402 L 1075 396 L 1092 520 L 968 526 Z" fill="#5c7280" />
          <path d="M 1002 402 L 1022 400 L 1030 520 L 1006 522 Z" fill="#46596a" opacity="0.55" />
          {/* El agua que cae: dos hebras blancas con caída animada. */}
          <path className="navg-agua-caida" d="M 1024 402 C 1020 440 1030 470 1022 516" stroke="#f3f8f9" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path className="navg-agua-caida" d="M 1040 404 C 1042 442 1034 472 1044 514" stroke="#e8f1f3" strokeWidth="5" fill="none" strokeLinecap="round" style={{ animationDelay: '0.6s' }} />
          <ellipse cx="1032" cy="522" rx="40" ry="12" fill="#eef5f6" opacity="0.85" filter="url(#navg-borroso)" />
          {/* La quebrada que sigue ladera abajo, piso por piso, hasta el valle. */}
          <path
            d="M 1032 524 C 1010 570 1090 610 1052 660 C 1020 704 1090 750 1044 800 C 1010 844 1060 900 1020 952"
            stroke="#cfe3e4"
            strokeWidth="4"
            fill="none"
            opacity="0.65"
            strokeLinecap="round"
          />
          {/* Los frailejones del páramo, peinando la niebla junto a la cascada. */}
          {paisaje.frailejones.map((f, i) => (
            <Frailejon key={i} x={f.x} y={f.y} escala={f.escala} />
          ))}
        </g>
        {/* Rótulo de lámina de la Chorrera, con su línea de anotación. */}
        <g fontFamily="Georgia, 'Times New Roman', serif">
          <line x1="1105" y1="446" x2="1188" y2="418" stroke="#2c3a40" strokeWidth="1" opacity="0.75" />
          <text x="1194" y="414" fontSize="19" fontStyle="italic" fill="#273338" stroke="#e9e7d4" strokeWidth="4" paintOrder="stroke">
            La Chorrera
          </text>
          <text x="1194" y="434" fontSize="13" fill="#41525a" stroke="#e9e7d4" strokeWidth="3.6" paintOrder="stroke">
            el agua nace en el páramo
          </text>
        </g>

        {/* ── EL EJE DE HUMBOLDT: la escala de altitud y sus bandas ── */}
        <g fontFamily="Georgia, 'Times New Roman', serif">
          <line x1="86" y1={Y_CIMA - 8} x2="86" y2={Y_BASE + 8} stroke="#2f3b33" strokeWidth="1.6" opacity="0.85" />
          {BANDAS_NAVEGACION.map((banda) => {
            const yTop = yDeAltitud(banda.altMax);
            const yBot = yDeAltitud(banda.altMin);
            return (
              <g key={banda.id}>
                <line x1="80" y1={yBot} x2="92" y2={yBot} stroke="#2f3b33" strokeWidth="1.6" />
                <rect x="94" y={yTop} width="7" height={yBot - yTop} fill={banda.color} opacity="0.9" rx="2" />
                <text x="110" y={(yTop + yBot) / 2 - 8} fontSize="20" fontWeight="bold" letterSpacing="2" fill="#243029" stroke="#e6e3cf" strokeWidth="4.5" paintOrder="stroke">
                  {banda.nombre.toUpperCase()}
                </text>
                <text x="110" y={(yTop + yBot) / 2 + 14} fontSize="14" fontStyle="italic" fill="#3c4a40" stroke="#e6e3cf" strokeWidth="4" paintOrder="stroke">
                  {banda.rango} · {banda.emojiCultivo} {banda.cultivo === 'frailejon' ? 'frailejón' : banda.cultivo}
                </text>
                <text x="46" y={yBot + 5} fontSize="13" textAnchor="end" fill="#2f3b33" stroke="#dfe4dd" strokeWidth="3.4" paintOrder="stroke">
                  {banda.altMin} m
                </text>
                {/* El Ent guardián marca su banda, al borde derecho de la lámina. */}
                <g transform={`translate(${ANCHO - 74} ${(yTop + yBot) / 2 - 6})`} aria-hidden="true">
                  <GlifoEnt entId={banda.entId} color={banda.color} />
                </g>
                <text x={ANCHO - 74} y={(yTop + yBot) / 2 + 40} textAnchor="middle" fontSize="12.5" fontStyle="italic" fill="#2f3b33" stroke="#dfe4dd" strokeWidth="3.4" paintOrder="stroke">
                  {banda.entNombre}
                </text>
              </g>
            );
          })}
          <text x="46" y={Y_CIMA + 3} fontSize="13" textAnchor="end" fill="#2f3b33" stroke="#dfe4dd" strokeWidth="3.4" paintOrder="stroke">
            4200 m
          </text>
        </g>

        {/* ── LAS ESTAMPAS: cada mundo en su banda (mismo dato en los 3 zooms) ── */}
        {estampas.map(({ mundo, banda, x, y }) => (
          <EstampaMundo
            key={mundo.id}
            mundo={mundo}
            x={x}
            y={y}
            color={banda.color}
            actual={mundo.id === mundoActual}
            onNavigate={onNavigate}
          />
        ))}

        {/* ── LA CARTELA de la lámina ── */}
        <g fontFamily="Georgia, 'Times New Roman', serif">
          <rect x={ANCHO / 2 - 285} y="26" width="570" height="86" rx="6" fill="#f4edda" opacity="0.94" />
          <rect x={ANCHO / 2 - 285} y="26" width="570" height="86" rx="6" fill="none" stroke="#6d6448" strokeWidth="1.6" />
          <rect x={ANCHO / 2 - 279} y="32" width="558" height="74" rx="4" fill="none" stroke="#6d6448" strokeWidth="0.8" opacity="0.7" />
          <text x={ANCHO / 2} y="62" textAnchor="middle" fontSize="26" fontWeight="bold" letterSpacing="3" fill="#2c2a1e">
            LA FINCA POR PISOS TÉRMICOS
          </text>
          <text x={ANCHO / 2} y="90" textAnchor="middle" fontSize="15" fontStyle="italic" fill="#4a4633">
            del valle cálido al páramo — toque un mundo para entrar
          </text>
        </g>
      </svg>

      <div className="navg-botones">
        {onMapa && (
          <button type="button" className="navg-boton" onClick={onMapa} aria-label="Abrir el mapa de la finca">
            🗺️ Mapa de la finca
          </button>
        )}
        {onCerrar && (
          <button type="button" className="navg-boton" onClick={onCerrar} aria-label="Cerrar la vista global">
            ✕ Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
