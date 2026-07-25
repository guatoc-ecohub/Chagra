/*
 * i18n (ADR-050): copy de navegación del home en español Colombia, pendiente
 * de migrar a src/config/messages.js — mismo criterio que MundosDeMiFinca.
 */
 
/**
 * ArbolDeMundos — el MENÚ-ÁRBOL ORGÁNICO del home biopunk (pieza del mockup
 * final aprobado #/mockups/avatar-biopunk, "El Espíritu de tu Finca"):
 * los mundos de la finca como RAMAS VIVAS que brotan del corazón-semilla,
 * cada rama termina en una VAINA (membrana + núcleo + glifo) que es la
 * ENTRADA a su mundo, con glow neón y savia fluyendo.
 *
 * NO es navegación huérfana ni paralela: la fuente única de mundos y rutas es
 * mundosFinca.js (la MISMA del menú vivo MundosDeMiFinca) y cada vaina navega
 * EXACTO igual que su tarjeta: portada → onNavigate(portada) · directo →
 * onNavigate(view, data) · resto → onNavigate('mundo', { mundo: id }).
 * La grilla de tarjetas queda INTACTA justo debajo (fallback simple y
 * contrato de reachability): el árbol es la vista rica del tema biopunk.
 *
 * GROUNDED — las ramas dependen de lo que la finca real tiene:
 *   · el mundo Animales solo brota si el perfil lo tiene (mismo gate
 *     `mostrarAnimales` de DashboardLive: un urbano de balcón no lo ve);
 *   · la rama de Cultivos muestra el conteo REAL de matas sembradas
 *     (useAssetStore.plants vía prop, el mismo sello de la grilla);
 *   · al pie, el RELOJ DEL FRAILEJÓN cuenta los años REALES de la finca en
 *     Chagra (un anillo por año — fincaClockService, nunca inventa historia).
 *
 * Solo se monta con la piel biopunk (biopunk / biopunk2, la default); en los
 * demás temas devuelve null y el home queda como está. Accesibilidad: cada
 * vaina es role=button con Enter/Espacio, target grande (hit-area invisible
 * r=30 ≈ 60px en móvil) y foco visible; todas las animaciones viven en
 * arbol-de-mundos.css y respetan prefers-reduced-motion (estado estático
 * digno, misma receta que SceneFincaOrganismo). SVG rsvg-safe (sin
 * foreignObject), cero JS por frame.
 *
 * @param {Object} props
 * @param {(view: string, data?: any) => void} props.onNavigate
 * @param {boolean} [props.mostrarAnimales] gate por perfil del mundo Animales.
 * @param {number} [props.plantsCount] matas sembradas reales (sello vivo).
 */
import { MUNDOS_FINCA } from './mundosFinca';
import { useTheme, resolveAutoTheme, BASE_SKIN_THEMES } from '../../hooks/useTheme';
import RelojFrailejon from './RelojFrailejon';
import './arbol-de-mundos.css';

/* ── Coreografía del árbol (viewBox 390×800) ──────────────────────────────
 * Cada mundo tiene su lugar en la copa (o en la raíz): `node` = dónde vive
 * la vaina, `origen` = de qué punto del tronco brota su rama, `s` = escala
 * (profundidad: arriba lejos/pequeño, abajo cerca/grande), `acc` = acento
 * neón propio, `raiz` = brota bajo tierra (suelo vivo, abono).
 * Los ids son los del manifiesto mundosFinca.js; un mundo futuro sin lugar
 * propio cae a un SLOT de reserva sobre el tronco (nunca queda huérfano). */
const LAYOUT = {
  cana: { node: [195, 92], origen: [195, 150], s: 0.86, acc: '#d8ff6a' },
  clima: { node: [320, 96], origen: [195, 178], s: 0.86, acc: '#b28dff' },
  cultivos: { node: [64, 128], origen: [195, 210], s: 1.12, acc: '#9dff3f' },
  mercado: { node: [304, 188], origen: [195, 254], s: 0.9, acc: '#ffb54f' },
  sanidad: { node: [122, 212], origen: [195, 270], s: 0.9, acc: '#ff4fd8' },
  disenio: { node: [336, 278], origen: [195, 332], s: 0.94, acc: '#2dffc4' },
  botica: { node: [52, 292], origen: [195, 346], s: 0.94, acc: '#9dff3f' },
  animales: { node: [292, 366], origen: [195, 416], s: 1, acc: '#ffb54f' },
  cafe: { node: [112, 372], origen: [195, 424], s: 1.04, acc: '#ff9d3f' },
  mango: { node: [340, 448], origen: [195, 494], s: 0.96, acc: '#ffd76a' },
  agua: { node: [52, 452], origen: [195, 500], s: 1, acc: '#4fd8ff' },
  citricos: { node: [296, 522], origen: [195, 560], s: 1, acc: '#ff9d3f' },
  aguacate: { node: [98, 528], origen: [195, 566], s: 1.02, acc: '#9dff3f' },
  suelo: { node: [112, 722], origen: [195, 654], s: 1.02, acc: '#9dff3f', raiz: true },
  abono: { node: [278, 726], origen: [195, 657], s: 0.98, acc: '#d8a24f', raiz: true },
};

