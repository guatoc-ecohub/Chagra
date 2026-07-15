/*
 * EscenaSueloComparado — EL MISMO SUELO, DOS VECES: la red micorrízica encendida
 * y la red apagada bajo fumigación repetida.
 *
 * La cámara está bajo tierra, como en una vitrina de acuario. A un lado la red
 * corriendo: los hilos del hongo enlazando raíz con raíz, el azúcar bajando, el
 * fósforo y el agua subiendo, la lombriz en su túnel, la tierra en grumos. Al
 * otro, el mismo suelo después de fumigar seguido: los hilos partidos, los
 * pulsos frenándose contra el corte, el fósforo ahí mismo pero pegado y quieto,
 * el túnel vacío, la tierra en polvo.
 *
 * En el medio no hay una raya: hay un FRENTE que se puede mover. Empujelo a la
 * izquierda ("fumigar seguido") y el suelo se apaga rápido. Empujelo a la
 * derecha ("parar") y la red se vuelve a tejer — lento, como es en la vida.
 *
 * ── LO QUE NO VA A ENCONTRAR ACÁ, Y ES A PROPÓSITO ─────────────────────────
 * Ni una calavera, ni un rojo de alarma, ni una mata muriéndose, ni una palabra
 * sobre cáncer. Las razones largas están en `sueloComparado.geom.js`; el resumen
 * es que esta pieza va del SUELO —donde la evidencia es clara y el argumento es
 * del propio bolsillo del campesino— y que la mata del lado fumigado se dibuja
 * VIVA Y VERDE porque en la finca está viva y verde, y ese es justamente el
 * problema. Si dibujáramos la mata muerta, el campesino diría "mentira, las mías
 * están bien", y tendría razón, y perderíamos todo.
 *
 * ── TIER ──────────────────────────────────────────────────────────────────
 * 'alto' pleno; 'medio' frugal; 'bajo' mínimo digno. Lo que NUNCA se pierde,
 * ni en el equipo más humilde, es el CONTRASTE: la red rota, el fósforo quieto y
 * la lombriz que falta se ven en los tres tiers. Se caen los pulsos, las motas y
 * los poros — nunca el argumento. Con `reducedMotion` la escena monta QUIETA
 * (frameloop a demanda) y el frente salta sin animar.
 *
 * Componente r3f: montar SOLO dentro de un host que provea altura. Importa
 * three → siempre perezoso.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  PALETA,
  SUELO,
  paramsDeTier,
  saludEn,
  avanzarFrente,
  sistemaRaices,
  nodosLibres,
  construirRed,
  geometriaRed,
  geometriaRaices,
  raicillasFinas,
  pulsosDeRed,
  colorPulso,
  fosforoPegado,
  lombricesYTuneles,
  agregados,
  porosAgua,
  bancoEsporas,
  hojarascaSuperficie,
} from './sueloComparado.geom.js';
import {
  TITULO,
  LADOS as TEXTO_LADOS,
  HOTSPOTS,
  CIERRE,
  CONCESION,
  CONTROL,
} from './sueloComparadoTextos.js';

/* Los tres destinos del frente. salud=1 donde x << frente: entonces frente muy a
   la derecha = todo vivo; muy a la izquierda = todo apagado; en 0 = el corte,
   que es como arranca la pieza (los dos suelos a la vez, que es el punto). */
const FRENTE = {
  medio: 0,
  todoApagado: -SUELO.ancho / 2 - 0.8,
  todoVivo: SUELO.ancho / 2 + 0.8,
};
const BORROSIDAD = 1.25; // debe coincidir con el default de saludEn()

