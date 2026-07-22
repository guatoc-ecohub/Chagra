/*
 * TresEntsGradiente3D — LOS ÁRBOLES MAESTROS DEL GRADIENTE ANDINO.
 * Ruta #/mockups/tres-ents-gradiente, sin auth.
 *
 * De qué se trata
 * ───────────────
 * Un Ent por piso térmico, y los cuatro contando la misma historia: la de una
 * ladera de los Andes leída de arriba abajo.
 *
 *   · EL ENT DE LA QUEÑUA (páramo) — *Polylepis*. El árbol que llega más
 *     arriba. Su copa y su musgo peinan la niebla: es una fábrica de agua.
 *     Su cara la talló el mismo cincel que las otras tres (ver
 *     `EntGradiente.jsx`): antes venía de otro componente y se le notaba.
 *   · EL ENT DEL ALISO (frío) — *Alnus acuminata*. Fabrica su propio abono:
 *     la bacteria *Frankia* le arma nódulos en la raíz que fijan el nitrógeno
 *     del aire. Levanta suelos degradados.
 *   · EL ENT DEL ROBLE (templado y frío) — *Quercus humboldtii*. El único
 *     roble de Suramérica, y cruza el gradiente él solo de 750 a 3.450 metros.
 *     Su lección son las ectomicorrizas: cuatro hongos le forran las raíces y
 *     dos de ellos —*Cantharellus* y *Lactarius*— sacan la seta a su pie.
 *   · EL ENT DE LA CEIBA (tierra caliente) — *Ceiba pentandra*. De cero a mil
 *     metros, bosque seco tropical. Sus CONTRAFUERTES —raíces tablares tan
 *     altas como una persona— son lo que la delata. NO tiene lección de
 *     simbiosis: de la ceiba eso no está verificado, y se dibuja el árbol, no
 *     una lección que no tenemos.
 *
 * Y lo que los amarra, que es el punto: EL AGUA baja por encima (nace en el
 * páramo, se despeña tres veces, llega abajo hecha quebrada) y LA RED DE
 * MICORRIZAS circula por debajo, en la cara cortada de la ladera. Dos
 * corrientes en espejo. Si le tumban el páramo, la ceiba se entera.
 *
 * La ladera está CORTADA como una lámina de Humboldt: el perfil de la montaña
 * con sus fajas de vegetación arriba y los horizontes del suelo abajo. Es el
 * mismo recurso con el que él dibujó el Chimborazo, y es lo que permite
 * enseñar el subsuelo sin inventarse una vista de rayos X.
 *
 * Congruencia: paleta madre, materiales madre y `<LuzMadre>` con la familia de
 * cielo `ladera`. Cero rig de luz propio.
 *
 * ── SU Ent, no un Ent (regla dura del operador, 2026-07-22) ─────────────────
 * El mundo se siembra del PERFIL DE LA FINCA (`usePerfilFincaStore`, el mismo
 * patrón de `mockups/valle/valleData.js`): el campesino de tierra fría abre
 * este mundo y le sale el ALISO de protagonista, cámara puesta en él, con su
 * lección al frente. Y MÁXIMO DOS Ents a la vez — no es estética, es
 * estructural: el protagonista y su único vecino, el de ARRIBA (de donde baja
 * el agua), salvo el páramo (el tope), que muestra el de ABAJO. El resto NO
 * se dibuja. Sin un piso térmico utilizable (sin perfil, perfil de demo, o un
 * piso que aún no tiene Ent tallado) cae al default concreto: templado +
 * frío — la regla aplica pareja para todos, no hay un "modo sin recortar".
 * TODO el mapeo piso→Ent, el vecino y el default viven en
 * `bosque/pisosBosqueGradiente.js` (puro, testeado ahí): agregar el cuarto
 * Ent (la ceiba de tierra caliente, en otra rama) es una línea de datos en
 * ese módulo, no un refactor de esta pantalla.
 *
 * Los botones manuales SIGUEN: navegar a otro Ent recalcula su par visible
 * (siempre ≤ 2), mueve la cámara y corre el foco — nunca fuerza un tercero.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import EscenaTresEnts from '../visual/mundo3d/bosque/EscenaTresEnts.jsx';
import { BLOQUE, PISOS, alturaLadera } from '../visual/mundo3d/bosque/gradienteAndino.geom.js';
import { LECCIONES } from '../visual/mundo3d/bosque/entsGradiente.geom.js';
import {
  MAPA_PISO_ENT,
  PISOS_CON_ENT,
  protagonistaDePiso,
  pisosVisiblesParaVista,
} from '../visual/mundo3d/bosque/pisosBosqueGradiente.js';
import { LuzMadre, CIELOS, mezclarCielo } from '../visual/mundo3d/paleta/index.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import usePerfilFincaStore from '../store/usePerfilFincaStore.js';

/* ══════════════════════════════════════════════════════════════════════════
   LAS VISTAS — dónde se para la cámara
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * EL RETRATO ANCHO (`VISTAS.juntosAncho`/`juntosAlto`) fue la vista madre de
 * este mundo cuando se veían todos los Ents a la vez: los hermanos
 * escalonados en un solo cuadro. Desde que el máximo-dos es regla dura
 * (2026-07-22) NINGÚN botón la pide — pero se queda como RED DE SEGURIDAD del
 * `Camarógrafo` para una `vista` que no tenga retrato propio en `VISTA_ENT`
 * (nunca debería pasar viniendo de los botones o del perfil, pero un mundo
 * nunca debe quedar con la cámara mirando a la nada).
 *
 * En pantalla ANGOSTA (teléfono en vertical) de frente no cabe: la ladera mide
 * 28 metros-escena de largo y un retrato 390×844 solo alcanzaría a mostrar un
 * tercio. Por eso esta vista de respaldo tiene una variante `Alta` que baja al
 * valle y mira ladera arriba.
 */
