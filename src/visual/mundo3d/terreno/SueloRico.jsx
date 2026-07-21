/*
 * SueloRico — el componente r3f del suelo calibre Switch.
 *
 * Monta la malla del terreno (geomSueloRico) + el detalle cercano instanciado
 * (piedras, matas de paja, raíces, florecitas — 1 draw-call por tipo) + las
 * sombras de contacto que anclan cada detalle al piso (misma técnica del valle:
 * UNA textura radial de canvas + UN InstancedMesh de círculos inclinados a la
 * normal del terreno — cero costo por frame).
 *
 * Contrato: la escena crea el suelo con `crearSueloRico(...)` (useMemo), le
 * pasa el objeto aquí Y reparte `suelo.alturaDe` a todo lo demás que siembre.
 * Las `anclas` extra (árboles, casas) reciben su sombra de contacto aquí mismo.
 *
 * Tier-safe vía perfilDeTier: segmentos/material/sombras/conteos por gama.
 * Montar SOLO dentro de un <Canvas> (lazy desde el host).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  geomSueloRico,
  geomPiedraSuelo,
  geomMataPaja,
  geomRaizSuelo,
  geomFlorecitas,
  geomLajasSendero,
  distribuirDetalle,
  detalleDeTier,
} from './sueloRico.geom.js';

/* Un banco de detalle: una geometría, un material, N instancias (patrón Especie). */
export function Instancias({ geo, mat, items, castShadow = false }) {
  const ref = useRef(/** @type {THREE.InstancedMesh|null} */ (null));

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(0, it.rotY, 0);
      q.setFromEuler(e);
      s.setScalar(it.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);

  if (!geo || !items.length) return null;
  return (
    <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} castShadow={castShadow} />
  );
}

