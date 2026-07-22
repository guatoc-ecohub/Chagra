/*
 * ParamoHumboldt3D — EL NACEDERO: el páramo dibujado desde cero.
 * Ruta #/mockups/paramo-humboldt-3d, sin auth.
 *
 * De qué se trata
 * ───────────────
 * El páramo no es una loma con frailejones encima: es la FÁBRICA DE AGUA de
 * este país. Así que el mundo no se para a mirarlo de lejos — se mete adentro,
 * al sitio exacto donde el agua nace.
 *
 * El agua, al nacer, se come la turbera y le abre a la montaña un anfiteatro
 * de paredes negras, abierto hacia el valle. Uno queda parado ahí dentro. Y
 * esa pared, que el agua cortó sola, ES la lámina de Humboldt: el perfil del
 * suelo a la vista, horizonte por horizonte, sin inventarse ninguna vista de
 * rayos X. Arriba, en el filo, el frailejonal se asoma al vacío contra el
 * cielo; adelante, por la portilla, la meseta se despeña y la quebrada se va
 * hecha hilo a la niebla — que es donde están las fincas.
 *
 * Las cuatro vistas cuentan el ciclo entero, en orden:
 *   1. EL NACEDERO   — el sitio: dónde nace el agua y cómo se ve por dentro.
 *   2. LA LÁMINA     — el corte: por qué la turba es una esponja y por qué el
 *                      agua sale toda a la misma altura de la pared.
 *   3. EL FRAILEJONAL— quién atrapa la niebla, y a qué velocidad (ninguna).
 *   4. EL AGUA QUE BAJA — a dónde va: al filo del mundo y al valle.
 *
 * Congruencia: paleta madre, materiales madre, `<LuzMadre>` con la familia de
 * cielo `ladera`. Cero rig de luz propio, cero assets externos.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import EscenaNacederoParamo from '../visual/mundo3d/paramo/EscenaNacederoParamo.jsx';
import { LuzMadre, CIELOS, mezclarCielo } from '../visual/mundo3d/paleta/index.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';

/* ══════════════════════════════════════════════════════════════════════════
   LAS VISTAS — dónde se para la cámara
   ══════════════════════════════════════════════════════════════════════════ */
/*
 * La vista madre es EL NACEDERO, y se toma desde la portilla: parado en la
 * salida del agua, mirando adentro. Las dos alas de la pared se abren en cuña
 * hacia la testera y llevan el ojo derecho a la poza. En pantalla ANGOSTA la
 * cámara se va más atrás y más arriba: el cuadro se vuelve alto, entra la
 * cordillera del fondo y el anfiteatro cabe entero en la franja del medio.
 */
const VISTAS = {
  nacederoAncho: {
    pos: new THREE.Vector3(0.9, 7.4, 12.8),
    mira: new THREE.Vector3(-0.7, 2.6, -5.0),
    fov: 58,
  },
  nacederoAlto: {
    pos: new THREE.Vector3(0.8, 8.2, 15.5),
    mira: new THREE.Vector3(-0.6, 2.4, -5.2),
    fov: 64,
  },
  /* LA LÁMINA: pegado a la pared de la testera, a la altura del contacto donde
     rezuma el agua. Es un retrato del suelo — el perfil llena el cuadro. */
  lamina: {
    pos: new THREE.Vector3(-0.7, 3.9, 3.6),
    mira: new THREE.Vector3(-2.0, 3.1, -7.0),
    fov: 50,
  },
  /* EL FRAILEJONAL: arriba en la planicie, a la altura de una roseta, mirando
     el gentío de todas las edades con el filo y el cielo detrás. */
  frailejonal: {
    pos: new THREE.Vector3(-13.5, 9.0, 12.5),
    mira: new THREE.Vector3(-2.0, 6.0, -1.0),
    fov: 46,
  },
  /* EL AGUA QUE BAJA: en la portilla, de espaldas al anfiteatro, viendo cómo
     la quebrada se va al filo del mundo y se cae al valle. */
  agua: {
    pos: new THREE.Vector3(-1.3, 9.0, 3.0),
    mira: new THREE.Vector3(0.5, 2.6, 26),
    fov: 56,
  },
};

