/*
 * BosqueDensoValle — el MONTE GRANDE del valle (pedido del operador: "la
 * versión buena tenía bosque x3 más grande").
 *
 * La arboleda del portal 'disenio' son 5 árboles: un manchón. Esto es el
 * BOSQUE DE NIEBLA que abraza la finca: roble andino, aliso y gaque —las
 * MISMAS mallas por especie de floraParamo que ya usa el valle, para que
 * combine— sembrados por cientos ladera arriba, con sotobosque de mortiño y
 * romerillo entre los troncos y, en tier alto, un vaho tenue a la deriva.
 * Se lee "monte", no seis arbolitos.
 *
 * Presupuesto (DR §3, tier-safe):
 *  - UNA geometría por especie×banda → InstancedMesh: ≤12 draw calls de
 *    árboles/sotobosque por más de mil instancias que haya.
 *  - LOD estático por PROFUNDIDAD: la banda del fondo (z < Z_LOD) usa la
 *    geometría a media calidad — de lejos nadie cuenta polígonos.
 *  - Perspectiva aérea horneada por instancia (instanceColor): lo hondo del
 *    monte se enfría hacia el azul-niebla → profundidad sin fog extra.
 *  - Siembra DETERMINISTA (semilla fija): mismo monte en cada carga.
 *
 * Cableado (lo hace el host — este archivo NO toca la escena):
 *   <BosqueDensoValle alturaDe={alturaTerreno} tier={tier} reducedMotion={rm} />
 *
 * Props:
 *  - alturaDe(x,z): cota del terreno (obligatoria para posar; sin ella, y=0).
 *  - tier: 'alto'|'medio'|'bajo' → densidad + calidad + niebla (solo alto).
 *  - reducedMotion: congela el vaho (queda presente, quieto).
 *  - zona: parches elípticos [{cx,cz,rx,rz}] donde vive el monte. Default:
 *    la LADERA DERECHA del valle — el monte del portal 'disenio' (5.2,-3.4)
 *    espesado ladera arriba hacia la cordillera (x 3.5→13.5, z -9.5→-0.5),
 *    lejos de casa (-0.9,2.6), quebrada (x≈1.2) y del filo del páramo.
 *  - claros: [{x,z,r}] donde NO sembrar. Default: el patio del portal
 *    'disenio' — el bosque lo rodea, no se lo traga.
 *  - nocturno: enfría el tinte por instancia hacia el azul-luna del valle.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  geomRoble,
  geomAliso,
  geomGaque,
  geomMortino,
  geomRomerillo,
} from '../../visual/mundo3d/bosque/floraParamo.geom.js';

/* ── La zona por defecto: el monte de la ladera derecha. Dos parches
      solapados = silueta orgánica, no una elipse estampada. ── */
export const ZONA_BOSQUE_LADERA = [
  // El cuerpo del monte: ladera arriba del portal 'disenio', hacia el filo.
  { cx: 8.4, cz: -5.4, rx: 5.4, rz: 4.2 },
  // La falda: baja abrazando el portal sin llegar al cafetal (4.4, 1.0).
  { cx: 5.4, cz: -1.8, rx: 3.2, rz: 2.4 },
];

/* El claro del portal 'disenio' (5.2,-3.4): el bosque lo ENMARCA. */
export const CLAROS_BOSQUE = [{ x: 5.2, z: -3.4, r: 1.9 }];

/* Al fondo de esta z, banda LOD lejana (media calidad + tinte de niebla). */
const Z_LOD = -5.6;

/* Presupuesto por tier: [roble, aliso, gaque, mortiño, romerillo, vahos]. */
const CUPOS_TIER = {
  alto: { roble: 74, aliso: 64, gaque: 58, mortino: 430, romerillo: 380, vahos: 6, q: 1 },
  medio: { roble: 44, aliso: 38, gaque: 34, mortino: 220, romerillo: 190, vahos: 0, q: 0.62 },
  bajo: { roble: 24, aliso: 20, gaque: 18, mortino: 90, romerillo: 78, vahos: 0, q: 0.42 },
};

