/*
 * Biodigestor — la MANGA en corte, viva: el lodo fermentando sin aire, las
 * burbujas de metano subiendo a la campana, el biol saliendo por el otro lado
 * y —el momento que lo explica todo— el biogás llegando a la cocina y ardiendo
 * AZUL.
 *
 * Componente r3f: se monta dentro de un `<Canvas>` (lo provee
 * `EscenaEstiercol.jsx`). Importa three → siempre perezoso, nunca en el bundle
 * base.
 *
 * La geometría y la física viven en `biodigestor.geom.js` (puro y testeable);
 * aquí solo van el material, la luz y el movimiento. Todo lo que se mueve pasa
 * por el gate `reducedMotion`: con la preferencia de calma el biodigestor monta
 * QUIETO — las burbujas se congelan a media altura y la llama deja de respirar,
 * pero SIGUEN AHÍ (la lección no depende del movimiento).
 *
 * Presupuesto: la manga, el lodo, la campana y la zanja son mallas estáticas;
 * las burbujas van INSTANCIADAS (un draw-call para todas). La llama son tres
 * lathes chiquitos por boca, sin luz propia salvo en tier alto.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialMadre } from '../paleta/index.js';
import { PALETA_ESTIERCOL } from './estiercol.geom.js';
import {
  ENTRADA,
  SALIDA,
  TOMA_GAS,
  VALVULA,
  COCINA,
  CLIMAS,
  LLAMA,
  lodoGeom,
  campanaGeom,
  mangaGeom,
  cantosManga,
  zanjaGeom,
  camaZanjaGeom,
  invernaderoGeom,
  parcheGeom,
  amarresGeom,
  burbujas,
  BURBUJA_TECHO,
  recorridoGas,
  recorridoCocina,
  mangueraGeom,
  bocasLlama,
  llamaGeom,
} from './biodigestor.geom.js';

/* ── LAS BURBUJAS: la fermentación anaerobia, que es lo único que hay que
      creerse de esta escena. Nacen en el fondo del lodo y mueren al llegar a
      la superficie, donde entregan su gas a la campana. Instanciadas. ── */