/* El CENTRO del bloque, calculado. Con la tierra caliente adentro la ladera va
   de −22 a +14: encuadrarla mirando al origen —que era el medio cuando solo
   había tres terrazas— deja la ceiba fuera del cuadro por la izquierda. */
const X_CENTRO = (BLOQUE.xMin + BLOQUE.xMax) / 2;

const VISTAS = {
  /* La cámara mira desde ARRIBA de la copa del páramo, no desde la altura de
     los ojos: con el ángulo bajo, las terrazas se veían de canto y ni el lomo
     de la ladera ni el cauce de la quebrada entraban en el cuadro. Un diorama
     se lee desde arriba y de frente.
     Y ahora, además, MÁS ATRÁS: la ladera creció ocho metros-escena al entrarle
     la terraza de la ceiba y con el encuadre viejo quedaba cortada. */
  juntosAncho: {
    pos: new THREE.Vector3(X_CENTRO + 2.4, 17.5, 45),
    mira: new THREE.Vector3(X_CENTRO, 3.1, -1.5),
    fov: 40,
  },
  /*
   * El retrato vertical. Dos números que se calibran juntos y no por gusto:
   *   · la DISTANCIA la manda el ancho. La ladera mide 36 metros-escena y en un
   *     cuadro 390×844 el campo horizontal es angostísimo: a 95 sobraba cuadro a
   *     los lados y la franja quedaba flaca; a 82 llega casi de borde a borde,
   *     que es lo máximo que da la geometría.
   *   · el OBJETIVO por debajo de la ladera (y negativo) EMPUJA LA FRANJA HACIA
   *     ARRIBA. Apuntando al centro del bloque quedaba un tercio de cielo vacío
   *     entre el título y la primera copa.
   */
  juntosAlto: {
    pos: new THREE.Vector3(X_CENTRO + 1, 15, 79),
    mira: new THREE.Vector3(X_CENTRO, -3.4, -1.5),
    fov: 54,
  },
};

/**
 * El retrato de un Ent: el árbol entero, de raíz a copa, con su lección al pie.
 *
 * ── Por qué el sujeto va CENTRADO (y antes no) ─────────────────────────────
 * La primera versión corría el objetivo casi dos metros a la izquierda para que
 * el guardián quedara en la mitad derecha, lejos de la carta de la lección (que
 * en pantalla ancha vive arriba a la izquierda). Con árboles parecidos eso
 * funcionaba. Con la ceiba adentro, no: mide 9,6 y vive una terraza más abajo,
 * así que al correr el encuadre hacia ella se metía entera en el retrato del
 * roble Y MÁS GRANDE QUE EL ROBLE. El retrato dejaba de ser de quien decía la
 * carta.
 *
 * Ahora el sujeto va al centro y el vecino se reparte a un lado. Al texto de la
 * carta se le quitó grasa para que quepa en el cielo de arriba a la izquierda
 * sin llegarle a la copa: la solución no era mover al árbol, era escribir más
 * corto.
 *
 * ── Y la variante RETRATO (teléfono en vertical, 390×844) ──────────────────
 * A 18,5 metros con fov 37 la copa sale en primer plano en un cuadro angosto:
 * el usuario veía un pedazo de árbol, nunca el árbol. La variante `alto` se
 * planta MÁS ATRÁS con el fov más abierto, siempre centrada: el Ent entero cae
 * en la franja libre que dejan el título arriba y la carta plegada abajo.
 */