/* RNG determinista (mulberry32): mismo monte en cada carga. */
function rngDe(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ¿(x,z) cae dentro de algún parche? Devuelve 0..1: 1 en el núcleo, baja
   hacia 0 en el borde (borde SUAVE del monte: raleado, no muralla). */
function nucleoZona(x, z, zona) {
  let mejor = 0;
  for (let i = 0; i < zona.length; i++) {
    const p = zona[i];
    const dx = (x - p.cx) / p.rx;
    const dz = (z - p.cz) / p.rz;
    const d = dx * dx + dz * dz; // 0 centro → 1 borde elipse
    const n = 1 - THREE.MathUtils.smoothstep(d, 0.5, 1);
    if (n > mejor) mejor = n;
  }
  return mejor;
}

function enClaro(x, z, claros) {
  for (let i = 0; i < claros.length; i++) {
    const c = claros[i];
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < c.r * c.r) return true;
  }
  return false;
}

/* Caja envolvente de la zona (para el muestreo por rechazo). */
function cajaDe(zona) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const p of zona) {
    x0 = Math.min(x0, p.cx - p.rx);
    x1 = Math.max(x1, p.cx + p.rx);
    z0 = Math.min(z0, p.cz - p.rz);
    z1 = Math.max(z1, p.cz + p.rz);
  }
  return { x0, x1, z0, z1 };
}

/*
 * Siembra n matas en la zona (rechazo + borde suave + claros + espaciado).
 * Cada item: { pos:[x,y,z], rotY, escala, tint:[r,g,b], lejos }.
 *  - `esp`: distancia mínima entre matas del banco (0 = sin chequeo, sotobosque).
 *  - La escala CAE hacia el borde del monte (raleo natural) y unos pocos
 *    EMERGENTES superan el dosel (bosque real, no césped de árboles).
 */
function sembrarMonte(n, zona, claros, alturaDe, r, opts = {}) {
  const { escMin = 0.3, escMax = 0.58, esp = 0, hundir = 0.05, emergentes = 0 } = opts;
  const caja = cajaDe(zona);
  const items = [];
  const maxIntentos = n * 30;
  for (let i = 0; i < maxIntentos && items.length < n; i++) {
    const x = caja.x0 + r() * (caja.x1 - caja.x0);
    const z = caja.z0 + r() * (caja.z1 - caja.z0);
    const nucleo = nucleoZona(x, z, zona);
    if (nucleo <= 0.02 || r() > nucleo * 0.92 + 0.08) continue;
    if (enClaro(x, z, claros)) continue;
    if (esp > 0) {
      let choca = false;
      for (let j = 0; j < items.length; j++) {
        const dx = items[j].pos[0] - x;
        const dz = items[j].pos[2] - z;
        if (dx * dx + dz * dz < esp * esp) {
          choca = true;
          break;
        }
      }
      if (choca) continue;
    }
    // Escala: más chica hacia el borde (raleo) + variación individual.
    let escala = THREE.MathUtils.lerp(escMin, escMax, (0.35 + 0.65 * nucleo) * (0.55 + r() * 0.45));
    if (emergentes > 0 && r() < emergentes && nucleo > 0.6) escala *= 1.28; // el árbol viejo que asoma
    const y = (alturaDe ? alturaDe(x, z) : 0) - hundir * escala; // hundido un pelo: nada flota en la pendiente
    items.push({ pos: [x, y, z], rotY: r() * Math.PI * 2, escala, lejos: z < Z_LOD, tint: [1, 1, 1] });
  }
  return items;
}

/* Tinte por instancia: variación individual + PERSPECTIVA AÉREA (lo hondo
   del monte se enfría hacia el azul-niebla) + noche azul del valle. */
const _AZUL_NIEBLA = [0.78, 0.85, 1.0];
const _AZUL_NOCHE = [0.5, 0.62, 0.88];
function tintar(items, r, nocturno, caja) {
  const spanZ = Math.max(0.001, caja.z1 - caja.z0);
  for (const it of items) {
    const brillo = 0.86 + r() * 0.2; // cada mata con su verde, nada clonado
    // hondura 0 (falda, cerca de cámara) → 1 (fondo del monte).
    const hondura = THREE.MathUtils.clamp((caja.z1 - it.pos[2]) / spanZ, 0, 1);
    const frio = hondura * hondura * 0.5; // enfría de a poco, fuerte al fondo
    let tR = brillo * (1 - frio) + _AZUL_NIEBLA[0] * frio;
    let tG = brillo * (1 - frio) + _AZUL_NIEBLA[1] * frio;
    let tB = brillo * (1 - frio) + _AZUL_NIEBLA[2] * frio;
    if (nocturno) {
      tR *= _AZUL_NOCHE[0];
      tG *= _AZUL_NOCHE[1];
      tB *= _AZUL_NOCHE[2];
    }
    it.tint = [tR, tG, tB];
  }
  return items;
}