function Burbujas({ datos, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETA_ESTIERCOL.burbuja,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  /* El recorrido de una burbuja, en función de su avance t ∈ [0,1). Se usa
     igual con movimiento (t corre) que sin él (t congelado por fase): la
     escena calma muestra las burbujas repartidas por toda la columna. */
  const colocar = (b, t) => {
    const y = b.y0 + (BURBUJA_TECHO - b.y0) * t;
    /* sube culebreando: una burbuja en un lodo espeso no sube a plomo */
    const bamboleo = Math.sin(t * 9 + b.fase * 6.28) * 0.022;
    v.set(b.x + bamboleo, y, b.z);
    /* engorda al subir (menos presión arriba) y se estira al final */
    const k = b.escala * (0.7 + t * 0.5);
    s.set(k, k * (1 + t * 0.3), k);
    m.compose(v, q, s);
    return m;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    /* con calma esto es TODO lo que corre: las burbujas quedan repartidas por
       la columna (cada una en su fase), que es lo que hay que ver. */
    datos.forEach((b, i) => mesh.setMatrixAt(i, colocar(b, b.fase)));
    mesh.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `colocar` es estable (solo usa memos)
  }, [datos]);

  useFrame((st) => {
    const mesh = ref.current;
    if (!mesh || reducedMotion) return;
    const t0 = st.clock.elapsedTime;
    for (let i = 0; i < datos.length; i += 1) {
      const b = datos[i];
      const t = (b.fase + t0 * b.vel) % 1;
      mesh.setMatrixAt(i, colocar(b, t));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!datos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, datos.length]} frustumCulled={false} />;
}

/* ── LA LLAMA AZUL: tres capas por boca (corazón pálido, cono azul, borde).
      Aditiva y sin sombra: es fuego, no un objeto. Respira apenas — una llama
      de biogás bien regulada es PAREJA, no una fogata que bailotea. ── */
function Llama({ reducedMotion, perfil }) {
  const grupo = useRef(null);
  const bocas = useMemo(() => bocasLlama(), []);
  const geos = useMemo(() => LLAMA.capas.map((c) => llamaGeom(c)), []);
  const mats = useMemo(
    () =>
      LLAMA.capas.map(
        (c) =>
          new THREE.MeshBasicMaterial({
            color: c.color,
            transparent: true,
            opacity: c.opacidad,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );
  useLayoutEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
    [geos, mats],
  );

  useFrame((st) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    /* el pulso corto y parejo del gas bien regulado */
    const t = st.clock.elapsedTime;
    g.children.forEach((hijo, i) => {
      hijo.scale.y = 1 + Math.sin(t * 7 + i * 1.7) * 0.07;
    });
  });

  return (
    <group ref={grupo} position={[COCINA.pos[0], COCINA.alto, COCINA.pos[2]]}>
      {bocas.map((b, i) => (
        <group key={i} position={b}>
          {LLAMA.capas.map((c, j) => (
            <mesh key={j} geometry={geos[j]} material={mats[j]} />
          ))}
        </group>
      ))}
      {/* la luz de la llama sobre la olla: solo donde sobra GPU */}
      {perfil.luzBeacon && (
        <pointLight color={PALETA_ESTIERCOL.llama} intensity={0.5} distance={1.6} position={[0, 0.15, 0]} />
      )}
    </group>
  );
}

/* ── EL SELLO DE AGUA: la pieza de seguridad. La manguera muere bajo el agua
      del frasco; si la presión sube de más, el gas burbujea y se escapa por
      ahí en vez de reventar la manga. Barato y decisivo. ── */
function SelloDeAgua({ matVidrio, matAgua, reducedMotion }) {
  const burbuja = useRef(null);
  useFrame((st) => {
    const b = burbuja.current;
    if (!b) return;
    if (reducedMotion) {
      b.visible = true;
      b.position.y = VALVULA.aguaY - 0.04;
      return;
    }
    /* de vez en cuando escapa una: la manga está en su presión de trabajo */
    const t = (st.clock.elapsedTime * 0.5) % 1;
    b.visible = t > 0.6;
    b.position.y = VALVULA.aguaY - VALVULA.sumergido + (t - 0.6) * 0.4;
  });
  return (
    <group position={VALVULA.pos}>
      {/* el frasco */}
      <mesh material={matVidrio} position={[0, VALVULA.alto / 2, 0]}>
        <cylinderGeometry args={[VALVULA.radio, VALVULA.radio * 0.94, VALVULA.alto, 10, 1, true]} />
      </mesh>
      {/* el agua: lo que fija la presión máxima */}
      <mesh material={matAgua} position={[0, VALVULA.aguaY / 2, 0]}>
        <cylinderGeometry args={[VALVULA.radio * 0.93, VALVULA.radio * 0.9, VALVULA.aguaY, 10]} />
      </mesh>
      {/* la manguera sumergida: ESE es el sello */}
      <mesh position={[0, VALVULA.aguaY - VALVULA.sumergido / 2 + 0.16, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.32 + VALVULA.sumergido, 6]} />
        <meshBasicMaterial color={PALETA_ESTIERCOL.manguera} />
      </mesh>
      <mesh ref={burbuja}>
        <sphereGeometry args={[0.026, 6, 5]} />
        <meshBasicMaterial color={PALETA_ESTIERCOL.burbuja} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/**
 * El biodigestor completo.
 * @param {object} props
 * @param {object} props.perfil  perfilDeTier(tier)
 * @param {object} props.params  paramsDeTier(tier)
 * @param {'calido'|'frio'} [props.clima]  el régimen térmico (ver CLIMAS)
 * @param {boolean} [props.reducedMotion]
 */
export default function Biodigestor({ perfil, params, clima = 'frio', reducedMotion = false }) {
  const regimen = CLIMAS[clima] || CLIMAS.frio;

  /* ── materiales: todos por receta de la casa (GUIA.md §2) ── */
  const matTierra = useMemo(() => crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.tierraHonda, side: THREE.DoubleSide }), [perfil]);
  const matCama = useMemo(() => crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.carbono }), [perfil]);
  const matManga = useMemo(
    () =>
      crearMaterialMadre('lamina', perfil, {
        color: PALETA_ESTIERCOL.polietileno,
        side: THREE.DoubleSide, // se ve la cara de ADENTRO del plástico: media escena
        transparent: true,
        opacity: 0.55, // el polietileno es traslúcido: por eso se adivina el lodo
      }),
    [perfil],
  );
  const matParche = useMemo(() => crearMaterialMadre('lamina', perfil, { color: PALETA_ESTIERCOL.parche, side: THREE.DoubleSide }), [perfil]);
  const matLodo = useMemo(() => crearMaterialMadre('tierra', perfil, { color: PALETA_ESTIERCOL.lodo }), [perfil]);
  const matGas = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA_ESTIERCOL.gas, transparent: true, opacity: 0.16, depthWrite: false }),
    [],
  );
  const matTubo = useMemo(() => crearMaterialMadre('lamina', perfil, { color: PALETA_ESTIERCOL.polietilenoSol }), [perfil]);
  const matManguera = useMemo(() => crearMaterialMadre('lamina', perfil, { color: PALETA_ESTIERCOL.manguera }), [perfil]);
  const matBiol = useMemo(() => crearMaterialMadre('agua', perfil, { color: PALETA_ESTIERCOL.biol }), [perfil]);
  const matVidrio = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA_ESTIERCOL.gas, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    [],
  );
  const matPlastico = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA_ESTIERCOL.polietileno, transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false }),
    [],
  );
  const matMadera = useMemo(() => crearMaterialMadre('madera', perfil), [perfil]);
  const matAmarre = useMemo(() => crearMaterialMadre('lamina', perfil, { color: PALETA_ESTIERCOL.manguera }), [perfil]);

  useLayoutEffect(
    () => () =>
      [matTierra, matCama, matManga, matParche, matLodo, matGas, matTubo, matManguera, matBiol, matVidrio, matPlastico, matMadera, matAmarre].forEach(
        (m) => m.dispose(),
      ),
    [matTierra, matCama, matManga, matParche, matLodo, matGas, matTubo, matManguera, matBiol, matVidrio, matPlastico, matMadera, matAmarre],
  );

  /* ── geometrías: una vez por montaje ── */
  const gZanja = useMemo(() => zanjaGeom(), []);
  const gCama = useMemo(() => camaZanjaGeom(), []);
  const gManga = useMemo(() => mangaGeom({ seg: params.segRadial + 6 }), [params.segRadial]);
  const gLodo = useMemo(() => lodoGeom(), []);
  const gCampana = useMemo(() => campanaGeom(), []);
  const gParche = useMemo(() => parcheGeom(), []);
  const gCantos = useMemo(() => cantosManga(), []);
  const gAmarres = useMemo(() => amarresGeom(), []);
  const gInvernadero = useMemo(
    () => (params.invernadero && regimen.invernadero ? invernaderoGeom() : null),
    [params.invernadero, regimen.invernadero],
  );
  const { curva: curvaGas, trampa } = useMemo(() => recorridoGas(), []);
  const gManguera = useMemo(() => mangueraGeom(curvaGas, params), [curvaGas, params]);
  const gMangueraCocina = useMemo(() => mangueraGeom(recorridoCocina(), params), [params]);
  const datosBurbujas = useMemo(() => burbujas(params, regimen), [params, regimen]);

  useLayoutEffect(
    () => () =>
      [gZanja, gCama, gManga, gLodo, gCampana, gParche, gManguera, gMangueraCocina, gInvernadero]
        .filter(Boolean)
        .forEach((g) => g.dispose()),
    [gZanja, gCama, gManga, gLodo, gCampana, gParche, gManguera, gMangueraCocina, gInvernadero],
  );

  return (
    <group>
      {/* ── la zanja: cavada a pala, con su cama de arena para que un palo no
             le abra un hueco al polietileno ── */}
      <mesh geometry={gZanja} material={matTierra} receiveShadow={perfil.sombras} />
      <mesh geometry={gCama} material={matCama} />

      {/* ── el lodo y la campana: el corte real. El lodo llena ~3/4; el gas se
             junta en el cuarto de arriba. Sin aire: esto es anaerobio ── */}
      <mesh geometry={gLodo} material={matLodo} />
      <mesh geometry={gCampana} material={matGas} />
      <Burbujas datos={datosBurbujas} reducedMotion={reducedMotion} />

      {/* ── la manga, su parche (esto se pincha y se remienda) y el canto por
             donde pasó el serrucho ── */}
      <mesh geometry={gManga} material={matManga} castShadow={perfil.sombras} />
      <mesh geometry={gParche} material={matParche} />
      {gCantos.map(({ geo, y, key }) => (
        <mesh key={key} geometry={geo} material={matParche} position={[0, y, 0]} />
      ))}

      {/* ── los amarres de neumático: así se sella de verdad. El remate se ve ── */}
      {gAmarres.map((a, i) => (
        <mesh key={i} geometry={a.geo} material={matAmarre} position={a.pos} rotation={a.rot} />
      ))}

      {/* ── LA ENTRADA: se carga por gravedad, todos los días. Su boca muere
             BAJO el nivel del lodo: ese es el sello que no deja salir el gas ── */}
      <mesh
        material={matTubo}
        position={[ENTRADA.x - 0.25, (ENTRADA.topeY + ENTRADA.bocaY) / 2, -0.1]}
        rotation={[0, 0, ENTRADA.inclina]}
      >
        <cylinderGeometry args={[ENTRADA.radio, ENTRADA.radio, ENTRADA.topeY - ENTRADA.bocaY + 0.5, 8, 1, true]} />
      </mesh>
      {/* el balde de la carga diaria: el trabajo que esto cuesta, puesto ahí */}
      <mesh material={matTubo} position={[ENTRADA.x - 0.72, 0.14, 0.42]}>
        <cylinderGeometry args={[0.15, 0.12, 0.28, 8]} />
      </mesh>

      {/* ── LA SALIDA: su labio manda el nivel del lodo (vasos comunicantes).
             Por aquí rebosa el biol cada vez que se carga por el otro lado ── */}
      <mesh
        material={matTubo}
        position={[SALIDA.x + 0.22, (SALIDA.labioY + SALIDA.bocaY) / 2, -0.1]}
        rotation={[0, 0, -SALIDA.inclina]}
      >
        <cylinderGeometry args={[SALIDA.radio, SALIDA.radio, SALIDA.labioY - SALIDA.bocaY + 0.75, 8, 1, true]} />
      </mesh>
      {/* el biol asomando en el labio: el abono líquido saliendo hacia el cultivo */}
      <mesh material={matBiol} position={[SALIDA.x + 0.5, SALIDA.labioY - 0.02, 0.05]}>
        <cylinderGeometry args={[SALIDA.radio * 0.8, SALIDA.radio * 0.8, 0.04, 8]} />
      </mesh>

      {/* ── EL GAS: de la campana al frasco, pasando por la trampa de agua
             (el punto bajo donde se junta el condensado y se purga) ── */}
      <mesh material={matTubo} position={[TOMA_GAS.x, TOMA_GAS.y + 0.03, -0.02]}>
        <cylinderGeometry args={[TOMA_GAS.radio, TOMA_GAS.radio, 0.1, 6]} />
      </mesh>
      <mesh geometry={gManguera} material={matManguera} />
      <mesh material={matTubo} position={[trampa.x, trampa.y - 0.05, trampa.z]}>
        <cylinderGeometry args={[0.045, 0.045, 0.14, 6]} />
      </mesh>
      <SelloDeAgua matVidrio={matVidrio} matAgua={matBiol} reducedMotion={reducedMotion} />
      <mesh geometry={gMangueraCocina} material={matManguera} />

      {/* ── LA COCINA: ventilada, nunca en cuarto cerrado. La hornilla, la olla
             y la llama azul: la mierda de ayer cocinando el almuerzo de hoy ── */}
      <group position={COCINA.pos}>
        <mesh material={matMadera} position={[0, COCINA.alto / 2, 0]}>
          <boxGeometry args={[0.72, COCINA.alto, 0.6]} />
        </mesh>
        <mesh material={matTubo} position={[0, COCINA.alto + 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 10]} />
        </mesh>
        {/* la olla, encima de la llama */}
        <mesh material={matTubo} position={[0, COCINA.alto + 0.32, 0]}>
          <cylinderGeometry args={[0.22, 0.19, 0.24, 12, 1, true]} />
        </mesh>
      </group>
      <Llama reducedMotion={reducedMotion} perfil={perfil} />

      {/* ── EL INVERNADERO: solo en tierra fría. La respuesta del campo al
             páramo — ganarle unos grados a las bacterias. En caliente estorba ── */}
      {gInvernadero && <mesh geometry={gInvernadero} material={matPlastico} />}
    </group>
  );
}
