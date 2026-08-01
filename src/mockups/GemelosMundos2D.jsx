/*
 * GemelosMundos2D — GEMELOS 2D DE PRIMERA CLASE para los mundos de la finca.
 *
 * No es un "modo degradado" triste: cuando el equipo es de gama baja, el usuario
 * pidió "menos movimiento" o el diorama 3D no carga, cada mundo tiene aquí un
 * GEMELO 2D digno — una lámina andina hand-inked (rubber-hose) que respira, con
 * los MISMOS hotspots navegables que su mundo 3D. Un usuario en un teléfono
 * humilde tiene una experiencia bella, no un cartel de error.
 *
 * KIT (reutilizable):
 *   - <Gemelo2D>      el marco: cabecera + lámina SVG + capa navegable de
 *                     "chapas" (los hotspots) + leyenda pieza-por-pieza.
 *   - la "chapa"      la FIRMA visual: un pin de esmalte plantado en la escena
 *                     que respira quieto y hace squash-bounce al tocarlo.
 * GEMELOS CONCRETOS (exportados):
 *   - <GemeloCafe2D>      el cafetal bajo sombra
 *   - <GemeloSanidad2D>   la huerta-clínica (manejo sin veneno)
 *   - <GemeloAgua2D>      el recorrido del agua
 *   - <GaleriaGemelos2D>  (default) las tres láminas juntas, para la vitrina.
 *
 * Reciben sus `hotspots` por props (los MISMOS del mundo 3D: id, emoji, label,
 * view); traen por defecto los del registro para funcionar sin sesión. Si se les
 * pasa `onHotspot`, lo llaman (la app navega); si no, muestran a dónde llevaría
 * cada puerta (vitrina). Cero CDN, cero imágenes externas, cero filtros SVG
 * pesados: tiene que volar en gama baja. Copy en español de Colombia, en "usted".
 *
 * NO importa `three` ni nada de `src/visual/mundo3d`: es liviano y fiable a
 * propósito. NO reemplaza a `LaminaMundo` del framework; es la lámina-vitrina
 * bella, pensada para lucir el mundo entero de un vistazo.
 */
import { useEffect, useId, useState } from 'react';
import './GemelosMundos2D.css';

/* ── A dónde lleva cada puerta (para la vitrina sin sesión) ───────────────── */
const DESTINOS = {
  cafe: 'El cultivo del café, paso a paso',
  biodiversidad: 'La biodiversidad de su finca',
  plagas: 'El directorio de plagas',
  biopreparados: 'Los biopreparados, sin veneno',
  poscosecha: 'El beneficio y la poscosecha',
  sanidad_sintoma: 'Cuéntele qué le ve a su mata',
  defensores: 'Los defensores de la finca',
  toxicologia: 'La seguridad con los insumos',
  agua: 'El agua de su finca',
  restauracion: 'La restauración de la ronda',
  hortalizas: 'Su huerta de hortalizas',
};

/* ── Hotspots por defecto (los MISMOS del registro 3D, mundoData.js) ──────── */
const HOTSPOTS_CAFE = [
  { id: 'grano', emoji: '☕', label: 'El grano, paso a paso', view: 'cafe' },
  { id: 'sombra', emoji: '🌳', label: 'El café bajo sombra', view: 'biodiversidad' },
  { id: 'roya', emoji: '🍂', label: 'La roya y la broca', view: 'plagas' },
  { id: 'manejo', emoji: '🐞', label: 'Manejo sin veneno', view: 'biopreparados' },
  { id: 'beneficio', emoji: '💧', label: 'Despulpar, fermentar, secar', view: 'poscosecha' },
];
const HOTSPOTS_SANIDAD = [
  { id: 'sintoma', emoji: '🩺', label: 'Mi mata está enferma', view: 'sanidad_sintoma' },
  { id: 'plagas', emoji: '🐛', label: 'Directorio de plagas', view: 'plagas' },
  { id: 'defensores', emoji: '🐞', label: 'Defensores de la finca', view: 'defensores' },
  { id: 'bio', emoji: '🧪', label: 'Biopreparados', view: 'biopreparados' },
  { id: 'tox', emoji: '⚠️', label: 'Seguridad con insumos', view: 'toxicologia' },
];
const HOTSPOTS_AGUA = [
  { id: 'nacimiento', emoji: '💧', label: 'Donde nace el agua', view: 'agua' },
  { id: 'ronda', emoji: '🌳', label: 'La ronda que lo protege', view: 'restauracion' },
  { id: 'quebrada', emoji: '🐟', label: 'La quebrada viva', view: 'biodiversidad' },
  { id: 'riesgo', emoji: '⚠️', label: 'Aquí se cuida el agua', view: 'toxicologia' },
  { id: 'bocatoma', emoji: '🚰', label: 'La toma y el tanque', view: 'agua' },
  { id: 'cultivo', emoji: '🥕', label: 'La huerta regada', view: 'hortalizas' },
];

