/*
 * Mundo3DAgua — vitrina pública del MUNDO DEL AGUA (ruta #/mockups/mundo3d-agua).
 *
 * El recorrido del agua de la finca, de punta a punta: dónde nace, la ronda de
 * monte que lo protege, la quebrada viva, el punto donde se cuida de no
 * contaminarla, la toma con su tanque y la huerta que se riega con medida.
 * Didáctico y esperanzador — menos colapso, finca viva.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="agua">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento" activado) se ve el gemelo 2D digno; en
 * gama media/alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con
 * la abeja Angelita entrando al mundo. Los puntos del recorrido son las mismas
 * puertas del registro: aquí (vitrina sin sesión) muestran a qué pantalla real
 * de la app llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import AcompananteMundo, { useAcompanante } from './valle/AcompananteMundo.jsx';
import './Mundo3DAgua.css';

const TINTE = ['#2f7fa3', '#d7ecf3'];

/* El recorrido, punto por punto — la misma data del registro (mundoData.js),
   contada en una leyenda didáctica. */
const LEYENDA = [
  { emoji: '💧', titulo: 'Donde nace', texto: 'El nacimiento es el corazón del agua de su finca: si él está bien, todo lo demás recibe.' },
  { emoji: '🌳', titulo: 'La ronda que lo protege', texto: 'La franja de monte alrededor del nacimiento y la quebrada guarda el agua fresca y firme el año entero.' },
  { emoji: '🐟', titulo: 'La quebrada viva', texto: 'Si en la quebrada hay peces, ranas y libélulas, el agua está contando que viene sana.' },
  { emoji: '⚠️', titulo: 'Donde se cuida', texto: 'Ni lavar la bomba ni botar sobras cerca de la quebrada: ese cuidado de hoy es el agua de mañana.' },
  { emoji: '🚰', titulo: 'La toma y el tanque', texto: 'La bocatoma toma solo lo que se necesita y el tanque lo guarda para la casa y el riego.' },
  { emoji: '🥕', titulo: 'La huerta regada', texto: 'El agua termina su recorrido volviéndose comida: riego con medida, cosecha segura.' },
];

export default function Mundo3DAgua() {
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
  const acompanante = useAcompanante('agua');

  return (
    <main
      className="m3da"
      style={{ '--m3da-a': TINTE[0], '--m3da-b': TINTE[1] }}
    >
      <header className="m3da__head">
        <p className="m3da__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo del agua</h1>
        <p className="m3da__lema">
          Recorra el camino del agua: dónde nace, por dónde baja, dónde se
          cuida y qué riega. Menos colapso, finca viva.
        </p>
      </header>

      <section className="m3da__escena" aria-label="El recorrido del agua de la finca">
        <AcompananteMundo mundoId="agua" acompanante={acompanante}>
          <Mundo
            mundoId="agua"
            tier={tier}
            reducedMotion={reducedMotion}
            onHotspot={acompanante.decirPuerta}
            onSalir={null}
            animo="sereno"
            energia={0.85}
            hablando={acompanante.hablando}
          />
        </AcompananteMundo>
        <div className="m3da__barra">
          <p className="m3da__tier">
            {tier === 'bajo'
              ? 'Está viendo el dibujo del recorrido (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3da__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver el dibujo 2D'}
            </button>
          )}
        </div>
        <p className="m3da__nota">Toque un punto del recorrido para ver a dónde lo lleva.</p>
      </section>

      <section className="m3da__leyenda" aria-label="El recorrido, punto por punto">
        <h2>El recorrido, punto por punto</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3da__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3da__cierre">
          Cuidar el agua no es una carga: es la finca entera trabajando a su
          favor. Empiece por un punto — el que usted tenga más a la mano.
        </p>
      </section>
    </main>
  );
}
