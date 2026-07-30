/*
 * EscenaBosque — ARQUETIPO `bosque`: el BOSQUE NATIVO ALTOANDINO de 3 estratos.
 *
 * Al igual que `EscenaValle`, este arquetipo NO es un diorama chico que herede
 * `EscenaBase3D`: es un MUNDO completo y autocontenido, a la escala real de un
 * bosque de niebla (palmas de cera de 18 m, dosel a 9-12 m). Por eso trae su
 * propio `<Canvas>` con la receta de luz de la casa (`LuzMadre`) y su cámara
 * parada en el CLARO mirando la ORILLA del rodal — la única pose desde la que
 * los tres pisos se apilan a la vista. Es un ADAPTADOR del framework: traduce el
 * contrato uniforme de mundos a la vitrina ya madura del bosque
 * (`BosqueTresEstratos`), sin redibujar una sola planta.
 *
 * ── Dirección de arte: LÁMINA DE HUMBOLDT VIVA ──────────────────────────────
 * Referencia PRINCIPAL: la lámina naturalista de Alexander von Humboldt de los
 * Andes (Geografía de las plantas / tableau de Chimborazo) — botánicamente
 * EXACTA, pintada a mano, con la vegetación ubicada por altitud/estrato. A eso
 * se le suma atmósfera Ghibli para la NIEBLA y la LUZ FILTRADA. Resultado:
 * científicamente preciso y bello, pintado; NO fotorrealista, NO caricatura, NO
 * rubber-hose. Los tres estratos se leen como las bandas rotuladas de una lámina
 * de Humboldt — de hecho la capa didáctica (abajo) es ese rótulo hecho tacto.
 * El squash & stretch elástico queda SOLO para bichos que se mueven — jamás para
 * árboles, sotobosque, musgo ni epífitas: la vegetación es forma orgánica de
 * hoja gruesa coriácea con VALOR pintado por estrato, y su único movimiento es
 * el MECIDO del viento (un cabeceo lento y sutil, ≈1-2° de inclinación, sin
 * pulsar la escala), como se mece un bosque real bajo la brisa. "Huesos reales"
 * (los 3 estratos con escala/especies EXACTAS del DR) + "piel dibujada" (render
 * ilustrado, no fotográfico).
 *
 * ── Huesos reales (DR-bosque-3-estratos) ────────────────────────────────────
 * 2400-3300 msnm, niebla casi permanente, luz difusa filtrada. TRES estratos:
 *   · DOSEL (9-17 m): encenillo (cono invertido), cedro (mesa ancha cargada de
 *     epífitas), nogal (bola), palma de cera asomando como emergente.
 *   · SOTOBOSQUE (2-6 m): mano de oso, helecho arbóreo, chusque, arbusto en flor
 *     y el bejuco que sube cargando bromelias — el hilo que cose los tres pisos.
 *   · SUELO (0-1.2 m): helechos, hierba de sombra y cojines de musgo/hojarasca,
 *     el piso aterciopelado.
 * Las EPÍFITAS (orquídeas/bromelias/helechos sobre forófitos) van HORNEADAS en
 * la geometría del cedro y del bejuco-bromelia (ver estratosAltoandinos.geom).
 *
 * ── La niebla (lección aprendida, no repetir) ───────────────────────────────
 * El bosque de niebla se dibuja con DOS recursos que aguantan que la cámara
 * orbite: (1) la niebla de DISTANCIA del motor (`<fog>`), que vela el fondo y da
 * profundidad atmosférica, y (2) el VALOR horneado de cada estrato (dosel
 * encendido → suelo apagado). `estratosAltoandinos.geom` documenta que los velos
 * planos translúcidos a la altura de corte se leen como una lámina gris
 * atravesada — aquí NO se usan. Los pufs de bruma que sí se suman son ESFERAS
 * bajas y lejanas (mismo recurso que el páramo en EscenaEstratos): redondas,
 * sobreviven cualquier ángulo y solo aportan bruma acumulada entre los fustes
 * del fondo, jamás una lámina cruzando la escena.
 *
 * ── Presupuesto (GPU media/baja) ────────────────────────────────────────────
 * Todo el rodal es instanciado: TRECE draw-calls (doce arquetipos + el suelo)
 * hayan 60 o 600 plantas. El tier gradúa densidad y calidad geométrica
 * (POBLACION/CALIDAD del geom). El tier 'bajo' ni llega aquí (cae al 2D digno);
 * en 'medio' la niebla y los pufs siguen encendidos, sin sombras.
 */
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import BosqueTresEstratos from '../bosque/BosqueTresEstratos.jsx';
import { ESTRATOS } from '../bosque/estratosAltoandinos.geom.js';
import { LuzMadre, CIELOS, mezclarCielo, mezclar, NEUTROS } from '../paleta/index.js';
import { perfilDeTier } from '../deviceTier.js';

