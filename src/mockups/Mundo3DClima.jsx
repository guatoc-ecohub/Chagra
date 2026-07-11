/*
 * Mundo3DClima — vitrina pública del MUNDO DEL CLIMA (ruta #/mockups/mundo3d-clima).
 *
 * El cielo bajo el que vive la finca: la hora del día (el sol que arquea), la
 * temporada bimodal andina (dos lluvias / dos secas, no cuatro estaciones
 * europeas), la niebla del páramo que el frailejón vuelve agua, y la montaña de
 * pisos térmicos con su casquete de hielo. Del hielo hablamos con conciencia,
 * no con miedo: Colombia perdió casi todo su glaciar y los nevados se apagan —
 * pero el páramo sigue siendo la fábrica de agua, y cuidarlo es la esperanza.
 * Menos colapso, finca viva.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="clima">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve el gemelo 2D digno del cielo; en gama
 * media/alta, la bóveda 3D low-poly (chunk perezoso `vendor-three`) con la abeja
 * Angelita entrando. Los puntos del cielo son las mismas puertas del registro:
 * aquí (vitrina sin sesión) cuentan a qué pantalla real de la app llevan.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { MUNDO, decidirTier, permite3D } from '../visual/mundo3d/index.js';
import './Mundo3DClima.css';

const TINTE = ['#4c7fa0', '#dce9f2'];

/* El cielo, punto por punto — la misma verdad andina del registro, contada en
   una leyenda didáctica y esperanzadora. */
const LEYENDA = [
  { emoji: '⛅', titulo: 'La hora del día', texto: 'El sol arquea de la mañana a la tarde: por dónde sale y dónde se pone le dice cuándo regar, cuándo cosechar y cuándo guardar.' },
  { emoji: '🌧️', titulo: 'Dos lluvias, dos secas', texto: 'En los Andes no hay cuatro estaciones: el año va en dos temporadas de lluvia y dos de seca. Sembrar con ese compás es media cosecha ganada.' },
  { emoji: '🌫️', titulo: 'La niebla que da agua', texto: 'En el páramo el frailejón le peina el agua a la nube y la entrega despacio al suelo. Esa niebla es la que llena su quebrada en el verano.' },
  { emoji: '🏔️', titulo: 'El hielo que se va', texto: 'La línea ámbar marca hasta dónde llegaba el hielo. Colombia ya perdió casi todo su glaciar; por eso el páramo, la fábrica de agua, se cuida hoy.' },
  { emoji: '🌡️', titulo: 'Cada piso, su clima', texto: 'La montaña sube del cálido al páramo y en cada piso el clima manda qué crece. La altura es el primer dato del tiempo de su finca.' },
  { emoji: '❄️', titulo: 'La helada avisa', texto: 'En los pisos fríos la helada llega de madrugada con cielo despejado. Leerla a tiempo salva la papa y la mora de una mala noche.' },
];

export default function Mundo3DClima() {
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

  // En la vitrina (sin sesión) un punto del cielo no navega: cuenta a qué
  // pantalla real de la app lleva esa puerta.
  const [puerta, setPuerta] = useState(null);
  const onHotspot = (view, data) => {
    const hs =
      (MUNDO.clima.hotspots || []).find(
        (h) => h.view === view && (h.data === data || (!h.data && !data)),
      ) || (MUNDO.clima.hotspots || []).find((h) => h.view === view);
    setPuerta({ label: hs?.label || view, view });
  };

  return (
    <main className="m3dc" style={{ '--m3dc-a': TINTE[0], '--m3dc-b': TINTE[1] }}>
      <header className="m3dc__head">
        <p className="m3dc__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo del clima</h1>
        <p className="m3dc__lema">
          El cielo bajo el que vive su finca: la hora del día, las dos lluvias y
          las dos secas, la niebla del páramo y el hielo que se va. Menos
          colapso, finca viva.
        </p>
      </header>

      <section className="m3dc__escena" aria-label="El cielo de la finca">
        <Mundo
          mundoId="clima"
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
              ? 'Está viendo el dibujo del cielo (va parejo en cualquier equipo).'
              : 'Está viendo la bóveda 3D. Puede girarla con el dedo.'}
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
            : 'Toque un punto del cielo para ver a dónde lo lleva.'}
        </p>
      </section>

      <section className="m3dc__leyenda" aria-label="El cielo, punto por punto">
        <h2>El cielo, punto por punto</h2>
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
          El clima no es un enemigo: es el compás de su finca. Aprenda a leerlo y
          cuide el páramo que le da el agua — ahí está la esperanza, no el miedo.
        </p>
      </section>
    </main>
  );
}
