/*
 * FloraParamo — el ECOSISTEMA de páramo que rodea al Ent de la queñua.
 *
 * Una CAPA de flora altoandina colombiana sembrada alrededor del guardián (que
 * sigue siendo EL árbol mayor y el foco): el frailejonar al frente, el sotobosque
 * de mortiño y romerillo, las rocas con líquen y el musgo del suelo, y —velados
 * por la niebla, en el anillo exterior— los árboles del bosque de niebla: roble
 * andino, aliso, encenillo, gaque y el yarumo plateado/blanco de envés blanco.
 * Así el claro se lee como un páramo VIVO y el Ent RESALTA como el más grande.
 *
 * Tier-safe (DR §3): cada especie es UN InstancedMesh de una geometría fusionada
 * → una draw-call por especie por más matas que haya. La flora es PAISAJE: monta
 * quieta (el foco animado es el Ent). Solo en 'alto' se añade un vaho a la deriva.
 * Todo procedural: cero CDN/imágenes externas (la niebla usa una CanvasTexture
 * generada en runtime).
 *
 * Componente r3f: montar dentro del <Canvas> de EscenaBosqueVivo.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  floraDeTier,
  calidadDeTier,
  distribucionFlora,
  geomFrailejon,
  geomCampesinoEscala,
  geomYarumo,
  geomRoble,
  geomEncenillo,
  geomAliso,
  geomGaque,
  geomMortino,
  geomRomerillo,
  geomRoca,
  geomMusgo,
} from './floraParamo.geom.js';

/* Un banco de matas de UNA especie: una geometría, un material, N instancias. */
function Especie({ geo, mat, items, castShadow = false }) {
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
      // tiltX/tiltZ: ladeo por instancia (frailejonar) — cada mata cabecea
      // distinto para que la colonia no se lea clonada. Pivote en la base.
      e.set(it.tiltX || 0, it.rotY, it.tiltZ || 0);
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

/* Textura suave (radial) para el vaho, generada en runtime (sin assets). */
function texturaVaho() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(240,246,246,0.35)');
  g.addColorStop(1, 'rgba(240,246,246,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/*
 * Niebla rasante: unas pocas cartas de vaho que flotan entre los árboles y se
 * mueven despacio (viento del páramo). Barato: MeshBasic con textura procedural,
 * sin escribir profundidad. Solo en 'alto'; con reducedMotion quedan quietas.
 */
function NieblaRasante({ n, reducedMotion }) {
  const { camera } = useThree();
  const grupo = useRef(null);
  const tex = useMemo(() => texturaVaho(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      fog: false,
    }),
    [tex],
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(7.5, 3.2), []);
  const bancos = useMemo(() => {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + i * 1.3;
      const rad = 7 + (i % 3) * 1.8;
      arr.push({
        base: [Math.cos(ang) * rad, 1.1 + (i % 2) * 0.5, Math.sin(ang) * rad],
        fase: i * 2.1,
        amp: 1.2 + (i % 3) * 0.6,
      });
    }
    return arr;
  }, [n]);

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
      if (!reducedMotion) {
        const t = state.clock.elapsedTime;
        carta.position.x = b.base[0] + Math.sin(t * 0.05 + b.fase) * b.amp;
        carta.position.y = b.base[1] + Math.sin(t * 0.08 + b.fase) * 0.15;
        carta.material.opacity = 0.12 + Math.sin(t * 0.1 + b.fase) * 0.05;
      }
      // Encaran a la cámara (cartas de vaho): se leen desde cualquier ángulo.
      carta.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={grupo}>
      {bancos.map((b, i) => (
        <mesh key={i} geometry={geo} material={mat} position={/** @type {[number, number, number]} */ (b.base)} />
      ))}
    </group>
  );
}

/*
 * FiguraEscala — el campesino de referencia al pie del frailejonal héroe. Se
 * planta en el PRIMER PLANO del lado de la cámara en reposo (dirección al Ent),
 * posado sobre el relieve, mirando hacia el claro (contempla el frailejonal, de
 * espaldas a la cámara: la silueta pequeña que revela la escala del gigante).
 */
