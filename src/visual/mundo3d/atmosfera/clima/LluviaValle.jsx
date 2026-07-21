/*
 * LluviaValle — el AGUACERO ANDINO sobre el valle (componente r3f montable).
 *
 * Cuatro capas, cada una un solo draw call:
 *   1. GOTAS — un THREE.Points con textura de trazo vertical: la veta que cae.
 *      Caen de verdad (velocidad propia por gota, deriva de viento) y renacen
 *      arriba al tocar su suelo (el terreno real si el host presta `alturaDe`).
 *   2. SALPICADURAS — un InstancedMesh de anillos aditivos que nacen, crecen y
 *      se apagan escalonados sobre charcos, camino y la quebrada (ondas).
 *   3. CHARCOS — un InstancedMesh de discos que reflejan el cielo cargado,
 *      empozados en la tierra baja del valle. Respiran apenas (opacidad).
 *   4. NUBARRONES — un THREE.Points de panzas oscuras que derivan lento sobre
 *      el valle: el cielo cargado con volumen, no solo el tinte del preset.
 *   (5. GOTEO DE COPAS — opcional: si el host pasa `copas`, gotas gordas y
 *      lentas que el dosel suelta después del aguacero. Los árboles escurren.)
 *
 * CABLEO (para el host, sin tocar este archivo):
 *
 *   import { LluviaValle } from '../../visual/mundo3d/atmosfera/clima/LluviaValle.jsx';
 *   // dentro del <Canvas>, junto al terreno (Valle3D: dentro de <Escena>):
 *   {c.lluviaViva && (
 *     <LluviaValle
 *       alturaDe={alturaTerreno}
 *       tier={tier}
 *       reducedMotion={reducedMotion}
 *       nocturno={clima === 'noche'}
 *     />
 *   )}
 *
 *   - `alturaDe(x, z) → y` es la función de terreno del host: con ella las
 *     gotas mueren en su loma y charcos/ondas se POSAN. Sin ella, todo se
 *     posa en y=0 (sirve para escenas planas).
 *   - `cauce` (lista [x,z]) pone ondas sobre la quebrada; el default espeja
 *     la de Valle3D.
 *
 * REDUCED-MOTION: las gotas y el goteo NO montan (lluvia congelada en el aire
 * lee como glitch); quedan charcos, nubarrones quietos y anillos estáticos
 * tenues — el valle SE VE llovido sin que nada se mueva.
 *
 * FRUGALIDAD: buffers mutados in-place en useFrame (cero asignaciones por
 * frame); presupuestos por tier en climaVivoData. Draw calls: alto/medio 4
 * (+1 con `copas`), bajo 2 (gotas + charcos).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  LLUVIA_TIER,
  PALETA_LLUVIA,
  CAUCE_QUEBRADA,
  puntosSobreCauce,
  azarClima,
  texturaHalo,
  texturaTrazo,
  clamp01,
} from './climaVivoData.js';

const DUMMY = new THREE.Object3D();
const TINTA = new THREE.Color();

/* Caja default de las gotas: cubre el corazón del valle (terreno 34×34, la
   cámara vive mirando ±9). Referencia ESTABLE de módulo (no re-siembra). */
const AREA_LLUVIA = [18, 9, 16];

/* ------------------------------------------------------------------ *
 * Gotas — un Points en caja [ax, ay, az], con suelo real por columna.
 * ------------------------------------------------------------------ */
