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
  sembrarArboleda,
  sembrarSotobosque,
  tintarLote,
} from './siembraValle.js';
import { Banco } from './BancoValle.jsx';
import AuditoriaValle from './AuditoriaValle.jsx';

/* ── La zona por defecto: el monte de la ladera derecha. Dos parches
      solapados = silueta orgánica, no una elipse estampada. ── */
const ZONA_BOSQUE_LADERA = [
  // El cuerpo del monte: ladera arriba del portal 'disenio', hacia el filo.
  { cx: 8.4, cz: -5.4, rx: 5.4, rz: 4.2 },
  // La falda: baja abrazando el portal sin llegar al cafetal (4.4, 1.0).
  { cx: 5.4, cz: -1.8, rx: 3.2, rz: 2.4 },
  // El hombro alto: el monte sigue ladera arriba hacia el filo nororiental
  // (área de núcleo para los rodales, sin pisar el frailejonal de arriba).
  { cx: 11.6, cz: -8.2, rx: 2.8, rz: 2.2 },
  // La rodada oriental: el monte cierra el marco a la derecha (el borde que
  // en el cuadro base ya era masa — ahora con estructura, no pared).
  { cx: 14.2, cz: -4.6, rx: 2.4, rz: 3.4 },
];

/* Los CLAROS del monte (auditoría §5.1: tres tipos de vacío que se lean desde
   la cámara de reposo). El bosque los ENMARCA; en sus bordes se concentra la
   pionera (yarumo) y la regeneración del sotobosque libre. */
const CLAROS_BOSQUE = [
  { x: 5.2, z: -3.4, r: 1.9 }, // el portal 'disenio' (claro de MANEJO)
  { x: 9.7, z: -2.9, r: 1.5 }, // claro de manejo de media ladera
  { x: 3.1, z: -1.0, r: 1.2 }, // corredor RIPARIO: el bosque abre hacia la quebrada
  { x: 6.4, z: -7.0, r: 1.3 }, // borde de REGENERACIÓN alto (luz para el renoval)
];

/* La FRANJA RIPARIA del aliso: la orilla este de la quebrada, donde vive el
   aliso andino de verdad (Alnus acuminata es el árbol de las quiebras). Es el
   corredor ripario que pide la auditoría: une el bosque con el agua. */
const ZONA_RIPARIA = [{ cx: 0.9, cz: -2.0, rx: 1.5, rz: 3.6 }];

/* Al fondo de esta z, banda LOD lejana (media calidad + tinte de niebla). */
const Z_LOD = -5.6;

/*
 * Presupuesto por tier: instancias por especie (no draw-calls).
 * Rediseño ecológico 2026-07-20 (auditoría §5.1): el bosque baja de 836
 * instancias a ~340 (−59%) — la masa ya no se hace con densidad ciega sino
 * con estructura: emergentes que asoman, dosel en rodales, sotobosque bajo
 * copa y claros con borde.
 */
const CUPOS_TIER = {
  alto: {
    yarumo: 10, aliso: 12, roble: 17, encenillo: 16, gaque: 10,
    mortino: 185, romerillo: 165, vahos: 6, q: 1,
  },
  medio: {
    yarumo: 7, aliso: 8, roble: 12, encenillo: 11, gaque: 7,
    mortino: 118, romerillo: 104, vahos: 0, q: 0.62,
  },
  bajo: {
    yarumo: 4, aliso: 5, roble: 7, encenillo: 6, gaque: 4,
    mortino: 60, romerillo: 54, vahos: 0, q: 0.42,
  },
};

