/*
 * FrutalesAndinos3D — vitrina pública del VERGEL DE FRUTALES ANDINOS.
 * Ruta #/mockups/frutales-andinos-3d, sin auth.
 *
 * Las SIETE del clima frío que el catálogo respalda: mora de Castilla, lulo,
 * tomate de árbol, uchuva, granadilla, gulupa y curuba. El vergel se recorre
 * como es en la finca — la mora y la gulupa amarradas a su espaldera, la
 * granadilla y la curuba tendidas en la ramada, el lulo en su claro, el tomate
 * de árbol de porte alto atrás y la uchuva al borde del lote.
 *
 * LO QUE ESTA PÁGINA NO TIENE, A PROPÓSITO: mango y cítricos. Son de piso
 * cálido, no de este vergel, y el catálogo no los respalda con la misma fuerza.
 * Un frutal dibujado de memoria le llega al campesino como enseñanza falsa, así
 * que preferimos siete bien hechas a nueve de las cuales dos son inventadas.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el vergel en 3D
 * (chunk perezoso `vendor-three`); en equipo humilde, ahorro de datos o
 * sin-WebGL se ve la tabla del elenco, que enseña lo mismo sin sudar la GPU.
 * Copy en español de Colombia, en "usted". Autocontenida: cero CDN.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import './FrutalesAndinos3D.css';

const Vergel = lazy(() => import('../visual/mundo3d/frutalesAndinos/VergelFrutalesAndinos.jsx'));

/* El elenco con lo que de verdad lo distingue en el campo. Cada ficha responde
   a una sola pregunta: ¿en qué me fijo para saber cuál es? */
const ELENCO = [
  {
    id: 'mora',
    nombre: 'Mora de Castilla',
    cientifico: 'Rubus glaucus',
    sena: 'No es un árbol: son cañas con espinas amarradas a la espaldera.',
    detalle:
      'La hoja va en tres hojitas (trifoliada) y por debajo es más clara. En la misma rama usted ve fruta verde, roja y morada casi negra: por eso se cosecha por pases y no de un solo tirón.',
  },
  {
    id: 'lulo',
    nombre: 'Lulo',
    cientifico: 'Solanum quitoense',
    sena: 'La hoja enorme, ancha y con la nervadura morada.',
    detalle:
      'Es la hoja más grande de todo el vergel — se reconoce de lejos sin mirar el fruto. La mata es baja y el fruto naranja sale pegado al tallo.',
  },
  {
    id: 'tomate',
    nombre: 'Tomate de árbol',
    cientifico: 'Solanum betaceum',
    sena: 'El único de porte alto: tronco que sube y se abre arriba.',
    detalle:
      'Hoja grande acorazonada, y el fruto ovalado (nunca redondo) colgando en racimos. Si el fruto le sale redondo, ya dibujó otra cosa.',
  },
  {
    id: 'uchuva',
    nombre: 'Uchuva',
    cientifico: 'Physalis peruviana',
    sena: 'El capacho: la fruta va dentro de un farolito de papel.',
    detalle:
      'Mata baja que se tutorea. El capacho es el cáliz que envuelve la baya y se seca a medida que madura. Sin capacho no es uchuva, es una bolita naranja.',
  },
  {
    id: 'granadilla',
    nombre: 'Granadilla',
    cientifico: 'Passiflora ligularis',
    sena: 'Hoja entera acorazonada y fruto redondo anaranjado.',
    detalle:
      'Bejuco que se tiende en ramada: uno camina por debajo y la fruta cuelga sobre la cabeza. Su hoja es de una sola pieza — ahí se separa de la gulupa y la curuba.',
  },
  {
    id: 'gulupa',
    nombre: 'Gulupa',
    cientifico: 'Passiflora edulis f. edulis',
    sena: 'Hoja de tres lóbulos y fruto redondo morado oscuro.',
    detalle:
      'Es la pasiflora que más se confunde con la granadilla. La diferencia se ve en dos sitios: la hoja partida en tres y el color del fruto.',
  },
  {
    id: 'curuba',
    nombre: 'Curuba',
    cientifico: 'Passiflora tripartita',
    sena: 'Flor rosada colgante de tubo largo y fruto alargado amarillo.',
    detalle:
      'La flor la delata antes que la fruta: cuelga hacia abajo, rosada y con el tubo largo. Y el fruto es alargado, no redondo como el de sus dos parientes.',
  },
];