/* ── Dónde se planta cada chapa sobre la escena (% del marco) ─────────────── */
const COORDS_CAFE = {
  grano: { x: 50, y: 62 },
  sombra: { x: 20, y: 29 },
  roya: { x: 75, y: 57 },
  manejo: { x: 31, y: 69 },
  beneficio: { x: 83, y: 79 },
};
const COORDS_SANIDAD = {
  sintoma: { x: 50, y: 49 },
  plagas: { x: 76, y: 39 },
  defensores: { x: 32, y: 60 },
  bio: { x: 84, y: 70 },
  tox: { x: 22, y: 44 },
};
const COORDS_AGUA = {
  nacimiento: { x: 15, y: 22 },
  ronda: { x: 37, y: 37 },
  quebrada: { x: 53, y: 51 },
  riesgo: { x: 37, y: 63 },
  bocatoma: { x: 71, y: 69 },
  cultivo: { x: 86, y: 80 },
};

/* ── Leyenda pieza-por-pieza (copy verificado, misma lección del 3D) ──────── */
const LEYENDA_CAFE = [
  { emoji: '🌳', titulo: 'El café bajo sombra', texto: 'El cafeto no es de pleno sol: crece mejor debajo del guamo y el nogal. La sombra le baja el calor, le guarda la humedad, le abona con la hoja que cae y le devuelve las aves. Café de sombra es café con vida, no potrero pelado.' },
  { emoji: '☕', titulo: 'El grano: cereza, pergamino y oro', texto: 'La cereza roja madura es el fruto. Se despulpa y seca hasta el pergamino (el grano en su cascarilla) y se trilla hasta el oro (el grano verde que se vende). En la finca no se tuesta: el tueste es del otro lado. Lo suyo es entregar oro parejo.' },
  { emoji: '🍂', titulo: 'La roya y la broca, con criterio', texto: 'La roya (Hemileia vastatrix) es el polvillo naranja bajo la hoja; la broca (Hypothenemus hampei) es el gorgojo que perfora la cereza. Se manejan con variedad resistente, cosecha bien recogida, trampas y hongos de biocontrol — no con recetas de veneno.' },
  { emoji: '💧', titulo: 'El beneficio: despulpar, fermentar, secar', texto: 'Despulpe la cereza el mismo día, fermente el mucílago en el tanque y seque el grano despacio al sol (paseo o parabólico). Un buen beneficio es la mitad de la taza: ahí se gana o se pierde el precio.' },
];
const LEYENDA_SANIDAD = [
  { emoji: '🍅', titulo: 'Las matas sanas', texto: 'En el centro, lo que se protege. Una mata bien nutrida y sin estrés se defiende sola: el mejor control de plagas empieza por un suelo vivo y una planta fuerte.' },
  { emoji: '🎯', titulo: 'Las trampas cromáticas', texto: 'Tarjetas pegajosas de color: la amarilla llama a la mosca blanca y al minador; la azul, a los trips. Sirven para vigilar cuánto bicho hay y para bajar la población, sin echar nada.' },
  { emoji: '🧫', titulo: 'El biocontrol con hongos', texto: 'La estación con hongos entomopatógenos (Beauveria bassiana y Metarhizium): esporas que se pegan al insecto y lo enferman. Es un aliado vivo y de bajo riesgo; como también puede afectar insectos benéficos, aplíquelo dirigido a la plaga y evite asperjar sobre flores abiertas donde están las abejas.' },
  { emoji: '🌼', titulo: 'El borde que empuja y jala (push-pull)', texto: 'La orla de flores aromáticas trabaja de dos maneras: unas como la caléndula jalan y alojan a los enemigos naturales, y otras como la flor de muerto (Tagetes) ayudan a empujar la plaga lejos. Sembrar compañía es defender la huerta con plantas.' },
  { emoji: '🐞', titulo: 'Los enemigos naturales', texto: 'La mariquita y su larva comen cientos de pulgones; el escarabajo del suelo caza larvas de noche; avispitas y moscas ayudan también. Cuidarlos es tener una cuadrilla que trabaja gratis.' },
];
const LEYENDA_AGUA = [
  { emoji: '💧', titulo: 'Donde nace', texto: 'El nacimiento es el corazón del agua de su finca: si él está bien, todo lo demás recibe.' },
  { emoji: '🌳', titulo: 'La ronda que lo protege', texto: 'La franja de monte alrededor del nacimiento y la quebrada guarda el agua fresca y firme el año entero.' },
  { emoji: '🐟', titulo: 'La quebrada viva', texto: 'Si en la quebrada hay peces, ranas y libélulas, el agua está contando que viene sana.' },
  { emoji: '⚠️', titulo: 'Donde se cuida', texto: 'Ni lavar la bomba ni botar sobras cerca de la quebrada: ese cuidado de hoy es el agua de mañana.' },
  { emoji: '🚰', titulo: 'La toma y el tanque', texto: 'La bocatoma toma solo lo que se necesita y el tanque lo guarda para la casa y el riego.' },
  { emoji: '🥕', titulo: 'La huerta regada', texto: 'El agua termina su recorrido volviéndose comida: riego con medida, cosecha segura.' },
];

