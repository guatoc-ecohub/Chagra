/*
 * Biocompostera — TRES CAJONES EN CORTE: el estiércol volviéndose tierra, y el
 * calor haciendo el trabajo que nadie ve.
 *
 * Se lee de izquierda a derecha como una frase: recién armado (las capas
 * todavía se cuentan una por una, el corazón hirviendo, el vapor saliendo) →
 * el volteo (revuelto, el bieldo clavado, todavía tibio) → maduro (oscuro,
 * frío, y por fin la lombriz).
 *
 * Y al lado, fuera de todo, el MONTÓN MAL LLEVADO: encharcado, sin carbono, sin
 * techo. Suelta amoníaco verde que se arrastra por el suelo en vez de subir, y
 * tiene las moscas que los cajones no tienen. Los dos "humean". Uno es salud
 * (agua tibia) y el otro es plata volándose. Esa comparación es el módulo
 * entero: ver `HUMOS` en `estiercol.geom.js`.
 *
 * Componente r3f (va dentro del `<Canvas>` de `EscenaEstiercol.jsx`). Geometría
 * y verdad técnica en `compostera.geom.js`; aquí, material, luz y movimiento.
 * Con `reducedMotion` monta quieto: el humo se congela repartido en su columna
 * y las lombrices dejan de moverse — pero todo sigue ahí.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialMadre } from '../paleta/index.js';
import { PALETA_ESTIERCOL, HUMOS, columnaHumo, torcerConLaMano } from './estiercol.geom.js';
import {
  CAJON,
  TECHO,
  FASES,
  MONTON_MALO,
  cajonX,
  capasDelMonton,
  capaGeom,
  corazonGeom,
  colorCorazon,
  tablasCajon,
  techoGeom,
  postesTecho,
  bolaPunoGeom,
  bieldo,
  lombrices,
  lombrizGeom,
  montonMaloGeom,
  charcoGeom,
  moscas,
} from './compostera.geom.js';

/* ── EL HUMO: el mismo componente sirve para el vapor y para el amoníaco, y
      esa es exactamente la gracia. Cambia el color, la subida y la deriva —
      el vapor sube limpio y se va; el amoníaco se arrastra pegado al suelo,
      que es por lo que uno se lo respira. Instanciado: un draw-call. ── */
function Humo({ datos, tipo, reducedMotion }) {
  const ref = useRef(null);
  const receta = HUMOS[tipo] || HUMOS.vapor;
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: receta.color,
        transparent: true,
        opacity: receta.opacidad,
        depthWrite: false,
      }),
    [receta],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  const colocar = (h, t) => {
    /* el vapor sube; el amoníaco casi no: se queda a la altura de la nariz */
    const y = h.base.y + t * receta.vida * h.vel;
    const abre = 1 + t * 1.9; // el jirón se abre al alejarse
    v.set(
      h.base.x + Math.sin(h.giro + t * 2.4) * h.deriva * (1 + t * 2.6),
      y,
      h.base.z + Math.cos(h.giro + t * 2) * h.deriva * (1 + t * 2.6),
    );
    const k = h.escala * abre;
    s.set(k, k * 0.8, k);
    m.compose(v, q, s);
    return m;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    datos.forEach((h, i) => mesh.setMatrixAt(i, colocar(h, h.fase)));
    mesh.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `colocar` solo usa memos estables
  }, [datos]);

  useFrame((st) => {
    const mesh = ref.current;
    if (!mesh || reducedMotion) return;
    const t0 = st.clock.elapsedTime * 0.24;
    for (let i = 0; i < datos.length; i += 1) {
      const h = datos[i];
      const t = (h.fase + t0) % 1;
      mesh.setMatrixAt(i, colocar(h, t));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!datos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, datos.length]} frustumCulled={false} />;
}

/* ── LAS LOMBRICES: solo en el cajón maduro. Se mueven despacio, como se mueve
      una lombriz. Instanciadas. ── */
function Lombrices({ datos, matLombriz, reducedMotion }) {
  const geo = useMemo(() => lombrizGeom(), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const grupo = useRef(null);

  useFrame((st) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = st.clock.elapsedTime;
    g.children.forEach((hijo, i) => {
      const d = datos[i];
      if (!d) return;
      /* el vaivén lento del que se está enterrando */
      hijo.rotation.z = d.rot[2] + Math.sin(t * 0.8 + d.fase * 6.28) * 0.22;
      hijo.position.y = d.pos[1] + Math.sin(t * 0.5 + d.fase * 6.28) * 0.012;
    });
  });

  if (!datos.length) return null;
  return (
    <group ref={grupo}>
      {datos.map((d, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={matLombriz}
          position={d.pos}
          rotation={d.rot}
          scale={d.escala}
        />
      ))}
    </group>
  );
}

/* ── LAS MOSCAS: giran sobre el montón malo y sobre ningún otro. No vienen por
      el olor: vienen por el material húmedo y blando donde ponen los huevos.
      Son la misma causa que el olor, y por eso están donde está el olor. ── */