function vistaDeEnt(piso, alto = false) {
  const ySuelo = alturaLadera(piso.x, piso.z);
  if (alto) {
    return {
      mira: new THREE.Vector3(piso.x, ySuelo + 4.6, piso.z),
      pos: new THREE.Vector3(piso.x, ySuelo + 5.6, piso.z + 21),
      fov: 47,
    };
  }
  return {
    mira: new THREE.Vector3(piso.x, ySuelo + 4.6, piso.z),
    pos: new THREE.Vector3(piso.x + 0.7, ySuelo + 6.9, piso.z + 18.5),
    fov: 37,
  };
}

/* Construido DESDE `PISOS` (la geometría de la ladera), no a mano: cuando la
   terraza de la ceiba entre a `gradienteAndino.PISOS`, su retrato de cámara
   sale solo, sin tocar esta pantalla. Un retrato por orientación. */
const VISTA_ENT = Object.fromEntries(PISOS.map((piso) => [piso.id, vistaDeEnt(piso)]));
const VISTA_ENT_ALTO = Object.fromEntries(PISOS.map((piso) => [piso.id, vistaDeEnt(piso, true)]));

/* Qué lección le toca a cada piso — se lee de `MAPA_PISO_ENT` (piso→Ent) y
   `LECCIONES` (Ent→texto): agregar un piso con Ent no pide tocar esta línea. */
const LECCION_DE = Object.fromEntries(
  PISOS_CON_ENT.map((pisoId) => [pisoId, LECCIONES[MAPA_PISO_ENT[pisoId]]]),
);

/* Un botón por piso CON Ent — nunca "Los tres": el máximo-dos es regla dura,
   así que la escena no ofrece un camino de vuelta a los tres/cuatro juntos.
   Navegar a otro Ent no lo agrega a los visibles: LO REEMPLAZA junto a su
   nuevo vecino (`pisosVisiblesParaVista`). */
const BOTONES = PISOS_CON_ENT.map((pisoId) => ({
  id: pisoId,
  texto: LECCION_DE[pisoId]?.boton || pisoId,
}));

/* ══════════════════════════════════════════════════════════════════════════
   EL CAMARÓGRAFO — lleva la cámara de una vista a otra
   ══════════════════════════════════════════════════════════════════════════ */
/*
 * Mueve cámara Y objetivo con una interpolación exponencial (llega rápido y
 * frena suave, nunca un corte). Deja de mandar cuando llega, y también apenas
 * el usuario toca la escena: si el lerp siguiera vivo mientras alguien arrastra
 * con el dedo, la cámara le pelearía la mano y el mundo se sentiría trabado.
 */