/** Slots de reserva (sobre el tronco) para mundos futuros sin lugar propio. */
const SLOTS_RESERVA = [
  { node: [195, 244], origen: [195, 292], s: 0.9, acc: '#2dffc4' },
  { node: [195, 396], origen: [195, 446], s: 0.94, acc: '#2dffc4' },
  { node: [195, 474], origen: [195, 522], s: 0.94, acc: '#2dffc4' },
];

/** Curva orgánica tronco→vaina (rama) o tronco→punta (raíz). */
function ramaD([ox, oy], [nx, ny]) {
  const dir = ny < oy ? -1 : 1; // -1 = rama que sube · 1 = raíz que baja
  const dy = Math.abs(oy - ny);
  const c1x = ox + (nx - ox) * 0.22;
  const c1y = oy + dir * Math.max(14, dy * 0.18);
  const c2x = nx - (nx - ox) * 0.24;
  const c2y = ny - dir * Math.max(16, dy * 0.3);
  return `M${ox},${oy} C${c1x},${c1y} ${c2x},${c2y} ${nx},${ny}`;
}

/** Etiqueta-cápsula dentro del SVG (misma receta del mockup aprobado).
 * Legible al sol: cápsula más opaca, borde más presente y tipo un punto
 * más grande que el mockup (en pantalla real el SVG se ve más chico). */
function TagSvg({ x, y, texto }) {
  const w = texto.length * 5 + 17;
  return (
    <g className="adm-tag" aria-hidden="true">
      <rect x={x - w / 2} y={y} width={w} height="13.5" rx="6.75" fill="rgba(4,10,28,0.88)" stroke="rgba(45,255,196,0.45)" strokeWidth="0.7" />
      <text x={x} y={y + 9.3} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7.2" letterSpacing="1.1" fill="#d4ffee">
        {texto}
      </text>
    </g>
  );
}

/**
 * Una rama viva: el trazo con savia + la vaina-entrada del mundo.
 * La vaina completa es el botón (membrana + núcleo + glifo + etiqueta), con
 * un hit-area invisible r=30 (~60px en móvil) para dedos de campo.
 */
function RamaMundo({ mundo, lugar, sello, onOpen, idx = 0 }) {
  const [nx, ny] = lugar.node;
  const d = ramaD(lugar.origen, lugar.node);
  const entrar = () => onOpen(mundo);
  const tecla = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(mundo); }
  };
  return (
    <g
      className="adm-rama"
      /* brote escalonado: cada rama aparece un tris después de la anterior
         (solo opacity — GPU-friendly y sin pelear con el transform del SVG) */
      style={{ '--adm-acc': lugar.acc, animationDelay: `${0.12 + idx * 0.07}s` }}
    >
      {/* la rama: corteza + brillo + savia que fluye hacia la vaina */}
      <path d={d} fill="none" stroke={lugar.raiz ? '#6b8f2f' : '#0f8f6c'} strokeWidth="3.4" strokeLinecap="round" opacity="0.9" />
      <path d={d} fill="none" stroke={lugar.acc} strokeWidth="1" strokeLinecap="round" opacity="0.45" />
      <path className="adm-sap" d={d} fill="none" stroke="#9dff3f" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />

      <g
        className="adm-vaina adm-nodo"
        transform={`translate(${nx},${ny}) scale(${lugar.s})`}
        role="button"
        tabIndex={0}
        aria-label={`Entrar al mundo ${mundo.titulo}: ${mundo.lema}`}
        data-testid={`arbol-rama-${mundo.id}`}
        onClick={entrar}
        onKeyDown={tecla}
      >
        {/* hit-area generosa (target táctil grande, invisible) */}
        <circle r="30" fill="transparent" stroke="none" />
        <ellipse className="adm-vaina-halo" rx="20" ry="24" fill="url(#adm-bulbo)" />
        <path
          className="adm-vaina-membrana"
          d="M0,-20 C11,-18 15.5,-8 14.5,2 C13.5,13 8,20.5 0,22 C-8,20.5 -13.5,13 -14.5,2 C-15.5,-8 -11,-18 0,-20 Z"
          fill="rgba(7,16,48,0.88)"
          stroke={lugar.acc}
          strokeWidth="1.2"
        />
        <path d="M0,-16 C5,-9 5,9 0,17" fill="none" stroke="#9dff3f" strokeWidth="0.6" opacity="0.5" />
        <path d="M0,-16 C-5,-9 -5,9 0,17" fill="none" stroke="#9dff3f" strokeWidth="0.6" opacity="0.5" />
        <circle className="adm-vaina-nucleo" r="9" fill="url(#adm-nucleo)" />
        <text y="4.5" textAnchor="middle" fontSize="11" aria-hidden="true">{mundo.emoji}</text>
        <circle className="adm-espora" cy="-24" r="1.3" fill="#eafff6" />
        <TagSvg x={0} y={27} texto={mundo.titulo.toUpperCase()} />
        {/* sello GROUNDED: dato real, nunca inventado (hoy: matas en Cultivos) */}
        {sello && <TagSvg x={0} y={42} texto={sello.toUpperCase()} />}
      </g>
    </g>
  );
}

