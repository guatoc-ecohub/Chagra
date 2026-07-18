/*
 * BosqueDensoValle — el MONTE GRANDE del valle (bosque de niebla andino).
 *
 * El operador calificó el bosque viejo "2/10 en parecerse a un árbol de verdad,
 * 0/10 en especie nativa" y "parece monocultivo". Este rediseño ataca las tres
 * cosas de RAÍZ, sin tocar las mallas por especie (que ya son buenas: tronco con
 * corteza horneada + copa-masa de hojas) — el problema era la COMPOSICIÓN:
 *
 *  1) ÁRBOL DE VERDAD: los árboles se sembraban a escala 0.3–0.6, así un roble de
 *     2.4 m quedaba como una bolita de ~1 m sin tronco visible → se leía arbusto.
 *     Ahora van a ESCALA DE ÁRBOL (el fuste se ve) y en TRES ESTRATOS de altura:
 *       · EMERGENTES  — yarumo blanco + aliso alto, asoman POR ENCIMA del dosel.
 *       · DOSEL       — roble andino (copa ancha) + encenillo (copa oscura de
 *                       niebla) + gaque (domo lustroso) — el cuerpo del monte.
 *       · SOTOBOSQUE  — mortiño (con bayas de agraz) + romerillo, entre troncos.
 *     Un bosque real tiene silueta escalonada; ya no es un césped de arbolitos.
 *
 *  2) ESPECIE NATIVA reconocible: cinco especies del bosque altoandino
 *     colombiano, cada una con su silueta inconfundible. El YARUMO plateado
 *     (Cecropia telealba), con su tronco pálido y su sombrilla de envés blanco,
 *     es la firma que dice "Andes colombianos" de un vistazo.
 *
 *  3) ANTI-MONOCULTIVO (regla dura): NINGÚN lote uniforme. Las cinco especies se
 *     entreveran en la misma ladera (mismo flujo de RNG → se intercalan, no van
 *     en manchas puras), con fuerte variación de altura/inclinación/tinte por
 *     instancia y unos pocos emergentes que rompen la línea del dosel. Nada lee
 *     como plantación.
 *
 * Presupuesto (DR §3, tier-safe):
 *  - UNA geometría por especie×banda LOD → InstancedMesh: ~12 draw calls de
 *    árboles/sotobosque por más de mil instancias que haya.
 *  - LOD estático por PROFUNDIDAD: la banda del fondo (z < Z_LOD) usa la
 *    geometría a media calidad — de lejos nadie cuenta polígonos.
 *  - Perspectiva aérea horneada por instancia (instanceColor): lo hondo del
 *    monte se enfría hacia el azul-niebla → profundidad sin fog extra.
 *  - Siembra DETERMINISTA (semilla fija): mismo monte en cada carga.
 *  - reducedMotion congela el vaho (queda presente, quieto); en tier bajo el
 *    vaho no existe y baja densidad/detalle de todo.
 *
 * Cableado (lo hace el host — este archivo NO toca la escena):
 *   <BosqueDensoValle alturaDe={alturaTerreno} tier={tier} reducedMotion={rm} />
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  geomRoble,
  geomAliso,
  geomGaque,
  geomEncenillo,
  geomYarumo,
  geomMortino,
  geomRomerillo,
} from '../../visual/mundo3d/bosque/floraParamo.geom.js';
import {
  rngDe,
  cajaDe,
  sembrarLote,
  tintarLote,
} from './siembraValle.js';
import { Banco } from './BancoValle.jsx';

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

/*
 * Presupuesto por tier: instancias por ESTRATO/especie (no draw-calls).
 *  - emergentes: yarumo (firma blanca) + aliso (alto).
 *  - dosel: roble (ancho) + encenillo (oscuro) + gaque (domo).
 *  - sotobosque: mortiño + romerillo.
 * Los emergentes son POCOS (asoman, no tapan); el dosel es el grueso.
 */
const CUPOS_TIER = {
  alto: {
    yarumo: 10, aliso: 22, roble: 34, encenillo: 30, gaque: 24,
    mortino: 380, romerillo: 330, vahos: 6, q: 1,
  },
  medio: {
    yarumo: 6, aliso: 13, roble: 21, encenillo: 18, gaque: 15,
    mortino: 200, romerillo: 170, vahos: 0, q: 0.62,
  },
  bajo: {
    yarumo: 3, aliso: 7, roble: 12, encenillo: 10, gaque: 8,
    mortino: 80, romerillo: 68, vahos: 0, q: 0.42,
  },
};

