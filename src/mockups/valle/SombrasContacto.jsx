/*
 * SombrasContacto — el ANCLAJE al suelo de cada landmark del valle.
 *
 * Sin sombra de contacto, la casa, los árboles y los hitos FLOTAN: el ojo
 * no encuentra dónde tocan tierra y el valle se lee plano. Esta capa pinta
 * bajo cada objeto una sombra suave, elíptica, más densa en el centro y
 * desvanecida al borde — el "peso" que planta cada cosa en su loma y separa
 * la profundidad (el mismo truco de todo diorama: la oclusión ambiental de
 * la base, no la sombra proyectada del sol).
 *
 * PRESUPUESTO (Android barato): CERO render extra por frame.
 *   · UNA textura de gradiente radial pre-horneada en canvas (128px, una vez
 *     por sesión) compartida por TODAS las sombras;
 *   · DOS InstancedMesh (capa fuerte: casa + landmarks; capa leve: matas y
 *     vecinos) = 2 draw calls, materiales basic (la sombra no se ilumina);
 *   · nada de drei <ContactShadows> (eso re-renderiza la escena aparte).
 *
 * Cada sombra se INCLINA a la normal del terreno (gradiente numérico de
 * alturaDe) para posarse en la ladera en vez de enterrarse en ella, y de
 * noche se ATENÚA pero no desaparece: la luna también ancla.
 *
 * Mismo contrato que composicionValle3D: recibe `alturaDe(x, z)` del host,
 * no importa Valle3D (sin ciclos).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CREATURES } from '../../visual/creatures/index.js';
import { CASA_VALLE, VECINOS_VALLE } from '../../visual/mundo3d/direccion/composicionValle.js';
import { VEGETACION_PISOS } from './valleData';

/* ── La textura de la sombra: UN gradiente radial alpha, horneado una vez ──
   Denso al centro, respiro a media falda y desvanecido total al borde: la
   curva de una oclusión ambiental, no un círculo duro. */
let _texturaSombra = null;