const FIGURA_POS = [3.9, 0, 5.7]; // radio ~6.9 hacia la cámara de reposo
function FiguraEscala({ mat, alturaDe }) {
  const geo = useMemo(() => geomCampesinoEscala(44), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const y = alturaDe ? alturaDe(FIGURA_POS[0], FIGURA_POS[2]) : 0;
  // Mira hacia el centro del claro (el frailejonal / el Ent).
  const rotY = Math.atan2(-FIGURA_POS[0], -FIGURA_POS[2]);
  return (
    <mesh
      geometry={geo}
      material={mat}
      position={[FIGURA_POS[0], y, FIGURA_POS[2]]}
      rotation={[0, rotY, 0]}
      castShadow
    />
  );
}

/**
 * La capa de flora del páramo alrededor del Ent. Montar dentro del <Canvas>.
 * `alturaDe(x,z)` (opcional) POSA cada mata sobre el relieve del terreno:
 * sin ella la siembra queda en y=0 (el claro plano de siempre).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, alturaDe?: ((x:number,z:number)=>number)|null}} props
 */
export default function FloraParamo({ tier = 'alto', reducedMotion = false, alturaDe = null }) {
  const perfil = perfilDeTier(tier);
  const conteos = floraDeTier(tier);
  const q = calidadDeTier(tier);

  // --- Geometrías fusionadas (una vez por tier). Solo lo que tenga matas. ---
  // El frailejón viene en TRES edades (silueta distinta, no solo escala): joven
  // casi al ras, adulto de columna media, viejo de hábito alto. Cada edad es su
  // banco → el frailejonal se lee como un paisaje con gradiente de edad.
  const geos = useMemo(() => {
    const g = {};
    // El HÉROE del páramo: adulto pleno f3 — enagua larga + roseta plateada + flor.
    // La banda héroe lo instancia grande y cerca (frailejonHero) para que imponga.
    if (conteos.frailejonHero) g.frailejonHero = geomFrailejon({ flor: true, q, edad: 0.98 }, 91);
    if (conteos.frailejonJoven) g.frailejonJoven = geomFrailejon({ flor: false, q, edad: 0.26 }, 21);
    if (conteos.frailejon) g.frailejon = geomFrailejon({ flor: false, q, edad: 0.62 }, 1);
    if (conteos.frailejonViejo) g.frailejonViejo = geomFrailejon({ flor: false, q, edad: 0.95 }, 37);
    if (conteos.frailejonFlor) g.frailejonFlor = geomFrailejon({ flor: true, q, edad: 0.78 }, 2);
    if (conteos.yarumo) g.yarumo = geomYarumo({ q }, 3);
    if (conteos.roble) g.roble = geomRoble({ q }, 4);
    if (conteos.encenillo) g.encenillo = geomEncenillo({ q }, 5);
    if (conteos.aliso) g.aliso = geomAliso({ q }, 6);
    if (conteos.gaque) g.gaque = geomGaque({ q }, 7);
    if (conteos.mortino) g.mortino = geomMortino({ q }, 8);
    if (conteos.romerillo) g.romerillo = geomRomerillo({ q }, 9);
    if (conteos.roca) g.roca = geomRoca(10);
    if (conteos.musgo) g.musgo = geomMusgo(11);
    return g;
  }, [conteos, q]);

  // --- Material único con vertexColors (cada geometría trae su color horneado). ---
  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0.0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  // --- Distribución biogeográfica (una vez por tier), posada en el relieve. ---
  const dist = useMemo(() => {
    const d = distribucionFlora(conteos, 707);
    if (!alturaDe) return d;
    const posar = (items) => items.map((it) => ({
      ...it,
      pos: [it.pos[0], alturaDe(it.pos[0], it.pos[2]) + (it.pos[1] || 0), it.pos[2]],
    }));
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, posar(v)]));
  }, [conteos, alturaDe]);

  // Liberar GPU al desmontar.
  useLayoutEffect(() => () => {
    Object.values(geos).forEach((gg) => gg && gg.dispose());
    mat.dispose();
  }, [geos, mat]);

  const sombra = perfil.sombras; // solo los árboles proyectan sombra en 'alto'

  return (
    <group>
      {/* Suelo del páramo: rocas con líquen + musgo. */}
      <Especie geo={geos.roca} mat={mat} items={dist.roca} />
      <Especie geo={geos.musgo} mat={mat} items={dist.musgo} />

      {/* Sotobosque: romerillo y mortiño (con sus bayas de agraz). */}
      <Especie geo={geos.romerillo} mat={mat} items={dist.romerillo} />
      <Especie geo={geos.mortino} mat={mat} items={dist.mortino} />

      {/* Frailejonar: el ícono del páramo, al frente — la banda HÉROE (adultos f3
          grandes y cercanos que IMPONEN en primer plano) + tres EDADES
          entremezcladas (joven al ras, adulto, viejo de columna alta) + los que
          florecen. El frailejón vuelve a ser el protagonista visible del páramo. */}
      <Especie geo={geos.frailejonHero} mat={mat} items={dist.frailejonHero} castShadow={sombra} />
      <Especie geo={geos.frailejonJoven} mat={mat} items={dist.frailejonJoven} />
      <Especie geo={geos.frailejon} mat={mat} items={dist.frailejon} />
      <Especie geo={geos.frailejonViejo} mat={mat} items={dist.frailejonViejo} />
      <Especie geo={geos.frailejonFlor} mat={mat} items={dist.frailejonFlor} />

      {/* La VARA DE MEDIR: un campesino pequeño al pie del frailejonal héroe.
          Sin él, el ojo no sabe que el frailejón mide 3-4 m (lente Colossus). */}
      <FiguraEscala mat={mat} alturaDe={alturaDe} />

      {/* Árboles de fondo (anillo exterior, velados por la niebla). */}
      <Especie geo={geos.gaque} mat={mat} items={dist.gaque} castShadow={sombra} />
      <Especie geo={geos.encenillo} mat={mat} items={dist.encenillo} castShadow={sombra} />
      <Especie geo={geos.roble} mat={mat} items={dist.roble} castShadow={sombra} />
      <Especie geo={geos.yarumo} mat={mat} items={dist.yarumo} castShadow={sombra} />
      <Especie geo={geos.aliso} mat={mat} items={dist.aliso} castShadow={sombra} />

      {/* Vaho del páramo a la deriva (solo 'alto'). */}
      {conteos.niebla > 0 && perfil.fog && (
        <NieblaRasante n={conteos.niebla} reducedMotion={reducedMotion} />
      )}
    </group>
  );
}