/* ── CSS self-contained (sirve igual en el mockup y en el host `<Mundo>`) ─── */
const CSS = `
.suco { position: absolute; inset: 0; overflow: hidden; background: #0b0806; }
.suco__lienzo { position: absolute; inset: 0; opacity: 0; transition: opacity 0.8s ease; }
.suco__lienzo--lista { opacity: 1; }

.suco__titulo { position: absolute; top: 0; left: 0; right: 0; padding: 0.9rem 1rem 1.6rem; pointer-events: none; background: linear-gradient(to bottom, rgba(11, 8, 6, 0.85), transparent); z-index: 2; }
.suco__titulo h2 { margin: 0; color: #f4ecdd; font: 700 1.05rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.suco__titulo p { margin: 0.2rem 0 0; color: #b9ac97; font: 400 0.82rem/1.3 system-ui, sans-serif; }

/* los rótulos de cada lado: viven sobre el lienzo, sin robarle la escena */
.suco__lados { position: absolute; top: 3.6rem; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 1rem; pointer-events: none; z-index: 2; }
.suco__lado { max-width: 8.5rem; }
.suco__lado b { display: block; color: #eafff6; font: 700 0.76rem/1.2 system-ui, sans-serif; }
.suco__lado--apagado b { color: #d8cbb4; }
.suco__lado span { display: block; margin-top: 0.15rem; color: #94897a; font: 400 0.7rem/1.25 system-ui, sans-serif; }
.suco__lado--apagado { text-align: right; }

/* el control: dos botones grandes, pulgar de campo, nada de sliders finitos */
.suco__control { position: absolute; bottom: 0; left: 0; right: 0; display: flex; gap: 0.5rem; padding: 0.7rem 0.8rem 0.9rem; background: linear-gradient(to top, rgba(11, 8, 6, 0.92), transparent); z-index: 3; }
.suco__btn { flex: 1; min-height: 2.9rem; padding: 0.5rem 0.7rem; border: 0; border-radius: 0.7rem; background: rgba(28, 40, 36, 0.9); color: #d9ccb6; font: 600 0.8rem/1.15 system-ui, sans-serif; cursor: pointer; -webkit-tap-highlight-color: transparent; box-shadow: inset 0 0 0 1px rgba(160, 150, 130, 0.25); transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease; }
.suco__btn--on { background: rgba(20, 62, 52, 0.95); color: #eafff6; box-shadow: inset 0 0 0 1px rgba(126, 240, 200, 0.55); }
.suco__btn:focus-visible { outline: 2px solid #7ef0c8; outline-offset: 2px; }
.suco__ayuda { position: absolute; bottom: 3.6rem; left: 0; right: 0; text-align: center; color: #7d7365; font: 400 0.68rem/1.2 system-ui, sans-serif; pointer-events: none; z-index: 2; }

/* los hotspots */
.suco-hot { transform: translate(-50%, -50%); }
.suco-hot__btn { width: 1.15rem; height: 1.15rem; padding: 0; border: 0; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #eafff6, #37d6b0 70%); box-shadow: 0 0 9px 2px rgba(55, 214, 176, 0.55); cursor: pointer; -webkit-tap-highlight-color: transparent; }
.suco-hot__btn--apagado { background: radial-gradient(circle at 35% 35%, #fff2d8, #d9a13b 70%); box-shadow: 0 0 9px 2px rgba(217, 161, 59, 0.5); }
.suco-hot__btn:focus-visible { outline: 2px solid #fff8ec; outline-offset: 3px; }

/* la ficha de lectura */
.suco__ficha { position: absolute; left: 0.8rem; right: 0.8rem; bottom: 4.6rem; padding: 0.8rem 0.9rem; border-radius: 0.8rem; background: rgba(14, 22, 20, 0.96); box-shadow: 0 6px 26px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(126, 240, 200, 0.28); z-index: 4; }
.suco__ficha h3 { margin: 0 0 0.3rem; color: #eafff6; font: 700 0.86rem/1.2 system-ui, sans-serif; }
.suco__ficha p { margin: 0; color: #c3b9a6; font: 400 0.78rem/1.45 system-ui, sans-serif; }
.suco__ficha button { position: absolute; top: 0.4rem; right: 0.5rem; width: 1.7rem; height: 1.7rem; border: 0; border-radius: 50%; background: transparent; color: #8c8171; font: 700 1rem/1 system-ui, sans-serif; cursor: pointer; }
.suco__ficha button:focus-visible { outline: 2px solid #7ef0c8; }

/* el cierre: la asimetría y la esperanza, en ese orden (ver textos) */
.suco__cierre { position: absolute; left: 0.8rem; right: 0.8rem; bottom: 4.6rem; padding: 0.85rem 0.95rem; border-radius: 0.8rem; background: rgba(14, 22, 20, 0.96); box-shadow: 0 6px 26px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(216, 182, 240, 0.3); z-index: 4; }
.suco__cierre h3 { margin: 0 0 0.25rem; color: #e6d3f7; font: 700 0.86rem/1.2 system-ui, sans-serif; }
.suco__cierre p { margin: 0 0 0.55rem; color: #c3b9a6; font: 400 0.78rem/1.45 system-ui, sans-serif; }
.suco__cierre p:last-of-type { margin-bottom: 0; }

@media (prefers-reduced-motion: reduce) {
  .suco__lienzo, .suco__btn { transition: none; }
}
@media (max-width: 22rem) {
  .suco__titulo h2 { font-size: 0.95rem; }
  .suco__lado { max-width: 6.6rem; }
}
`;

/* ══════════════════════════════════════════════════════════════════════════
 * EL SHADER DE LA RED — el corazón técnico de la pieza.
 *
 * Un solo uniform (`uFrente`) apaga o prende la red entera, sin reconstruir un
 * solo vértice. Eso es lo que hace que esto corra en el teléfono del campesino
 * y no solo en la máquina del que lo programó.
 *
 * OJO — LA REGLA QUE NO SE PUEDE ROMPER: este `smoothstep` y la `saludEn()` de
 * `sueloComparado.geom.js` calculan EXACTAMENTE lo mismo, y tienen que seguir
 * calculándolo. GLSL: smoothstep(e0,e1,x) = suave(clamp((x-e0)/(e1-e0),0,1));
 * con e0=frente-b y e1=frente+b eso es idéntico a la fórmula del módulo. Si
 * alguien toca una y no la otra, la escena empieza a mentir: los pulsos (que
 * usan la de JS) se frenarían en un punto y los hilos (que usan esta) se
 * cortarían en otro. Se vería como un bug menor de sincronía y sería, en
 * realidad, la pieza contradiciéndose a sí misma.
 * ══════════════════════════════════════════════════════════════════════════ */