function Camarografo({ vista, controls, reducedMotion }) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const animando = useRef(true);

  const retrato = size.width / Math.max(1, size.height) < 0.95;
  const destino = useMemo(() => {
    /* `vista` siempre debería traer su propio retrato (viene del perfil o de
       un botón, ambos acotados a `PISOS_CON_ENT`) — y el retrato se elige POR
       ORIENTACIÓN: en teléfono vertical la variante `alto`, que retrocede y
       centra para que el árbol entero quepa en la franja libre de UI. Si la
       vista no trae retrato — un valor corrupto, o un piso nuevo sin terraza
       todavía — la red de seguridad es la vista panorámica, nunca una cámara
       mirando a la nada. */
    return (retrato ? VISTA_ENT_ALTO[vista] : VISTA_ENT[vista])
      || (retrato ? VISTAS.juntosAlto : VISTAS.juntosAncho);
  }, [vista, retrato]);

  useEffect(() => {
    animando.current = true;
    /* Con `frameloop='demand'` (reduced motion) los cuadros solo corren cuando
       alguien los pide: sin este empujón el lerp de abajo no arrancaba nunca y
       la cámara se quedaba COLGADA a mitad de viaje — encima del Ent, viendo
       un pedazo de copa. Es exactamente lo que salía en las capturas 390×844. */
    if (typeof invalidate === 'function') invalidate();
  }, [destino, invalidate]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return undefined;
    const parar = () => { animando.current = false; };
    c.addEventListener('start', parar);
    return () => c.removeEventListener('start', parar);
  }, [controls]);

  /* La cámara se toma del ESTADO DEL CUADRO (`estado.camera`), no de un
     `useThree()` en el cuerpo del componente: el `fov` se escribe a mano y
     escribirle una propiedad a un valor devuelto por un hook es exactamente lo
     que la regla de inmutabilidad prohíbe. Aquí es una variable local del
     callback y la intención queda clara: esto pasa por cuadro, no por render. */
  useFrame((estado, dt) => {
    if (!animando.current) return;
    const cam = estado.camera;
    /* Con reduced motion NO hay paseo: se CORTA a la vista destino en un solo
       cuadro. Es lo que pide la preferencia (menos movimiento, no movimiento
       lento) y además es lo único robusto con `frameloop='demand'`, donde un
       lerp por cuadro se muere apenas nadie vuelve a pedir un frame. */
    if (reducedMotion) {
      cam.position.copy(destino.pos);
      cam.fov = destino.fov;
      cam.updateProjectionMatrix();
      const ctl = controls.current;
      if (ctl) { ctl.target.copy(destino.mira); ctl.update(); }
      animando.current = false;
      return;
    }
    estado.invalidate();
    const k = 1 - Math.exp(-Math.min(0.1, dt) * 3.2);
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
    /* LA CONDICIÓN DE LLEGADA MIRA LAS DOS COSAS, cámara Y objetivo.
       Mirando solo la posición, arrancar YA en el sitio (que es lo que pasa al
       cargar: el Canvas nace con la cámara de la vista madre) daba "llegué" en
       el primer frame — y el objetivo se quedaba clavado donde lo dejó
       OrbitControls, que por defecto es el ORIGEN. La cámara terminaba mirando
       al piso del bloque, el mundo se subía en el cuadro y las copas de los
       tres Ents salían cortadas por el borde de arriba en TODA captura. */
    const lejosMira = c ? c.target.distanceTo(destino.mira) : 0;
    if (cam.position.distanceTo(destino.pos) < 0.06 && lejosMira < 0.06) {
      animando.current = false;
    }
  });

  return null;
}

/* La carta de la lección. Se monta DOS veces (arriba y al pie) y el CSS deja
   viva una sola según el ancho: la de arriba en pantalla ancha, la del pie en
   teléfono. Dos nodos en el DOM cuestan nada y evitan tener que medir la
   ventana en JavaScript para decidir un layout — que es el tipo de cosa que se
   desincroniza con el CSS y termina mostrando las dos o ninguna. */