/* ── Hook local (NO exportado): "menos movimiento" del sistema ───────────── */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = (e) => setReduce(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

/* ── La CHAPA: el hotspot como pin de esmalte plantado en la escena ──────── */
function HotspotChapa({ hotspot, coord, orden, abierta, onActivar }) {
  if (!coord) return null;
  return (
    <button
      type="button"
      className={`g2__chapa${abierta ? ' is-abierta' : ''}`}
      style={{ '--x': `${coord.x}%`, '--y': `${coord.y}%`, '--d': `${orden * 0.35}s` }}
      onClick={() => onActivar(hotspot)}
      aria-label={`${hotspot.label} — abre ${DESTINOS[hotspot.view] || 'esta pantalla'}`}
    >
      <span className="g2__chapa-punta" aria-hidden="true" />
      <span className="g2__chapa-disco">
        <span aria-hidden="true">{hotspot.emoji}</span>
        <span className="g2__chapa-brillo" aria-hidden="true" />
      </span>
      <span className="g2__chapa-cinta" aria-hidden="true">{hotspot.label}</span>
    </button>
  );
}

/* =========================================================================
 * KIT — el marco reutilizable de cualquier gemelo 2D.
 * ========================================================================= */
export function Gemelo2D({
  tinte = ['#7a4a24', '#efe0cf'],
  kicker = 'Los mundos de su finca · lámina',
  titulo,
  tituloAcento,
  lema,
  escena,
  hotspots = [],
  coords = {},
  leyenda = [],
  leyendaTitulo = 'La lámina, pieza por pieza',
  cierre,
  onHotspot,
}) {
  const reduce = usePrefersReducedMotion();
  // Vitrina sin sesión: al tocar una puerta, se muestra a dónde lleva.
  const [abierto, setAbierto] = useState(null);

  const activar = (h) => {
    if (typeof onHotspot === 'function') {
      onHotspot(h);
      return;
    }
    setAbierto((prev) => (prev?.id === h.id ? null : h));
  };

  return (
    <main
      className={`g2${reduce ? ' is-quieto' : ''}`}
      style={{ '--g2-a': tinte[0], '--g2-b': tinte[1] }}
    >
      <header className="g2__head">
        <p className="g2__kicker">{kicker}</p>
        <h1 className="g2__title">
          {titulo} {tituloAcento && <span>{tituloAcento}</span>}
        </h1>
        {lema && <p className="g2__lema">{lema}</p>}
      </header>

      <div className="g2__lamina">
        {escena}
        <div className="g2__capa">
          {hotspots.map((h, i) => (
            <HotspotChapa
              key={h.id}
              hotspot={h}
              coord={coords[h.id]}
              orden={i}
              abierta={abierto?.id === h.id}
              onActivar={activar}
            />
          ))}
        </div>
        {abierto && (
          <div className="g2__globo" role="status" aria-live="polite">
            <button
              type="button"
              className="g2__globo-cerrar"
              onClick={() => setAbierto(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <span className="g2__globo-emoji" aria-hidden="true">{abierto.emoji}</span>
            <b>{abierto.label}</b>
            <p>
              En su app, esta puerta lo lleva a{' '}
              <span className="g2__globo-destino">{DESTINOS[abierto.view] || 'esta pantalla'}</span>.
            </p>
          </div>
        )}
      </div>
      <p className="g2__pie">Toque una chapa para ver a dónde lo lleva.</p>

      {leyenda.length > 0 && (
        <section className="g2__leyenda" aria-label={leyendaTitulo}>
          <h2>{leyendaTitulo}</h2>
          <ol className="g2__piezas">
            {leyenda.map((p) => (
              <li key={p.titulo} className="g2__pieza">
                <span className="g2__pieza-emoji" aria-hidden="true">{p.emoji}</span>
                <div>
                  <b>{p.titulo}</b>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {cierre && <p className="g2__cierre">{cierre}</p>}
    </main>
  );
}

/* =========================================================================
 * ESCENAS — láminas SVG rubber-hose (module-local). viewBox 400×300, sin
 * filtros pesados: relleno plano, línea de tinta gruesa, sombra cartoon.
 * ========================================================================= */
const INK = '#241a12';

function Sol({ cx, cy, r, color }) {
  const rayos = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return {
      key: i,
      x1: cx + Math.cos(a) * (r + 4),
      y1: cy + Math.sin(a) * (r + 4),
      x2: cx + Math.cos(a) * (r + 13),
      y2: cy + Math.sin(a) * (r + 13),
    };
  });
  return (
    <g className="g2-sol">
      {rayos.map((ry) => (
        <line key={ry.key} x1={ry.x1} y1={ry.y1} x2={ry.x2} y2={ry.y2} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={color} stroke={INK} strokeWidth="3" />
    </g>
  );
}

function Nube({ x, y, s = 1, clase = 'g2-nube' }) {
  return (
    <g className={clase} transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M0,10 a10,10 0 0 1 10,-10 a12,12 0 0 1 22,-2 a10,10 0 0 1 8,12 a8,8 0 0 1 -8,8 H2 a9,9 0 0 1 -2,-16 Z"
        fill="#fffaf0"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </g>
  );
}

function EscenaCafe() {
  const raw = useId();
  const uid = raw.replace(/:/g, '');
  return (
    <svg className="g2__escena" viewBox="0 0 400 300" role="img" aria-label="Cafetal bajo la sombra del guamo, con cafetos cargados de cereza y el paseo de secado" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`cielo-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe3d6" />
          <stop offset="1" stopColor="#f3ead2" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#cielo-${uid})`} />
      <Sol cx={340} cy={54} r={22} color="#f4c14b" />
      <Nube x={44} y={44} s={1.1} />
      <Nube x={150} y={30} s={0.85} clase="g2-nube-2" />

      {/* Laderas */}
      <path d="M0,150 Q120,110 220,140 T400,132 V300 H0 Z" fill="#8bbf63" stroke={INK} strokeWidth="3" />
      <path d="M0,196 Q140,160 260,190 T400,180 V300 H0 Z" fill="#6aa14a" stroke={INK} strokeWidth="3" />

      {/* Árboles de sombra (guamo y nogal) */}
      <g>
        <rect x="72" y="96" width="12" height="70" rx="5" fill="#7a4a24" stroke={INK} strokeWidth="3" />
        <g className="g2-hoja">
          <ellipse cx="78" cy="86" rx="42" ry="34" fill="#4b7a3a" stroke={INK} strokeWidth="3.5" />
          <ellipse cx="60" cy="96" rx="24" ry="20" fill="#57923f" stroke={INK} strokeWidth="3" />
        </g>
      </g>
      <g>
        <rect x="300" y="120" width="11" height="62" rx="5" fill="#7a4a24" stroke={INK} strokeWidth="3" />
        <ellipse cx="305" cy="110" rx="34" ry="28" fill="#3f6b39" stroke={INK} strokeWidth="3.5" />
      </g>

      {/* Cafetos con cereza */}
      {[
        { x: 200, y: 196, c: '#3f6f3a' },
        { x: 124, y: 210, c: '#457d38' },
        { x: 300, y: 182, c: '#468637' },
        { x: 260, y: 214, c: '#3f6f3a' },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x - 3} y={b.y - 2} width="6" height="30" rx="3" fill="#6f4a2b" stroke={INK} strokeWidth="2" />
          <ellipse cx={b.x} cy={b.y - 12} rx="26" ry="22" fill={b.c} stroke={INK} strokeWidth="3" />
          {[[-12, -16], [8, -20], [12, -6], [-6, -4], [0, -20]].map((d, j) => (
            <circle key={j} cx={b.x + d[0]} cy={b.y + d[1]} r="3.2" fill="#c8352a" stroke={INK} strokeWidth="1.4" />
          ))}
        </g>
      ))}

      {/* Paseo de secado: cereza → pergamino → oro */}
      <g transform="translate(300 214)">
        <path d="M0,0 L92,-8 L112,30 L14,42 Z" fill="#d9c6a0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        {[
          { y: 6, c: '#b8342a' },
          { y: 18, c: '#d4c199' },
          { y: 30, c: '#9fae5a' },
        ].map((row, r) => (
          <g key={r}>
            {Array.from({ length: 7 }, (_, k) => (
              <circle key={k} cx={14 + k * 13} cy={row.y + k * 0.4} r="2.4" fill={row.c} stroke={INK} strokeWidth="1" />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

function EscenaSanidad() {
  const raw = useId();
  const uid = raw.replace(/:/g, '');
  return (
    <svg className="g2__escena" viewBox="0 0 400 300" role="img" aria-label="Huerta-clínica: matas de tomate protegidas con trampas de color, borde de flores y una mariquita" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`cielos-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4d7bf" />
          <stop offset="1" stopColor="#f6ecd6" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#cielos-${uid})`} />
      <Sol cx={54} cy={50} r={20} color="#f2b04a" />
      <Nube x={250} y={36} s={1} />

      {/* Era / suelo */}
      <path d="M0,200 Q200,178 400,200 V300 H0 Z" fill="#c79a63" stroke={INK} strokeWidth="3" />
      <path d="M0,210 Q200,192 400,210 V300 H0 Z" fill="#a97a45" stroke={INK} strokeWidth="0" />

      {/* Matas de tomate con tutor */}
      {[
        { x: 200, y: 205, c: '#4e8f3f' },
        { x: 130, y: 210, c: '#57993f' },
        { x: 258, y: 208, c: '#468637' },
      ].map((m, i) => (
        <g key={i}>
          <line x1={m.x + 16} y1={m.y - 60} x2={m.x + 16} y2={m.y} stroke="#9a6b3a" strokeWidth="3" strokeLinecap="round" />
          <rect x={m.x - 3} y={m.y - 56} width="6" height="56" rx="3" fill="#5f8a34" stroke={INK} strokeWidth="2" />
          <g className="g2-hoja">
            <ellipse cx={m.x} cy={m.y - 52} rx="22" ry="18" fill={m.c} stroke={INK} strokeWidth="3" />
            <ellipse cx={m.x - 16} cy={m.y - 34} rx="13" ry="10" fill={m.c} stroke={INK} strokeWidth="2.5" />
            <ellipse cx={m.x + 16} cy={m.y - 30} rx="13" ry="10" fill={m.c} stroke={INK} strokeWidth="2.5" />
          </g>
          {[[-8, -50], [10, -46], [0, -34]].map((d, j) => (
            <circle key={j} cx={m.x + d[0]} cy={m.y + d[1]} r="4.2" fill="#e0452e" stroke={INK} strokeWidth="1.6" />
          ))}
        </g>
      ))}

      {/* Trampa cromática amarilla (mosca blanca / minador) */}
      <g>
        <line x1="300" y1="120" x2="300" y2="196" stroke="#7a5a34" strokeWidth="3" strokeLinecap="round" />
        <rect x="284" y="96" width="32" height="40" rx="4" fill="#f2c531" stroke={INK} strokeWidth="3" />
      </g>
      {/* Trampa cromática azul (trips) */}
      <g>
        <line x1="90" y1="135" x2="90" y2="200" stroke="#7a5a34" strokeWidth="3" strokeLinecap="round" />
        <rect x="76" y="112" width="28" height="36" rx="4" fill="#3f77c7" stroke={INK} strokeWidth="3" />
      </g>

      {/* Estación de biocontrol (frasco con esporas) */}
      <g transform="translate(320 190)">
        <rect x="0" y="0" width="26" height="34" rx="6" fill="#dfeee0" stroke={INK} strokeWidth="3" />
        <rect x="6" y="-8" width="14" height="10" rx="2" fill="#b9d6bb" stroke={INK} strokeWidth="2.5" />
        <path d="M2,20 h22 v8 a6,6 0 0 1 -6,6 H8 a6,6 0 0 1 -6,-6 Z" fill="#8bbf63" />
        {[[7, 8], [16, 12], [12, 6], [20, 16]].map((d, j) => (
          <circle key={j} cx={d[0]} cy={d[1]} r="1.6" fill="#6aa14a" />
        ))}
      </g>

      {/* Borde push-pull: flores aromáticas al frente */}
      <g>
        {[24, 60, 168, 208, 356, 384].map((fx, i) => (
          <g key={i} transform={`translate(${fx} 236)`}>
            <line x1="0" y1="0" x2="0" y2="20" stroke="#4e8f3f" strokeWidth="2.5" strokeLinecap="round" />
            {Array.from({ length: 6 }, (_, k) => {
              const a = (k * Math.PI) / 3;
              return (
                <ellipse key={k} cx={Math.cos(a) * 6} cy={Math.sin(a) * 6} rx="3.4" ry="5" fill={i % 2 ? '#f2932e' : '#f4c531'} stroke={INK} strokeWidth="1.2" transform={`rotate(${(a * 180) / Math.PI})`} />
              );
            })}
            <circle cx="0" cy="0" r="3" fill="#9a5b1e" stroke={INK} strokeWidth="1.2" />
          </g>
        ))}
      </g>

      {/* La mariquita (enemigo natural) */}
      <g className="g2-bicho" transform="translate(126 172)">
        <ellipse cx="0" cy="0" rx="11" ry="9" fill="#d8322a" stroke={INK} strokeWidth="2.5" />
        <path d="M0,-9 V9" stroke={INK} strokeWidth="2" />
        <circle cx="0" cy="-9" r="4" fill={INK} />
        {[[-5, -2], [5, -2], [-4, 4], [5, 3]].map((d, j) => (
          <circle key={j} cx={d[0]} cy={d[1]} r="1.7" fill={INK} />
        ))}
      </g>
    </svg>
  );
}

export function EscenaAgua() {
  const raw = useId();
  const uid = raw.replace(/:/g, '');
  return (
    <svg className="g2__escena" viewBox="0 0 400 300" role="img" aria-label="El agua de la finca: nacimiento en la montaña, ronda de monte, quebrada viva, la toma con su tanque y la huerta regada" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`cieloa-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe0ee" />
          <stop offset="1" stopColor="#eaf4ee" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#cieloa-${uid})`} />
      <Sol cx={344} cy={48} r={18} color="#f4c14b" />
      <Nube x={230} y={30} s={0.9} clase="g2-nube-2" />

      {/* Montaña con nacimiento */}
      <path d="M-10,130 L70,34 L150,130 Z" fill="#8a9bb0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M44,64 L70,34 L96,64 Z" fill="#eaf1f6" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M62,66 q-6,14 -2,26" fill="none" stroke="#4aa6c4" strokeWidth="4" strokeLinecap="round" className="g2-agua" />

      {/* Ladera baja */}
      <path d="M0,210 Q200,186 400,206 V300 H0 Z" fill="#7fae55" stroke={INK} strokeWidth="3" />

      {/* La quebrada (ribbon) que baja */}
      <path
        d="M60,92 C90,120 110,120 130,150 C150,180 190,180 210,210 C230,238 280,236 300,250"
        fill="none"
        stroke="#7cc7dd"
        strokeWidth="13"
        strokeLinecap="round"
        className="g2-agua"
      />
      <path
        d="M60,92 C90,120 110,120 130,150 C150,180 190,180 210,210 C230,238 280,236 300,250"
        fill="none"
        stroke="#3f9bc0"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray="2 18"
        opacity="0.7"
      />

      {/* Ronda: árboles del monte que protege */}
      {[
        { x: 150, y: 118 },
        { x: 178, y: 96 },
        { x: 120, y: 132 },
      ].map((t, i) => (
        <g key={i}>
          <rect x={t.x - 3} y={t.y} width="6" height="20" rx="3" fill="#7a4a24" stroke={INK} strokeWidth="2" />
          <ellipse cx={t.x} cy={t.y - 4} rx="18" ry="16" fill="#4b7a3a" stroke={INK} strokeWidth="3" />
        </g>
      ))}

      {/* Quebrada viva: pez */}
      <g className="g2-pez" transform="translate(206 150)">
        <path d="M0,0 q-8,-6 -16,0 q8,6 16,0 Z" fill="#e58a3c" stroke={INK} strokeWidth="2" />
        <path d="M0,0 l8,-5 l0,10 Z" fill="#e58a3c" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="-11" cy="0" r="1.5" fill={INK} />
      </g>

      {/* Aviso: aquí se cuida el agua */}
      <g transform="translate(140 178)">
        <line x1="0" y1="0" x2="0" y2="26" stroke="#7a5a34" strokeWidth="3" strokeLinecap="round" />
        <path d="M0,-18 L14,6 H-14 Z" fill="#f4c531" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <line x1="0" y1="-8" x2="0" y2="-1" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="0" cy="3" r="1.6" fill={INK} />
      </g>

      {/* Bocatoma: tanque con llave */}
      <g transform="translate(268 196)">
        <rect x="0" y="0" width="42" height="34" rx="6" fill="#c9d6dd" stroke={INK} strokeWidth="3" />
        <ellipse cx="21" cy="0" rx="21" ry="6" fill="#e4edf1" stroke={INK} strokeWidth="3" />
        <rect x="42" y="22" width="10" height="4" fill="#7a5a34" stroke={INK} strokeWidth="2" />
        <path d="M52,20 q6,4 0,10" fill="none" stroke="#4aa6c4" strokeWidth="3" strokeLinecap="round" className="g2-agua" />
      </g>

      {/* Huerta regada */}
      <g transform="translate(322 226)">
        {[0, 1, 2].map((r) => (
          <g key={r} transform={`translate(0 ${r * 12})`}>
            <path d="M0,0 q20,-6 44,0" fill="none" stroke="#8a5a2e" strokeWidth="4" strokeLinecap="round" />
            {[6, 20, 34].map((cx, k) => (
              <g key={k}>
                <path d={`M${cx},0 l-3,-9 M${cx},0 l3,-9 M${cx},0 l0,-11`} stroke="#4e8f3f" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={cx} cy="1" r="2.4" fill="#e0452e" stroke={INK} strokeWidth="1" />
              </g>
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

/* =========================================================================
 * GEMELOS CONCRETOS — cada uno arma su lámina con el kit. Reciben `hotspots`
 * (los mismos del mundo 3D) y `onHotspot` opcional; traen defaults para lucir
 * en la vitrina sin sesión.
 * ========================================================================= */
export function GemeloCafe2D({ hotspots = HOTSPOTS_CAFE, onHotspot }) {
  return (
    <Gemelo2D
      tinte={['#7a4a24', '#efe0cf']}
      titulo="El mundo del"
      tituloAcento="café"
      lema="El cafetal de la ladera: el arbusto que vive bajo la sombra del guamo, la cereza que se vuelve pergamino y oro, y el beneficio que convierte el fruto en grano de vender."
      escena={<EscenaCafe />}
      hotspots={hotspots}
      coords={COORDS_CAFE}
      leyenda={LEYENDA_CAFE}
      leyendaTitulo="El cafetal, pieza por pieza"
      cierre="El buen café no sale de una receta de bulto: sale de la sombra que lo cuida, de la cereza recogida en su punto y del beneficio hecho con paciencia. Cuide el árbol, cuide el grano y entregue oro parejo."
      onHotspot={onHotspot}
    />
  );
}

export function GemeloSanidad2D({ hotspots = HOTSPOTS_SANIDAD, onHotspot }) {
  return (
    <Gemelo2D
      tinte={['#b0532f', '#f6ded1']}
      titulo="El mundo de la"
      tituloAcento="sanidad"
      lema="La huerta-clínica: cómo se cuida la mata sin veneno. Trampas que llaman al bicho, hongos que lo enferman, flores que lo espantan y los enemigos naturales que lo cazan."
      escena={<EscenaSanidad />}
      hotspots={hotspots}
      coords={COORDS_SANIDAD}
      leyenda={LEYENDA_SANIDAD}
      leyendaTitulo="La huerta-clínica, pieza por pieza"
      cierre="La sanidad no se compra en un frasco: se cría. Suelo vivo, plantas fuertes, compañía florida y bichos buenos cuidados — y la plaga deja de mandar. Antes de reaccionar, mire. Menos veneno, más finca viva."
      onHotspot={onHotspot}
    />
  );
}

export function GemeloAgua2D({ hotspots = HOTSPOTS_AGUA, onHotspot }) {
  return (
    <Gemelo2D
      tinte={['#2f7fa3', '#d7ecf3']}
      titulo="El mundo del"
      tituloAcento="agua"
      lema="Recorra el camino del agua: dónde nace, por dónde baja, dónde se cuida y qué riega. Menos colapso, finca viva."
      escena={<EscenaAgua />}
      hotspots={hotspots}
      coords={COORDS_AGUA}
      leyenda={LEYENDA_AGUA}
      leyendaTitulo="El recorrido, punto por punto"
      cierre="Cuidar el agua no es una carga: es la finca entera trabajando a su favor. Empiece por un punto — el que usted tenga más a la mano."
      onHotspot={onHotspot}
    />
  );
}

/* =========================================================================
 * DEFAULT — la galería de las tres láminas juntas (vitrina).
 * ========================================================================= */
export default function GaleriaGemelos2D() {
  return (
    <div className="g2gal">
      <div className="g2gal__intro">
        <h1>Los mundos de su finca, en lámina</h1>
        <p>
          Cuando el equipo es humilde o usted pide menos movimiento, cada mundo
          se ve así de bello: una lámina que respira, con las mismas puertas del
          diorama 3D. Toque una chapa para ver a dónde lo lleva.
        </p>
      </div>
      <GemeloCafe2D onHotspot={() => {}} />
      <GemeloSanidad2D onHotspot={() => {}} />
      <GemeloAgua2D onHotspot={() => {}} />
    </div>
  );
}