/* La cámara se para en el CLARO, sobre la lomita, mirando la ORILLA del bosque
   desde afuera y un poco desde arriba: el suelo llena el primer plano, el
   sotobosque forma su banda a media altura, el dosel cierra arriba y las palmas
   asoman contra el cielo. Cuatro planos en profundidad — los tres estratos
   legibles. (Misma pose probada de la vitrina BosqueTresEstratos3D: retroceder
   al claro fue, literalmente, lo que hizo visible la lección.) */
const CAM = /** @type {[number, number, number]} */ ([2.4, 8.6, 31]);
const MIRA = /** @type {[number, number, number]} */ ([0, 7.2, -9]);

const ORDEN = ['dosel', 'sotobosque', 'suelo'];

const COPY_ENTERO =
  'Así se ve un bosque altoandino: no es una masa de árboles iguales sino tres pisos, y cada piso vive de una luz distinta. Toque un piso para que se lo señale.';

/* Los pufs de bruma: esferas achatadas, bajas y lejanas, entre los fustes del
   fondo. Deterministas (nada de Math.random — react-hooks/purity) y quietas
   (dignas con reduced-motion: la niebla del bosque no corre). No cruzan el claro
   ni el primer plano: solo acumulan bruma donde la distancia ya la vela. */
const PUFS_NIEBLA = [
  { pos: [-9, 2.6, -12], r: 4.6, op: 0.3 },
  { pos: [7, 3.4, -15], r: 5.2, op: 0.28 },
  { pos: [-3, 2.0, -9], r: 3.8, op: 0.26 },
  { pos: [12, 4.2, -20], r: 5.6, op: 0.24 },
  { pos: [-13, 3.0, -19], r: 5.0, op: 0.24 },
  { pos: [2, 5.0, -24], r: 6.0, op: 0.2 },
];

