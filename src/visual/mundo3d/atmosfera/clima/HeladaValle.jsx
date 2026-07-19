/*
 * HeladaValle — la HELADA con ESCARCHA REAL sobre el valle entero
 * (componente r3f montable). La alerta más seria del campesino de piso frío,
 * hecha visible: que al abrir la app en la madrugada del aviso se VEA el
 * hielo sobre su finca.
 *
 * EL FENÓMENO (agroclimático honesto): en noche DESPEJADA el suelo irradia su
 * calor al cielo abierto y se enfría por debajo del aire; el vapor se deposita
 * como escarcha. El aire frío, más denso, se EMPOZA en las hondonadas y en la
 * parte alta: por eso aquí la escarcha carga hacia el páramo (-z) y hacia la
 * hondonada del cauce — y por eso quema papa, haba y semillero al amanecer.
 * NO hay niebla: el cielo despejado es la condición.
 *
 * Capas (cada una UN draw call):
 *   1. MANTOS — discos blanco-azulados posados sobre el pasto y los cultivos
 *      de la parte alta/hondonada: el blanqueo de la escarcha. Se FORMAN en
 *      minutos de reloj comprimidos (`formacionSeg`): la helada cae, no aparece.
 *   2. CRISTALES — octaedros low-poly diminutos que crecen escalonados (la
 *      hondonada escarcha primero), con la vena azul emisiva del hielo.
 *   3. TECHOS (opcional, prop `techos`) — láminas de escarcha sobre los techos
 *      que el host señale: el tejado blanco del amanecer helado.
 *   4. DESTELLOS — la primera luz arranca titileos fríos a los cristales
 *      (tier alto/medio).
 *   5. VAHO — el aliento del ganado: resoplidos que suben y se deshacen sobre
 *      el potrero (aditivo, tier alto/medio). El frío se LEE en los animales.
 *   6. LUZ FRÍA (opcional) — un hemisferio azul pálido, tenue y estático, que
 *      enfría la escena sin tocar el rig del host (`luzFria={0}` lo apaga; el
 *      grade completo va mejor por CLIMAS.helada, ver reporte).
 *
 * CABLEO (para el host, sin tocar este archivo):
 *
 *   import { HeladaValle } from '../../visual/mundo3d/atmosfera/clima/HeladaValle.jsx';
 *   // dentro del <Canvas> (Valle3D: dentro de <Escena>), cuando la alerta
 *   // del día es helada Y la franja es noche/amanecer:
 *   {hayHelada && (clima === 'noche' || clima === 'amanecer') && (
 *     <HeladaValle
 *       alturaDe={alturaTerreno}
 *       tier={tier}
 *       reducedMotion={reducedMotion}
 *       intensidad={0.85}
 *     />
 *   )}
 *
 * REDUCED-MOTION: estado final directo (sin formación, sin titileo, sin vaho
 * — congelado en el aire lee como glitch). La escarcha SE VE completa.
 *
 * FRUGALIDAD: solo transform/opacity/color; Lambert flat + Basic; sin sombras
 * ni post-proceso. Draw calls: alto/medio 4 (+1 con `techos`), bajo 2.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  HELADA_TIER,
  PALETA_HELADA,
  azarClima,
  texturaHalo,
  suavizarClima,
  clamp01,
} from './climaVivoData.js';

const DUMMY = new THREE.Object3D();
const EULER = new THREE.Euler();

/* El potrero del hato (espejo de HatoMovil: centro [-5, 5.4], radio 2.1) —
   nacedero default del vaho del ganado. */
const CENTRO_HATO = [-5.0, 5.4];

/**
 * @param {object} p
 * @param {number}   [p.intensidad=0.85]  0..1 — escarcha leve → helada negra.
 * @param {'alto'|'medio'|'bajo'} [p.tier='medio']  de `decidirTier()`.
 * @param {boolean}  [p.reducedMotion=false]  estado final directo, sin vaho.
 * @param {(x:number,z:number)=>number} [p.alturaDe]  terreno del host; sin
 *                                       ella todo se posa en y=0.
 * @param {number}   [p.formacionSeg=6]  segundos del enfriamiento (la escarcha
 *                                       crece de la hondonada hacia afuera).
 * @param {Array<{pos:[number,number,number], tam:[number,number], rot?:[number,number,number]}>}
 *                   [p.techos=null]     láminas de escarcha sobre techos
 *                                       (+1 draw call). `pos` es el centro de
 *                                       la lámina, `tam` [ancho, fondo].
 * @param {Array<[number,number,number]>} [p.alientos=null]  bocas [x,y,z] del
 *                                       vaho; default: el potrero del hato.
 * @param {number}   [p.luzFria=0.45]    0..1 hemisferio azul tenue; 0 = no
 *                                       se monta (cero luces extra).
 * @param {number}   [p.semilla=23]      siembra determinista.
 */
