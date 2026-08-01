/*
 * Mundo3DCafe — vitrina pública del MUNDO DEL CAFÉ (ruta #/mockups/mundo3d-cafe).
 *
 * El cafetal bajo sombra de la finca andina: el cultivo bandera hecho lugar. El
 * diorama enseña lo que de verdad es una finca cafetera — la SOMBRA de guamo y
 * nogal que le hace techo al cultivo (café de sombra = café con aves, no potrero
 * de sol), los CAFETOS cargados de cereza roja, el GRANO en sus tres estados sin
 * tostar en la finca (cereza → pergamino → oro), la ROYA (Hemileia vastatrix) y
 * la BROCA (Hypothenemus hampei) manejadas con criterio, y el BENEFICIO del
 * rincón (despulpar, fermentar, secar). Del árbol a la taza pasando por el campo,
 * sin recetas de veneno ni humo de tostión en la parcela.
 *
 * NO reimplementa nada: monta `<Mundo mundoId="cafe">` del framework
 * (src/visual/mundo3d) con el device-tiering REAL (`decidirTier`). En equipo
 * humilde (o con "menos movimiento") se ve la ficha 2D digna; en gama media/
 * alta, el diorama 3D low-poly (chunk perezoso `vendor-three`) con la abeja
 * Angelita entrando al mundo. Los puntos del cafetal son las mismas puertas del
 * registro: aquí (vitrina sin sesión) muestran a qué pantalla real de la app
 * llevan, en vez de navegar.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import { useMemo, useState } from 'react';
import Mundo, { decidirTier, permite3D } from '../visual/mundo3d/index.js';
import AcompananteMundo, { useAcompanante } from './valle/AcompananteMundo.jsx';
import './Mundo3DCafe.css';

const TINTE = ['#7a4a24', '#efe0cf'];

/* Lo que se ve en el cafetal, contado en una leyenda didáctica y verificada:
   café real del país (sombra + grano + sanidad + beneficio), sin promesas de
   plata ni recetas químicas de dosis. */
const LEYENDA = [
  {
    emoji: '🌳',
    titulo: 'El café bajo sombra',
    texto: 'El cafeto no es de pleno sol: crece mejor debajo del guamo y el nogal. La sombra le baja el calor, le guarda la humedad, le abona con la hoja que cae y le devuelve las aves. Café de sombra es café con vida, no potrero pelado.',
  },
  {
    emoji: '☕',
    titulo: 'El grano: cereza, pergamino y oro',
    texto: 'La cereza roja madura es el fruto. Se despulpa y seca hasta el pergamino (el grano en su cascarilla) y se trilla hasta el oro (el grano verde que se vende). En la finca NO se tuesta: el tueste es del otro lado. Lo suyo es entregar oro parejo.',
  },
  {
    emoji: '📏',
    titulo: 'El piso del café',
    texto: 'En la ladera andina el café da mejor entre los 1200 y 1800 metros. Más abajo se acalora y más arriba se enfría. Conocer su altura le dice qué variedad le sirve y cuándo le va a florecer y cargar.',
  },
  {
    emoji: '🍂',
    titulo: 'La roya y la broca, con criterio',
    texto: 'La roya (Hemileia vastatrix) es el polvillo naranja bajo la hoja; la broca (Hypothenemus hampei) es el gorgojo que perfora la cereza. Se manejan con variedad resistente, cosecha bien recogida, trampas y hongos de biocontrol — no con recetas de veneno.',
  },
  {
    emoji: '💧',
    titulo: 'El beneficio: despulpar, fermentar, secar',
    texto: 'Despulpe la cereza el mismo día, fermente el mucílago en el tanque y seque el grano despacio al sol (paseo o parabólico). Un buen beneficio es la mitad de la taza: ahí se gana o se pierde el precio.',
  },
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

  // La capa acompañante (BUG P1 "vitrinas mudas"): Angelita narra el mundo al
  // entrar y acusa las puertas tocadas — voz + burbuja de texto; si el equipo
  // no trae voz o está apagada, la burbuja ES la voz. Nunca mudo.
  const acompanante = useAcompanante('cafe');

  return (
    <main
      className="m3dcaf"
      style={{ '--m3dcaf-a': TINTE[0], '--m3dcaf-b': TINTE[1] }}
    >
      <header className="m3dcaf__head">
        <p className="m3dcaf__kicker">Los mundos de su finca · vitrina</p>
        <h1>El mundo del café</h1>
        <p className="m3dcaf__lema">
          Métase al cafetal de la ladera: el arbusto que vive bajo la sombra del
          guamo, la cereza que se vuelve pergamino y oro sin pasar por el
          tostador, la roya y la broca manejadas con criterio, y el beneficio que
          convierte el fruto en grano de vender. Café con sombra, con aves y con
          precio justo.
        </p>
      </header>

      <section className="m3dcaf__escena" aria-label="El cafetal bajo sombra de la finca">
        <AcompananteMundo mundoId="cafe" acompanante={acompanante}>
          <Mundo
            mundoId="cafe"
            tier={tier}
            reducedMotion={reducedMotion}
            onHotspot={acompanante.decirPuerta}
            onSalir={null}
            animo="sereno"
            energia={0.9}
            hablando={acompanante.hablando}
          />
        </AcompananteMundo>
        <div className="m3dcaf__barra">
          <p className="m3dcaf__tier">
            {tier === 'bajo'
              ? 'Está viendo la ficha del café (va parejo en cualquier equipo).'
              : 'Está viendo el diorama 3D. Puede girarlo con el dedo.'}
          </p>
          {puede3D && (
            <button
              type="button"
              className="m3dcaf__toggle"
              onClick={() => setVer2d((v) => !v)}
            >
              {ver2d ? 'Ver en 3D' : 'Ver la ficha 2D'}
            </button>
          )}
        </div>
        <p className="m3dcaf__nota">Toque un punto del cafetal para ver a dónde lo lleva.</p>
      </section>

      <section className="m3dcaf__leyenda" aria-label="El café, pieza por pieza">
        <h2>El cafetal, pieza por pieza</h2>
        <ol>
          {LEYENDA.map((p) => (
            <li key={p.titulo}>
              <span className="m3dcaf__emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="m3dcaf__cierre">
          El buen café no sale de una receta de bulto: sale de la sombra que lo
          cuida, de la cereza recogida en su punto, de la roya atajada a tiempo y
          del beneficio hecho con paciencia. Cuide el árbol, cuide el grano y
          entregue oro parejo — ahí está el valor de lo suyo.
        </p>
      </section>
    </main>
  );
}