function Gotas({ n, area, alturaDe, viento, intensidad, semilla }) {
  const ref = useRef(null);
  const datos = useMemo(() => {
    const rng = azarClima(semilla);
    const [ax, ay, az] = area;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    const piso = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      pos[j] = (rng() - 0.5) * ax;
      pos[j + 1] = rng() * ay;
      pos[j + 2] = (rng() - 0.5) * az;
      vel[i] = 0.75 + rng() * 0.5;
      piso[i] = alturaDe ? alturaDe(pos[j], pos[j + 2]) : 0;
    }
    return { pos, vel, piso };
  }, [n, area, alturaDe, semilla]);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    const dt = Math.min(delta, 0.1); // pestaña dormida: sin saltos gigantes
    const [ax, ay, az] = area;
    const p = ref.current.geometry.attributes.position.array;
    const { vel, piso } = datos;
    const caida = (6.5 + 4.5 * intensidad) * dt;
    const deriva = viento * dt;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      p[j] += deriva * vel[i];
      p[j + 1] -= caida * vel[i];
      if (p[j] > ax / 2) p[j] -= ax;
      if (p[j + 1] < piso[i]) {
        // Renace arriba, en columna fresca; su suelo se recalcula UNA vez.
        p[j + 1] += ay;
        p[j + 2] = (Math.abs(Math.sin(i * 12.9898 + p[j])) % 1 - 0.5) * az;
        piso[i] = alturaDe ? alturaDe(p[j], p[j + 2]) : 0;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false} renderOrder={6}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texturaTrazo() || undefined}
        color={PALETA_LLUVIA.gota}
        size={0.3}
        transparent
        opacity={0.42 + 0.2 * intensidad}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------ *
 * Salpicaduras — anillos aditivos instanciados que ciclan escalonados
 * sobre charcos, camino y quebrada. El fade viaja en instanceColor
 * (aditivo: negro = invisible), así UN material sirve para todos.
 * ------------------------------------------------------------------ */
