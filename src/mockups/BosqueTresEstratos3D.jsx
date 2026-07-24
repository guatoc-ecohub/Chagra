/*
 * BosqueTresEstratos3D — la vitrina del bosque nativo altoandino y sus TRES
 * ESTRATOS. Ruta #/mockups/bosque-tres-estratos, sin auth.
 *
 * De qué se trata
 * ───────────────
 * El catálogo de Chagra tiene 581 especies de flora. Dibujarlas una por una es
 * imposible; dibujar DOCE FORMAS DE CRECIMIENTO sí, y con esas doce se puede
 * mostrar el catálogo entero. Esta vitrina es esa prueba puesta en pie: un
 * bosque altoandino armado solo con los doce arquetipos, repartidos en los tres
 * pisos verticales que tiene un bosque de verdad.
 *
 *   · El DOSEL — el techo. La palma de cera asomando por encima de todo, el
 *     cono invertido del encenillo, la mesa ancha del cedro, la bola del nogal.
 *   · El SOTOBOSQUE — a media altura, a la sombra. El parasol del mano de oso,
 *     el volante del helecho arbóreo, el abanico del chusque, el arbusto en
 *     flor y el bejuco que sube cargando bromelias.
 *   · El SUELO — lo rastrero. Helechos bajos, hierba de hoja ancha, cojines de
 *     musgo y hojarasca.
 *
 * Los tres botones de abajo no son un filtro: dejan el bosque completo y
 * apagan lo que no es el estrato señalado, para que el campesino vea de un
 * golpe qué parte del bosque se está nombrando.
 *
 * Congruencia: paleta madre, materiales madre y `<LuzMadre>` con la familia de
 * cielo `sotobosque`. Cero rig de luz propio (los dos mundos que lo tenían ya
 * se convirtieron).
 */
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import BosqueTresEstratos from '../visual/mundo3d/bosque/BosqueTresEstratos.jsx';
import { ESTRATOS } from '../visual/mundo3d/bosque/estratosAltoandinos.geom.js';
import { LuzMadre, CIELOS, mezclarCielo } from '../visual/mundo3d/paleta/index.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';

/* La cámara se para en el CLARO, sobre la lomita, mirando la ORILLA del bosque
   desde afuera y un poco desde arriba. Es la única posición desde la que los
   tres pisos se apilan a la vista: metida entre los troncos uno solo ve fustes
   y las copas quedan cortadas por el borde de la pantalla. Retroceder fue,
   literalmente, lo que hizo visible la lección. */
const CAM = /** @type {[number, number, number]} */ ([2.4, 8.6, 31]);
const MIRA = /** @type {[number, number, number]} */ ([0, 7.2, -9]);

const ORDEN = ['dosel', 'sotobosque', 'suelo'];

const COPY_ENTERO =
  'Así se ve un bosque altoandino: no es una masa de árboles iguales sino tres pisos, y cada piso vive de una luz distinta. Toque un piso para que se lo señale.';