function Carta({ leccion, plegable = false }) {
  /* En teléfono la carta arranca PLEGADA: título, especie y dos líneas de
     texto. La lección completa sigue ahí, a un toque de «Leer más» — plegar
     no es recortar. Desplegada entera, la carta se comía el 40 % de la
     pantalla y el Ent quedaba retratado detrás de su propio texto.
     Al cambiar de Ent la carta vuelve a plegarse SIN efecto: el padre la
     monta con `key={vista}` y el estado nace de cero. */
  const [abierta, setAbierta] = useState(false);
  return (
    <article
      className={`teg-carta${plegable && !abierta ? ' teg-carta-plegada' : ''}`}
      role="status"
    >
      <header className="teg-carta-cab">
        <h3>{leccion.titulo}</h3>
        <p className="teg-cientifico">
          <em>{leccion.arbol}</em>
          <span className="teg-piso">{leccion.piso}</span>
        </p>
      </header>
      <p className="teg-texto">{leccion.texto}</p>
      {plegable && (
        <button
          type="button"
          className="teg-leer-mas"
          aria-expanded={abierta}
          onClick={() => setAbierta((a) => !a)}
        >
          {abierta ? 'Ver menos' : 'Leer más'}
        </button>
      )}
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL MUNDO
   ══════════════════════════════════════════════════════════════════════════ */
export default function TresEntsGradiente3D() {
  const [listo, setListo] = useState(false);

  /* SU Ent, no un Ent: el protagonista sale del piso térmico de la finca.
     `usePerfilFincaStore` es el mismo store que ya siembra el valle
     (`EntradaValle3D.jsx`) — se rehidrata solo cuando el onboarding ubica la
     finca. Sin perfil, con el perfil de demo, o con un piso que aún no tiene
     Ent, `protagonistaDePiso` cae al default concreto (templado): la regla
     del máximo-dos aplica igual, nunca a "mostrar todo".
     Desde el 2026-07-22 los CUATRO pisos tienen Ent tallado (entró la ceiba de
     tierra caliente), así que un perfil de tierra caliente ya no cae al
     default: le sale SU ceiba. */
  const perfilFinca = usePerfilFincaStore((s) => s.perfil);
  const protagonista = useMemo(
    () => protagonistaDePiso(perfilFinca?.pisoTermico),
    [perfilFinca],
  );
  const [vista, setVista] = useState(protagonista);
  const controls = useRef(null);

  const { tier } = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfilRender = useMemo(() => perfilDeTier(tier), [tier]);

  /* La atmósfera: la familia `ladera` mezclada 60 % hacia la madre, que es la
     ley de la casa. Es la bruma verde-plata del páramo andino — nunca el
     celeste frío de postal. El fondo y la niebla salen de ahí, ni un hex a mano. */
  const cielo = useMemo(() => mezclarCielo(CIELOS.ladera), []);

  const leccion = LECCION_DE[vista] || LECCION_DE.templado;
  /* El foco (quién se dibuja SIN apagar) y los pisos que se dibujan del todo
     son la MISMA decisión, tomada por `vista`: nunca más de dos Ents montados
     a la vez (`pisosVisiblesParaVista`, `pisosBosqueGradiente.js`). */
  const foco = vista;
  const pisosVisibles = useMemo(() => pisosVisiblesParaVista(vista), [vista]);

  const elegir = useCallback((id) => setVista(id), []);

  /* Teclado: 1..N salta al Ent de ese botón. Un mundo que se maneja con el
     teclado se puede capturar y revisar sin pelear con el mouse. */
  useEffect(() => {
    const alTeclear = (e) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < BOTONES.length) setVista(BOTONES[i].id);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  return (
    <section
      className="teg-root"
      data-tier={tier}
      data-vista={vista}
      aria-label="Los árboles maestros del gradiente andino"
    >
      <style>{CSS}</style>
      <Canvas
        className="teg-canvas"
        /* El fundido va en estilo EN LÍNEA, no en una clase: construir la
           ladera y los Ents bloquea el hilo principal un momento y, con el
           fundido en clase, el navegador se queda con la opacidad en 0 mientras
           está bloqueado → la escena aparece VACÍA en la captura, con todo
           dibujado e invisible. Ya pasó en el bosque de los tres estratos. */
        style={{ opacity: listo ? 1 : 0, transition: 'opacity 0.9s ease' }}
        dpr={perfilRender.dpr}
        gl={{ antialias: perfilRender.antialias, powerPreference: 'high-performance' }}
        camera={{
          position: [VISTAS.juntosAncho.pos.x, VISTAS.juntosAncho.pos.y, VISTAS.juntosAncho.pos.z],
          fov: VISTAS.juntosAncho.fov,
          near: 0.4,
          far: 320,
        }}
        shadows={!!perfilRender.sombras}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <color attach="background" args={[cielo.fondo]} />
        {/* La niebla empieza LEJOS: tiene que velar el fondo del valle, no la
            ladera que uno está mirando. Con la niebla encima, los pisos se
            funden en un beige — que es lo contrario de lo que este mundo
            existe para enseñar.
            Y ARRANCA MÁS LEJOS que antes (42→62): el bloque creció con la
            terraza de la ceiba y la cámara se fue para atrás, así que con el
            corte viejo la vista de teléfono llegaba velada de punta a punta. */}
        {perfilRender.fog && <fog attach="fog" args={[cielo.niebla, 62, 215]} />}

        <LuzMadre
          cielo={CIELOS.ladera}
          perfil={perfilRender}
          /* El sol entra por el hombro derecho, del lado del páramo: la luz
             viene de arriba de la ladera y baja con el agua. Las sombras de los
             Ents caen hacia el valle. */
          solPos={[19, 27, 13]}
          sombra={{ left: -22, right: 22, top: 22, bottom: -22, far: 96 }}
        />

        <EscenaTresEnts
          tier={tier}
          perfil={perfilRender}
          reducedMotion={reducedMotion}
          foco={foco}
          pisosVisibles={pisosVisibles}
        />

        <Camarografo vista={vista} controls={controls} reducedMotion={reducedMotion} />

        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableZoom
          /* El objetivo ARRANCA en la vista madre. Sin esto queda en el origen
             —dentro del bloque de tierra— y el primer cuadro que ve el usuario
             (y toda captura) sale mirando al piso. */
          target={[VISTAS.juntosAncho.mira.x, VISTAS.juntosAncho.mira.y, VISTAS.juntosAncho.mira.z]}
          minDistance={7}
          maxDistance={120}
          /* Se puede mirar hacia arriba (a las copas) pero no meterse bajo
             tierra: por debajo del bloque no hay nada que enseñar. */
          minPolarAngle={0.24}
          maxPolarAngle={1.44}
          enableDamping
          dampingFactor={0.08}
          autoRotate={false}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* EL CROMO. En pantalla ancha la carta de la lección va ARRIBA A LA
          IZQUIERDA, sobre el cielo vacío que deja la ladera: puesta abajo —que
          fue la primera versión— le tapaba justo la banda de micorrizas, o sea
          media lección. En teléfono no hay cielo a los lados y la carta vuelve
          al pie, que es donde cae el pulgar. */}
      <div className="teg-chrome">
        <div className="teg-cabeza">
          <h2 className="teg-titulo">
            Los árboles maestros del gradiente
            <small>De la tierra caliente al páramo · el agua baja por encima, las micorrizas amarran por debajo</small>
          </h2>

          <Carta leccion={leccion} />
        </div>

        <div className="teg-pie">
          <div className="teg-botones" role="group" aria-label="Los Ents del gradiente">
            {BOTONES.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className="teg-boton"
                aria-pressed={vista === b.id}
                onClick={() => elegir(b.id)}
                title={`Tecla ${i + 1}`}
              >
                {b.texto}
              </button>
            ))}
          </div>
          <Carta key={vista} leccion={leccion} plegable />
        </div>
      </div>
    </section>
  );
}