/* Un banco de UNA especie: una geometría, un material, N instancias
   (mismo patrón que FloraParamo.Especie — no está exportado allá). */
function Banco({ geo, mat, items, castShadow = false }) {
  const ref = useRef(null);
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
    <instancedMesh
      ref={ref}
      args={[geo, mat, items.length]}
      frustumCulled={false}
      castShadow={castShadow}
    />
  );
}

/* Textura radial del vaho, generada en runtime (cero assets externos). */
function texturaVaho() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(236,243,248,0.85)');
  g.addColorStop(0.55, 'rgba(228,238,246,0.3)');
  g.addColorStop(1, 'rgba(228,238,246,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* El vaho ENTRE los troncos: cartas billboard bajas que derivan despacio.
   Solo tier alto; con reducedMotion quedan quietas (presencia sin vaivén). */
function VahoEntreTroncos({ n, zona, claros, alturaDe, reducedMotion, semilla }) {
  const { camera } = useThree();
  const grupo = useRef(null);
  const tex = useMemo(() => texturaVaho(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      fog: false,
    }),
    [tex],
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(5.2, 1.9), []);
  const bancos = useMemo(() => {
    const r = rngDe(semilla);
    const sitios = sembrarMonte(n, zona, claros, alturaDe, r, {
      escMin: 1,
      escMax: 1,
      esp: 2.6,
      hundir: 0,
    });
    return sitios.map((s, i) => ({
      base: [s.pos[0], s.pos[1] + 1.05 + (i % 2) * 0.4, s.pos[2]],
      fase: i * 2.3,
      amp: 0.9 + (i % 3) * 0.5,
    }));
  }, [n, zona, claros, alturaDe, semilla]);

  useLayoutEffect(() => () => {
    tex.dispose();
    mat.dispose();
    geo.dispose();
  }, [tex, mat, geo]);

  useFrame((state) => {
    const g = grupo.current;
    if (!g) return;
    for (let i = 0; i < g.children.length; i++) {
      const carta = g.children[i];
      const b = bancos[i];
      if (!b) continue;
      if (!reducedMotion) {
        const t = state.clock.elapsedTime;
        carta.position.x = b.base[0] + Math.sin(t * 0.045 + b.fase) * b.amp;
        carta.position.y = b.base[1] + Math.sin(t * 0.07 + b.fase) * 0.12;
        carta.material.opacity = 0.1 + Math.sin(t * 0.09 + b.fase) * 0.04;
      }
      carta.quaternion.copy(camera.quaternion); // encara la cámara siempre
    }
  });

  if (!bancos.length) return null;
  return (
    <group ref={grupo}>
      {bancos.map((b, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={mat}
          position={/** @type {[number, number, number]} */ (b.base)}
        />
      ))}
    </group>
  );
}

/**
 * El bosque denso del valle. Montar dentro del <Canvas> del valle (lo cabla
 * el host). NO toca la escena: solo dibuja donde `zona` diga.
 *
 * @param {{
 *   alturaDe?: ((x:number, z:number) => number) | null,
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   zona?: Array<{cx:number, cz:number, rx:number, rz:number}>,
 *   claros?: Array<{x:number, z:number, r:number}>,
 *   nocturno?: boolean,
 *   semilla?: number,
 * }} props
 */