/* Textura radial compartida para las sombras de contacto (una por sesión). */
let _texturaSombra = null;
function texturaSombra() {
  if (_texturaSombra) return _texturaSombra;
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(10, 9, 6, 0.85)');
  g.addColorStop(0.4, 'rgba(10, 9, 6, 0.5)');
  g.addColorStop(0.75, 'rgba(10, 9, 6, 0.16)');
  g.addColorStop(1, 'rgba(10, 9, 6, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _texturaSombra = new THREE.CanvasTexture(cv);
  return _texturaSombra;
}

const _EJE_Z = new THREE.Vector3(0, 0, 1);

/*
 * Sombras de contacto: un InstancedMesh de círculos con gradiente radial,
 * posados sobre el terreno e inclinados a su normal (gradiente numérico de
 * alturaDe). Anclan piedras, matas y las anclas que pase la escena.
 */
function SombrasContactoSuelo({ suelo, puntos, opacidad = 0.32 }) {
  const ref = useRef(/** @type {THREE.InstancedMesh|null} */ (null));
  const tex = useMemo(() => texturaSombra(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !puntos.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const e = 0.35;
    for (let i = 0; i < puntos.length; i++) {
      const pt = puntos[i];
      const dx = (suelo.alturaDe(pt.x + e, pt.z) - suelo.alturaDe(pt.x - e, pt.z)) / (2 * e);
      const dz = (suelo.alturaDe(pt.x, pt.z + e) - suelo.alturaDe(pt.x, pt.z - e)) / (2 * e);
      normal.set(-dx, 1, -dz).normalize();
      p.set(pt.x, suelo.alturaDe(pt.x, pt.z) + 0.045, pt.z);
      q.setFromUnitVectors(_EJE_Z, normal);
      s.setScalar(pt.radio);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [suelo, puntos]);

  if (!puntos.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, puntos.length]} frustumCulled={false} renderOrder={2}>
      <circleGeometry args={[1, 20]} />
      <meshBasicMaterial map={tex} transparent opacity={opacidad} depthWrite={false} />
    </instancedMesh>
  );
}

/**
 * El suelo rico completo: malla + detalle + sombras de contacto.
 * @param {{
 *   suelo: import('./sueloRico.geom.js').SueloRico,
 *   tier?: 'alto'|'medio'|'bajo',
 *   anclas?: Array<{x:number, z:number, radio:number}>,  — sombras extra de la escena (árboles…)
 *   detalle?: Partial<ReturnType<typeof detalleDeTier>>, — override de conteos
 *   rMaxDetalle?: number,
 *   segmentos?: number, — override de la resolución de la malla (default: perfil del tier)
 * }} props
 */
export default function SueloRico({ suelo, tier = 'alto', anclas = [], detalle, rMaxDetalle, segmentos }) {
  const perfil = perfilDeTier(tier);
  const segs = segmentos ?? perfil.segmentosTerreno;

  const geoSuelo = useMemo(() => geomSueloRico(suelo, { segmentos: segs }), [suelo, segs]);

  const geos = useMemo(() => {
    const seed = suelo.opts.seed;
    return {
      piedra: geomPiedraSuelo(seed + 101, suelo.opts.paleta),
      mata: geomMataPaja(seed + 202, suelo.opts.paleta),
      raiz: geomRaizSuelo(seed + 303, suelo.opts.paleta),
      flor: geomFlorecitas(seed + 404, suelo.opts.paleta),
      lajas: geomLajasSendero(suelo),
    };
  }, [suelo]);

  const conteos = useMemo(() => ({ ...detalleDeTier(tier), ...(detalle || {}) }), [tier, detalle]);

  const dist = useMemo(() => {
    const seed = suelo.opts.seed;
    const rMax = rMaxDetalle ?? suelo.opts.tam * 0.36;
    return {
      // piedras: prefieren el terreno quebrado (pendiente) y respetan el trillo
      piedra: distribuirDetalle(suelo, conteos.piedras, {
        seed: seed + 11, rMax, evitaSendero: 0.9, hundir: 0.05, eMin: 0.6, eMax: 1.6,
      }),
      // matas de paja: por todas partes menos el trillo y la roca parada
      mata: distribuirDetalle(suelo, conteos.matas, {
        seed: seed + 22, rMax, evitaSendero: 1.1, pendienteMax: 0.6, hundir: 0.02, eMin: 0.7, eMax: 1.45, varia: 0.16,
      }),
      // raíces: cerca del claro (donde viven los árboles héroe)
      raiz: distribuirDetalle(suelo, conteos.raices, {
        seed: seed + 33, rMin: suelo.opts.claro ? suelo.opts.claro.radio * 0.8 : 2,
        rMax: Math.min(rMax, (suelo.opts.claro ? suelo.opts.claro.radio : 3) + 5),
        evitaSendero: 1.0, pendienteMax: 0.5, hundir: 0, eMin: 0.8, eMax: 1.3,
      }),
      // florecitas: en lo amable, lejos del trillo
      flor: distribuirDetalle(suelo, conteos.flores, {
        seed: seed + 44, rMax: rMax * 0.8, evitaSendero: 1.3, pendienteMax: 0.45, hundir: 0.01, eMin: 0.8, eMax: 1.35, varia: 0.2,
      }),
    };
  }, [suelo, conteos, rMaxDetalle]);

  // sombras de contacto: piedras + anclas de la escena. Las matas NO llevan
  // (su base horneada en sombra ya las ancla; círculos de más = manchones).
  // Con shadow-map real (tier alto) el círculo es refuerzo suave, no doble sombra.
  const sombras = useMemo(() => {
    if (!perfil.sombrasContacto) return [];
    const pts = [];
    for (const it of dist.piedra) pts.push({ x: it.pos[0], z: it.pos[2], radio: 0.42 * it.escala });
    for (const a of anclas) pts.push({ x: a.x, z: a.z, radio: a.radio });
    return pts;
  }, [perfil.sombrasContacto, dist, anclas]);

  const matSuelo = useMemo(() => {
    const base = { vertexColors: true };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, flatShading: perfil.flatShading, roughness: 1, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const matDetalle = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.95, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  useLayoutEffect(() => () => {
    geoSuelo.dispose();
    Object.values(geos).forEach((g) => g && g.dispose());
    matSuelo.dispose();
    matDetalle.dispose();
  }, [geoSuelo, geos, matSuelo, matDetalle]);

  return (
    <group>
      <mesh geometry={geoSuelo} material={matSuelo} receiveShadow={perfil.sombras} />
      {geos.lajas && <mesh geometry={geos.lajas} material={matDetalle} />}
      <Instancias geo={geos.piedra} mat={matDetalle} items={dist.piedra} castShadow={perfil.sombras} />
      <Instancias geo={geos.mata} mat={matDetalle} items={dist.mata} />
      <Instancias geo={geos.raiz} mat={matDetalle} items={dist.raiz} />
      <Instancias geo={geos.flor} mat={matDetalle} items={dist.flor} />
      {sombras.length > 0 && (
        <SombrasContactoSuelo suelo={suelo} puntos={sombras} opacidad={perfil.sombras ? 0.22 : 0.3} />
      )}
    </group>
  );
}
