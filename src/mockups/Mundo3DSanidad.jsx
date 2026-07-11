/*
 * Mundo3DSanidad — vitrina pública del MUNDO DE LA SANIDAD (ruta
 * #/mockups/mundo3d-sanidad).
 *
 * La huerta-clínica de la finca andina: cómo se cuida la mata SIN veneno. El
 * diorama enseña el manejo agroecológico de plagas con lo que de verdad
 * funciona en finca — las trampas cromáticas que llaman al bicho, la estación
 * de biocontrol con hongos que enferman al insecto (Beauveria/Metarhizium), el
 * borde de flores aromáticas que empuja la plaga y jala a sus enemigos, y los
 * enemigos naturales (la mariquita que come pulgón, el carábido del suelo). Nada
 * de recetas de químicos: manejo vivo, esperanzador. Finca sana, no envenenada.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="sanidad">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve la infografía 2D digna; en gama
 * media/alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con la
 * abeja Angelita entrando al mundo. Los puntos del recinto son las mismas
 * puertas del registro: aquí (vitrina sin sesión) muestran a qué pantalla real
 * de la app llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { MUNDO, decidirTier, permite3D } from '../visual/mundo3d/index.js';
import './Mundo3DSanidad.css';

const TINTE = ['#b0532f', '#f6ded1'];

/* Lo que se ve en el recinto, contado en una leyenda didáctica y verificada:
   manejo agroecológico real de plagas (control biológico + trampas + push-pull),
   sin una sola receta química. */
const LEYENDA = [
  {
    emoji: '🍅',
    titulo: 'Las matas sanas',
    texto: 'En el centro, lo que se protege. Una mata bien nutrida y sin estrés se defiende sola: el mejor control de plagas empieza por un suelo vivo y una planta fuerte.',
  },
  {
    emoji: '🎯',
    titulo: 'Las trampas cromáticas',
    texto: 'Tarjetas pegajosas de color: la amarilla llama a la mosca blanca y al minador; la azul, a los trips. Sirven para vigilar cuánto bicho hay y para bajar la población, sin echar nada.',
  },
  {
    emoji: '🧫',
    titulo: 'El biocontrol con hongos',
    texto: 'La estación con hongos entomopatógenos (Beauveria bassiana y Metarhizium): esporas que se pegan al insecto y lo enferman. Es un aliado vivo y de bajo riesgo para usted; como también puede afectar insectos benéficos, aplíquelo dirigido a la plaga y evite asperjar sobre flores abiertas donde están las abejas.',
  },
  {
    emoji: '🌼',
    titulo: 'El borde que empuja y jala (push-pull)',
    texto: 'La orla de flores aromáticas trabaja de dos maneras: unas como la caléndula jalan y alojan a los enemigos naturales (los atraen), y otras como la flor de muerto (Tagetes) ayudan a empujar la plaga lejos. Sembrar compañía es defender la huerta con plantas.',
  },
  {
    emoji: '🐞',
    titulo: 'Los enemigos naturales',
    texto: 'La mariquita y su larva comen cientos de pulgones; el escarabajo del suelo caza larvas de noche; avispitas y moscas ayudan también. Cuidarlos es tener una cuadrilla que trabaja gratis.',
  },
];

export default function Mundo3DSanidad() {
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

  // En la vitrina (sin sesión) un punto del recinto no navega: cuenta a qué
  // pantalla real de la app lleva esa puerta.
  const [puerta, setPuerta] = useState(null);
  const onHotspot = (view, data) => {
    const hs = (MUNDO.sanidad.hotspots || []).find(
      (h) => h.view === view && (h.data === data || (!h.data && !data)),
    ) || (MUNDO.sanidad.hotspots || []).find((h) => h.view === view);
    setPuerta({ label: hs?.label || view, view });
  };

  return (
    <main
      className="m3dsan"
      style={{ '--m3dsan-a': TINTE[0], '--m3dsan-b': TINTE[1] }}
    >
      <header className="m3dsan__head">
        <p className="m3dsan__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo de la sanidad</h1>
        <p className="m3dsan__lema">
          Asómese a la huerta-clínica: cómo se cuida la mata sin veneno. Trampas
          que llaman al bicho, hongos que lo enferman, flores que lo espantan y
          los enemigos naturales que lo cazan. Finca sana, no envenenada.
        </p>
      </header>

      <section className="m3dsan__escena" aria-label="La huerta-clínica de la finca">
        <Mundo
          mundoId="sanidad"
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={onHotspot}
          onSalir={null}
          animo="atento"
          energia={0.9}
        />
        <div className="m3dsan__barra">
          <p className="m3dsan__tier">
            {tier === 'bajo'
              ? 'Está viendo la ficha de la sanidad (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dsan__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver la ficha 2D'}
            </button>
          )}
        </div>
        <p className="m3dsan__nota" role="status" aria-live="polite">
          {puerta
            ? `«${puerta.label}» es una puerta real: dentro de la app abre la pantalla «${puerta.view}».`
            : 'Toque un punto del recinto para ver a dónde lo lleva.'}
        </p>
      </section>

      <section className="m3dsan__leyenda" aria-label="La sanidad, pieza por pieza">
        <h2>La huerta-clínica, pieza por pieza</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dsan__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dsan__cierre">
          La sanidad no se compra en un frasco: se cría. Suelo vivo, plantas
          fuertes, compañía florida y bichos buenos cuidados — y la plaga deja de
          mandar. Antes de reaccionar, mire: revise el envés de la hoja, cuente
          en la trampa y decida con cabeza. Menos veneno, más finca viva.
        </p>
      </section>
    </main>
  );
}