const CSS = `
.teg-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: #d6e0d2; }
.teg-canvas { position: absolute; inset: 0; }
.teg-chrome { position: absolute; inset: 0; z-index: 7; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.teg-cabeza { display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem; }
.teg-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #22301f; text-shadow: 0 1px 8px rgba(236,242,226,0.85); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.teg-titulo small { display: block; font: 500 0.8rem/1.35 system-ui, sans-serif; opacity: 0.86; margin-top: 0.15rem; }
.teg-pie { padding: 0 1rem 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
.teg-botones { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; }
.teg-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(30,46,28,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(236,244,228,0.86); color: #253320; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.teg-boton:hover, .teg-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(30,46,28,0.6); outline: none; }
.teg-boton[aria-pressed='true'] { background: #cfe3c2; border-color: rgba(37,51,32,0.75); }
.teg-carta { margin: 0 1rem; max-width: 25rem; padding: 0.6rem 0.95rem 0.7rem; border-radius: 0.8rem; background: rgba(28,40,26,0.72); backdrop-filter: blur(4px); color: #eff5e9; }
.teg-carta-cab h3 { margin: 0; font: 700 0.92rem/1.25 system-ui, sans-serif; }
.teg-cientifico { margin: 0.1rem 0 0.35rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; font: 500 0.74rem/1.3 system-ui, sans-serif; opacity: 0.9; }
.teg-piso { opacity: 0.78; }
.teg-texto { margin: 0; font: 500 0.79rem/1.5 system-ui, sans-serif; }
/* La carta plegada: dos líneas de texto y el resto detrás de «Leer más». */
.teg-carta-plegada .teg-texto { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.teg-leer-mas { pointer-events: auto; appearance: none; border: 0; background: none; padding: 0.3rem 0 0; color: #cfe3c2; font: 700 0.75rem/1 system-ui, sans-serif; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
/* En teléfono (o en cualquier ventana angosta) la ladera ocupa la franja del
   medio y no hay cielo lateral que aprovechar: la carta baja al pie, junto a
   los botones, que es donde alcanza el pulgar. */
@media (max-width: 760px) {
  .teg-chrome { justify-content: space-between; }
  .teg-cabeza { gap: 0; }
  .teg-cabeza .teg-carta { display: none; }
  .teg-pie .teg-carta { display: block; }
  .teg-titulo { font-size: 1rem; padding: 0.7rem 0.8rem 0; }
  .teg-titulo small { font-size: 0.72rem; }
  .teg-carta { margin: 0; max-width: 100%; padding: 0.5rem 0.8rem 0.6rem; }
  .teg-carta-cab h3 { font-size: 0.86rem; }
  .teg-texto { font-size: 0.74rem; line-height: 1.45; }
  .teg-boton { padding: 0.4rem 0.78rem; font-size: 0.75rem; }
}
@media (min-width: 761px) { .teg-pie .teg-carta { display: none; } }
@media (prefers-reduced-motion: reduce) { .teg-canvas { transition: none !important; } }
`;
