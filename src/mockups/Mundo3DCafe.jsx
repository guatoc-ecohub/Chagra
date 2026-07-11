/*
 * Mundo3DCafe — vitrina pública del MUNDO DEL CAFÉ (ruta #/mockups/mundo3d-cafe).
 *
 * De la cereza a la taza: el beneficio del café como un proceso que baja por
 * gravedad y agua —cereza → despulpado → fermento → lavado → secado → taza—,
 * bajo la sombra de los guamos, con la broca manejada sin veneno. Didáctico y
 * esperanzador: menos colapso, finca viva.
 *
 * NO reimplementa nada: REUSA el arquetipo `flujo` (el mundo del agua es el
 * gold-standard) montando `<Mundo mundoId="cafe">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento" activado) se ve el gemelo 2D digno; en gama
 * media/alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con las
 * cerezas en los cafetos, el colibrí que poliniza y la abeja Angelita entrando.
 * Los puntos son las mismas puertas del registro: aquí (vitrina sin sesión)
 * cuentan a qué pantalla real de la app llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas (la mata la dibuja LaminaCafeto en
 * SVG propio). Móvil-first (320px). Copy en español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { MUNDO, decidirTier, permite3D } from '../visual/mundo3d/index.js';
import LaminaCafeto from '../visual/laminas/LaminaCafeto.jsx';
import './Mundo3DCafe.css';

const TINTE = ['#7a4a24', '#efe0cf'];

/* El beneficio, paso por paso — la misma verdad agronómica que ordena la data
   del registro (mundoData.js), contada en una leyenda didáctica. */
const LEYENDA = [
  { emoji: '🍒', titulo: 'La cereza madura', texto: 'Se coge solo la cereza roja, madurita: ahí está el café bueno. La verde y la seca se dejan o se apartan.' },
  { emoji: '🌳', titulo: 'A la sombra del guamo', texto: 'El café se da mejor bajo sombra (guamo, nogal cafetero, aliso): menos sol pica, suelo más vivo y el guamo hasta le regala nitrógeno.' },
  { emoji: '⚙️', titulo: 'Despulpado', texto: 'La despulpadora le quita la cáscara y la pulpa a la cereza. Esa pulpa no se bota: se vuelve abono.' },
  { emoji: '🫧', titulo: 'Fermento y lavado', texto: 'El grano con su baba (mucílago) reposa en el tanque y luego se lava con agua limpia. Ese punto es el que le da la taza.' },
  { emoji: '☀️', titulo: 'Secado', texto: 'Al sol en marquesina o patio hasta que queda en pergamino, con la humedad justa para guardarlo sin que se dañe.' },
  { emoji: '☕', titulo: 'Hasta la taza', texto: 'Trillado, tostado y molido: el recorrido termina en una taza. De su finca, sin intermediario, con historia.' },
];

export default function Mundo3DCafe() {
  // Device-tiering REAL (una vez): gama baja / ahorro / menos-movimiento → 2D.
  const decision = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const puede3D = permite3D(decision.tier);
  const [ver2d, setVer2d] = useState(false);
  const tier = ver2d ? 'bajo' : decision.tier;

  // En la vitrina (sin sesión) un punto del recorrido no navega: cuenta a qué
  // pantalla real de la app lleva esa puerta.
  const [puerta, setPuerta] = useState(null);
  const onHotspot = (view, data) => {
    const hs = (MUNDO.cafe.hotspots || []).find(
      (h) => h.view === view && (h.data === data || (!h.data && !data)),
    ) || (MUNDO.cafe.hotspots || []).find((h) => h.view === view);
    setPuerta({ label: hs?.label || view, view });
  };

  return (
    <main className="m3dc" style={{ '--m3dc-a': TINTE[0], '--m3dc-b': TINTE[1] }}>
      <header className="m3dc__head">
        <p className="m3dc__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo del café</h1>
        <p className="m3dc__lema">
          De la cereza a la taza: el beneficio que baja por gravedad y agua,
          a la sombra de los guamos y sin veneno para la broca. Menos colapso,
          finca viva.
        </p>
      </header>

      <section className="m3dc__escena" aria-label="El beneficio del café, de la cereza a la taza">
        <Mundo
          mundoId="cafe"
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={onHotspot}
          onSalir={null}
          animo="sereno"
          energia={0.85}
        />
        <div className="m3dc__barra">
          <p className="m3dc__tier">
            {tier === 'bajo'
              ? 'Está viendo el dibujo del beneficio (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dc__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver el dibujo 2D'}
            </button>
          )}
        </div>
        <p className="m3dc__nota" role="status" aria-live="polite">
          {puerta
            ? `«${puerta.label}» es una puerta real: dentro de la app abre la pantalla «${puerta.view}».`
            : 'Toque un punto del beneficio para ver a dónde lo lleva.'}
        </p>
      </section>

      <section className="m3dc__mata" aria-label="La mata de café por dentro">
        <h2>Conozca su cafeto</h2>
        <p className="m3dc__mata-txt">
          Antes de contar el beneficio, la mata entera: sus hojas, su flor
          blanca y la cereza que —por dentro— guarda la pulpa, el pergamino y el
          grano. Son los mismos nombres que usa el recorrido de arriba.
        </p>
        <div className="m3dc__lamina">
          <LaminaCafeto />
        </div>
      </section>

      <section className="m3dc__leyenda" aria-label="El beneficio, paso por paso">
        <h2>El beneficio, paso por paso</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dc__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dc__cierre">
          Un cafetal con sombra y bien beneficiado es una finca que se defiende
          sola: más viva, menos frágil. Empiece por el paso que usted tenga hoy
          entre manos.
        </p>
      </section>
    </main>
  );
}