function Moscas({ datos, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.016, 4, 3), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: PALETA_ESTIERCOL.mosca }), []);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  const colocar = (f, t) => {
    v.set(
      f.centro[0] + Math.sin(t * f.vel + f.fase) * f.radio,
      f.centro[1] + Math.sin(t * f.vel * 1.7 + f.fase) * f.radio * 0.4,
      f.centro[2] + Math.cos(t * f.vel + f.fase) * f.radio,
    );
    s.setScalar(f.escala);
    m.compose(v, q, s);
    return m;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    datos.forEach((f, i) => mesh.setMatrixAt(i, colocar(f, 0)));
    mesh.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `colocar` solo usa memos estables
  }, [datos]);

  useFrame((st) => {
    const mesh = ref.current;
    if (!mesh || reducedMotion) return;
    for (let i = 0; i < datos.length; i += 1) mesh.setMatrixAt(i, colocar(datos[i], st.clock.elapsedTime));
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!datos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, datos.length]} frustumCulled={false} />;
}

/* ── UN CAJÓN: sus capas en corte, su corazón de calor y su vapor. ── */
function Cajon({ fase, perfil, params, materiales, reducedMotion }) {
  const capas = useMemo(() => capasDelMonton(fase), [fase]);
  const geos = useMemo(() => capas.map((c, i) => capaGeom(c, 3 + i * 5)), [capas]);
  const gCorazon = useMemo(() => corazonGeom(fase), [fase]);
  useLayoutEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
      gCorazon.dispose();
    },
    [geos, gCorazon],
  );

  const matCorazon = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: colorCorazon(fase),
        transparent: true,
        opacity: 0.3 * fase.temperatura + 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [fase],
  );
  useLayoutEffect(() => () => matCorazon.dispose(), [matCorazon]);

  /* origen LOCAL: el grupo del cajón ya está en su x (ver `tablasCajon`) */
  const humo = useMemo(
    () =>
      columnaHumo(
        [0, 1.35, -CAJON.hondo * 0.5],
        Math.max(2, Math.round(params.humo * fase.vapor)),
        'vapor',
        101 + fase.cajon,
      ),
    [params.humo, fase],
  );

  const datosLombriz = useMemo(
    () => (fase.lombrices ? lombrices(params) : []),
    [fase.lombrices, params],
  );

  return (
    <group position={[cajonX(fase.cajon), 0, 0]}>
      {/* las tablas del cajón (el frente está afuera: se está trabajando) */}
      {tablasCajon().map((t, i) => (
        <mesh key={i} material={materiales.madera} position={t.pos} castShadow={perfil.sombras}>
          <boxGeometry args={t.args} />
        </mesh>
      ))}

      {/* EL MONTÓN EN CORTE: capa de estiércol, capa de material seco. Las
          secas son más gruesas — sin ese carbono, el nitrógeno se va al aire */}
      {capas.map((c, i) => (
        <mesh
          key={i}
          geometry={geos[i]}
          material={
            c.tipo === 'drenaje'
              ? materiales.maderaVieja
              : c.tipo === 'carbono'
                ? materiales.carbono
                : c.tipo === 'estiercol'
                  ? materiales.estiercol
                  : materiales.compost
          }
        />
      ))}

      {/* EL CORAZÓN CALIENTE: lo que sanitiza. Se encoge y se apaga con la fase */}
      <mesh geometry={gCorazon} material={matCorazon} />

      {/* el vapor: agua tibia subiendo. La señal de que va BIEN */}
      <Humo datos={humo} tipo="vapor" reducedMotion={reducedMotion} />

      {/* la lombriz: solo aquí, solo al final */}
      <Lombrices datos={datosLombriz} matLombriz={materiales.lombriz} reducedMotion={reducedMotion} />
    </group>
  );
}

/**
 * EL MONTÓN MAL LLEVADO — el contraejemplo, en su propio componente porque la
 * escena lo planta FUERA del anillo del ciclo (estación 'monton'). Ese destierro
 * es literal: de este montón la materia no vuelve al suelo, se va al aire.
 *
 * Sin carbono, sin techo, sin voltear, encharcado. Se ve BABOSO (por eso usa la
 * receta de agua: un compost sano se ve seco a húmedo, nunca brillante), tiene
 * su charco al pie —lo que escurre y termina en la quebrada si nadie lo ataja—
 * y sus moscas. Y no tiene corazón caliente: la fermentación sin aire genera
 * menos calor útil que la aeróbica, así que ni siquiera sanitiza.
 *
 * @param {object} props
 * @param {object} props.perfil  perfilDeTier(tier)
 * @param {object} props.params  paramsDeTier(tier)
 * @param {boolean} [props.reducedMotion]
 */