const LECCIONES = {
  nacedero: {
    titulo: 'Aquí nace el agua',
    sub: 'Páramo andino · por encima de los 3.000 metros',
    texto: 'Esto no es una loma con frailejones: es la fábrica de agua. La niebla sube, el '
      + 'frailejón la atrapa con sus hojas peludas y la suelta despacio al suelo. El suelo se '
      + 'la traga —es turba, una esponja de varios metros— y la va soltando todo el año. '
      + 'El agua que sale por ahí abajo se comió el barranco y abrió este anfiteatro.',
  },
  lamina: {
    titulo: 'La esponja, por dentro',
    sub: 'El corte que hizo el agua sola',
    texto: 'De arriba abajo: el colchón vivo de raíces; la turba fibrosa, donde todavía se le '
      + 'ven las raíces de las que está hecha; la turba ya deshecha, casi negra —entre las dos, '
      + 'tres metros de esponja que retiene agua como una toalla mojada—; y la línea donde la '
      + 'turba se topa con la ceniza volcánica, que no la deja pasar. Por eso los hilos brotan '
      + 'todos a la misma altura: el agua camina de costado y sale por ese contacto.',
  },
  frailejonal: {
    titulo: 'Todas las edades, a la vez',
    sub: 'Espeletia · el que le entrega el agua al suelo',
    texto: 'Un frailejonal no es una mata repetida: en el mismo pedazo conviven la roseta recién '
      + 'nacida a ras de suelo y el tronco que lleva un siglo levantándose. Crecen despacísimo '
      + '—cosa de un centímetro al año—, así que un frailejón de un metro es más viejo que quien '
      + 'lo está mirando. Se quema en un rato y se demora una vida en volver.',
  },
  agua: {
    titulo: 'De aquí para abajo',
    sub: 'La quebrada se va al valle',
    texto: 'El agua se junta en la poza, se escapa por la portilla y se despeña en la niebla. '
      + 'Abajo, donde no se alcanza a ver, riega las fincas y llena los tanques del pueblo. '
      + 'Todo el que abre una llave en la ciudad está tomando de aquí. Por eso el páramo se '
      + 'cuida arriba, no abajo.',
  },
};

const BOTONES = [
  { id: 'nacedero', texto: 'El nacedero' },
  { id: 'lamina', texto: 'La lámina' },
  { id: 'frailejonal', texto: 'El frailejonal' },
  { id: 'agua', texto: 'El agua que baja' },
];

/* ══════════════════════════════════════════════════════════════════════════
   EL CAMARÓGRAFO
   ══════════════════════════════════════════════════════════════════════════ */
/* Lleva cámara Y objetivo de una vista a otra con interpolación exponencial
   (llega rápido, frena suave). Suelta el mando apenas el usuario toca la
   escena: si el lerp siguiera vivo mientras alguien arrastra, la cámara le
   pelearía la mano. */
function Camarografo({ vista, controls }) {
  const size = useThree((s) => s.size);
  const animando = useRef(true);

  const destino = useMemo(() => {
    if (vista !== 'nacedero') return VISTAS[vista] || VISTAS.nacederoAncho;
    return size.width / Math.max(1, size.height) < 0.95 ? VISTAS.nacederoAlto : VISTAS.nacederoAncho;
  }, [vista, size.width, size.height]);

  useEffect(() => { animando.current = true; }, [destino]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return undefined;
    const parar = () => { animando.current = false; };
    c.addEventListener('start', parar);
    return () => c.removeEventListener('start', parar);
  }, [controls]);

  useFrame((estado, dt) => {
    if (!animando.current) return;
    const cam = estado.camera;
    const k = 1 - Math.exp(-Math.min(0.1, dt) * 3.0);
    cam.position.lerp(destino.pos, k);
    if (Math.abs(cam.fov - destino.fov) > 0.01) {
      cam.fov += (destino.fov - cam.fov) * k;
      cam.updateProjectionMatrix();
    }
    const c = controls.current;
    if (c) {
      c.target.lerp(destino.mira, k);
      c.update();
    }
    /* La llegada mira las DOS cosas (cámara y objetivo): arrancando ya en el
       sitio, mirar solo la posición daba "llegué" en el primer cuadro y el
       objetivo se quedaba en el origen — la cámara terminaba mirando al piso. */
    const lejosMira = c ? c.target.distanceTo(destino.mira) : 0;
    if (cam.position.distanceTo(destino.pos) < 0.06 && lejosMira < 0.06) animando.current = false;
  });

  return null;
}

/* La carta de la lección: se monta dos veces (cabeza y pie) y el CSS deja viva
   una sola según el ancho. Dos nodos cuestan nada y evitan medir la ventana en
   JavaScript, que es justo lo que se desincroniza con el CSS. */