export default function BosqueTresEstratos3D() {
  const [listo, setListo] = useState(false);
  const [destacado, setDestacado] = useState(/** @type {string|null} */ (null));
  const [neblina, setNeblina] = useState(true);

  const { tier } = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);

  /* La atmósfera: la familia `sotobosque` mezclada 60 % hacia la madre, que es
     la ley de la casa. El fondo y la niebla salen de ahí — ni un hex a mano. */
  const cielo = useMemo(() => mezclarCielo(CIELOS.sotobosque), []);

  const copia = destacado ? ESTRATOS[destacado].clave : COPY_ENTERO;

  return (
    <section
      className="bte-root"
      data-tier={tier}
      aria-label="El bosque nativo altoandino y sus tres estratos"
    >
      <style>{CSS}</style>
      <Canvas
        className="bte-canvas"
        /* El fundido va en estilo EN LÍNEA, no en una clase.
           Construir las doce geometrías bloquea el hilo principal un momento;
           con el fundido en clase, el navegador se quedaba con la opacidad en 0
           mientras estaba bloqueado y la escena aparecía VACÍA — así salió la
           primera captura, con el bosque entero dibujado y invisible. El estilo
           en línea no depende de que el recálculo de CSS alcance a correr. */
        style={{ opacity: listo ? 1 : 0, transition: 'opacity 0.9s ease' }}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: CAM, fov: 46 }}
        shadows={!!perfil.sombras}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <color attach="background" args={[cielo.fondo]} />
        {/* La niebla empieza LEJOS. Con la niebla encima, el bosque entero se
            lava en beige y los tres pisos se funden — que es justo lo contrario
            de lo que esta vitrina existe para enseñar. Que vele el fondo, no el
            rodal que uno está mirando. El botón la corre todavía más lejos. */}
        {perfil.fog && (
          <fog attach="fog" args={neblina ? [cielo.niebla, 30, 104] : [cielo.niebla, 76, 240]} />
        )}

        <LuzMadre
          cielo={CIELOS.sotobosque}
          perfil={perfil}
          /* El sol entra rasante por el hombro izquierdo: en un bosque cerrado
             la luz llega de lado y por arriba, nunca de frente. */
          solPos={[-14, 26, 10]}
          sombra={{ left: -26, right: 26, top: 26, bottom: -26, far: 76 }}
        />

        <BosqueTresEstratos
          tier={tier}
          perfil={perfil}
          reducedMotion={reducedMotion}
          destacado={destacado}
        />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          target={MIRA}
          minDistance={9}
          maxDistance={36}
          /* Se puede mirar hacia arriba (al dosel) pero no meterse bajo tierra. */
          minPolarAngle={0.32}
          maxPolarAngle={1.46}
          minAzimuthAngle={-0.85}
          maxAzimuthAngle={0.85}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion && !destacado}
          autoRotateSpeed={0.08}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="bte-chrome">
        <h2 className="bte-titulo">
          El bosque nativo: sus tres estratos
          <small>Doce formas de crecimiento con las que se puede mostrar el catálogo entero</small>
        </h2>

        <div className="bte-pie">
          <div className="bte-estratos" role="group" aria-label="Estratos del bosque">
            {ORDEN.map((id) => (
              <button
                key={id}
                type="button"
                className="bte-boton"
                aria-pressed={destacado === id}
                onClick={() => setDestacado((v) => (v === id ? null : id))}
              >
                {ESTRATOS[id].nombre}
              </button>
            ))}
            <button
              type="button"
              className="bte-boton bte-boton--tenue"
              aria-pressed={neblina}
              onClick={() => setNeblina((v) => !v)}
            >
              {neblina ? 'Quitar la neblina' : 'Poner la neblina'}
            </button>
          </div>
          <p className="bte-carta" role="status">{copia}</p>
        </div>
      </div>
    </section>
  );
}

const CSS = `
.bte-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: #d7e6c9; }
.bte-canvas { position: absolute; inset: 0; }
.bte-chrome { position: absolute; inset: 0; z-index: 7; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.bte-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #22301f; text-shadow: 0 1px 8px rgba(232,242,223,0.8); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.bte-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.86; margin-top: 0.15rem; }
.bte-pie { padding: 0 1rem 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
.bte-estratos { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; }
.bte-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(28,40,26,0.66); backdrop-filter: blur(3px); color: #eff5e9; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.bte-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(30,46,28,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(236,244,228,0.86); color: #253320; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.bte-boton:hover, .bte-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(30,46,28,0.6); outline: none; }
.bte-boton[aria-pressed='true'] { background: #cfe3c2; border-color: rgba(37,51,32,0.75); }
.bte-boton--tenue { font-weight: 500; opacity: 0.9; }
@media (max-width: 460px) {
  .bte-titulo { font-size: 1.02rem; padding: 0.7rem 0.8rem 0; }
  .bte-carta { font-size: 0.75rem; max-width: 100%; }
  .bte-boton { padding: 0.4rem 0.8rem; font-size: 0.75rem; }
}
@media (prefers-reduced-motion: reduce) { .bte-canvas { transition: none !important; } }
`;