const VERT_RED = `
attribute vec3 aCentro;
attribute float aT;
attribute float aFase;
attribute float aPuente;

uniform float uFrente;
uniform float uBorrosidad;
uniform vec3 uMicelio;
uniform vec3 uPuente;
uniform vec3 uMicelioTenue;
uniform vec3 uMuerto;
uniform vec3 uFantasma;

varying vec3 vColor;
varying float vSalud;

void main() {
  // la salud de ESTE anillo (no la del hilo): un hilo largo que cruza el frente
  // se apaga A LO LARGO, gradual, como pasa en el suelo — no de un golpe
  float s = 1.0 - smoothstep(uFrente - uBorrosidad, uFrente + uBorrosidad, aCentro.x);
  vSalud = s;

  // EL CORTE. Con salud baja se abren huecos: la hifa se pica y después se
  // parte. Colapsar el anillo entero a su centro deja triángulos de área cero
  // (invisibles) y nos ahorra el "discard", que en gama baja se paga caro.
  // (Ojo: nada de acentos graves acá adentro — esto es un template literal de
  // JS y un acento grave suelto lo parte en dos. Ya pasó.)
  float corte = 1.0;
  if (s < 0.72) {
    float onda = sin((aT * mix(3.0, 9.0, 1.0 - s) + aFase) * 6.2831853);
    float umbral = mix(-1.05, 0.75, 1.0 - s);
    corte = onda > umbral ? 0.0 : 1.0;
  }

  // el hilo vivo es grueso; el apagado adelgaza hasta ser una traza
  float rad = mix(0.28, 1.0, smoothstep(0.0, 1.0, s)) * corte;
  vec3 p = mix(aCentro, position, rad);

  // turquesa vivo (más claro si es puente) → ceniza → traza fantasma
  if (s > 0.5) {
    vec3 base = mix(uMicelio, uPuente, aPuente);
    vColor = mix(base, uMicelioTenue, 1.0 - smoothstep(0.0, 1.0, (s - 0.5) * 2.0));
  } else {
    vColor = mix(uMuerto, uFantasma, 1.0 - smoothstep(0.0, 1.0, s * 2.0));
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const FRAG_RED = `
uniform float uOpacidad;
varying vec3 vColor;
varying float vSalud;