function Salpicaduras({ n, puntos, reducedMotion, intensidad }) {
  const ref = useRef(null);
  const ciclo = useMemo(() => {
    const rng = azarClima(97);
    return Array.from({ length: n }, (_, i) => ({
      p: puntos[i % puntos.length],
      periodo: 0.7 + rng() * 0.8,
      fase: rng(),
      esc: 0.75 + rng() * 0.7,
    }));
  }, [n, puntos]);

  const pintar = (t) => {
    const inst = ref.current;
    if (!inst) return;
    for (let i = 0; i < ciclo.length; i++) {
      const c = ciclo[i];
      const f = reducedMotion ? 0.35 : (t / c.periodo + c.fase) % 1;
      const s = (0.14 + 0.6 * f) * c.esc;
      DUMMY.position.set(c.p[0], c.p[1], c.p[2]);
      DUMMY.rotation.set(-Math.PI / 2, 0, 0);
      DUMMY.scale.setScalar(s);
      DUMMY.updateMatrix();
      inst.setMatrixAt(i, DUMMY.matrix);
      const b = (1 - f) * (1 - f) * (0.5 + 0.5 * intensidad) * (reducedMotion ? 0.5 : 1);
      TINTA.set(PALETA_LLUVIA.salpicadura).multiplyScalar(b);
      inst.setColorAt(i, TINTA);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  };

  /* Primer fotograma correcto aun sin bucle (reduced-motion). */
  useLayoutEffect(() => {
    pintar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciclo, reducedMotion]);
  useFrame(({ clock }) => {
    if (!reducedMotion) pintar(clock.elapsedTime);
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false} renderOrder={5}>
      <ringGeometry args={[0.42, 0.55, 12]} />
      <meshBasicMaterial
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ *
 * Charcos — discos quietos que reflejan el cielo plomo. Respiran apenas.
 * ------------------------------------------------------------------ */
function Charcos({ puntos, reducedMotion, nocturno, intensidad }) {
  const mat = useRef(null);
  const base = 0.3 + 0.18 * intensidad;
  useFrame(({ clock }) => {
    if (reducedMotion || !mat.current) return;
    mat.current.opacity = base + Math.sin(clock.elapsedTime * 1.7) * 0.035;
  });
  const inst = useRef(null);
  useLayoutEffect(() => {
    const m = inst.current;
    if (!m) return;
    const rng = azarClima(41);
    for (let i = 0; i < puntos.length; i++) {
      const [x, y, z] = puntos[i];
      DUMMY.position.set(x, y, z);
      DUMMY.rotation.set(-Math.PI / 2, 0, rng() * Math.PI);
      DUMMY.scale.set(0.5 + rng() * 0.55, 0.3 + rng() * 0.3, 1);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [puntos]);
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, puntos.length]} frustumCulled={false} renderOrder={4}>
      <circleGeometry args={[1, 18]} />
      <meshBasicMaterial
        ref={mat}
        color={nocturno ? PALETA_LLUVIA.charcoNoche : PALETA_LLUVIA.charco}
        transparent
        opacity={base}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ *
 * Nubarrones — panzas oscuras que derivan lento sobre el valle.
 * ------------------------------------------------------------------ */
function Nubarrones({ n, reducedMotion, semilla }) {
  const ref = useRef(null);
  const datos = useMemo(() => {
    const rng = azarClima(semilla + 71);
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      pos[j] = (rng() - 0.5) * 22;
      pos[j + 1] = 8.6 + rng() * 2.4;
      pos[j + 2] = (rng() - 0.5) * 18;
      vel[i] = 0.12 + rng() * 0.14;
    }
    return { pos, vel };
  }, [n, semilla]);
  useFrame((_s, delta) => {
    if (reducedMotion || !ref.current) return;
    const dt = Math.min(delta, 0.1);
    const p = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      p[j] += datos.vel[i] * dt;
      if (p[j] > 11) p[j] -= 22;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false} renderOrder={3}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texturaHalo() || undefined}
        color={PALETA_LLUVIA.nube}
        size={7.5}
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------ *
 * Goteo de copas — el dosel escurre (opcional, host pasa `copas`).
 * ------------------------------------------------------------------ */
function GoteoCopas({ copas, alturaDe, semilla }) {
  const ref = useRef(null);
  const n = copas.length * 2;
  const datos = useMemo(() => {
    const rng = azarClima(semilla + 133);
    const pos = new Float32Array(n * 3);
    const meta = [];
    for (let i = 0; i < n; i++) {
      const [cx, cy, cz] = copas[i % copas.length];
      const x = cx + (rng() - 0.5) * 0.5;
      const z = cz + (rng() - 0.5) * 0.5;
      meta.push({
        x,
        z,
        techo: cy,
        piso: alturaDe ? alturaDe(x, z) : 0,
        vel: 1.6 + rng() * 1.2,
        fase: rng(),
      });
      pos[i * 3] = x;
      pos[i * 3 + 1] = cy;
      pos[i * 3 + 2] = z;
    }
    return { pos, meta };
  }, [copas, n, alturaDe, semilla]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const p = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < datos.meta.length; i++) {
      const m = datos.meta[i];
      const f = (t * m.vel * 0.35 + m.fase) % 1;
      p[i * 3 + 1] = m.techo + (m.piso - m.techo) * f * f; // acelera al caer
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false} renderOrder={6}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texturaHalo() || undefined}
        color={PALETA_LLUVIA.gota}
        size={0.14}
        transparent
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * El aguacero completo del valle.
 *
 * @param {object} p
 * @param {number}   [p.intensidad=1]   0..1 — llovizna → aguacero (velocidad,
 *                                      opacidad y brillo de ondas).
 * @param {'alto'|'medio'|'bajo'} [p.tier='medio']  de `decidirTier()`.
 * @param {boolean}  [p.reducedMotion=false]  sin gotas ni goteo; charcos,
 *                                      nubes y anillos quietos.
 * @param {(x:number,z:number)=>number} [p.alturaDe]  terreno del host; sin
 *                                      ella todo se posa en y=0.
 * @param {[number,number,number]} [p.area=[18,9,16]]  caja de las gotas
 *                                      [ancho, alto, fondo] centrada en el 0.
 * @param {number}   [p.viento=0.4]     deriva lateral de la caída (u/s).
 * @param {boolean}  [p.nubes=true]     nubarrones (solo tier alto/medio).
 * @param {boolean}  [p.charcos=true]   charcos y sus ondas.
 * @param {Array<[number,number]>} [p.cauce=CAUCE_QUEBRADA]  quebrada del host
 *                                      (ondas sobre el agua); null = sin ondas
 *                                      de cauce.
 * @param {Array<[number,number,number]>} [p.copas=null]  puntos [x,y,z] de
 *                                      dosel que escurre (opcional, +1 draw).
 * @param {boolean}  [p.nocturno=false] charcos con espejo de luna.
 * @param {number}   [p.semilla=13]     siembra determinista.
 */
export function LluviaValle({
  intensidad = 1,
  tier = 'medio',
  reducedMotion = false,
  alturaDe = null,
  area = AREA_LLUVIA,
  viento = 0.4,
  nubes = true,
  charcos = true,
  cauce = CAUCE_QUEBRADA,
  copas = null,
  nocturno = false,
  semilla = 13,
}) {
  const conf = LLUVIA_TIER[tier] || LLUVIA_TIER.medio;
  const inten = clamp01(intensidad);

  /* Siembra de charcos (tierra baja, z 2..7) y de puntos de onda: 40% sobre
     charcos, 30% sobre el cauce (y del lomo del agua), 30% camino abierto. */
  const siembra = useMemo(() => {
    const rng = azarClima(semilla + 7);
    const ptsCharcos = [];
    for (let i = 0; i < conf.charcos; i++) {
      const x = -4.5 + rng() * 8.5;
      const z = 2.2 + rng() * 4.6;
      ptsCharcos.push([x, (alturaDe ? alturaDe(x, z) : 0) + 0.015, z]);
    }
    const ondas = [];
    const nOndas = Math.max(conf.salpicaduras, 1);
    const enCauce = cauce ? puntosSobreCauce(cauce, Math.ceil(nOndas * 0.3), rng, 0.35) : [];
    for (const [x, z] of enCauce) {
      ondas.push([x, (alturaDe ? alturaDe(x, z) : 0) + 0.42, z]); // lomo del agua
    }
    while (ondas.length < nOndas) {
      const base = ptsCharcos.length && rng() < 0.57
        ? ptsCharcos[Math.floor(rng() * ptsCharcos.length)]
        : null;
      const x = base ? base[0] + (rng() - 0.5) * 0.6 : -5 + rng() * 10;
      const z = base ? base[2] + (rng() - 0.5) * 0.4 : -1 + rng() * 8;
      ondas.push([x, (alturaDe ? alturaDe(x, z) : 0) + 0.03, z]);
    }
    return { ptsCharcos, ondas };
  }, [conf.charcos, conf.salpicaduras, cauce, alturaDe, semilla]);

  const claveGotas = `${conf.gotas}:${semilla}:${area.join(',')}`;
  return (
    <group>
      {!reducedMotion && conf.gotas > 0 && (
        <Gotas
          key={claveGotas}
          n={conf.gotas}
          area={area}
          alturaDe={alturaDe}
          viento={viento}
          intensidad={inten}
          semilla={semilla}
        />
      )}
      {charcos && conf.salpicaduras > 0 && (
        <Salpicaduras
          n={conf.salpicaduras}
          puntos={siembra.ondas}
          reducedMotion={reducedMotion}
          intensidad={inten}
        />
      )}
      {charcos && conf.charcos > 0 && (
        <Charcos
          puntos={siembra.ptsCharcos}
          reducedMotion={reducedMotion}
          nocturno={nocturno}
          intensidad={inten}
        />
      )}
      {nubes && conf.nubes > 0 && (
        <Nubarrones n={conf.nubes} reducedMotion={reducedMotion} semilla={semilla} />
      )}
      {!reducedMotion && copas && copas.length > 0 && (
        <GoteoCopas copas={copas} alturaDe={alturaDe} semilla={semilla} />
      )}
    </group>
  );
}

export default LluviaValle;