function Carta({ leccion }) {
  return (
    <article className="nac-carta" role="status">
      <h3>{leccion.titulo}</h3>
      <p className="nac-sub">{leccion.sub}</p>
      <p className="nac-texto">{leccion.texto}</p>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL MUNDO
   ══════════════════════════════════════════════════════════════════════════ */
export default function ParamoHumboldt3D() {
  const [listo, setListo] = useState(false);
  const [vista, setVista] = useState('nacedero');
  const controls = useRef(null);

  const { tier } = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);

  /* La atmósfera: familia `ladera` mezclada 60 % hacia la madre (la ley de la
     casa). Es la bruma verde-plata del páramo, nunca el celeste de postal. */
  const cielo = useMemo(() => mezclarCielo(CIELOS.ladera), []);

  const leccion = LECCIONES[vista] || LECCIONES.nacedero;

  const elegir = useCallback((id) => setVista(id), []);

  useEffect(() => {
    const alTeclear = (e) => {
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i >= 0) setVista(BOTONES[i].id);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  return (
    <section className="nac-root" data-tier={tier} data-vista={vista} aria-label="El nacedero del páramo">
      <style>{CSS}</style>
      <Canvas
        className="nac-canvas"
        /* Fundido en estilo EN LÍNEA, no en clase: armar el terreno y la pared
           bloquea el hilo principal un momento y, con el fundido en clase, el
           navegador se queda con la opacidad en 0 mientras está bloqueado → la
           escena sale VACÍA en la captura, con todo dibujado e invisible. */
        style={{ opacity: listo ? 1 : 0, transition: 'opacity 1s ease' }}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0.9, 7.4, 12.8], fov: 58, near: 0.3, far: 400 }}
        shadows={!!perfil.sombras}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <color attach="background" args={[cielo.fondo]} />
        {/* La niebla empieza LEJOS: tiene que velar el fondo del valle y la
            ceja de monte, nunca la pared que uno está mirando. */}
        {perfil.fog && <fog attach="fog" args={[cielo.niebla, 40, 145]} />}

        <LuzMadre
          cielo={CIELOS.ladera}
          perfil={perfil}
          /* El sol entra bajo por el hombro izquierdo-delantero: raso sobre la
             pared (que así enseña cada repisa del perfil) y a contraluz de las
             rosetas del filo, que es donde el frailejón se vuelve plata. */
          escala={1.12}
          solPos={[-15, 29, 19]}
          sombra={{ left: -26, right: 26, top: 26, bottom: -26, far: 120 }}
        />

        <EscenaNacederoParamo tier={tier} perfil={perfil} reducedMotion={reducedMotion} />

        <Camarografo vista={vista} controls={controls} />

        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableZoom
          target={[-0.7, 2.6, -5.0]}
          minDistance={4}
          maxDistance={60}
          /* Se puede mirar al cielo y al fondo del anfiteatro, pero no meterse
             bajo tierra: por debajo de la turbera no hay nada que enseñar. */
          minPolarAngle={0.2}
          maxPolarAngle={1.5}
          enableDamping
          dampingFactor={0.08}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="nac-chrome">
        <div className="nac-cabeza">
          <h2 className="nac-titulo">
            El nacedero
            <small>El páramo por dentro · donde la niebla se vuelve quebrada</small>
          </h2>
          <Carta leccion={leccion} />
        </div>

        <div className="nac-pie">
          <div className="nac-botones" role="group" aria-label="Las cuatro vistas del nacedero">
            {BOTONES.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className="nac-boton"
                aria-pressed={vista === b.id}
                onClick={() => elegir(b.id)}
                title={`Tecla ${i + 1}`}
              >
                {b.texto}
              </button>
            ))}
          </div>
          <Carta leccion={leccion} />
        </div>
      </div>
    </section>
  );
}

const CSS = `
.nac-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: #d6e0d2; }
.nac-canvas { position: absolute; inset: 0; }
.nac-chrome { position: absolute; inset: 0; z-index: 7; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.nac-cabeza { display: flex; flex-direction: column; align-items: flex-start; gap: 0.55rem; }
.nac-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #1f2b1c; text-shadow: 0 1px 10px rgba(236,242,226,0.9); font: 700 1.2rem/1.18 system-ui, sans-serif; letter-spacing: 0.01em; }
.nac-titulo small { display: block; font: 500 0.8rem/1.35 system-ui, sans-serif; opacity: 0.85; margin-top: 0.16rem; }
.nac-pie { padding: 0 1rem 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
.nac-botones { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; }
.nac-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(30,44,26,0.34); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(236,244,228,0.86); color: #24321f; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.nac-boton:hover, .nac-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(30,44,26,0.62); outline: none; }
.nac-boton[aria-pressed='true'] { background: #cfe3c2; border-color: rgba(36,50,31,0.75); font-weight: 700; }
.nac-carta { margin: 0 1rem; max-width: 26rem; padding: 0.62rem 0.95rem 0.72rem; border-radius: 0.85rem; background: rgba(24,34,22,0.74); backdrop-filter: blur(4px); color: #eff5e9; }
.nac-carta h3 { margin: 0; font: 700 0.95rem/1.24 system-ui, sans-serif; }
.nac-sub { margin: 0.12rem 0 0.4rem; font: 500 0.74rem/1.3 system-ui, sans-serif; opacity: 0.82; }
.nac-texto { margin: 0; font: 500 0.79rem/1.5 system-ui, sans-serif; }
/* En teléfono el anfiteatro ocupa la franja del medio y no hay cielo lateral
   que aprovechar: la carta baja al pie, donde alcanza el pulgar. */
@media (max-width: 760px) {
  .nac-cabeza { gap: 0; }
  .nac-cabeza .nac-carta { display: none; }
  .nac-pie .nac-carta { display: block; }
  .nac-titulo { font-size: 1rem; padding: 0.7rem 0.8rem 0; }
  .nac-titulo small { font-size: 0.72rem; }
  .nac-carta { margin: 0; max-width: 100%; padding: 0.5rem 0.8rem 0.6rem; }
  .nac-carta h3 { font-size: 0.88rem; }
  .nac-texto { font-size: 0.75rem; line-height: 1.46; }
  .nac-boton { padding: 0.4rem 0.76rem; font-size: 0.75rem; }
}
@media (min-width: 761px) { .nac-pie .nac-carta { display: none; } }
@media (prefers-reduced-motion: reduce) { .nac-canvas { transition: none !important; } }
`;