export default function BosqueDensoValle({
  alturaDe = null,
  tier = 'medio',
  reducedMotion = false,
  zona = ZONA_BOSQUE_LADERA,
  claros = CLAROS_BOSQUE,
  nocturno = false,
  semilla = 4113,
}) {
  const cupo = CUPOS_TIER[tier] || CUPOS_TIER.medio;

  /* Geometrías por especie ×2 bandas LOD (cerca=q del tier, fondo=media q).
     Sotobosque: solo banda única (ya es low-poly). */
  const geos = useMemo(() => {
    const q = cupo.q;
    const qLejos = Math.max(0.3, q * 0.55);
    return {
      roble: geomRoble({ q }, 411),
      robleLejos: geomRoble({ q: qLejos }, 412),
      aliso: geomAliso({ q }, 413),
      alisoLejos: geomAliso({ q: qLejos }, 414),
      gaque: geomGaque({ q }, 415),
      gaqueLejos: geomGaque({ q: qLejos }, 416),
      mortino: geomMortino({ q: qLejos }, 417),
      romerillo: geomRomerillo({ q: qLejos }, 418),
    };
  }, [cupo.q]);

  /* El MISMO material de la arboleda del valle (Lambert + vertexColors +
     flatShading): el monte combina, no desentona. Uno para todos los bancos. */
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );

  /* La siembra (una vez por tier/zona): árboles con espaciado (dosel que
     respira), sotobosque regado entre los troncos, todo tintado con
     perspectiva aérea. Partición cerca/fondo para el LOD. */
  const siembra = useMemo(() => {
    const r = rngDe(semilla);
    const caja = cajaDe(zona);
    const arbol = { escMin: 0.3, escMax: 0.6, esp: 0.62, emergentes: 0.07 };
    const soto = { escMin: 0.34, escMax: 0.7, esp: 0, hundir: 0.02 };
    const bancos = {
      roble: sembrarMonte(cupo.roble, zona, claros, alturaDe, r, arbol),
      aliso: sembrarMonte(cupo.aliso, zona, claros, alturaDe, r, arbol),
      gaque: sembrarMonte(cupo.gaque, zona, claros, alturaDe, r, { ...arbol, escMax: 0.52 }),
      mortino: sembrarMonte(cupo.mortino, zona, claros, alturaDe, r, soto),
      romerillo: sembrarMonte(cupo.romerillo, zona, claros, alturaDe, r, soto),
    };
    const out = {};
    for (const [k, items] of Object.entries(bancos)) {
      tintar(items, r, nocturno, caja);
      out[k] = items.filter((it) => !it.lejos);
      out[`${k}Lejos`] = items.filter((it) => it.lejos);
    }
    return out;
  }, [cupo, zona, claros, alturaDe, nocturno, semilla]);

  /* Liberar GPU al desmontar. */
  useLayoutEffect(() => () => {
    Object.values(geos).forEach((g) => g && g.dispose());
    mat.dispose();
  }, [geos, mat]);

  const sombra = tier === 'alto'; // solo la banda cercana y solo en alto

  return (
    <group>
      {/* Sotobosque: el piso del monte, sin sombra (es relleno de cerca). */}
      <Banco geo={geos.mortino} mat={mat} items={siembra.mortino} />
      <Banco geo={geos.mortino} mat={mat} items={siembra.mortinoLejos} />
      <Banco geo={geos.romerillo} mat={mat} items={siembra.romerillo} />
      <Banco geo={geos.romerillo} mat={mat} items={siembra.romerilloLejos} />

      {/* El dosel: roble ancho, aliso cónico, gaque en domo — mezclados. */}
      <Banco geo={geos.roble} mat={mat} items={siembra.roble} castShadow={sombra} />
      <Banco geo={geos.robleLejos} mat={mat} items={siembra.robleLejos} />
      <Banco geo={geos.aliso} mat={mat} items={siembra.aliso} castShadow={sombra} />
      <Banco geo={geos.alisoLejos} mat={mat} items={siembra.alisoLejos} />
      <Banco geo={geos.gaque} mat={mat} items={siembra.gaque} castShadow={sombra} />
      <Banco geo={geos.gaqueLejos} mat={mat} items={siembra.gaqueLejos} />

      {/* El vaho del bosque de niebla, entre los troncos (solo tier alto). */}
      {cupo.vahos > 0 && (
        <VahoEntreTroncos
          n={cupo.vahos}
          zona={zona}
          claros={claros}
          alturaDe={alturaDe}
          reducedMotion={reducedMotion}
          semilla={semilla + 77}
        />
      )}
    </group>
  );
}
