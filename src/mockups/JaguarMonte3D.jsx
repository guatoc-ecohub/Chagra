/*
 * JaguarMonte3D — LA HOJA DE PERSONAJE DEL JAGUAR (Panthera onca).
 * Ruta #/mockups/jaguar-monte-3d, sin auth.
 *
 * Dos cosas en una página, porque el jaguar necesita las dos para leerse bien:
 *
 *   1. EL RETRATO EN GRANDE — la cabeza maciza y las ROSETAS al tamaño en que
 *      de verdad se distinguen. A 64 px el jaguar de cualquiera parece un gato
 *      manchado; la diferencia con el leopardo solo se ve grande. Al lado va la
 *      lámina de la REGLA DE ORO: anillo roto + campo + PUNTOS NEGROS DENTRO.
 *
 *   2. EL CLARO DEL MONTE EN 3D — el felino andando de verdad por un claro, que
 *      es donde se comprueba lo otro: que pisa el suelo, que tiene peso, que se
 *      detiene a mirar y sigue. Un personaje quieto en fondo blanco siempre se
 *      ve bien; caminando es donde se caen los dibujos.
 *
 * DIRECCIÓN DE ARTE (todo de la casa, nada inventado por fuera):
 *   - Paleta madre (`visual/mundo3d/paleta`): VERDES por piso térmico, TIERRAS,
 *     CORTEZAS. Ni un hex suelto de vegetación inventado acá.
 *   - Luz: `<LuzMadre>` con la familia `CIELOS.sotobosque` mezclada por
 *     `mezclarCielo` (la ley del 60% hacia la madre). Cero rig propio.
 *   - El felino es el SVG rubber-hose de `creatures/Jaguar.jsx` colgado como
 *     billboard (`fauna/JaguarBillboard.jsx`) — la fauna NO se modela en
 *     geometría procedural: se dibuja y se cuelga.
 *   - Toda mata fusionada pasa por `fusionarSeguro` (el merge que TRUENA en vez
 *     de devolver null y dejar la especie invisible).
 *
 * RENDIMIENTO: los árboles, las piedras y las matas van instanciados (3 draw
 * calls para todo el monte); Lambert flatShading sin shadow-map; presupuestos
 * por `perfilDeTier`. `reducedMotion` congela el felino y pasa el frameloop a
 * demanda. Autocontenida: cero CDN, cero imágenes externas.
 *
 * Español de Colombia, en "usted".
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { decidirTier, permite3D } from '../visual/mundo3d/deviceTier.js';
import { Jaguar } from '../visual/creatures/index.js';
import './JaguarMonte3D.css';

const ClaroDelJaguar = lazy(() => import('../visual/mundo3d/fauna/ClaroDelJaguar.jsx'));

/* Lo que enseña el jaguar (anatomía verificable, en "usted"). */
const SABERES = [
  {
    emoji: '🔎',
    titulo: 'La roseta lleva puntos adentro',
    texto:
      'La mancha del jaguar no es un borrón: es un anillo roto que encierra un campo de pelaje más hondo, y dentro de ese campo hay uno o varios puntos negros. El leopardo tiene el anillo, pero vacío. Ese punto de adentro es lo único que hay que mirar para saber cuál es cuál.',
  },
  {
    emoji: '🐾',
    titulo: 'Cabeza maciza, mandíbula de romper hueso',
    texto:
      'Es el felino con la mordida más fuerte de América, y eso se le nota en la testa: ancha, casi cuadrada, con las carrilleras marcadas. Si usted le dibuja cabeza redondita y fina, ya no es un jaguar — es un gato grande con manchas.',
  },
  {
    emoji: '⚖️',
    titulo: 'Patas cortas y gruesas, cola corta',
    texto:
      'El cuerpo es compacto y pesado, con el centro de gravedad bajo: patas gruesas, zarpas grandes y redondas, cola más corta que la de un leopardo o un puma. Una silueta esbelta y de patas largas es otro animal.',
  },
  {
    emoji: '🌑',
    titulo: 'El patrón cambia según la parte del cuerpo',
    texto:
      'Rosetas grandes con puntos en el lomo y los costados; puntos sólidos pequeños en la cabeza y hacia las patas; anillos en la cola, con la punta negra. No es el mismo dibujo repetido de la nariz al rabo.',
  },
];

/* La lámina de la regla de oro: las tres marcas, dibujadas al lado para que la
   diferencia se vea de una, sin tener que creerle a nadie. */