function NieblaFondo({ color }) {
  return (
    <group>
      {PUFS_NIEBLA.map((p, i) => (
        <mesh key={i} position={p.pos} scale={[1, 0.42, 1]}>
          <sphereGeometry args={[p.r, 9, 6]} />
          <meshBasicMaterial color={color} transparent opacity={p.op} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * El mundo del bosque nativo altoandino. Autocontenido (su propio Canvas), a la
 * escala real del bosque. Contrato de mundos (mismas props que EscenaValle):
 * @param {object} props
 * @param {object}  [props.params]        { seed, extension } de la siembra
 * @param {boolean} [props.reducedMotion]
 * @param {(view:string, data?:object)=>void} [props.onHotspot]
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 */
export default function EscenaBosque({
  params,
  reducedMotion = false,
  onHotspot,
  tier = 'alto',
  // Aceptadas por el contrato uniforme del host aunque este mundo se cuente
  // solo con su flora (la fauna y Angelita del framework no se montan aquí):
  // eslint-disable-next-line no-unused-vars
  entrada, animo, energia, estadoFinca, hayAlerta, hotspots, tinte, mundoId,
}) {
  const [listo, setListo] = useState(false);
  const [destacado, setDestacado] = useState(/** @type {string|null} */ (null));

  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  const seed = params?.seed ?? 4242;
  const extension = params?.extension ?? 23;

  /* La atmósfera: la familia `sotobosque` mezclada 60 % hacia la madre de la
     franja — la ley de la casa. El fondo y la niebla salen de ahí, ni un hex a
     mano. El puf de bruma va un pelín más lechoso que la niebla de distancia,
     para que se lea como bruma acumulada y no como sombra. */
  const cielo = useMemo(() => mezclarCielo(CIELOS.sotobosque), []);
  const brumaPuf = useMemo(() => mezclar(cielo.niebla, NEUTROS.hueso, 0.4), [cielo.niebla]);

  const copia = destacado ? ESTRATOS[destacado].clave : COPY_ENTERO;

  const tocarEstrato = (id) => {
    setDestacado((v) => (v === id ? null : id));
    // Aditivo y honesto: si el host escucha, le avisa qué piso se señaló (sin
    // navegar — la lección es la escena misma).
    onHotspot?.('estrato', { id });
  };

  return (
    <section className="bosque3d" aria-label="El bosque nativo altoandino y sus tres estratos">
      <style>{CSS}</style>
      <Canvas
        className="bosque3d__canvas"
        /* Fundido en estilo EN LÍNEA, no en clase: construir las doce geometrías
           bloquea el hilo un momento; con el fundido en clase el navegador se
           quedaba con opacidad 0 mientras estaba bloqueado y la escena aparecía
           VACÍA. El estilo en línea no depende de que el recálculo de CSS
           alcance a correr. */
        style={{ opacity: listo ? 1 : 0, transition: 'opacity 0.9s ease' }}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: CAM, fov: 46 }}
        shadows={!!perfil.sombras}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <color attach="background" args={[cielo.fondo]} />
        {/* La niebla de distancia empieza LEJOS: que vele el fondo del rodal, no
            el rodal que uno está mirando (con la niebla encima los tres pisos se
            funden en beige, justo lo contrario de la lección). */}
        {perfil.fog && <fog attach="fog" args={[cielo.niebla, 32, 118]} />}

        <LuzMadre
          cielo={CIELOS.sotobosque}
          perfil={perfil}
          /* El sol entra rasante por el hombro izquierdo: en un bosque cerrado la
             luz llega de lado y por arriba, colada por el dosel, nunca de frente. */
          solPos={[-14, 26, 10]}
          sombra={{ left: -26, right: 26, top: 26, bottom: -26, far: 76 }}
        />

        {perfil.fog && <NieblaFondo color={brumaPuf} />}

        <BosqueTresEstratos
          tier={tier}
          perfil={perfil}
          reducedMotion={reducedMotion}
          destacado={destacado}
          extension={extension}
          seed={seed}
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

      {/* La capa didáctica (patrón de EscenaValle: una capa DOM sobre el canvas):
          los tres botones no filtran nada — dejan el bosque completo y apagan lo
          que no es el estrato señalado, para que se vea de un golpe qué parte del
          bosque se está nombrando. */}
      <div className="bosque3d__pie">
        <div className="bosque3d__estratos" role="group" aria-label="Estratos del bosque">
          {ORDEN.map((id) => (
            <button
              key={id}
              type="button"
              className="bosque3d__boton"
              aria-pressed={destacado === id}
              onClick={() => tocarEstrato(id)}
            >
              {ESTRATOS[id].nombre}
            </button>
          ))}
        </div>
        <p className="bosque3d__carta" role="status">{copia}</p>
      </div>
    </section>
  );
}

const CSS = `
.bosque3d { position: relative; flex: 1 1 auto; min-width: 0; width: 100%; height: 100%; min-height: 320px; overflow: hidden; background: #d7e6c9; }
.bosque3d__canvas { position: absolute; inset: 0; }
.bosque3d__pie { position: absolute; left: 0; right: 0; bottom: 0; z-index: 7; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0 1rem max(0.9rem, env(safe-area-inset-bottom)); }
.bosque3d__estratos { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; }
.bosque3d__carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(28,40,26,0.66); backdrop-filter: blur(3px); color: #eff5e9; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.bosque3d__boton { pointer-events: auto; appearance: none; border: 1px solid rgba(30,46,28,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(236,244,228,0.86); color: #253320; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; min-height: 40px; }
.bosque3d__boton:hover, .bosque3d__boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(30,46,28,0.6); outline: none; }
.bosque3d__boton[aria-pressed='true'] { background: #cfe3c2; border-color: rgba(37,51,32,0.75); }
@media (max-width: 460px) {
  .bosque3d__carta { font-size: 0.75rem; max-width: 100%; }
  .bosque3d__boton { padding: 0.4rem 0.8rem; font-size: 0.75rem; }
}
@media (prefers-reduced-motion: reduce) { .bosque3d__canvas { transition: none !important; } }
`;
