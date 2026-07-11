/*
 * Mundo3DMilpa — vitrina pública del MUNDO DE LA MILPA (ruta #/mockups/mundo3d-milpa).
 *
 * Las TRES HERMANAS en un solo corte: sobre la cama, el maíz da la vara, el
 * fríjol sube por ella y la calabaza cubre el suelo; bajo tierra, lo invisible
 * hecho visible — los NÓDULOS de Rhizobium en las raíces del fríjol, que fijan
 * entre 50 y 80 kg de nitrógeno por hectárea (abono gratis para las tres). No es
 * monocultivo: sembradas juntas rinden más y se cuidan (push-pull). Didáctico y
 * esperanzador — menos colapso, finca viva.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="milpa">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve el gemelo 2D digno con las mismas tres
 * hermanas y los mismos nódulos; en gama media/alta, el diorama 3D low-poly
 * (chunk perezoso `vendor-three`) con la abeja Angelita entrando al mundo. Los
 * puntos del corte son las mismas puertas del registro: aquí (vitrina sin sesión)
 * muestran a qué pantalla real de la app llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { MUNDO, decidirTier, permite3D } from '../visual/mundo3d/index.js';
import './Mundo3DMilpa.css';

const TINTE = ['#5f8f3f', '#eef0cf'];

/* La milpa, hermana por hermana y raíz por raíz — la misma verdad del registro
   (mundoData.js), contada en una leyenda didáctica y verificada (catálogo:
   companions recíprocos maíz↔fríjol↔calabaza; fijación biológica de N). */
const LEYENDA = [
  { emoji: '🌽', titulo: 'El maíz da la vara', texto: 'El maíz crece derecho y firme: es el tutor vivo por donde el fríjol trepa, sin gastar estacas ni alambre.' },
  { emoji: '🫘', titulo: 'El fríjol sube y abona', texto: 'Se enreda en la caña y, bajo tierra, sus raíces guardan bacterias (Rhizobium) que fijan el nitrógeno del aire: entre 50 y 80 kilos por hectárea, abono para las tres.' },
  { emoji: '🎃', titulo: 'La calabaza tapa el suelo', texto: 'Sus hojas anchas se riegan por el suelo: guardan la humedad, le hacen sombra a la maleza y su flor amarilla llama a las abejas.' },
  { emoji: '🌸', titulo: 'Los nódulos: el nitrógeno que se ve', texto: 'Esas pelotitas rosadas en la raíz del fríjol son fábricas de nitrógeno. Lo que no se ve bajo la tierra, en el corte se ve.' },
  { emoji: '🐛', titulo: 'Juntas se defienden', texto: 'Revueltas (no en monocultivo) confunden y reparten las plagas, como el cogollero; se maneja con Bt o la avispita Cotesia, sin veneno.' },
];

export default function Mundo3DMilpa() {
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

  // En la vitrina (sin sesión) un punto del corte no navega: cuenta a qué
  // pantalla real de la app lleva esa puerta.
  const [puerta, setPuerta] = useState(null);
  const onHotspot = (view, data) => {
    const hs = (MUNDO.milpa.hotspots || []).find(
      (h) => h.view === view && (h.data === data || (!h.data && !data)),
    ) || (MUNDO.milpa.hotspots || []).find((h) => h.view === view);
    setPuerta({ label: hs?.label || view, view });
  };

  return (
    <main
      className="m3dm"
      style={{ '--m3dm-a': TINTE[0], '--m3dm-b': TINTE[1] }}
    >
      <header className="m3dm__head">
        <p className="m3dm__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo de la milpa</h1>
        <p className="m3dm__lema">
          Las tres hermanas en una sola cama: el maíz da la vara, el fríjol sube
          y regala nitrógeno, la calabaza tapa el suelo. Asómese al corte y vea
          arriba la asociación y abajo los nódulos que abonan la tierra. Menos
          colapso, finca viva.
        </p>
      </header>

      <section className="m3dm__escena" aria-label="El corte de la milpa: las tres hermanas y los nódulos de nitrógeno">
        <Mundo
          mundoId="milpa"
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={onHotspot}
          onSalir={null}
          animo="sereno"
          energia={0.9}
        />
        <div className="m3dm__barra">
          <p className="m3dm__tier">
            {tier === 'bajo'
              ? 'Está viendo el dibujo del corte (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dm__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver el dibujo 2D'}
            </button>
          )}
        </div>
        <p className="m3dm__nota" role="status" aria-live="polite">
          {puerta
            ? `«${puerta.label}» es una puerta real: dentro de la app abre la pantalla «${puerta.view}».`
            : 'Toque un punto del corte para ver a dónde lo lleva.'}
        </p>
      </section>

      <section className="m3dm__leyenda" aria-label="La milpa, hermana por hermana">
        <h2>La milpa, hermana por hermana</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dm__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dm__cierre">
          No es revolver por revolver: es un trato viejo y sabio entre tres
          plantas. Siémbrelas juntas y déle de comer al suelo mientras cosecha —
          la milpa alimenta a la familia y a la tierra.
        </p>
      </section>
    </main>
  );
}
