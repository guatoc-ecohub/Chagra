/*
 * MundoPolinizadores3D — vitrina pública del MUNDO DE LA RED QUE DA LA
 * COSECHA. Ruta #/mockups/mundo-polinizadores-3d, sin auth.
 *
 * La tesis, en una línea: SIN ESTOS BICHOS NO HAY COSECHA — y el trabajo que
 * hacen es invisible, y por invisible es gratis, y por gratis no se cuida.
 * Este mockup monta la finca completa (`EscenaPolinizadores`, ya armada con
 * el rincón de monte, el meliponario, la cerca viva florida, el maracuyá, la
 * ahuyama, el cafetal y el maizal) y le pone ENCIMA los tres interruptores
 * que enseñan lo que un párrafo no logra:
 *
 *   día/noche    la finca cambia de turno (se recogen las abejas, entra el
 *                murciélago a las flores pálidas del guamo).
 *   ojo de abeja se apaga la flor roja del colibrí y se encienden las guías
 *                de néctar ultravioleta.
 *   la deriva    cruza el veneno del lote vecino: los hilos de polen se van
 *                en ceniza y el enjambre se calla — distinto de día que de
 *                noche, porque el veneno no tiene horario y las abejas sí.
 *
 * Device-tiering REAL (`decidirTier`): gama media/alta ve el mundo 3D (chunk
 * perezoso `vendor-three`); en equipo humilde, ahorro de datos o sin-WebGL se
 * ve la ficha, digna y sin sudar la GPU. Copy en español de Colombia, en
 * "usted". Autocontenida: cero CDN/imágenes externas.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import '../visual/mundo3d/polinizadores/polinizadores.css';
import './MundoPolinizadores3D.css';

const EscenaPolinizadores = lazy(() => import('../visual/mundo3d/polinizadores/EscenaPolinizadores.jsx'));

/* Lo que enseña este mundo (verificado en el corpus de campo, en "usted"). */
const SABERES = [
  {
    emoji: '🐝',
    titulo: 'Ocho bichos, no uno',
    texto:
      'Polinizador no es sinónimo de abeja. En esta finca trabajan la angelita y la abeja de miel, el abejorro, el colibrí, el murciélago, la mariposa, el sírfido (una mosca disfrazada de abeja) y el escarabajo. Cada uno hace lo que ningún otro hace igual.',
  },
  {
    emoji: '🌺',
    titulo: 'Cada flor llama al suyo',
    texto:
      'El color, la forma, el olor y hasta la hora de abrirse evolucionaron juntos para llamar a un visitante. La flor roja y tubular llama al colibrí; la blanca grande que huele de noche llama al murciélago; la amarilla abierta de la mañana llama a la abeja.',
  },
  {
    emoji: '👁️',
    titulo: 'El mundo con el ojo de la abeja',
    texto:
      'Las abejas no ven el rojo: ven azul, morado, amarillo y ultravioleta. Donde nosotros vemos una flor pareja, ellas ven guías de néctar que las llevan derecho al premio. Actívelo y va a entender el síndrome floral en un segundo.',
  },
  {
    emoji: '☠️',
    titulo: 'La deriva tiene horario, la abeja también',
    texto:
      'Cuando el veneno del lote vecino cruza de día, se lleva la mayoría del enjambre; de noche el daño es otro, porque las abejas duermen y el murciélago sigue trabajando. La red se recupera si queda monte de dónde volver.',
  },
];