export function HeladaValle({
  intensidad = 0.85,
  tier = 'medio',
  reducedMotion = false,
  alturaDe = null,
  formacionSeg = 6,
  techos = null,
  alientos = null,
  luzFria = 0.45,
  semilla = 23,
}) {
  const conf = HELADA_TIER[tier] || HELADA_TIER.medio;
  const inten = clamp01(intensidad);

  const mantoRef = useRef(null); // material compartido de los mantos
  const mantoInst = useRef(null);
  const cristRef = useRef(null);
  const techoRef = useRef(null); // material de las láminas de techo
  const techoInst = useRef(null);
  const chispaRef = useRef(null);
  const vahoRef = useRef(null);
  const progRef = useRef(reducedMotion ? 1 : 0);

  /* ── Siembra de MANTOS: 60% parte alta (z hacia el páramo), 40% hondonada
        del cauce (x≈0.6..2.6, z≈-3..1) — donde se empoza el aire frío. ── */
  const mantos = useMemo(() => {
    const rng = azarClima(semilla);
    const out = [];
    for (let i = 0; i < conf.mantos; i++) {
      const enAlta = rng() < 0.6;
      const x = enAlta ? -7 + rng() * 14 : 0.4 + rng() * 2.4;
      const z = enAlta ? -7.5 + rng() * 5.5 : -3 + rng() * 4;
      out.push({
        x,
        z,
        y: (alturaDe ? alturaDe(x, z) : 0) + 0.025,
        sx: 0.9 + rng() * 1.3,
        sz: 0.55 + rng() * 0.8,
        rot: rng() * Math.PI,
        /* La hondonada/parte alta blanquea primero. */
        retardo: 0.5 * rng() + 0.5 * clamp01((z + 7.5) / 9),
      });
    }
    return out;
  }, [conf.mantos, alturaDe, semilla]);

  /* ── CRISTALES: dos tercios agrupados sobre los mantos (la escarcha carga
        donde blanquea), un tercio regado por la zona fría. ── */
  const cristales = useMemo(() => {
    const rng = azarClima(semilla ^ 0x51f0a3);
    const out = [];
    for (let i = 0; i < conf.cristales; i++) {
      let x;
      let z;
      let retardoBase;
      if (mantos.length && rng() < 0.66) {
        const m = mantos[Math.floor(rng() * mantos.length)];
        x = m.x + (rng() - 0.5) * m.sx * 1.6;
        z = m.z + (rng() - 0.5) * m.sz * 1.6;
        retardoBase = m.retardo;
      } else {
        x = -7 + rng() * 14;
        z = -7.5 + rng() * 8.5;
        retardoBase = clamp01((z + 7.5) / 9);
      }
      out.push({
        x,
        z,
        y: alturaDe ? alturaDe(x, z) : 0,
        esc: (0.028 + rng() * 0.05) * (0.65 + 0.35 * inten),
        rx: rng() * Math.PI,
        ry: rng() * Math.PI,
        rz: rng() * Math.PI,
        retardo: Math.min(0.92, 0.45 * rng() + 0.5 * retardoBase),
      });
    }
    return out;
  }, [conf.cristales, mantos, alturaDe, inten, semilla]);

  /* ── DESTELLOS: sobre los cristales, con fase/velocidad para titilar. ── */
  const chispas = useMemo(() => {
    const n = conf.destellos;
    const rng = azarClima(semilla ^ 0x9e3779b9);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    const vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const c = cristales.length ? cristales[Math.floor(rng() * cristales.length)] : { x: 0, z: 0, y: 0 };
      pos[i * 3] = c.x + (rng() - 0.5) * 0.5;
      pos[i * 3 + 1] = c.y + 0.04 + rng() * 0.25;
      pos[i * 3 + 2] = c.z + (rng() - 0.5) * 0.5;
      fase[i] = rng() * Math.PI * 2;
      vel[i] = 1.6 + rng() * 2.8;
    }
    return { n, pos, col, fase, vel };
  }, [conf.destellos, cristales, semilla]);

  /* ── VAHO: bocas del ganado (default: el potrero del hato). ── */
  const bocas = useMemo(() => {
    if (alientos) return alientos;
    const rng = azarClima(semilla + 5);
    const out = [];
    for (let i = 0; i < conf.vahos; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = 0.6 + rng() * 1.2;
      const x = CENTRO_HATO[0] + Math.cos(ang) * rad;
      const z = CENTRO_HATO[1] + Math.sin(ang) * rad;
      out.push([x, (alturaDe ? alturaDe(x, z) : 0) + 0.55, z]);
    }
    return out;
  }, [alientos, conf.vahos, alturaDe, semilla]);

  const vaho = useMemo(() => {
    const porBoca = 3; // cada resoplido son 3 puffs desfasados
    const n = bocas.length * porBoca;
    const rng = azarClima(semilla + 11);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const meta = [];
    for (let i = 0; i < n; i++) {
      const [bx, by, bz] = bocas[Math.floor(i / porBoca)];
      meta.push({
        bx,
        by,
        bz,
        periodo: 2.8 + rng() * 1.4, // el ritmo del resuello
        fase: rng(),
        deriva: (rng() - 0.5) * 0.3,
      });
      pos[i * 3] = bx;
      pos[i * 3 + 1] = by;
      pos[i * 3 + 2] = bz;
    }
    return { n, pos, col, meta, tinta: new THREE.Color(PALETA_HELADA.vaho) };
  }, [bocas, semilla]);

  /* Pinta TODO el estado para un progreso dado — lo comparten el bucle vivo y
     el primer fotograma (reduced-motion / frameloop demand). */
  const pintar = useCallback(
    (prog, t) => {
      const rev = suavizarClima(prog);

      // 1) Mantos: opacidad global + crecen apenas al formarse.
      if (mantoRef.current) mantoRef.current.opacity = 0.3 * inten * rev;
      const mi = mantoInst.current;
      if (mi) {
        for (let i = 0; i < mantos.length; i++) {
          const m = mantos[i];
          const d = m.retardo * 0.55;
          const local = clamp01((prog - d) / (1 - d));
          const e = 0.82 + 0.18 * (1 - (1 - local) * (1 - local));
          DUMMY.position.set(m.x, m.y, m.z);
          DUMMY.rotation.set(-Math.PI / 2, 0, m.rot);
          DUMMY.scale.set(m.sx * e, m.sz * e, 1);
          DUMMY.updateMatrix();
          mi.setMatrixAt(i, DUMMY.matrix);
        }
        mi.instanceMatrix.needsUpdate = true;
      }

      // 2) Cristales: crecen escalonados de la hondonada hacia afuera.
      const ci = cristRef.current;
      if (ci) {
        for (let i = 0; i < cristales.length; i++) {
          const c = cristales[i];
          const d = c.retardo * 0.6;
          const local = clamp01((prog - d) / (1 - d));
          const e = 1 - (1 - local) * (1 - local);
          const s = Math.max(0.0001, c.esc * e);
          DUMMY.position.set(c.x, c.y + s * 0.6, c.z);
          DUMMY.rotation.set(c.rx, c.ry, c.rz);
          DUMMY.scale.setScalar(s);
          DUMMY.updateMatrix();
          ci.setMatrixAt(i, DUMMY.matrix);
        }
        ci.instanceMatrix.needsUpdate = true;
      }

      // 3) Techos: la lámina blanquea con el progreso.
      if (techoRef.current) techoRef.current.opacity = 0.42 * inten * rev;

      // 4) Destellos: se revelan y titilan desfasados (quietos en RM).
      const pts = chispaRef.current;
      if (pts && chispas.n) {
        const attr = pts.geometry.getAttribute('color');
        const [dr, dg, db] = PALETA_HELADA.destello;
        for (let i = 0; i < chispas.n; i++) {
          const tit = reducedMotion
            ? 0.65
            : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * chispas.vel[i] + chispas.fase[i]));
          const b = tit * rev * inten;
          attr.array[i * 3] = dr * b;
          attr.array[i * 3 + 1] = dg * b;
          attr.array[i * 3 + 2] = db * b;
        }
        attr.needsUpdate = true;
      }

      // 5) Vaho: cada puff nace en su boca, sube y se deshace (solo vivo).
      const vp = vahoRef.current;
      if (vp && vaho.n && !reducedMotion) {
        const geo = vp.geometry;
        const p = geo.attributes.position.array;
        const cc = geo.attributes.color.array;
        const { meta, tinta } = vaho;
        for (let i = 0; i < meta.length; i++) {
          const m = meta[i];
          const f = (t / m.periodo + m.fase) % 1;
          const sopla = clamp01(f / 0.55); // resopla, luego pausa
          p[i * 3] = m.bx + m.deriva * sopla;
          p[i * 3 + 1] = m.by + sopla * 0.5;
          p[i * 3 + 2] = m.bz;
          const b = Math.sin(Math.min(1, f / 0.55) * Math.PI) ** 2 * 0.55 * rev;
          cc[i * 3] = tinta.r * b;
          cc[i * 3 + 1] = tinta.g * b;
          cc[i * 3 + 2] = tinta.b * b;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
      }
    },
    [mantos, cristales, chispas, vaho, inten, reducedMotion],
  );

  /* Primer fotograma correcto (y estado final directo en reduced-motion). */
  useLayoutEffect(() => {
    progRef.current = reducedMotion ? 1 : 0;
    pintar(progRef.current, 0);
  }, [pintar, reducedMotion]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    if (progRef.current < 1) {
      progRef.current = Math.min(1, progRef.current + Math.min(delta, 0.1) / Math.max(0.5, formacionSeg));
    }
    pintar(progRef.current, state.clock.elapsedTime);
  });

  /* Techos: matrices fijas (solo la opacidad viaja con el progreso). */
  useLayoutEffect(() => {
    const ti = techoInst.current;
    if (!ti || !techos?.length) return;
    for (let i = 0; i < techos.length; i++) {
      const tch = techos[i];
      DUMMY.position.set(tch.pos[0], tch.pos[1], tch.pos[2]);
      EULER.set(...(tch.rot || [-Math.PI / 2, 0, 0]));
      DUMMY.rotation.copy(EULER);
      DUMMY.scale.set(tch.tam[0], tch.tam[1], 1);
      DUMMY.updateMatrix();
      ti.setMatrixAt(i, DUMMY.matrix);
    }
    ti.instanceMatrix.needsUpdate = true;
  }, [techos]);

  const tex = texturaHalo();
  return (
    <group>
      {/* 1. Mantos de escarcha sobre pasto y cultivo. */}
      <instancedMesh ref={mantoInst} args={[undefined, undefined, conf.mantos]} frustumCulled={false} renderOrder={4}>
        <circleGeometry args={[1, 22]} />
        <meshBasicMaterial
          ref={mantoRef}
          color={PALETA_HELADA.manto}
          transparent
          opacity={0}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </instancedMesh>

      {/* 2. Cristales de hielo low-poly. */}
      <instancedMesh ref={cristRef} args={[undefined, undefined, conf.cristales]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshLambertMaterial
          color={PALETA_HELADA.cristal}
          emissive={PALETA_HELADA.cristalEmisivo}
          emissiveIntensity={0.3}
          flatShading
        />
      </instancedMesh>

      {/* 3. Escarcha en techos (solo si el host los señala). */}
      {techos?.length > 0 && (
        <instancedMesh ref={techoInst} args={[undefined, undefined, techos.length]} frustumCulled={false} renderOrder={4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={techoRef}
            color={PALETA_HELADA.manto}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </instancedMesh>
      )}

      {/* 4. Destellos del alba. */}
      {chispas.n > 0 && (
        <points ref={chispaRef} renderOrder={5} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[chispas.pos, 3]} />
            <bufferAttribute attach="attributes-color" args={[chispas.col, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.11}
            map={tex || undefined}
            vertexColors
            transparent
            opacity={inten}
            depthWrite={false}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* 5. El aliento del ganado (solo vivo: congelado lee como glitch). */}
      {vaho.n > 0 && !reducedMotion && (
        <points ref={vahoRef} renderOrder={6} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[vaho.pos, 3]} />
            <bufferAttribute attach="attributes-color" args={[vaho.col, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.55}
            map={tex || undefined}
            vertexColors
            transparent
            opacity={1}
            depthWrite={false}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* 6. Luz fría opcional: hemisferio azul tenue, estático. */}
      {luzFria > 0 && (
        <hemisphereLight
          args={[PALETA_HELADA.luzCielo, PALETA_HELADA.luzSuelo, 0.5 * clamp01(luzFria)]}
        />
      )}
    </group>
  );
}

export default HeladaValle;