export function MontonMalLlevado({ perfil, params, reducedMotion = false }) {
  const materiales = useMemo(
    () => ({
      malo: crearMaterialMadre('agua', perfil, { color: PALETA_ESTIERCOL.lodoHondo, opacity: 1 }),
      charco: crearMaterialMadre('agua', perfil, { color: PALETA_ESTIERCOL.purin }),
    }),
    [perfil],
  );
  useLayoutEffect(() => () => Object.values(materiales).forEach((m) => m.dispose()), [materiales]);

  const gMalo = useMemo(() => montonMaloGeom(), []);
  const gCharco = useMemo(() => charcoGeom(), []);
  useLayoutEffect(() => () => { gMalo.dispose(); gCharco.dispose(); }, [gMalo, gCharco]);

  /* el amoníaco: NO sube, se arrastra. Es nitrógeno yéndose — o sea, plata */
  const humo = useMemo(
    () => columnaHumo([0, MONTON_MALO.alto * 0.8, 0], params.humo, 'amoniaco', 111),
    [params.humo],
  );
  const datosMoscas = useMemo(() => moscas(params), [params]);

  return (
    <group>
      <mesh geometry={gCharco} material={materiales.charco} position={[0, 0.008, 0]} />
      <mesh geometry={gMalo} material={materiales.malo} castShadow={perfil.sombras} />
      <Humo datos={humo} tipo="amoniaco" reducedMotion={reducedMotion} />
      <Moscas datos={datosMoscas} reducedMotion={reducedMotion} />
    </group>
  );
}

/**
 * La biocompostera completa (los tres cajones y su techo).
 * @param {object} props
 * @param {object} props.perfil  perfilDeTier(tier)
 * @param {object} props.params  paramsDeTier(tier)
 * @param {boolean} [props.reducedMotion]
 */
export default function Biocompostera({ perfil, params, reducedMotion = false }) {
  const materiales = useMemo(
    () => ({
      madera: crearMaterialMadre('madera', perfil),
      maderaVieja: crearMaterialMadre('madera', perfil, { color: PALETA_ESTIERCOL.maderaVieja }),
      carbono: crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.carbono }),
      estiercol: crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.estiercolFresco }),
      compost: crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.compostMaduro }),
      lombriz: crearMaterialMadre('corteza', perfil, { color: PALETA_ESTIERCOL.lombriz }),
      lamina: crearMaterialMadre('lamina', perfil),
    }),
    [perfil],
  );
  useLayoutEffect(
    () => () => Object.values(materiales).forEach((m) => m.dispose()),
    [materiales],
  );

  const gTecho = useMemo(() => techoGeom(), []);
  const gBola = useMemo(() => bolaPunoGeom(), []);
  const gPoste = useMemo(
    () => torcerConLaMano(new THREE.CylinderGeometry(0.05, 0.062, TECHO.alturaFrente, 6, 3), { amplitud: 0.02, seed: 77 }),
    [],
  );
  useLayoutEffect(
    () => () => [gTecho, gBola, gPoste].forEach((g) => g.dispose()),
    [gTecho, gBola, gPoste],
  );

  const b = useMemo(() => bieldo(), []);

  return (
    <group>
      {/* ── EL TECHO: la pieza que decide si el montón va bien o se pudre. Sin
             él la lluvia lo encharca y se vuelve anaerobio ── */}
      {postesTecho().map((p, i) => (
        <mesh key={i} geometry={gPoste} material={materiales.madera} position={[p[0], TECHO.alturaFrente / 2, p[2]]} castShadow={perfil.sombras} />
      ))}
      <mesh
        geometry={gTecho}
        material={materiales.lamina}
        position={[0, (TECHO.alturaFrente + TECHO.alturaAtras) / 2, -CAJON.hondo / 2]}
        rotation={[Math.atan2(TECHO.alturaFrente - TECHO.alturaAtras, CAJON.hondo + 0.75), 0, 0]}
        castShadow={perfil.sombras}
      />

      {/* ── LAS TRES FASES, de izquierda a derecha: se arma, se voltea, madura ── */}
      {FASES.map((fase) => (
        <Cajon
          key={fase.id}
          fase={fase}
          perfil={perfil}
          params={params}
          materiales={materiales}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* ── EL BIELDO clavado en el cajón del volteo: el trabajo, presente ── */}
      <group position={[cajonX(1) + 0.5, 1.1, -0.35]} rotation={[0.3, 0, -0.26]}>
        <mesh material={materiales.madera}>
          <cylinderGeometry args={b.cabo.args} />
        </mesh>
        {b.dientes.map((dx, i) => (
          <mesh key={i} material={materiales.lamina} position={[dx, -0.62, 0]}>
            <cylinderGeometry args={[0.008, 0.005, b.dienteAlto, 4]} />
          </mesh>
        ))}
      </group>

      {/* ── LA PRUEBA DEL PUÑO, hecha objeto: la bola apretada que se sostiene y
             NO chorrea. Ese es el punto de humedad. Con los surcos de los dedos ── */}
      <mesh geometry={gBola} material={materiales.compost} position={[cajonX(1) - 0.6, CAJON.alto + 0.08, -0.06]} />
    </group>
  );
}