export default function ArbolDeMundos({ onNavigate, mostrarAnimales = true, plantsCount = 0 }) {
  const { theme } = useTheme();
  const temaEfectivo = resolveAutoTheme(theme);
  // Vista rica SOLO de la piel biopunk (biopunk2 = default). En los demás
  // temas el menú vivo queda como está (la grilla de mundos).
  if (!BASE_SKIN_THEMES.includes(temaEfectivo)) return null;

  // GROUNDED: mismas reglas de visibilidad que la grilla (gate Animales).
  const mundos = MUNDOS_FINCA.filter((m) => m.gate !== 'animales' || mostrarAnimales);

  // MISMO enrutado que MundosDeMiFinca.abrir (destinos idénticos, no huérfano).
  const abrir = (m) => {
    if (m.portada) onNavigate?.(m.portada);
    else if (m.directo) onNavigate?.(m.directo.view, m.directo.data);
    else onNavigate?.('mundo', { mundo: m.id });
  };

  // Sello vivo (dato real): hoy solo Cultivos lleva el conteo de matas.
  const sello = (m) => {
    if (m.id === 'cultivos' && plantsCount > 0) {
      return plantsCount === 1 ? '1 mata sembrada' : `${plantsCount} matas sembradas`;
    }
    return null;
  };

  // Mundo futuro sin lugar coreografiado → slot de reserva (nunca huérfano).
  let reservaIdx = 0;
  const lugarDe = (m) => LAYOUT[m.id]
    || SLOTS_RESERVA[Math.min(reservaIdx++, SLOTS_RESERVA.length - 1)];

  return (
    <section
      className="adm"
      aria-label="El árbol de los mundos de su finca: cada rama es un mundo, toque una rama para entrar"
      data-testid="arbol-mundos"
    >
      <header className="adm-head">
        <h2 className="adm-tit">El árbol de su finca</h2>
        <p className="adm-sub">
          Del corazón de la finca brota una rama viva por cada mundo —
          toque una rama para entrar a su mundo.
        </p>
      </header>

      <div className="adm-lienzo">
        <svg
          className="adm-svg"
          viewBox="0 0 390 800"
          role="presentation"
          focusable="false"
        >
          <defs>
            <radialGradient id="adm-bulbo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#2dffc4" stopOpacity="0.9" />
              <stop offset="0.55" stopColor="#2dffc4" stopOpacity="0.25" />
              <stop offset="1" stopColor="#2dffc4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="adm-nucleo" cx="0.5" cy="0.42" r="0.65">
              <stop offset="0" stopColor="rgba(45,255,196,0.32)" />
              <stop offset="0.7" stopColor="rgba(45,255,196,0.1)" />
              <stop offset="1" stopColor="rgba(45,255,196,0)" />
            </radialGradient>
            <radialGradient id="adm-corazon" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#eafff6" />
              <stop offset="0.35" stopColor="#2dffc4" />
              <stop offset="0.8" stopColor="#0a9f74" stopOpacity="0.4" />
              <stop offset="1" stopColor="#0a9f74" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="adm-tallo" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#0f8f6c" />
              <stop offset="1" stopColor="#9dff3f" />
            </linearGradient>
            <linearGradient id="adm-suelo-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(12,16,38,0.96)" />
              <stop offset="1" stopColor="rgba(2,4,12,0.2)" />
            </linearGradient>
          </defs>

          {/* estrellas y cocuyos: la noche viva del biopunk */}
          <g fill="#dfeffc" aria-hidden="true">
            <circle className="adm-tw" cx="34" cy="36" r="1.1" />
            <circle className="adm-tw adm-t2" cx="128" cy="58" r="0.9" />
            <circle className="adm-tw adm-t3" cx="256" cy="30" r="1" />
            <circle className="adm-tw" cx="356" cy="150" r="0.9" fill="#2dffc4" />
            <circle className="adm-tw adm-t2" cx="30" cy="210" r="0.8" fill="#ff4fd8" />
            <circle className="adm-tw adm-t3" cx="368" cy="330" r="0.9" fill="#9dff3f" />
            <circle className="adm-tw" cx="22" cy="420" r="0.8" />
          </g>
          <circle className="adm-fly" cx="150" cy="300" r="1.6" fill="#d8ff6a" aria-hidden="true" />
          <circle className="adm-fly adm-f2" cx="250" cy="240" r="1.4" fill="#2dffc4" aria-hidden="true" />
          <circle className="adm-fly adm-f3" cx="180" cy="440" r="1.4" fill="#ff4fd8" aria-hidden="true" />

          {/* el tronco: del corazón a la yema apical, con savia subiendo */}
          <g aria-hidden="true">
            <path d="M186,614 C188,470 190,300 193,150 L197,150 C200,300 202,470 204,614 Z" fill="url(#adm-tallo)" opacity="0.9" />
            <path d="M186,614 C188,470 190,300 193,150" fill="none" stroke="#2dffc4" strokeWidth="1" opacity="0.55" />
            <path d="M204,614 C202,470 200,300 197,150" fill="none" stroke="#2dffc4" strokeWidth="1" opacity="0.55" />
            <path className="adm-sap adm-sap-tronco" d="M195,610 C195,460 195,300 195,152" fill="none" stroke="#d8ff6a" strokeWidth="1.6" strokeLinecap="round" />
          </g>

          {/* corte de suelo: la tierra donde el árbol hunde sus raíces */}
          <rect y="650" width="390" height="150" fill="url(#adm-suelo-g)" aria-hidden="true" />
          <path d="M0,650 L390,650" stroke="#2dffc4" strokeWidth="1.4" opacity="0.55" aria-hidden="true" />
          <path d="M0,652.5 L390,652.5" stroke="#ff4fd8" strokeWidth="0.7" opacity="0.25" aria-hidden="true" />
          {/* micelio que teje el subsuelo */}
          <g fill="none" stroke="#2dffc4" strokeWidth="0.6" opacity="0.35" strokeLinecap="round" aria-hidden="true">
            <path d="M150,678 C140,672 132,664 128,656 M128,656 C124,648 118,656 110,660" />
            <path d="M240,682 C252,676 260,668 264,658 M264,658 C268,666 276,662 284,660" />
            <path d="M60,700 C74,694 88,694 100,700 M290,704 C304,698 318,698 330,704" />
          </g>

          {/* LAS RAMAS VIVAS: una por mundo real de la finca (fuente única
              mundosFinca.js — mismo gate y mismas rutas que la grilla) */}
          {mundos.map((m, i) => (
            <RamaMundo key={m.id} mundo={m} lugar={lugarDe(m)} sello={sello(m)} onOpen={abrir} idx={i} />
          ))}

          {/* EL CORAZÓN DE LA FINCA: late y bombea savia a todas las ramas */}
          <g className="adm-corazon-g" aria-hidden="true">
            <ellipse cx="195" cy="614" rx="38" ry="32" fill="#02040c" opacity="0.55" />
            <ellipse cx="195" cy="614" rx="38" ry="32" fill="none" stroke="#0f3a30" strokeWidth="1" opacity="0.55" />
            <circle className="adm-heart-wave" cx="195" cy="614" r="20" fill="none" stroke="#2dffc4" strokeWidth="1.6" />
            <circle className="adm-heart-wave adm-hw2" cx="195" cy="614" r="20" fill="none" stroke="#ff4fd8" strokeWidth="1" />
            <circle className="adm-heart" cx="195" cy="614" r="13" fill="url(#adm-corazon)" />
            <g className="adm-heart">
              <path d="M195,600 C204,606 204,622 195,628 C186,622 186,606 195,600 Z" fill="#0e5a44" stroke="#2dffc4" strokeWidth="1.4" />
              <circle cx="195" cy="614" r="4.2" fill="#eafff6" />
              <circle cx="195" cy="614" r="1.8" fill="#ff8fe4" />
            </g>
          </g>

          {/* etiqueta viva del pie (misma voz del mockup aprobado) */}
          <g fontFamily="ui-monospace,monospace" fontSize="7.5" letterSpacing="2" opacity="0.65" aria-hidden="true">
            <text x="195" y="778" fill="#2dffc4" textAnchor="middle">CORAZÓN DE LA FINCA · VIVO</text>
            <text x="195" y="790" fill="#5b7f93" textAnchor="middle" letterSpacing="1">toque una rama para entrar a su mundo</text>
          </g>
        </svg>
      </div>

      {/* EL RELOJ DEL FRAILEJÓN: los años reales de la finca, un anillo por año */}
      <RelojFrailejon onNavigate={onNavigate} />
    </section>
  );
}