export default function MundoPolinizadores3D() {
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

  const [momento, setMomento] = useState('dia');
  const [comoAbeja, setComoAbeja] = useState(false);
  const [veneno, setVeneno] = useState(false);
  const [diezmado, setDiezmado] = useState(0);

  return (
    <main className="mpoliniz">
      <header className="mpoliniz__head">
        <p className="mpoliniz__kicker">La red que da la cosecha · vitrina</p>
        <h1>El mundo de los polinizadores</h1>
        <p className="mpoliniz__lema">
          Ocho bichos, siete síndromes florales y la red de polen tejiéndose
          sobre el maracuyá, la ahuyama, el cafetal y la cerca viva. Recórrala
          con el dedo y pruebe los tres interruptores: el turno, el ojo de la
          abeja y la deriva del vecino.
        </p>
      </header>

      <section className="mpoliniz__escena" aria-label="La red de polinización en 3D">
        <div className="mpoliniz__lienzo">
          {mostrar3D ? (
            <div
              className="polz-mundo"
              data-tier={tier}
              data-momento={momento}
              data-vision={comoAbeja ? 'abeja' : 'humana'}
              data-veneno={veneno ? '1' : '0'}
            >
              <Suspense
                fallback={
                  <div className="mpoliniz__cargando" role="status">
                    Entrando a la finca…
                  </div>
                }
              >
                <EscenaPolinizadores
                  tier={tier}
                  reducedMotion={reducedMotion}
                  momento={momento}
                  comoAbeja={comoAbeja}
                  veneno={veneno}
                  onDano={setDiezmado}
                />
              </Suspense>
            </div>
          ) : (
            <FichaPolinizadores />
          )}
        </div>

        {mostrar3D && (
          <div className="mpoliniz__interruptores" role="group" aria-label="Los tres interruptores del mundo">
            <button
              type="button"
              className="mpoliniz__switch"
              aria-pressed={momento === 'noche'}
              onClick={() => setMomento((m) => (m === 'dia' ? 'noche' : 'dia'))}
            >
              {momento === 'dia' ? '🌙 Ver de noche' : '☀️ Ver de día'}
            </button>
            <button
              type="button"
              className="mpoliniz__switch"
              aria-pressed={comoAbeja}
              onClick={() => setComoAbeja((v) => !v)}
            >
              {comoAbeja ? '👁️ Ver con ojo humano' : '🐝 Ver con ojo de abeja'}
            </button>
            <button
              type="button"
              className="mpoliniz__switch mpoliniz__switch--veneno"
              aria-pressed={veneno}
              onClick={() => setVeneno((v) => !v)}
            >
              {veneno ? '✕ Quitar la deriva' : '☠️ Cruzar la deriva del vecino'}
            </button>
            {veneno && diezmado > 0 && (
              <p className="mpoliniz__dano" role="status">
                Se fue el {Math.round(diezmado * 100)} % del enjambre
                {momento === 'noche' ? ' (de noche el daño es menor)' : ''}.
              </p>
            )}
          </div>
        )}

        <div className="mpoliniz__barra">
          <p className="mpoliniz__tier">
            {mostrar3D
              ? 'Está viendo la finca en 3D. Gírela con el dedo o el mouse.'
              : puede3D
                ? 'Está viendo la ficha de la red de polinización.'
                : 'Su equipo ve la ficha de la red de polinización (va parejo en cualquier teléfono).'}
          </p>
          {puede3D && (
            <button type="button" className="mpoliniz__toggle" onClick={() => setVer2d((v) => !v)}>
              {ver2d ? 'Ver la finca en 3D' : 'Ver la ficha'}
            </button>
          )}
        </div>
      </section>

      <section className="mpoliniz__saberes" aria-label="Lo que enseña este mundo">
        <h2>Lo que le enseña esta red</h2>
        <ol>
          {SABERES.map((s) => (
            <li key={s.titulo}>
              <span className="mpoliniz__emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mpoliniz__cierre">
          El polen que viaja de flor en flor no lo paga nadie y no lo ve
          nadie: por eso es la primera cosecha que se pierde cuando se acaba
          el monte o cruza el veneno. Cuidar la red no cuesta cemento — cuesta
          dejarle un rincón a los bichos.
        </p>
      </section>
    </main>
  );
}

/* La ficha de la red: el fallback digno para equipo humilde / sin-WebGL. Una
   angelita CSS sobre la flor amarilla, con el hilo de polen tendido — cero GPU. */
function FichaPolinizadores() {
  return (
    <div
      className="mpoliniz__ficha"
      role="img"
      aria-label="La red de polinización: la abeja angelita sobre la flor, con el hilo de polen tendido"
    >
      <div className="mpoliniz__estampa" aria-hidden="true">
        <span className="mpoliniz__flor" />
        <span className="mpoliniz__hilo" />
        <span className="mpoliniz__abeja">
          <span className="mpoliniz__abeja-banda" />
        </span>
      </div>
      <p className="mpoliniz__ficha-nombre">El mundo de los polinizadores</p>
      <p className="mpoliniz__ficha-sub">Ocho bichos, siete flores, una sola red</p>
    </div>
  );
}