/*
 * Bandas de escala por especie + su NICHO ecológico y la DISTANCIA MÍNIMA por
 * porte (`esp`, 1 u = 1 m — la escena comprime la finca a diorama: los radios
 * guardan la jerarquía del monte real, no sus metros absolutos):
 *  - yarumo   EMERGENTE 1.6 m — pionera de bordes y claros en regeneración:
 *              luz a mansalva, nunca en el núcleo sombrío (Cecropia real).
 *  - aliso    EMERGENTE 1.5 m — RIPARIO: la franja del cauce (Alnus acuminata
 *              es el aliso de las quiebras andinas).
 *  - roble    DOSEL 1.4 m     — núcleo maduro, en RODALES (las copas se
 *              rozando forman el dosel cerrado con individuos legibles).
 *  - encenillo DOSEL 1.3 m   — núcleo sombrío de niebla, en rodales.
 *  - gaque    MEDIO 1.15 m   — domo del borde interior.
 *  - sotobosque 0.45 m       — mortiño/romerillo: matorral (la mata sí crece
 *              pegada a su vecina), agrupado BAJO las copas.
 * La altura real la da H de cada geom (siluetas intactas: no se toca especie).
 */
const ESTRATO = {
  yarumo: {
    escMin: 0.62, escMax: 0.9, esp: 1.4, zLod: Z_LOD,
    nicho: [0.10, 0.72], bordeClaro: 0.35, bordeLibre: true,
  },
  aliso: {
    escMin: 0.62, escMax: 0.9, esp: 1.3, zLod: Z_LOD,
    zona: ZONA_RIPARIA, nicho: [0.08, 1.0],
    agua: { radio: 2.4, peso: 0.55, minDist: 0.55 },
  },
  roble: {
    escMin: 0.5, escMax: 0.74, esp: 1.35, zLod: Z_LOD,
    nicho: [0.36, 1.0], rodales: 3, emergentes: 0.1,
  },
  encenillo: {
    escMin: 0.5, escMax: 0.74, esp: 1.3, zLod: Z_LOD,
    nicho: [0.38, 1.0], rodales: 2,
  },
  gaque: {
    escMin: 0.46, escMax: 0.64, esp: 1.15, zLod: Z_LOD,
    nicho: [0.22, 0.95], bordeClaro: 0.3,
  },
  soto: { escMin: 0.34, escMax: 0.72, esp: 0.42, hundir: 0.02, zLod: Z_LOD },
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

  /* La siembra ECOLÓGICA (auditoría §5.1): la arboleda crece por NICHO en un
     solo padrón de espaciado global (radio por porte) — yarumo pionero al
     borde, aliso junto al cauce, roble/encenillo en rodales de núcleo, gaque
     al borde interior — y el sotobosque se agrupa BAJO las copas (con una
     fracción libre en claros y bordes: la regeneración). Un solo flujo de RNG
     (determinista). Partición cerca/fondo para el LOD. */
  const siembra = useMemo(() => {
    const r = rngDe(semilla);
    const caja = cajaDe(zona);
    const arboleda = sembrarArboleda(
      [
        // Primero el DOSEL maduro (define la estructura); luego los emergentes.
        { clave: 'roble', n: cupo.roble, ...ESTRATO.roble },
        { clave: 'encenillo', n: cupo.encenillo, ...ESTRATO.encenillo },
        { clave: 'gaque', n: cupo.gaque, ...ESTRATO.gaque },
        { clave: 'aliso', n: cupo.aliso, ...ESTRATO.aliso },
        { clave: 'yarumo', n: cupo.yarumo, ...ESTRATO.yarumo },
      ],
      zona,
      claros,
      alturaDe,
      r,
    );
    const dosel = Object.values(arboleda).flat();
    const soto = sembrarSotobosque(
      [
        { clave: 'mortino', n: cupo.mortino, ...ESTRATO.soto },
        { clave: 'romerillo', n: cupo.romerillo, ...ESTRATO.soto },
      ],
      dosel,
      zona,
      claros,
      alturaDe,
      r,
      { fraccionLibre: 0.3, radioCopa: [0.7, 1.9] },
    );
    const out = {};
    for (const [k, items] of Object.entries({ ...arboleda, ...soto })) {
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
    <group name="audit-bosque-denso">
      {/* La escucha de diagnóstico (dormida sin ?auditar=1): vive aquí porque
          el bosque siempre está montado en la escena del valle. */}
      <AuditoriaValle />
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
