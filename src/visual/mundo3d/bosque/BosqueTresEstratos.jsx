/*
 * BosqueTresEstratos — el bosque nativo altoandino montado por ESTRATOS.
 *
 * Consume `estratosAltoandinos.geom.js` (los doce arquetipos y la siembra) y lo
 * pone en pie: un InstancedMesh por arquetipo, el suelo y el mecido de la
 * vegetación.
 *
 * ── Presupuesto de dibujo ──────────────────────────────────────────────────
 * Doce bancos + el suelo = TRECE draw-calls para todo el bosque,
 * hayan 60 plantas o 600. Todo comparte UN material de color por vértice: el
 * color vive horneado en la geometría (AO, gradiente de altura, contraluz), que
 * es lo que permite que un teléfono barato dibuje un bosque de niebla.
 *
 * ── El mecido ──────────────────────────────────────────────────────────────
 * Squash & stretch de rubber-hose, pero de bosque: el dosel cabecea amplio y
 * lento porque le pega el viento de verdad; el sotobosque apenas se mueve
 * porque está resguardado; el suelo NO se mueve (y además son cientos de
 * instancias: no vale la pena tocarlas por frame). Con reduced-motion todo
 * queda quieto.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { crearMaterialVertexColors } from '../paleta/index.js';
import { VERDES, TIERRAS, NEUTROS, mezclar } from '../paleta/paletaMadre.js';
import {
  ARQUETIPOS,
  ESTRATOS,
  CONSTRUCTORES,
  CALIDAD,
  alturaSuelo,
  poblarBosque,
} from './estratosAltoandinos.geom.js';

/* Cuánto mece el viento a cada estrato (amplitud en radianes, período en s). */
const MECIDO = {
  dosel: { amp: 0.03, per: 4.6 },
  sotobosque: { amp: 0.014, per: 3.4 },
  suelo: { amp: 0, per: 1 },
};

/* ══════════════════════════════════════════════════════════════════════════
   UN BANCO: todas las matas de UN arquetipo en un solo InstancedMesh
   ══════════════════════════════════════════════════════════════════════════ */