void main() {
  // La red viva brilla; la apagada apenas se insinúa. La TRAZA FANTASMA (lo que
  // queda donde la red pasaba) es recurso de arte, no afirmación biológica: dice
  // "aquí HABÍA" y "aquí PUEDE volver". Sin ella el lado apagado sería un vacío
  // y se leería "acá nunca hubo nada" — justo la mentira que la pieza combate.
  float a = uOpacidad * mix(0.30, 1.0, smoothstep(0.0, 1.0, vSalud));
  gl_FragColor = vec4(vColor, a);
}
`;

/* ── EL RELOJ: mueve el frente y lo deja donde todos lo leen ──────────────
   UN solo lugar integra el frente. Los demás lo leen de `frenteRef` y cada uno
   se pinta como quiera — nadie le escribe a nadie.

   El `priority -1` lo hace correr antes que los otros useFrame, para que todos
   lean el frente del mismo instante (no desactiva el render automático: eso solo
   pasa con prioridad positiva). */
function Reloj({ frenteRef, destino, reducedMotion }) {
  useFrame((_, dt) => {
    /* con reducedMotion no hay viaje: salta y ya (la escena monta quieta) */
    frenteRef.current = reducedMotion
      ? destino
      : avanzarFrente(frenteRef.current, destino, Math.min(dt, 0.05));
  }, -1);
  return null;
}

/* Un repintado cuando la escena es a demanda (reducedMotion). */
function Repintar({ dep }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); }, [dep, invalidate]);
  return null;
}

/* ── LA RED: una sola malla, un solo draw-call, un solo uniform ───────────
   Ella misma lee el frente y escribe su uniform. Mover el frente entero cuesta
   un float: ni un vértice se reconstruye. Eso es lo que hace que esto corra en
   el teléfono del campesino y no solo en la máquina del que lo programó. */
function RedMicelio({ geo, frenteRef, reducedMotion }) {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: VERT_RED,
      fragmentShader: FRAG_RED,
      uniforms: {
        /* arranca en el corte (los dos suelos a la vez); el primer useFrame lo
           pone donde toque. Constante y no `frenteRef.current`: leer un ref en
           render es justo lo que no se hace. */
        uFrente: { value: FRENTE.medio },
        uBorrosidad: { value: BORROSIDAD },
        uOpacidad: { value: 0.92 },
        uMicelio: { value: new THREE.Color().copy(PALETA.micelio) },
        uPuente: { value: new THREE.Color().copy(PALETA.puente) },
        uMicelioTenue: { value: new THREE.Color().copy(PALETA.micelioTenue) },
        uMuerto: { value: new THREE.Color().copy(PALETA.micelioMuerto) },
        uFantasma: { value: new THREE.Color().copy(PALETA.trazaFantasma) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useFrame((st) => {
    const u = mat.uniforms;
    u.uFrente.value = frenteRef.current;
    /* la red respira apenas: está viva, no es un diagrama */
    u.uOpacidad.value = reducedMotion
      ? 0.9
      : 0.86 + Math.sin(st.clock.elapsedTime * 0.9) * 0.08;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/* ══════════════════════════════════════════════════════════════════════════
 * REGLA DE `reducedMotion` EN ESTA ESCENA — se rompe fácil, léala.
 *
 * `reducedMotion` congela EL RELOJ, no el estado. Los componentes que leen el
 * frente tienen que seguir corriendo su `useFrame` aunque `reducedMotion` esté
 * activo: si no, el usuario toca "Fumigar seguido", la red se apaga (es un
 * uniform) y la lombriz, el fósforo y los grumos se quedan como estaban. Media
 * escena diciendo una cosa y la otra media diciendo otra.
 *
 * No cuesta nada: con `reducedMotion` el Canvas va en `frameloop="demand"`, así
 * que estos `useFrame` solo corren cuando algo invalida (un toque, el
 * OrbitControls). En reposo el costo es cero igual.
 *
 * Entonces: NO ponga `if (reducedMotion) return` en un componente que lee
 * `frenteRef`. Lo que sí se apaga es el tiempo — el latido, la deriva, el avance
 * del pulso — pasando 0 en vez de `elapsedTime`.
 * ══════════════════════════════════════════════════════════════════════════ */

/* ── LOS NODOS: arbúsculos (intercambio) y uniones del micelio ─────────── */
function NodosRed({ nodos, frenteRef }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.05, 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color() }), []);

  const escribir = () => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p, c } = tmp;
    const frente = frenteRef.current;
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      const sal = saludEn(n.pos.x, frente);
      const base = n.tipo === 'raiz' ? 1.5 : 0.9;
      /* el arbúsculo y la unión se apagan con la red; el nodo no desaparece del
         todo: queda el punto donde estuvo */
      const esc = base * (0.28 + sal * 0.72);
      p.copy(n.pos); s.setScalar(esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      c.copy(n.tipo === 'raiz' ? PALETA.arbusculo : PALETA.nodo)
        .lerp(PALETA.micelioMuerto, 1 - sal);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(); // pose inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame(() => escribir()); // lee el frente: corre siempre (ver regla arriba)
  if (!nodos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, nodos.length]} frustumCulled={false} />;
}

/* ── EL BANCO DE ESPORAS: las luces que cruzan el frente enteras ──────────
   Componente aparte de NodosRed a propósito: son las ÚNICAS que no leen la
   salud. Separarlas en su propio mesh es la forma de garantizar, en código, que
   nadie las apague por descuido el día que refactorice los nodos. */
function Esporas({ esporas, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.055, 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA.espora, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < esporas.length; i++) {
      const e = esporas[i];
      /* laten despacio: están esperando, no dormidas (el corpus no dice
         "dormidas" y la pieza tampoco lo dice) */
      const late = reducedMotion ? 1 : 0.86 + Math.sin(time * 0.7 + e.semilla * 6.28) * 0.14;
      p.copy(e.pos); s.setScalar(e.esc * late);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    escribir(0); // pose inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esporas]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!esporas.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, esporas.length]} frustumCulled={false} />;
}

/* ── LOS PULSOS: el intercambio, y su frenón ──────────────────────────────
   Cada pulso corre su hilo. Al entrar en la zona apagada se pone LENTO, se
   achica y se queda quieto contra el corte. No es un apagón: es un atasco. Y del
   lado de la mata el azúcar sigue saliendo hacia un hilo que ya no devuelve —
   la mata pagando por un servicio que no existe. Esa es la imagen. */
function Pulsos({ curvas, pulsos, frenteRef, reducedMotion }) {
  const ref = useRef(null);
  /* El AVANCE de cada pulso es estado de ESTE componente, no de los datos: el
     módulo de geometría los entrega con su `t0` y no se toca más. (Primero los
     mutaba en el propio array de `pulsos` — o sea, mutando una prop. Anda, y es
     una porquería: cualquiera que reusara esos datos se llevaría el estado de
     una animación ajena pegado.) */
  const avance = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.045, 7, 6), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color() }), []);

  useLayoutEffect(() => {
    avance.current = Float32Array.from(pulsos, (pu) => pu.t0);
  }, [pulsos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  const escribir = (dt) => {
    const mesh = ref.current;
    const ts = avance.current;
    if (!mesh || !ts) return;
    const { m, q, s, p, c } = tmp;
    const frente = frenteRef.current;
    for (let i = 0; i < pulsos.length; i++) {
      const pu = pulsos[i];
      const cur = curvas[pu.hilo];
      if (!cur) { s.setScalar(0); m.compose(p.set(0, 0, 0), q, s); mesh.setMatrixAt(i, m); continue; }
      cur.getPoint(ts[i], p);
      const sal = saludEn(p.x, frente);

      if (dt > 0) {
        /* frena al entrar en lo apagado: a salud 0 queda casi detenido */
        const vel = pu.vel * (0.04 + 0.96 * sal);
        let t = ts[i] + (pu.sube ? 1 : -1) * vel * dt;
        t -= Math.floor(t); // envolver a [0,1)
        ts[i] = t;
      }

      /* se enciende a media hebra y se entrega en las puntas; y se apaga con la
         salud del sitio (un pulso no vive en un hilo roto) */
      const brote = Math.sin(ts[i] * Math.PI);
      s.setScalar((0.35 + brote * 0.85) * (0.1 + sal * 0.9));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      c.copy(colorPulso(pu.tipo)).lerp(PALETA.micelioMuerto, (1 - sal) * 0.75);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  // dt=0 congela el avance, pero igual se recolocan segun el frente
  useFrame((_, dt) => escribir(reducedMotion ? 0 : Math.min(dt, 0.05)));
  if (!pulsos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, pulsos.length]} frustumCulled={false} />;
}

/* ── LA TRAMPA: EL FÓSFORO QUE SÍ ESTÁ, PEGADO ────────────────────────────
   El argumento más fuerte de la pieza. En el lado vivo estas motas se sueltan y
   flotan (el hongo las está soltando [21]). En el lado apagado están QUIETAS,
   pegadas a su partícula de hierro, a un centímetro de la raíz, y la mata no las
   alcanza. La quietud ES el mensaje: no falta comida — se cortó el que la traía.
   Por eso toca comprar bulto, y por eso el bulto no lo saca del hueco. */
function FosforoPegado({ motas, frenteRef, reducedMotion }) {
  const refP = useRef(null);
  const refH = useRef(null);
  const geoP = useMemo(() => new THREE.SphereGeometry(0.036, 6, 5), []);
  const geoH = useMemo(() => new THREE.IcosahedronGeometry(0.06, 0), []);
  const matP = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const matH = useMemo(() => new THREE.MeshLambertMaterial({ color: PALETA.particulaHierro, flatShading: true }), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color() }), []);

  /* la partícula de hierro/arcilla no cambia: siempre está ahí, agarrando */
  useLayoutEffect(() => {
    const mesh = refH.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < motas.length; i++) {
      p.copy(motas[i].pos); s.setScalar(motas[i].esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [motas, tmp]);

  const escribir = (time) => {
    const mesh = refP.current;
    if (!mesh) return;
    const { m, q, s, p, c } = tmp;
    const frente = frenteRef.current;
    for (let i = 0; i < motas.length; i++) {
      const mo = motas[i];
      const sal = saludEn(mo.pos.x, frente);
      /* VIVO: se suelta y sube (el hongo la despegó). APAGADO: quieta, pegada. */
      const suelta = sal * sal; // solo con red buena de verdad se despega
      const sube = reducedMotion ? suelta * 0.12 : suelta * (0.1 + Math.abs(Math.sin(time * 0.5 + mo.semilla * 6.28)) * 0.22);
      p.set(
        mo.pos.x + (reducedMotion ? 0 : Math.cos(time * 0.4 + mo.semilla * 6.28) * 0.05 * suelta),
        mo.pos.y + sube,
        mo.pos.z,
      );
      s.setScalar(mo.esc * (0.7 + suelta * 0.5));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      /* ámbar vivo cuando va corriendo; ámbar apagado cuando está agarrada */
      c.copy(PALETA.fosforoPegado).lerp(PALETA.fosforo, suelta);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(0); // pose inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motas]);
  useLayoutEffect(() => () => { geoP.dispose(); geoH.dispose(); matP.dispose(); matH.dispose(); }, [geoP, geoH, matP, matH]);
  useFrame((st) => escribir(reducedMotion ? 0 : st.clock.elapsedTime));
  if (!motas.length) return null;
  return (
    <group>
      <instancedMesh ref={refH} args={[geoH, matH, motas.length]} frustumCulled={false} />
      <instancedMesh ref={refP} args={[geoP, matP, motas.length]} frustumCulled={false} />
    </group>
  );
}

/* ── LAS RAÍCES: lo que NO cambia ─────────────────────────────────────────
   Estáticas, iguales de los dos lados. La mata está viva. Ver la nota larga en
   `tuboRaizGeom` — es la decisión que le da permiso a toda la pieza. */
function Raices({ geo }) {
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.96 }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/* ── LA RAICILLA ALGODONOSA: lo que SÍ se pierde ──────────────────────────
   La señal verificable con una pala [100]. Cave, mire la raíz, vea si está el
   pelito blanco. No hay que creernos nada. */
function Raicillas({ mechones, frenteRef }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.05, 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA.raizFina, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  const escribir = () => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    const frente = frenteRef.current;
    for (let i = 0; i < mechones.length; i++) {
      const me = mechones[i];
      const sal = saludEn(me.pos.x, frente);
      /* al cubo: el pelito blanco es lo PRIMERO que se pierde, y no vuelve fácil */
      p.copy(me.pos); s.setScalar(me.esc * sal * sal * sal);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    escribir(); // pose inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechones]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame(() => escribir()); // lee el frente: corre siempre
  if (!mechones.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, mechones.length]} frustumCulled={false} />;
}

/* ── LA LOMBRIZ Y SU TÚNEL ────────────────────────────────────────────────
   [102] "si al cavar no aparece ninguna... es una alerta". El TÚNEL SE QUEDA
   aunque ella no: no hay cadáver, hay ausencia — y la casa sigue lista para
   cuando vuelva. Un túnel vacío dice más que una lombriz muerta, y además es lo
   que de verdad pasa. */
function Lombrices({ lombrices, frenteRef, reducedMotion }) {
  const grupo = useRef([]);
  const matTunel = useMemo(() => new THREE.MeshBasicMaterial({ color: PALETA.tunelVacio, transparent: true, opacity: 0.5, depthWrite: false }), []);
  const matLombriz = useMemo(() => new THREE.MeshLambertMaterial({ color: PALETA.lombriz }), []);
  const geos = useMemo(
    () => lombrices.map((lo) => new THREE.TubeGeometry(lo.curva, 14, 0.055, 5, false)),
    [lombrices],
  );
  const cuerpo = useMemo(() => new THREE.CapsuleGeometry(0.05, 0.16, 3, 6), []);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), p2: new THREE.Vector3() }), []);

  useLayoutEffect(() => () => {
    geos.forEach((g) => g.dispose());
    cuerpo.dispose(); matTunel.dispose(); matLombriz.dispose();
  }, [geos, cuerpo, matTunel, matLombriz]);

  useFrame((st) => {
    const frente = frenteRef.current;
    const { p, p2 } = tmp;
    for (let i = 0; i < lombrices.length; i++) {
      const nodo = grupo.current[i];
      if (!nodo) continue;
      const lo = lombrices[i];
      const sal = saludEn(lo.x, frente);
      const t = reducedMotion ? 0.5 : (lo.t + st.clock.elapsedTime * lo.vel) % 1;
      lo.curva.getPoint(t, p);
      nodo.position.copy(p);
      /* mira hacia donde va (sin cuentas raras: dos puntos y listo) */
      lo.curva.getPoint(Math.min(0.999, t + 0.03), p2);
      nodo.lookAt(p2);
      nodo.rotateX(Math.PI / 2); // la cápsula nace en Y
      /* se va con la salud: donde el suelo se apagó, no aparece ninguna */
      nodo.scale.setScalar(Math.max(0.001, sal * sal));
      nodo.visible = sal > 0.06;
    }
  });

  return (
    <group>
      {lombrices.map((lo, i) => (
        <group key={`lo-${i}`}>
          {/* el túnel: se queda siempre */}
          <mesh geometry={geos[i]} material={matTunel} frustumCulled={false} />
          {/* ella: solo donde el suelo está vivo */}
          <mesh
            ref={(n) => { grupo.current[i] = n; }}
            geometry={cuerpo}
            material={matLombriz}
            frustumCulled={false}
          />
        </group>
      ))}
    </group>
  );
}

/* ── LOS GRUMOS Y EL POLVO ────────────────────────────────────────────────
   La MISMA partícula: apretada en su miga cuando algo la está pegando [6][105],
   suelta y caída cuando ya no. No cambia la tierra — cambia si algo la agarra.
   Se puede comprobar con la mano: agarre un puñado y vea si se rompe en grumitos
   o se le va en polvo [100]. */
function Agregados({ granos, frenteRef }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.045, 0), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color() }), []);
  const escribir = () => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p, c } = tmp;
    const frente = frenteRef.current;
    for (let i = 0; i < granos.length; i++) {
      const g = granos[i];
      const sal = saludEn(g.juntos.x, frente);
      p.copy(g.sueltos).lerp(g.juntos, sal);
      s.setScalar(g.esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      c.copy(PALETA.polvo).lerp(PALETA.grumo, sal);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => {
    escribir(); // pose inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame(() => escribir()); // lee el frente: corre siempre
  if (!granos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, granos.length]} frustumCulled={false} />;
}

/* ── LOS POROS Y SU AGUA ──────────────────────────────────────────────────
   [22] los hilos llegan a poros chiquiticos "donde queda agua atrapada después
   de que la superficie ya se secó". Esa es el agua del verano. Sin red se queda
   ahí sin que nadie la saque. */
function PorosAgua({ poros, frenteRef, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.03, 6, 5), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA.gotaAgua, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    const frente = frenteRef.current;
    for (let i = 0; i < poros.length; i++) {
      const po = poros[i];
      const sal = saludEn(po.pos.x, frente);
      const late = reducedMotion ? 1 : 0.9 + Math.sin(time * 0.6 + po.semilla * 6.28) * 0.1;
      p.copy(po.pos);
      s.setScalar(po.esc * sal * late);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    escribir(0); // pose inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poros]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st) => escribir(reducedMotion ? 0 : st.clock.elapsedTime));
  if (!poros.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, poros.length]} frustumCulled={false} />;
}

/* ── LA SUPERFICIE ────────────────────────────────────────────────────────
   Arriba del corte: de un lado hojarasca (la cobertura que ahoga la maleza y
   además abona [2]); del otro, tierra pelada al sol [40][50]. Es lo único que el
   campesino ve sin cavar — y por eso los TALLITOS están verdes de los DOS lados.
   La mata se ve bien igual. Ese es el problema. */
function Superficie({ matas, hojas, frenteRef }) {
  const ref = useRef(null);
  const geoH = useMemo(() => new THREE.PlaneGeometry(0.16, 0.1), []);
  const matH = useMemo(
    () => new THREE.MeshLambertMaterial({ color: PALETA.hojarasca, side: THREE.DoubleSide, transparent: true }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), e: new THREE.Euler() }), []);
  const escribir = () => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p, e } = tmp;
    const frente = frenteRef.current;
    for (let i = 0; i < hojas.length; i++) {
      const h = hojas[i];
      const sal = saludEn(h.pos.x, frente);
      e.set(-Math.PI / 2, 0, h.rot);
      q.setFromEuler(e);
      p.copy(h.pos);
      s.setScalar(h.esc * sal);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    escribir(); // pose inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hojas]);
  useLayoutEffect(() => () => { geoH.dispose(); matH.dispose(); }, [geoH, matH]);
  useFrame(() => escribir()); // lee el frente: corre siempre

  const zMedio = SUELO.zAtras + (SUELO.z0 - SUELO.zAtras) / 2;
  return (
    <group>
      {/* la lámina de tierra vista desde abajo: el techo del mundo subterráneo */}
      <mesh position={[0, 0, zMedio]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SUELO.ancho + 1.5, SUELO.z0 - SUELO.zAtras + 1.2]} />
        <meshBasicMaterial color={PALETA.tierraAlta} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* los tallitos: VERDES DE LOS DOS LADOS. La mata está viva. Ese es el
          punto entero de la pieza. */}
      {matas.map((mata) => (
        <group key={`ta-${mata.id}`} position={[mata.base.x, 0, mata.base.z]}>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 0.56, 6]} />
            <meshLambertMaterial color={PALETA.tallo} />
          </mesh>
          <mesh position={[0.09, 0.42, 0]} rotation={[0, 0, -0.7]}>
            <coneGeometry args={[0.05, 0.3, 4]} />
            <meshLambertMaterial color={PALETA.tallo} flatShading />
          </mesh>
        </group>
      ))}
      {hojas.length > 0 && (
        <instancedMesh ref={ref} args={[geoH, matH, hojas.length]} frustumCulled={false} />
      )}
    </group>
  );
}

/* ── LOS HOTSPOTS ─────────────────────────────────────────────────────────
   Anclas fijas: cada punto vive donde está la cosa de la que habla. Los de
   'ambos' se ponen dos veces (uno por lado) porque la gracia es comparar la
   MISMA cosa a lado y lado. */
const ANCLAS = {
  intercambio: [-2.9, -1.5, 0.2],
  red: [-1.7, -2.7, 0.1],
  raicilla: [-3.5, -2.4, 0.3],
  'hilo-roto': [2.0, -1.6, 0.2],
  'fosforo-pegado': [3.1, -2.5, 0.25],
  trampa: [2.4, -3.5, 0.1],
  rebrote: [3.7, -0.75, 0.3],
  espora: [1.5, -3.6, 0.2],
  /* los de 'ambos': [lado vivo, lado apagado] */
  grumo: [[-3.9, -3.3, 0.3], [3.9, -3.3, 0.3]],
  lombriz: [[-2.4, -3.9, 0.2], [2.9, -3.9, 0.2]],
  olor: [[-4.1, -0.7, 0.35], [4.1, -0.7, 0.35]],
  agua: [[-0.9, -4.1, 0.2], [1.1, -4.4, 0.2]],
};

function Hotspots({ onAbrir, tier }) {
  /* en gama baja el DOM sobre el canvas cuesta: solo los que cargan el argumento */
  const lista = tier === 'bajo'
    ? HOTSPOTS.filter((h) => ['fosforo-pegado', 'lombriz', 'trampa', 'espora'].includes(h.id))
    : HOTSPOTS;
  const puntos = [];
  for (const h of lista) {
    const a = ANCLAS[h.id];
    if (!a) continue;
    if (Array.isArray(a[0])) {
      puntos.push({ h, pos: a[0], k: `${h.id}-v`, apagado: false });
      puntos.push({ h, pos: a[1], k: `${h.id}-a`, apagado: true });
    } else {
      puntos.push({ h, pos: a, k: h.id, apagado: h.lado === 'apagado' });
    }
  }
  return puntos.map(({ h, pos, k, apagado }) => (
    <Html key={k} position={pos} center className="suco-hot" zIndexRange={[5, 0]}>
      <button
        type="button"
        className={`suco-hot__btn${apagado ? ' suco-hot__btn--apagado' : ''}`}
        onClick={() => onAbrir(h)}
        aria-label={h.titulo}
      />
    </Html>
  ));
}

/* ── EL MUNDO ─────────────────────────────────────────────────────────────── */
function Mundo({ tier, reducedMotion, frenteRef, destino, onAbrir }) {
  const params = useMemo(() => paramsDeTier(tier), [tier]);

  const { matas, puntas } = useMemo(() => sistemaRaices(params), [params]);
  const libres = useMemo(() => nodosLibres(params), [params]);
  /* `matas` no es opcional acá: sin ellas no se tejen los PUENTES y la red no
     cruza de una mata a otra — que es lo único que esta escena existe para
     mostrar. Ver la nota en `construirRed`. */
  const { nodos, hilos } = useMemo(
    () => construirRed(puntas, libres, params, matas),
    [puntas, libres, params, matas],
  );
  const { geo: geoRed, curvas } = useMemo(
    () => geometriaRed(nodos, hilos, params),
    [nodos, hilos, params],
  );
  const geoRaices = useMemo(() => geometriaRaices(matas, params), [matas, params]);
  const mechones = useMemo(() => raicillasFinas(matas, params), [matas, params]);
  const pulsos = useMemo(() => pulsosDeRed(hilos, params), [hilos, params]);
  const motasP = useMemo(() => fosforoPegado(params), [params]);
  const lombrices = useMemo(() => lombricesYTuneles(params), [params]);
  const granos = useMemo(() => agregados(params), [params]);
  const poros = useMemo(() => porosAgua(params), [params]);
  const esporas = useMemo(() => bancoEsporas(params), [params]);
  const hojas = useMemo(() => hojarascaSuperficie(params), [params]);

  useLayoutEffect(() => () => { geoRed.dispose(); geoRaices.dispose(); }, [geoRed, geoRaices]);

  return (
    <>
      <Reloj frenteRef={frenteRef} destino={destino} reducedMotion={reducedMotion} />
      {/* luz mínima y cálida: esto es un subsuelo, no un quirófano. Lo que
          brilla, brilla por sí solo (aditivo); la luz solo le da cuerpo a la
          raíz, la lombriz y los grumos. */}
      <ambientLight intensity={0.55} color="#ffe6ba" />
      <directionalLight position={[2, 4, 3]} intensity={0.7} color="#ffd79a" />
      <directionalLight position={[-3, -1, -2]} intensity={0.25} color="#9db8d9" />

      <Superficie matas={matas} hojas={hojas} frenteRef={frenteRef} />
      <Raices geo={geoRaices} />
      <Raicillas mechones={mechones} frenteRef={frenteRef} />
      <Agregados granos={granos} frenteRef={frenteRef} />
      <PorosAgua poros={poros} frenteRef={frenteRef} reducedMotion={reducedMotion} />
      <Lombrices lombrices={lombrices} frenteRef={frenteRef} reducedMotion={reducedMotion} />
      <FosforoPegado motas={motasP} frenteRef={frenteRef} reducedMotion={reducedMotion} />
      <RedMicelio geo={geoRed} frenteRef={frenteRef} reducedMotion={reducedMotion} />
      <NodosRed nodos={nodos} frenteRef={frenteRef} />
      <Esporas esporas={esporas} reducedMotion={reducedMotion} />
      <Pulsos curvas={curvas} pulsos={pulsos} frenteRef={frenteRef} reducedMotion={reducedMotion} />
      <Hotspots onAbrir={onAbrir} tier={tier} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/**
 * La escena. Montar dentro de un host con altura.
 * @param {{ tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean }} props
 */
export default function EscenaSueloComparado({ tier = 'medio', reducedMotion = false }) {
  const [lista, setLista] = useState(false);
  const [ficha, setFicha] = useState(null);
  /* 'medio' = los dos suelos a la vez (así arranca: el corte es el argumento).
     'apagar' = fumigar seguido. 'recuperar' = parar y dejarla volver. */
  const [modo, setModo] = useState('medio');
  const frenteRef = useRef(FRENTE.medio);

  const destino = modo === 'apagar' ? FRENTE.todoApagado
    : modo === 'recuperar' ? FRENTE.todoVivo
      : FRENTE.medio;

  /* el cierre aparece solo cuando el campesino ya movió el frente: primero que
     vea, después le hablamos. Y en el orden que manda el corpus — la asimetría
     antes que la esperanza (ver `CIERRE` en los textos). */
  const cierre = modo === 'apagar' ? CIERRE.asimetria : modo === 'recuperar' ? CIERRE.esperanza : null;

  useEffect(() => { const t = setTimeout(() => setLista(true), 60); return () => clearTimeout(t); }, []);

  const alternar = (m) => { setModo((v) => (v === m ? 'medio' : m)); setFicha(null); };

  return (
    <div className="suco">
      <style>{CSS}</style>

      <Canvas
        className={`suco__lienzo${lista ? ' suco__lienzo--lista' : ''}`}
        dpr={tier === 'alto' ? [1, 1.8] : tier === 'medio' ? [1, 1.3] : 1}
        gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
        camera={{ position: [0, -1.6, 8.4], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <color attach="background" args={[`#${PALETA.tierra.getHexString()}`]} />
        <fog attach="fog" args={[`#${PALETA.tierra.getHexString()}`, 9, 20]} />
        <Mundo
          tier={tier}
          reducedMotion={reducedMotion}
          frenteRef={frenteRef}
          destino={destino}
          onAbrir={setFicha}
        />
        <OrbitControls
          enablePan={false}
          minDistance={4.5}
          maxDistance={11}
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.78}
          enableDamping={!reducedMotion}
        />
        <AdaptiveDpr pixelated />
        <Repintar dep={modo} />
      </Canvas>

      <header className="suco__titulo">
        <h2>{TITULO.titulo}</h2>
        <p>{TITULO.bajada}</p>
      </header>

      <div className="suco__lados">
        <div className="suco__lado">
          <b>{TEXTO_LADOS.vivo.nombre}</b>
          <span>{TEXTO_LADOS.vivo.pie}</span>
        </div>
        <div className="suco__lado suco__lado--apagado">
          <b>{TEXTO_LADOS.apagado.nombre}</b>
          <span>{TEXTO_LADOS.apagado.pie}</span>
        </div>
      </div>

      {!ficha && !cierre && <p className="suco__ayuda">{CONTROL.ayuda}</p>}

      {ficha && (
        <article className="suco__ficha">
          <button type="button" onClick={() => setFicha(null)} aria-label="Cerrar">×</button>
          <h3>{ficha.titulo}</h3>
          <p>{ficha.texto}</p>
        </article>
      )}

      {!ficha && cierre && (
        <article className="suco__cierre">
          <h3>{cierre.titulo}</h3>
          <p>{cierre.texto}</p>
          {modo === 'recuperar' && <p><b>{CIERRE.primerPaso.titulo}.</b> {CIERRE.primerPaso.texto}</p>}
          {modo === 'apagar' && <p><b>{CONCESION.titulo}.</b> {CONCESION.texto}</p>}
        </article>
      )}

      <div className="suco__control">
        <button
          type="button"
          className={`suco__btn${modo === 'apagar' ? ' suco__btn--on' : ''}`}
          onClick={() => alternar('apagar')}
          aria-pressed={modo === 'apagar'}
        >
          {CONTROL.apagar}
        </button>
        <button
          type="button"
          className={`suco__btn${modo === 'recuperar' ? ' suco__btn--on' : ''}`}
          onClick={() => alternar('recuperar')}
          aria-pressed={modo === 'recuperar'}
        >
          {CONTROL.recuperar}
        </button>
      </div>
    </div>
  );
}

/* Las dos cadencias (`CADENCIAS` en los textos) son la rima que remata la pieza:
   el bulto dice "repita cada tres o cuatro semanas" y la guadaña dice "repita el
   corte cada tres o cuatro semanas". Mismo ritmo, mismo trabajo, otro destino.
   No está montada acá todavía: va en la lámina 2D que acompaña la escena, donde
   el texto puede respirar. Queda anotado para que no se pierda — es el mejor
   hallazgo del corpus y sería una lástima. */
export { FRENTE };