function texturaSombra() {
  if (_texturaSombra) return _texturaSombra;
  if (typeof document === 'undefined') return null; // SSR/test: sin canvas
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(8, 6, 4, 0.92)');
  g.addColorStop(0.38, 'rgba(8, 6, 4, 0.55)');
  g.addColorStop(0.72, 'rgba(8, 6, 4, 0.18)');
  g.addColorStop(1, 'rgba(8, 6, 4, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  _texturaSombra = new THREE.CanvasTexture(cv);
  return _texturaSombra;
}

/* ── La HUELLA de cada tipo de landmark: [rx, rz] en unidades locales ──────
   (× escala del mundo). Una casa proyecta más que una mata: el corral y el
   mercado pisan ancho; la veleta es un poste y apenas marca su pie. */
const HUELLAS = {
  milpa: [0.85, 0.72],
  cafetal: [0.95, 0.78],
  era: [0.92, 0.78],
  quebrada: [0.8, 0.8],
  animales: [1.05, 0.85],
  huerta: [0.85, 0.72],
  mercado: [0.95, 0.8],
  veleta: [0.4, 0.4],
  semillero: [0.78, 0.85],
  hongos: [0.8, 0.75],
};
const HUELLA_DEFECTO = [0.8, 0.7];

/* El bosque no es UNA mancha: cada árbol (roble, aliso, gaque — offsets de
   SITIOS_ARBOLEDA en Valle3D) planta SU propia sombra bajo su copa. */
const ARBOLES_BOSQUE = [
  { dx: -0.55, dz: 0.15, r: 0.62 }, // roble: copa ancha
  { dx: 0.45, dz: -0.35, r: 0.52 }, // aliso: cónico
  { dx: 0.2, dz: 0.55, r: 0.58 }, // gaque: domo bajo
];

/* Las matas sueltas de los pisos térmicos: sombra leve según su porte. */
const HUELLA_MATA = { frailejon: 0.38, papa: 0.4, cafe: 0.36, platano: 0.55 };

/* ── El posado de las instancias: cada sombra inclinada a la normal local ──
   Gradiente numérico con paso ancho (0.35): promedia la loma bajo TODA la
   huella, no el granito de la ondulación. Scratch compartido, cero alocación
   dentro del bucle. */
const _dummy = new THREE.Object3D();
const _normal = new THREE.Vector3();
const _giro = new THREE.Quaternion();
const EJE_Z = new THREE.Vector3(0, 0, 1);

function posarSombras(mesh, sombras, alturaDe) {
  if (!mesh) return;
  const e = 0.35;
  sombras.forEach((s, i) => {
    const dx = (alturaDe(s.x + e, s.z) - alturaDe(s.x - e, s.z)) / (2 * e);
    const dz = (alturaDe(s.x, s.z + e) - alturaDe(s.x, s.z - e)) / (2 * e);
    _normal.set(-dx, 1, -dz).normalize();
    _dummy.position.set(s.x, alturaDe(s.x, s.z) + 0.075, s.z);
    // El círculo mira +z: llevar su cara a la normal del terreno…
    _dummy.quaternion.setFromUnitVectors(EJE_Z, _normal);
    // …y girar la elipse EN su plano (la casa está rotada en el valle).
    if (s.rot) {
      _giro.setFromAxisAngle(EJE_Z, s.rot);
      _dummy.quaternion.multiply(_giro);
    }
    _dummy.scale.set(s.rx, s.rz, 1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Las sombras de contacto del valle: una capa, dos draw calls.
 * @param {{
 *   mundos: Array<{ id: string, pos: number[], escala?: number, tipo?: string }>,
 *   alturaDe: (x: number, z: number) => number,
 *   nocturno?: boolean,
 *   franja?: string | null,
 * }} props — `franja` decide qué vecinos están afuera (misma ley que
 *   VecinosDelValle: sin sombra huérfana de un bicho que no salió).
 */
export default function SombrasContacto({ mundos, alturaDe, nocturno = false, franja = null }) {
  const fuerteRef = useRef(null);
  const leveRef = useRef(null);
  const mapa = useMemo(() => texturaSombra(), []);

  const { fuertes, leves } = useMemo(() => {
    /** @type {Array<{x:number,z:number,rx:number,rz:number,rot?:number}>} */
    const fuertes = [];
    // La casa-ancla: la sombra más grande del valle (y girada con ella).
    const [cx, cz] = CASA_VALLE.pos;
    fuertes.push({ x: cx, z: cz, rx: 1.25, rz: 0.95, rot: CASA_VALLE.rotY });
    for (const m of mundos) {
      const esc = m.escala || 1;
      const [mx, , mz] = /** @type {[number, number, number]} */ (m.pos);
      if (m.tipo === 'bosque') {
        for (const a of ARBOLES_BOSQUE) {
          fuertes.push({ x: mx + a.dx * esc, z: mz + a.dz * esc, rx: a.r * esc, rz: a.r * esc });
        }
      } else {
        const [hx, hz] = HUELLAS[m.tipo] || HUELLA_DEFECTO;
        fuertes.push({ x: mx, z: mz, rx: hx * esc, rz: hz * esc });
      }
    }
    /** @type {Array<{x:number,z:number,rx:number,rz:number}>} */
    const leves = [];
    for (const v of VEGETACION_PISOS) {
      const r = HUELLA_MATA[v.tipo] || 0.45;
      leves.push({ x: v.pos[0], z: v.pos[1], rx: r, rz: r * 0.9 });
    }
    for (const vec of VECINOS_VALLE) {
      if (!CREATURES[vec.slug]?.Component) continue; // sin bicho, sin sombra
      if (vec.franjas && franja && !vec.franjas.includes(franja)) continue;
      if ((vec.dy ?? 0.3) >= 1) continue; // vive en las ramas: no pisa el suelo
      const r = Math.min(0.55, vec.px / 85);
      leves.push({ x: vec.punto[0], z: vec.punto[1], rx: r, rz: r * 0.8 });
    }
    return { fuertes, leves };
  }, [mundos, franja]);

  useLayoutEffect(() => {
    posarSombras(fuerteRef.current, fuertes, alturaDe);
    posarSombras(leveRef.current, leves, alturaDe);
  }, [fuertes, leves, alturaDe]);

  if (!mapa) return null;
  // De noche la sombra se ATENÚA (la luz es plana y azul) pero NUNCA se va:
  // el anclaje es de todas las horas. renderOrder 2: pinta ENCIMA de los
  // patios de tierra (que también van sin depthWrite).
  return (
    <group>
      <instancedMesh
        key={`f${fuertes.length}`}
        ref={fuerteRef}
        args={[undefined, undefined, fuertes.length]}
        frustumCulled={false}
        renderOrder={2}
      >
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial map={mapa} transparent opacity={nocturno ? 0.26 : 0.44} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        key={`l${leves.length}`}
        ref={leveRef}
        args={[undefined, undefined, leves.length]}
        frustumCulled={false}
        renderOrder={2}
      >
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial map={mapa} transparent opacity={nocturno ? 0.15 : 0.26} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