function LaminaRosetas() {
  const ink = '#241608';
  const campo = '#a86a24';
  const pelo = '#d99a45';
  const marcas = [
    {
      k: 'jaguar',
      nombre: 'Jaguar',
      pie: 'Anillo roto + campo más hondo + PUNTOS NEGROS adentro.',
      puntos: [
        [-2.4, -1.6, 2.2], [2.6, 1.4, 1.8], [-0.4, 3.0, 1.4],
      ],
    },
    {
      k: 'leopardo',
      nombre: 'Leopardo',
      pie: 'El mismo anillo, pero vacío por dentro. Es el error más común.',
      puntos: [],
    },
    {
      k: 'solida',
      nombre: 'Mancha sólida',
      pie: 'Lo que lleva la cabeza y las patas del jaguar — nunca el lomo.',
      solida: true,
    },
  ];
  return (
    <ul className="jmonte__lamina" aria-label="Cómo se distingue la roseta del jaguar">
      {marcas.map((m) => (
        <li key={m.k} className="jmonte__marca">
          <svg viewBox="-16 -16 32 32" width="94" height="94" role="img" aria-label={m.nombre}>
            <rect x="-16" y="-16" width="32" height="32" fill={pelo} rx="3" />
            {m.solida ? (
              <ellipse cx="0" cy="0" rx="7.4" ry="6.5" fill={ink} />
            ) : (
              <>
                <ellipse cx="0" cy="0" rx="7" ry="6.2" fill={campo} opacity="0.92" />
                <ellipse
                  cx="0" cy="0" rx="10" ry="8.8" fill="none" stroke={ink} strokeWidth="4.6"
                  strokeLinecap="round"
                  strokeDasharray="17.7 4.7 15.3 5.9 10.6 4.7"
                />
                {m.puntos.map(([cx, cy, r], i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} fill={ink} />
                ))}
              </>
            )}
          </svg>
          <p className="jmonte__marcaNombre">{m.nombre}</p>
          <p className="jmonte__marcaPie">{m.pie}</p>
        </li>
      ))}
    </ul>
  );
}

export default function JaguarMonte3D() {
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
  const vivo = !reducedMotion;

  return (
    <main className="jmonte">
      <header className="jmonte__head">
        <p className="jmonte__kicker">El jaguar · hoja de personaje</p>
        <h1>El que se para a mirarlo y después sigue</h1>
        <p className="jmonte__lema">
          <em>Panthera onca</em>, dibujado con la anatomía que lo separa de
          cualquier otro felino manchado: la cabeza maciza, el cuerpo compacto y
          las rosetas con puntos adentro. Véalo grande primero — las rosetas no
          se distinguen chiquitas — y después camínelo por el claro.
        </p>
      </header>

      {/* ── EL RETRATO: la cabeza al tamaño en que se puede juzgar ──────────── */}
      <section className="jmonte__retrato" aria-label="Retrato del jaguar">
        <figure className="jmonte__figura">
          {/* El SVG en modo `inline` devuelve un <g>: así podemos ENCUADRAR la
              testa con nuestro propio viewBox sin redibujar nada del personaje.
              El cuerpo completo vive abajo, en el elenco de poses. */}
          <svg viewBox="-11.5 -17.5 23 20" className="jmonte__retratoSvg" role="img"
            aria-label="Retrato del jaguar: cabeza maciza y rosetas con puntos internos">
            <Jaguar inline animated={vivo} tier={tier} />
          </svg>
          <figcaption>
            La testa ancha y las carrilleras marcadas. Mire una roseta del
            cachete: el anillo está cortado y adentro hay un punto.
          </figcaption>
        </figure>
        <div className="jmonte__regla">
          <h2>La regla de oro</h2>
          <p>
            Es el detalle que más se falla al dibujar un jaguar, y el campesino
            que lo ha visto lo nota de una:
          </p>
          <LaminaRosetas />
        </div>
      </section>

      {/* ── EL CLARO EN 3D: el felino andando, pisando el suelo ─────────────── */}
      <section className="jmonte__escena" aria-label="El jaguar en el claro del monte">
        {mostrar3D ? (
          <Suspense fallback={<p className="jmonte__cargando">Abriendo el claro…</p>}>
            <ClaroDelJaguar tier={tier} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <div className="jmonte__ficha">
            <Jaguar size={190} animated={false} tier="bajo" />
            <p>
              En este equipo mostramos el jaguar quieto, que se ve igual de
              digno y no le hace sudar la máquina. El claro en 3D queda para
              equipos con más aire.
            </p>
          </div>
        )}
        {puede3D && (
          <button type="button" className="jmonte__toggle" onClick={() => setVer2d((v) => !v)}>
            {ver2d ? 'Ver el claro en 3D' : 'Ver la ficha quieta'}
          </button>
        )}
      </section>

      {/* ── EL ELENCO DE POSES: lo mismo que el mundo va a montar ───────────── */}
      <section className="jmonte__poses" aria-label="Poses del jaguar">
        <h2>Las tres caras del mismo animal</h2>
        <ul>
          <li>
            <Jaguar size={150} animated={vivo} tier={tier} />
            <p><strong>En reposo.</strong> Impone sin gruñir. Ni peluche ni villano.</p>
          </li>
          <li>
            <Jaguar size={150} animated={vivo} tier={tier} acecha />
            <p><strong>Acechando.</strong> Los omóplatos suben, la testa baja, el paso se vuelve la mitad de lento.</p>
          </li>
          <li>
            <Jaguar size={150} animated={vivo} tier={tier} ruge />
            <p><strong>Rugiendo.</strong> Abre las fauces y el pecho suelta. Es su rato serio, no su carácter.</p>
          </li>
        </ul>
      </section>

      <section className="jmonte__saberes" aria-label="Lo que hay que mirar">
        <h2>Cuatro cosas que hay que mirarle</h2>
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
    </main>
  );
}
