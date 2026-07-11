/*
 * Mundo3DAnimales — vitrina pública del MUNDO DE LOS ANIMALES (ruta
 * #/mockups/mundo3d-animales).
 *
 * El corral como LUGAR y el ciclo cerrado del abono como un anillo virtuoso que
 * se camina: animal → estiércol → compost → suelo → planta → de vuelta al animal.
 * Gallinas ponedoras, la vaca, la oveja; el escarabajo estercolero que entierra
 * la bosta y cierra el ciclo. Didáctico y esperanzador — menos colapso, finca
 * viva. Nada de catástrofe: el corral vivo trabajando a favor de la finca.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="animales">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento" activado) se ve el gemelo 2D digno; en
 * gama media/alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con
 * los animales diferenciados (gallina, vaca de cuerpo capsular, oveja de vellón)
 * y la abeja Angelita entrando al mundo. Los puntos del corral son las mismas
 * puertas del registro: aquí (vitrina sin sesión) muestran a qué pantalla real
 * de la app llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import AcompananteMundo, { useAcompanante } from './valle/AcompananteMundo.jsx';
import './Mundo3DAnimales.css';

const TINTE = ['#a86a3a', '#f3e3cf'];

/* El anillo del abono, eslabón por eslabón — la misma verdad del registro
   (mundoData.js), contada en una leyenda didáctica y verificada. */
const LEYENDA = [
  { emoji: '🐮', titulo: 'El corral vivo', texto: 'La vaca, la oveja y las gallinas no son solo comida: son el motor que mueve el abono de la finca. Pocos animales bien tenidos, con su espacio.' },
  { emoji: '🐔', titulo: 'Las gallinas ponedoras', texto: 'La ponedora se da bien en clima frío si tiene abrigo y comida; además de los huevos, su gallinaza es de los abonos más fuertes que hay.' },
  { emoji: '💩', titulo: 'Del corral, el estiércol', texto: 'La bosta y la gallinaza no son basura ni problema: son la materia prima del abono. Recogerlas es empezar a cerrar el ciclo.' },
  { emoji: '🍂', titulo: 'El estiércol se hace compost', texto: 'Amontonado con hojarasca y volteado, el estiércol se calienta, madura y se vuelve tierra buena, negra y sin olor: compost listo para la huerta.' },
  { emoji: '🌱', titulo: 'Vuelve al cultivo', texto: 'Ese abono alimenta las matas, que dan comida y rastrojo, que vuelve a los animales. El anillo se cierra y la finca casi no necesita comprar nada de afuera.' },
  { emoji: '🪲', titulo: 'El escarabajo estercolero', texto: 'El cucarrón que rueda la bolita de bosta y la entierra hace gratis un trabajo enorme: incorpora el abono al suelo y limpia el potrero. Vida que trabaja.' },
];

export default function Mundo3DAnimales() {
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

  // La capa acompañante (BUG P1 "vitrinas mudas"): Angelita narra el mundo al
  // entrar y acusa las puertas tocadas — voz + burbuja de texto; si el equipo
  // no trae voz o está apagada, la burbuja ES la voz. Nunca mudo.
  const acompanante = useAcompanante('animales');

  return (
    <main
      className="m3dan"
      style={{ '--m3dan-a': TINTE[0], '--m3dan-b': TINTE[1] }}
    >
      <header className="m3dan__head">
        <p className="m3dan__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo de los animales</h1>
        <p className="m3dan__lema">
          Entre al corral y camine el ciclo del abono: del animal al estiércol,
          del estiércol al compost, del compost a la mata y de vuelta al animal.
          Un anillo que se cierra solo. Menos colapso, finca viva.
        </p>
      </header>

      <section className="m3dan__escena" aria-label="El corral y el ciclo del abono de la finca">
        <AcompananteMundo mundoId="animales" acompanante={acompanante}>
          <Mundo
            mundoId="animales"
            tier={tier}
            reducedMotion={reducedMotion}
            onHotspot={acompanante.decirPuerta}
            onSalir={null}
            animo="sereno"
            energia={0.85}
            hablando={acompanante.hablando}
          />
        </AcompananteMundo>
        <div className="m3dan__barra">
          <p className="m3dan__tier">
            {tier === 'bajo'
              ? 'Está viendo el dibujo del corral (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dan__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver el dibujo 2D'}
            </button>
          )}
        </div>
        <p className="m3dan__nota">Toque un punto del corral para ver a dónde lo lleva.</p>
      </section>

      <section className="m3dan__leyenda" aria-label="El ciclo del abono, eslabón por eslabón">
        <h2>El ciclo del abono, eslabón por eslabón</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dan__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dan__cierre">
          Una finca con animales bien tenidos no bota nada: lo que sale del corral
          vuelve a la tierra hecho fuerza. Empiece por recoger el estiércol y
          armar su primera pila de compost — el anillo arranca ahí.
        </p>
      </section>
    </main>
  );
}