/*
 * Bandas de escala por ESTRATO (la altura real la da H de cada geom):
 *  - emergentes ~2.1–3.0 m (yarumo H3.4 / aliso H3.2) → asoman.
 *  - dosel ~1.2–1.8 m (roble H2.4 / encenillo H2.3).
 *  - domo ~0.9–1.2 m (gaque H1.9, copa baja).
 *  - sotobosque ~0.4–0.6 m.
 * `esp` = separación mínima entre matas del banco (respira el dosel).
 */
const ESTRATO = {
  emergente: { escMin: 0.62, escMax: 0.9, esp: 1.15, emergentes: 0, zLod: Z_LOD },
  dosel: { escMin: 0.5, escMax: 0.74, esp: 0.72, emergentes: 0.1, zLod: Z_LOD },
  domo: { escMin: 0.46, escMax: 0.64, esp: 0.68, emergentes: 0, zLod: Z_LOD },
  soto: { escMin: 0.34, escMax: 0.72, esp: 0, hundir: 0.02, zLod: Z_LOD },
};

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
    const sitios = sembrarLote(n, zona, claros, alturaDe, r, {
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
     Sotobosque: banda única (ya es low-poly). Cinco especies de árbol para
     que el monte sea multiespecie de verdad (anti-monocultivo). */
  const geos = useMemo(() => {
    const q = cupo.q;
    const qLejos = Math.max(0.3, q * 0.55);
    return {
      yarumo: geomYarumo({ q }, 401),
      yarumoLejos: geomYarumo({ q: qLejos }, 402),
      aliso: geomAliso({ q }, 413),
      alisoLejos: geomAliso({ q: qLejos }, 414),
      roble: geomRoble({ q }, 411),
      robleLejos: geomRoble({ q: qLejos }, 412),
      encenillo: geomEncenillo({ q }, 421),
      encenilloLejos: geomEncenillo({ q: qLejos }, 422),
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

  /* La siembra (una vez por tier/zona). Cada especie con su banda de ESCALA
     según el estrato (emergente/dosel/domo/soto) → silueta escalonada de bosque
     real. Un solo flujo de RNG entrevera las especies (no manchas puras).
     Partición cerca/fondo para el LOD. */
  const siembra = useMemo(() => {
    const r = rngDe(semilla);
    const caja = cajaDe(zona);
    const bancos = {
      // Emergentes: asoman por encima del dosel (yarumo blanco + aliso alto).
      yarumo: sembrarLote(cupo.yarumo, zona, claros, alturaDe, r, ESTRATO.emergente),
      aliso: sembrarLote(cupo.aliso, zona, claros, alturaDe, r, ESTRATO.emergente),
      // Dosel: el cuerpo del monte.
      roble: sembrarLote(cupo.roble, zona, claros, alturaDe, r, ESTRATO.dosel),
      encenillo: sembrarLote(cupo.encenillo, zona, claros, alturaDe, r, ESTRATO.dosel),
      gaque: sembrarLote(cupo.gaque, zona, claros, alturaDe, r, ESTRATO.domo),
      // Sotobosque: piso del monte.
      mortino: sembrarLote(cupo.mortino, zona, claros, alturaDe, r, ESTRATO.soto),
      romerillo: sembrarLote(cupo.romerillo, zona, claros, alturaDe, r, ESTRATO.soto),
    };
    const out = {};
    for (const [k, items] of Object.entries(bancos)) {
      tintarLote(items, r, nocturno, caja, { frio: 0.5 });
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

      {/* El dosel: roble ancho, encenillo oscuro, gaque en domo — mezclados. */}
      <Banco geo={geos.roble} mat={mat} items={siembra.roble} castShadow={sombra} />
      <Banco geo={geos.robleLejos} mat={mat} items={siembra.robleLejos} />
      <Banco geo={geos.encenillo} mat={mat} items={siembra.encenillo} castShadow={sombra} />
      <Banco geo={geos.encenilloLejos} mat={mat} items={siembra.encenilloLejos} />
      <Banco geo={geos.gaque} mat={mat} items={siembra.gaque} castShadow={sombra} />
      <Banco geo={geos.gaqueLejos} mat={mat} items={siembra.gaqueLejos} />

      {/* Los EMERGENTES: asoman por encima del dosel (silueta escalonada). El
          yarumo blanco es la firma andina; el aliso, el fuste alto y esbelto. */}
      <Banco geo={geos.aliso} mat={mat} items={siembra.aliso} castShadow={sombra} />
      <Banco geo={geos.alisoLejos} mat={mat} items={siembra.alisoLejos} />
      <Banco geo={geos.yarumo} mat={mat} items={siembra.yarumo} castShadow={sombra} />
      <Banco geo={geos.yarumoLejos} mat={mat} items={siembra.yarumoLejos} />

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