/* Lo que enseña el vergel completo (más allá de cada especie). */
const SABERES = [
  {
    emoji: '🪜',
    titulo: 'Cada una se conduce distinto',
    texto:
      'La mora y la gulupa van en espaldera (postes con alambres); la granadilla y la curuba, en ramada, que es un techo de varas por el que se tiende el bejuco. El lulo, el tomate de árbol y la uchuva van sueltos o con tutor. La estructura no es adorno: es la mitad del cultivo.',
  },
  {
    emoji: '🌡️',
    titulo: 'Todas son de clima frío',
    texto:
      'Este vergel es de tierra fría andina. Por eso acá no hay mango ni naranjos: esos son de piso cálido y no comparten ni la altura, ni el manejo, ni las plagas. Mezclarlos en un mismo dibujo confunde más de lo que enseña.',
  },
  {
    emoji: '🍃',
    titulo: 'Primero la hoja, después la fruta',
    texto:
      'En el campo usted casi siempre llega a la mata cuando no tiene fruta. Por eso lo que hay que aprender a leer es la hoja y el porte: la hoja gigante del lulo, la de tres hojitas de la mora, la partida en tres de la gulupa.',
  },
  {
    emoji: '🐝',
    titulo: 'Sin polinizador no hay cosecha',
    texto:
      'Las pasifloras dependen de que alguien les lleve el polen, y las flores grandes de la curuba están hechas para pico largo. Si usted acaba con lo que vuela, la ramada florece bonito y no cuaja nada.',
  },
];

export default function FrutalesAndinos3D() {
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
  const tier = ver2d || !puede3D ? 'bajo' : decision.tier;
  const mostrar3D = puede3D && !ver2d;

  return (
    <main className="vfrut">
      <header className="vfrut__head">
        <p className="vfrut__kicker">El vergel de clima frío · vitrina</p>
        <h1>Siete frutales que no se parecen en nada</h1>
        <p className="vfrut__lema">
          Mora, lulo, tomate de árbol, uchuva, granadilla, gulupa y curuba. Todas
          de tierra fría, y todas con una seña propia que se aprende de una:
          recorra el vergel y después mire la tabla.
        </p>
      </header>

      <section className="vfrut__escena" aria-label="El vergel de frutales andinos en 3D">
        {mostrar3D ? (
          <Suspense fallback={<p className="vfrut__cargando">Sembrando el vergel…</p>}>
            <Vergel tier={tier} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <div className="vfrut__ficha">
            <p>
              En este equipo le mostramos el vergel en tabla, que enseña lo mismo
              y no le hace sudar la máquina. Baje y mire las siete señas.
            </p>
          </div>
        )}
        {puede3D && (
          <button type="button" className="vfrut__toggle" onClick={() => setVer2d((v) => !v)}>
            {ver2d ? 'Ver el vergel en 3D' : 'Ver solo la tabla'}
          </button>
        )}
      </section>

      <section className="vfrut__elenco" aria-label="Las siete del vergel">
        <h2>En qué se fija para saber cuál es</h2>
        <ul>
          {ELENCO.map((f) => (
            <li key={f.id}>
              <h3>
                {f.nombre} <em>{f.cientifico}</em>
              </h3>
              <p className="vfrut__sena">{f.sena}</p>
              <p className="vfrut__detalle">{f.detalle}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="vfrut__saberes" aria-label="Lo que enseña el vergel">
        <h2>Cuatro cosas del vergel entero</h2>
        <ul>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span aria-hidden="true">{s.emoji}</span>
              <h3>{s.titulo}</h3>
              <p>{s.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="vfrut__nota">
        Acá no hay mango ni cítricos a propósito: son frutales de piso cálido y
        este vergel es de tierra fría. Cuando les toque el turno se dibujarán con
        el mismo cuidado, en su propio piso térmico.
      </p>
    </main>
  );
}