function Banco({ geo, mat, items, estrato, mece = false, castShadow = false }) {
  const ref = useRef(null);
  /* Se guardan los datos de cada instancia para poder recomponer la matriz en
     el mecido sin volver a leer del atributo (que sería ida y vuelta a GPU). */
  const datos = useMemo(
    () => items.map((it) => ({
      p: new THREE.Vector3(it.pos[0], it.pos[1], it.pos[2]),
      s: new THREE.Vector3(it.escala[0], it.escala[1], it.escala[2]),
      rotY: it.rotY,
      tiltX: it.tilt[0],
      tiltZ: it.tilt[1],
      fase: it.semilla * Math.PI * 2,
    })),
    [items],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !datos.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      e.set(d.tiltX, d.rotY, d.tiltZ);
      q.setFromEuler(e);
      m.compose(d.p, q, d.s);
      mesh.setMatrixAt(i, m);
      /* Tinte por instancia: ni dos matas del mismo verde. La variación es
         chica (±6 %) — lo justo para que el rodal no se lea clonado. */
      const v = 0.94 + ((d.fase * 37) % 1) * 0.12;
      col.setRGB(v, v, v);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [datos]);

  const tmp = useMemo(
    () => (mece
      ? { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler() }
      : null),
    [mece],
  );

  useFrame(({ clock }) => {
    if (!mece || !tmp) return;
    const mesh = ref.current;
    if (!mesh || !datos.length) return;
    const t = clock.getElapsedTime();
    const { amp, per } = MECIDO[estrato] || MECIDO.sotobosque;
    const w = (Math.PI * 2) / per;
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      /* Dos senos desfasados: el cabeceo no es un metrónomo. */
      const a = Math.sin(t * w + d.fase) * amp;
      const b = Math.sin(t * w * 0.61 + d.fase * 1.7) * amp * 0.7;
      tmp.e.set(d.tiltX + a, d.rotY, d.tiltZ + b);
      tmp.q.setFromEuler(tmp.e);
      tmp.m.compose(d.p, tmp.q, d.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!geo || !datos.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, datos.length]}
      frustumCulled={false}
      castShadow={castShadow}
      receiveShadow={false}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EL SUELO — mantillo con parches de musgo, hundido en las hondonadas
   ══════════════════════════════════════════════════════════════════════════ */
function SueloBosque({ mat, extension }) {
  const geo = useMemo(() => {
    const lado = extension * 3.4; // debe pasarse de donde llega el rodal
    const seg = 68;
    const g = new THREE.PlaneGeometry(lado, lado, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colores = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const mantillo = new THREE.Color(TIERRAS.mantillo);
    const sombra = new THREE.Color(TIERRAS.mantilloSombra);
    const musgo = new THREE.Color(mezclar(VERDES.paramoMusgo, NEUTROS.tinta, 0.3));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = alturaSuelo(x, z);
      pos.setY(i, y);
      /* El musgo se agarra en lo húmedo (las hondonadas); el mantillo seco
         queda en los lomos. Un piso de un solo pardo se ve a plástico —y si
         además queda claro y anaranjado, el bosque de niebla se lee como
         potrero polvoriento, que fue justo lo que pasó en la primera pasada. */
      const humedo = Math.max(0, Math.min(1, 0.62 - y * 0.7));
      c.copy(mantillo).lerp(sombra, 0.35 + humedo * 0.55);
      const parche = (Math.sin(x * 0.9) * Math.cos(z * 0.75) + 1) * 0.5;
      c.lerp(musgo, Math.min(0.88, 0.3 + humedo * parche * 1.35));
      /* LA LUZ ES LA LECCIÓN. El claro recibe sol y su piso es claro; a medida
         que uno se mete bajo el dosel el piso se apaga. Ese degradado, pintado
         en el propio suelo, es lo que hace sentir que el techo del bosque está
         cobrando su sombra — y de paso separa el claro del rodal sin una sola
         línea dibujada. */
      const enBosque = Math.max(0, Math.min(1, (2 - z) / 15));
      c.multiplyScalar(0.92 - 0.36 * enBosque);
      colores[i * 3] = c.r;
      colores[i * 3 + 1] = c.g;
      colores[i * 3 + 2] = c.b;
    }
    pos.needsUpdate = true;
    g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    g.computeVertexNormals();
    return g;
  }, [extension]);

  useLayoutEffect(() => () => geo.dispose(), [geo]);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL BOSQUE COMPLETO
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} props.tier
 * @param {{materialRico?:boolean, flatShading?:boolean, sombras?:boolean}} props.perfil
 * @param {boolean} [props.reducedMotion]
 * @param {string|null} [props.destacado]  id de estrato a destacar (los otros se
 *   apagan un poco). Es la ayuda pedagógica: sirve para señalar «este es el
 *   dosel» sin ocultar el resto del bosque.
 */
export default function BosqueTresEstratos({
  tier = 'alto',
  perfil,
  reducedMotion = false,
  destacado = null,
  extension = 23,
  seed = 4242,
}) {
  const q = CALIDAD[tier] ?? CALIDAD.medio;

  /* Las doce geometrías: se construyen UNA vez por tier y se comparten entre
     todas las instancias del arquetipo. */
  const geos = useMemo(() => {
    const out = {};
    for (const arq of ARQUETIPOS) {
      const construir = CONSTRUCTORES[arq.id];
      if (!construir) continue;
      out[arq.id] = construir({ q }, undefined);
    }
    return out;
  }, [q]);

  useEffect(() => () => {
    Object.values(geos).forEach((g) => g && g.dispose());
  }, [geos]);

  const bancos = useMemo(() => poblarBosque({ tier, seed, extension }), [tier, seed, extension]);

  /* UN material para todo el bosque (color por vértice horneado). */
  const mat = useMemo(() => crearMaterialVertexColors(perfil), [perfil]);
  useEffect(() => () => mat.dispose(), [mat]);

  /* El apagado del estrato no destacado: se hace con un material gemelo más
     oscuro, no tocando las geometrías (que son compartidas). */
  const matApagado = useMemo(() => {
    const m = crearMaterialVertexColors(perfil);
    m.color = new THREE.Color('#5c6152'); // multiplica: baja valor y satura menos
    return m;
  }, [perfil]);
  useEffect(() => () => matApagado.dispose(), [matApagado]);

  const puedeMecer = !reducedMotion && tier !== 'bajo';

  return (
    <group name="bosque-tres-estratos">
      <SueloBosque mat={mat} extension={extension} />

      {ARQUETIPOS.map((arq) => {
        const apagar = destacado && destacado !== arq.estrato;
        return (
          <Banco
            key={arq.id}
            geo={geos[arq.id]}
            mat={apagar ? matApagado : mat}
            items={bancos[arq.id] || []}
            estrato={arq.estrato}
            mece={puedeMecer && arq.estrato !== 'suelo'}
            castShadow={!!perfil?.sombras && arq.estrato === 'dosel'}
          />
        );
      })}
    </group>
  );
}

export { ESTRATOS, ARQUETIPOS };
